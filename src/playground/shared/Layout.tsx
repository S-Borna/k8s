import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

type Props = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  genre?: string;
};

export function PlaygroundLayout({ children, title, subtitle, genre }: Props) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-bg">
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
        <div className="flex items-start justify-between p-6">
          <Link
            to="/playground"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-amber/30 bg-bg-elevated/40 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-text-muted backdrop-blur transition hover:border-amber/60 hover:text-amber"
          >
            <ArrowLeft size={12} />
            Galleri
          </Link>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-right"
          >
            {genre && (
              <div className="text-[10px] uppercase tracking-[0.22em] text-text-faint">
                {genre}
              </div>
            )}
            <div className="mt-1 font-display text-xl italic text-text">
              {title}
            </div>
            {subtitle && (
              <div className="mt-0.5 text-[11px] text-text-muted">
                {subtitle}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
