import { motion } from "motion/react";
import { Check, RotateCcw } from "lucide-react";
import type { HandsOnStep } from "@/types";
import { MarkdownContent } from "@/components/MarkdownContent";
import { spring, staggerChild, staggerParent } from "@/lib/motion";

type Props = {
  steps: HandsOnStep[];
  completed: Record<string, boolean>;
  onToggle: (stepId: string) => void;
  onReset?: () => void;
  emptyMessage?: string;
};

export function HandsOnList({
  steps,
  completed,
  onToggle,
  onReset,
  emptyMessage,
}: Props) {
  if (steps.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 bg-surface/20 p-8 text-center text-sm text-text-muted">
        {emptyMessage ?? "Inga steg ännu."}
      </div>
    );
  }

  const doneCount = steps.filter((s) => completed[s.id]).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <motion.div
        variants={staggerChild}
        className="mb-5 flex items-center justify-between"
      >
        <div className="text-sm text-text-muted">
          <span className="text-text">{doneCount}</span> av{" "}
          <span className="text-text">{steps.length}</span> klara · {pct}%
        </div>
        {onReset && doneCount > 0 && (
          <motion.button
            onClick={onReset}
            whileTap={{ scale: 0.96 }}
            transition={spring}
            className="inline-flex items-center gap-1.5 text-xs text-text-faint transition hover:text-text-muted"
          >
            <RotateCcw size={12} />
            Återställ
          </motion.button>
        )}
      </motion.div>

      <ol className="space-y-3">
        {steps.map((step) => (
          <Step
            key={step.id}
            step={step}
            done={!!completed[step.id]}
            onToggle={() => onToggle(step.id)}
          />
        ))}
      </ol>
    </motion.div>
  );
}

function Step({
  step,
  done,
  onToggle,
}: {
  step: HandsOnStep;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.li
      variants={staggerChild}
      className={`glass relative overflow-hidden rounded-2xl p-5 transition ${done ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-4">
        <motion.button
          type="button"
          onClick={onToggle}
          whileTap={{ scale: 0.92 }}
          transition={spring}
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition ${
            done
              ? "border-amber bg-amber text-bg"
              : "border-border-strong bg-transparent text-text-faint hover:border-amber/50 hover:text-amber"
          }`}
          aria-pressed={done}
          aria-label={`Markera steg ${step.number} som ${done ? "ej klart" : "klart"}`}
        >
          {done ? (
            <Check size={14} strokeWidth={2.5} />
          ) : (
            <span className="font-display text-xs">{step.number}</span>
          )}
        </motion.button>
        <div className="min-w-0 flex-1">
          <h3
            className={`font-display text-lg leading-snug ${done ? "text-text-muted line-through decoration-amber/30 decoration-1" : "text-text"}`}
          >
            {step.title}
          </h3>
          <div className="mt-1">
            <MarkdownContent source={step.body} />
          </div>
        </div>
      </div>
    </motion.li>
  );
}
