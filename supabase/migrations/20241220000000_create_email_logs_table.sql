-- Create email_logs table for storing email notifications
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT,
  text_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policy (only if not already enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'email_logs' AND rowsecurity = true) THEN
    ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Only admins can view email logs
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'Admin can view email logs') THEN
    CREATE POLICY "Admin can view email logs" ON email_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role = 'admin'
        )
      );
  END IF;
END $$;

-- System can insert email logs
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'System can insert email logs') THEN
    CREATE POLICY "System can insert email logs" ON email_logs
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);