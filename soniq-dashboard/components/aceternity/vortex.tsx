"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React, { useEffect, useRef, useCallback } from "react";
import { createNoise3D } from "simplex-noise";

interface VortexProps {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  particleCount?: number;
  rangeY?: number;
  baseHue?: number;
  baseSpeed?: number;
  rangeSpeed?: number;
  baseRadius?: number;
  rangeRadius?: number;
  backgroundColor?: string;
}

export const Vortex = (props: VortexProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particleCount = props.particleCount || 700;
  const particlePropCount = 9;
  const particlePropsLength = particleCount * particlePropCount;
  const rangeY = props.rangeY || 100;
  const baseTTL = 50;
  const rangeTTL = 150;
  const baseSpeed = props.baseSpeed || 0.0;
  const rangeSpeed = props.rangeSpeed || 1.5;
  const baseRadius = props.baseRadius || 1;
  const rangeRadius = props.rangeRadius || 2;
  const baseHue = props.baseHue || 220;
  const rangeHue = 100;
  const noiseSteps = 3;
  const xOff = 0.00125;
  const yOff = 0.00125;
  const zOff = 0.0005;
  const backgroundColor = props.backgroundColor || "#000000";

  const tickRef = useRef(0);
  const particlePropsRef = useRef<Float32Array | null>(null);
  const centerRef = useRef<[number, number]>([0, 0]);
  const noise3DRef = useRef<ReturnType<typeof createNoise3D> | null>(null);

  const HALF_PI = 0.5 * Math.PI;
  const TAU = 2 * Math.PI;

  const rand = (n: number) => n * Math.random();
  const randRange = (n: number) => n - rand(2 * n);
  const fadeInOut = (t: number, m: number) => {
    const hm = 0.5 * m;
    return Math.abs(((t + hm) % m) - hm) / hm;
  };
  const lerp = (n1: number, n2: number, speed: number) =>
    (1 - speed) * n1 + speed * n2;

  const initParticle = useCallback(
    (i: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !particlePropsRef.current) return;

      const x = rand(canvas.width);
      const y = centerRef.current[1] + randRange(rangeY);
      const vx = 0;
      const vy = 0;
      const life = 0;
      const ttl = baseTTL + rand(rangeTTL);
      const speed = baseSpeed + rand(rangeSpeed);
      const radius = baseRadius + rand(rangeRadius);
      const hue = baseHue + rand(rangeHue);

      particlePropsRef.current.set(
        [x, y, vx, vy, life, ttl, speed, radius, hue],
        i,
      );
    },
    [
      rangeY,
      baseTTL,
      rangeTTL,
      baseSpeed,
      rangeSpeed,
      baseRadius,
      rangeRadius,
      baseHue,
      rangeHue,
    ],
  );

  const initParticles = useCallback(() => {
    tickRef.current = 0;
    particlePropsRef.current = new Float32Array(particlePropsLength);

    for (let i = 0; i < particlePropsLength; i += particlePropCount) {
      initParticle(i);
    }
  }, [particlePropsLength, particlePropCount, initParticle]);

  const drawParticle = useCallback(
    (
      x: number,
      y: number,
      x2: number,
      y2: number,
      life: number,
      ttl: number,
      radius: number,
      hue: number,
      ctx: CanvasRenderingContext2D,
    ) => {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = radius;
      ctx.strokeStyle = `hsla(${hue},100%,60%,${fadeInOut(life, ttl)})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    },
    [],
  );

  const updateParticle = useCallback(
    (i: number, ctx: CanvasRenderingContext2D) => {
      const canvas = canvasRef.current;
      if (!canvas || !particlePropsRef.current || !noise3DRef.current) return;

      const i2 = 1 + i;
      const i3 = 2 + i;
      const i4 = 3 + i;
      const i5 = 4 + i;
      const i6 = 5 + i;
      const i7 = 6 + i;
      const i8 = 7 + i;
      const i9 = 8 + i;

      const x = particlePropsRef.current[i];
      const y = particlePropsRef.current[i2];
      const n =
        noise3DRef.current(x * xOff, y * yOff, tickRef.current * zOff) *
        noiseSteps *
        TAU;
      const vx = lerp(particlePropsRef.current[i3], Math.cos(n), 0.5);
      const vy = lerp(particlePropsRef.current[i4], Math.sin(n), 0.5);
      let life = particlePropsRef.current[i5];
      const ttl = particlePropsRef.current[i6];
      const speed = particlePropsRef.current[i7];
      const x2 = x + vx * speed;
      const y2 = y + vy * speed;
      const radius = particlePropsRef.current[i8];
      const hue = particlePropsRef.current[i9];

      drawParticle(x, y, x2, y2, life, ttl, radius, hue, ctx);

      life++;

      particlePropsRef.current[i] = x2;
      particlePropsRef.current[i2] = y2;
      particlePropsRef.current[i3] = vx;
      particlePropsRef.current[i4] = vy;
      particlePropsRef.current[i5] = life;

      if (life > ttl) {
        initParticle(i);
      }

      // Check bounds
      if (x2 < 0 || x2 > canvas.width || y2 < 0 || y2 > canvas.height) {
        initParticle(i);
      }
    },
    [TAU, xOff, yOff, zOff, noiseSteps, drawParticle, initParticle],
  );

  const drawParticles = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!particlePropsRef.current) return;

      for (let i = 0; i < particlePropsLength; i += particlePropCount) {
        updateParticle(i, ctx);
      }
    },
    [particlePropsLength, particlePropCount, updateParticle],
  );

  const renderGlow = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.filter = "blur(8px) brightness(200%)";
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();

      ctx.save();
      ctx.filter = "blur(4px) brightness(200%)";
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
    [],
  );

  const renderToScreen = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
    [],
  );

  const draw = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      tickRef.current++;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawParticles(ctx);
      renderGlow(canvas, ctx);
      renderToScreen(canvas, ctx);
    },
    [backgroundColor, drawParticles, renderGlow, renderToScreen],
  );

  const resize = useCallback((canvas: HTMLCanvasElement) => {
    const { innerWidth, innerHeight } = window;

    canvas.width = innerWidth;
    canvas.height = innerHeight;

    centerRef.current = [0.5 * canvas.width, 0.5 * canvas.height];
  }, []);

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    resize(canvas);
    initParticles();
    draw(canvas, ctx);
  }, [resize, initParticles, draw]);

  useEffect(() => {
    noise3DRef.current = createNoise3D();

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initial setup
    resize(canvas);
    initParticles();

    let animationFrameId: number;

    const animate = () => {
      draw(canvas, ctx);
      animationFrameId = window.requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      resize(canvas);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [resize, initParticles, draw]);

  return (
    <div className={cn("relative h-full w-full", props.containerClassName)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        ref={containerRef}
        className="absolute inset-0 z-0 flex h-full w-full items-center justify-center bg-transparent"
      >
        <canvas ref={canvasRef} />
      </motion.div>

      <div className={cn("relative z-10", props.className)}>
        {props.children}
      </div>
    </div>
  );
};
