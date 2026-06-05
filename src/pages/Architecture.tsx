import type { ReactElement } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { staggerChild, staggerParent, spring } from "@/lib/motion";

type DiagramSpec = {
  id: string;
  title: string;
  eyebrow: string;
  takeaway: string;
  chapterId: number;
  chapterLabel: string;
  render: () => ReactElement;
};

const DIAGRAMS: DiagramSpec[] = [
  {
    id: "workload-stack",
    title: "Workload-stacken",
    eyebrow: "Deployment → ReplicaSet → Pod → Container",
    takeaway:
      "Deploymenten är det du redigerar. Den skapar en ReplicaSet, som håller rätt antal Pods igång. Varje Pod kör en eller flera containers. Du rör aldrig ReplicaSeten direkt.",
    chapterId: 6,
    chapterLabel: "Kap 06 — Deployments",
    render: WorkloadStackDiagram,
  },
  {
    id: "service-flow",
    title: "Service routar via labels",
    eyebrow: "Klient → Service → Endpoints → Pods",
    takeaway:
      "Service har en `selector` (t.ex. app: web). K8s hittar alla Pods med samma label och fyller Endpoints. När någon ringer Servicens ClusterIP lastbalanseras trafik till en av endpoints. Saknas labels = inga endpoints = ingen trafik.",
    chapterId: 7,
    chapterLabel: "Kap 07 — Services",
    render: ServiceFlowDiagram,
  },
  {
    id: "storage-binding",
    title: "Storage-bundning",
    eyebrow: "Pod → PVC → PV ← StorageClass",
    takeaway:
      "Podden begär storage via en PVC (\"jag behöver 10 GB\"). K8s matchar PVC mot en passande PV — eller skapar dynamiskt en ny via StorageClassen. PV är själva storagen (EBS, NFS, disk). Lös koppling så apputvecklaren slipper bry sig om backend.",
    chapterId: 11,
    chapterLabel: "Kap 11 — Storage",
    render: StorageDiagram,
  },
  {
    id: "rbac-chain",
    title: "RBAC-kedjan",
    eyebrow: "Subject → RoleBinding → Role → Resurser",
    takeaway:
      "En user eller ServiceAccount (subject) kopplas till en Role via en RoleBinding. Rollen säger vilka verbs (get, create, delete) som tillåts på vilka resurser (pods, services). Default deny — bara explicit beviljat tillåts.",
    chapterId: 14,
    chapterLabel: "Kap 14 — RBAC",
    render: RbacDiagram,
  },
  {
    id: "ingress-flow",
    title: "Ingress-trafikflöde",
    eyebrow: "Internet → Ingress → Service → Pod",
    takeaway:
      "Ingress sitter i kanten av klustret och routar HTTP/HTTPS baserat på host eller path. Den pekar på en Service, som i sin tur pekar på Pods via labels. En LoadBalancer för många appar istället för en per app.",
    chapterId: 8,
    chapterLabel: "Kap 08 — Ingress",
    render: IngressDiagram,
  },
  {
    id: "config-injection",
    title: "ConfigMap & Secret → Pod",
    eyebrow: "Två sätt: env vars eller mountad volym",
    takeaway:
      "Config separeras från kod. Env vars sätts vid Pod-start och uppdateras INTE när ConfigMap ändras. Mountade filer uppdateras automatiskt (upp till 1 min fördröjning). Secrets är base64, inte krypterade — använd Vault eller encryption at rest för riktig säkerhet.",
    chapterId: 12,
    chapterLabel: "Kap 12 — ConfigMaps & Secrets",
    render: ConfigDiagram,
  },
];

export default function Architecture() {
  return (
    <motion.div variants={staggerParent} initial="initial" animate="enter">
      <PageHeader
        eyebrow="Hur K8s-objekten hänger ihop"
        title="K8s-arkitektur"
        description={
          <>
            Sex centrala relationer ritade visuellt.
            <br />
            Förstår du flödena förstår du K8s — utan att memorera fält.
          </>
        }
      />

      <motion.div variants={staggerChild} className="grid gap-5 md:grid-cols-2">
        {DIAGRAMS.map((d) => (
          <DiagramCard key={d.id} spec={d} />
        ))}
      </motion.div>
    </motion.div>
  );
}

