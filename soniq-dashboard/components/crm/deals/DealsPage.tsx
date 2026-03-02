"use client";

import * as React from "react";
import { Plus, Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/crm/shared/EmptyState";
import { DealCard } from "./DealCard";
import { DealForm } from "./DealForm";
import { getPipeline, updateDealStage } from "@/lib/api/deals";
import type { Deal, DealStage, PipelineStage } from "@/lib/api/deals";
import { useIndustry } from "@/context/IndustryContext";
import { cn } from "@/lib/utils";

// ============================================================================
// FALLBACK STAGE CONFIG (used when no industry pipeline configured)
// ============================================================================

const FALLBACK_COLOR = {
  color: "text-zinc-400",
  bgColor: "bg-zinc-500/10",
  borderColor: "border-zinc-500/30",
};

// ============================================================================
// HELPERS
// ============================================================================

function formatTotalAmount(cents: number): string {
  if (cents === 0) return "$0";
  if (cents >= 100000) {
    return `$${(cents / 100000).toFixed(cents % 100000 === 0 ? 0 : 1)}K`;
  }
  return `$${(cents / 100).toLocaleString()}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DealsPage() {
  const {
    customerLabel,
    revenueLabel,
    dealLabel,
    dealPluralLabel,
    pipelineStages,
  } = useIndustry();

  // Derive stage order and config from industry context
  const STAGE_ORDER = React.useMemo(
    () => pipelineStages.map((s) => s.id),
    [pipelineStages],
  );
  const STAGE_CONFIG = React.useMemo(() => {
    const map: Record<
      string,
      { label: string; color: string; bgColor: string; borderColor: string }
    > = {};
    for (const s of pipelineStages) {
      map[s.id] = {
        label: s.label,
        color: s.color,
        bgColor: s.bgColor,
        borderColor: s.borderColor,
      };
    }
    return map;
  }, [pipelineStages]);

  const [pipeline, setPipeline] = React.useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [dragOverStage, setDragOverStage] = React.useState<DealStage | null>(
    null,
  );

  // Load pipeline data
  const loadPipeline = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPipeline();
      setPipeline(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPipeline();
  }, [loadPipeline]);

  // Build a map for quick access to stage data
  const stageMap = React.useMemo(() => {
    const map: Record<DealStage, PipelineStage> = {} as Record<
      DealStage,
      PipelineStage
    >;
    for (const stage of STAGE_ORDER) {
      const existing = pipeline.find((p) => p.stage === stage);
      map[stage] = existing || {
        stage,
        count: 0,
        total_amount_cents: 0,
        deals: [],
      };
    }
    return map;
  }, [pipeline, STAGE_ORDER]);

  // Total pipeline value (exclude terminal stages)
  const terminalStages = React.useMemo(
    () => new Set(pipelineStages.filter((s) => s.isTerminal).map((s) => s.id)),
    [pipelineStages],
  );
  const totalPipelineValue = React.useMemo(() => {
    return STAGE_ORDER.filter((s) => !terminalStages.has(s)).reduce(
      (sum, stage) => sum + (stageMap[stage]?.total_amount_cents || 0),
      0,
    );
  }, [stageMap, STAGE_ORDER, terminalStages]);

  // Total deal count
  const totalDeals = React.useMemo(() => {
    return STAGE_ORDER.reduce(
      (sum, stage) => sum + (stageMap[stage]?.count || 0),
      0,
    );
  }, [stageMap, STAGE_ORDER]);

  // Drag and drop handlers
  const handleDragStart = React.useCallback(
    (e: React.DragEvent, deal: Deal) => {
      e.dataTransfer.setData("dealId", deal.id);
      e.dataTransfer.setData("sourceStage", deal.stage);
      e.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const handleDragOver = React.useCallback(
    (e: React.DragEvent, stage: DealStage) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverStage(stage);
    },
    [],
  );

  const handleDragLeave = React.useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = React.useCallback(
    async (e: React.DragEvent, targetStage: DealStage) => {
      e.preventDefault();
      setDragOverStage(null);

      const dealId = e.dataTransfer.getData("dealId");
      const sourceStage = e.dataTransfer.getData("sourceStage") as DealStage;

      if (!dealId || sourceStage === targetStage) return;

      // Optimistic update: move the deal in local state
      setPipeline((prev) => {
        const updated = prev.map((p) => ({ ...p, deals: [...p.deals] }));
        const sourceCol = updated.find((p) => p.stage === sourceStage);
        const targetCol = updated.find((p) => p.stage === targetStage);

        if (!sourceCol || !targetCol) return prev;

        const dealIndex = sourceCol.deals.findIndex((d) => d.id === dealId);
        if (dealIndex === -1) return prev;

        const [deal] = sourceCol.deals.splice(dealIndex, 1);
        deal.stage = targetStage;
        targetCol.deals.push(deal);

        // Update counts and totals
        sourceCol.count = sourceCol.deals.length;
        sourceCol.total_amount_cents = sourceCol.deals.reduce(
          (sum, d) => sum + d.amount_cents,
          0,
        );
        targetCol.count = targetCol.deals.length;
        targetCol.total_amount_cents = targetCol.deals.reduce(
          (sum, d) => sum + d.amount_cents,
          0,
        );

        return updated;
      });

      // Fire API call in background
      try {
        await updateDealStage(dealId, targetStage);
      } catch {
        // Revert on failure
        loadPipeline();
      }
    },
    [loadPipeline],
  );

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    loadPipeline();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading pipeline...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadPipeline}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Pipeline</h1>
          <p className="text-sm text-zinc-500">
            {totalDeals}{" "}
            {totalDeals === 1
              ? dealLabel.toLowerCase()
              : dealPluralLabel.toLowerCase()}{" "}
            worth {formatTotalAmount(totalPipelineValue)} in pipeline
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add {dealLabel}
        </Button>
      </div>

      {/* Kanban Board */}
      {totalDeals === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <EmptyState
            icon={Target}
            title={`No ${dealPluralLabel.toLowerCase()} yet`}
            description={`Create your first ${dealLabel.toLowerCase()} to start tracking your ${revenueLabel.toLowerCase()} pipeline.`}
            action={{
              label: `Add ${dealLabel}`,
              onClick: () => setIsFormOpen(true),
            }}
            variant="card"
          />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div
            className="flex h-full gap-3 p-4"
            style={{ minWidth: "fit-content" }}
          >
            {STAGE_ORDER.map((stage) => {
              const stageData = stageMap[stage];
              const config = STAGE_CONFIG[stage] || {
                label: stage,
                ...FALLBACK_COLOR,
              };
              const isDragOver = dragOverStage === stage;

              return (
                <div
                  key={stage}
                  className={cn(
                    "flex w-64 shrink-0 flex-col rounded-lg border transition-colors",
                    isDragOver
                      ? cn("border-2", config.borderColor, config.bgColor)
                      : "border-zinc-800 bg-zinc-900/30",
                  )}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage)}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-zinc-800/50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          config.color.replace("text-", "bg-"),
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs font-semibold uppercase tracking-wider",
                          config.color,
                        )}
                      >
                        {config.label}
                      </span>
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-800 px-1.5 text-[10px] font-medium text-zinc-400">
                        {stageData.count}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-zinc-500">
                      {formatTotalAmount(stageData.total_amount_cents)}
                    </span>
                  </div>

                  {/* Deal Cards */}
                  <div className="flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin">
                    {stageData.deals.length === 0 ? (
                      <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-zinc-800 text-xs text-zinc-600">
                        No deals
                      </div>
                    ) : (
                      stageData.deals.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          customerLabel={customerLabel}
                          onDragStart={handleDragStart}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deal Form Modal */}
      <DealForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
