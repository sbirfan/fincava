export const SANTANDER_MUNICIPIOS = [
  "Aguada",
  "Albania",
  "Aratoca",
  "Barbosa",
  "Barichara",
  "Barrancabermeja",
  "Betulia",
  "Bolívar",
  "Bucaramanga",
  "Cabrera",
  "California",
  "Capitanejo",
  "Carcasí",
  "Cepitá",
  "Cerrito",
  "Charalá",
  "Charta",
  "Chimá (Floridablanca)",
  "Chipatá",
  "Cimitarra",
  "Concepción",
  "Confines",
  "Contratación",
  "Coromoro",
  "Curití",
  "El Carmen de Chucurí",
  "El Guacamayo",
  "El Peñón",
  "El Playón",
  "Encino",
  "Enciso",
  "Florián",
  "Floridablanca",
  "Galán",
  "Gámbita",
  "Girón",
  "Guaca",
  "Guadalupe",
  "Guapotá",
  "Guavatá",
  "Güepsa",
  "Hato",
  "Jesús María",
  "Jordán",
  "La Belleza",
  "La Paz",
  "Landázuri",
  "Lebrija",
  "Los Santos",
  "Macaravita",
  "Málaga",
  "Matanza",
  "Mogotes",
  "Molagavita",
  "Ocamonte",
  "Oiba",
  "Onzaga",
  "Palmar",
  "Palmas del Socorro",
  "Páramo",
  "Piedecuesta",
  "Pinchote",
  "Puente Nacional",
  "Puerto Parra",
  "Puerto Wilches",
  "Rionegro",
  "Sabana de Torres",
  "San Andrés",
  "San Benito",
  "San Gil",
  "San Joaquín",
  "San José de Miranda",
  "San Miguel",
  "San Vicente de Chucurí",
  "Santa Bárbara (Iscalá)",
  "Santa Helena del Opón",
  "Simacota",
  "Socorro",
  "Suaita",
  "Sucre",
  "Suratá",
  "Tona",
  "Valle de San José",
  "Vélez",
  "Vetas",
  "Villanueva",
  "Zapatoca",
];

export const VARIEDADES_CAFE = [
  "Castillo",
  "Colombia",
  "Caturra",
  "Borbón",
  "Geisha / Gesha",
  "Tabi",
  "Cenicafé 1",
  "F6",
  "Típica",
  "Otro",
];

export const METODOS_SECADO = [
  { value: "marquesina", label: "Secado en marquesina" },
  { value: "sol", label: "Secado al sol (patio/zaranda)" },
  { value: "mecanico", label: "Secado mecánico (guardiola)" },
  { value: "combinado", label: "Combinado (sol + marquesina)" },
  { value: "otro", label: "Otro" },
];

export const ACCESO_AGUA_OPTIONS = [
  { value: "fuente_propia", label: "Sí, tiene fuente propia (nacedero/pozo)" },
  { value: "acequia", label: "Sí, acequia o reservorio comunitario" },
  { value: "no", label: "No tiene agua en finca" },
];

export const TENENCIA_TIERRA_OPTIONS = [
  { value: "propia", label: "Propia" },
  { value: "arrendada", label: "Arrendada" },
  { value: "familiar", label: "Familiar (prestada)" },
  { value: "otra", label: "Otra" },
];

export const TIPO_COMPRADOR_OPTIONS = [
  { value: "intermediario", label: "Intermediario / Coyote" },
  { value: "cooperativa", label: "Cooperativa" },
  { value: "federacion", label: "Federación Nacional de Cafeteros" },
  { value: "exportadora", label: "Empresa exportadora directa" },
  { value: "varios", label: "Varios compradores" },
];

export const PRECIO_VENTA_BANDA_OPTIONS = [
  { value: "menos_1m", label: "Menos de $1.000.000 COP/carga" },
  { value: "1m_1_5m", label: "$1.000.000 – $1.500.000 COP/carga" },
  { value: "1_5m_2m", label: "$1.500.000 – $2.000.000 COP/carga" },
  { value: "mas_2m", label: "Más de $2.000.000 COP/carga" },
];

