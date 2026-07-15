'use client';

import { AuthResponse } from './types';

const STORAGE_KEY = 'messenger-auth';

export function getStoredAuth(): AuthResponse | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(STORAGE_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthResponse;
  } catch {
    return null;
  }
}

export function setStoredAuth(value: AuthResponse | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}
