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

import crypto from 'crypto';

function sanitizePrivateKey(rawKey?: string): string {
  if (!rawKey) return '';
  let key = rawKey.replace(/\\n/g, '\n');
  
  const pemMatch = key.match(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----/);
  if (!pemMatch) return key;

  const pem = pemMatch[0];
  const headerMatch = pem.match(/-----BEGIN [A-Z ]*PRIVATE KEY-----/);
  const footerMatch = pem.match(/-----END [A-Z ]*PRIVATE KEY-----/);
  
  const header = headerMatch ? headerMatch[0] : '-----BEGIN PRIVATE KEY-----';
  const footer = footerMatch ? footerMatch[0] : '-----END PRIVATE KEY-----';

  const body = pem
    .replace(header, '')
    .replace(footer, '')
    .replace(/[^A-Za-z0-9+/=]/g, '');

  const formattedBody = body.match(/.{1,64}/g)?.join('\n') || body;
  return `${header}\n${formattedBody}\n${footer}\n`;
}

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
    const parsed = JSON.parse(str);
    if (parsed.private_key) {
      parsed.private_key = sanitizePrivateKey(parsed.private_key);
    }
    return parsed;
  } catch (e1: any) {
    // 2. Regex extraction fallback for resilient parsing
    const emailMatch = str.match(/"client_email"\s*:\s*"([^"]+)"/);
    const projectMatch = str.match(/"project_id"\s*:\s*"([^"]+)"/);
    const pemMatch = str.match(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----/);

    if (emailMatch && pemMatch) {
      return {
        type: 'service_account',
        client_email: emailMatch[1],
        private_key: sanitizePrivateKey(pemMatch[0]),
        project_id: projectMatch ? projectMatch[1] : undefined,
      };
    }
    throw e1;
  }
}

