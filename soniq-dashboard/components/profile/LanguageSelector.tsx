"use client";

import React, { useState } from "react";
import { Globe, Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

interface LanguageSelectorProps {
  value: string;
  onChange: (code: string) => void;
}

// ============================================================================
// LANGUAGE LIST
// ============================================================================

const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "US" },
  { code: "es", name: "Spanish", nativeName: "Espanol", flag: "ES" },
  { code: "fr", name: "French", nativeName: "Francais", flag: "FR" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "DE" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "IT" },
  { code: "pt", name: "Portuguese", nativeName: "Portugues", flag: "PT" },
  { code: "ja", name: "Japanese", nativeName: "Nihongo", flag: "JP" },
  { code: "ko", name: "Korean", nativeName: "Hangugeo", flag: "KR" },
  { code: "zh", name: "Chinese", nativeName: "Zhongwen", flag: "CN" },
  { code: "ar", name: "Arabic", nativeName: "Al-Arabiyah", flag: "SA" },
  { code: "hi", name: "Hindi", nativeName: "Hindi", flag: "IN" },
  { code: "ru", name: "Russian", nativeName: "Russkiy", flag: "RU" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "NL" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "PL" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "SE" },
  { code: "tr", name: "Turkish", nativeName: "Turkce", flag: "TR" },
  { code: "th", name: "Thai", nativeName: "Phasa Thai", flag: "TH" },
  { code: "vi", name: "Vietnamese", nativeName: "Tieng Viet", flag: "VN" },
];

// ============================================================================
// FLAG EMOJI HELPER
// ============================================================================

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// ============================================================================
// LANGUAGE SELECTOR COMPONENT
// ============================================================================

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedLanguage =
    LANGUAGES.find((l) => l.code === value) || LANGUAGES[0];

  const filteredLanguages = LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(search.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(search.toLowerCase()) ||
      lang.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-foreground">Language</h4>
        <p className="text-xs text-muted-foreground">
          Select your preferred language for the interface
        </p>
      </div>

      <div className="relative">
        {/* Selected Language Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left transition-colors",
            isOpen
              ? "border-primary ring-2 ring-primary/20"
              : "border-border hover:border-primary/50",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {getFlagEmoji(selectedLanguage.flag)}
            </span>
            <div>
              <div className="text-sm font-medium text-foreground">
                {selectedLanguage.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedLanguage.nativeName}
              </div>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Content */}
            <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              {/* Search */}
              <div className="border-b border-border p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search languages..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Language List */}
              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {filteredLanguages.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <Globe className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No languages found
                    </p>
                  </div>
                ) : (
                  filteredLanguages.map((lang) => {
                    const isSelected = lang.code === value;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          onChange(lang.code);
                          setIsOpen(false);
                          setSearch("");
                        }}
                        className={cn(
                          "flex w-full items-center justify-between px-4 py-3 text-left transition-colors",
                          isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {getFlagEmoji(lang.flag)}
                          </span>
                          <div>
                            <div
                              className={cn(
                                "text-sm font-medium",
                                isSelected ? "text-primary" : "text-foreground",
                              )}
                            >
                              {lang.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {lang.nativeName}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LanguageSelector;
