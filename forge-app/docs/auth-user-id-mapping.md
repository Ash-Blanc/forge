# Clerk User ID Mapping for analysis_sessions

This document describes how Clerk user IDs are mapped to `analysis_sessions.user_id` and enforced at the application and database layers.

## Overview

| Component | Value |
|-----------|-------|
| Column | `analysis_sessions.user_id` (text) |
| App source | Clerk `auth().userId` |
| RLS source | JWT `sub` claim via `auth.jwt()->>'sub'` |
| Constraint | `user_id` must equal Clerk user ID (JWT `sub`) for RLS to enforce isolation |

## Application Layer

- Session API routes use `auth()` from `@clerk/nextjs/server` to obtain `userId`.
- On insert: always set `user_id: userId` in the payload.
- On select/update/delete: filter with `.eq("user_id", userId)`.
- The app uses `createSupabaseForUser(token)` so requests include the Clerk JWT; RLS then enforces access.

## RLS Layer

- Row Level Security policies on `public.analysis_sessions` use `auth.jwt()->>'sub' = user_id`.
- Supabase must receive a valid Clerk JWT (as `Authorization: Bearer <token>`) for RLS to apply.
- Supabase must be configured to verify Clerk JWTs. See [Clerk + Supabase setup](https://clerk.com/docs/guides/development/integrations/databases/supabase).

## JWT Configuration

1. **Clerk JWT template (recommended)**: Create a "supabase" template in [Clerk Dashboard > JWT Templates](https://dashboard.clerk.com/), based on the Supabase preset. Add Supabase's JWT secret to the template.
2. **Supabase**: Configure project to verify Clerk JWTs (JWT secret from Clerk or via [Clerk Connect](https://dashboard.clerk.com/setup/supabase)).

## Enforcement

- App layer: validates `userId` from Clerk before any DB operation.
- RLS layer: policies deny access when `auth.jwt()->>'sub'` does not match `user_id`.
- Both layers must be consistent: `user_id` always stores Clerk's user ID.
