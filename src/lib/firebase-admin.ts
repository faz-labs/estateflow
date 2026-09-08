import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Initializes and exports the Firebase Admin SDK instance.
 * Supports initialization via FIREBASE_SERVICE_ACCOUNT_KEY,
 * FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY,
 * or standard application default credentials.
 */
let app: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;

try {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-907320032-3bcaf';

    if (serviceAccountJson) {
      const parsed = JSON.parse(serviceAccountJson);
      app = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
      });
    } else if (clientEmail && privateKey) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    } else {
      app = initializeApp({
        projectId,
      });
    }
  }

  if (app) {
    adminAuth = getAuth(app);
    adminFirestore = getFirestore(app);
  }
} catch (err) {
  console.warn('Firebase Admin initialization note (will use REST API fallbacks):', err);
}

export { app, adminAuth, adminFirestore };
