import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  MeshTransmissionMaterial,
  Environment,
  Text,
  Html,
  ScrollControls,
  Scroll,
  useScroll,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ToneMapping,
} from "@react-three/postprocessing";
import { ToneMappingMode, BlendFunction } from "postprocessing";
import { easing } from "maath";
import * as THREE from "three";

const SPOKES = [
  { label: "PODS", desc: "Den minsta enheten" },
  { label: "SERVICES", desc: "Stabil access" },
  { label: "DEPLOYMENTS", desc: "Önskat tillstånd" },
  { label: "INGRESS", desc: "Trafik in" },
  { label: "STORAGE", desc: "Persistens" },
  { label: "SECRETS", desc: "Hemligheter" },
  { label: "RBAC", desc: "Behörigheter" },
];

// Helpers — scroll progress is 0..1 across 4 pages
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const stage = (offset: number, from: number, to: number) =>
  clamp((offset - from) / (to - from));

function Spoke({
  index,
  total,
}: {
  index: number;
  total: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const scroll = useScroll();
  const spokeData = SPOKES[index];
  const baseAngle = (index / total) * Math.PI * 2;
  const baseRadius = 1.6;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const offset = scroll.offset;

    // Stage progress (0..1 within each segment)
    const splitT = stage(offset, 0.25, 0.5);    // disassemble
    const orbitT = stage(offset, 0.5, 0.75);    // floating around viewer
    const reassembleT = stage(offset, 0.75, 1.0); // come back

    // Base position (at rest in heptagon)
    const baseX = Math.cos(baseAngle) * baseRadius;
    const baseY = Math.sin(baseAngle) * baseRadius;

    // Orbital position (around viewer, offset in z + scattered)
    const orbitTime = orbitT * Math.PI * 0.6;
    const orbitAngle = baseAngle + orbitTime;
    const orbitRadius = 3.5;
    const orbitX = Math.cos(orbitAngle) * orbitRadius;
    const orbitY = Math.sin(orbitAngle) * orbitRadius * 0.6;
    const orbitZ = Math.sin(baseAngle * 2 + orbitTime) * 1.2;

    // Blend positions across stages
    const splitProgress = splitT * (1 - reassembleT);
    const targetX = lerp(baseX, orbitX, splitProgress);
    const targetY = lerp(baseY, orbitY, splitProgress);
    const targetZ = lerp(0, orbitZ, splitProgress);

    easing.damp(groupRef.current.position, "x", targetX, 0.3, delta);
    easing.damp(groupRef.current.position, "y", targetY, 0.3, delta);
    easing.damp(groupRef.current.position, "z", targetZ, 0.3, delta);

    // Rotation — spokes turn outward when orbiting, then back
    const targetRotZ = lerp(
      baseAngle + Math.PI / 2,
      baseAngle + Math.PI / 2 + orbitTime,
      splitProgress,
    );
    easing.damp(groupRef.current.rotation, "z", targetRotZ, 0.4, delta);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.06, 1.0, 0.06]} />
        <meshStandardMaterial
          color="#fef3c7"
          emissive="#f59e0b"
          emissiveIntensity={1.4}
          metalness={0.85}
          roughness={0.15}
        />
      </mesh>
      {/* Tip glow */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#fbbf24" toneMapped={false} />
      </mesh>
      {/* Label appears during orbit phase */}
      <SpokeLabel index={index} label={spokeData?.label ?? ""} desc={spokeData?.desc ?? ""} />
    </group>
  );
}

function SpokeLabel({
  index,
  label,
  desc,
}: {
  index: number;
  label: string;
  desc: string;
}) {
  const ref = useRef<THREE.Group>(null);
  const scroll = useScroll();

  useFrame((_, delta) => {
    if (!ref.current) return;
    const orbitT = stage(scroll.offset, 0.45, 0.6);
    const fadeOut = stage(scroll.offset, 0.78, 0.92);
    const opacity = orbitT * (1 - fadeOut);
    easing.damp(ref.current.scale, "x", opacity, 0.2, delta);
    easing.damp(ref.current.scale, "y", opacity, 0.2, delta);
    easing.damp(ref.current.scale, "z", opacity, 0.2, delta);
  });

  return (
    <group ref={ref} position={[0, 0.85, 0]} scale={0}>
      <Text
        fontSize={0.13}
        letterSpacing={0.16}
        color="#fef3c7"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.003}
        outlineColor="#1a1714"
      >
        {String(index + 1).padStart(2, "0")} · {label}
      </Text>
      <Text
        position={[0, -0.16, 0]}
        fontSize={0.07}
        letterSpacing={0.12}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
      >
        {desc}
      </Text>
    </group>
  );
}

