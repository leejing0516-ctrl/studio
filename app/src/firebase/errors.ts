'use client';
// This is a simplified error module for now.
// It can be expanded later if detailed contextual errors are needed.

/**
 * A custom error class for Firestore permission issues.
 * For now, it's a standard Error, but it's typed to be distinguished
 * from other errors in the app.
 */
export class FirestorePermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirestorePermissionError';
  }
}
