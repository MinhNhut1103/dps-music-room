-- ============================================================
-- Nhạc Chung DPS - Supabase SQL Migration
-- Chạy toàn bộ script này trong Supabase SQL Editor
-- ============================================================

-- 1. Bảng rooms (thông tin phòng và bài đang phát)
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'DPS Music Room',
  current_video_id text,
  current_video_title text,
  is_playing boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Bảng queue (hàng chờ bài hát)
create table if not exists queue (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  youtube_id text not null,
  title text not null,
  thumbnail text,
  added_by text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Index để truy vấn nhanh hơn
create index if not exists idx_queue_room_position on queue (room_id, position asc);

-- 3. Bảng profiles (lưu thông tin user session - tùy chọn)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Enable Realtime cho các bảng
-- ============================================================
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table queue;

-- ============================================================
-- Row Level Security (RLS) - cho phép tất cả đọc/ghi
-- (Phù hợp cho app demo/nội bộ)
-- ============================================================
alter table rooms enable row level security;
alter table queue enable row level security;
alter table profiles enable row level security;

-- Rooms: tất cả đều đọc và ghi được
create policy "Public read rooms" on rooms for select using (true);
create policy "Public insert rooms" on rooms for insert with check (true);
create policy "Public update rooms" on rooms for update using (true) with check (true);

-- Queue: tất cả đều đọc và ghi được
create policy "Public read queue" on queue for select using (true);
create policy "Public insert queue" on queue for insert with check (true);
create policy "Public update queue" on queue for update using (true) with check (true);
create policy "Public delete queue" on queue for delete using (true);

-- Profiles: tất cả đều đọc và ghi được
create policy "Public read profiles" on profiles for select using (true);
create policy "Public insert profiles" on profiles for insert with check (true);
create policy "Public update profiles" on profiles for update using (true) with check (true);

-- ============================================================
-- Tạo phòng mặc định (QUAN TRỌNG: copy UUID này vào .env)
-- ============================================================
insert into rooms (id, name)
values (gen_random_uuid(), 'DPS Music Room')
returning id, name;

-- Sau khi chạy xong, copy UUID từ kết quả và dán vào:
-- VITE_ROOM_ID=<uuid vừa tạo>
