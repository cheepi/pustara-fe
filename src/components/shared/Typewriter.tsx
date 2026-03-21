'use client';
import { useState, useEffect } from 'react';

interface TypewriterProps {
  lines: string[];
  className?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
}

export default function Typewriter({
  lines,
  className,
  typingSpeed = 52,
  deletingSpeed = 28,
  pauseDuration = 1800,
}: TypewriterProps) {
  const [lineIdx, setLineIdx]   = useState(0);
  const [charIdx, setCharIdx]   = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [pause, setPause]       = useState(false);

  useEffect(() => {
    if (pause) {
      const t = setTimeout(() => setPause(false), pauseDuration);
      return () => clearTimeout(t);
    }
    const current = lines[lineIdx];
    if (!deleting && charIdx === current.length) { setPause(true); setDeleting(true); return; }
    if (deleting && charIdx === 0) { setDeleting(false); setLineIdx(i => (i + 1) % lines.length); return; }
    const t = setTimeout(
      () => setCharIdx(i => i + (deleting ? -1 : 1)),
      deleting ? deletingSpeed : typingSpeed,
    );
    return () => clearTimeout(t);
  }, [charIdx, deleting, pause, lineIdx, lines, typingSpeed, deletingSpeed, pauseDuration]);

  return (
    <span className={className}>
      {lines[lineIdx].slice(0, charIdx)}
      <span className="inline-block w-[2px] h-[0.9em] bg-current align-middle ml-0.5 animate-pulse" />
    </span>
  );
}