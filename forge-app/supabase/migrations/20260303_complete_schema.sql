-- Complete database migration for FORGE app
-- This combines the essential old schema with the new analysis_sessions system

-- Enable necessary extensions
create extension if not exists vector;
create extension if not exists pgcrypto;

-- ─── ESSENTIAL OLD SCHEMA (for seed data) ───────────────────────────────
-- Only keeping what's needed for seed functionality

create table if not exists public.users (
    id text primary key,
    name text not null,
    role text not null,
    bio text null,
    created_at timestamptz not null default now()
);

create table if not exists public.papers (
    id uuid primary key default gen_random_uuid(),
    arxiv_id text not null unique,
    title text not null,
    abstract text not null,
    authors text[] not null,
    published text not null,
    status text not null,
    opportunity text null,
    core_innovation text null,
    target_customer text null,
    market_size text null,
    build_complexity text null,
    mvp_days integer null,
    moat_analysis text null,
    tags text[] not null,
    first_90_days text[] not null,
    narrative_analysis text null,
    submitted_by_id text not null references public.users(id),
    created_at timestamptz not null default now()
);

create table if not exists public.following (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references public.users(id),
    paper_id uuid not null references public.papers(id),
    created_at timestamptz not null default now(),
    unique(user_id, paper_id)
);

create table if not exists public.comments (
    id uuid primary key default gen_random_uuid(),
    paper_id uuid not null references public.papers(id),
    user_id text not null references public.users(id),
    text text not null,
    created_at timestamptz not null default now()
);

-- ─── NEW SCHEMA (current app functionality) ─────────────────────────────
-- This is the new analysis_sessions system

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

-- Indexes for analysis_sessions
create index if not exists analysis_sessions_user_id_updated_at_idx
    on public.analysis_sessions (user_id, updated_at desc);

create index if not exists analysis_sessions_user_id_mode_idx
    on public.analysis_sessions (user_id, mode);

create index if not exists analysis_sessions_user_id_arxiv_id_idx
    on public.analysis_sessions (user_id, arxiv_id);

-- Updated at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Updated at trigger for analysis_sessions
drop trigger if exists analysis_sessions_set_updated_at on public.analysis_sessions;
create trigger analysis_sessions_set_updated_at
before update on public.analysis_sessions
for each row
execute function public.set_updated_at();

-- Indexes for old schema tables
create index if not exists papers_arxiv_id_idx on public.papers (arxiv_id);
create index if not exists papers_submitted_by_id_idx on public.papers (submitted_by_id);
create index if not exists following_user_id_idx on public.following (user_id);
create index if not exists following_paper_id_idx on public.following (paper_id);
create index if not exists comments_user_id_idx on public.comments (user_id);
create index if not exists comments_paper_id_idx on public.comments (paper_id);