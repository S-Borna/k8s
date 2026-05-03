import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";

type TemplateMeta = {
  slug: string;
  title: string;
  description: string;
  genre: string;
  status: "ready" | "wip" | "planned";
  accent: string;
};

const TEMPLATES: TemplateMeta[] = [
  {
    slug: "scroll-narrative",
    title: "Scroll Narrative",
    description: "Fyrstegs scroll-driven berättelse med kameradolly och objekt som splittras + samlas.",
    genre: "Storytelling · SaaS launch",
    status: "ready",
    accent: "from-amber/20 to-amber-deep/10",
  },
  {
    slug: "dissolve",
    title: "Dissolve",
    description: "Custom GLSL noise-shader. Objekt löses upp till partiklar med glödande edge.",
    genre: "Tech · AI · Premium",
    status: "ready",
    accent: "from-amber/25 to-rose/15",
  },
  {
    slug: "hologram",
    title: "Hologram",
    description: "Custom shader med scanlines, Fresnel-edge, chromatic offset. Sci-fi premium.",
    genre: "Tech · Gaming · Futuristic",
    status: "ready",
    accent: "from-cyan-400/20 to-blue-500/15",
  },
  {
    slug: "magnetic",
    title: "Magnetic Cursor",
    description: "UI-element lutar mot muspekaren med spring-physics. Subtil men oförglömlig.",
    genre: "Luxury · Fashion · Editorial",
    status: "ready",
    accent: "from-rose/20 to-amber/10",
  },
  {
    slug: "audio-reactive",
    title: "Audio Reactive",
    description: "Scen som pulsar i takt med ljud. Bocelli som demo-content. Frequency-band-analys.",
    genre: "Music · Events · Podcast",
    status: "ready",
    accent: "from-plum/20 to-rose/15",
  },
  {
    slug: "logo-assemble",
    title: "Logo Assemble",
    description: "Fragment flyger in från utkanten och bildar logo med damping.",
    genre: "Brand launch",
    status: "planned",
    accent: "from-amber/15 to-amber/5",
  },
  {
    slug: "liquid-distortion",
    title: "Liquid Distortion",
    description: "Mouse-driven fluid-waves över ytor. Hover ger vågor som spreds.",
    genre: "Fashion · Lifestyle",
    status: "planned",
    accent: "from-cyan-400/15 to-amber/5",
  },
  {
    slug: "particle-constellation",
    title: "Particle Constellation",
    description: "Connected dots med dynamiska linjer mellan närliggande punkter.",
    genre: "Science · Data viz",
    status: "planned",
    accent: "from-amber-soft/15 to-plum/10",
  },
  {
    slug: "wireframe-to-solid",
    title: "Wireframe → Solid",
    description: "Modeller bygger sig från wireframe till fullt material på scroll.",
    genre: "Architecture · Real estate",
    status: "planned",
    accent: "from-amber/10 to-text-faint/10",
  },
  {
    slug: "dolly-zoom",
    title: "Dolly Zoom Hero",
    description: "Vertigo-effekt — kameran åker bakåt medan FOV ökar. Cinematic.",
    genre: "Cinematic · Agency",
    status: "planned",
    accent: "from-rose/15 to-plum/10",
  },
  {
    slug: "iridescent",
    title: "Iridescent Showcase",
    description: "Soap-bubble / oil-slick material. Färgerna skiftar med vinkel.",
    genre: "E-commerce · Beauty",
    status: "planned",
    accent: "from-rose/15 to-cyan-400/10",
  },
  {
    slug: "cloth",
    title: "Cloth Simulation",
    description: "Rapier physics — tyg som flyger med vinden, reagerar på muspekaren.",
    genre: "Fashion · Products",
    status: "planned",
    accent: "from-amber/15 to-rose/10",
  },
  {
    slug: "glitch-text",
    title: "Glitch Text",
    description: "Decryption-effekt — slumpade tecken som löser sig till verklig text.",
    genre: "Cyber · Tech · Bold",
    status: "planned",
    accent: "from-amber-deep/15 to-rose/10",
  },
  {
    slug: "3d-card-stack",
    title: "3D Card Stack",
    description: "Magazine-page-flip med depth. Bläddra som en bok.",
    genre: "Editorial · Portfolio",
    status: "planned",
    accent: "from-amber/15 to-amber-soft/5",
  },
  {
    slug: "tunnel-scroll",
    title: "Tunnel Scroll",
    description: "Kameran flyger genom en tunnel. Scroll = framåt. Immersiv resa.",
    genre: "Storytelling · Immersive",
    status: "planned",
    accent: "from-plum/15 to-rose/10",
  },
  {
    slug: "volumetric-light",
    title: "Volumetric Light",
    description: "God rays och atmosfäriska ljusstrålar. Cinematic premium.",
    genre: "Cinematic · Premium",
    status: "planned",
    accent: "from-amber/20 to-amber-deep/10",
  },
  {
    slug: "webgl-water",
    title: "WebGL Water",
    description: "Riktig vattenyta med ripples, reflektioner, refraktion.",
    genre: "Real estate · Lifestyle",
    status: "planned",
    accent: "from-cyan-400/20 to-amber/5",
  },
  {
    slug: "boids",
    title: "Boids · Flocking",
    description: "Swarm-AI med tusentals partiklar som flockas naturligt.",
    genre: "Tech · Abstract",
    status: "planned",
    accent: "from-amber-soft/15 to-text-faint/5",
  },
  {
    slug: "procedural-terrain",
    title: "Procedural Terrain",
    description: "Noise-baserat landskap, fly-over kameran, atmosfärisk fog.",
    genre: "Gaming · Exploration",
    status: "planned",
    accent: "from-amber/15 to-sage/10",
  },
  {
    slug: "multi-scene",
    title: "Multi-scene Narrative",
    description: "Scrolla mellan 3 distinkta världar med smooth transitions.",
    genre: "Storytelling · Brand",
    status: "planned",
    accent: "from-rose/15 to-amber/10",
  },
];

