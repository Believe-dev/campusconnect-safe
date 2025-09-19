// Data validation utilities for forms and inputs

export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  if (!phoneRegex.test(cleanPhone)) {
    return 'Please enter a valid phone number';
  }
  return null;
};

export const validatePrice = (price: string): string | null => {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice <= 0) {
    return 'Price must be a positive number';
  }
  if (numPrice > 10000000) {
    return 'Price cannot exceed ₦10,000,000';
  }
  return null;
};

export const validateTextLength = (text: string, minLength: number, maxLength: number, fieldName: string): string | null => {
  if (text.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters long`;
  }
  if (text.length > maxLength) {
    return `${fieldName} cannot exceed ${maxLength} characters`;
  }
  return null;
};

export const validateStudentId = (studentId: string): string | null => {
  // Basic student ID format validation
  const studentIdRegex = /^[A-Za-z0-9\/\-]{5,20}$/;
  if (!studentIdRegex.test(studentId)) {
    return 'Student ID format is invalid';
  }
  return null;
};

export const validateImageFile = (file: File): string | null => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return 'Only JPEG, PNG, and WebP images are allowed';
  }

  if (file.size > maxSize) {
    return 'Image size cannot exceed 5MB';
  }

  return null;
};

// Sanitize user input to prevent XSS - Import DOMPurify for proper sanitization
import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Use DOMPurify for proper XSS prevention
  return DOMPurify.sanitize(input.trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

// Sanitize HTML content while preserving safe tags
export const sanitizeHTML = (html: string): string => {
  if (!html || typeof html !== 'string') return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};

// Validate form data object
export const validateFormData = (data: Record<string, any>, rules: Record<string, (value: any) => string | null>): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  Object.entries(rules).forEach(([field, validator]) => {
    // Sanitize input before validation
    const sanitizedValue = typeof data[field] === 'string' ? sanitizeInput(data[field]) : data[field];
    const error = validator(sanitizedValue);
    if (error) {
      errors[field] = error;
    }
  });
  
  return errors;
};