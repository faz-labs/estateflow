import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Initializes and exports the Firebase Admin SDK instance.
 * Supports initialization via FIREBASE_SERVICE_ACCOUNT_KEY or
 * FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY.
 *
 * NOTE: On serverless platforms like Vercel (AWS Lambda), we do NOT initialize
 * without credentials, because doing so causes Admin SDK to query GCE metadata (169.254.169.254),
 * which hangs indefinitely on non-GCP hosts and triggers a 504/500 execution timeout.
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
      try {
        let trimmed = serviceAccountJson.trim();
        // Unwrap enclosing quotes if pasted with surrounding quotes in Vercel or .env
        if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
          trimmed = trimmed.slice(1, -1).trim();
        }

        if (trimmed.startsWith('{')) {
          const parsed = JSON.parse(trimmed);
          if (parsed.private_key) {
            parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
          }
          app = initializeApp({
            credential: cert(parsed),
            projectId: parsed.project_id || projectId,
          });
        } else if (trimmed.includes('BEGIN PRIVATE KEY') && clientEmail) {
          app = initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey: trimmed.replace(/\\n/g, '\n'),
            }),
            projectId,
          });
        } else {
          console.warn('FIREBASE_SERVICE_ACCOUNT_KEY does not appear to be a valid JSON object. It should contain the entire downloaded JSON key file starting with "{" and ending with "}".');
        }
      } catch (parseErr) {
        console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', parseErr);
      }
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
      // Intentionally omit initializeApp without credentials to prevent GCE metadata hang on Vercel
      app = null;
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
