'use client';
import {
  Auth,
  signInAnonymously,
} from 'firebase/auth';
import { errorEmitter } from './error-emitter';

export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance)
    .catch((error) => {
        console.error("Anonymous sign-in failed", error);
        errorEmitter.emit('permission-error', error);
    });
}
