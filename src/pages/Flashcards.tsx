import { motion } from "motion/react";
import { PageHeader } from "@/components/PageHeader";
import { staggerChild, staggerParent } from "@/lib/motion";

export default function Flashcards() {
  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <PageHeader
        eyebrow="Spaced repetition"
        title="Flashcards"
        description="Dagens kort kommer hit. Leitner-system med fyra boxar. Bygg-ut Dag 4."
      />
      <motion.div
        variants={staggerChild}
        className="glass rounded-3xl p-10 text-center text-text-muted"
      >
        Flashcard-flödet implementeras Dag 4 enligt plan.md.
      </motion.div>
    </motion.div>
  );
}
