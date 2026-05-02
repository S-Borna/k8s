import { NavLink } from "react-router-dom";
import { motion } from "motion/react";
import { navItems } from "@/lib/nav";
import { spring } from "@/lib/motion";

export function BottomNav() {
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      aria-label="Huvudnavigering"
    >
      <div className="glass mx-auto flex max-w-md items-center justify-around rounded-2xl px-2 py-1.5">
        {navItems.map((item) => (
          <BottomNavLink key={item.to} {...item} />
        ))}
      </div>
    </nav>
  );
}

function BottomNavLink({
  to,
  shortLabel,
  icon: Icon,
}: (typeof navItems)[number]) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className="relative flex-1 min-h-[44px]"
      aria-label={shortLabel}
    >
      {({ isActive }) => (
        <motion.div
          className="relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5"
          whileTap={{ scale: 0.92 }}
          transition={spring}
        >
          {isActive && (
            <motion.span
              layoutId="bottomnav-active"
              className="absolute inset-0 rounded-xl bg-amber/12 ring-1 ring-amber/25"
              transition={spring}
            />
          )}
          <Icon
            size={20}
            strokeWidth={1.75}
            className={`relative ${isActive ? "text-amber" : "text-text-muted"}`}
          />
          <span
            className={`relative text-[10px] tracking-wide ${isActive ? "text-amber" : "text-text-faint"}`}
          >
            {shortLabel}
          </span>
        </motion.div>
      )}
    </NavLink>
  );
}
