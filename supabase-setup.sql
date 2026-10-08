-- Jalankan sekali di Supabase: SQL Editor > New query > Run

create table if not exists public.paket (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kategori text not null default 'wisata' check (kategori in ('ziarah','wisata','sewa')),
  durasi text,
  rute text,
  termasuk text,
  harga numeric,
  harga_ket text default 'per orang',
  poster_url text,
  poster_path text,
  aktif boolean not null default true,
  urutan int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.paket enable row level security;

-- Pengunjung website: hanya boleh membaca paket yang aktif
create policy "publik baca paket aktif" on public.paket
  for select to anon, authenticated using (aktif = true);

-- Admin (user yang login): boleh semuanya
create policy "admin kelola paket" on public.paket
  for all to authenticated using (true) with check (true);

-- Tempat poster (bucket publik agar gambar bisa tampil di website)
insert into storage.buckets (id, name, public)
values ('poster', 'poster', true)
on conflict (id) do nothing;

create policy "admin upload poster" on storage.objects
  for insert to authenticated with check (bucket_id = 'poster');
create policy "admin ubah poster" on storage.objects
  for update to authenticated using (bucket_id = 'poster');
create policy "admin hapus poster" on storage.objects
  for delete to authenticated using (bucket_id = 'poster');
