-- user_integrations
-- Stores per-user OAuth tokens and API keys for connected services.
-- provider values: 'google' | 'notion'
-- Google stores access_token + refresh_token + expires_at
-- Notion stores access_token only (integration tokens don't expire)

create table if not exists user_integrations (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,              -- Clerk userId
  provider      text not null,              -- 'google' | 'notion'
  access_token  text not null,
  refresh_token text,                       -- Google only
  expires_at    timestamptz,                -- Google only
  scope         text,                       -- OAuth scopes granted
  raw           jsonb,                      -- full token response for debugging
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, provider)
);

-- Only the service role can read/write tokens (RLS blocks browser client)
alter table user_integrations enable row level security;

-- No policies = only service role (admin client) can access
-- This is intentional — tokens never leave the server

-- Index for the common lookup pattern
create index if not exists user_integrations_user_provider
  on user_integrations(user_id, provider);
