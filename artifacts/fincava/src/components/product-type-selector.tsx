import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ── Local types (mirrors api-server product-type-schemas) ─────────────────────

export interface TypeAttributeField {
  key: string;
  type: "text" | "number" | "boolean" | "text[]";
  labelEs: string;
  labelEn: string;
  helpTextEs: string;
  helpTextEn: string;
  unit?: string;
  options?: string[];
  requiredFor: ("wholesale" | "retail")[];
  filterable: boolean;
  wholesaleDisplay: boolean;
  retailDisplay: boolean;
  aiContext: boolean;
  storageLocation: "typeAttributes" | "products_column";
  columnName?: string;
}

export interface ProductTypeSchema {
  typeKey: string;
  category: string;
  labelEs: string;
  labelEn: string;
  descriptionEs: string;
  descriptionEn: string;
  coreFields: TypeAttributeField[];
  typeAttributes: TypeAttributeField[];
  channels: {
    wholesale: { requiredFields: string[] };
    retail: { requiredFields: string[] };
  };
  aiPromptHints: {
    wholesalePersona: string;
    retailPersona: string;
    keySellingPoints: string[];
  };
}

// ── Category labels ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  COFFEE:       "Coffee",
  CACAO:        "Cacao",
  AVOCADO:      "Avocado",
  EXOTIC_FRUIT: "Exotic Fruit",
  SUPERFOOD:    "Superfood",
  PROCESSED:    "Processed",
  TEXTILE:      "Textile",
  OTHER:        "Other",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

// ── sessionStorage cache ──────────────────────────────────────────────────────

function getCachedSchemas(): { version: string; schemas: ProductTypeSchema[] } | null {
  try {
    const raw = sessionStorage.getItem("typeSchemas_cache");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCachedSchemas(version: string, schemas: ProductTypeSchema[]): void {
  try {
    sessionStorage.setItem("typeSchemas_cache", JSON.stringify({ version, schemas }));
  } catch {
    // sessionStorage may be unavailable in some contexts — ignore
  }
}

async function loadSchemas(): Promise<{ version: string; schemas: ProductTypeSchema[] }> {
  const cached = getCachedSchemas();

  const res = await fetch("/api/products/type-schemas");
  if (!res.ok) throw new Error("Failed to load product type schemas");
  const data = await res.json() as { version: string; schemas: ProductTypeSchema[] };

  // Invalidate cache if version changed
  if (cached && cached.version === data.version) return cached;

  setCachedSchemas(data.version, data.schemas);
  return data;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProductTypeSelectorProps {
  selectedCategory?: string;
  selectedTypeKey?: string;
  existingTypeAttributes?: Record<string, unknown>;
  onCategoryChange: (category: string) => void;
  onTypeChange: (typeKey: string, schema: ProductTypeSchema | null) => void;
  onTypeAttributesClear?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductTypeSelector({
  selectedCategory,
  selectedTypeKey,
  existingTypeAttributes,
  onCategoryChange,
  onTypeChange,
  onTypeAttributesClear,
}: ProductTypeSelectorProps) {
  const [schemas, setSchemas] = useState<ProductTypeSchema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchemas()
      .then(({ schemas }) => setSchemas(schemas))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const typesForCategory = selectedCategory
    ? schemas.filter(s => s.category === selectedCategory)
    : [];

  function handleCategoryChange(category: string) {
    onCategoryChange(category);
    // Reset type when category changes
    onTypeChange(category, null);
  }

  function handleTypeChange(typeKey: string) {
    const schema = schemas.find(s => s.typeKey === typeKey) ?? null;

    // Warn if switching type on a product that already has type attributes
    const hasExistingAttrs =
      existingTypeAttributes && Object.keys(existingTypeAttributes).length > 0;
    const typeChanged = typeKey !== selectedTypeKey;

    if (hasExistingAttrs && typeChanged) {
      if (confirm("Switching product type will clear type-specific fields. Continue?")) {
        onTypeAttributesClear?.();
        onTypeChange(typeKey, schema);
      }
    } else {
      onTypeChange(typeKey, schema);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading product types…</div>;
  }

  return (
    <div className="space-y-4" aria-live="polite">
      {/* Category select */}
      <div className="space-y-1">
        <Label htmlFor="product-category">Category</Label>
        <Select
          value={selectedCategory ?? ""}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger id="product-category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {ALL_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type select — only when schemas exist for the selected category */}
      {typesForCategory.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="product-type-key">Product Type</Label>
          <Select
            value={selectedTypeKey ?? ""}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger id="product-type-key">
              <SelectValue placeholder="Select a product type" />
            </SelectTrigger>
            <SelectContent>
              {typesForCategory.map(schema => (
                <SelectItem key={schema.typeKey} value={schema.typeKey}>
                  {schema.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTypeKey && typesForCategory.find(s => s.typeKey === selectedTypeKey) && (
            <p className="text-xs text-muted-foreground">
              {typesForCategory.find(s => s.typeKey === selectedTypeKey)!.descriptionEn}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
