import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { Flashcard } from "@/types";
import { MarkdownContent } from "@/components/MarkdownContent";
import { spring } from "@/lib/motion";

type Props = {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
};

export function FlashcardView({ card, flipped, onFlip }: Props) {
  return (
    <div className="relative" style={{ perspective: 1600 }}>
      <motion.button
        type="button"
        onClick={onFlip}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ ...spring, duration: 0.6 }}
        className="relative block w-full text-left"
        style={{ transformStyle: "preserve-3d" }}
      >
        <Face side="front">
          <CardLabel>Fråga</CardLabel>
          <p className="mt-3 font-display text-2xl leading-snug text-text md:text-3xl">
            {card.question}
          </p>
          <p className="mt-6 text-xs text-text-faint">
            Klicka eller tryck space för att vända
          </p>
        </Face>
        <Face side="back">
          <CardLabel>Svar</CardLabel>
          <div className="mt-3">
            <MarkdownContent source={card.answer} />
          </div>
        </Face>
      </motion.button>
    </div>
  );
}

function Face({
  side,
  children,
}: {
  side: "front" | "back";
  children: ReactNode;
}) {
  return (
    <div
      className={`glass min-h-[260px] rounded-3xl p-7 md:p-10 ${side === "back" ? "absolute inset-0" : ""}`}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: side === "back" ? "rotateY(180deg)" : undefined,
      }}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.18em] text-amber">
      {children}
    </div>
  );
}
