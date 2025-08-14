import React, { useState, useRef, useEffect } from "react";

// ExpandableText supports either character limit (legacy) or line clamp (preferred for this use case).
// Props: text (required), limitChars (optional), lines (optional - when provided overrides char limit).
export function ExpandableText({
  text,
  limitChars = 300,
  lines,
  className = ""
}: {
  text: string;
  limitChars?: number;
  lines?: number; // number of lines to show when collapsed
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncate, setNeedsTruncate] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  if (!text) return null;

  // Character-based truncation path (fallback when lines not specified)
  const charTruncated = !expanded && !lines && text.length > limitChars ? text.slice(0, limitChars) + "…" : text;

  useEffect(() => {
    if (!lines || expanded) {
      setNeedsTruncate(lines ? true : text.length > limitChars); // default for button visibility in char mode
      return;
    }
    const el = ref.current;
    if (el) {
      // Use a timeout to allow layout to settle
      requestAnimationFrame(() => {
        const over = el.scrollHeight > el.clientHeight + 1; // tolerance
        setNeedsTruncate(over);
      });
    }
  }, [text, lines, expanded, limitChars]);

  // Linkify: convert URLs into anchor tags safely (basic regex, no HTML injection from original text aside from anchors)
  const linkify = (value: string) => {
    const urlRegex = /((https?:\/\/)?([\w-]+\.)+[\w]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?)/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0; let match: RegExpExecArray | null;
    while((match = urlRegex.exec(value))){
      const start = match.index; const end = start + match[0].length;
      if(start>lastIndex) parts.push(value.slice(lastIndex,start));
      let href = match[0];
      if(!/^https?:\/\//i.test(href)) href = 'https://' + href; // ensure protocol
      parts.push(<a key={start+href} href={href} target="_blank" rel="noopener noreferrer" className="underline text-yellow-700 hover:text-yellow-800 break-all">{match[0]}</a>);
      lastIndex = end;
    }
    if(lastIndex < value.length) parts.push(value.slice(lastIndex));
    return parts;
  };

  const renderText = lines ? text : charTruncated;

  return (
    <div className={className} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
      <div
        ref={ref}
        className="whitespace-pre-wrap break-words"
        style={
          !expanded && lines ? {
            display: '-webkit-box',
            WebkitLineClamp: lines,
            WebkitBoxOrient: 'vertical' as any,
            overflow: 'hidden'
          } : undefined
        }
      >
        {linkify(renderText)}
      </div>
      {needsTruncate && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
            className="text-xs font-medium underline mt-1 hover:opacity-80"
          style={{ color: 'var(--tw-prose-links, #a16207)' }}
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      )}
    </div>
  );
}