export default function Gallery() {
  const ready = TEMPLATES.filter((t) => t.status === "ready").length;
  const total = TEMPLATES.length;

  return (
    <div className="min-h-screen bg-bg pb-24">
      <div className="mx-auto max-w-7xl px-6 pt-16 md:px-10 md:pt-24">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-text-faint transition hover:text-amber"
          >
            ← Tillbaka till studierna
          </Link>
          <div className="mt-8 flex items-end justify-between gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber">
                Studio · Templates
              </div>
              <h1 className="mt-3 font-display text-5xl leading-[1.05] text-text md:text-7xl">
                Effekt-arsenal.
              </h1>
              <p className="mt-4 max-w-xl text-text-muted md:text-lg">
                Production-ready WebGL-templates. Varje en sätter sin egen genre.
                Klona, byt content, lev:a.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-4 py-2 text-xs text-amber md:inline-flex">
              <Sparkles size={14} />
              {ready} av {total} klara
            </div>
          </div>
        </motion.header>

        <motion.section
          className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          initial="initial"
          animate="enter"
          variants={{
            initial: {},
            enter: { transition: { staggerChildren: 0.04 } },
          }}
        >
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.slug} template={t} />
          ))}
        </motion.section>
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: TemplateMeta }) {
  const ready = template.status === "ready";

  const card = (
    <motion.article
      variants={{
        initial: { opacity: 0, y: 16 },
        enter: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
      }}
      whileHover={ready ? { y: -3 } : undefined}
      className={`group relative h-full overflow-hidden rounded-2xl border p-6 transition ${
        ready
          ? "border-border/60 bg-surface/30 hover:border-amber/40 hover:bg-surface/60"
          : "border-border/40 bg-surface/15 opacity-60"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${template.accent} opacity-0 transition-opacity duration-500 ${ready ? "group-hover:opacity-100" : ""}`}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.22em] text-text-faint">
            {template.genre}
          </span>
          {ready ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 text-[9px] uppercase tracking-wider text-amber">
              ● Klar
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[9px] uppercase tracking-wider text-text-faint">
              Planerad
            </span>
          )}
        </div>
        <h3 className="mt-4 font-display text-2xl leading-tight text-text">
          {template.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {template.description}
        </p>
        {ready && (
          <div className="mt-6 inline-flex items-center gap-2 text-xs text-amber">
            Öppna
            <ArrowUpRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </div>
        )}
      </div>
    </motion.article>
  );

  if (!ready) return card;
  return (
    <Link to={`/playground/${template.slug}`} className="block h-full">
      {card}
    </Link>
  );
}
