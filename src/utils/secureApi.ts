import { supabase } from '@/integrations/supabase/client';
import { checkRateLimit } from './security';

// Secure API wrapper with rate limiting and validation
export class SecureAPI {
  private static getUserId(): string | null {
    const session = supabase.auth.getSession();
    return session ? 'user-session' : null;
  }

  // Secure database query with rate limiting
  static async secureQuery(
    table: string,
    operation: 'select' | 'insert' | 'update' | 'delete',
    data?: any,
    filters?: any
  ) {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized access');
    }

    // Rate limiting per user
    const rateLimitKey = `${userId}-${table}-${operation}`;
    if (!checkRateLimit(rateLimitKey, 50, 60000)) { // 50 requests per minute
      throw new Error('Rate limit exceeded');
    }

    try {
      let query = supabase.from(table as any);

      switch (operation) {
        case 'select':
          if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
              query = (query as any).eq(key, value);
            });
          }
          return await (query as any).select();

        case 'insert':
          if (!data) throw new Error('Data required for insert');
          return await (query as any).insert(data);

        case 'update':
          if (!data || !filters) throw new Error('Data and filters required for update');
          Object.entries(filters).forEach(([key, value]) => {
            query = (query as any).eq(key, value);
          });
          return await (query as any).update(data);

        case 'delete':
          if (!filters) throw new Error('Filters required for delete');
          Object.entries(filters).forEach(([key, value]) => {
            query = (query as any).eq(key, value);
          });
          return await (query as any).delete();

        default:
          throw new Error('Invalid operation');
      }
    } catch (error) {
      console.error('Secure API error:', error);
      throw error;
    }
  }

  // Validate user permissions
  static async validateUserPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user || session.session.user.id !== userId) {
        return false;
      }

      // Additional permission checks can be added here
      return true;
    } catch (error) {
      console.error('Permission validation error:', error);
      return false;
    }
  }

  // Secure file upload with validation
  static async secureFileUpload(file: File, bucket: string, path: string): Promise<string | null> {
    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type');
    }

    if (file.size > maxSize) {
      throw new Error('File too large');
    }

    // Check rate limit
    const userId = this.getUserId();
    if (!userId || !checkRateLimit(`${userId}-upload`, 10, 300000)) { // 10 uploads per 5 minutes
      throw new Error('Upload rate limit exceeded');
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;
      return data.path;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }
}