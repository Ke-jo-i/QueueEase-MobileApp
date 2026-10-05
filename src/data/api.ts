import Constants from 'expo-constants';
import { Platform } from 'react-native';

const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
export const apiUrl = configured || (Platform.OS === 'web'
  ? `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4100`
  : expoHost ? `http://${expoHost}:4100` : '');

export class ApiError extends Error { constructor(message: string, public status = 0) { super(message); } }
export async function request<T>(path: string, token?: string | null, body?: object, requestId?: string): Promise<T> {
  if (!apiUrl) throw new ApiError('The server address is not configured. Set EXPO_PUBLIC_API_URL before starting the app.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method: body ? 'POST' : 'GET', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(requestId ? { 'X-Request-ID': requestId } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const value = await response.json();
    if (!response.ok) throw new ApiError(value.message ?? 'Request failed.', response.status);
    return value as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Cannot reach QueueEase. Check your connection and that the queue server is running.');
  } finally { clearTimeout(timeout); }
}
