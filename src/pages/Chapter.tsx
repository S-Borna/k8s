import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { staggerChild, staggerParent, spring } from "@/lib/motion";

export default function Chapter() {
  const { n } = useParams<{ n: string }>();

  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <motion.div variants={staggerChild} className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-text-muted transition-colors hover:text-text"
        >
          <motion.span whileHover={{ x: -2 }} transition={spring}>
            <ArrowLeft size={16} />
          </motion.span>
          Tillbaka till översikt
        </Link>
      </motion.div>

      <PageHeader
        eyebrow={`Kapitel ${n}`}
        title="Kapitelinnehåll byggs Dag 3"
        description="Här kommer fyra tabs: Sammanfattning, Flashcards, Hands-on, Giacomos tillägg."
      />
    </motion.div>
  );
}
