import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  RotateCcw,
  X,
} from "lucide-react";
import type { Scenario } from "@/types";
import { MarkdownContent } from "@/components/MarkdownContent";
import { spring, staggerChild, staggerParent } from "@/lib/motion";

type Props = {
  scenarios: Scenario[];
};

type Phase = "answering" | "revealed";

export function ScenarioDeck({ scenarios }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [userAnswer, setUserAnswer] = useState("");
  const [stats, setStats] = useState({ right: 0, half: 0, wrong: 0 });
  const [done, setDone] = useState(false);

  const current = scenarios[index];
  const total = scenarios.length;

  const grade = useCallback(
    (result: "wrong" | "half" | "right") => {
      setStats((s) => ({
        right: s.right + (result === "right" ? 1 : 0),
        half: s.half + (result === "half" ? 1 : 0),
        wrong: s.wrong + (result === "wrong" ? 1 : 0),
      }));
      if (index + 1 >= total) {
        setDone(true);
      } else {
        setIndex(index + 1);
        setPhase("answering");
        setUserAnswer("");
      }
    },
    [index, total],
  );

  if (total === 0) return null;

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="glass rounded-3xl p-8 text-center"
      >
        <Check className="mx-auto mb-3 text-sage" size={26} />
        <h3 className="font-display text-2xl text-text">Scenarios klara</h3>
        <p className="mt-1 text-sm text-text-muted">
          {stats.right} rätt · {stats.half} delvis · {stats.wrong} fel
        </p>
        <motion.button
          onClick={() => {
            setIndex(0);
            setPhase("answering");
            setUserAnswer("");
            setStats({ right: 0, half: 0, wrong: 0 });
            setDone(false);
          }}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm text-text-muted transition hover:border-amber/40 hover:text-amber"
        >
          <RotateCcw size={14} />
          Kör en till runda
        </motion.button>
      </motion.div>
    );
  }

  if (!current) return null;

  return (
    <motion.div
      variants={staggerParent}
      initial="initial"
      animate="enter"
    >
      <div className="mb-4 flex items-center justify-between text-xs text-text-muted">
        <div className="inline-flex items-center gap-2 text-rose">
          <AlertTriangle size={14} />
          Scenario {index + 1} / {total}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          variants={staggerChild}
          initial="initial"
          animate="enter"
          exit={{ opacity: 0, x: -20 }}
        >
          <div className="glass rounded-3xl p-6 md:p-7">
            <div className="text-[11px] uppercase tracking-[0.18em] text-rose">
              Diagnos
            </div>
            <h3 className="mt-1 font-display text-xl text-text md:text-2xl">
              {current.title}
            </h3>

            <div className="mt-5 rounded-2xl border border-rose/20 bg-rose/[0.04] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-rose">
                Situation
              </div>
              <div className="mt-2 text-sm text-text">
                <MarkdownContent source={current.situation} />
              </div>
            </div>

            {current.questions.length > 0 && (
              <div className="mt-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
                  {current.questions.length > 1 ? "Frågor" : "Fråga"}
                </div>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-text-muted">
                  {current.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </div>
            )}

            {phase === "answering" ? (
              <>
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Diagnostisera och förklara — fokus på VARFÖR och HUR du tänker."
                  className="mt-5 min-h-[160px] w-full resize-y rounded-2xl border border-border/60 bg-bg/40 p-3 text-sm text-text placeholder:text-text-faint focus:border-amber/40 focus:outline-none"
                />
                <div className="mt-4 flex justify-end">
                  <motion.button
                    onClick={() => setPhase("revealed")}
                    whileTap={{ scale: 0.97 }}
                    transition={spring}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber px-4 py-2 text-sm font-medium text-bg hover:brightness-110"
                  >
                    Visa modellsvar
                    <ChevronRight size={14} />
                  </motion.button>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={spring}
                className="mt-6"
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-sage">
                  Modellsvar
                </div>
                <div className="mt-2 rounded-2xl border border-sage/30 bg-sage/[0.06] p-4">
                  <MarkdownContent source={current.modelAnswer} />
                </div>

                {userAnswer.trim() && (
                  <div className="mt-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-text-faint">
                      Ditt svar
                    </div>
                    <div className="mt-2 rounded-2xl border border-border/60 bg-surface/20 p-3 text-sm text-text">
                      {userAnswer}
                    </div>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <GradeBtn
                    icon={<X size={14} />}
                    label="Fel"
                    tone="rose"
                    onClick={() => grade("wrong")}
                  />
                  <GradeBtn
                    icon={<RotateCcw size={14} />}
                    label="Delvis"
                    tone="amber"
                    onClick={() => grade("half")}
                  />
                  <GradeBtn
                    icon={<Check size={14} />}
                    label="Rätt"
                    tone="sage"
                    onClick={() => grade("right")}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function GradeBtn({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "rose" | "amber" | "sage";
  onClick: () => void;
}) {
  const toneClasses = {
    rose: "border-rose/30 hover:border-rose hover:bg-rose/10 text-rose",
    amber: "border-amber/30 hover:border-amber hover:bg-amber/10 text-amber",
    sage: "border-sage/30 hover:border-sage hover:bg-sage/10 text-sage",
  }[tone];
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      transition={spring}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border bg-surface/40 px-4 py-3 text-sm transition ${toneClasses}`}
    >
      {icon}
      {label}
    </motion.button>
  );
}
