'use client';

import { Check, Circle } from 'lucide-react';
import { PASSWORD_RULES } from '@/lib/validations';
import { cn } from '@/lib/utils';

/**
 * Live password-rule checklist: each rule lights up the moment the typed
 * password satisfies it. Render right under the password input and pass the
 * current field value.
 */
export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors',
              passed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
            )}
          >
            {passed ? (
              <Check className="size-3.5 shrink-0" />
            ) : (
              <Circle className="size-3.5 shrink-0 opacity-40" />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