function HeroWheel() {
  const torusRef = useRef<THREE.Mesh>(null);
  const hubRef = useRef<THREE.Mesh>(null);
  const scroll = useScroll();

  useFrame((_, delta) => {
    const offset = scroll.offset;
    const splitT = stage(offset, 0.25, 0.5);
    const reassembleT = stage(offset, 0.75, 1.0);

    if (torusRef.current) {
      torusRef.current.rotation.z += delta * 0.06;
      // Torus fades out during split, returns at reassemble
      const visibility = lerp(1, 0.0, splitT) + reassembleT;
      easing.damp(torusRef.current.scale, "x", clamp(visibility), 0.4, delta);
      easing.damp(torusRef.current.scale, "y", clamp(visibility), 0.4, delta);
      easing.damp(torusRef.current.scale, "z", clamp(visibility), 0.4, delta);
    }
    if (hubRef.current) {
      hubRef.current.rotation.y += delta * 0.4;
      // Hub grows brighter during split (it stays at center)
      const intensity = 1 + splitT * (1 - reassembleT) * 1.5;
      const mat = hubRef.current.material as THREE.MeshPhysicalMaterial;
      if ("emissiveIntensity" in mat) {
        mat.emissiveIntensity = intensity;
      }
    }
  });

  return (
    <group>
      <mesh ref={torusRef}>
        <torusGeometry args={[1.6, 0.18, 32, 100]} />
        <MeshTransmissionMaterial
          backside
          samples={6}
          thickness={0.4}
          roughness={0.04}
          chromaticAberration={0.04}
          distortion={0.04}
          distortionScale={0.4}
          temporalDistortion={0.02}
          ior={1.5}
          color="#fef3c7"
          transmission={1}
          anisotropy={0.3}
        />
      </mesh>

      {SPOKES.map((_, i) => (
        <Spoke key={i} index={i} total={SPOKES.length} />
      ))}

      <mesh ref={hubRef}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <MeshTransmissionMaterial
          samples={8}
          thickness={0.6}
          roughness={0}
          chromaticAberration={0.1}
          distortion={0.2}
          distortionScale={0.5}
          temporalDistortion={0.05}
          ior={1.6}
          color="#fbbf24"
          transmission={1}
          anisotropy={0.5}
        />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={2} color="#fbbf24" distance={4} />
    </group>
  );
}

