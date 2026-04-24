import { db } from "@workspace/db";
import { complianceRequirementsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const requirements = [
  // ── Coffee ───────────────────────────────────────────────────────────────────
  { country: "UAE", productType: "COFFEE", requirement: "Phytosanitary Certificate", description: "Issued by ICA Colombia certifying the coffee is free from pests and diseases.", mandatory: 1, category: "DOCUMENT" },
  { country: "UAE", productType: "COFFEE", requirement: "Certificate of Origin", description: "Issued by the Colombian Coffee Federation or Chamber of Commerce.", mandatory: 1, category: "DOCUMENT" },
  { country: "UAE", productType: "COFFEE", requirement: "Food Safety Certificate", description: "UAE ESMA halal/food safety compliance for food imports.", mandatory: 1, category: "COMPLIANCE" },
  { country: "UAE", productType: "COFFEE", requirement: "RUT DIAN", description: "Colombian tax ID registration required for export invoicing.", mandatory: 1, category: "DOCUMENT" },
  { country: "UAE", productType: "COFFEE", requirement: "DIAN Export Registration", description: "Exporter must be registered with DIAN as an authorized exporter.", mandatory: 1, category: "COMPLIANCE" },

  { country: "Saudi Arabia", productType: "COFFEE", requirement: "Phytosanitary Certificate", description: "ICA-issued certificate required at Saudi customs.", mandatory: 1, category: "DOCUMENT" },
  { country: "Saudi Arabia", productType: "COFFEE", requirement: "Halal Certificate", description: "For processed coffee products entering Saudi Arabia.", mandatory: 0, category: "COMPLIANCE" },
  { country: "Saudi Arabia", productType: "COFFEE", requirement: "Certificate of Origin", description: "Must be authenticated by the Colombian Chamber of Commerce.", mandatory: 1, category: "DOCUMENT" },
  { country: "Saudi Arabia", productType: "COFFEE", requirement: "SASO Conformity", description: "Saudi Standards, Metrology and Quality Organization conformity certificate.", mandatory: 1, category: "COMPLIANCE" },

  { country: "Japan", productType: "COFFEE", requirement: "Phytosanitary Certificate", description: "Required by Japanese Ministry of Agriculture (MAFF).", mandatory: 1, category: "DOCUMENT" },
  { country: "Japan", productType: "COFFEE", requirement: "Food Sanitation Act Compliance", description: "Green and roasted coffee must meet Japan's residue limits.", mandatory: 1, category: "COMPLIANCE" },
  { country: "Japan", productType: "COFFEE", requirement: "Organic JAS Certification", description: "Required to market coffee as organic in Japan.", mandatory: 0, category: "COMPLIANCE" },

  // ── Cacao ────────────────────────────────────────────────────────────────────
  { country: "UAE", productType: "CACAO", requirement: "Phytosanitary Certificate", description: "ICA Colombia certificate required for cacao exports.", mandatory: 1, category: "DOCUMENT" },
  { country: "UAE", productType: "CACAO", requirement: "Certificate of Origin", description: "Chamber of Commerce or FNC certificate.", mandatory: 1, category: "DOCUMENT" },
  { country: "UAE", productType: "CACAO", requirement: "Heavy Metal Test Report", description: "UAE requires cadmium and lead test results for cacao.", mandatory: 1, category: "COMPLIANCE" },
  { country: "UAE", productType: "CACAO", requirement: "RUT DIAN", description: "Colombian tax ID required for export.", mandatory: 1, category: "DOCUMENT" },

  { country: "EU", productType: "CACAO", requirement: "EU Cadmium Regulation Compliance", description: "Regulation 488/2014 — cadmium levels in cacao must be below 0.60 mg/kg.", mandatory: 1, category: "COMPLIANCE" },
  { country: "EU", productType: "CACAO", requirement: "Phytosanitary Certificate", description: "Required at EU border inspection post.", mandatory: 1, category: "DOCUMENT" },
  { country: "EU", productType: "CACAO", requirement: "Deforestation Regulation (EUDR)", description: "From Dec 2024: proof cacao was not grown on deforested land.", mandatory: 1, category: "COMPLIANCE" },
  { country: "EU", productType: "CACAO", requirement: "Due Diligence Statement", description: "EUDR operator due diligence statement filed in EU system.", mandatory: 1, category: "DOCUMENT" },

  // ── Avocado ──────────────────────────────────────────────────────────────────
  { country: "UAE", productType: "AVOCADO", requirement: "Phytosanitary Certificate", description: "ICA certificate verifying fruit fly free status.", mandatory: 1, category: "DOCUMENT" },
  { country: "UAE", productType: "AVOCADO", requirement: "Cold Treatment Certificate", description: "Some markets require cold chain treatment certification.", mandatory: 0, category: "COMPLIANCE" },
  { country: "UAE", productType: "AVOCADO", requirement: "GlobalGAP Certification", description: "Good Agricultural Practices certification preferred by UAE buyers.", mandatory: 0, category: "COMPLIANCE" },

  { country: "EU", productType: "AVOCADO", requirement: "Phytosanitary Certificate", description: "EU plant health requirements for fresh avocado.", mandatory: 1, category: "DOCUMENT" },
  { country: "EU", productType: "AVOCADO", requirement: "MRL Compliance", description: "Maximum Residue Levels — pesticide testing required.", mandatory: 1, category: "COMPLIANCE" },
  { country: "EU", productType: "AVOCADO", requirement: "GlobalGAP or equivalent", description: "Required by most EU supermarket buyers.", mandatory: 0, category: "COMPLIANCE" },

  // ── General Colombia export ───────────────────────────────────────────────────
  { country: "ALL", productType: "ALL", requirement: "RUT DIAN", description: "Colombian tax registration — required for all exports.", mandatory: 1, category: "DOCUMENT" },
  { country: "ALL", productType: "ALL", requirement: "ICA Export Registration", description: "Instituto Colombiano Agropecuario registration for agricultural exporters.", mandatory: 1, category: "COMPLIANCE" },
  { country: "ALL", productType: "ALL", requirement: "DIAN Customs Authorization", description: "Authorization to operate as exporter with Colombian customs.", mandatory: 1, category: "COMPLIANCE" },
  { country: "ALL", productType: "ALL", requirement: "Commercial Invoice", description: "Standard export commercial invoice with HS code.", mandatory: 1, category: "DOCUMENT" },
  { country: "ALL", productType: "ALL", requirement: "Packing List", description: "Detailed packing list per shipment.", mandatory: 1, category: "DOCUMENT" },
  { country: "ALL", productType: "ALL", requirement: "Bill of Lading / Airway Bill", description: "Shipping document issued by carrier.", mandatory: 1, category: "DOCUMENT" },
];

async function seedCompliance() {
  await db.execute(sql`TRUNCATE compliance_requirements RESTART IDENTITY`);
  await db.insert(complianceRequirementsTable).values(requirements);
  console.log(`Seeded ${requirements.length} compliance requirements.`);
}

seedCompliance()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
