"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

interface CompareProps {
  firstImage?: string;
  secondImage?: string;
  className?: string;
  firstImageClassName?: string;
  secondImageClassname?: string;
  initialSliderPercentage?: number;
  slideMode?: "hover" | "drag";
  showHandlebar?: boolean;
  autoplay?: boolean;
  autoplayDuration?: number;
}

export const Compare = ({
  firstImage = "",
  secondImage = "",
  className,
  firstImageClassName,
  secondImageClassname,
  initialSliderPercentage = 50,
  slideMode = "hover",
  showHandlebar = true,
  autoplay = false,
  autoplayDuration = 5000,
}: CompareProps) => {
  const [sliderXPercent, setSliderXPercent] = useState(initialSliderPercentage);
  const [isDragging, setIsDragging] = useState(false);

  const sliderRef = useRef<HTMLDivElement>(null);

  const [isMouseOver, setIsMouseOver] = useState(false);

  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoplay = useCallback(() => {
    if (!autoplay) return;

    const startTime = Date.now();
    const animate = () => {
      const elapsedTime = Date.now() - startTime;
      const progress =
        (Math.sin((elapsedTime / autoplayDuration) * Math.PI * 2) + 1) / 2;
      setSliderXPercent(progress * 100);
    };

    autoplayRef.current = setInterval(animate, 16);
  }, [autoplay, autoplayDuration]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

  function mouseEnterHandler() {
    setIsMouseOver(true);
    stopAutoplay();
  }

  function mouseLeaveHandler() {
    setIsMouseOver(false);
    if (slideMode === "hover") {
      setSliderXPercent(initialSliderPercentage);
    }
    if (slideMode === "drag") {
      setIsDragging(false);
    }
    startAutoplay();
  }

  const handleStart = useCallback(
    (clientX: number) => {
      if (slideMode === "drag") {
        setIsDragging(true);
      }
    },
    [slideMode],
  );

  const handleEnd = useCallback(() => {
    if (slideMode === "drag") {
      setIsDragging(false);
    }
  }, [slideMode]);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;
      if (slideMode === "hover" || (slideMode === "drag" && isDragging)) {
        const rect = sliderRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percent = (x / rect.width) * 100;
        requestAnimationFrame(() => {
          setSliderXPercent(Math.max(0, Math.min(100, percent)));
        });
      }
    },
    [slideMode, isDragging],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => handleStart(e.clientX),
    [handleStart],
  );

  const handleMouseUp = useCallback(() => handleEnd(), [handleEnd]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => handleMove(e.clientX),
    [handleMove],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!autoplay) {
        handleStart(e.touches[0].clientX);
      }
    },
    [handleStart, autoplay],
  );

  const handleTouchEnd = useCallback(() => {
    if (!autoplay) {
      handleEnd();
    }
  }, [handleEnd, autoplay]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!autoplay) {
        handleMove(e.touches[0].clientX);
      }
    },
    [handleMove, autoplay],
  );

  return (
    <div
      ref={sliderRef}
      className={cn("h-[400px] w-[400px] overflow-hidden", className)}
      style={{
        position: "relative",
        cursor: slideMode === "drag" ? "grab" : "col-resize",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={mouseLeaveHandler}
      onMouseEnter={mouseEnterHandler}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <AnimatePresence initial={false}>
        <motion.div
          className="absolute inset-0 z-20 m-auto h-full w-px bg-gradient-to-b from-transparent from-[5%] via-indigo-500 to-transparent to-[95%]"
          style={{
            left: `${sliderXPercent}%`,
            top: "0",
            zIndex: 40,
          }}
          transition={{ duration: 0 }}
        >
          {showHandlebar && (
            <div className="absolute left-1/2 top-1/2 z-30 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border border-slate-500 bg-white shadow-[0px_-1px_0px_0px_#FFFFFF40]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-slate-500"
              >
                <path
                  fillRule="evenodd"
                  d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 -translate-x-1 text-slate-500"
              >
                <path
                  fillRule="evenodd"
                  d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none relative z-20 h-full w-full overflow-hidden">
        <AnimatePresence initial={false}>
          {firstImage ? (
            <motion.div
              className={cn(
                "absolute inset-0 z-20 h-full w-full shrink-0 select-none overflow-hidden rounded-2xl",
                firstImageClassName,
              )}
              style={{
                clipPath: `inset(0 ${100 - sliderXPercent}% 0 0)`,
              }}
              transition={{ duration: 0 }}
            >
              <Image
                alt="first image"
                src={firstImage}
                fill
                className={cn(
                  "absolute inset-0 z-20 h-full w-full shrink-0 select-none rounded-2xl object-cover",
                  firstImageClassName,
                )}
                draggable={false}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {secondImage ? (
          <motion.div
            className={cn(
              "absolute left-0 top-0 z-[19] h-full w-full select-none",
              secondImageClassname,
            )}
          >
            <Image
              alt="second image"
              src={secondImage}
              fill
              className={cn(
                "absolute left-0 top-0 z-[19] h-full w-full shrink-0 select-none rounded-2xl object-cover",
                secondImageClassname,
              )}
              draggable={false}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

// Alternative Compare component without next/image for standard React
export const CompareStandard = ({
  firstImage = "",
  secondImage = "",
  className,
  firstImageClassName,
  secondImageClassname,
  initialSliderPercentage = 50,
  slideMode = "hover",
  showHandlebar = true,
  autoplay = false,
  autoplayDuration = 5000,
}: CompareProps) => {
  const [sliderXPercent, setSliderXPercent] = useState(initialSliderPercentage);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoplay = useCallback(() => {
    if (!autoplay) return;
    const startTime = Date.now();
    const animate = () => {
      const elapsedTime = Date.now() - startTime;
      const progress =
        (Math.sin((elapsedTime / autoplayDuration) * Math.PI * 2) + 1) / 2;
      setSliderXPercent(progress * 100);
    };
    autoplayRef.current = setInterval(animate, 16);
  }, [autoplay, autoplayDuration]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

  const handleMouseLeave = () => {
    if (slideMode === "hover") {
      setSliderXPercent(initialSliderPercentage);
    }
    setIsDragging(false);
    startAutoplay();
  };

  const handleMove = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;
      if (slideMode === "hover" || (slideMode === "drag" && isDragging)) {
        const rect = sliderRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percent = (x / rect.width) * 100;
        setSliderXPercent(Math.max(0, Math.min(100, percent)));
      }
    },
    [slideMode, isDragging],
  );

  return (
    <div
      ref={sliderRef}
      className={cn(
        "relative h-[400px] w-[400px] overflow-hidden rounded-2xl",
        className,
      )}
      style={{ cursor: slideMode === "drag" ? "grab" : "col-resize" }}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={stopAutoplay}
      onMouseDown={() => slideMode === "drag" && setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
    >
      {/* Slider line */}
      <motion.div
        className="absolute inset-0 z-40 m-auto h-full w-px bg-gradient-to-b from-transparent from-[5%] via-indigo-500 to-transparent to-[95%]"
        style={{ left: `${sliderXPercent}%` }}
      >
        {showHandlebar && (
          <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border border-slate-500 bg-white">
            <span className="text-slate-500">||</span>
          </div>
        )}
      </motion.div>

      {/* First image (clipped) */}
      {firstImage && (
        <div
          className={cn("absolute inset-0 z-20", firstImageClassName)}
          style={{ clipPath: `inset(0 ${100 - sliderXPercent}% 0 0)` }}
        >
          <img
            src={firstImage}
            alt="before"
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      )}

      {/* Second image (background) */}
      {secondImage && (
        <div className={cn("absolute inset-0 z-10", secondImageClassname)}>
          <img
            src={secondImage}
            alt="after"
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
};
