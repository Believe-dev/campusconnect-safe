-- Create function to get verification requests
CREATE OR REPLACE FUNCTION get_verification_requests()
RETURNS TABLE (
    id text,
    user_id uuid,
    full_name text,
    email text,
    university_name text,
    campus text,
    student_id text,
    phone_number text,
    bio text,
    account_type text,
    rating numeric,
    total_reviews integer,
    face_photo_url text,
    student_id_photo_url text,
    created_at timestamp with time zone,
    is_banned boolean,
    verification_status text,
    is_verified boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        p.id,
        p.user_id,
        p.full_name,
        p.email,
        p.university_name,
        p.campus,
        p.student_id,
        p.phone_number,
        p.bio,
        p.account_type,
        p.rating,
        p.total_reviews,
        p.face_photo_url,
        p.student_id_photo_url,
        p.created_at,
        p.is_banned,
        p.verification_status,
        p.is_verified
    FROM profiles p
    WHERE p.face_photo_url IS NOT NULL 
      AND p.student_id_photo_url IS NOT NULL
      AND (p.is_verified IS NULL OR p.is_verified = false)
      AND (p.is_banned IS NULL OR p.is_banned = false)
    ORDER BY p.created_at DESC;
$$;