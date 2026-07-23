import Image from 'next/image';
import { cn } from '@/lib/utils';

export function MoveTickWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('relative block h-[34px] w-[140px] overflow-hidden', className)} aria-label="Move-Tick">
      <Image src="/brand/Icon-512.png" alt="Move-Tick" width={152} height={152} priority className="absolute -left-[6px] -top-[87px] max-w-none" />
    </span>
  );
}

export function MoveTickBrand({ className }: { className?: string }) {
  return (
    <span className={cn('relative block h-[210px] w-[300px] max-w-full overflow-hidden', className)}>
      <Image src="/brand/Icon-512.png" alt="Move-Tick platform" width={320} height={320} className="absolute -left-[10px] -top-[42px] max-w-none" />
    </span>
  );
}

export function MoveBeyondBrand({ className }: { className?: string }) {
  return (
    <span className={cn('relative block h-[108px] w-[270px] max-w-full overflow-hidden', className)}>
      <Image src="/brand/mb-logo-white.png" alt="Move Beyond" width={270} height={382} className="absolute left-0 -top-[107px] max-w-none" />
    </span>
  );
}

/** Full, uncropped Move Beyond mark — use where the whole logo (mark + wordmark) should be visible. */
export function MoveBeyondMark({ className }: { className?: string }) {
  return (
    <Image src="/brand/mb-logo-white.png" alt="Move Beyond" width={270} height={382} className={cn('h-auto w-28', className)} />
  );
}
