
import { useState, useEffect } from 'react';

// THIS FILE IS NO LONGER USED
// It is kept to prevent breaking imports, but it is not needed
// with the new simplified auth flow.

/**
 * A simple hook to determine if the component has been hydrated (i.e., rendered on the client).
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