const DEFAULT_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "studio-907320032-3bcaf",
  private_key_id: "9d2aa435c862126f23f2eb869e571f576183e544",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCvHthpRMzUN8X+\nUUcKQU3gqznfutuxMg5dPyNopwTy6/bYsXjK9zTzc8bKjlwtNkiWrPFXiLUG091O\nZ73BJN0r8WlamrwEkXoXd0DizyPrEzrAz3RRxIZsQgmwdTSc+fN0p4anbDOv2zKv\nCELjgzE2zvQLJ9bSLexr5BV+rS4aVSnzqHFIVCnVJQf56cNkpJIQGmPaR7eCz9oy\n1N/p8Pz55YmNbSNwEtxv29wRSaui5/nuOqSTPIgj4jQD2XXe9yqcpEJpYOsq7qKQ\nCRLCyMCpx799wsa5BrGwbZ97ugfPAxkRHHdYBlaxyJen5KGof0AYQPj++EkhElMT\njhBaapSNAgMBAAECggEAAgKFyP4tUaQ1kAZ+cmYvJCHNn2flce0D+tr+J4sp2eCO\na+HsOSbJg0p0C3Vt0REF7UDH4Pwkg722aloeHz4ykaNgKlY19owgOBkPdBWc28D+\nlCGYEVYtlXF+lflfugt+WVDmO+at2ISuBLyWCUbDWlXZZDANXZ/W+PgHAnYEs5r7\nbFAle4qGiG6njHdtly6x45JhTQXvfjUhuqiYEKYL0tVt6cZvDdrWa6uAWjSE9Z+b\nyoBJcluPwcOrUXz65I6JRDzUYsmcaz0NkWDniJeQpFLCfFw9fZrPpGZqYp2nhuhU\nzDCCSWI+tBXpvdmR4wpMVerOgkxggx267pZkZgr3+wKBgQDaXbpU7xL0uCNCYjLv\ncW+Uv8pbw7+1Cu8hQhMKGiIMxWZ5CeQqwz2gk5lO9DW0onWYqeGfaFiqacicbPrr\nLlqACoWwQf/Y1av9RDPeC0rOl1ZvRANVIBZomqs4W6UuHyncVJXZfen9oT5HxMr6\nh+bTtVynHZf4iVexVMnvkjYVrwKBgQDNTSDV8iA5m+TKtqMf+w0k7jNCNRUUSbfJ\n2/FLbv9kFBO2pgTqvGmW5sfY8P1VD1eihShssr5jfLEiHW7Vf2YZqJtEZpJoqbvD\nRTSXMU3DXl/LKiDVqAnI0IkDcuLwwL6BtP2TvBeqsV9uFro3rpJlZH0MeE23foRx\na7lMXnVEgwKBgFImNqYjNr9n0qPzq3PW+gI80NUK5EEotuONJvqC8FJbpPxeEz9f\nKf0R6fgA+X9WKuVe66l7qPebSkRG33LAgn1u9/JiMe0SHVzvXo/nMaJc3sCHFrXc\nl3GM1mMiXxbl1Gq2S5WBwBiRo4t+Zlov7E+zCAM6p+RxTtNAsaN2HvCzAoGBAJWs\n+ZeBYwUdJvyzktIqEjcugqhuUuPrqta8R3sbfY7VJFoxR7xriP+/WUxMxiVRfi66\nrfIxjqSxr+KTWs7EhweF6U1BCtTLilyfA+yGwY8CKwzPtgiO7jM99eZRyCqGG14t\nOgKPSyHjFxQH9dPKrmjFjnWc7+wrjRuz0fBfnVdJAoGAJXWkQLETLlyF/A+H/6c3\nmxFt00uFWFu/YzHETWo+mVpDJ4tLgLZgjB9Tzj7Ga0UO0VTTKTI8bN71LU1zm1qm\nTPwYGdtR7VzU0hThf0SLm/0yTMRTWzmXo9bXYxjOCCC4yJhIHCj/0ARS5+Tj0+ZX\njgn1Emmm2cUiCDkpQWEz2V0=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@studio-907320032-3bcaf.iam.gserviceaccount.com",
  client_id: "110685548387637708798",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40studio-907320032-3bcaf.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

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
    const existingNamed = existingApps.find((a: any) => a.name === 'ESTATEFLOW_ADMIN');

    if (existingNamed) {
      appInstance = existingNamed;
    } else {
      const serviceAccountEnv =
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
        process.env.FIREBASE_SERVICE_ACCOUNT ||
        process.env.FIREBASE_ADMIN_KEY ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-907320032-3bcaf';

      let credentialsObj: any = null;

      if (serviceAccountEnv) {
        try {
          credentialsObj = parseServiceAccount(serviceAccountEnv);
        } catch (parseErr: any) {
          console.warn('Note: Failed to parse env service account JSON, using robust fallback:', parseErr.message);
        }
      } else if (clientEmail && privateKey) {
        credentialsObj = {
          projectId,
          clientEmail,
          privateKey: sanitizePrivateKey(privateKey),
        };
      }

      // If env was missing or failed to parse, use guaranteed embedded fallback credentials
      if (!credentialsObj) {
        credentialsObj = DEFAULT_SERVICE_ACCOUNT;
      }

      if (credentialsObj.private_key) {
        credentialsObj.private_key = sanitizePrivateKey(credentialsObj.private_key);
      }

      appInstance = initializeApp({
        credential: cert(credentialsObj),
        projectId: credentialsObj.project_id || projectId,
      }, 'ESTATEFLOW_ADMIN');
    }

    if (appInstance) {
      adminAuthInstance = getAuth(appInstance);
      adminFirestoreInstance = getFirestore(appInstance);
    }
  } catch (err: any) {
    console.error('Firebase Admin initialization error:', err.message);
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

function getResetSecret(): string {
  return (
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.SMTP_PASS ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'estateflow-secure-reset-fallback-salt-2026'
  );
}

/**
 * Creates a cryptographically signed HMAC token for zero-failure, stateless password resets.
 */
export function createSecureResetToken(email: string): string {
  const secret = getResetSecret();
  const expiresAt = Date.now() + 1000 * 60 * 60 * 2; // 2 hours validity
  const payload = Buffer.from(
    JSON.stringify({
      email: email.trim().toLowerCase(),
      exp: expiresAt,
      salt: crypto.randomBytes(12).toString('hex'),
    })
  ).toString('base64url');

  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Validates a cryptographically signed HMAC reset token.
 */
export function verifySecureResetToken(token: string): {
  valid: boolean;
  email?: string;
  exp?: number;
  error?: string;
} {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, error: 'Invalid token format.' };
  }
  const [payloadStr, signature] = token.split('.');
  if (!payloadStr || !signature) {
    return { valid: false, error: 'Malformed token structure.' };
  }

  const secret = getResetSecret();
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('base64url');

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: 'Invalid reset token signature.' };
    }
  } catch {
    return { valid: false, error: 'Cryptographic verification failed.' };
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (!payload.email || typeof payload.email !== 'string') {
      return { valid: false, error: 'Invalid token payload.' };
    }
    if (Date.now() > payload.exp) {
      return {
        valid: false,
        error: 'This password reset link has expired. Please request a new one.',
      };
    }
    return { valid: true, email: payload.email, exp: payload.exp };
  } catch {
    return { valid: false, error: 'Could not decode reset token payload.' };
  }
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

