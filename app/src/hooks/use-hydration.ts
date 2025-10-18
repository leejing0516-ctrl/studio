import { useState, useEffect } from 'react';

/**
 * A simple hook to determine if the component has been hydrated (i.e., rendered on the client).
 * This is useful for avoiding hydration mismatches when dealing with client-side only data
 * like localStorage or sessionStorage.
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
