-- Migration: Create waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
    email TEXT PRIMARY KEY,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: No RLS policies are added because we are interacting with this table
-- purely from a Next.js API route using the service_role key to bypass RLS.
-- If you access this from the client side later, you will need to Enable RLS and add policies.
