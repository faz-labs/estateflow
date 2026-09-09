import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Lazy and resilient Firebase Admin SDK initializer.
 * Avoids crashing Next.js serverless functions during module resolution.
 */
let appInstance: App | null = null;
let adminAuthInstance: Auth | null = null;
let adminFirestoreInstance: Firestore | null = null;
let initAttempted = false;

export function initFirebaseAdmin(): {
  app: App | null;
  adminAuth: Auth | null;
  adminFirestore: Firestore | null;
} {
  if (initAttempted) {
    return {
      app: appInstance,
      adminAuth: adminAuthInstance,
      adminFirestore: adminFirestoreInstance,
    };
  }

  initAttempted = true;

  try {
    // Dynamic require so Next.js does not crash during static analysis or cold start
    const { initializeApp, getApps, cert } = require('firebase-admin/app');
    const { getAuth } = require('firebase-admin/auth');
    const { getFirestore } = require('firebase-admin/firestore');

    const existingApps = getApps();
    if (existingApps.length > 0) {
      appInstance = existingApps[0];
    } else {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-907320032-3bcaf';

      if (serviceAccountJson) {
        try {
          let trimmed = serviceAccountJson.trim();
          // Unwrap quotes if pasted with surrounding quotes in Vercel
          if (
            (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
            (trimmed.startsWith('"') && trimmed.endsWith('"'))
          ) {
            trimmed = trimmed.slice(1, -1).trim();
          }

          if (trimmed.startsWith('{')) {
            const parsed = JSON.parse(trimmed);
            if (parsed.private_key) {
              parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
            }
            appInstance = initializeApp({
              credential: cert(parsed),
              projectId: parsed.project_id || projectId,
            });
          } else if (trimmed.includes('BEGIN PRIVATE KEY') && clientEmail) {
            appInstance = initializeApp({
              credential: cert({
                projectId,
                clientEmail,
                privateKey: trimmed.replace(/\\n/g, '\n'),
              }),
              projectId,
            });
          }
        } catch (parseErr) {
          console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', parseErr);
        }
      } else if (clientEmail && privateKey) {
        appInstance = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          projectId,
        });
      }
    }

    if (appInstance) {
      adminAuthInstance = getAuth(appInstance);
      adminFirestoreInstance = getFirestore(appInstance);
    }
  } catch (err) {
    console.warn('Firebase Admin lazy initialization note (falling back to REST/custom tokens):', err);
  }

  return {
    app: appInstance,
    adminAuth: adminAuthInstance,
    adminFirestore: adminFirestoreInstance,
  };
}

export function getAdminAuth(): Auth | null {
  return initFirebaseAdmin().adminAuth;
}

export function getAdminFirestore(): Firestore | null {
  return initFirebaseAdmin().adminFirestore;
}

// Proxied exports for backwards compatibility
export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    const auth = getAdminAuth();
    if (!auth) return undefined;
    const value = (auth as any)[prop];
    return typeof value === 'function' ? value.bind(auth) : value;
  },
});

export const adminFirestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const firestore = getAdminFirestore();
    if (!firestore) return undefined;
    const value = (firestore as any)[prop];
    return typeof value === 'function' ? value.bind(firestore) : value;
  },
});

export const app = new Proxy({} as App, {
  get(_target, prop) {
    const app = initFirebaseAdmin().app;
    if (!app) return undefined;
    const value = (app as any)[prop];
    return typeof value === 'function' ? value.bind(app) : value;
  },
});
