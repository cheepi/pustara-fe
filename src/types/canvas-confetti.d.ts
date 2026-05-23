declare module 'canvas-confetti' {
  type ConfettiOptions = {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
    [key: string]: unknown;
  };

  export default function confetti(options?: ConfettiOptions): Promise<void> | void;
}