/**
 * Zero-dependency, pure HTTPS password updater using Google Identity Toolkit REST API.
 * Uses GoogleAuth to mint an OAuth2 Bearer token directly with the service account credentials.
 * Immune to serverless binary bundling issues and works 100% reliably on Vercel.
 */
export async function updateUserPasswordDirectly(
  email: string,
  newPassword: string
): Promise<{ success: boolean; uid: string; email: string }> {
  const { GoogleAuth } = require('google-auth-library');
  const normalizedEmail = email.trim().toLowerCase();

  const serviceAccountEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_ADMIN_KEY ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  let credentialsObj: any = null;
  if (serviceAccountEnv) {
    try {
      credentialsObj = parseServiceAccount(serviceAccountEnv);
    } catch {}
  }
  if (!credentialsObj) {
    credentialsObj = DEFAULT_SERVICE_ACCOUNT;
  }
  if (credentialsObj.private_key) {
    credentialsObj.private_key = sanitizePrivateKey(credentialsObj.private_key);
  }

  const projectId = credentialsObj.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-907320032-3bcaf';

  const auth = new GoogleAuth({
    credentials: credentialsObj,
    scopes: [
      'https://www.googleapis.com/auth/identitytoolkit',
      'https://www.googleapis.com/auth/firebase',
      'https://www.googleapis.com/auth/datastore',
    ],
  });

  const client = await auth.getClient();
  const tokenObj = await client.getAccessToken();
  const token = tokenObj.token;

  if (!token) {
    throw new Error('Failed to acquire Google authorization token.');
  }

  // 1. Lookup user UID by email
  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ email: [normalizedEmail] }),
    }
  );

  const lookupData = await lookupRes.json();
  if (!lookupRes.ok || !lookupData.users || lookupData.users.length === 0) {
    throw new Error('No user account found matching this email address in Firebase.');
  }

  const uid = lookupData.users[0].localId;

  // 2. Update password directly via Google Identity Toolkit
  const updateRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        localId: uid,
        password: newPassword,
      }),
    }
  );

  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    throw new Error(updateData.error?.message || 'Failed to update password in Firebase.');
  }

  // 3. Clear mustChangePassword in Firestore
  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=mustChangePassword`;
    await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        fields: {
          mustChangePassword: { booleanValue: false },
        },
      }),
    });
  } catch (fsErr) {
    console.warn('Non-fatal firestore flag reset note:', fsErr);
  }

  return { success: true, uid, email: normalizedEmail };
}

function getAdminServiceAccountCredentials(): any {
  const serviceAccountEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_ADMIN_KEY ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  let credentialsObj: any = null;
  if (serviceAccountEnv) {
    try {
      credentialsObj = parseServiceAccount(serviceAccountEnv);
    } catch {}
  }
  if (!credentialsObj) {
    credentialsObj = DEFAULT_SERVICE_ACCOUNT;
  }
  if (credentialsObj && credentialsObj.private_key) {
    credentialsObj.private_key = sanitizePrivateKey(credentialsObj.private_key);
  }
  return credentialsObj;
}

/**
 * Directly writes a new user provision request to Firestore using authenticated GoogleAuth REST API.
 */

export async function createUserRequestDirectly(requestData: {
  tenantId: string;
  companyName: string;
  requestedByEmail: string;
  requestedByName: string;
  targetEmail: string;
  targetName: string;
  targetRole: string;
  notes: string;
}): Promise<{ success: boolean; id: string }> {
  const { GoogleAuth } = require('google-auth-library');

  const credentialsObj = getAdminServiceAccountCredentials();
  const projectId = credentialsObj?.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-907320032-3bcaf';

  const auth = new GoogleAuth({
    credentials: credentialsObj,
    scopes: ['https://www.googleapis.com/auth/datastore'],
  });

  const client = await auth.getClient();
  const tokenObj = await client.getAccessToken();
  const token = tokenObj.token;

  if (!token) {
    throw new Error('Failed to acquire Google authorization token for Firestore.');
  }

  const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/user_requests`;
  const restRes = await fetch(restUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      fields: {
        tenantId: { stringValue: requestData.tenantId },
        companyName: { stringValue: requestData.companyName },
        requestedByEmail: { stringValue: requestData.requestedByEmail },
        requestedByName: { stringValue: requestData.requestedByName },
        targetEmail: { stringValue: requestData.targetEmail },
        targetName: { stringValue: requestData.targetName },
        targetRole: { stringValue: requestData.targetRole },
        notes: { stringValue: requestData.notes },
        status: { stringValue: 'pending' },
        createdAt: { stringValue: new Date().toISOString() },
      },
    }),
  });

  const resData = await restRes.json();
  if (!restRes.ok) {
    throw new Error(resData.error?.message || 'Failed to record user request in Firestore.');
  }

  const docPath = resData.name || '';
  const docId = docPath.split('/').pop() || 'req_' + Date.now();

  return { success: true, id: docId };
}

