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
        // Jellyfish: bell/umbrella + 4 ruffled oral arms + 16 trailing tentacles.
        // Every particle's shape is hashed from its own index i, so it keeps a
        // stable identity frame to frame. Motion: an asymmetric bell pulse (fast
        // contraction, slow relaxation), arm/tentacle roots that ride that same
        // pulse so they stay attached to the cap, and a traveling sway wave that
        // runs down each strand toward the tip.
        
        function hsh(n) { var s = Math.sin(n) * 43758.5453123; return s - Math.floor(s); }
        function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
        function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
        function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
        
        var TWO_PI = Math.PI * 2;
        
        // ---- structure proportions ----
        var bellCount = Math.floor(count * 0.49);
        var armCount = Math.floor(count * 0.25);
        var numArms = 4;
        var numTentacles = 16;
        
        // ---- shared bell geometry ----
        var bellRadius = 12, bellHeight = 9, bellCenterY = 8, thetaMax = 1.25, lappets = 8;
        var bellUndersideY = bellCenterY + bellHeight * Math.cos(thetaMax);
        
        // ---- shared swim pulse: fast contraction, slow relaxation ----
        var PULSE_CYCLE = 2.6;
        var pulseT = (time % PULSE_CYCLE) / PULSE_CYCLE;
        if (pulseT < 0) pulseT += 1;
        var pulse = pulseT < 0.32
          ? easeOutCubic(pulseT / 0.32)
          : 1 - easeInOutCubic((pulseT - 0.32) / (1 - 0.32));
        var scaleR = 1 - 0.15 * pulse;
        
        var x, y, z, cr, cg, cb;
        
        if (i < bellCount) {
          // ---- bell (umbrella) ----
          var h1 = hsh(i * 12.9898 + 11.0);
          var h2 = hsh(i * 78.233 + 53.0);
          var phi = h2 * TWO_PI;
          var theta = thetaMax * Math.pow(h1, 0.72);
          var rimFactor = Math.pow(theta / thetaMax, 3);
          var lappetWave = Math.sin(phi * lappets) * rimFactor * 1.1;
          var r = bellRadius * Math.sin(theta) * (1 + lappetWave * 0.05);
          var restX = r * Math.cos(phi);
          var restZ = r * Math.sin(phi);
          var restY = bellCenterY + bellHeight * Math.cos(theta);
        
          x = restX * scaleR;
          y = restY + 0.7 * pulse;
          z = restZ * scaleR;
        
          var tt = theta / thetaMax;
          var rib = Math.pow(Math.abs(Math.sin(phi * 16)), 3);
          var shimmer = 1 + rib * 0.35;
          cr = Math.min(1, (0.85 + (0.10 - 0.85) * tt) * shimmer);
          cg = Math.min(1, (0.93 + (0.32 - 0.93) * tt) * shimmer);
          cb = Math.min(1, (1.00 + (0.66 - 1.00) * tt) * shimmer);
        
        } else if (i < bellCount + armCount) {
          // ---- oral arms (frilly, ruffled, hanging from the bell's underside) ----
          var j = i - bellCount;
          var armIndex = j % numArms;
          var baseAngle = armIndex * (TWO_PI / numArms) + Math.PI / 8;
          var cosA = Math.cos(baseAngle), sinA = Math.sin(baseAngle);
          var attachR = bellRadius * 0.12;
        
          var h3 = hsh(i * 12.9898 + 101.0);
          var h4 = hsh(i * 78.233 + 157.0);
          var h5 = hsh(i * 39.346 + 199.0);
          var h6 = hsh(i * 26.651 + 241.0);
        
          var t = Math.pow(h3, 0.85);
          var armLength = 11.5;
          var yLocal = -armLength * Math.pow(t, 1.15);
          var ribbonWidth = 0.5 + 2.4 * t;
          var edge = h4 * 2 - 1;
          var ruffle = Math.sin(t * 26 + edge * 5 + armIndex * 2) * 0.5 * ribbonWidth;
          var localX = edge * ribbonWidth;
          var localZ = ruffle;
        
          var aRestX = attachR * cosA + localX * cosA - localZ * sinA;
          var aRestZ = attachR * sinA + localX * sinA + localZ * cosA;
          var aRestY = bellUndersideY + yLocal;
        
          // root rides the bell's own pulse transform exactly; fades toward the tip
          var attachFollow = 1 - t;
          var baseX = aRestX + (aRestX * scaleR - aRestX) * attachFollow;
          var baseZ = aRestZ + (aRestZ * scaleR - aRestZ) * attachFollow;
          var baseY = aRestY + 0.7 * pulse * attachFollow;
        
          var freq = 0.32 + h5 * 0.14;
          var phaseX = armIndex * 1.7 + h6 * 0.6;
          var phaseZ = armIndex * 2.3 + h6 * 0.6 + 1.7;
          var amp = 2.6 * Math.pow(t, 1.3);
          var wave = t * 4.2;
          var sway = Math.sin(time * freq + phaseX + wave) * amp;
          var swayZ = Math.cos(time * freq * 0.85 + phaseZ + wave * 0.8) * amp * 0.7;
          var lag = clamp01((pulse - 0.5 * t) / 0.4);
          var kick = (1 - lag) * amp * 0.5;
        
          x = baseX + sway + kick;
          y = baseY;
          z = baseZ + swayZ;
        
          cr = 0.55 + (0.20 - 0.55) * t;
          cg = 0.65 + (0.15 - 0.65) * t;
          cb = 0.95 + (0.55 - 0.95) * t;
        
        } else {
          // ---- marginal tentacles (long, thin, trailing) ----
          var k = i - bellCount - armCount;
          var strandIndex = k % numTentacles;
        
          var h7 = hsh(i * 12.9898 + 283.0);
          var h8 = hsh(i * 78.233 + 331.0);
          var h9 = hsh(i * 39.346 + 367.0);
          var h10 = hsh(i * 26.651 + 409.0);
          var h11 = hsh(i * 17.842 + 449.0);
          var h12 = hsh(i * 91.734 + 491.0);
        
          var tPhi = (strandIndex / numTentacles) * TWO_PI + (h7 - 0.5) * 0.05;
          var x0 = bellRadius * Math.sin(thetaMax) * Math.cos(tPhi);
          var z0 = bellRadius * Math.sin(thetaMax) * Math.sin(tPhi);
          var y0 = bellUndersideY;
          var tentLength = 20 + h8 * 24;
          var tt2 = h9; // position along the strand, 0 = root .. 1 = tip
        
          var tyLocal = -tentLength * Math.pow(tt2, 1.3);
          var restBow = Math.sin(tt2 * 3.0 + strandIndex) * 0.6 * tt2;
          var jitter = (h10 - 0.5) * 0.35 * tt2;
        
          var tRestX = x0 + restBow * Math.cos(tPhi + 1.57) + jitter;
          var tRestZ = z0 + restBow * Math.sin(tPhi + 1.57) + jitter * 0.8;
          var tRestY = y0 + tyLocal;
        
          var tAttachFollow = 1 - tt2;
          var tBaseX = tRestX + (tRestX * scaleR - tRestX) * tAttachFollow;
          var tBaseZ = tRestZ + (tRestZ * scaleR - tRestZ) * tAttachFollow;
          var tBaseY = tRestY + 0.7 * pulse * tAttachFollow;
        
          var tFreq = 0.16 + h11 * 0.12;
          var tPhaseX = strandIndex * 0.9 + h12;
          var tPhaseZ = strandIndex * 1.3 + h12 + 2.1;
          var tAmp = (3.4 + h8 * 2.6) * Math.pow(tt2, 1.35);
          var tWave = tt2 * 4.2;
          var tSway = Math.sin(time * tFreq + tPhaseX + tWave) * tAmp;
          var tSwayZ = Math.cos(time * tFreq * 0.85 + tPhaseZ + tWave * 0.8) * tAmp * 0.7;
          var tLag = clamp01((pulse - 0.7 * tt2) / 0.4);
          var tKick = (1 - tLag) * tAmp * 0.5;
        
          x = tBaseX + tSway + tKick;
          y = tBaseY;
          z = tBaseZ + tSwayZ;
        
          cr = 0.35 + (0.04 - 0.35) * tt2;
          cg = 0.60 + (0.10 - 0.60) * tt2;
          cb = 0.95 + (0.28 - 0.95) * tt2;
        }
        
        target.set(x, y, z);
        color.setRGB(cr, cg, cb);
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