import { useReducedMotion } from "motion/react";

export function AmbientBackground() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_50%_-10%,hsl(28_36%_18%/0.95)_0%,hsl(28_22%_10%/0.4)_40%,transparent_70%)]" />

      <div
        className="absolute -top-[20%] -left-[10%] h-[70vmax] w-[70vmax] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, hsl(35 100% 58% / 0.55), transparent 62%)",
          animation: reduce ? undefined : "drift-a 22s var(--ease-in-out-soft) infinite",
          filter: "blur(70px)",
        }}
      />
      <div
        className="absolute top-[20%] -right-[15%] h-[65vmax] w-[65vmax] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle at 60% 40%, hsl(12 85% 58% / 0.45), transparent 65%)",
          animation: reduce ? undefined : "drift-b 28s var(--ease-in-out-soft) infinite",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute -bottom-[25%] left-[15%] h-[60vmax] w-[60vmax] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, hsl(330 55% 45% / 0.42), transparent 65%)",
          animation: reduce ? undefined : "drift-c 32s var(--ease-in-out-soft) infinite",
          filter: "blur(90px)",
        }}
      />
      <div
        className="absolute top-[55%] left-[40%] h-[40vmax] w-[40vmax] rounded-full will-change-transform"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, hsl(28 80% 50% / 0.3), transparent 60%)",
          animation: reduce ? undefined : "drift-a 26s var(--ease-in-out-soft) infinite reverse",
          filter: "blur(110px)",
        }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_55%,hsl(28_22%_6%/0.5)_100%)]" />

      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
