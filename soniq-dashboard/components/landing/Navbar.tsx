"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Moon, Sun } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "Testimonials", href: "#testimonials" },
  { name: "FAQ", href: "#faq" },
  { name: "Docs", href: "/docs" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // When not scrolled, we're over the dark hero - use white text
  // When scrolled, use theme-aware colors with backdrop
  const textColor = isScrolled ? "text-foreground" : "text-white";
  const textColorMuted = isScrolled ? "text-foreground/80" : "text-white/80";

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-background/80 backdrop-blur-lg border-b border-border/40 shadow-sm"
            : "bg-transparent",
        )}
      >
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Logo className={isScrolled ? "" : "[&_span]:text-white"} />

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    textColorMuted,
                    isScrolled ? "hover:text-foreground" : "hover:text-white",
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  textColor,
                  isScrolled ? "hover:bg-accent" : "hover:bg-white/10",
                )}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              <div className="hidden md:flex md:items-center md:gap-3">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      isScrolled
                        ? "text-foreground hover:text-foreground hover:bg-accent"
                        : "text-white hover:text-white hover:bg-white/10",
                    )}
                  >
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="shadow-sm">
                    Get Started
                  </Button>
                </Link>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={cn(
                  "md:hidden p-2 rounded-lg transition-colors",
                  textColor,
                  isScrolled ? "hover:bg-accent" : "hover:bg-white/10",
                )}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-16 z-40 md:hidden bg-background/95 backdrop-blur-lg border-b border-border"
          >
            <div className="px-4 py-6 space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 space-y-3">
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup" className="block">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
