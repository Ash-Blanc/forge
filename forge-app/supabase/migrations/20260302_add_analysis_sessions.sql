create extension if not exists pgcrypto;

create table if not exists public.analysis_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,
    mode text not null check (mode in ('paper', 'saas', 'constellation')),
    title text not null,
    input_text text null,
    arxiv_id text null,
    meta jsonb null,
    output jsonb null,
    output_text text null,
    error text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists analysis_sessions_user_id_updated_at_idx
    on public.analysis_sessions (user_id, updated_at desc);

create index if not exists analysis_sessions_user_id_mode_idx
    on public.analysis_sessions (user_id, mode);

create index if not exists analysis_sessions_user_id_arxiv_id_idx
    on public.analysis_sessions (user_id, arxiv_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists analysis_sessions_set_updated_at on public.analysis_sessions;
create trigger analysis_sessions_set_updated_at
before update on public.analysis_sessions
for each row
execute function public.set_updated_at();
