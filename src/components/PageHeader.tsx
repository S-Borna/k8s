import { motion } from "motion/react";
import type { ReactNode } from "react";
import { staggerChild } from "@/lib/motion";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
};

export function PageHeader({ eyebrow, title, description }: Props) {
  return (
    <header className="mb-10">
      {eyebrow && (
        <motion.div
          variants={staggerChild}
          className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/40 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-text-muted"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber shadow-[0_0_10px_var(--color-amber)]" />
          {eyebrow}
        </motion.div>
      )}
      <motion.h1
        variants={staggerChild}
        className="font-display text-balance text-4xl font-medium leading-[1.05] text-text md:text-6xl"
      >
        {title}
      </motion.h1>
      {description && (
        <motion.p
          variants={staggerChild}
          className="mt-4 max-w-2xl text-balance text-base text-text-muted md:text-lg"
        >
          {description}
        </motion.p>
      )}
    </header>
  );
}
