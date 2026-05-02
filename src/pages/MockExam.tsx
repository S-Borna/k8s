import { motion } from "motion/react";
import { PageHeader } from "@/components/PageHeader";
import { staggerChild, staggerParent } from "@/lib/motion";

export default function MockExam() {
  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <PageHeader
        eyebrow="Skriftliga svar"
        title="Mock-tenta"
        description="Slumpade frågor i Giacomos stil — fokus på att förklara varför, inte bara vad."
      />
      <motion.div
        variants={staggerChild}
        className="glass rounded-3xl p-10 text-center text-text-muted"
      >
        Mock-tenta-flödet implementeras Dag 5 enligt plan.md.
      </motion.div>
    </motion.div>
  );
}
