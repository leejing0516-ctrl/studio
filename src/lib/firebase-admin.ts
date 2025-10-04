
import admin from 'firebase-admin';

// This function ensures Firebase Admin is initialized only once.
const getFirebaseAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // When initializing on the server, we don't need the NEXT_PUBLIC_ prefix.
  // Using the correct server-side environment variables is crucial.
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
};

// Lazily initialize and cache the instances.
let adminDbInstance: admin.firestore.Firestore | null = null;
let adminStorageInstance: admin.storage.Storage | null = null;

export const getAdminDb = () => {
    if (!adminDbInstance) {
        adminDbInstance = getFirebaseAdminApp().firestore();
    }
    return adminDbInstance;
}

export const getAdminStorage = () => {
    if (!adminStorageInstance) {
        adminStorageInstance = getFirebaseAdminApp().storage();
    }
    return adminStorageInstance;
}
