// Security utilities for input validation and sanitization

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>\"'&]/g, '');
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 100;
};

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { isValid: false, message: 'Password must be less than 128 characters' };
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' };
  }
  return { isValid: true };
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validateName = (name: string): boolean => {
  const sanitized = sanitizeInput(name);
  return sanitized.length >= 2 && sanitized.length <= 50 && /^[a-zA-Z\s]+$/.test(sanitized);
};

export const validateStudentId = (studentId: string): boolean => {
  const sanitized = sanitizeInput(studentId);
  return sanitized.length >= 5 && sanitized.length <= 20;
};

export const validateAmount = (amount: number, max?: number): boolean => {
  return amount > 0 && amount <= (max || Number.MAX_SAFE_INTEGER) && Number.isFinite(amount);
};

export const sanitizeHtml = (html: string): string => {
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const rateLimitKey = (userId: string, action: string): string => {
  return `rate_limit:${userId}:${action}`;
};

// Check if user has permission to access resource
export const hasPermission = async (userId: string, resourceId: string, action: 'read' | 'write' | 'delete'): Promise<boolean> => {
  // This would typically check against a permissions table or role-based access control
  // For now, we'll implement basic ownership checks
  return true; // Placeholder - implement based on your permission system
};