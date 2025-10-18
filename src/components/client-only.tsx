"use client";

import { useState, useEffect, type ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * A component that ensures its children are only rendered on the client side.
 * This is a reliable way to prevent hydration errors for components that
 * depend on browser-specific APIs (like window, localStorage, etc.) or
 * have logic that might produce different outputs on the server and client.
 *
 * @param {ClientOnlyProps} props - The component props.
 * @param {ReactNode} props.children - The component(s) to render only on the client.
 * @param {ReactNode} [props.fallback=null] - A component or element to render on the server
 * and during the initial client-side render, before the actual children are mounted.
 * @returns {ReactNode} The fallback on the server/initial render, or the children on the client.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps): ReactNode {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return fallback;
  }

  return children;
}