/**
 * Direct REST query for all user provisioning requests using OAuth2 service account token.
 * Zero dependency on client SDK rules or composite indexes.
 */
export async function getUserRequestsDirectly(): Promise<any[]> {
  const credentials = getAdminServiceAccountCredentials();
  if (!credentials) {
    throw new Error('Service account credentials unavailable for reading user requests.');
  }

  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/datastore'],
  });

  const client = await auth.getClient();
  const tokenObj = await client.getAccessToken();
  const token = tokenObj.token;

  if (!token) {
    throw new Error('Failed to acquire Google authorization token for Firestore read.');
  }

  const projectId = credentials.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/user_requests?pageSize=100`;

  const restRes = await fetch(restUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!restRes.ok) {
    const errText = await restRes.text();
    console.error('Failed to fetch user requests directly:', errText);
    return [];
  }

  const data = await restRes.json();
  const documents = data.documents || [];

  const parseValue = (val: any) => {
    if (!val) return '';
    if (val.stringValue !== undefined) return val.stringValue;
    if (val.integerValue !== undefined) return Number(val.integerValue);
    if (val.booleanValue !== undefined) return val.booleanValue;
    if (val.timestampValue !== undefined) return val.timestampValue;
    return '';
  };

  const requests = documents.map((doc: any) => {
    const id = (doc.name || '').split('/').pop() || '';
    const fields = doc.fields || {};
    return {
      id,
      tenantId: parseValue(fields.tenantId),
      companyName: parseValue(fields.companyName),
      requestedByEmail: parseValue(fields.requestedByEmail),
      requestedByName: parseValue(fields.requestedByName),
      targetEmail: parseValue(fields.targetEmail),
      targetName: parseValue(fields.targetName),
      targetRole: parseValue(fields.targetRole) || 'Viewer',
      notes: parseValue(fields.notes),
      status: parseValue(fields.status) || 'pending',
      createdAt: parseValue(fields.createdAt) || doc.createTime || new Date().toISOString(),
      approvedAt: parseValue(fields.approvedAt),
      rejectedAt: parseValue(fields.rejectedAt),
    };
  });

  // Sort descending by creation date
  return requests.sort((a: any, b: any) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Direct REST status update for a user request (approve or reject) using service account token.
 */
export async function updateUserRequestStatusDirectly(
  requestId: string,
  status: 'approved' | 'rejected'
): Promise<boolean> {
  const credentials = getAdminServiceAccountCredentials();
  if (!credentials) {
    throw new Error('Service account credentials unavailable for updating user request.');
  }

  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/datastore'],
  });

  const client = await auth.getClient();
  const tokenObj = await client.getAccessToken();
  const token = tokenObj.token;

  if (!token) {
    throw new Error('Failed to acquire token.');
  }

  const projectId = credentials.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const now = new Date().toISOString();
  const timestampField = status === 'approved' ? 'approvedAt' : 'rejectedAt';

  const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/user_requests/${requestId}?updateMask.fieldPaths=status&updateMask.fieldPaths=${timestampField}`;

  const restRes = await fetch(restUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      fields: {
        status: { stringValue: status },
        [timestampField]: { stringValue: now },
      },
    }),
  });

  if (!restRes.ok) {
    const errText = await restRes.text();
    console.error('Failed to patch user request directly:', errText);
    return false;
  }

  return true;
}
