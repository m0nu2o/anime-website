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

  const PARAMS = useMemo(() => ({"scale":65,"twist":1.4,"chaos":0.8,"speed":0.7}), []);
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
        const scale = addControl("scale", "Breathing Scale", 20, 120, 65); const twist = addControl("twist", "Dimensional Twist", 0, 4, 1.4); const chaos = addControl("chaos", "Organic Chaos", 0, 3, 0.8); const speed = addControl("speed", "Flow Speed", 0, 3, 0.7);
        
        const u = i / Math.max(1, count - 1); const phi = i * 2.399963229728653; const band = u * 2 - 1; const ring = Math.sqrt(Math.max(0, 1 - band * band)); const breathe = 1 + 0.16 * Math.sin(time * speed + u * 9.0);
        
        const a = phi + time * speed * 0.35 + band * twist; const b = phi * 1.618 + time * speed * 0.22;
        
        const wave1 = Math.sin(a * 3.0 + time * speed) * chaos; const wave2 = Math.cos(b * 2.0 - time * speed * 0.8) * chaos; const wave3 = Math.sin(a * 5.0 + b + time * speed * 0.5) * chaos;
        
        const r = scale * ring * breathe; const x = Math.cos(a) * r; const y = band * scale * breathe; const z = Math.sin(a) * r;
        
        const px = x + Math.sin(b * 2.0 + y * 0.035) * wave1 * 8.0; const py = y + Math.cos(a * 3.0 + z * 0.025) * wave2 * 8.0; const pz = z + Math.sin(a * 2.0 + x * 0.025) * wave3 * 8.0;
        
        target.set(px, py, pz);
        
        const hue = (u * 0.72 + time * 0.025 + Math.sin(a) * 0.08) % 1; const light = 0.48 + 0.12 * Math.sin(a * 2.0 + time); color.setHSL(hue < 0 ? hue + 1 : hue, 0.85, light);
        
        if (i === 0) { setInfo("4D Breathing Attractor", "A continuously twisting hyperspace swarm with organic waves and animated dimensional breathing."); annotate("core", target, "4D Core"); } 
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