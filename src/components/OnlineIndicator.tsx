import { motion } from "motion/react";
import { useOnlineCount } from "@/hooks/useOnlineCount";

export function OnlineIndicator() {
  const { count, connected } = useOnlineCount();

  if (count === null) return null;

  const label = count === 1 ? "läser nu" : "läser nu";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border/60 bg-surface/40 p-3"
    >
      <div className="flex items-center gap-2.5">
        <span className="relative inline-flex">
          <span
            className={`relative h-2 w-2 rounded-full ${
              connected ? "bg-sage" : "bg-text-faint"
            }`}
          />
          {connected && (
            <span className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-sage opacity-60" />
          )}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-sm text-text">{count}</span>
          <span className="text-[11px] text-text-muted">{label}</span>
        </div>
      </div>
    </motion.div>
  );
}
