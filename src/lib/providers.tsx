'use client';

import { type ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';

// All data fetching is server-side (RSC + server actions); React Query was
// installed but never used, so its provider was removed to slim the bundle.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" themes={['light', 'dark']} enableSystem={false} disableTransitionOnChange>
      <TooltipProvider delay={300}>
        {children}
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
