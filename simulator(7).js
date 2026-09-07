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

  const PARAMS = useMemo(() => ({}), []);
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
        const u = i / Math.max(1, count - 1);
        const phi = Math.acos(1 - 2 * u);
        const theta = i * 2.399963229728653 + time * 0.32;
        
        const breathe = 1 + 0.22 * Math.sin(time * 1.7 + u * 18.0);
        const warp = 1.0 + 0.28 * Math.sin(theta * 3.0 + time) * Math.sin(phi * 5.0);
        const pulse = 1.0 + 0.16 * Math.sin(time * 2.4 + theta * 2.0 + phi * 7.0);
        
        const radius = (18.0 + 42.0 * Math.pow(u, 0.42)) * breathe * warp * pulse;
        
        const twist = time * 0.22 + radius * 0.018 + Math.sin(phi * 6.0 + time) * 0.35;
        const ct = Math.cos(theta + twist);
        const st = Math.sin(theta + twist);
        const sp = Math.sin(phi);
        const cp = Math.cos(phi);
        
        const x = radius * sp * ct;
        const y = radius * cp + Math.sin(theta * 4.0 + time * 1.3) * 3.5;
        const z = radius * sp * st;
        
        const fold = Math.sin(x * 0.09 + time) * Math.cos(z * 0.075 - time * 0.7);
        const lift = fold * 5.5 + Math.sin(y * 0.12 + theta) * 2.5;
        
        target.set(
        x + fold * 2.2,
        y + lift,
        z + Math.cos(x * 0.06 + z * 0.08 + time) * 3.0
        );
        
        const hue = (0.55 + u * 0.32 + fold * 0.035 + time * 0.025) % 1.0;
        const light = 0.42 + 0.18 * Math.abs(Math.sin(theta * 2.0 + time));
        color.setHSL(hue, 0.9, light);
        
        if (i === 0) {
        setInfo("Living Hyperfield", "A breathing spherical field warped by layered interference waves.");
        annotate("core", new THREE.Vector3(0, 0, 0), "INTERFERENCE CORE");
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