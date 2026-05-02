import { motion } from "motion/react";
import { useActiveTab } from "@/hooks/useActiveTab";
import type { TabKey } from "@/hooks/useActiveTab";
import { spring } from "@/lib/motion";

export type Tab = {
  key: TabKey;
  label: string;
  count?: number;
};

type Props = {
  tabs: Tab[];
};

export function ChapterTabs({ tabs }: Props) {
  const [active, setActive] = useActiveTab(tabs[0]?.key);

  return (
    <div className="-mx-1 mb-6 overflow-x-auto">
      <div role="tablist" className="flex min-w-max gap-1 px-1">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <motion.button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              whileTap={{ scale: 0.97 }}
              transition={spring}
              className="relative inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm"
            >
              {isActive && (
                <motion.span
                  layoutId="chapter-tab-active"
                  className="absolute inset-0 rounded-xl bg-amber/12 ring-1 ring-amber/25"
                  transition={spring}
                />
              )}
              <span
                className={`relative ${isActive ? "text-amber" : "text-text-muted"}`}
              >
                {tab.label}
              </span>
              {typeof tab.count === "number" && (
                <span
                  className={`relative rounded-full px-1.5 text-[10px] ${isActive ? "bg-amber/20 text-amber" : "bg-surface-2 text-text-faint"}`}
                >
                  {tab.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
