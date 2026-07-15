'use client';

import { getStoredAuth, setStoredAuth } from './storage';
import { AuthResponse, Conversation, Message } from './types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const response = await apiRequest(path, init, retry);

  return response.json() as Promise<T>;
}

async function apiRequest(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const auth = getStoredAuth();
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth?.accessToken) {
    headers.set('Authorization', `Bearer ${auth.accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && auth?.refreshToken && retry) {
    const refreshed = await refreshAuthToken(auth.refreshToken);
    setStoredAuth(refreshed);
    return apiRequest(path, init, false);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed.');
  }

  return response;
}

export async function register(username: string, password: string) {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function login(username: string, password: string) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function refreshAuthToken(refreshToken: string) {
  return apiFetch<AuthResponse>(
    '/auth/refresh',
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    },
    false,
  );
}

export async function logout() {
  await apiFetch<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

export async function getMe() {
  return apiFetch<AuthResponse['user']>('/auth/me');
}

export async function getConversations() {
  return apiFetch<Conversation[]>('/conversations');
}

export async function openConversationByUsername(username: string) {
  return apiFetch<Conversation>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function getMessages(conversationId: number) {
  return apiFetch<Message[]>(`/messages?conversationId=${conversationId}`);
}

export async function sendTextMessage(conversationId: number, text: string) {
  return apiFetch<Message>('/messages', {
    method: 'POST',
    body: JSON.stringify({ conversationId, text }),
  });
}

export async function uploadMedia(
  conversationId: number,
  text: string,
  file: File,
) {
  const formData = new FormData();
  formData.append('conversationId', String(conversationId));
  if (text.trim()) {
    formData.append('text', text.trim());
  }
  formData.append('file', file);

  return apiFetch<Message>('/uploads/media', {
    method: 'POST',
    body: formData,
    headers: {},
  });
}

export function buildMediaUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

export async function fetchMediaBlobUrl(path: string) {
  const response = await apiRequest(path, {
    method: 'GET',
  });

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
