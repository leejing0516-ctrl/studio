'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// This function initializes and returns the Firebase services.
// It's structured to prevent re-initialization on hot reloads.
export function initializeFirebase() {
  const isConfigPresent = Object.keys(firebaseConfig).length > 0;

  if (getApps().length) {
    const app = getApp();
    if (isConfigPresent) {
      // If config is present, we assume production environment.
      // We don't connect to emulators.
      return getSdks(app);
    } else {
      // If no config, we assume local development with emulators.
      return getSdksWithEmulators(app);
    }
  }
  
  // If no app is initialized, create a new one.
  const firebaseApp = initializeApp(isConfigPresent ? firebaseConfig : { projectId: 'demo-project' });
  if (isConfigPresent) {
    return getSdks(firebaseApp);
  } else {
    return getSdksWithEmulators(firebaseApp);
  }
}

// Returns the SDKs for a production-like environment.
function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

// Returns the SDKs and connects them to the local emulators.
function getSdksWithEmulators(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  
  // Check if emulators are already running to avoid re-connecting.
  // The _isEmulator field is an internal detail, but useful here.
  if (!(auth as any)._isEmulator) {
    console.log("Connecting to Auth Emulator");
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  if (!(firestore as any)._isEmulator) {
    console.log("Connecting to Firestore Emulator");
    connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
  }

  return { firebaseApp, auth, firestore };
}

export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth';
export * from './errors';
export * from './error-emitter';
