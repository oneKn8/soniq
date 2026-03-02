"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import * as THREE from "three";

interface NeuralConstellationProps {
  className?: string;
}

export function NeuralConstellation({ className }: NeuralConstellationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    // Strong fog for depth
    scene.fog = new THREE.FogExp2(0x020617, 0.035);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
    camera.position.set(0, 15, 40);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Create waveform grid
    const gridSizeX = 30;
    const gridSizeZ = 20;
    const spacing = 3;

    // Bars geometry - instanced for performance
    const barGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 8);
    barGeometry.translate(0, 0.5, 0); // Pivot at bottom

    const barCount = gridSizeX * gridSizeZ;
    const bars = new THREE.InstancedMesh(
      barGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x6366f1,
        transparent: true,
        opacity: 0.8,
      }),
      barCount,
    );

    // Glowing top caps for bars
    const capGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const caps = new THREE.InstancedMesh(
      capGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.9,
      }),
      barCount,
    );

    const dummy = new THREE.Object3D();
    const barData: { x: number; z: number; baseFreq: number; phase: number }[] =
      [];

    let idx = 0;
    for (let x = 0; x < gridSizeX; x++) {
      for (let z = 0; z < gridSizeZ; z++) {
        const posX = (x - gridSizeX / 2) * spacing;
        const posZ = (z - gridSizeZ / 2) * spacing - 10;

        dummy.position.set(posX, 0, posZ);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();

        bars.setMatrixAt(idx, dummy.matrix);
        caps.setMatrixAt(idx, dummy.matrix);

        // Each bar has different wave properties
        barData.push({
          x: posX,
          z: posZ,
          baseFreq: 0.5 + Math.random() * 1.5,
          phase: Math.random() * Math.PI * 2,
        });

        // Color based on depth (z position)
        const depthFactor = (posZ + 40) / 60;
        const color = new THREE.Color().lerpColors(
          new THREE.Color(0x1e3a5f), // Dark blue in back
          new THREE.Color(0x06b6d4), // Cyan in front
          depthFactor,
        );
        bars.setColorAt(idx, color);
        caps.setColorAt(idx, new THREE.Color(0xa78bfa));

        idx++;
      }
    }

    scene.add(bars);
    scene.add(caps);

    // Add horizontal connection lines between bar tops
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });

    // Create grid lines along X direction
    const lineGeometryX = new THREE.BufferGeometry();
    const linePositionsX: number[] = [];

    for (let z = 0; z < gridSizeZ; z++) {
      for (let x = 0; x < gridSizeX - 1; x++) {
        const i = x * gridSizeZ + z;
        const j = (x + 1) * gridSizeZ + z;

        linePositionsX.push(
          barData[i].x,
          0,
          barData[i].z,
          barData[j].x,
          0,
          barData[j].z,
        );
      }
    }

    lineGeometryX.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositionsX, 3),
    );
    const linesX = new THREE.LineSegments(lineGeometryX, lineMaterial);
    scene.add(linesX);

    // Create grid lines along Z direction
    const lineGeometryZ = new THREE.BufferGeometry();
    const linePositionsZ: number[] = [];

    for (let x = 0; x < gridSizeX; x++) {
      for (let z = 0; z < gridSizeZ - 1; z++) {
        const i = x * gridSizeZ + z;
        const j = x * gridSizeZ + (z + 1);

        linePositionsZ.push(
          barData[i].x,
          0,
          barData[i].z,
          barData[j].x,
          0,
          barData[j].z,
        );
      }
    }

    lineGeometryZ.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositionsZ, 3),
    );
    const linesZ = new THREE.LineSegments(lineGeometryZ, lineMaterial);
    scene.add(linesZ);

    // Floating particles in the air
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos: number[] = [];
    const particleSizes: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePos.push(
        (Math.random() - 0.5) * 100,
        Math.random() * 30,
        (Math.random() - 0.5) * 80,
      );
      particleSizes.push(Math.random() * 0.5 + 0.1);
    }

    particleGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(particlePos, 3),
    );
    particleGeo.setAttribute(
      "size",
      new THREE.Float32BufferAttribute(particleSizes, 1),
    );

    const particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x6366f1) },
      },
      vertexShader: `
        attribute float size;
        uniform float uTime;
        
        void main() {
          vec3 pos = position;
          pos.y += sin(uTime + position.x * 0.1) * 0.5;
          pos.x += cos(uTime * 0.5 + position.z * 0.1) * 0.3;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(uColor, alpha * 0.6);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Animation
    let time = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      time += 0.02;

      particleMat.uniforms.uTime.value = time;

      // Animate bars
      let idx = 0;
      for (let x = 0; x < gridSizeX; x++) {
        for (let z = 0; z < gridSizeZ; z++) {
          const data = barData[idx];

          // Wave height calculation
          const wave1 = Math.sin(time * data.baseFreq + data.phase) * 3;
          const wave2 = Math.sin(time * 0.7 + data.x * 0.2) * 2;
          const wave3 = Math.cos(time * 0.5 + data.z * 0.15) * 1.5;
          const height = Math.max(0.5, 2 + wave1 + wave2 + wave3);

          // Update bar
          dummy.position.set(data.x, -5, data.z);
          dummy.scale.set(1, height, 1);
          dummy.updateMatrix();
          bars.setMatrixAt(idx, dummy.matrix);

          // Update cap at top of bar
          dummy.position.set(data.x, -5 + height, data.z);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          caps.setMatrixAt(idx, dummy.matrix);

          idx++;
        }
      }

      bars.instanceMatrix.needsUpdate = true;
      caps.instanceMatrix.needsUpdate = true;

      // Gentle camera movement
      camera.position.x = Math.sin(time * 0.1) * 5;
      camera.position.z = 40 + Math.cos(time * 0.15) * 5;
      camera.lookAt(0, 2, 0);

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("absolute inset-0", className)}>
      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 10%, rgba(2, 6, 23, 0.5) 60%, rgba(2, 6, 23, 0.95) 100%)
          `,
        }}
      />
      {/* Top fade for navbar */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950/90 to-transparent pointer-events-none z-10" />
      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/90 to-transparent pointer-events-none z-10" />
    </div>
  );
}
