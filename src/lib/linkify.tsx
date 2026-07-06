import React from 'react';

const URL_RE = /\b(https?:\/\/[^\s<>"')]+)/gi;

/**
 * Converts URLs in plain text into clickable anchors.
 * Returns a fragment of strings + <a> elements.
 */
export function linkify(text: string | null | undefined): React.ReactNode {
  if (!text) return text ?? null;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_RE);
  while ((match = re.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));
    parts.push(
      <a
        key={`${start}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 break-all hover:opacity-80"
      >
        {url}
      </a>
    );
    lastIndex = start + url.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}
