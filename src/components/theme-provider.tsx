'use client';

import { type ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always light mode
  return <>{children}</>;
}
