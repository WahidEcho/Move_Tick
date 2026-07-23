'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

const reveal: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={reduce ? undefined : reveal}
      initial={reduce ? undefined : 'hidden'}
      whileInView={reduce ? undefined : 'visible'}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function TicketOrbit({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 420 420"
      className={cn('pointer-events-none', className)}
      fill="none"
    >
      <motion.circle
        cx="210"
        cy="210"
        r="148"
        stroke="url(#orbit-gradient)"
        strokeWidth="1.25"
        strokeDasharray="8 14"
        initial={reduce ? undefined : { pathLength: 0, opacity: 0 }}
        animate={reduce ? undefined : { pathLength: 1, opacity: 0.55, rotate: 360 }}
        transition={{ pathLength: { duration: 1.8 }, rotate: { duration: 34, repeat: Infinity, ease: 'linear' } }}
        style={{ transformOrigin: '210px 210px' }}
      />
      <motion.path
        d="M72 219C108 108 194 68 304 107c47 17 76 52 88 94"
        stroke="rgba(255,255,255,.2)"
        strokeWidth="1"
        initial={reduce ? undefined : { pathLength: 0 }}
        animate={reduce ? undefined : { pathLength: 1 }}
        transition={{ duration: 2.2, delay: 0.3 }}
      />
      {[[82, 217], [304, 107], [389, 201]].map(([cx, cy], index) => (
        <motion.circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={index === 1 ? 5 : 3}
          fill={index === 1 ? '#4ade00' : '#7557ff'}
          animate={reduce ? undefined : { opacity: [0.35, 1, 0.35], scale: [1, 1.45, 1] }}
          transition={{ duration: 2.6, delay: index * 0.45, repeat: Infinity }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      ))}
      <defs>
        <linearGradient id="orbit-gradient" x1="68" y1="70" x2="344" y2="340">
          <stop stopColor="#7557ff" />
          <stop offset="1" stopColor="#4ade00" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LivePulse({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex size-2.5', className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-green opacity-60 motion-reduce:animate-none" />
      <span className="relative inline-flex size-2.5 rounded-full bg-brand-green" />
    </span>
  );
}
