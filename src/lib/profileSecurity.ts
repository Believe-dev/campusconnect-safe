/**
 * Profile Security Utilities
 * Handles secure access to profile data with field-level filtering
 */

import { User } from '@supabase/supabase-js';

// Safe fields that can be shown to any authenticated user (for marketplace seller info)
export const SAFE_PROFILE_FIELDS = [
  'id',
  'user_id', 
  'full_name',
  'rating',
  'total_reviews',
  'is_verified',
  'avatar_url',
  'bio',
  'created_at'
] as const;

// Sensitive fields that should only be visible to profile owner or admins
export const SENSITIVE_PROFILE_FIELDS = [
  'email',
  'phone_number', 
  'student_id',
  'university_name',
  'campus',
  'verification_type',
  'account_type',
  'is_banned',
  'updated_at'
] as const;

export type SafeProfileData = Pick<any, typeof SAFE_PROFILE_FIELDS[number]>;
export type FullProfileData = SafeProfileData & Pick<any, typeof SENSITIVE_PROFILE_FIELDS[number]>;

/**
 * Filters profile data based on user permissions
 * @param profileData - Raw profile data from database
 * @param currentUser - Current authenticated user
 * @param isAdmin - Whether current user is admin
 * @returns Filtered profile data based on permissions
 */
export const filterProfileData = (
  profileData: any, 
  currentUser: User | null,
  isAdmin: boolean = false
): SafeProfileData | FullProfileData => {
  if (!profileData) return profileData;

  // Admin or profile owner gets full access
  if (isAdmin || (currentUser && profileData.user_id === currentUser.id)) {
    return profileData;
  }

  // Other authenticated users only get safe fields
  const safeData: any = {};
  SAFE_PROFILE_FIELDS.forEach(field => {
    if (field in profileData) {
      safeData[field] = profileData[field];
    }
  });

  return safeData;
};

/**
 * Filters an array of profile data
 */
export const filterProfilesData = (
  profilesData: any[],
  currentUser: User | null,
  isAdmin: boolean = false
): (SafeProfileData | FullProfileData)[] => {
  return profilesData.map(profile => filterProfileData(profile, currentUser, isAdmin));
};

/**
 * SQL select string for safe profile fields only
 * Use this for queries where you only need public seller info
 */
export const SAFE_PROFILE_SELECT = SAFE_PROFILE_FIELDS.join(', ');

/**
 * SQL select string for all profile fields  
 * Use this only for own profile or admin queries
 */
export const FULL_PROFILE_SELECT = '*';
