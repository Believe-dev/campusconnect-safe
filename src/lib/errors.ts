// Centralized error handling
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network error occurred') {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}

export class PaymentError extends AppError {
  constructor(message: string = 'Payment processing failed') {
    super(message, 'PAYMENT_ERROR', 402);
    this.name = 'PaymentError';
  }
}

// Error handling utilities
export const handleSupabaseError = (error: any): AppError => {
  if (!error) return new AppError('Unknown error occurred', 'UNKNOWN_ERROR');

  // Handle specific Supabase error codes
  switch (error.code) {
    case 'PGRST116':
      return new NotFoundError();
    case '23505':
      return new ValidationError('This item already exists');
    case '23503':
      return new ValidationError('Referenced item does not exist');
    case '42501':
      return new AuthorizationError('Access denied');
    default:
      return new AppError(
        error.message || 'Database operation failed',
        error.code || 'DB_ERROR',
        500
      );
  }
};

export const handleNetworkError = (error: any): NetworkError => {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new NetworkError('Unable to connect to server. Check your internet connection.');
  }
  return new NetworkError(error.message || 'Network request failed');
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};

export const isRetryableError = (error: AppError): boolean => {
  return [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'SERVER_ERROR'
  ].includes(error.code);
};

// Error logging utility
export const logError = (error: Error, context?: Record<string, any>) => {
  console.error('Error occurred:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
  
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
  }
};