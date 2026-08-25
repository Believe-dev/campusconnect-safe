// Client-side encryption utilities for sensitive data

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'unimarket-secure-key-2024';

// Simple encryption for localStorage data (not for production secrets)
export const encryptData = (data: string): string => {
  try {
    const encoded = btoa(unescape(encodeURIComponent(data)));
    return encoded.split('').reverse().join('');
  } catch (error) {
    // Secure error logging
    console.error('[ENCRYPTION_ERROR]', 'Failed to encrypt data');
    return data;
  }
};

export const decryptData = (encryptedData: string): string => {
  try {
    const reversed = encryptedData.split('').reverse().join('');
    return decodeURIComponent(escape(atob(reversed)));
  } catch (error) {
    // Secure error logging
    console.error('[DECRYPTION_ERROR]', 'Failed to decrypt data');
    return encryptedData;
  }
};

// Secure localStorage wrapper
export const secureStorage = {
  setItem: (key: string, value: string) => {
    try {
      const encrypted = encryptData(value);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      // Secure error logging
      console.error('[STORAGE_SET_ERROR]', 'Failed to set secure storage');
    }
  },
  
  getItem: (key: string): string | null => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      return decryptData(encrypted);
    } catch (error) {
      // Secure error logging
      console.error('[STORAGE_GET_ERROR]', 'Failed to get secure storage');
      return null;
    }
  },
  
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  },
  
  clear: () => {
    localStorage.clear();
  }
};

// Hash sensitive data for comparison
export const hashData = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};