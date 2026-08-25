-- Enable HTTP extension (run as superuser or through Supabase dashboard)
-- This must be run with proper permissions

-- Enable the extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Check if extension is enabled
SELECT * FROM pg_extension WHERE extname = 'http';