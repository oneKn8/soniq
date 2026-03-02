"use client";

import { useEffect, useRef } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
}) => {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(" ");
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    animate(
      "span",
      {
        opacity: 1,
        filter: filter ? "blur(0px)" : "none",
      },
      {
        duration: duration,
        delay: stagger(0.1),
      },
    );
  }, [animate, duration, filter]);

  return (
    <div className={cn("font-bold", className)}>
      <div className="mt-4">
        <div className="leading-snug tracking-wide">
          <motion.div ref={scope}>
            {wordsArray.map((word, idx) => {
              return (
                <motion.span
                  key={word + idx}
                  className={cn("opacity-0", filter && "blur-sm")}
                  style={{
                    filter: filter ? "blur(10px)" : "none",
                  }}
                >
                  {word}{" "}
                </motion.span>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