export const DEUDA_ACTUAL_OPTIONS = [
  { value: "sin_deuda", label: "Sin deuda" },
  { value: "menos_5m", label: "Menos de $5.000.000 COP" },
  { value: "5m_20m", label: "Entre $5.000.000 y $20.000.000 COP" },
  { value: "mas_20m", label: "Más de $20.000.000 COP" },
];

export const USO_CAPITAL_OPTIONS = [
  { value: "insumos", label: "Insumos agrícolas (fertilizantes, fungicidas)" },
  { value: "mano_obra", label: "Mano de obra (recolección, beneficio)" },
  { value: "pago_deudas", label: "Pago de deudas existentes" },
  { value: "infraestructura", label: "Inversión en infraestructura" },
  { value: "hogar", label: "Necesidades del hogar / educación" },
  { value: "ahorro", label: "Ahorro / fondo de emergencia" },
  { value: "otro", label: "Otro" },
];

export const SITUACION_ECONOMICA_OPTIONS = [
  { value: "muy_dificil", label: "Muy difícil" },
  { value: "dificil", label: "Difícil" },
  { value: "regular", label: "Regular" },
  { value: "buena", label: "Buena" },
  { value: "muy_buena", label: "Muy buena" },
];

export const HORIZONTE_INVERSION_OPTIONS = [
  { value: "corto", label: "Corto plazo (0–6 meses)" },
  { value: "mediano", label: "Mediano plazo (6–18 meses)" },
  { value: "largo", label: "Largo plazo (más de 18 meses)" },
];

export const META_PRINCIPAL_OPTIONS = [
  { value: "aumentar_volumen", label: "Aumentar volumen de producción" },
  { value: "mejorar_calidad", label: "Mejorar calidad del café" },
  { value: "certificarme", label: "Certificarme para exportar" },
  { value: "diversificar", label: "Diversificar cultivos" },
  { value: "reducir_costos", label: "Reducir costos de producción" },
  { value: "mejorar_ingresos", label: "Mejorar ingresos familiares" },
];

export const DESAFIOS_OPTIONS = [
  { value: "financiamiento", label: "Acceso a financiamiento" },
  { value: "precio_bajo", label: "Precio bajo al productor" },
  { value: "asistencia_tecnica", label: "Falta de asistencia técnica" },
  { value: "fitosanitario", label: "Problemas fitosanitarios (plagas/enfermedades)" },
  { value: "maquinaria", label: "Falta de maquinaria o equipos" },
  { value: "acceso_vial", label: "Acceso vial deficiente" },
  { value: "clima", label: "Clima / sequías / lluvias excesivas" },
  { value: "mano_obra", label: "Escasez de mano de obra" },
  { value: "mercados_premium", label: "Acceso a mercados premium" },
  { value: "tramites", label: "Trámites y documentación" },
];

export const SALUD_PLANTAS_OPTIONS = [
  { value: "excelente", label: "Excelente" },
  { value: "buena", label: "Buena" },
  { value: "regular", label: "Regular" },
  { value: "mala", label: "Mala" },
  { value: "muy_mala", label: "Muy mala" },
];

export const INFRAESTRUCTURA_OPTIONS = [
  { value: "adecuada", label: "Adecuada (beneficiadero, secadero en buen estado)" },
  { value: "basica", label: "Básica (funcional pero limitada)" },
  { value: "deficiente", label: "Deficiente (requiere inversión urgente)" },
];

export const ACCESO_VIAL_OFFICER_OPTIONS = [
  { value: "bueno", label: "Bueno (carretera pavimentada o en buen estado)" },
  { value: "regular", label: "Regular (carretera destapada transitable)" },
  { value: "malo", label: "Malo (difícil acceso, requiere mejoras)" },
];

export const DISPOSICION_AGRICULTOR_OPTIONS = [
  { value: "muy_dispuesto", label: "Muy dispuesto al cambio" },
  { value: "dispuesto", label: "Dispuesto" },
  { value: "neutral", label: "Neutral" },
  { value: "no_dispuesto", label: "No dispuesto" },
];

export const SCALE_1_5 = [1, 2, 3, 4, 5] as const;
