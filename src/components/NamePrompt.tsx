import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import { spring } from "@/lib/motion";

export function NamePrompt() {
  const { state, updateSettings } = useAppState();
  const [name, setName] = useState("");

  if (state.settings.userName) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    updateSettings({ userName: trimmed });
  }

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="glass mb-8 flex flex-col gap-3 rounded-2xl px-5 py-4 md:flex-row md:items-center md:gap-4"
    >
      <label
        htmlFor="namnprompt"
        className="text-sm text-text-muted md:flex-1"
      >
        <span className="text-amber">Hej.</span> Vad heter du? Sparas bara på den
        här enheten.
      </label>
      <div className="flex items-center gap-2">
        <input
          id="namnprompt"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ditt namn"
          className="flex-1 rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-amber/50 focus:outline-none focus:ring-1 focus:ring-amber/30 md:w-56 md:flex-none"
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.96 }}
          transition={spring}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber px-4 py-2 text-sm text-bg transition hover:bg-amber-soft"
        >
          Klar
          <ArrowRight size={14} />
        </motion.button>
      </div>
    </motion.form>
  );
}
