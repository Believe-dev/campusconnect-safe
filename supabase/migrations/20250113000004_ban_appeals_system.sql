-- Create ban appeals table
CREATE TABLE ban_appeals (
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

-- Allow anyone to insert appeals (for banned users)
CREATE POLICY "Anyone can submit ban appeals" ON ban_appeals FOR INSERT WITH CHECK (true);

-- Only admins can view and update appeals
CREATE POLICY "Admins can manage ban appeals" ON ban_appeals FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);