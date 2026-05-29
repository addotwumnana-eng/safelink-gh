import { createClient } from "npm:@supabase/supabase-js@2.106.1";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const paystackWebhookSecret = Deno.env.get("PAYSTACK_WEBHOOK_SECRET");

if (!supabaseUrl || !serviceRoleKey || !paystackWebhookSecret) {
  throw new Error("Missing function secrets for paystack-webhook");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const encoder = new TextEncoder();

async function computeSignature(payload: string, secret: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(payload)
  );

  return Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await request.text();
  const incomingSignature = request.headers.get("x-paystack-signature");

  if (!incomingSignature) {
    return new Response("Missing signature", { status: 401 });
  }

  const expectedSignature = await computeSignature(rawBody, paystackWebhookSecret);
  if (incomingSignature !== expectedSignature) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload?.event as string | undefined;

  if (eventName !== "charge.success") {
    return Response.json({ ok: true, ignored: true, reason: "Unhandled event" });
  }

  const reference = payload?.data?.reference as string | undefined;
  const amountInPesewas = Number(payload?.data?.amount ?? 0);
  const amount = Number((amountInPesewas / 100).toFixed(2));

  if (!reference || amount <= 0) {
    return new Response("Invalid charge payload", { status: 400 });
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, booking_id, customer_id, status")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (paymentError) {
    return new Response(paymentError.message, { status: 500 });
  }

  if (!payment) {
    return new Response("Payment record not found", { status: 404 });
  }

  if (payment.status === "held_in_escrow" || payment.status === "released") {
    return Response.json({ ok: true, idempotent: true });
  }

  const paidTimestamp = new Date().toISOString();
  const { error: updatePaymentError } = await supabase
    .from("payments")
    .update({
      amount,
      status: "held_in_escrow",
      paid_at: paidTimestamp,
      held_at: paidTimestamp,
      raw_payload: payload
    })
    .eq("id", payment.id);

  if (updatePaymentError) {
    return new Response(updatePaymentError.message, { status: 500 });
  }

  const { data: customerWallet, error: walletError } = await supabase
    .from("wallets")
    .select("id, held_balance")
    .eq("user_id", payment.customer_id)
    .single();

  if (walletError) {
    return new Response(walletError.message, { status: 500 });
  }

  const heldBefore = Number(customerWallet.held_balance ?? 0);
  const heldAfter = Number((heldBefore + amount).toFixed(2));

  const { error: updateWalletError } = await supabase
    .from("wallets")
    .update({ held_balance: heldAfter })
    .eq("id", customerWallet.id);

  if (updateWalletError) {
    return new Response(updateWalletError.message, { status: 500 });
  }

  const { error: walletTxError } = await supabase.from("wallet_transactions").insert({
    wallet_id: customerWallet.id,
    booking_id: payment.booking_id,
    payment_id: payment.id,
    tx_type: "payment_hold",
    direction: "credit",
    amount,
    balance_before: heldBefore,
    balance_after: heldAfter,
    description: "Customer payment secured in escrow",
    metadata: { source: "paystack_webhook" }
  });

  if (walletTxError) {
    return new Response(walletTxError.message, { status: 500 });
  }

  await supabase.from("transactions").insert({
    booking_id: payment.booking_id,
    transaction_type: "escrow_hold",
    debit_account: "paystack_clearing",
    credit_account: "escrow_holdings",
    amount,
    reference,
    metadata: { event: "charge.success" }
  });

  await supabase.from("booking_events").insert({
    booking_id: payment.booking_id,
    event_type: "payment_secured",
    notes: "Payment confirmed by Paystack webhook and held in escrow",
    metadata: { reference, amount }
  });

  return Response.json({ ok: true });
});