function CameraRig() {
  const scroll = useScroll();

  useFrame((state, delta) => {
    const offset = scroll.offset;

    // Camera dolly: starts back, moves close, retreats
    const z = lerp(9, 4, stage(offset, 0, 0.25));
    const z2 = lerp(z, 1.5, stage(offset, 0.25, 0.5));
    const z3 = lerp(z2, 5, stage(offset, 0.75, 1.0));

    easing.damp(state.camera.position, "z", z3, 0.4, delta);

    // Subtle camera bob during orbit phase
    const orbitT = stage(offset, 0.5, 0.75);
    const orbitAngle = orbitT * Math.PI * 0.4;
    easing.damp(
      state.camera.position,
      "x",
      Math.sin(orbitAngle) * 0.5,
      0.5,
      delta,
    );
    easing.damp(
      state.camera.position,
      "y",
      Math.cos(orbitAngle) * 0.3,
      0.5,
      delta,
    );

    // Always look at center
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

const DUST_POSITIONS = (() => {
  const arr = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 26;
    arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
  }
  return arr;
})();

function AmbientDust() {
  const pointsRef = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    points.rotation.y += delta * 0.012;
    const positionAttr = points.geometry.attributes["position"];
    if (!positionAttr) return;
    const arr = positionAttr.array as Float32Array;
    for (let i = 0; i < 400; i++) {
      const yIdx = i * 3 + 1;
      const y = arr[yIdx] ?? 0;
      arr[yIdx] = y + delta * 0.05;
      if (arr[yIdx]! > 8) arr[yIdx] = -8;
    }
    positionAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={400}
          array={DUST_POSITIONS}
          itemSize={3}
          args={[DUST_POSITIONS, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.022}
        color="#fef3c7"
        transparent
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#0d0a08"]} />
      <fog attach="fog" args={["#0d0a08", 5, 16]} />

      <ambientLight intensity={0.15} />
      <directionalLight
        position={[5, 4, 3]}
        intensity={1.0}
        color="#fed7aa"
      />
      <pointLight position={[-4, -2, 2]} intensity={0.7} color="#7c2d12" />

      <Environment preset="warehouse" environmentIntensity={0.25} background={false} />

      <AmbientDust />

      <Float speed={0.4} rotationIntensity={0.04} floatIntensity={0.12}>
        <HeroWheel />
      </Float>

      <CameraRig />
    </>
  );
}

function ScrollHtml() {
  return (
    <div className="font-display text-text">
      {/* Scene 1 */}
      <section className="h-screen flex items-end justify-center pb-24">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-text-faint">
            Tentapluggs studio
          </p>
          <h1 className="mt-3 text-6xl italic">Kubernetes</h1>
          <p className="mt-2 text-sm text-text-muted">en orkestrator</p>
        </div>
      </section>

      {/* Scene 2 */}
      <section className="h-screen flex items-center justify-end pr-16">
        <div className="max-w-sm text-right">
          <p className="text-[11px] uppercase tracking-[0.32em] text-amber">
            Sju kärnkoncept
          </p>
          <h2 className="mt-3 font-display text-3xl text-text">
            Varje del med syfte.
          </h2>
        </div>
      </section>

      {/* Scene 3 */}
      <section className="h-screen flex items-center pl-16">
        <div className="max-w-sm">
          <p className="text-[11px] uppercase tracking-[0.32em] text-amber">
            Runt dig
          </p>
          <h2 className="mt-3 font-display text-3xl text-text">
            Varje del med eget jobb.
          </h2>
          <p className="mt-3 text-sm text-text-muted">
            Pods kör containrar. Services exponerar dem. Deployments håller dem
            uppe. Tillsammans en orkestrator.
          </p>
        </div>
      </section>

      {/* Scene 4 */}
      <section className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-amber">
            Tillsammans
          </p>
          <h2 className="mt-3 font-display text-5xl text-text italic">
            En helhet.
          </h2>
          <a
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber/15 px-6 py-2.5 text-sm text-amber transition hover:bg-amber/25"
          >
            Tillbaka till studierna →
          </a>
        </div>
      </section>
    </div>
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center gap-2 rounded-xl border border-amber/40 bg-bg-elevated/90 px-4 py-2 backdrop-blur">
        <div className="h-2 w-2 animate-pulse rounded-full bg-amber" />
        <span className="text-xs uppercase tracking-[0.18em] text-amber">
          Bygger scenen…
        </span>
      </div>
    </Html>
  );
}

export default function Playground() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-bg">
      <Canvas
        camera={{ position: [0, 0, 9], fov: 38 }}
        dpr={[1, 2]}
        gl={{
          antialias: false,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <ScrollControls pages={4} damping={0.25}>
            <Scene />
            <Scroll html style={{ width: "100%" }}>
              <ScrollHtml />
            </Scroll>
          </ScrollControls>
          <EffectComposer multisampling={0}>
            <Bloom
              luminanceThreshold={0.6}
              luminanceSmoothing={0.92}
              intensity={0.55}
              mipmapBlur
            />
            <Noise opacity={0.025} blendFunction={BlendFunction.OVERLAY} />
            <Vignette eskil={false} offset={0.18} darkness={0.85} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Top nav overlay */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
        <div className="flex items-center justify-between p-6">
          <a
            href="/playground"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-amber/30 bg-bg-elevated/40 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-text-muted backdrop-blur transition hover:border-amber/60 hover:text-amber"
          >
            ← Galleri
          </a>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-text-faint">
              Demo · Scroll
            </div>
            <div className="mt-1 font-display text-base italic text-text-muted">
              Studio
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <div className="text-[10px] uppercase tracking-[0.32em] text-text-faint">
          Scrolla ↓
        </div>
      </div>
    </div>
  );
}
