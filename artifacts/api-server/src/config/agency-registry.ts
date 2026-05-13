/**
 * Fincava — Static Agency Registry
 *
 * Canonical list of Colombian regulatory agencies relevant to agricultural export compliance.
 * URLs are official homepages only — no deep-links, no municipality-specific offices.
 *
 * USAGE RULES:
 * - This registry is the ONLY authorised source of agency URLs in the platform.
 * - AI-generated documents must NEVER include URLs. The system appends this section
 *   deterministically after the AI response, before the document is stored or returned.
 * - Do NOT add municipality-specific office addresses, phone numbers, or contact details.
 * - To update a URL: change it here. All documents generated after the change will reflect it.
 */

export type Agency = {
  code: string;
  name: string;
  homepageUrl: string;
};

export const AGENCY_REGISTRY: readonly Agency[] = [
  {
    code: "ICA",
    name: "ICA — Instituto Colombiano Agropecuario",
    homepageUrl: "https://www.ica.gov.co",
  },
  {
    code: "INVIMA",
    name: "INVIMA — Instituto Nacional de Vigilancia de Medicamentos y Alimentos",
    homepageUrl: "https://www.invima.gov.co",
  },
  {
    code: "DIAN",
    name: "DIAN — Dirección de Impuestos y Aduanas Nacionales",
    homepageUrl: "https://www.dian.gov.co",
  },
  {
    code: "SENA",
    name: "SENA — Servicio Nacional de Aprendizaje",
    homepageUrl: "https://www.sena.edu.co",
  },
  {
    code: "CAMARA",
    name: "Cámara de Comercio (directorio nacional — Confecámaras)",
    homepageUrl: "https://www.confecamaras.com.co",
  },
] as const;

/**
 * Returns the deterministic agency-links section appended after every AI-generated
 * compliance document. The output is plain text — no markdown, no pipe characters —
 * consistent with the document format constraints already applied to the AI model.
 *
 * This function is the single place where URLs enter a document.
 * It must never be called inside an AI prompt or system message.
 */
export function buildAgencyLinksSection(lang?: "en" | "es"): string {
  const lines = AGENCY_REGISTRY.map((a) => `- ${a.name}: ${a.homepageUrl}`).join("\n");
  if (lang === "en") {
    return [
      "",
      "",
      "OFFICIAL REGULATORY AGENCY LINKS",
      "",
      lines,
      "",
      "Note: These links are official agency homepages. Specific procedures are handled through each agency's own service channels. Fincava is not responsible for changes to external content.",
    ].join("\n");
  }
  return [
    "",
    "",
    "ENLACES OFICIALES DE ENTIDADES REGULATORIAS",
    "",
    lines,
    "",
    "Nota: Los enlaces anteriores corresponden a las páginas de inicio oficiales de cada entidad. Los trámites específicos se gestionan a través de los canales de atención de cada entidad. Fincava no es responsable por cambios en contenidos externos.",
  ].join("\n");
}
