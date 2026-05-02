import { motion } from "motion/react";
import type { ReactNode } from "react";
import { pageVariants } from "@/lib/motion";

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      className="will-change-[opacity,transform,filter]"
    >
      {children}
    </motion.div>
  );
}
