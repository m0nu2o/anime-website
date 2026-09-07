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

  const PARAMS = useMemo(() => ({"radiusOuter":30,"radiusInner":15,"neuroActivity":0,"chaosFactor":0.5,"pulseSpeed":1}), []);
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
        const radiusOuter = addControl("radiusOuter", "Cortical Radius", 10, 50, 30);
        const radiusInner = addControl("radiusInner", "Deep Radius", 5, 25, 15);
        const neuroActivity = addControl("neuroActivity", "Neuroactivity Level", 0, 1, 0.0);
        const chaosFactor = addControl("chaosFactor", "Synaptic Chaos", 0, 2, 0.5);
        const pulseSpeed = addControl("pulseSpeed", "Pulse Speed", 0, 5, 1.0);
        
        let t = time * pulseSpeed;
        let iNorm = i / count;
        let layer = iNorm < 0.5 ? 0 : 1;
        let localI = layer === 0 ? i : i - (count / 2);
        let totalLocal = count / 2;
        
        let phi = Math.acos(1 - 2 * (localI + 0.5) / totalLocal);
        let theta = Math.sqrt(totalLocal * Math.PI) * (localI + 0.5);
        
        let r = layer === 0 ? radiusOuter : radiusInner;
        let x = r * Math.sin(phi) * Math.cos(theta);
        let y = r * Math.sin(phi) * Math.sin(theta);
        let z = r * Math.cos(phi);
        
        let noiseX = Math.sin(t * 0.5 + phi * 3) * Math.cos(t * 0.3 + theta * 2);
        let noiseY = Math.cos(t * 0.4 + phi * 2) * Math.sin(t * 0.6 + theta * 3);
        let noiseZ = Math.sin(t * 0.7 + phi + theta);
        
        let moveAmt = layer === 0 ? chaosFactor * 1.5 : chaosFactor * 0.5;
        x += noiseX * moveAmt;
        y += noiseY * moveAmt;
        z += noiseZ * moveAmt;
        
        let pulse = Math.sin(t * 2 + i * 0.01) * 0.05 + 1;
        x *= pulse;
        y *= pulse;
        z *= pulse;
        
        target.set(x, y, z);
        
        let hStart = 0.6;
        let s = 0.8;
        let l = 0.5;
        let hEnd = 0.0;
        let hMix = neuroActivity;
        let hFinal = hStart * (1 - hMix) + hEnd * hMix;
        
        let lVar = layer === 0 ? 0.5 : 0.3 + (neuroActivity * 0.4);
        let sVar = layer === 0 ? 0.8 : 0.6 + (neuroActivity * 0.3);
        
        color.setHSL(hFinal, sVar, lVar);
        
        if (i === 0) {
            setInfo("Neuroplasticity Brain", "Outer: Synaptic Chaos | Inner: Deep Activity");
            annotate("core", new THREE.Vector3(0, 0, 0), "Neural Core");
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