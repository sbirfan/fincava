import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { AiContent } from "../../../api-server/src/services/product-enrichment-service";

// ── Local AiContent type (mirrors the service — avoids cross-package import) ──

interface AiEnrichmentResult {
  shortEs: string;
  shortEn: string;
  longEs: string;
  longEn: string;
  buyerHighlights: string[];
  enrichedAt: string;
}

// ── Applied fields shape — what the parent form accepts on Apply ──────────────

export interface EnrichmentApplied {
  shortEs: string;
  shortEn: string;
  longEs: string;
  longEn: string;
  buyerHighlights: string[];
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AiEnrichmentPreviewProps {
  open: boolean;
  loading: boolean;
  enrichment: AiEnrichmentResult | null;
  error: string | null;
  onApply: (fields: EnrichmentApplied) => void;
  onDismiss: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function DescriptionPair({ label, es, en }: { label: string; es: string; en: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="text-xs font-medium mb-1 text-muted-foreground">ES</p>
          <p>{es}</p>
        </div>
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="text-xs font-medium mb-1 text-muted-foreground">EN</p>
          <p>{en}</p>
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AiEnrichmentPreview({
  open,
  loading,
  enrichment,
  error,
  onApply,
  onDismiss,
}: AiEnrichmentPreviewProps) {
  function handleApply() {
    if (!enrichment) return;
    onApply({
      shortEs: enrichment.shortEs,
      shortEn: enrichment.shortEn,
      longEs:  enrichment.longEs,
      longEn:  enrichment.longEn,
      buyerHighlights: enrichment.buyerHighlights,
    });
  }

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onDismiss(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ✨ AI-Generated Descriptions
          </DialogTitle>
        </DialogHeader>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Spinner className="h-6 w-6" />
            <p className="text-sm">Generating descriptions…</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Generation failed. Close and try again.
          </div>
        )}

        {/* Result */}
        {!loading && enrichment && (
          <div className="space-y-5">
            <DescriptionPair
              label="Short Description"
              es={enrichment.shortEs}
              en={enrichment.shortEn}
            />
            <DescriptionPair
              label="Long Description"
              es={enrichment.longEs}
              en={enrichment.longEn}
            />

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Buyer Highlights
              </p>
              <ul className="space-y-1">
                {enrichment.buyerHighlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground mt-0.5">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {enrichment.enrichedAt && (
              <p className="text-xs text-muted-foreground">
                Generated {new Date(enrichment.enrichedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onDismiss}>
            Dismiss
          </Button>
          {!loading && enrichment && (
            <Button onClick={handleApply}>
              Apply
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
