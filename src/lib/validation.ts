import React from 'react';
import { z } from 'zod';
import { NIGERIAN_STATES } from './constants';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const phoneSchema = z.string().regex(
  /^(\+234|0)[789]\d{9}$/,
  'Invalid Nigerian phone number'
);
export const priceSchema = z.number().min(0, 'Price must be positive');
export const quantitySchema = z.number().int().min(1, 'Quantity must be at least 1');

// Profile validation
export const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  phone_number: phoneSchema.optional(),
  university_name: z.string().min(2, 'University name is required'),
  campus: z.string().min(2, 'Campus is required'),
  student_id: z.string().min(3, 'Student ID is required'),
});

// Product validation
export const productSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description too long'),
  price: priceSchema.max(1000000, 'Price too high'),
  category: z.string().min(1, 'Category is required'),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']),
  campus: z.string().min(1, 'Campus is required'),
});

// Checkout validation
export const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().min(10, 'Address must be at least 10 characters'),
  city: z.string().min(2, 'City is required'),
  state: z.enum(NIGERIAN_STATES as any, { errorMap: () => ({ message: 'Invalid state' }) }),
  paymentMethod: z.string().min(1, 'Payment method is required'),
});

// Message validation
export const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
});

// Search validation
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Query too long'),
  category: z.string().optional(),
  campus: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
}).refine(
  (data) => !data.minPrice || !data.maxPrice || data.minPrice <= data.maxPrice,
  { message: 'Min price must be less than max price', path: ['minPrice'] }
);

// Validation utilities
export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { success: boolean; error?: string; data?: T } {
  try {
    const data = schema.parse(value);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation failed' };
    }
    return { success: false, error: 'Validation failed' };
  }
}

export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: boolean; errors?: Record<string, string>; data?: T } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Validation failed' } };
  }
}

// Custom validation rules
export const customValidators = {
  isValidImageFile: (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    return validTypes.includes(file.type) && file.size <= maxSize;
  },

  isValidImageUrl: (url: string): boolean => {
    try {
      new URL(url);
      return /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
    } catch {
      return false;
    }
  },

  isStrongPassword: (password: string): boolean => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  },

  sanitizeHtml: (html: string): string => {
    // Basic HTML sanitization - in production, use a proper library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  },
};

// Form field validation hook
export function useFieldValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validateField = React.useCallback((field: string, value: unknown) => {
    try {
      // Extract the field schema if it's an object schema
      if (schema instanceof z.ZodObject) {
        const fieldSchema = schema.shape[field];
        if (fieldSchema) {
          fieldSchema.parse(value);
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({
          ...prev,
          [field]: error.errors[0]?.message || 'Invalid value'
        }));
      }
    }
  }, [schema]);

  const clearErrors = React.useCallback(() => {
    setErrors({});
  }, []);

  return { errors, validateField, clearErrors };
}