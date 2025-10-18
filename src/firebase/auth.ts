'use client';
import {
  Auth,
  signInAnonymously,
} from 'firebase/auth';

export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance)
    .catch((error) => {
        console.error("Anonymous sign-in failed", error);
    });
}
