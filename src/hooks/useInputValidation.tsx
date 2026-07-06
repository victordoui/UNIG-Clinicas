import { useState, useCallback } from 'react';
import { validateEmail, validateText, validateNumber, validatePassword } from '@/lib/validation';

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => ValidationResult;
}

export function useInputValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((
    fieldName: string,
    value: any,
    type: 'text' | 'email' | 'number' | 'password' = 'text',
    rules: ValidationRules = {}
  ): ValidationResult => {
    let result: ValidationResult = { isValid: true };

    switch (type) {
      case 'email':
        result = validateEmail(value);
        break;
      
      case 'number':
        const numResult = validateNumber(value, {
          required: rules.required,
          min: rules.min,
          max: rules.max,
          fieldName: fieldName
        });
        result = {
          isValid: numResult.isValid,
          error: numResult.error
        };
        break;
      
      case 'password':
        const passResult = validatePassword(value);
        result = {
          isValid: passResult.isValid,
          error: passResult.errors[0] // Show first error
        };
        break;
      
      default:
        result = validateText(value, {
          required: rules.required,
          minLength: rules.minLength,
          maxLength: rules.maxLength,
          allowedChars: rules.pattern,
          fieldName: fieldName
        });
    }

    // Apply custom validation if provided
    if (result.isValid && rules.custom) {
      result = rules.custom(value);
    }

    // Update errors state
    setErrors(prev => ({
      ...prev,
      [fieldName]: result.error || ''
    }));

    return result;
  }, []);

  const validateForm = useCallback((
    formData: Record<string, any>,
    fieldRules: Record<string, { type?: 'text' | 'email' | 'number' | 'password'; rules?: ValidationRules }>
  ): boolean => {
    let isFormValid = true;
    const newErrors: Record<string, string> = {};

    Object.entries(fieldRules).forEach(([fieldName, config]) => {
      const value = formData[fieldName];
      const result = validateField(fieldName, value, config.type, config.rules);
      
      if (!result.isValid) {
        isFormValid = false;
        newErrors[fieldName] = result.error || '';
      }
    });

    setErrors(newErrors);
    return isFormValid;
  }, [validateField]);

  const markFieldTouched = useCallback((fieldName: string) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return touched[fieldName] ? errors[fieldName] : undefined;
  }, [errors, touched]);

  return {
    validateField,
    validateForm,
    markFieldTouched,
    clearErrors,
    getFieldError,
    errors,
    touched
  };
}