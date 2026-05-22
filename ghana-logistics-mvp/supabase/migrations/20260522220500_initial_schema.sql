create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('customer', 'driver', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'driver_verification_status') then
    create type public.driver_verification_status as enum ('pending', 'approved', 'rejected', 'suspended');
  end if;

  if not exists (select 1 from pg_type where typname = 'truck_type') then
    create type public.truck_type as enum ('mini_truck', 'kia_rhino', 'pickup', 'tipper_truck', 'long_cargo_truck');
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type public.booking_status as enum (
      'pending',
      'driver_assigned',
      'accepted',
      'arrived_pickup',
      'in_transit',
      'delivered',
      'completed',
      'cancelled',
      'disputed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'processing', 'held_in_escrow', 'released', 'failed', 'refunded');
  end if;

  if not exists (select 1 from pg_type where typname = 'payout_status') then
    create type public.payout_status as enum ('queued', 'processing', 'paid', 'failed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'dispute_status') then
    create type public.dispute_status as enum ('open', 'under_review', 'resolved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'wallet_transaction_type') then
    create type public.wallet_transaction_type as enum (
      'payment_hold',
      'payment_release',
      'commission',
      'payout',
      'refund',
      'cancellation_fee',
      'adjustment'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_direction') then
    create type public.transaction_direction as enum ('debit', 'credit');
  end if;
end
$$;

create table if not exists public.municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  geofence jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  full_name text,
  phone_number text,
  avatar_url text,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_phone_number_idx on public.profiles(phone_number) where phone_number is not null;
create index if not exists profiles_role_idx on public.profiles(role);

create table if not exists public.drivers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  municipality_id uuid references public.municipalities(id),
  verification_status public.driver_verification_status not null default 'pending',
  ghana_card_number text,
  ghana_card_verified boolean not null default false,
  license_number text,
  bio text,
  is_online boolean not null default false,
  average_rating numeric(3, 2) not null default 5.00 check (average_rating >= 0 and average_rating <= 5),
  total_ratings integer not null default 0,
  total_trips integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists drivers_municipality_idx on public.drivers(municipality_id);
create index if not exists drivers_online_idx on public.drivers(is_online, verification_status);

create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(user_id) on delete cascade,
  document_type text not null,
  file_url text not null,
  verification_status public.driver_verification_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists driver_documents_driver_idx on public.driver_documents(driver_id);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(user_id) on delete cascade,
  municipality_id uuid references public.municipalities(id),
  truck_type public.truck_type not null,
  display_name text not null,
  license_plate text not null,
  dimension_length_m numeric(5, 2) not null check (dimension_length_m > 0),
  dimension_width_m numeric(5, 2) not null check (dimension_width_m > 0),
  dimension_height_m numeric(5, 2) not null check (dimension_height_m > 0),
  load_capacity_kg integer not null check (load_capacity_kg > 0),
  cargo_examples text[] not null default '{}',
  photo_urls text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (license_plate)
);

create index if not exists vehicles_driver_idx on public.vehicles(driver_id);
create index if not exists vehicles_truck_type_idx on public.vehicles(truck_type);

create table if not exists public.driver_locations (
  driver_id uuid primary key references public.drivers(user_id) on delete cascade,
  municipality_id uuid references public.municipalities(id),
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  heading numeric(5, 2),
  speed_kmh numeric(5, 2),
  latest_distance_km numeric(6, 2) not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists driver_locations_municipality_idx on public.driver_locations(municipality_id);
create index if not exists driver_locations_updated_idx on public.driver_locations(updated_at desc);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique default ('BKG-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  customer_id uuid not null references public.profiles(id),
  driver_id uuid references public.drivers(user_id),
  vehicle_id uuid references public.vehicles(id),
  pickup_municipality_id uuid references public.municipalities(id),
  dropoff_municipality_id uuid references public.municipalities(id),
  pickup_address text not null,
  pickup_latitude numeric(9, 6) not null,
  pickup_longitude numeric(9, 6) not null,
  dropoff_address text not null,
  dropoff_latitude numeric(9, 6) not null,
  dropoff_longitude numeric(9, 6) not null,
  cargo_description text,
  cargo_weight_estimate_kg integer,
  special_instructions text,
  status public.booking_status not null default 'pending',
  fare_subtotal numeric(12, 2) not null check (fare_subtotal >= 0),
  platform_commission_amount numeric(12, 2) not null default 0 check (platform_commission_amount >= 0),
  cancellation_fee_amount numeric(12, 2) not null default 0 check (cancellation_fee_amount >= 0),
  fare_total numeric(12, 2) not null check (fare_total >= 0),
  delivery_pin_hash text,
  delivery_pin_attempts smallint not null default 0,
  scheduled_for timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  auto_release_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_customer_idx on public.bookings(customer_id);
create index if not exists bookings_driver_idx on public.bookings(driver_id);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists bookings_created_idx on public.bookings(created_at desc);
create index if not exists bookings_schedule_idx on public.bookings(scheduled_for);

create table if not exists public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_user_id uuid references public.profiles(id),
  event_type text not null,
  notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists booking_events_booking_idx on public.booking_events(booking_id, created_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  paystack_reference text not null unique,
  paystack_authorization_url text,
  amount numeric(12, 2) not null check (amount >= 0),
  currency char(3) not null default 'GHS',
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  held_at timestamptz,
  released_at timestamptz,
  failed_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_customer_idx on public.payments(customer_id);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  available_balance numeric(12, 2) not null default 0 check (available_balance >= 0),
  held_balance numeric(12, 2) not null default 0 check (held_balance >= 0),
  currency char(3) not null default 'GHS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wallets_user_idx on public.wallets(user_id);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  driver_id uuid not null references public.drivers(user_id),
  amount_gross numeric(12, 2) not null check (amount_gross >= 0),
  platform_commission numeric(12, 2) not null check (platform_commission >= 0),
  amount_net numeric(12, 2) not null check (amount_net >= 0),
  momo_number text,
  paystack_transfer_reference text,
  status public.payout_status not null default 'queued',
  queued_at timestamptz not null default now(),
  processed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payouts_driver_idx on public.payouts(driver_id, status);

create table if not exists public.wallet_transactions (
  id bigint generated always as identity primary key,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  payout_id uuid references public.payouts(id) on delete set null,
  tx_type public.wallet_transaction_type not null,
  direction public.transaction_direction not null,
  amount numeric(12, 2) not null check (amount > 0),
  balance_before numeric(12, 2) not null,
  balance_after numeric(12, 2) not null,
  description text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_wallet_idx on public.wallet_transactions(wallet_id, created_at desc);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  transaction_type text not null,
  debit_account text not null,
  credit_account text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  reference text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists transactions_booking_idx on public.transactions(booking_id, created_at desc);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  opened_by uuid not null references public.profiles(id),
  against_user_id uuid references public.profiles(id),
  status public.dispute_status not null default 'open',
  reason text not null,
  resolution_notes text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists disputes_booking_idx on public.disputes(booking_id);
create index if not exists disputes_status_idx on public.disputes(status);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  score smallint not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);

create table if not exists public.trip_locations (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  driver_id uuid not null references public.drivers(user_id) on delete cascade,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  recorded_at timestamptz not null default now()
);

create index if not exists trip_locations_booking_idx on public.trip_locations(booking_id, recorded_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_drivers_updated_at before update on public.drivers for each row execute function public.set_updated_at();
create trigger set_driver_documents_updated_at before update on public.driver_documents for each row execute function public.set_updated_at();
create trigger set_vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger set_bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();
create trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger set_wallets_updated_at before update on public.wallets for each row execute function public.set_updated_at();
create trigger set_payouts_updated_at before update on public.payouts for each row execute function public.set_updated_at();
create trigger set_disputes_updated_at before update on public.disputes for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_suspended = false
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  incoming_role public.app_role;
begin
  incoming_role := case
    when new.raw_user_meta_data ->> 'role' in ('customer', 'driver', 'admin')
      then (new.raw_user_meta_data ->> 'role')::public.app_role
    else 'customer'::public.app_role
  end;

  insert into public.profiles (id, role, full_name, phone_number)
  values (
    new.id,
    incoming_role,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone_number', '')
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, available_balance, held_balance)
  values (new.id, 0, 0)
  on conflict (user_id) do nothing;

  if incoming_role = 'driver' then
    insert into public.drivers (user_id, verification_status, is_online)
    values (new.id, 'pending', false)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.hash_delivery_pin(pin text)
returns text
language sql
immutable
as $$
  select encode(digest(pin, 'sha256'), 'hex');
$$;

create or replace function public.verify_delivery_pin(booking_id_input uuid, pin_input text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_hash text;
  provided_hash text;
  is_match boolean;
begin
  select delivery_pin_hash into expected_hash
  from public.bookings
  where id = booking_id_input
  for update;

  if expected_hash is null then
    return false;
  end if;

  provided_hash := public.hash_delivery_pin(pin_input);
  is_match := (expected_hash = provided_hash);

  if not is_match then
    update public.bookings
    set delivery_pin_attempts = delivery_pin_attempts + 1
    where id = booking_id_input;
  end if;

  return is_match;
end;
$$;

create or replace function public.release_escrow_for_booking(booking_id_input uuid, actor_id_input uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
  payment_row public.payments%rowtype;
  customer_wallet_row public.wallets%rowtype;
  driver_wallet_row public.wallets%rowtype;
  payout_id_value uuid;
  commission_value numeric(12, 2);
  net_value numeric(12, 2);
begin
  select * into booking_row
  from public.bookings
  where id = booking_id_input
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  select * into payment_row
  from public.payments
  where booking_id = booking_row.id
  for update;

  if not found then
    raise exception 'Payment record not found for booking %', booking_row.id;
  end if;

  if payment_row.status <> 'held_in_escrow' then
    raise exception 'Payment must be held_in_escrow before release';
  end if;

  if booking_row.driver_id is null then
    raise exception 'Booking has no assigned driver';
  end if;

  commission_value := coalesce(booking_row.platform_commission_amount, round(booking_row.fare_total * 0.12, 2));
  net_value := booking_row.fare_total - commission_value - booking_row.cancellation_fee_amount;

  if net_value < 0 then
    raise exception 'Computed net payout is negative';
  end if;

  select * into customer_wallet_row
  from public.wallets
  where user_id = booking_row.customer_id
  for update;

  select * into driver_wallet_row
  from public.wallets
  where user_id = booking_row.driver_id
  for update;

  if not found then
    insert into public.wallets (user_id, available_balance, held_balance)
    values (booking_row.driver_id, 0, 0)
    returning * into driver_wallet_row;
  end if;

  insert into public.payouts (
    booking_id,
    driver_id,
    amount_gross,
    platform_commission,
    amount_net,
    status
  )
  values (
    booking_row.id,
    booking_row.driver_id,
    booking_row.fare_total,
    commission_value,
    net_value,
    'queued'
  )
  on conflict (booking_id) do update set
    amount_gross = excluded.amount_gross,
    platform_commission = excluded.platform_commission,
    amount_net = excluded.amount_net,
    status = excluded.status
  returning id into payout_id_value;

  update public.wallets
  set available_balance = available_balance + net_value
  where user_id = booking_row.driver_id;

  insert into public.wallet_transactions (
    wallet_id,
    booking_id,
    payment_id,
    payout_id,
    tx_type,
    direction,
    amount,
    balance_before,
    balance_after,
    description
  )
  values (
    driver_wallet_row.id,
    booking_row.id,
    payment_row.id,
    payout_id_value,
    'payout',
    'credit',
    net_value,
    driver_wallet_row.available_balance,
    driver_wallet_row.available_balance + net_value,
    'Escrow release payout after delivery confirmation'
  );

  insert into public.transactions (
    booking_id,
    transaction_type,
    debit_account,
    credit_account,
    amount,
    reference,
    metadata
  )
  values
    (
      booking_row.id,
      'driver_payout',
      'escrow_holdings',
      'driver_wallet',
      net_value,
      payment_row.paystack_reference,
      jsonb_build_object('payout_id', payout_id_value)
    ),
    (
      booking_row.id,
      'platform_commission',
      'escrow_holdings',
      'platform_revenue',
      commission_value,
      payment_row.paystack_reference,
      '{}'::jsonb
    );

  update public.payments
  set status = 'released',
      released_at = now()
  where id = payment_row.id;

  update public.bookings
  set status = 'completed',
      completed_at = coalesce(completed_at, now())
  where id = booking_row.id;

  insert into public.booking_events (
    booking_id,
    actor_user_id,
    event_type,
    notes,
    metadata
  )
  values (
    booking_row.id,
    actor_id_input,
    'escrow_released',
    'Escrow released and payout queued',
    jsonb_build_object('payout_id', payout_id_value, 'net_amount', net_value)
  );

  return payout_id_value;
end;
$$;

create or replace view public.driver_discovery_view as
select
  d.user_id as driver_id,
  coalesce(p.full_name, 'Driver') as full_name,
  coalesce(m.name, 'Unknown') as municipality_name,
  coalesce(dl.latest_distance_km, 0)::numeric(6, 2) as distance_km,
  coalesce(v.truck_type::text, 'mini_truck') as truck_type,
  coalesce(v.load_capacity_kg, 500) as capacity_kg,
  d.average_rating,
  (v.photo_urls)[1] as photo_url
from public.drivers d
join public.profiles p on p.id = d.user_id
left join public.driver_locations dl on dl.driver_id = d.user_id
left join public.municipalities m on m.id = coalesce(dl.municipality_id, d.municipality_id)
left join lateral (
  select vv.truck_type, vv.load_capacity_kg, vv.photo_urls
  from public.vehicles vv
  where vv.driver_id = d.user_id
    and vv.is_active = true
  order by vv.created_at desc
  limit 1
) v on true
where d.verification_status = 'approved'
  and d.is_online = true
  and p.is_suspended = false;

insert into public.municipalities (name, latitude, longitude)
values
  ('Madina', 5.679000, -0.164300),
  ('Adenta', 5.708900, -0.174500),
  ('Tema', 5.669800, -0.016600),
  ('Achimota', 5.632000, -0.250500),
  ('Ablekuma', 5.576900, -0.259400),
  ('Ga East', 5.731700, -0.233400),
  ('Ashaiman', 5.699300, -0.029000),
  ('Kasoa', 5.534000, -0.416700),
  ('Circle', 5.569500, -0.211200),
  ('Kaneshie', 5.560900, -0.244300)
on conflict (name) do nothing;

alter table public.municipalities enable row level security;
alter table public.profiles enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_documents enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_locations enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.payments enable row level security;
alter table public.wallets enable row level security;
alter table public.payouts enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.transactions enable row level security;
alter table public.disputes enable row level security;
alter table public.ratings enable row level security;
alter table public.trip_locations enable row level security;
alter table public.notifications enable row level security;

create policy "municipalities readable by authenticated users"
on public.municipalities
for select
to authenticated
using (true);

create policy "profiles select own or admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles update own or admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "drivers public discovery"
on public.drivers
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or (verification_status = 'approved' and is_online = true)
);

create policy "drivers update own or admin"
on public.drivers
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "drivers insert self or admin"
on public.drivers
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

create policy "driver docs own or admin"
on public.driver_documents
for all
to authenticated
using (driver_id = auth.uid() or public.is_admin())
with check (driver_id = auth.uid() or public.is_admin());

create policy "vehicles read authenticated"
on public.vehicles
for select
to authenticated
using (true);

create policy "vehicles manage own or admin"
on public.vehicles
for all
to authenticated
using (driver_id = auth.uid() or public.is_admin())
with check (driver_id = auth.uid() or public.is_admin());

create policy "driver locations read authenticated"
on public.driver_locations
for select
to authenticated
using (true);

create policy "driver locations own upsert"
on public.driver_locations
for all
to authenticated
using (driver_id = auth.uid() or public.is_admin())
with check (driver_id = auth.uid() or public.is_admin());

create policy "bookings customer insert own"
on public.bookings
for insert
to authenticated
with check (customer_id = auth.uid() or public.is_admin());

create policy "bookings visible to stakeholders"
on public.bookings
for select
to authenticated
using (customer_id = auth.uid() or driver_id = auth.uid() or public.is_admin());

create policy "bookings update by stakeholders"
on public.bookings
for update
to authenticated
using (customer_id = auth.uid() or driver_id = auth.uid() or public.is_admin())
with check (customer_id = auth.uid() or driver_id = auth.uid() or public.is_admin());

create policy "booking events visible to stakeholders"
on public.booking_events
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and (b.customer_id = auth.uid() or b.driver_id = auth.uid() or public.is_admin())
  )
);

create policy "booking events insert stakeholders"
on public.booking_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and (b.customer_id = auth.uid() or b.driver_id = auth.uid() or public.is_admin())
  )
);

create policy "payments visible to stakeholders"
on public.payments
for select
to authenticated
using (
  customer_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.driver_id = auth.uid()
  )
);

create policy "payments customer insert"
on public.payments
for insert
to authenticated
with check (customer_id = auth.uid() or public.is_admin());

create policy "wallets own or admin"
on public.wallets
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "wallets update own or admin"
on public.wallets
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "wallet transactions own or admin"
on public.wallet_transactions
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.wallets w
    where w.id = wallet_id and w.user_id = auth.uid()
  )
);

create policy "payouts own driver or admin"
on public.payouts
for select
to authenticated
using (driver_id = auth.uid() or public.is_admin());

create policy "payouts admin manage"
on public.payouts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "transactions admin only"
on public.transactions
for select
to authenticated
using (public.is_admin());

create policy "disputes stakeholders"
on public.disputes
for select
to authenticated
using (
  opened_by = auth.uid()
  or against_user_id = auth.uid()
  or public.is_admin()
);

create policy "disputes open by stakeholders"
on public.disputes
for insert
to authenticated
with check (opened_by = auth.uid() or public.is_admin());

create policy "disputes update admin"
on public.disputes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "ratings stakeholders"
on public.ratings
for select
to authenticated
using (
  reviewer_id = auth.uid()
  or reviewee_id = auth.uid()
  or public.is_admin()
);

create policy "ratings insert reviewer"
on public.ratings
for insert
to authenticated
with check (reviewer_id = auth.uid() or public.is_admin());

create policy "trip locations stakeholders"
on public.trip_locations
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and (b.customer_id = auth.uid() or b.driver_id = auth.uid())
  )
);

create policy "trip locations driver insert"
on public.trip_locations
for insert
to authenticated
with check (driver_id = auth.uid() or public.is_admin());

create policy "notifications own user"
on public.notifications
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "notifications admin insert"
on public.notifications
for insert
to authenticated
with check (public.is_admin());
