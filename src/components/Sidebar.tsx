import { NavLink } from "react-router-dom";
import { motion } from "motion/react";
import { navItems } from "@/lib/nav";
import { spring } from "@/lib/motion";
import { getEffectiveExamDate } from "@/hooks/useAppState";
import { useAppState } from "@/hooks/useAppState";
import { OnlineIndicator } from "@/components/OnlineIndicator";

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 md:p-5 md:z-30">
      <div className="glass flex h-full flex-col rounded-3xl p-5">
        <Brand />

        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-6">
          <OnlineIndicator />
          <ExamCountdown />
        </div>
      </div>
    </aside>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="relative shrink-0">
        <div className="absolute inset-0 rounded-xl bg-amber blur-md opacity-45" />
        <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber to-amber-deep text-bg font-display text-[15px] font-semibold tracking-tight">
          K8s
        </div>
      </div>
      <div className="flex flex-col items-center text-center leading-tight">
        <div className="font-display text-lg text-text">Tentaplugg</div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
          Kubernetes
        </div>
      </div>
    </div>
  );
}

function SidebarLink({ to, label, icon: Icon }: (typeof navItems)[number]) {
  return (
    <NavLink to={to} end={to === "/"} className="block">
      {({ isActive }) => (
        <motion.div
          className="relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          transition={spring}
        >
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber/15 via-amber/8 to-transparent ring-1 ring-amber/25"
              transition={spring}
            />
          )}
          <Icon
            size={18}
            strokeWidth={1.75}
            className={`relative ${isActive ? "text-amber" : "text-text-muted"}`}
          />
          <span
            className={`relative ${isActive ? "text-text" : "text-text-muted"}`}
          >
            {label}
          </span>
        </motion.div>
      )}
    </NavLink>
  );
}

function ExamCountdown() {
  const { state } = useAppState();
  const examDate = getEffectiveExamDate(state.settings);
  const now = new Date();
  const days = Math.max(
    0,
    Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const formatted = examDate.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-surface/40 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
        Tentadag
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-3xl text-amber">{days}</span>
        <span className="text-xs text-text-muted">dagar kvar</span>
      </div>
      <div className="mt-1 text-xs text-text-faint">{formatted}</div>
    </div>
  );
}
