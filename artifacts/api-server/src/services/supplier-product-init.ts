import {
  db,
  suppliersTable,
  farmsTable,
  economicsTable,
  companiesTable,
  productsTable,
  usersTable,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { logger } from "../lib/logger";

export async function initSupplierProduct(supplierId: number): Promise<{
  companyId: number;
  productId: number;
  skipped: boolean;
  reason?: string;
}> {
  const [existingProduct] = await db
    .select({ id: productsTable.id, companyId: productsTable.companyId })
    .from(productsTable)
    .where(eq(productsTable.supplierId, supplierId))
    .limit(1);

  if (existingProduct) {
    return {
      companyId: existingProduct.companyId,
      productId: existingProduct.id,
      skipped: true,
      reason: "product already exists",
    };
  }

  const [admin] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "ADMIN"))
    .orderBy(asc(usersTable.id))
    .limit(1);

  if (!admin) {
    throw new Error(
      "initSupplierProduct: no ADMIN user found — cannot create company",
    );
  }

  const adminUserId = admin.id;

  const [supplier] = await db
    .select({
      id: suppliersTable.id,
      nombreCompleto: suppliersTable.nombreCompleto,
      municipio: suppliersTable.municipio,
      department: suppliersTable.department,
      supplierType: suppliersTable.supplierType,
    })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, supplierId))
    .limit(1);

  if (!supplier) {
    throw new Error("initSupplierProduct: supplier not found");
  }

  const [farm] = await db
    .select({
      cultivoPrincipal: farmsTable.cultivoPrincipal,
      variedadCafe: farmsTable.variedadCafe,
      hectareasProduccion: farmsTable.hectareasProduccion,
      metodoSecado: farmsTable.metodoSecado,
      altitudeMeters: farmsTable.altitudeMeters,
    })
    .from(farmsTable)
    .where(eq(farmsTable.supplierId, supplierId))
    .limit(1);

  const [economics] = await db
    .select({
      volumenKgUltimaCosecha: economicsTable.volumenKgUltimaCosecha,
      minimumOrderKg: economicsTable.minimumOrderKg,
    })
    .from(economicsTable)
    .where(eq(economicsTable.supplierId, supplierId))
    .limit(1);

  const [company] = await db
    .insert(companiesTable)
    .values({
      userId: adminUserId,
      name: supplier.nombreCompleto,
      type: "SMALLHOLDER",
      country: "Colombia",
      description: "",
      verified: false,
      farmerName: supplier.nombreCompleto,
    })
    .returning();

  if (!company) {
    throw new Error("initSupplierProduct: failed to create company");
  }

  const cultivoRaw = (farm?.cultivoPrincipal ?? "").toLowerCase().trim();
  let category: "COFFEE" | "CACAO" | "AVOCADO" | "EXOTIC_FRUIT" | "OTHER";
  if (cultivoRaw.includes("café") || cultivoRaw.includes("cafe") || cultivoRaw.includes("coffee")) {
    category = "COFFEE";
  } else if (
    cultivoRaw.includes("cacao") ||
    cultivoRaw.includes("cocoa") ||
    cultivoRaw.includes("chocolate")
  ) {
    category = "CACAO";
  } else if (cultivoRaw.includes("aguacate") || cultivoRaw.includes("avocado")) {
    category = "AVOCADO";
  } else if (
    cultivoRaw.includes("uchuva") ||
    cultivoRaw.includes("granadilla") ||
    cultivoRaw.includes("maracuyá") ||
    cultivoRaw.includes("maracuya") ||
    cultivoRaw.includes("fruta") ||
    cultivoRaw.includes("fruit")
  ) {
    category = "EXOTIC_FRUIT";
  } else {
    category = "OTHER";
  }

  const productName = `${farm?.cultivoPrincipal ?? "Producto agrícola"} — ${supplier.municipio}`;

  const origin =
    supplier.municipio +
    (supplier.department ? `, ${supplier.department}` : "") +
    ", Colombia";

  const altitude =
    farm?.altitudeMeters != null ? `${farm.altitudeMeters}m` : null;

  const process = farm?.metodoSecado ?? null;

  const variety = farm?.variedadCafe ?? null;

  let availableKg: number;
  if (
    economics?.volumenKgUltimaCosecha != null &&
    economics.volumenKgUltimaCosecha > 0
  ) {
    availableKg = economics.volumenKgUltimaCosecha;
  } else if (farm?.hectareasProduccion != null) {
    const hectareas = parseFloat(String(farm.hectareasProduccion));
    availableKg = hectareas * 500;
  } else {
    availableKg = 100;
  }

  const minOrderKg =
    economics?.minimumOrderKg != null && economics.minimumOrderKg > 0
      ? economics.minimumOrderKg
      : 100;

  const description =
    `Smallholder farm — ${supplier.municipio}` +
    (supplier.department ? `, ${supplier.department}` : "") +
    ". Product details pending review.";

  const [product] = await db
    .insert(productsTable)
    .values({
      companyId: company.id,
      supplierId: supplierId,
      name: productName,
      category,
      description,
      origin,
      altitude,
      process,
      variety,
      availableKg,
      minOrderKg,
      pricePerKgUSD: 0,
      active: true,
      smallholder: true,
      farmerName: supplier.nombreCompleto,
    })
    .returning();

  if (!product) {
    throw new Error("initSupplierProduct: failed to create product");
  }

  logger.info(
    {
      supplierId,
      companyId: company.id,
      productId: product.id,
      category,
      availableKg,
    },
    "initSupplierProduct: company and product stub created",
  );

  return { companyId: company.id, productId: product.id, skipped: false };
}
