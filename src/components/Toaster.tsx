import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { useToasts } from "@/hooks/useToasts";
import { spring } from "@/lib/motion";

export function Toaster() {
  const { toasts } = useToasts();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-24 right-4 z-50 flex flex-col gap-2 md:bottom-6 md:right-6"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={spring}
            className="glass pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-card max-w-sm"
          >
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber/15 text-amber">
              <Check size={14} strokeWidth={2.5} />
            </div>
            <div className="leading-snug">
              <div className="text-sm text-text">{t.message}</div>
              {t.detail && (
                <div className="mt-0.5 text-xs text-text-muted">{t.detail}</div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
