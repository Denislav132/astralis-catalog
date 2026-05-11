create table if not exists site_settings (
  id text primary key default 'main',
  contact_phone text not null default '0879630620',
  contact_email text not null default 'info@astralis.bg',
  contact_address text not null default 'София, България',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

insert into site_settings (id, contact_phone, contact_email, contact_address)
values ('main', '0879630620', 'info@astralis.bg', 'София, България')
on conflict (id) do update set
  contact_phone = excluded.contact_phone,
  contact_email = excluded.contact_email,
  contact_address = excluded.contact_address,
  updated_at = timezone('utc'::text, now());

alter table site_settings enable row level security;

create policy "Public site settings are viewable by everyone."
  on site_settings for select
  using (true);

notify pgrst, 'reload schema';
