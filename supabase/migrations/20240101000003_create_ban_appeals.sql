-- Create ban_appeals table
CREATE TABLE IF NOT EXISTS ban_appeals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  matric_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE ban_appeals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can insert ban appeals" ON ban_appeals FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all ban appeals" ON ban_appeals FOR SELECT USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));
CREATE POLICY "Admins can update ban appeals" ON ban_appeals FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));