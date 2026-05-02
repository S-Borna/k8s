import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { motion } from "motion/react";
import { useToasts } from "@/hooks/useToasts";
import { spring } from "@/lib/motion";

type Props = {
  code: string;
  language?: string;
  className?: string;
};

export function CodeBlock({ code, language, className }: Props) {
  const [copied, setCopied] = useState(false);
  const { push } = useToasts();
  const trimmed = useMemo(() => code.replace(/\n$/, ""), [code]);
  const isShell = language === "bash" || language === "sh" || language === "shell";

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      push({
        message: "Kopierat",
        detail: isShell ? "Klistra in i iTerm2 (⌘V)" : "Kopierat till urklipp",
      });
    } catch {
      push({
        message: "Kunde inte kopiera",
        detail: "Markera koden manuellt och kopiera",
      });
    }
  }

  return (
    <div
      className={`group relative my-4 overflow-hidden rounded-xl border border-border/60 bg-bg-elevated/80 ${className ?? ""}`}
    >
      {language && (
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] text-text-faint">
          <span>{language}</span>
          {isShell && <span className="text-amber/70">shell</span>}
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className={language ? `language-${language}` : ""}>{trimmed}</code>
      </pre>
      <motion.button
        type="button"
        onClick={copyToClipboard}
        whileTap={{ scale: 0.94 }}
        transition={spring}
        className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface/70 px-2.5 py-1 text-xs text-text-muted opacity-0 backdrop-blur transition hover:border-amber/40 hover:text-amber group-hover:opacity-100 focus:opacity-100"
        aria-label="Kopiera kod"
      >
        {copied ? (
          <>
            <Check size={12} className="text-amber" />
            Kopierat
          </>
        ) : (
          <>
            <Copy size={12} />
            Kopiera
          </>
        )}
      </motion.button>
    </div>
  );
}
