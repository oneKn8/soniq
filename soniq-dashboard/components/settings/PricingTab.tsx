"use client";

import React from "react";
import { useConfig } from "@/context/ConfigContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Percent, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// CURRENCIES
// ============================================================================

const CURRENCIES = [
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "EUR", label: "EUR", symbol: "" },
  { value: "GBP", label: "GBP", symbol: "" },
  { value: "CAD", label: "CAD ($)", symbol: "$" },
];

// ============================================================================
// PRICING TAB COMPONENT
// ============================================================================

export default function PricingTab() {
  const { config, updateConfig, getTerminology } = useConfig();

  if (!config) return null;

  const { pricing } = config;
  const terminology = getTerminology(config.industry);

  const updatePricing = (updates: Partial<typeof pricing>) => {
    updateConfig("pricing", { ...pricing, ...updates });
  };

  const addFee = () => {
    updatePricing({
      fees: [
        ...pricing.fees,
        { id: crypto.randomUUID(), label: "New Fee", amount: 0, type: "fixed" },
      ],
    });
  };

  const updateFee = (
    id: string,
    updates: Partial<(typeof pricing.fees)[0]>,
  ) => {
    updatePricing({
      fees: pricing.fees.map((fee) =>
        fee.id === id ? { ...fee, ...updates } : fee,
      ),
    });
  };

  const removeFee = (id: string) => {
    updatePricing({
      fees: pricing.fees.filter((fee) => fee.id !== id),
    });
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white">
          Pricing Configuration
        </h3>
        <p className="text-sm text-zinc-500">
          Set your rates and fees for{" "}
          {terminology.transactionPlural.toLowerCase()}
        </p>
      </div>

      {/* Base Rate */}
      <section className="space-y-4">
        <div className="border-b border-zinc-800 pb-2">
          <h4 className="text-sm font-medium text-white">Base Rate</h4>
          <p className="text-xs text-zinc-600">
            Standard price per {terminology.transaction.toLowerCase()}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-zinc-400">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                type="number"
                value={pricing.baseRate}
                onChange={(e) =>
                  updatePricing({ baseRate: parseFloat(e.target.value) || 0 })
                }
                className="border-zinc-800 bg-zinc-950 pl-9 font-mono text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400">Currency</Label>
            <select
              value={pricing.currency}
              onChange={(e) => updatePricing({ currency: e.target.value })}
              className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Tax Rate */}
      <section className="space-y-4">
        <div className="border-b border-zinc-800 pb-2">
          <h4 className="text-sm font-medium text-white">Tax Rate</h4>
        </div>

        <div className="max-w-xs space-y-2">
          <Label className="text-zinc-400">Percentage</Label>
          <div className="relative">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={(pricing.taxRate * 100).toFixed(1)}
              onChange={(e) =>
                updatePricing({
                  taxRate: (parseFloat(e.target.value) || 0) / 100,
                })
              }
              className="border-zinc-800 bg-zinc-950 pr-9 font-mono text-white"
            />
            <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          </div>
        </div>
      </section>

      {/* Additional Fees */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div>
            <h4 className="text-sm font-medium text-white">Additional Fees</h4>
            <p className="text-xs text-zinc-600">
              Optional charges for specific services
            </p>
          </div>
          <button
            onClick={addFee}
            className="flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-white"
          >
            <Plus className="h-3 w-3" />
            Add Fee
          </button>
        </div>

        <div className="space-y-3">
          {pricing.fees.map((fee) => (
            <div
              key={fee.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3"
            >
              <div className="flex-1 space-y-2">
                <Input
                  value={fee.label}
                  onChange={(e) => updateFee(fee.id, { label: e.target.value })}
                  placeholder="Fee name"
                  className="h-8 border-zinc-700 bg-zinc-800 text-sm text-white"
                />
              </div>

              <div className="w-24">
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
                  <Input
                    type="number"
                    value={fee.amount}
                    onChange={(e) =>
                      updateFee(fee.id, {
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 border-zinc-700 bg-zinc-800 pl-7 font-mono text-sm text-white"
                  />
                </div>
              </div>

              <select
                value={fee.type}
                onChange={(e) =>
                  updateFee(fee.id, {
                    type: e.target.value as "fixed" | "percentage",
                  })
                }
                className="h-8 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-xs text-white focus:outline-none"
              >
                <option value="fixed">Fixed</option>
                <option value="percentage">%</option>
              </select>

              <button
                onClick={() => removeFee(fee.id)}
                className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {pricing.fees.length === 0 && (
            <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center">
              <p className="text-sm text-zinc-500">
                No additional fees configured
              </p>
            </div>
          )}
        </div>
      </section>

      {/* SOW Reference */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          SOW Reference
        </div>
        <div className="mt-2 space-y-1 font-mono text-xs text-zinc-400">
          <div>Hotel King Room: $139/night</div>
          <div>Pet Fee: $25/night</div>
          <div>Cleaning Base: $120 | Deep: $180</div>
        </div>
      </div>
    </div>
  );
}
