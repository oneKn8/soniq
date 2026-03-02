import { Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
        <Zap className="h-5 w-5 text-primary-foreground" />
      </div>
      {showText && <span className="text-xl font-bold">Soniq</span>}
    </Link>
  );
}
