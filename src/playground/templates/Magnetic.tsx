import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { PlaygroundLayout } from "@/playground/shared/Layout";

function MagneticItem({
  children,
  strength = 0.4,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 22, mass: 0.7 });
  const sy = useSpring(y, { stiffness: 250, damping: 22, mass: 0.7 });

  useEffect(() => {
    if (!hovered) {
      x.set(0);
      y.set(0);
      return;
    }
    function onMove(e: MouseEvent) {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      x.set((e.clientX - cx) * strength);
      y.set((e.clientY - cy) * strength);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [hovered, strength, x, y]);

  return (
    <motion.div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ x: sx, y: sy }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}

function CursorTrail() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const sx = useSpring(cursorX, { stiffness: 350, damping: 30 });
  const sy = useSpring(cursorY, { stiffness: 350, damping: 30 });

  // Slower outer ring
  const outerX = useSpring(cursorX, { stiffness: 70, damping: 18 });
  const outerY = useSpring(cursorY, { stiffness: 70, damping: 18 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [cursorX, cursorY]);

  return (
    <>
      {/* Inner dot */}
      <motion.div
        style={{ x: sx, y: sy }}
        className="pointer-events-none fixed left-0 top-0 z-50 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber"
      />
      {/* Outer ring */}
      <motion.div
        style={{ x: outerX, y: outerY }}
        className="pointer-events-none fixed left-0 top-0 z-40 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber/40"
      />
    </>
  );
}

export default function Magnetic() {
  return (
    <PlaygroundLayout
      title="Magnetic Cursor"
      subtitle="UI-element lutar mot muspekaren"
      genre="Luxury · Fashion · Editorial"
    >
      <CursorTrail />

      <div className="grid h-screen w-screen place-items-center bg-bg overflow-hidden">
        {/* Ambient glow blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute -top-40 -left-40 h-[60vmax] w-[60vmax] rounded-full opacity-40"
            style={{
              background:
                "radial-gradient(circle, hsl(35 95% 60% / 0.5) 0%, transparent 60%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute -bottom-40 -right-40 h-[55vmax] w-[55vmax] rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, hsl(12 80% 60% / 0.4) 0%, transparent 65%)",
              filter: "blur(90px)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-3xl px-8 text-center">
          <MagneticItem strength={0.2}>
            <p className="text-[11px] uppercase tracking-[0.32em] text-amber">
              Studio · 2026
            </p>
          </MagneticItem>

          <MagneticItem strength={0.35}>
            <h1 className="mt-6 font-display text-6xl leading-[0.95] text-text md:text-9xl">
              <span className="italic">Hej.</span>
            </h1>
          </MagneticItem>

          <MagneticItem strength={0.25}>
            <p className="mt-8 max-w-xl mx-auto text-base text-text-muted md:text-lg">
              Allt rör sig mot dig — om du rör dig mot det.
              <br />
              Hovra över knapparna nedan.
            </p>
          </MagneticItem>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <MagneticItem strength={0.5}>
              <button
                type="button"
                className="group inline-flex items-center gap-2 rounded-full bg-amber px-6 py-3 text-sm font-medium text-bg transition hover:bg-amber-soft"
              >
                Visa portfolio
                <ArrowUpRight
                  size={16}
                  className="transition-transform group-hover:rotate-45"
                />
              </button>
            </MagneticItem>

            <MagneticItem strength={0.4}>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-6 py-3 text-sm text-text-muted backdrop-blur transition hover:border-amber/40 hover:text-amber"
              >
                Boka samtal
              </button>
            </MagneticItem>
          </div>

          <MagneticItem strength={0.15}>
            <div className="mt-16 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-text-faint">
              <span className="h-px w-8 bg-text-faint" />
              Awwwards-typ-känsla
              <span className="h-px w-8 bg-text-faint" />
            </div>
          </MagneticItem>
        </div>
      </div>
    </PlaygroundLayout>
  );
}
