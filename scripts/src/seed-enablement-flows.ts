// Seed compliance_enablement_flows with Spanish step-by-step guidance.
// Requirement codes: DIAN_RUT | ICA_REGISTRO | FITOSANITARIO
// Modes: self_serve | assisted | managed
// Run: pnpm --filter @workspace/scripts run seed:enablement-flows

import { db } from "@workspace/db";
import { complianceEnablementFlowsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const flows: Array<{
  requirementCode: string;
  stepOrder: number;
  mode: string;
  language: string;
  title: string;
  guidance: string;
  expectedOutput: string | null;
  active: boolean;
}> = [
  // ── DIAN_RUT — self_serve ──────────────────────────────────────────────────
  {
    requirementCode: "DIAN_RUT",
    stepOrder: 1,
    mode: "self_serve",
    language: "es",
    title: "Ingresa al portal de la DIAN",
    guidance:
      "Abre el portal oficial de la DIAN en muisca.dian.gov.co. Selecciona la opción 'Inscripción en el RUT'. Asegúrate de tener a mano tu cédula de ciudadanía o NIT, así como los datos de tu actividad económica.",
    expectedOutput: "Acceso al formulario de inscripción",
    active: true,
  },
  {
    requirementCode: "DIAN_RUT",
    stepOrder: 2,
    mode: "self_serve",
    language: "es",
    title: "Completa el formulario de inscripción",
    guidance:
      "Diligencia el formulario 001 con tus datos personales: nombre completo, número de cédula, dirección, actividad económica principal (código CIIU) y la calidad en que actúas (persona natural). Para exportadores agrícolas, el CIIU más común es 0111 (cultivo de cereales) u 0119 (otros cultivos).",
    expectedOutput: "Formulario 001 diligenciado",
    active: true,
  },
  {
    requirementCode: "DIAN_RUT",
    stepOrder: 3,
    mode: "self_serve",
    language: "es",
    title: "Presenta el formulario y recibe el RUT",
    guidance:
      "Envía el formulario en línea o preséntate en la oficina DIAN más cercana con tu cédula original. El RUT se expide de forma inmediata en línea o en el mismo día en oficina. Descarga el documento en PDF, ya que lo necesitarás para todos los trámites de exportación.",
    expectedOutput: "RUT activo descargado en PDF",
    active: true,
  },
  {
    requirementCode: "DIAN_RUT",
    stepOrder: 4,
    mode: "self_serve",
    language: "es",
    title: "Carga el RUT en Fincava",
    guidance:
      "Sube el PDF de tu RUT en la sección de documentos de cumplimiento de tu perfil en Fincava. Asegúrate de que el documento muestre estado ACTIVO y no tenga más de 6 meses de antigüedad.",
    expectedOutput: "Documento cargado y enviado para revisión",
    active: true,
  },

  // ── DIAN_RUT — assisted ────────────────────────────────────────────────────
  {
    requirementCode: "DIAN_RUT",
    stepOrder: 1,
    mode: "assisted",
    language: "es",
    title: "El oficial de campo recoge tu información",
    guidance:
      "El oficial de Fincava asignado a tu vereda visitará tu finca o te llamará por WhatsApp para recoger los datos necesarios: nombre completo, cédula, dirección de la finca y actividad económica. Ten lista tu cédula de ciudadanía.",
    expectedOutput: "Datos recopilados por el oficial",
    active: true,
  },
  {
    requirementCode: "DIAN_RUT",
    stepOrder: 2,
    mode: "assisted",
    language: "es",
    title: "El oficial diligencia el formulario",
    guidance:
      "Con tu información, el oficial completa el formulario 001 de la DIAN en el portal muisca.dian.gov.co. Te enviará un enlace de confirmación por WhatsApp para que valides los datos antes de enviar.",
    expectedOutput: "Formulario validado por el agricultor",
    active: true,
  },
  {
    requirementCode: "DIAN_RUT",
    stepOrder: 3,
    mode: "assisted",
    language: "es",
    title: "El oficial presenta el formulario y entrega el RUT",
    guidance:
      "El oficial envía el formulario y descarga el RUT activo. Si se requiere presentación presencial en la DIAN, el oficial coordina la visita. El RUT se entrega al agricultor en PDF y queda cargado en Fincava.",
    expectedOutput: "RUT activo entregado y cargado en Fincava",
    active: true,
  },

  // ── DIAN_RUT — managed ─────────────────────────────────────────────────────
  {
    requirementCode: "DIAN_RUT",
    stepOrder: 1,
    mode: "managed",
    language: "es",
    title: "Activación del servicio gestionado",
    guidance:
      "El equipo de Fincava activa tu caso de servicio gestionado. Un especialista en trámites de exportación te contactará en un plazo de 48 horas para iniciar el proceso. Solo necesitas tener disponible tu cédula de ciudadanía.",
    expectedOutput: "Caso asignado a especialista",
    active: true,
  },
  {
    requirementCode: "DIAN_RUT",
    stepOrder: 2,
    mode: "managed",
    language: "es",
    title: "El especialista gestiona el trámite completo",
    guidance:
      "El especialista de Fincava realiza todo el proceso ante la DIAN en tu nombre: diligencia el formulario 001, lo envía y obtiene el RUT activo. Si la DIAN requiere tu presencia, el especialista te acompañará o gestionará una representación válida.",
    expectedOutput: "RUT activo obtenido por el especialista",
    active: true,
  },
  {
    requirementCode: "DIAN_RUT",
    stepOrder: 3,
    mode: "managed",
    language: "es",
    title: "Entrega y carga en Fincava",
    guidance:
      "El especialista te entrega el RUT en PDF por WhatsApp y lo carga directamente en tu perfil de Fincava. El caso queda cerrado y el requisito pasa a revisión del equipo de cumplimiento.",
    expectedOutput: "RUT entregado y perfil actualizado",
    active: true,
  },

  // ── ICA_REGISTRO — self_serve ──────────────────────────────────────────────
  {
    requirementCode: "ICA_REGISTRO",
    stepOrder: 1,
    mode: "self_serve",
    language: "es",
    title: "Comunícate con la oficina regional del ICA",
    guidance:
      "Localiza la oficina regional del ICA más cercana a tu municipio en ica.gov.co/servicios/oficinas-regionales. El registro de predio y productor se inicia presencialmente o por correo electrónico a la oficina regional. Prepara: cédula, escritura o contrato de arrendamiento del predio, y datos del cultivo (especie, área en hectáreas).",
    expectedOutput: "Contacto establecido con el ICA regional",
    active: true,
  },
  {
    requirementCode: "ICA_REGISTRO",
    stepOrder: 2,
    mode: "self_serve",
    language: "es",
    title: "Programa la inspección del predio",
    guidance:
      "Un inspector del ICA coordinará una visita a tu finca para verificar el cultivo. El tiempo de espera es de 10 a 21 días hábiles dependiendo de la carga de trabajo de la oficina regional. Prepara el predio para la visita: tener identificadas las áreas de cultivo, acceso al predio y datos del RUT disponibles.",
    expectedOutput: "Visita de inspección realizada",
    active: true,
  },
  {
    requirementCode: "ICA_REGISTRO",
    stepOrder: 3,
    mode: "self_serve",
    language: "es",
    title: "Obtén el certificado de registro",
    guidance:
      "Tras la inspección aprobada, el ICA emite el certificado de registro del productor. El costo es de aproximadamente $500.000 COP. Solicita el certificado en PDF o físico. El registro tiene vigencia de 1 año y debe renovarse anualmente.",
    expectedOutput: "Certificado ICA vigente en mano",
    active: true,
  },
  {
    requirementCode: "ICA_REGISTRO",
    stepOrder: 4,
    mode: "self_serve",
    language: "es",
    title: "Carga el certificado en Fincava",
    guidance:
      "Sube el certificado ICA en la sección de documentos de tu perfil de Fincava. Asegúrate de que el documento muestre fecha de expedición y vigencia claramente.",
    expectedOutput: "Certificado cargado y enviado para revisión",
    active: true,
  },

  // ── ICA_REGISTRO — assisted ────────────────────────────────────────────────
  {
    requirementCode: "ICA_REGISTRO",
    stepOrder: 1,
    mode: "assisted",
    language: "es",
    title: "El oficial coordina el proceso con el ICA regional",
    guidance:
      "El oficial de Fincava contacta a la oficina del ICA en tu municipio, solicita la inspección en tu nombre y coordina la fecha de visita. Te notificará por WhatsApp con al menos 3 días de anticipación.",
    expectedOutput: "Inspección agendada",
    active: true,
  },
  {
    requirementCode: "ICA_REGISTRO",
    stepOrder: 2,
    mode: "assisted",
    language: "es",
    title: "Recibe al inspector en tu finca",
    guidance:
      "El inspector del ICA visitará tu finca en la fecha acordada. El oficial de Fincava puede acompañarte presencialmente si así lo solicitas. Asegúrate de estar presente para firmar los documentos de la visita.",
    expectedOutput: "Inspección realizada exitosamente",
    active: true,
  },
  {
    requirementCode: "ICA_REGISTRO",
    stepOrder: 3,
    mode: "assisted",
    language: "es",
    title: "El oficial recoge el certificado y lo carga en Fincava",
    guidance:
      "El oficial realiza el seguimiento del trámite ante el ICA y recoge el certificado cuando está listo. Lo carga directamente en tu perfil de Fincava y te envía una copia por WhatsApp.",
    expectedOutput: "Certificado ICA cargado en perfil Fincava",
    active: true,
  },

  // ── ICA_REGISTRO — managed ─────────────────────────────────────────────────
  {
    requirementCode: "ICA_REGISTRO",
    stepOrder: 1,
    mode: "managed",
    language: "es",
    title: "Activación del caso gestionado ICA",
    guidance:
      "El equipo de Fincava asigna un especialista de cumplimiento agrícola a tu caso. El especialista coordina todo el proceso ante el ICA incluyendo solicitud de inspección, acompañamiento en la visita y gestión del certificado. Tiempo estimado: 21-30 días.",
    expectedOutput: "Especialista asignado y proceso iniciado",
    active: true,
  },
  {
    requirementCode: "ICA_REGISTRO",
    stepOrder: 2,
    mode: "managed",
    language: "es",
    title: "Inspección gestionada por el especialista",
    guidance:
      "El especialista coordina la inspección del ICA y te acompaña en la visita. Se encarga de presentar toda la documentación requerida: RUT activo, escritura del predio o contrato de arrendamiento, y datos del cultivo.",
    expectedOutput: "Inspección completada con documentación en orden",
    active: true,
  },
  {
    requirementCode: "ICA_REGISTRO",
    stepOrder: 3,
    mode: "managed",
    language: "es",
    title: "Certificado entregado y perfil actualizado",
    guidance:
      "El especialista obtiene el certificado ICA, lo carga en tu perfil de Fincava y te entrega una copia física y digital. El caso queda cerrado con el requisito en estado 'enviado para revisión'.",
    expectedOutput: "Certificado ICA activo, perfil actualizado",
    active: true,
  },

  // ── FITOSANITARIO — self_serve ─────────────────────────────────────────────
  {
    requirementCode: "FITOSANITARIO",
    stepOrder: 1,
    mode: "self_serve",
    language: "es",
    title: "Solicita el certificado fitosanitario al ICA",
    guidance:
      "El Certificado Fitosanitario lo expide el ICA para cada lote de exportación. Presenta la solicitud en la oficina del ICA con: Registro ICA vigente, factura comercial del producto, detalle del empaque y destino de exportación. Este certificado se solicita por lote, no una sola vez.",
    expectedOutput: "Solicitud de certificado fitosanitario radicada",
    active: true,
  },
  {
    requirementCode: "FITOSANITARIO",
    stepOrder: 2,
    mode: "self_serve",
    language: "es",
    title: "Inspección fitosanitaria del lote",
    guidance:
      "El inspector del ICA realiza una inspección visual y de laboratorio del lote de producto. Para café: revisa humedad, presencia de plagas y cumplimiento de normas de empaque. El tiempo de respuesta es de 3 a 7 días hábiles. Costo aproximado: $200.000 COP por lote.",
    expectedOutput: "Inspección fitosanitaria aprobada",
    active: true,
  },
  {
    requirementCode: "FITOSANITARIO",
    stepOrder: 3,
    mode: "self_serve",
    language: "es",
    title: "Recibe y carga el certificado",
    guidance:
      "El ICA expide el certificado fitosanitario para el lote aprobado. Carga el certificado en Fincava asociado al lote correspondiente. Recuerda que este certificado es por exportación, no tiene vigencia permanente — deberás repetir el proceso para cada embarque.",
    expectedOutput: "Certificado fitosanitario cargado en Fincava",
    active: true,
  },

  // ── FITOSANITARIO — assisted ───────────────────────────────────────────────
  {
    requirementCode: "FITOSANITARIO",
    stepOrder: 1,
    mode: "assisted",
    language: "es",
    title: "El oficial prepara la solicitud",
    guidance:
      "El oficial de Fincava reúne los documentos necesarios para la solicitud del certificado fitosanitario: Registro ICA vigente, factura comercial y datos del lote a exportar. Coordina la solicitud ante el ICA regional en tu nombre.",
    expectedOutput: "Solicitud radicada ante el ICA",
    active: true,
  },
  {
    requirementCode: "FITOSANITARIO",
    stepOrder: 2,
    mode: "assisted",
    language: "es",
    title: "Inspección del lote con acompañamiento",
    guidance:
      "El oficial acompaña al inspector del ICA durante la visita al lote. Se asegura de que el producto cumpla con los requisitos de empaque y calidad exigidos por el mercado destino. En caso de observaciones, el oficial te guiará en los ajustes necesarios.",
    expectedOutput: "Inspección aprobada sin observaciones",
    active: true,
  },
  {
    requirementCode: "FITOSANITARIO",
    stepOrder: 3,
    mode: "assisted",
    language: "es",
    title: "Certificado entregado y cargado",
    guidance:
      "El oficial recoge el certificado fitosanitario del ICA y lo carga directamente en tu perfil de Fincava, vinculado al lote de exportación correspondiente.",
    expectedOutput: "Certificado cargado y listo para revisión",
    active: true,
  },

  // ── FITOSANITARIO — managed ────────────────────────────────────────────────
  {
    requirementCode: "FITOSANITARIO",
    stepOrder: 1,
    mode: "managed",
    language: "es",
    title: "Gestión integral del certificado fitosanitario",
    guidance:
      "El equipo de Fincava gestiona todo el proceso de certificación fitosanitaria para tu lote de exportación: preparación de documentos, solicitud ante el ICA, coordinación de la inspección y obtención del certificado. El agricultor solo necesita tener el producto listo en finca.",
    expectedOutput: "Proceso iniciado y especialista asignado",
    active: true,
  },
  {
    requirementCode: "FITOSANITARIO",
    stepOrder: 2,
    mode: "managed",
    language: "es",
    title: "Inspección y certificación gestionada",
    guidance:
      "El especialista coordina la inspección ICA, asegura el cumplimiento de los estándares del mercado destino y gestiona cualquier corrección necesaria antes de la expedición del certificado. Tiempo estimado: 5-10 días hábiles.",
    expectedOutput: "Certificado fitosanitario obtenido",
    active: true,
  },
  {
    requirementCode: "FITOSANITARIO",
    stepOrder: 3,
    mode: "managed",
    language: "es",
    title: "Entrega del certificado y cierre del caso",
    guidance:
      "El especialista entrega el certificado fitosanitario al agricultor y lo carga en el perfil de Fincava. El caso queda cerrado. Para futuros lotes de exportación se puede activar un nuevo caso gestionado.",
    expectedOutput: "Certificado entregado y caso cerrado",
    active: true,
  },
];

async function seedEnablementFlows() {
  // Remove only CC-1 enablement flows — idempotent
  await db.execute(
    sql`DELETE FROM compliance_enablement_flows WHERE requirement_code IN ('DIAN_RUT', 'ICA_REGISTRO', 'FITOSANITARIO')`,
  );

  await db.insert(complianceEnablementFlowsTable).values(flows);

  const byCode: Record<string, number> = {};
  for (const f of flows) {
    byCode[f.requirementCode] = (byCode[f.requirementCode] ?? 0) + 1;
  }

  console.log(`Seeded ${flows.length} enablement flow steps:`);
  for (const [code, n] of Object.entries(byCode)) {
    console.log(`  ${code}: ${n} steps across 3 modes`);
  }
}

seedEnablementFlows()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
