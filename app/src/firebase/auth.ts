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
        const authError = new Error(`Firebase Auth Error: ${error.message}`);
        console.error("Anonymous sign-in failed", authError);
        errorEmitter.emit('permission-error', authError);
    });
}
