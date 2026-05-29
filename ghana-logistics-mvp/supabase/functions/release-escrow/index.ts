import { createClient } from "npm:@supabase/supabase-js@2.106.1";
import { z } from "npm:zod@4.4.3";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("Missing function secrets for release-escrow");
}

const bodySchema = z.object({
  bookingId: z.string().uuid(),
  deliveryPin: z.string().min(4).max(10).optional(),
  forceRelease: z.boolean().optional().default(false)
});

serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Missing authorization header", { status: 401 });
  }

  const sessionClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await sessionClient.auth.getUser();
  if (authError || !authData.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let requestBody: z.infer<typeof bodySchema>;
  try {
    requestBody = bodySchema.parse(await request.json());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid request body";
    return new Response(message, { status: 400 });
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .single();

  if (profileError) {
    return new Response(profileError.message, { status: 500 });
  }

  const { data: booking, error: bookingError } = await serviceClient
    .from("bookings")
    .select("id, customer_id, driver_id, status")
    .eq("id", requestBody.bookingId)
    .single();

  if (bookingError) {
    return new Response(bookingError.message, { status: 404 });
  }

  const isAdmin = profile.role === "admin";
  const isBookingStakeholder =
    booking.customer_id === authData.user.id || booking.driver_id === authData.user.id;

  if (!isAdmin && !isBookingStakeholder) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!requestBody.forceRelease && !isAdmin) {
    if (!requestBody.deliveryPin) {
      return new Response("Delivery PIN is required for non-admin release", { status: 400 });
    }

    const { data: pinMatch, error: pinError } = await serviceClient.rpc("verify_delivery_pin", {
      booking_id_input: requestBody.bookingId,
      pin_input: requestBody.deliveryPin
    });

    if (pinError) {
      return new Response(pinError.message, { status: 500 });
    }

    if (!pinMatch) {
      return new Response("Invalid delivery PIN", { status: 403 });
    }
  }

  const { data: payoutId, error: releaseError } = await serviceClient.rpc(
    "release_escrow_for_booking",
    {
      booking_id_input: requestBody.bookingId,
      actor_id_input: authData.user.id
    }
  );

  if (releaseError) {
    return new Response(releaseError.message, { status: 500 });
  }

  const { data: payout } = await serviceClient
    .from("payouts")
    .select("id, status, amount_net, booking_id")
    .eq("id", payoutId)
    .single();

  return Response.json({
    ok: true,
    bookingId: requestBody.bookingId,
    payout
  });
});
