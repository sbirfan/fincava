import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { ProductTypeSchema, TypeAttributeField } from "./product-type-selector";

// ── Props ─────────────────────────────────────────────────────────────────────

interface DynamicTypeFormProps {
  schema: ProductTypeSchema | null;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  /** "save" = auto-save draft, suppress required errors; "submit" = validate required fields */
  mode: "save" | "submit";
  /** Which channels are currently enabled — used to determine which fields are required */
  enabledChannels?: ("wholesale" | "retail")[];
}

// ── Field renderers ───────────────────────────────────────────────────────────

function isRequired(field: TypeAttributeField, enabledChannels: ("wholesale" | "retail")[]): boolean {
  return field.requiredFor.some(ch => enabledChannels.includes(ch));
}

interface FieldProps {
  field: TypeAttributeField;
  value: unknown;
  onChange: (value: unknown) => void;
  required: boolean;
  showError: boolean;
}

function TextField({ field, value, onChange, required, showError }: FieldProps) {
  const strVal = typeof value === "string" ? value : "";
  const error = showError && required && !strVal;

  if (field.options && field.options.length > 0) {
    return (
      <Select value={strVal} onValueChange={onChange}>
        <SelectTrigger className={error ? "border-destructive" : ""}>
          <SelectValue placeholder={`Select ${field.labelEn}`} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      value={strVal}
      onChange={e => onChange(e.target.value)}
      className={error ? "border-destructive" : ""}
      aria-invalid={error}
    />
  );
}

function NumberField({ field, value, onChange, required, showError }: FieldProps) {
  const numVal = typeof value === "number" ? value : "";
  const error = showError && required && (value === undefined || value === null || value === "");

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={numVal}
        onChange={e => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className={error ? "border-destructive" : ""}
        aria-invalid={error}
      />
      {field.unit && <span className="text-sm text-muted-foreground shrink-0">{field.unit}</span>}
    </div>
  );
}

function BooleanField({ field, value, onChange }: FieldProps) {
  return (
    <Switch
      checked={value === true}
      onCheckedChange={onChange}
      aria-label={field.labelEn}
    />
  );
}

function TextArrayField({ field, value, onChange, required, showError }: FieldProps) {
  const arr = Array.isArray(value) ? (value as string[]) : [];
  const error = showError && required && arr.length === 0;

  function addTag(raw: string) {
    const tag = raw.trim();
    if (tag && !arr.includes(tag)) {
      onChange([...arr, tag]);
    }
  }

  function removeTag(tag: string) {
    onChange(arr.filter(t => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(e.currentTarget.value);
      e.currentTarget.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 min-h-[2rem]">
        {arr.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full hover:bg-muted p-0.5"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        placeholder={`Type and press Enter to add${field.options ? ` (e.g. ${field.options.slice(0, 2).join(", ")})` : ""}`}
        onKeyDown={handleKeyDown}
        onBlur={e => { if (e.target.value) { addTag(e.target.value); e.target.value = ""; } }}
        className={error ? "border-destructive" : ""}
        aria-invalid={error}
      />
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  required,
  showError,
}: {
  field: TypeAttributeField;
  value: unknown;
  onChange: (value: unknown) => void;
  required: boolean;
  showError: boolean;
}) {
  const fieldId = `type-attr-${field.key}`;
  const error = showError && required && (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0));

  const fieldProps: FieldProps = { field, value, onChange, required, showError };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label htmlFor={fieldId}>
          {field.labelEn}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {field.unit && <span className="text-xs text-muted-foreground">({field.unit})</span>}
      </div>
      {field.helpTextEn && (
        <p className="text-xs text-muted-foreground">{field.helpTextEn}</p>
      )}
      <div id={fieldId}>
        {field.type === "text"    && <TextField   {...fieldProps} />}
        {field.type === "number"  && <NumberField  {...fieldProps} />}
        {field.type === "boolean" && <BooleanField {...fieldProps} />}
        {field.type === "text[]"  && <TextArrayField {...fieldProps} />}
      </div>
      {error && (
        <p className="text-xs text-destructive">
          {field.labelEn} is required
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DynamicTypeForm({
  schema,
  values,
  onChange,
  mode,
  enabledChannels = ["wholesale"],
}: DynamicTypeFormProps) {
  if (!schema || schema.typeAttributes.length === 0) return null;

  const showError = mode === "submit";

  return (
    <div className="space-y-4" aria-live="polite">
      <h3 className="text-sm font-medium text-foreground">
        {schema.labelEn} — Type Details
      </h3>
      {schema.typeAttributes.map(field => (
        <FieldRow
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={val => onChange(field.key, val)}
          required={isRequired(field, enabledChannels)}
          showError={showError}
        />
      ))}
    </div>
  );
}
