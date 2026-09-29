-- Executar no projeto Supabase do SlothMint para caber nos dois projetos Free da conta.
create table if not exists public.signal_subscriptions (
  id uuid primary key default gen_random_uuid(),
  app text not null,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now(),
  unique (app, endpoint)
);
create table if not exists public.signal_events (
  id uuid primary key default gen_random_uuid(),
  app text not null,
  event_type text not null,
  title text not null,
  body text not null,
  path text not null,
  dedupe_key text not null,
  expires_at timestamptz,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (app, dedupe_key)
);
alter table public.signal_subscriptions enable row level security;
alter table public.signal_events enable row level security;
-- Sem políticas públicas: somente o backend SlothSignal usa a service role.
