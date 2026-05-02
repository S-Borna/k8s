import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { spring } from "@/lib/motion";

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
  hint?: string;
};

type Props<T extends string | number> = {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  className?: string;
  triggerClassName?: string;
  ariaLabel?: string;
};

export function Select<T extends string | number>({
  value,
  onChange,
  options,
  className,
  triggerClassName,
  ariaLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      "[data-active='true']",
    );
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [open]);

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <motion.button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.98 }}
        transition={spring}
        className={`group flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface/40 px-3 py-2 text-sm transition hover:border-amber/40 ${open ? "border-amber/40 bg-surface/60" : ""} ${triggerClassName ?? ""}`}
      >
        <span
          className={`truncate ${current ? "text-text" : "text-text-faint"}`}
        >
          {current?.label ?? "Välj…"}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="text-text-faint"
        >
          <ChevronDown size={14} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scaleY: 0.94 }}
            animate={{ opacity: 1, y: 6, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.96 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "top center" }}
            className="absolute left-0 right-0 top-full z-40 mt-1"
          >
            <div className="glass max-h-[320px] overflow-y-auto rounded-xl py-1.5 shadow-card">
              <ul ref={listRef} role="listbox" className="px-1">
                {options.map((option, idx) => {
                  const active = option.value === value;
                  return (
                    <motion.li
                      key={String(option.value)}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.28,
                        delay: 0.05 + Math.min(idx * 0.022, 0.34),
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-active={active ? "true" : "false"}
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                          active
                            ? "bg-amber/12 text-amber"
                            : "text-text-muted hover:bg-surface-2/60 hover:text-text"
                        }`}
                      >
                        <span className="min-w-0 truncate">{option.label}</span>
                        {option.hint && (
                          <span className="shrink-0 text-xs text-text-faint">
                            {option.hint}
                          </span>
                        )}
                        {active && (
                          <Check
                            size={14}
                            className="shrink-0 text-amber"
                          />
                        )}
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
