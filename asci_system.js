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

  const PARAMS = useMemo(() => ({"scale":45,"flow":0.7,"chaos":0.65,"twist":1.4}), []);
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
        const scale = addControl("scale", "Field Scale", 10, 100, 45);
        const flow = addControl("flow", "Flow Speed", 0, 3, 0.7);
        const chaos = addControl("chaos", "Organic Distortion", 0, 2, 0.65);
        const twist = addControl("twist", "Spatial Twist", 0, 4, 1.4);
        
        const u = i / (count > 1 ? count - 1 : 1);
        const band = Math.floor(u * 120);
        const local = u * 120 - band;
        const angle = local * Math.PI * 2 + band * 0.618 + time * flow;
        
        const waveA = Math.sin(angle * 3.0 + band * 0.13 + time * flow);
        const waveB = Math.cos(angle * 2.0 - band * 0.09 + time * flow * 0.7);
        const waveC = Math.sin(band * 0.21 + time * flow * 0.5);
        
        const radius = scale * (
        0.35 +
        0.28 * Math.sin(band * 0.17 + time * flow) +
        0.22 * waveA
        );
        
        const spiral = band * 0.055 + time * flow * 0.2;
        const distortion = chaos * scale * 0.18;
        
        const px = Math.cos(angle + spiral) * radius +
        Math.sin(band * 0.31 + time * flow) * distortion;
        
        const py = (band - 60) * scale * 0.028 +
        waveA * scale * 0.22 +
        waveB * distortion;
        
        const pz = Math.sin(angle * twist + spiral) * radius +
        waveC * scale * 0.35;
        
        target.set(px, py, pz);
        
        const hue = 0.015 + 0.055 * (
        0.5 + 0.5 * Math.sin(angle + time * flow * 0.4)
        );
        
        const light = 0.28 + 0.5 * (
        0.5 + 0.5 * Math.sin(band * 0.12 + angle * 2.0)
        );
        
        color.setHSL(hue, 1.0, light);
        
        if (i === 0) {
        setInfo(
        "Living Data Field",
        "A flowing computational swarm inspired by glowing ASCII systems, organic interference, and bold digital typography."
        );
        annotate(
        "core",
        new THREE.Vector3(0, 0, 0),
        "BE BOLD"
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