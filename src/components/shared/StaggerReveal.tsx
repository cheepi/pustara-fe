'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface StaggerRevealProps {
  lines: string[];
  className?: string;
  lineClassName?: string;
  style?: React.CSSProperties;
  /** Typing speed in ms per character (default: 30) */
  typingSpeed?: number;
  /** Pause between lines in ms (default: 200) */
  linePauseMs?: number;
  /** Initial delay before typing starts in ms (default: 300) */
  initialDelayMs?: number;
}

export default function StaggerReveal({
  lines,
  className,
  lineClassName,
  style,
  typingSpeed = 30,
  linePauseMs = 200,
  initialDelayMs = 300,
}: StaggerRevealProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  // Track how many chars are typed per line
  const [typed, setTyped] = useState<number[]>(lines.map(() => 0));

  useEffect(() => {
    if (!inView) return;

    let cancelled = false;
    let currentLine = 0;
    let currentChar = 0;

    const initialTimer = setTimeout(function tick() {
      if (cancelled) return;

      if (currentLine >= lines.length) return;

      const line = lines[currentLine];

      if (currentChar <= line.length) {
        setTyped(prev => {
          const next = [...prev];
          next[currentLine] = currentChar;
          return next;
        });
        currentChar++;
        setTimeout(tick, typingSpeed);
      } else {
        // Line done — pause then move to next
        currentLine++;
        currentChar = 0;
        setTimeout(tick, linePauseMs);
      }
    }, initialDelayMs);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
    };
  }, [inView, lines, typingSpeed, linePauseMs, initialDelayMs]);

  const allDone = (lineIdx: number) => typed[lineIdx] >= lines[lineIdx].length;
  const isTyping = (lineIdx: number) => typed[lineIdx] > 0 && !allDone(lineIdx);
  const hasStarted = (lineIdx: number) => typed[lineIdx] > 0;

  return (
    <p ref={ref} className={className} style={style}>
      {lines.map((line, i) => (
        <motion.span
          key={i}
          style={{ display: 'block' }}
          className={lineClassName}
          initial={{ opacity: 0 }}
          animate={hasStarted(i) ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          {line.slice(0, typed[i])}
          {/* Blinking cursor on the currently-typing line */}
          {hasStarted(i) && !allDone(i) && (
            <span className="inline-block w-[2px] h-[0.85em] bg-current align-middle ml-0.5 animate-pulse" />
          )}
        </motion.span>
      ))}
    </p>
  );
}