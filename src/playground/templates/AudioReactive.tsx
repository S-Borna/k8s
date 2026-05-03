import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, OrbitControls } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ToneMapping,
} from "@react-three/postprocessing";
import { ToneMappingMode, BlendFunction } from "postprocessing";
import { motion } from "motion/react";
import { Pause, Play } from "lucide-react";
import * as THREE from "three";
import { PlaygroundLayout } from "@/playground/shared/Layout";

// Audio analyser hook returning frequency-band intensities
function useFrequencyBands(audio: HTMLAudioElement | null, bands: number = 32) {
  const [data, setData] = useState<Float32Array>(() => new Float32Array(bands));
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audio) return;
    let raf = 0;

    function ensureContext() {
      if (ctxRef.current) return ctxRef.current;
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.78;
      analyserRef.current = analyser;
      const src = ctx.createMediaElementSource(audio!);
      src.connect(analyser);
      analyser.connect(ctx.destination);
      return ctx;
    }

    function tick() {
      const analyser = analyserRef.current;
      if (!analyser) return;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(buf);

      // Distribute bins into bands
      const out = new Float32Array(bands);
      const binsPerBand = Math.floor(buf.length / bands);
      for (let b = 0; b < bands; b++) {
        let sum = 0;
        for (let i = 0; i < binsPerBand; i++) {
          sum += buf[b * binsPerBand + i] ?? 0;
        }
        out[b] = sum / (binsPerBand * 255);
      }
      setData(out);
      raf = requestAnimationFrame(tick);
    }

    function onPlay() {
      const ctx = ensureContext();
      void ctx.resume();
      raf = requestAnimationFrame(tick);
    }

    function onStop() {
      cancelAnimationFrame(raf);
      setData(new Float32Array(bands));
    }

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onStop);
    audio.addEventListener("ended", onStop);
    return () => {
      cancelAnimationFrame(raf);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onStop);
      audio.removeEventListener("ended", onStop);
    };
  }, [audio, bands]);

  return data;
}

const SPECTRUM_BANDS = 32;

function ReactiveBars({ bands }: { bands: Float32Array }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.05;

    for (let i = 0; i < SPECTRUM_BANDS; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const target = (bands[i] ?? 0) * 4;
      mesh.scale.y += (target - mesh.scale.y) * Math.min(1, delta * 12);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + (bands[i] ?? 0) * 4;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: SPECTRUM_BANDS }).map((_, i) => {
        const angle = (i / SPECTRUM_BANDS) * Math.PI * 2;
        const radius = 1.6;
        const hue = (i / SPECTRUM_BANDS) * 50 + 25; // amber → rose hue band
        return (
          <mesh
            key={i}
            ref={(el) => {
              meshRefs.current[i] = el;
            }}
            position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[0.08, 1, 0.08]} />
            <meshStandardMaterial
              color={new THREE.Color(`hsl(${hue}, 95%, 70%)`)}
              emissive={new THREE.Color(`hsl(${hue}, 95%, 60%)`)}
              emissiveIntensity={0.4}
              metalness={0.5}
              roughness={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function ReactiveCenter({ bands }: { bands: Float32Array }) {
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!sphereRef.current) return;
    let lowAvg = 0;
    for (let i = 0; i < 4; i++) lowAvg += bands[i] ?? 0;
    lowAvg /= 4;
    const target = 1 + lowAvg * 0.5;
    sphereRef.current.scale.setScalar(
      sphereRef.current.scale.x + (target - sphereRef.current.scale.x) * 0.15,
    );
    const mat = sphereRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.5 + lowAvg * 4;
  });

  return (
    <Float speed={0.6} rotationIntensity={0.3} floatIntensity={0.3}>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.55, 64, 64]} />
        <meshStandardMaterial
          color="#fef3c7"
          emissive="#f59e0b"
          emissiveIntensity={0.6}
          metalness={0.2}
          roughness={0.05}
        />
      </mesh>
    </Float>
  );
}

function Scene({ bands }: { bands: Float32Array }) {
  return (
    <>
      <color attach="background" args={["#0d0a08"]} />
      <fog attach="fog" args={["#0d0a08", 5, 14]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[5, 4, 4]} intensity={2} color="#fed7aa" />
      <pointLight position={[-5, -2, 4]} intensity={1.5} color="#7c2d12" />
      <pointLight position={[0, 0, 0]} intensity={1.5} color="#fbbf24" distance={6} />
      <Environment preset="warehouse" environmentIntensity={0.3} background={false} />
      <ReactiveBars bands={bands} />
      <ReactiveCenter bands={bands} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.4}
        rotateSpeed={0.4}
      />
    </>
  );
}

export default function AudioReactive() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const bands = useFrequencyBands(audio, SPECTRUM_BANDS);

  useEffect(() => {
    setAudio(audioRef.current);
  }, []);

  function toggle() {
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  return (
    <PlaygroundLayout
      title="Audio Reactive"
      subtitle="Frequency-band-analys driver scenen"
      genre="Music · Events · Podcast"
    >
      <audio ref={audioRef} src="/inno-bocelli.mp3" preload="auto" />

      <Canvas
        camera={{ position: [0, 1.2, 4.5], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: false,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
      >
        <Suspense fallback={null}>
          <Scene bands={bands} />
          <EffectComposer multisampling={0}>
            <Bloom
              luminanceThreshold={0.45}
              luminanceSmoothing={0.9}
              intensity={1.4}
              mipmapBlur
            />
            <Noise opacity={0.04} blendFunction={BlendFunction.OVERLAY} />
            <Vignette eskil={false} offset={0.18} darkness={0.85} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Play button overlay */}
      <div className="pointer-events-none fixed inset-x-0 bottom-12 z-40 flex justify-center">
        <motion.button
          onClick={toggle}
          whileTap={{ scale: 0.94 }}
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-amber/40 bg-bg-elevated/80 px-6 py-3 text-sm text-amber backdrop-blur transition hover:border-amber/70 hover:bg-bg-elevated"
        >
          {playing ? (
            <>
              <Pause size={14} fill="currentColor" />
              Pausa Bocelli
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              Spela Bocelli · Inno di Mameli
            </>
          )}
        </motion.button>
      </div>
    </PlaygroundLayout>
  );
}
