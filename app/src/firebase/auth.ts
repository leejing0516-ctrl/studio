'use client';
import {
  Auth,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { errorEmitter } from './error-emitter';

export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance)
    .catch((error) => {
        // We can't use the full permission error here as it's not a firestore error
        console.error("Anonymous sign-in failed", error);
        errorEmitter.emit('permission-error', error);
    });
}
