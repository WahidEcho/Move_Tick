import type { ReactNode } from 'react';

const URL_REGEX = /(https?:\/\/[^\s<>"]+)/g;

/** Turns any http(s) URLs in plain text into clickable links, leaving the rest as-is. */
export function linkify(text: string): ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (part.match(URL_REGEX)) {
      // Trim trailing punctuation that's likely part of the surrounding sentence, not the URL.
      const trailing = part.match(/[.,;:!?)]+$/)?.[0] ?? '';
      const href = trailing ? part.slice(0, -trailing.length) : part;
      return (
        <span key={i}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {href}
          </a>
          {trailing}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
