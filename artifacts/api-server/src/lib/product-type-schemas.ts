import { z } from "zod/v4";

export const PRODUCT_TYPE_SCHEMA_VERSION = "v1";

type FieldType = "text" | "number" | "boolean" | "text[]";
type StorageLocation = "typeAttributes" | "products_column";
type Channel = "wholesale" | "retail";

export interface TypeAttributeField {
  key: string;
  type: FieldType;
  labelEs: string;
  labelEn: string;
  helpTextEs: string;
  helpTextEn: string;
  unit?: string;
  options?: string[];
  requiredFor: Channel[];
  filterable: boolean;
  wholesaleDisplay: boolean;
  retailDisplay: boolean;
  aiContext: boolean;
  storageLocation: StorageLocation;
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

export const PRODUCT_TYPE_SCHEMAS: Record<string, ProductTypeSchema> = {
  COFFEE_GREEN: {
    typeKey: "COFFEE_GREEN",
    category: "COFFEE",
    labelEs: "Café Verde",
    labelEn: "Green Coffee",
    descriptionEs: "Café sin tostar listo para exportación o tostado",
    descriptionEn: "Unroasted coffee ready for export or roasting",
    coreFields: [
      {
        key: "altitude",
        type: "text",
        labelEs: "Altitud",
        labelEn: "Altitude",
        helpTextEs: "Altura del cultivo sobre el nivel del mar",
        helpTextEn: "Growing altitude above sea level",
        unit: "msnm",
        requiredFor: [],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: false,
        aiContext: true,
        storageLocation: "products_column",
        columnName: "altitude",
      },
      {
        key: "variety",
        type: "text",
        labelEs: "Variedad",
        labelEn: "Variety",
        helpTextEs: "Variedad botánica del café",
        helpTextEn: "Botanical variety of the coffee",
        requiredFor: [],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "products_column",
        columnName: "variety",
      },
      {
        key: "process",
        type: "text",
        labelEs: "Proceso",
        labelEn: "Process",
        helpTextEs: "Método de beneficio del café",
        helpTextEn: "Coffee processing method",
        options: ["Washed", "Natural", "Honey", "Anaerobic", "Wet-Hulled"],
        requiredFor: [],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "products_column",
        columnName: "process",
      },
    ],
    typeAttributes: [
      {
        key: "screen_size",
        type: "text",
        labelEs: "Tamaño de malla",
        labelEn: "Screen Size",
        helpTextEs: "Clasificación por tamaño de grano (ej. 15/16, 17/18)",
        helpTextEn: "Bean size classification (e.g. 15/16, 17/18)",
        requiredFor: [],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "typeAttributes",
      },
      {
        key: "moisture_content_pct",
        type: "number",
        labelEs: "Contenido de humedad",
        labelEn: "Moisture Content",
        helpTextEs: "Porcentaje de humedad del grano",
        helpTextEn: "Bean moisture percentage",
        unit: "%",
        requiredFor: ["wholesale", "retail"],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "typeAttributes",
      },
      {
        key: "defect_count",
        type: "number",
        labelEs: "Conteo de defectos",
        labelEn: "Defect Count",
        helpTextEs: "Defectos por 300g según clasificación SCA",
        helpTextEn: "Defects per 300g per SCA classification",
        unit: "g/300g",
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: true,
        retailDisplay: false,
        aiContext: false,
        storageLocation: "typeAttributes",
      },
      {
        key: "harvest_year",
        type: "number",
        labelEs: "Año de cosecha",
        labelEn: "Harvest Year",
        helpTextEs: "Año en que se cosechó el café",
        helpTextEn: "Year the coffee was harvested",
        requiredFor: ["retail"],
        filterable: false,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "typeAttributes",
      },
      {
        key: "drying_method",
        type: "text",
        labelEs: "Método de secado",
        labelEn: "Drying Method",
        helpTextEs: "Cómo se secó el café después del despulpado",
        helpTextEn: "How the coffee was dried after processing",
        options: ["Sun Dried", "Raised Bed", "Mechanical"],
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: true,
        retailDisplay: false,
        aiContext: true,
        storageLocation: "typeAttributes",
      },
    ],
    channels: {
      wholesale: {
        requiredFields: [
          "name", "origin", "pricePerKgUSD", "minOrderKg", "availableKg",
          "productTypeKey", "screen_size", "moisture_content_pct",
        ],
      },
      retail: {
        requiredFields: [
          "name", "origin", "retailPriceCop", "retailStockUnits",
          "retailUnitLabel", "retailUnitWeightG", "harvest_year",
        ],
      },
    },
    aiPromptHints: {
      wholesalePersona: "specialty coffee importer, cooperative buyer, or green coffee trader",
      retailPersona: "home roaster or roast-your-own coffee enthusiast",
      keySellingPoints: [
        "Single-origin Colombian provenance",
        "Smallholder farmer direct trade",
        "Altitude and terroir characteristics",
        "Processing method and flavor potential",
      ],
    },
  },

  COFFEE_ROASTED: {
    typeKey: "COFFEE_ROASTED",
    category: "COFFEE",
    labelEs: "Café Tostado",
    labelEn: "Roasted Coffee",
    descriptionEs: "Café tostado listo para moler y preparar",
    descriptionEn: "Roasted coffee ready to grind and brew",
    coreFields: [
      {
        key: "variety",
        type: "text",
        labelEs: "Variedad",
        labelEn: "Variety",
        helpTextEs: "Variedad botánica del café",
        helpTextEn: "Botanical variety of the coffee",
        requiredFor: [],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "products_column",
        columnName: "variety",
      },
      {
        key: "process",
        type: "text",
        labelEs: "Proceso",
        labelEn: "Process",
        helpTextEs: "Método de beneficio del café",
        helpTextEn: "Coffee processing method",
        options: ["Washed", "Natural", "Honey", "Anaerobic"],
        requiredFor: [],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "products_column",
        columnName: "process",
      },
      {
        key: "altitude",
        type: "text",
        labelEs: "Altitud",
        labelEn: "Altitude",
        helpTextEs: "Altura del cultivo sobre el nivel del mar",
        helpTextEn: "Growing altitude above sea level",
        unit: "msnm",
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: true,
        retailDisplay: false,
        aiContext: true,
        storageLocation: "products_column",
        columnName: "altitude",
      },
      {
        key: "cupping",
        type: "number",
        labelEs: "Puntaje de catación",
        labelEn: "Cupping Score",
        helpTextEs: "Puntaje SCA de catación (80–100)",
        helpTextEn: "SCA cupping score (80–100)",
        requiredFor: [],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "products_column",
        columnName: "cupping",
      },
    ],
    typeAttributes: [
      {
        key: "roast_level",
        type: "text",
        labelEs: "Nivel de tostión",
        labelEn: "Roast Level",
        helpTextEs: "Intensidad del tostado",
        helpTextEn: "Roast intensity",
        options: ["Light", "Medium-Light", "Medium", "Medium-Dark", "Dark"],
        requiredFor: ["retail"],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "typeAttributes",
      },
      {
        key: "flavor_notes",
        type: "text[]",
        labelEs: "Notas de sabor",
        labelEn: "Flavor Notes",
        helpTextEs: "Notas de sabor percibidas en taza",
        helpTextEn: "Flavor notes perceived in the cup",
        requiredFor: ["retail"],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "typeAttributes",
      },
      {
        key: "grind_options",
        type: "text[]",
        labelEs: "Opciones de molienda",
        labelEn: "Grind Options",
        helpTextEs: "Presentaciones de molienda disponibles",
        helpTextEn: "Available grind presentations",
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: false,
        retailDisplay: true,
        aiContext: false,
        storageLocation: "typeAttributes",
      },
      {
        key: "roasted_at",
        type: "text",
        labelEs: "Fecha de tostión",
        labelEn: "Roasted At",
        helpTextEs: "Fecha aproximada de tostado",
        helpTextEn: "Approximate roast date",
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: false,
        retailDisplay: true,
        aiContext: false,
        storageLocation: "typeAttributes",
      },
    ],
    channels: {
      wholesale: {
        requiredFields: ["name", "origin", "pricePerKgUSD", "minOrderKg", "productTypeKey"],
      },
      retail: {
        requiredFields: [
          "name", "origin", "retailPriceCop", "retailStockUnits",
          "retailUnitLabel", "retailUnitWeightG", "roast_level", "flavor_notes",
        ],
      },
    },
    aiPromptHints: {
      wholesalePersona: "café owner, office supply buyer, or hospitality procurement",
      retailPersona: "home brewer or specialty coffee enthusiast",
      keySellingPoints: [
        "Colombian single-origin roasted to order",
        "Flavor profile and roast characteristics",
        "Farmer story and direct trade relationship",
      ],
    },
  },

  CACAO_BEAN: {
    typeKey: "CACAO_BEAN",
    category: "CACAO",
    labelEs: "Cacao en Grano",
    labelEn: "Cacao Bean",
    descriptionEs: "Granos de cacao fermentados y secos para procesamiento",
    descriptionEn: "Fermented and dried cacao beans for processing",
    coreFields: [
      {
        key: "origin",
        type: "text",
        labelEs: "Origen",
        labelEn: "Origin",
        helpTextEs: "Región de Colombia donde se cultivó el cacao",
        helpTextEn: "Colombian region where the cacao was grown",
        requiredFor: ["wholesale", "retail"],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "products_column",
        columnName: "origin",
      },
      {
        key: "altitude",
        type: "text",
        labelEs: "Altitud",
        labelEn: "Altitude",
        helpTextEs: "Altura del cultivo sobre el nivel del mar",
        helpTextEn: "Growing altitude above sea level",
        unit: "msnm",
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: true,
        retailDisplay: false,
        aiContext: true,
        storageLocation: "products_column",
        columnName: "altitude",
      },
    ],
    typeAttributes: [
      {
        key: "fermentation_days",
        type: "number",
        labelEs: "Días de fermentación",
        labelEn: "Fermentation Days",
        helpTextEs: "Número de días de fermentación del grano",
        helpTextEn: "Number of days the beans were fermented",
        unit: "días",
        requiredFor: ["wholesale"],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: false,
        aiContext: true,
        storageLocation: "typeAttributes",
      },
      {
        key: "drying_method",
        type: "text",
        labelEs: "Método de secado",
        labelEn: "Drying Method",
        helpTextEs: "Cómo se secaron los granos después de la fermentación",
        helpTextEn: "How the beans were dried after fermentation",
        options: ["Sun", "Raised Bed", "Mechanical"],
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: true,
        retailDisplay: false,
        aiContext: false,
        storageLocation: "typeAttributes",
      },
      {
        key: "harvest_year",
        type: "number",
        labelEs: "Año de cosecha",
        labelEn: "Harvest Year",
        helpTextEs: "Año en que se cosechó el cacao",
        helpTextEn: "Year the cacao was harvested",
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: true,
        retailDisplay: false,
        aiContext: true,
        storageLocation: "typeAttributes",
      },
      {
        key: "flavor_profile",
        type: "text[]",
        labelEs: "Perfil de sabor",
        labelEn: "Flavor Profile",
        helpTextEs: "Notas de sabor características del cacao",
        helpTextEn: "Characteristic flavor notes of the cacao",
        requiredFor: [],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "typeAttributes",
      },
      {
        key: "moisture_content_pct",
        type: "number",
        labelEs: "Contenido de humedad",
        labelEn: "Moisture Content",
        helpTextEs: "Porcentaje de humedad del grano seco",
        helpTextEn: "Moisture percentage of the dried bean",
        unit: "%",
        requiredFor: ["wholesale"],
        filterable: false,
        wholesaleDisplay: true,
        retailDisplay: false,
        aiContext: true,
        storageLocation: "typeAttributes",
      },
      {
        key: "fat_content_pct",
        type: "number",
        labelEs: "Contenido de grasa",
        labelEn: "Fat Content",
        helpTextEs: "Porcentaje de manteca de cacao",
        helpTextEn: "Cacao butter percentage",
        unit: "%",
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: true,
        retailDisplay: false,
        aiContext: false,
        storageLocation: "typeAttributes",
      },
    ],
    channels: {
      wholesale: {
        requiredFields: [
          "name", "origin", "pricePerKgUSD", "minOrderKg", "productTypeKey",
          "fermentation_days", "moisture_content_pct",
        ],
      },
      retail: {
        requiredFields: [
          "name", "origin", "retailPriceCop", "retailStockUnits",
          "retailUnitLabel", "retailUnitWeightG",
        ],
      },
    },
    aiPromptHints: {
      wholesalePersona: "chocolate manufacturer, craft chocolate maker, or cacao importer",
      retailPersona: "home chocolate maker or craft cacao enthusiast",
      keySellingPoints: [
        "Colombian fine-flavor cacao",
        "Smallholder farmer fermentation expertise",
        "Terroir and regional flavor profile",
      ],
    },
  },

  CACAO_POWDER: {
    typeKey: "CACAO_POWDER",
    category: "CACAO",
    labelEs: "Cacao en Polvo",
    labelEn: "Cacao Powder",
    descriptionEs: "Polvo de cacao para repostería y bebidas",
    descriptionEn: "Cacao powder for baking and beverages",
    coreFields: [
      {
        key: "origin",
        type: "text",
        labelEs: "Origen",
        labelEn: "Origin",
        helpTextEs: "Región de Colombia donde se cultivó el cacao base",
        helpTextEn: "Colombian region where the source cacao was grown",
        requiredFor: ["wholesale", "retail"],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "products_column",
        columnName: "origin",
      },
    ],
    typeAttributes: [
      {
        key: "cacao_pct",
        type: "number",
        labelEs: "Porcentaje de cacao",
        labelEn: "Cacao Percentage",
        helpTextEs: "Contenido de cacao en el polvo (%)",
        helpTextEn: "Cacao content in the powder (%)",
        unit: "%",
        requiredFor: ["wholesale", "retail"],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "typeAttributes",
      },
      {
        key: "processing_type",
        type: "text",
        labelEs: "Tipo de procesamiento",
        labelEn: "Processing Type",
        helpTextEs: "Método de procesamiento del polvo",
        helpTextEn: "Powder processing method",
        options: ["Natural", "Dutched", "Extra Dark"],
        requiredFor: ["wholesale"],
        filterable: false,
        wholesaleDisplay: true,
        retailDisplay: false,
        aiContext: false,
        storageLocation: "typeAttributes",
      },
      {
        key: "fat_content_pct",
        type: "number",
        labelEs: "Contenido de grasa",
        labelEn: "Fat Content",
        helpTextEs: "Porcentaje de manteca residual en el polvo",
        helpTextEn: "Residual cacao butter percentage in the powder",
        unit: "%",
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: true,
        retailDisplay: false,
        aiContext: false,
        storageLocation: "typeAttributes",
      },
      {
        key: "particle_size_microns",
        type: "number",
        labelEs: "Tamaño de partícula",
        labelEn: "Particle Size",
        helpTextEs: "Tamaño de partícula en micrómetros",
        helpTextEn: "Particle size in micrometers",
        unit: "µm",
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: true,
        retailDisplay: false,
        aiContext: false,
        storageLocation: "typeAttributes",
      },
      {
        key: "color",
        type: "text",
        labelEs: "Color",
        labelEn: "Color",
        helpTextEs: "Descripción del color del polvo",
        helpTextEn: "Color description of the powder",
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: false,
        retailDisplay: true,
        aiContext: false,
        storageLocation: "typeAttributes",
      },
    ],
    channels: {
      wholesale: {
        requiredFields: [
          "name", "origin", "pricePerKgUSD", "minOrderKg", "productTypeKey",
          "cacao_pct", "processing_type",
        ],
      },
      retail: {
        requiredFields: [
          "name", "origin", "retailPriceCop", "retailStockUnits",
          "retailUnitLabel", "retailUnitWeightG", "cacao_pct",
        ],
      },
    },
    aiPromptHints: {
      wholesalePersona: "food manufacturer, bakery buyer, or confectionery producer",
      retailPersona: "home baker or health-conscious consumer",
      keySellingPoints: [
        "Colombian-origin cacao powder",
        "High cacao content",
        "Versatile for baking and beverages",
      ],
    },
  },

  CACAO_NIBS: {
    typeKey: "CACAO_NIBS",
    category: "CACAO",
    labelEs: "Nibs de Cacao",
    labelEn: "Cacao Nibs",
    descriptionEs: "Fragmentos de grano de cacao tostado o sin tostar",
    descriptionEn: "Roasted or raw cacao bean fragments",
    coreFields: [
      {
        key: "origin",
        type: "text",
        labelEs: "Origen",
        labelEn: "Origin",
        helpTextEs: "Región de Colombia donde se cultivó el cacao",
        helpTextEn: "Colombian region where the cacao was grown",
        requiredFor: ["wholesale", "retail"],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: true,
        storageLocation: "products_column",
        columnName: "origin",
      },
    ],
    typeAttributes: [
      {
        key: "roasted",
        type: "boolean",
        labelEs: "Tostado",
        labelEn: "Roasted",
        helpTextEs: "¿Los nibs están tostados?",
        helpTextEn: "Are the nibs roasted?",
        requiredFor: ["retail"],
        filterable: true,
        wholesaleDisplay: true,
        retailDisplay: true,
        aiContext: false,
        storageLocation: "typeAttributes",
      },
      {
        key: "fermentation_days",
        type: "number",
        labelEs: "Días de fermentación",
        labelEn: "Fermentation Days",
        helpTextEs: "Días de fermentación del cacao base",
        helpTextEn: "Fermentation days of the source cacao",
        unit: "días",
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: false,
        retailDisplay: false,
        aiContext: true,
        storageLocation: "typeAttributes",
      },
      {
        key: "flavor_profile",
        type: "text[]",
        labelEs: "Perfil de sabor",
        labelEn: "Flavor Profile",
        helpTextEs: "Notas de sabor de los nibs",
        helpTextEn: "Flavor notes of the nibs",
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: false,
        retailDisplay: false,
        aiContext: true,
        storageLocation: "typeAttributes",
      },
      {
        key: "particle_size_description",
        type: "text",
        labelEs: "Tamaño de fragmento",
        labelEn: "Particle Size",
        helpTextEs: "Clasificación del tamaño de los nibs",
        helpTextEn: "Nib size classification",
        options: ["Fine", "Medium", "Coarse"],
        requiredFor: [],
        filterable: false,
        wholesaleDisplay: false,
        retailDisplay: true,
        aiContext: false,
        storageLocation: "typeAttributes",
      },
    ],
    channels: {
      wholesale: {
        requiredFields: ["name", "origin", "pricePerKgUSD", "minOrderKg", "productTypeKey"],
      },
      retail: {
        requiredFields: [
          "name", "origin", "retailPriceCop", "retailStockUnits",
          "retailUnitLabel", "retailUnitWeightG", "roasted",
        ],
      },
    },
    aiPromptHints: {
      wholesalePersona: "specialty food manufacturer or ingredient buyer",
      retailPersona: "health food enthusiast or home baker",
      keySellingPoints: [
        "Colombian-origin cacao nibs",
        "Minimal processing — pure cacao flavor",
        "Versatile ingredient for snacking, baking, and chocolate making",
      ],
    },
  },
};

export function getSchemaForType(typeKey: string): ProductTypeSchema | null {
  return PRODUCT_TYPE_SCHEMAS[typeKey] ?? null;
}

export function getZodSchemaForType(typeKey: string): z.ZodObject<Record<string, z.ZodTypeAny>> | null {
  const schema = PRODUCT_TYPE_SCHEMAS[typeKey];
  if (!schema) return null;

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of schema.typeAttributes) {
    let fieldSchema: z.ZodTypeAny;
    switch (field.type) {
      case "text":
        fieldSchema = z.string();
        break;
      case "number":
        fieldSchema = z.number();
        break;
      case "boolean":
        fieldSchema = z.boolean();
        break;
      case "text[]":
        fieldSchema = z.array(z.string());
        break;
    }
    shape[field.key] = field.requiredFor.length === 0
      ? fieldSchema.optional()
      : fieldSchema.optional(); // validation of required-for-channel is route-level, not schema-level
  }
  return z.object(shape);
}

// Startup consistency check — throws on module load if any template is misconfigured.
for (const [typeKey, schema] of Object.entries(PRODUCT_TYPE_SCHEMAS)) {
  for (const field of schema.typeAttributes) {
    if (
      field.requiredFor.length > 0 &&
      !field.wholesaleDisplay &&
      !field.retailDisplay
    ) {
      throw new Error(
        `product-type-schemas: field "${field.key}" in "${typeKey}" is required ` +
        `but wholesaleDisplay=false and retailDisplay=false — required field would be invisible`
      );
    }
  }
}
