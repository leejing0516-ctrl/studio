'use client';
import {
  Auth,
  signInAnonymously,
} from 'firebase/auth';
import { errorEmitter } from './error-emitter';

export function initiateAnonymousSignIn(authInstance: Auth | null): void {
  if (!authInstance) return;
  signInAnonymously(authInstance)
    .catch((error) => {
        console.error("Anonymous sign-in failed", error);
        // We can optionally emit a global error here if needed
        // errorEmitter.emit('permission-error', error);
    });
}
