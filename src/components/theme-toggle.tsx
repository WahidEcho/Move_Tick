'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const emptySubscribe = () => () => undefined;

export function ThemeToggle({ showLabel = false, className }: { showLabel?: boolean; className?: string }) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const { resolvedTheme, setTheme } = useTheme();
  const dark = !mounted || resolvedTheme !== 'light';
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? 'default' : 'icon'}
      className={cn(showLabel && 'w-full justify-start', className)}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {showLabel && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
    </Button>
  );
}
