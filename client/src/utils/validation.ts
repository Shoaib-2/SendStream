// src/utils/validation.ts
export const validateEmail = (email: string): string | null => {
    if (!email) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Invalid email address';
    return null;
  };
  
  export const validatePassword = (password: string): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 12) return 'Password must be at least 12 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one special character (!@#$%^&*()_+-=[]{};\'":\\|,.<>/?)';
    }
    return null;
  };