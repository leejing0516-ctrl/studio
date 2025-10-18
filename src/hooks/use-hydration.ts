
"use client";

import { useState, useEffect } from 'react';

/**
 * A hook to determine if the component has been hydrated (i.e., rendered on the client).
 * This is crucial for avoiding hydration mismatches when dealing with client-side only data
 * or logic that differs between server and client initial render.
 *
 * @returns {boolean} `true` if the component has been hydrated, `false` otherwise.
 */
export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
