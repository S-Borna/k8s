import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { spring } from "@/lib/motion";

type Props = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Bekräfta",
  cancelLabel = "Avbryt",
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 grid place-items-center bg-bg/70 px-4 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={spring}
            className="glass w-full max-w-md rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3">
              {destructive && (
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose/15 text-rose">
                  <AlertTriangle size={16} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl text-text">{title}</h2>
                {description && (
                  <div className="mt-2 text-sm text-text-muted">{description}</div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="rounded-lg border border-border bg-surface/40 px-4 py-2 text-sm text-text-muted transition hover:border-border-strong hover:text-text"
              >
                {cancelLabel}
              </button>
              <motion.button
                onClick={onConfirm}
                whileTap={{ scale: 0.97 }}
                transition={spring}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  destructive
                    ? "border border-rose/40 bg-rose/15 text-rose hover:bg-rose/25"
                    : "border border-amber/40 bg-amber/15 text-amber hover:bg-amber/25"
                }`}
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
