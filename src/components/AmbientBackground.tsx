import { useReducedMotion } from "motion/react";

export function AmbientBackground() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,hsl(28_30%_14%/0.7)_0%,transparent_60%)]" />

      <div
        className="absolute -top-[20%] -left-[10%] h-[60vmax] w-[60vmax] rounded-full opacity-70 will-change-transform"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, hsl(35 95% 55% / 0.35), transparent 60%)",
          animation: reduce ? undefined : "drift-a 22s var(--ease-in-out-soft) infinite",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute top-[30%] -right-[15%] h-[55vmax] w-[55vmax] rounded-full opacity-60 will-change-transform"
        style={{
          background:
            "radial-gradient(circle at 60% 40%, hsl(12 80% 55% / 0.28), transparent 65%)",
          animation: reduce ? undefined : "drift-b 28s var(--ease-in-out-soft) infinite",
          filter: "blur(90px)",
        }}
      />
      <div
        className="absolute -bottom-[20%] left-[20%] h-[50vmax] w-[50vmax] rounded-full opacity-55 will-change-transform"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, hsl(330 50% 40% / 0.28), transparent 65%)",
          animation: reduce ? undefined : "drift-c 32s var(--ease-in-out-soft) infinite",
          filter: "blur(100px)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
