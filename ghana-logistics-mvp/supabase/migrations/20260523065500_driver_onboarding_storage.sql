insert into public.municipalities (name, latitude, longitude)
values
  ('Dansoman', 5.543700, -0.270300),
  ('Weija', 5.576700, -0.333100)
on conflict (name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'driver-documents',
    'driver-documents',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'truck-photos',
    'truck-photos',
    true,
    15728640,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "driver docs read own folder" on storage.objects;
create policy "driver docs read own folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'driver-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "driver docs upload own folder" on storage.objects;
create policy "driver docs upload own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'driver-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "driver docs update own folder" on storage.objects;
create policy "driver docs update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'driver-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
)
with check (
  bucket_id = 'driver-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "driver docs delete own folder" on storage.objects;
create policy "driver docs delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'driver-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "truck photos read public" on storage.objects;
create policy "truck photos read public"
on storage.objects
for select
to public
using (bucket_id = 'truck-photos');

drop policy if exists "truck photos upload own folder" on storage.objects;
create policy "truck photos upload own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'truck-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "truck photos update own folder" on storage.objects;
create policy "truck photos update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'truck-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
)
with check (
  bucket_id = 'truck-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "truck photos delete own folder" on storage.objects;
create policy "truck photos delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'truck-photos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);
