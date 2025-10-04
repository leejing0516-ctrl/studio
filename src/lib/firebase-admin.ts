
import admin from 'firebase-admin';

const getFirebaseAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
    // In case of error, we throw it to prevent the application from proceeding with a non-initialized app
    throw new Error('Failed to initialize Firebase Admin SDK: ' + (error as Error).message);
  }
};

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
