import { motion } from "motion/react";
import { PageHeader } from "@/components/PageHeader";
import { staggerChild, staggerParent } from "@/lib/motion";

export default function Settings() {
  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <PageHeader
        eyebrow="Privat & lokalt"
        title="Inställningar"
        description="Reset, export/import av JSON, tema-toggle. Implementeras Dag 7."
      />
      <motion.div
        variants={staggerChild}
        className="glass rounded-3xl p-10 text-center text-text-muted"
      >
        Inställningar färdigställs Dag 7 enligt plan.md.
      </motion.div>
    </motion.div>
  );
}
