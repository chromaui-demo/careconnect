import { Platform } from 'react-native';
import { configureApiBase } from '@careconnect/api-client';

/**
 * Where the app finds the CareConnect API. Set EXPO_PUBLIC_API_URL (e.g.
 * `https://<your-host>/api`) for a deployed environment. The local default
 * targets `npm run api:dev` on port 5000; the Android emulator reaches the
 * host machine at 10.0.2.2 rather than localhost.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');

configureApiBase(API_URL);
