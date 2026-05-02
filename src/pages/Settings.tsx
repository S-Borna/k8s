import { useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Download,
  Link as LinkIcon,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import type { AppState } from "@/types";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAppState } from "@/hooks/useAppState";
import { useToasts } from "@/hooks/useToasts";
import { staggerChild, staggerParent, spring } from "@/lib/motion";
import { buildShareUrl } from "@/lib/share";

export default function Settings() {
  const { state, setState, updateSettings, reset } = useAppState();
  const { push } = useToasts();
  const [confirmReset, setConfirmReset] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function exportJson() {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tentaplugg-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    push({ message: "Exporterat", detail: "Backup sparat som JSON" });
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (
          typeof parsed !== "object" ||
          !parsed ||
          !("chapterProgress" in parsed) ||
          !("flashcardState" in parsed)
        ) {
          throw new Error("Ogiltigt JSON-format");
        }
        setState(parsed);
        push({ message: "Importerat", detail: "Tidigare progress återställd" });
      } catch {
        push({
          message: "Kunde inte importera",
          detail: "Filen är inte en giltig backup-JSON",
        });
      }
    };
    reader.readAsText(file);
  }

  function generateShareUrl() {
    const url = buildShareUrl(state);
    setShareUrl(url);
    void navigator.clipboard.writeText(url).then(
      () =>
        push({
          message: "Länk kopierad",
          detail: "Klistra in den på en annan enhet för att synka",
        }),
      () => undefined,
    );
  }

  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <PageHeader
        eyebrow="Privat & lokalt"
        title="Inställningar"
        description="Allt sparas på den här enheten. Inget skickas någonstans. Bygg backup, dela mellan dina egna enheter via en länk, eller börja om från noll."
      />

      <SettingsCard
        icon={<User size={16} />}
        title="Namn"
        description="Visas i greetingen på Dashboard. Ändra eller radera när som helst."
      >
        <input
          value={state.settings.userName ?? ""}
          onChange={(e) =>
            updateSettings({ userName: e.target.value.trim() || null })
          }
          placeholder="Ditt namn"
          className="w-full max-w-xs rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-amber/50 focus:outline-none focus:ring-1 focus:ring-amber/30"
        />
      </SettingsCard>

      <SettingsCard
        icon={<LinkIcon size={16} />}
        title="Cross-device sync"
        description="Generera en länk med all din data inbakad. Öppna länken på en annan enhet → din progress kopieras dit. Funkar utan login men måste göras manuellt."
      >
        <div className="space-y-3">
          <motion.button
            onClick={generateShareUrl}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            className="inline-flex items-center gap-2 rounded-xl border border-amber/40 bg-amber/15 px-4 py-2 text-sm text-amber transition hover:bg-amber/25"
          >
            <LinkIcon size={14} />
            Skapa & kopiera länk
          </motion.button>
          {shareUrl && (
            <div className="rounded-xl border border-border/60 bg-surface/40 px-3 py-2 font-mono text-[11px] text-text-faint">
              <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                {shareUrl}
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<Download size={16} />}
        title="Backup"
        description="Spara hela ditt state som JSON-fil eller importera tillbaka. Använd för långtidsbackup eller migrering."
      >
        <div className="flex flex-wrap gap-2">
          <motion.button
            onClick={exportJson}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm text-text-muted transition hover:border-amber/30 hover:text-amber"
          >
            <Download size={14} />
            Exportera JSON
          </motion.button>
          <motion.button
            onClick={() => fileInputRef.current?.click()}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/40 px-4 py-2 text-sm text-text-muted transition hover:border-amber/30 hover:text-amber"
          >
            <Upload size={14} />
            Importera JSON
          </motion.button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
        </div>
      </SettingsCard>

      <motion.div variants={staggerChild} className="mt-10">
        <h2 className="mb-3 text-sm uppercase tracking-[0.18em] text-text-faint">
          Riskzon
        </h2>
        <div className="rounded-2xl border border-rose/25 bg-rose/[0.04] p-5">
          <div className="text-text">Återställ progress</div>
          <p className="mt-1 text-sm text-text-muted">
            Tar bort all progress, flashcard-state och mock-historik. Namn och
            inställningar behålls.
          </p>
          <motion.button
            onClick={() => setConfirmReset(true)}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose/40 bg-rose/15 px-4 py-2 text-sm text-rose transition hover:bg-rose/25"
          >
            <Trash2 size={14} />
            Återställ progress
          </motion.button>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmReset}
        title="Återställ progress?"
        description={
          <>
            Du tappar alla bockade hands-on-steg, all flashcard-historik och alla
            mock-tentor. <span className="text-text">Kan inte ångras.</span>
          </>
        }
        confirmLabel="Ja, återställ"
        cancelLabel="Behåll"
        destructive
        onConfirm={() => {
          reset(true);
          setConfirmReset(false);
          push({ message: "Progress återställt" });
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </motion.div>
  );
}

function SettingsCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={staggerChild}
      className="glass mb-4 rounded-2xl p-5 md:p-6"
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber/10 text-amber">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg text-text">{title}</h3>
          <p className="mt-0.5 text-sm text-text-muted">{description}</p>
        </div>
      </div>
      {children}
    </motion.section>
  );
}

