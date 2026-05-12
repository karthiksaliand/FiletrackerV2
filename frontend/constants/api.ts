import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

function getBaseUrl(): string {
  // On web: ALWAYS use the current origin — this ensures the web app
  // talks to its own backend whether on preview or deployed URL
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  // On mobile (APK): use the env variable set at build time.
  // IMPORTANT: EXPO_PUBLIC_BACKEND_URL in frontend/.env MUST match the deployed
  // website URL so the APK and the web app share the same database.
  // The hard-coded fallback below is the current production URL — keep it in
  // sync with the deployment so an APK built without the env var still works.
  return process.env.EXPO_PUBLIC_BACKEND_URL || 'https://dept-workflow-2.preview.emergentagent.com';
}

const BASE_URL = getBaseUrl();

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}/api${endpoint}`;
  console.log('[API]', options.method || 'GET', url);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}
