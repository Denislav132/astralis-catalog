-- Astralis CRM employees and sessions.
-- Run this once in Supabase SQL editor before creating real CRM users.

create extension if not exists pgcrypto;

create table if not exists crm_users (
  id uuid default gen_random_uuid() primary key,
  username text not null unique,
  display_name text,
  role text not null default 'sales'
    check (role in ('owner', 'manager', 'sales')),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  password_hash text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_login_at timestamp with time zone
);

create table if not exists crm_sessions (
  token_hash text primary key,
  user_id uuid not null references crm_users(id) on delete cascade,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists crm_sessions_user_id_idx on crm_sessions(user_id);
create index if not exists crm_sessions_expires_at_idx on crm_sessions(expires_at);

alter table crm_users enable row level security;
alter table crm_sessions enable row level security;

-- No public policies are created on purpose.
-- The Next.js server uses the Supabase service role key for CRM auth operations.

notify pgrst, 'reload schema';
