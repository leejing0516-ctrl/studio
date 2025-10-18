'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useMemoFirebase } from '../provider';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

// Internal type to access the private _query property for path info.
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
    }
  }
}

export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>))  | null | undefined,
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const stableQuery = useMemoFirebase(() => memoizedTargetRefOrQuery, [memoizedTargetRefOrQuery]);

  useEffect(() => {
    if (!stableQuery) {
      // If the query is null or undefined, it means we are not ready to fetch.
      // We set isLoading to false because we are not actively fetching.
      // This is important for the UI to know that the "not fetching" state is intentional.
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // When a valid query is provided, we start loading.
    setIsLoading(true);

    const unsubscribe = onSnapshot(
      stableQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: WithId<T>[] = snapshot.docs.map(doc => ({ ...(doc.data() as T), id: doc.id }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        // Try to get the path for better error messages
        const path: string = stableQuery.type === 'collection'
            ? (stableQuery as CollectionReference).path
            : (stableQuery as unknown as InternalQuery)._query.path.canonicalString();

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        console.error(contextualError.message);
        setError(contextualError);
        setData(null);
        setIsLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [stableQuery]); 

  return { data, isLoading, error };
}
