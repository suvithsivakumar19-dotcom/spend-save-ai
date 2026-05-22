-- SQL Script to set up the necessary database tables in your Supabase dashboard.
-- Copy and paste this code into your Supabase SQL Editor and run it.

-- 1. Create the "audits" table
CREATE TABLE IF NOT EXISTS audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    input JSONB NOT NULL,
    results JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create the "leads" table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    company TEXT,
    role TEXT,
    audit_id UUID REFERENCES audits(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security (RLS) on both tables
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 4. Create policies to allow anonymous users to insert and read audits
CREATE POLICY "Allow public insert to audits" 
ON audits FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Allow public select from audits" 
ON audits FOR SELECT 
TO anon 
USING (true);

-- 5. Create policies to allow anonymous users to insert and read leads
CREATE POLICY "Allow public insert to leads" 
ON leads FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Allow public select from leads" 
ON leads FOR SELECT 
TO anon 
USING (true);