function DiagramCard({ spec }: { spec: DiagramSpec }) {
  return (
    <motion.div
      variants={staggerChild}
      whileHover={{ y: -2 }}
      transition={spring}
      className="glass relative overflow-hidden rounded-3xl p-6"
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-amber">
        {spec.eyebrow}
      </div>
      <h3 className="mt-1 font-display text-xl text-text">{spec.title}</h3>

      <div className="mt-5 rounded-2xl bg-bg/40 p-4">
        <div className="mx-auto w-full max-w-[480px]">{spec.render()}</div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-text-muted">
        {spec.takeaway}
      </p>

      <Link
        to={`/kapitel/${spec.chapterId}`}
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-amber"
      >
        {spec.chapterLabel}
        <ExternalLink size={11} />
      </Link>
    </motion.div>
  );
}

/* ===== Diagram primitives ===== */

type NodeProps = {
  x: number;
  y: number;
  w?: number;
  h?: number;
  label: string;
  sub?: string;
  tone?: "amber" | "sage" | "rose" | "violet" | "slate";
};

function Node({ x, y, w = 110, h = 44, label, sub, tone = "amber" }: NodeProps) {
  const toneColors = {
    amber: { stroke: "#d4a843", fill: "rgba(212, 168, 67, 0.10)" },
    sage: { stroke: "#7da874", fill: "rgba(125, 168, 116, 0.10)" },
    rose: { stroke: "#d47474", fill: "rgba(212, 116, 116, 0.10)" },
    violet: { stroke: "#a37bd4", fill: "rgba(163, 123, 212, 0.10)" },
    slate: { stroke: "#7a8499", fill: "rgba(122, 132, 153, 0.10)" },
  }[tone];
  const cy = y + h / 2;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill={toneColors.fill}
        stroke={toneColors.stroke}
        strokeWidth={1.2}
      />
      <text
        x={x + w / 2}
        y={sub ? cy - 4 : cy + 4}
        textAnchor="middle"
        className="fill-text"
        style={{ fontFamily: "var(--font-display, ui-sans-serif)", fontSize: 13, fontWeight: 500 }}
      >
        {label}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={cy + 11}
          textAnchor="middle"
          className="fill-text-faint"
          style={{ fontSize: 10 }}
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  label,
  dashed,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  dashed?: boolean;
}) {
  const labelX = (x1 + x2) / 2;
  const labelY = (y1 + y2) / 2;
  return (
    <g>
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <polygon points="0 0, 8 4, 0 8" fill="#7a8499" />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#7a8499"
        strokeWidth={1.1}
        strokeDasharray={dashed ? "4 3" : undefined}
        markerEnd="url(#arrowhead)"
      />
      {label && (
        <text
          x={labelX + 6}
          y={labelY - 2}
          className="fill-text-faint"
          style={{ fontSize: 10 }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function Svg({ children, height = 220 }: { children: React.ReactNode; height?: number }) {
  return (
    <svg viewBox={`0 0 480 ${height}`} className="w-full" aria-hidden="true">
      {children}
    </svg>
  );
}

/* ===== Individual diagrams ===== */

function WorkloadStackDiagram() {
  return (
    <Svg height={250}>
      <Node x={180} y={10} label="Deployment" tone="amber" />
      <Arrow x1={235} y1={54} x2={235} y2={74} label="skapar" />
      <Node x={180} y={78} label="ReplicaSet" tone="amber" />
      <Arrow x1={235} y1={122} x2={235} y2={142} label="håller" />
      <Node x={70} y={146} w={90} h={36} label="Pod" sub="containers" tone="sage" />
      <Node x={195} y={146} w={90} h={36} label="Pod" sub="containers" tone="sage" />
      <Node x={320} y={146} w={90} h={36} label="Pod" sub="containers" tone="sage" />
      <text x={240} y={210} textAnchor="middle" className="fill-text-faint" style={{ fontSize: 10 }}>
        replicas: 3
      </text>
    </Svg>
  );
}

function ServiceFlowDiagram() {
  return (
    <Svg height={250}>
      <Node x={180} y={10} w={120} label="Klient" sub="kubectl, app" tone="slate" />
      <Arrow x1={240} y1={54} x2={240} y2={74} label="anropar ClusterIP" />
      <Node x={170} y={78} w={140} label="Service" sub="selector: app=web" tone="sage" />
      <Arrow x1={240} y1={122} x2={240} y2={142} label="endpoints" />
      <Node x={170} y={146} w={140} h={36} label="Endpoints" sub="auto-fyllda" tone="sage" />
      <Arrow x1={240} y1={186} x2={240} y2={200} dashed />
      <Node x={70} y={204} w={90} h={36} label="Pod" sub="app=web" tone="amber" />
      <Node x={195} y={204} w={90} h={36} label="Pod" sub="app=web" tone="amber" />
      <Node x={320} y={204} w={90} h={36} label="Pod" sub="app=web" tone="amber" />
    </Svg>
  );
}

function StorageDiagram() {
  return (
    <Svg height={220}>
      <Node x={20} y={20} w={130} label="Pod" sub="mountar volym" tone="amber" />
      <Arrow x1={150} y1={42} x2={180} y2={42} label="claim" />
      <Node x={180} y={20} w={120} label="PVC" sub="vill ha 10 GB" tone="rose" />
      <Arrow x1={300} y1={42} x2={340} y2={42} label="bunden" />
      <Node x={340} y={20} w={120} label="PV" sub="EBS/NFS/disk" tone="rose" />
      <Arrow x1={400} y1={64} x2={400} y2={114} label="skapas av" />
      <Node x={310} y={118} w={150} label="StorageClass" sub="t.ex. gp3, ssd" tone="violet" />
      <text
        x={90}
        y={180}
        textAnchor="middle"
        className="fill-text-faint"
        style={{ fontSize: 10 }}
      >
        apputvecklaren
      </text>
      <text
        x={400}
        y={180}
        textAnchor="middle"
        className="fill-text-faint"
        style={{ fontSize: 10 }}
      >
        plattformsteam
      </text>
    </Svg>
  );
}

function RbacDiagram() {
  return (
    <Svg height={220}>
      <Node x={20} y={20} w={140} label="ServiceAccount" sub="(eller User)" tone="violet" />
      <Arrow x1={160} y1={42} x2={195} y2={42} label="bunden" />
      <Node x={195} y={20} w={120} label="RoleBinding" tone="violet" />
      <Arrow x1={315} y1={42} x2={350} y2={42} label="ger" />
      <Node x={350} y={20} w={110} label="Role" sub="namespaced" tone="violet" />
      <Arrow x1={405} y1={64} x2={405} y2={114} label="tillåter" />
      <Node x={310} y={118} w={150} label="verbs på resurser" sub="get/list/create..." tone="slate" />
      <text
        x={240}
        y={180}
        textAnchor="middle"
        className="fill-rose"
        style={{ fontSize: 10 }}
      >
        Default deny — bara explicit listat tillåts
      </text>
    </Svg>
  );
}

function IngressDiagram() {
  return (
    <Svg height={250}>
      <Node x={170} y={10} w={140} label="Internet" sub="https://app.com" tone="slate" />
      <Arrow x1={240} y1={54} x2={240} y2={74} />
      <Node x={150} y={78} w={180} label="Ingress" sub="host/path-routing" tone="sage" />
      <Arrow x1={240} y1={122} x2={240} y2={142} label="Service" />
      <Node x={170} y={146} w={140} label="Service" sub="selector" tone="sage" />
      <Arrow x1={240} y1={190} x2={240} y2={210} label="endpoints" />
      <Node x={100} y={214} w={100} h={32} label="Pod" tone="amber" />
      <Node x={210} y={214} w={100} h={32} label="Pod" tone="amber" />
      <Node x={320} y={214} w={100} h={32} label="Pod" tone="amber" />
    </Svg>
  );
}

function ConfigDiagram() {
  return (
    <Svg height={220}>
      <Node x={20} y={20} w={140} label="ConfigMap" sub="log-level, host" tone="slate" />
      <Node x={20} y={120} w={140} label="Secret" sub="base64-kodad" tone="slate" />
      <Arrow x1={160} y1={42} x2={200} y2={70} label="env" />
      <Arrow x1={160} y1={142} x2={200} y2={104} label="mount" />
      <Node x={200} y={68} w={150} h={56} label="Pod" sub="env vars + filer" tone="amber" />
      <text
        x={290}
        y={170}
        textAnchor="middle"
        className="fill-text-faint"
        style={{ fontSize: 10 }}
      >
        env = statisk · mount = live-update
      </text>
    </Svg>
  );
}
