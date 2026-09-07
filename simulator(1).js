import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Effects } from '@react-three/drei';
import { UnrealBloomPass } from 'three-stdlib';
import * as THREE from 'three';

extend({ UnrealBloomPass });

const ParticleSwarm = () => {
  const meshRef = useRef();
  const count = 20000;
  const speedMult = 1;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const pColor = useMemo(() => new THREE.Color(), []);
  const color = pColor; // Alias for user code compatibility
  
  const positions = useMemo(() => {
     const pos = [];
     for(let i=0; i<count; i++) pos.push(new THREE.Vector3((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100));
     return pos;
  }, []);

  // Material & Geom
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff }), []);
  const geometry = useMemo(() => new THREE.TetrahedronGeometry(0.25), []);

  const PARAMS = useMemo(() => ({"breath":1,"size":70,"handle":1}), []);
  const addControl = (id, l, min, max, val) => {
      return PARAMS[id] !== undefined ? PARAMS[id] : val;
  };
  const setInfo = () => {};
  const annotate = () => {};

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime() * speedMult;
    const THREE_LIB = THREE;

    if(material.uniforms && material.uniforms.uTime) {
         material.uniforms.uTime.value = time;
    }

    for (let i = 0; i < count; i++) {
        // USER CODE START
        const breath = addControl("breath", "Breathing Speed", 0, 3, 1.0);
        const size = addControl("size", "Cup Size", 40, 120, 70);
        const handle = addControl("handle", "Handle Size", 0.5, 1.5, 1.0);
        
        const N = count;
        
        const nBody = Math.floor(N * 0.65);
        const nRim = Math.floor(N * 0.10);
        const nHandle = Math.floor(N * 0.20);
        const nCoffee = Math.floor(N * 0.04);
        const nSteam = Math.floor(N * 0.01);
        
        const breathFactor = 1 + 0.04 * Math.sin(time * breath);
        
        let px = 0, py = 0, pz = 0;
        let particleType = 0;
        
        const GOLDEN = Math.PI * (3 - Math.sqrt(5));
        
        if (i < nBody) {
        
          // CUERPO DE LA TAZA
          const f = (i + 0.5) / nBody;
        
          const y = (f - 0.5) * size * 1.25;
          const radius = size * (0.68 + 0.08 * (y / size + 0.5));
        
          const angle = i * GOLDEN;
          const r = radius * Math.sqrt((i % 1000) / 1000);
        
          px = Math.cos(angle) * r;
          py = y * breathFactor;
          pz = Math.sin(angle) * r;
        
          particleType = 0;
        
        } else if (i < nBody + nRim) {
        
          // BORDE SUPERIOR
          const j = i - nBody;
          const f = j / nRim;
          const angle = f * Math.PI * 2;
        
          const radius = size * 0.75;
        
          px = Math.cos(angle) * radius;
          py = size * 0.65;
          pz = Math.sin(angle) * radius;
        
          particleType = 0;
        
        } else if (i < nBody + nRim + nHandle) {
        
          // MANGO ROJO
          const j = i - nBody - nRim;
          const f = j / nHandle;
        
          const angle = -Math.PI * 0.85 + f * Math.PI * 1.7;
        
          const centerX = size * 0.72;
          const centerY = 0;
          const handleRadius = size * 0.48 * handle;
        
          px = centerX + Math.cos(angle) * handleRadius;
          py = centerY + Math.sin(angle) * handleRadius;
          pz = 0;
        
          // Grosor del mango
          const thickness = size * 0.10;
          const offset = ((j * 17) % 100) / 100;
        
          px += Math.cos(angle) * thickness * offset;
          py += Math.sin(angle) * thickness * offset;
        
          particleType = 1;
        
        } else if (i < nBody + nRim + nHandle + nCoffee) {
        
          // CAFÉ
          const j = i - nBody - nRim - nHandle;
          const f = j / nCoffee;
        
          const angle = j * GOLDEN;
          const radius = size * 0.58 * Math.sqrt(f);
        
          px = Math.cos(angle) * radius;
          py = size * 0.66;
          pz = Math.sin(angle) * radius;
        
          particleType = 2;
        
        } else {
        
          // VAPOR
          const j = i - nBody - nRim - nHandle - nCoffee;
          const f = j / Math.max(1, nSteam);
        
          const angle = j * 2.4;
        
          px = Math.sin(time * 0.8 + angle) * size * 0.18;
          py = size * 0.7 + f * size * 0.9;
          pz = Math.cos(time * 0.6 + angle) * size * 0.12;
        
          particleType = 3;
        }
        
        target.set(px, py, pz);
        
        
        // COLORES
        if (particleType === 1) {
        
          // MANGO ROJO
          color.setHSL(0.0, 0.95, 0.52);
        
        } else if (particleType === 2) {
        
          // CAFÉ
          color.setHSL(0.07, 0.75, 0.22);
        
        } else if (particleType === 3) {
        
          // VAPOR
          color.setHSL(0.0, 0.0, 0.85);
        
        } else {
        
          // CUERPO BLANCO
          color.setHSL(0.0, 0.05, 0.92);
        }
        
        
        // INFORMACIÓN
        if (i === 0) {
          setInfo("Red Cup", "Cute particle cup with a red handle.");
          annotate(
            "cup_core",
            new THREE.Vector3(0, 0, 0),
            "Cup"
          );
        }
        // USER CODE END

        positions[i].lerp(target, 0.1);
        dummy.position.copy(positions[i]);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, pColor);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} />
  );
};

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas camera={{ position: [0, 0, 100], fov: 60 }}>
        <fog attach="fog" args={['#000000', 0.01]} />
        <ParticleSwarm />
        <OrbitControls autoRotate={true} />
        <Effects disableGamma>
            <unrealBloomPass threshold={0} strength={1.8} radius={0.4} />
        </Effects>
      </Canvas>
    </div>
  );
}