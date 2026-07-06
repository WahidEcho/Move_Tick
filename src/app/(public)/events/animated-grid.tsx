'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Staggered reveal for the events grid: each card cascades in as it enters the
 * viewport. Children are server-rendered cards — this wrapper only adds motion.
 */
export function AnimatedGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const items = React.Children.toArray(children);

  if (reduce) {
    return <div className={className}>{items}</div>;
  }

  return (
    <div className={className}>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: (i % 3) * 0.09, ease: 'easeOut' }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
