import Link from "next/link";
import { SoniqMark } from "@/components/brand/SoniqMark";
import { SoniqWordmark } from "@/components/brand/SoniqWordmark";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="Soniq home"
      className={cn("flex items-center gap-2.5", className)}
    >
      <SoniqMark className="h-9 w-9 shrink-0" decorative />
      {showText ? (
        <SoniqWordmark className="h-5 w-auto text-current" decorative />
      ) : null}
    </Link>
  );
}
