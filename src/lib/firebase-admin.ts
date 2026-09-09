import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Lazy and resilient Firebase Admin SDK initializer.
 * Supports multiple formats (raw JSON, quoted JSON, Base64 JSON, or clientEmail + privateKey env vars).
 */
let appInstance: App | null = null;
let adminAuthInstance: Auth | null = null;
let adminFirestoreInstance: Firestore | null = null;

function parseServiceAccount(rawStr: string): any {
  let str = rawStr.trim();
  // Strip surrounding quotes if pasted with quotes
  if (
    (str.startsWith("'") && str.endsWith("'")) ||
    (str.startsWith('"') && str.endsWith('"'))
  ) {
    str = str.slice(1, -1).trim();
  }

  // Support base64 encoded service account JSON
  if (!str.startsWith('{')) {
    try {
      const decoded = Buffer.from(str, 'base64').toString('utf8');
      if (decoded.trim().startsWith('{')) {
        str = decoded.trim();
      }
    } catch {}
  }

  // 1. Direct JSON.parse
  try {
    return JSON.parse(str);
  } catch (e1: any) {
    // 2. Try sanitizing unescaped newlines
    try {
      const sanitized = str.replace(/[\r\n]+/g, ' ');
      return JSON.parse(sanitized);
    } catch (e2) {
      // 3. Regex extraction fallback for resilient parsing
      const emailMatch = str.match(/"client_email"\s*:\s*"([^"]+)"/);
      const keyMatch = str.match(/"private_key"\s*:\s*"((?:[^"\\]|\\.)+)"/);
      const projectMatch = str.match(/"project_id"\s*:\s*"([^"]+)"/);
      if (emailMatch && keyMatch) {
        return {
          client_email: emailMatch[1],
          private_key: keyMatch[1].replace(/\\n/g, '\n'),
          project_id: projectMatch ? projectMatch[1] : undefined,
        };
      }
      throw e1;
    }
  }
}

export function initFirebaseAdmin(): {
  app: App | null;
  adminAuth: Auth | null;
  adminFirestore: Firestore | null;
} {
  // If already successfully initialized, return cached instances
  if (appInstance && adminAuthInstance) {
    return {
      app: appInstance,
      adminAuth: adminAuthInstance,
      adminFirestore: adminFirestoreInstance,
    };
  }

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
          const parsed = parseServiceAccount(serviceAccountJson);
          if (parsed.private_key) {
            parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
          }
          appInstance = initializeApp({
            credential: cert(parsed),
            projectId: parsed.project_id || projectId,
          });
        } catch (parseErr: any) {
          console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseErr.message);
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
  } catch (err: any) {
    console.warn('Firebase Admin initialization error:', err.message);
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
