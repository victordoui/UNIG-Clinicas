// Comprehensive input validation and sanitization utilities

/**
 * Validates and sanitizes email addresses
 */
export const validateEmail = (email: string): { isValid: boolean; sanitized: string; error?: string } => {
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!sanitized) {
    return { isValid: false, sanitized, error: 'Email is required' };
  }
  
  if (sanitized.length > 254) {
    return { isValid: false, sanitized, error: 'Email is too long' };
  }
  
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, sanitized, error: 'Invalid email format' };
  }
  
  return { isValid: true, sanitized };
};

/**
 * Validates and sanitizes text input
 */
export const validateText = (
  text: string, 
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    allowedChars?: RegExp;
    fieldName?: string;
  } = {}
): { isValid: boolean; sanitized: string; error?: string } => {
  const { required = false, minLength = 0, maxLength = 1000, allowedChars, fieldName = 'Field' } = options;
  
  // Basic sanitization - remove dangerous characters
  let sanitized = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
  
  if (!sanitized && required) {
    return { isValid: false, sanitized, error: `${fieldName} is required` };
  }
  
  if (sanitized.length < minLength) {
    return { isValid: false, sanitized, error: `${fieldName} must be at least ${minLength} characters` };
  }
  
  if (sanitized.length > maxLength) {
    return { isValid: false, sanitized, error: `${fieldName} must be less than ${maxLength} characters` };
  }
  
  if (allowedChars && !allowedChars.test(sanitized)) {
    return { isValid: false, sanitized, error: `${fieldName} contains invalid characters` };
  }
  
  return { isValid: true, sanitized };
};

/**
 * Validates and sanitizes numeric input
 */
export const validateNumber = (
  value: string | number,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
    fieldName?: string;
  } = {}
): { isValid: boolean; parsed: number | null; error?: string } => {
  const { required = false, min, max, integer = false, fieldName = 'Number' } = options;
  
  if (!value && value !== 0) {
    if (required) {
      return { isValid: false, parsed: null, error: `${fieldName} is required` };
    }
    return { isValid: true, parsed: null };
  }
  
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(parsed)) {
    return { isValid: false, parsed: null, error: `${fieldName} must be a valid number` };
  }
  
  if (integer && !Number.isInteger(parsed)) {
    return { isValid: false, parsed: null, error: `${fieldName} must be a whole number` };
  }
  
  if (min !== undefined && parsed < min) {
    return { isValid: false, parsed: null, error: `${fieldName} must be at least ${min}` };
  }
  
  if (max !== undefined && parsed > max) {
    return { isValid: false, parsed: null, error: `${fieldName} must be at most ${max}` };
  }
  
  return { isValid: true, parsed };
};

/**
 * Validates password strength
 */
export const validatePassword = (password: string): { isValid: boolean; strength: 'weak' | 'medium' | 'strong'; errors: string[] } => {
  const errors: string[] = [];
  let score = 0;
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }
  
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  
  return {
    isValid: errors.length === 0,
    strength,
    errors
  };
};

/**
 * Sanitizes user input for safe display
 */
export const sanitizeForDisplay = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validates file upload security
 */
export const validateFile = (
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    fieldName?: string;
  } = {}
): { isValid: boolean; error?: string } => {
  const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/gif'], fieldName = 'File' } = options;
  
  if (file.size > maxSize) {
    return { isValid: false, error: `${fieldName} size must be less than ${Math.round(maxSize / 1024 / 1024)}MB` };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: `${fieldName} type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }
  
  return { isValid: true };
};

/**
 * Rate limiting check (client-side helper)
 */
export const createRateLimiter = (maxAttempts: number, windowMs: number) => {
  const attempts = new Map<string, number[]>();
  
  return (identifier: string): boolean => {
    const now = Date.now();
    const userAttempts = attempts.get(identifier) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(timestamp => now - timestamp < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return false; // Rate limited
    }
    
    // Record this attempt
    recentAttempts.push(now);
    attempts.set(identifier, recentAttempts);
    
    return true; // Allowed
  };
};