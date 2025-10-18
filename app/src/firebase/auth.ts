'use client';
import {
  Auth,
  signInAnonymously,
} from 'firebase/auth';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance)
    .catch((error) => {
        // This is an auth error, not a Firestore permission error, but we can use the same system
        // to display it in the dev overlay for consistency. We'll create a generic error.
        const authError = new Error(`Firebase Auth Error: ${error.message}`);
        console.error("Anonymous sign-in failed", authError);
        // We emit it as a generic error, which our listener can also handle.
        errorEmitter.emit('permission-error', authError);
    });
}
