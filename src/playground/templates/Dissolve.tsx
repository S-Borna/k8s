import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, Float } from "@react-three/drei";
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

// Custom GLSL dissolve material
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

// 3D simplex noise for organic dissolve pattern
const fragmentShader = `
  uniform float uProgress;
  uniform float uEdgeWidth;
  uniform vec3 uEdgeColor;
  uniform vec3 uBaseColor;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // Simplex-style noise
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main() {
    // Sample noise at world-position-ish coordinates
    float n = snoise(vec3(vUv * 6.0, uTime * 0.05)) * 0.5 + 0.5;

    // Discard pixels where noise is below threshold
    if (n < uProgress) discard;

    // Edge glow band
    float edge = smoothstep(uProgress + uEdgeWidth, uProgress, n);
    vec3 color = mix(uBaseColor, uEdgeColor, edge);

    // Fresnel rim
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.0);
    color += uEdgeColor * fresnel * 0.3;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function DissolvingObject() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0.0 },
      uEdgeWidth: { value: 0.05 },
      uEdgeColor: { value: new THREE.Color("#fbbf24") },
      uBaseColor: { value: new THREE.Color("#fef3c7") },
      uTime: { value: 0.0 },
    }),
    [],
  );

  useFrame((state) => {
    if (!matRef.current) return;
    const elapsed = state.clock.elapsedTime;
    matRef.current.uniforms["uTime"]!.value = elapsed;
    // Cycle: 0 → 1 over 6s, hold 1s, reset
    const cycle = (elapsed % 8) / 6;
    matRef.current.uniforms["uProgress"]!.value = Math.min(1, Math.max(0, cycle));

    if (groupRef.current) {
      groupRef.current.rotation.y = elapsed * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={0.6} rotationIntensity={0.1} floatIntensity={0.25}>
        <mesh>
          <torusKnotGeometry args={[1, 0.32, 200, 32]} />
          <shaderMaterial
            ref={matRef}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={uniforms}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Float>
    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={["#0d0a08"]} />
      <fog attach="fog" args={["#0d0a08", 5, 16]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 4, 4]} intensity={2} color="#fed7aa" />
      <pointLight position={[-5, -2, 4]} intensity={1.5} color="#7c2d12" />
      <Environment preset="warehouse" environmentIntensity={0.4} background={false} />
      <DissolvingObject />
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

export default function Dissolve() {
  return (
    <PlaygroundLayout
      title="Dissolve"
      subtitle="Custom GLSL noise-shader"
      genre="Tech · AI · Premium"
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 40 }}
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
              luminanceThreshold={0.5}
              luminanceSmoothing={0.9}
              intensity={1.2}
              mipmapBlur
            />
            <Noise opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
            <Vignette eskil={false} offset={0.18} darkness={0.85} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </PlaygroundLayout>
  );
}
