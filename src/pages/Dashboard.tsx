import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { staggerChild, staggerParent, hoverLift, spring } from "@/lib/motion";

export default function Dashboard() {
  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <PageHeader
        eyebrow="Dag 1 · Fundament"
        title={
          <>
            Pluggsessioner som <em className="not-italic text-amber">fastnar</em>.
          </>
        }
        description="Läs · öva · testa. Repetera tills det sitter. Innehåll, flashcards och hands-on samlat på ett ställe — utan distraktioner."
      />

      <motion.div
        variants={staggerChild}
        className="grid gap-4 md:grid-cols-3"
      >
        <StatCard label="Kapitel klara" value="0" suffix="/ 17" />
        <StatCard label="Kort att repetera" value="0" suffix="idag" />
        <StatCard label="Senaste mock" value="—" suffix="ingen än" />
      </motion.div>

      <motion.div variants={staggerChild} className="mt-8">
        <ContinueCard />
      </motion.div>

      <motion.div variants={staggerChild} className="mt-12">
        <h2 className="mb-4 text-sm uppercase tracking-[0.18em] text-text-faint">
          Kapitel
        </h2>
        <div className="rounded-3xl border border-border/60 bg-surface/30 p-8 text-center">
          <Sparkles className="mx-auto mb-3 text-amber" size={22} />
          <p className="font-display text-xl text-text">Kapitellistan kommer Dag 2</p>
          <p className="mt-1 text-sm text-text-muted">
            Imorgon: kapitelkort med progress, status och länk in i varje kapitel.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <motion.div
      whileHover={hoverLift}
      transition={spring}
      className="glass relative overflow-hidden rounded-2xl p-5"
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-4xl text-text">{value}</span>
        <span className="text-xs text-text-muted">{suffix}</span>
      </div>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber/10 blur-2xl" />
    </motion.div>
  );
}

function ContinueCard() {
  return (
    <Link to="/" className="block">
      <motion.div
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.99 }}
        transition={spring}
        className="group glass relative overflow-hidden rounded-3xl p-6 md:p-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber/8 via-transparent to-rose/8" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-amber">
              Fortsätt där du slutade
            </div>
            <div className="mt-2 font-display text-2xl text-text md:text-3xl">
              Inga sessioner ännu — börja med Kapitel 0
            </div>
            <div className="mt-1.5 text-sm text-text-muted">
              Förord och introduktion · ~10 min
            </div>
          </div>
          <motion.div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber text-bg"
            whileHover={{ rotate: 8 }}
            transition={spring}
          >
            <ArrowRight size={20} />
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}
