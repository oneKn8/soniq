"use client";

import React, { useState } from "react";
import { useConfig } from "@/context/ConfigContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CreditCard,
  Check,
  Download,
  Calendar,
  Zap,
  Shield,
  Receipt,
  Mail,
  RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriptionTier } from "@/types";

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

const TIER_FEATURES: Record<
  SubscriptionTier,
  { name: string; price: number; features: string[]; highlight?: boolean }
> = {
  starter: {
    name: "Starter",
    price: 99,
    features: [
      "Up to 500 calls/month",
      "Basic AI responses",
      "Email support",
      "Standard voice options",
    ],
  },
  professional: {
    name: "Professional",
    price: 299,
    highlight: true,
    features: [
      "Up to 2,500 calls/month",
      "Advanced AI with sentiment analysis",
      "Priority support",
      "Premium voice options",
      "Custom greetings",
      "SMS confirmations",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 999,
    features: [
      "Unlimited calls",
      "Full AI capabilities",
      "Dedicated support",
      "All voice options",
      "Custom integrations",
      "Multi-location support",
      "SLA guarantee",
    ],
  },
};

// ============================================================================
// MOCK DATA FOR DEMO (static to avoid Date.now() during render)
// ============================================================================

const MOCK_SUBSCRIPTION = {
  id: "sub_demo",
  tier: "professional" as SubscriptionTier,
  status: "active" as const,
  currentPeriodStart: "2026-01-01T00:00:00.000Z",
  currentPeriodEnd: "2026-02-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
};

const MOCK_BILLING = {
  customerId: "cus_demo",
  billingEmail: "billing@example.com",
  autoPayEnabled: true,
  paymentMethodBrand: "visa",
  paymentMethodLast4: "4242",
  invoices: [
    {
      id: "inv_001",
      amount: 299,
      currency: "USD",
      status: "paid" as const,
      createdAt: "2025-12-27T00:00:00.000Z",
      paidAt: "2025-12-28T00:00:00.000Z",
    },
    {
      id: "inv_002",
      amount: 299,
      currency: "USD",
      status: "paid" as const,
      createdAt: "2025-11-27T00:00:00.000Z",
      paidAt: "2025-11-28T00:00:00.000Z",
    },
  ],
};

// ============================================================================
// BILLING TAB COMPONENT
// ============================================================================

export default function BillingTab() {
  const { config, updateConfig } = useConfig();
  const [isAddingCard, setIsAddingCard] = useState(false);

  if (!config) return null;

  const { subscription, billing } = config;

  // Use actual data or fall back to mock data
  const currentSubscription = subscription || MOCK_SUBSCRIPTION;
  const currentBilling = billing || MOCK_BILLING;

  const tierInfo = TIER_FEATURES[currentSubscription.tier];

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Billing & Subscription
        </h3>
        <p className="text-sm text-muted-foreground">
          Manage your payment methods and view invoices
        </p>
      </div>

      {/* Current Plan */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Zap className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">Current Plan</h4>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-foreground">
                    {tierInfo.name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                      currentSubscription.status === "active"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : currentSubscription.status === "trialing"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-red-500/10 text-red-600 dark:text-red-400",
                    )}
                  >
                    {currentSubscription.status}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">
                    ${tierInfo.price}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                Next billing date
              </div>
              <div className="text-sm font-medium text-foreground">
                {new Date(
                  currentSubscription.currentPeriodEnd,
                ).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {tierInfo.features.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Check className="h-4 w-4 text-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Contact support to change your plan
          </p>
          <Button variant="outline" size="sm">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Change Plan
          </Button>
        </div>
      </section>

      {/* Payment Method */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <CreditCard className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">
            Payment Method
          </h4>
        </div>

        {currentBilling.paymentMethodLast4 ? (
          <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium text-foreground">
                  {currentBilling.paymentMethodBrand || "Card"} ending in{" "}
                  {currentBilling.paymentMethodLast4}
                </div>
                <div className="text-sm text-muted-foreground">
                  Default payment method
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Update
            </Button>
          </div>
        ) : isAddingCard ? (
          <AddPaymentMethodForm onCancel={() => setIsAddingCard(false)} />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="mb-4 text-sm text-muted-foreground">
              No payment method on file
            </p>
            <Button onClick={() => setIsAddingCard(true)}>
              Add Payment Method
            </Button>
          </div>
        )}
      </section>

      {/* Auto-Pay */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <div>
              <h4 className="text-sm font-medium text-foreground">Auto-Pay</h4>
              <p className="text-xs text-muted-foreground">
                Automatically charge each billing cycle
              </p>
            </div>
          </div>
          <Switch
            checked={currentBilling.autoPayEnabled}
            onCheckedChange={(checked) => {
              if (config.billing) {
                updateConfig("billing", {
                  ...config.billing,
                  autoPayEnabled: checked,
                });
              }
            }}
          />
        </div>

        {currentBilling.autoPayEnabled && (
          <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-600 dark:text-green-400">
              Auto-pay is enabled. Your payment will be processed automatically.
            </span>
          </div>
        )}
      </section>

      {/* Billing Email */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Mail className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">Billing Email</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Invoices and receipts will be sent to this email
        </p>

        <div className="flex gap-3">
          <Input
            value={currentBilling.billingEmail}
            onChange={(e) => {
              if (config.billing) {
                updateConfig("billing", {
                  ...config.billing,
                  billingEmail: e.target.value,
                });
              }
            }}
            type="email"
            placeholder="billing@company.com"
            className="max-w-sm"
          />
          <Button variant="outline">Update</Button>
        </div>
      </section>

      {/* Invoice History */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Receipt className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">
            Invoice History
          </h4>
        </div>

        <div className="space-y-3">
          {currentBilling.invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    ${invoice.amount.toFixed(2)} {invoice.currency}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-medium uppercase",
                    invoice.status === "paid"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : invoice.status === "open"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400",
                  )}
                >
                  {invoice.status}
                </span>
                <Button variant="ghost" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {currentBilling.invoices.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <Receipt className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No invoices yet</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// ADD PAYMENT METHOD FORM
// ============================================================================

function AddPaymentMethodForm({ onCancel }: { onCancel: () => void }) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    return parts.length ? parts.join(" ") : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-background p-6">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Add Card</span>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Card Number</Label>
          <Input
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            className="font-mono"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Expiry</Label>
            <Input
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              maxLength={5}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">CVC</Label>
            <Input
              value={cvc}
              onChange={(e) =>
                setCvc(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))
              }
              placeholder="123"
              maxLength={4}
              type="password"
              className="font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Your payment info is encrypted and secure</span>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button>Save Card</Button>
        </div>
      </div>
    </div>
  );
}
