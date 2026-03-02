"use client";

import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "row-span-1 rounded-xl group/bento relative overflow-hidden",
        "p-4 justify-between flex flex-col space-y-4",
        "bg-white dark:bg-black/50",
        "border border-neutral-200 dark:border-white/[0.1]",
        "shadow-sm dark:shadow-none",
        "transition-all duration-300 ease-out",
        "hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/10",
        "hover:border-primary/30 dark:hover:border-primary/20",
        "hover:-translate-y-1",
        className,
      )}
    >
      {/* Gradient glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover/bento:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="absolute -inset-px bg-gradient-to-r from-transparent via-primary/10 to-transparent blur-sm" />
      </div>
      <div className="relative z-10">{header}</div>
      <div className="relative z-10 group-hover/bento:translate-x-2 transition duration-200">
        {icon}
        <div className="font-sans font-bold text-neutral-700 dark:text-neutral-200 mb-2 mt-2">
          {title}
        </div>
        <div className="font-sans font-normal text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed">
          {description}
        </div>
      </div>
    </div>
  );
};
