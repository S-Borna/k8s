import { Suspense, useMemo, useRef } from "react";
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
import * as THREE from "three";
import { PlaygroundLayout } from "@/playground/shared/Layout";

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mv.xyz;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uScanlineDensity;
  uniform float uScanlineSpeed;
  uniform float uChromaShift;
  uniform float uFresnelPower;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), uFresnelPower);

    // Scanlines following world-position Y for cross-mesh consistency
    float scan = sin(vWorldPosition.y * uScanlineDensity - uTime * uScanlineSpeed);
    scan = smoothstep(0.4, 0.6, scan * 0.5 + 0.5);

    // Vertical glitch occasionally
    float glitch = step(0.985, random(vec2(floor(uTime * 12.0), floor(vUv.y * 30.0))));
    float horizontalShift = (random(vec2(floor(uTime * 12.0), 0.0)) - 0.5) * 0.05 * glitch;

    // Color: gradient between A and B based on Y, modulated by scan
    vec3 baseColor = mix(uColorA, uColorB, vUv.y + horizontalShift);
    baseColor *= 0.4 + scan * 0.6;

    // Edge glow via fresnel
    baseColor += uColorA * fresnel * 1.4;

    // Chromatic aberration on edges
    float r = baseColor.r + uChromaShift * fresnel;
    float b = baseColor.b - uChromaShift * fresnel;
    vec3 finalColor = vec3(r, baseColor.g, b);

    // Pulse opacity with subtle breathing
    float pulse = 0.85 + sin(uTime * 1.2) * 0.08;
    float opacity = (fresnel * 0.6 + 0.5) * pulse;
    opacity = clamp(opacity, 0.3, 1.0);

    gl_FragColor = vec4(finalColor, opacity);
  }
`;

function HologramObject() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color("#22d3ee") },
      uColorB: { value: new THREE.Color("#a78bfa") },
      uScanlineDensity: { value: 30 },
      uScanlineSpeed: { value: 4 },
      uChromaShift: { value: 0.15 },
      uFresnelPower: { value: 1.6 },
    }),
    [],
  );

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms["uTime"]!.value = state.clock.elapsedTime;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.25;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.2}>
        <mesh>
          <icosahedronGeometry args={[1.3, 1]} />
          <shaderMaterial
            ref={matRef}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={uniforms}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Inner wireframe core */}
        <mesh scale={0.85}>
          <icosahedronGeometry args={[1.3, 0]} />
          <meshBasicMaterial
            color="#67e8f9"
            wireframe
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        </mesh>
      </Float>
    </group>
  );
}

function GroundGrid() {
  return (
    <gridHelper
      args={[20, 40, "#22d3ee", "#1e293b"]}
      position={[0, -2.5, 0]}
    />
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 4, 14]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[3, 4, 2]} intensity={1.5} color="#22d3ee" />
      <pointLight position={[-3, -2, -2]} intensity={1} color="#a78bfa" />
      <Environment preset="night" environmentIntensity={0.2} background={false} />
      <HologramObject />
      <GroundGrid />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.3}
        rotateSpeed={0.4}
      />
    </>
  );
}

export default function Hologram() {
  return (
    <PlaygroundLayout
      title="Hologram"
      subtitle="Scanlines · Fresnel · Chromatic offset"
      genre="Tech · Gaming · Futuristic"
    >
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: false,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
      >
        <Suspense fallback={null}>
          <Scene />
          <EffectComposer multisampling={0}>
            <Bloom
              luminanceThreshold={0.3}
              luminanceSmoothing={0.9}
              intensity={1.6}
              mipmapBlur
            />
            <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
            <Vignette eskil={false} offset={0.2} darkness={0.9} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </PlaygroundLayout>
  );
}
