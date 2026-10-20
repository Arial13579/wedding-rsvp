/* Site + event configuration. The Firebase web config is public by design;
   access is enforced by firestore.rules + Google sign-in. */

export const OWNER_EMAIL = 'arielkahalani1@gmail.com';

/** GitHub Pages project path (no trailing slash) */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '/wedding-rsvp';
export const SITE_URL = 'https://arial13579.github.io' + BASE;

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCuC0SP-l3WSrZ57LdMbiEI15DwK8d1aQ4',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'wedding-rsvp-e2e0f.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'wedding-rsvp-e2e0f',
  storageBucket: 'wedding-rsvp-e2e0f.firebasestorage.app',
  messagingSenderId: '169119650995',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:169119650995:web:4260a21d1e5a3312054cc6',
};

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
