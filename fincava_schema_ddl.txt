-- Fincava Database DDL
-- Generated: 2026-05-01T16:15:53.429Z

CREATE TABLE ai_outputs (
    id INTEGER NOT NULL DEFAULT nextval('ai_outputs_id_seq'::regclass),
    supplier_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ai_model TEXT,
    call_type TEXT,
    export_readiness_score SMALLINT,
    pathway TEXT,
    capital_capacity_cop INTEGER,
    compliance_gaps TEXT,
    gap_analysis TEXT,
    document_content TEXT,
    whatsapp_message_sent TEXT
);

CREATE TABLE buyer_admin_actions (
    id INTEGER NOT NULL DEFAULT nextval('buyer_admin_actions_id_seq'::regclass),
    actor_admin_id INTEGER NOT NULL,
    buyer_profile_id INTEGER NOT NULL,
    action_type CHARACTER VARYING(50) NOT NULL,
    payload JSONB,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE buyer_gap_briefs (
    id INTEGER NOT NULL DEFAULT nextval('buyer_gap_briefs_id_seq'::regclass),
    buyer_profile_id INTEGER NOT NULL,
    gap_type CHARACTER VARYING(30) NOT NULL,
    priority CHARACTER VARYING(10) NOT NULL,
    pipeline_action CHARACTER VARYING(30) NOT NULL,
    is_real_gap BOOLEAN NOT NULL DEFAULT true,
    search_category CHARACTER VARYING(50),
    search_region TEXT,
    required_attributes ARRAY,
    volume_target_mt NUMERIC,
    buyer_urgency_note TEXT,
    discovery_search_terms ARRAY,
    ingestion_batch_id INTEGER,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE buyer_matches (
    id INTEGER NOT NULL DEFAULT nextval('buyer_matches_id_seq'::regclass),
    buyer_profile_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    match_score NUMERIC NOT NULL,
    score_breakdown JSONB NOT NULL,
    disqualifiers ARRAY,
    match_notes TEXT,
    sections_at_run ARRAY NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE buyer_profiles (
    id INTEGER NOT NULL DEFAULT nextval('buyer_profiles_id_seq'::regclass),
    user_id INTEGER NOT NULL,
    company_name TEXT,
    country TEXT,
    destination_port TEXT,
    target_products ARRAY NOT NULL DEFAULT '{}'::text[],
    preferred_incoterm TEXT,
    intended_volume_mt REAL,
    import_frequency TEXT,
    onboarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    state CHARACTER VARYING(20) NOT NULL DEFAULT 'REGISTERED'::character varying,
    volume_band CHARACTER VARYING(20),
    required_certs_p1 ARRAY NOT NULL DEFAULT '{}'::text[],
    time_to_first_order CHARACTER VARYING(20),
    p2_completion_pct INTEGER NOT NULL DEFAULT 0,
    p2_sections_done ARRAY NOT NULL DEFAULT '{}'::text[],
    matching_run_count INTEGER NOT NULL DEFAULT 0,
    last_matched_at TIMESTAMP WITH TIME ZONE,
    gap_flag_count INTEGER NOT NULL DEFAULT 0,
    subscription_recommendation CHARACTER VARYING(10),
    traceability_level CHARACTER VARYING(20),
    existing_colombia_rel BOOLEAN,
    trade_finance_open BOOLEAN NOT NULL DEFAULT false,
    audit_standard CHARACTER VARYING(50),
    logistics_partner TEXT,
    platform_intent ARRAY NOT NULL DEFAULT '{}'::text[],
    sample_ready BOOLEAN NOT NULL DEFAULT false,
    prev_sourcing_channel CHARACTER VARYING(100),
    discovery_budget_band CHARACTER VARYING(20),
    supplier_dev_open BOOLEAN NOT NULL DEFAULT false,
    supplier_type_pref ARRAY NOT NULL DEFAULT '{}'::text[],
    social_impact_reqs ARRAY NOT NULL DEFAULT '{}'::text[],
    early_stage_supplier_open BOOLEAN NOT NULL DEFAULT false,
    language_preference ARRAY NOT NULL DEFAULT '{}'::text[],
    marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
    marketing_topics ARRAY NOT NULL DEFAULT '{}'::text[]
);

CREATE TABLE campaign_logs (
    id INTEGER NOT NULL DEFAULT nextval('campaign_logs_id_seq'::regclass),
    campaign_id INTEGER NOT NULL,
    profile_id INTEGER,
    email TEXT NOT NULL,
    status CHARACTER VARYING(10) NOT NULL,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE certifications (
    id INTEGER NOT NULL DEFAULT nextval('certifications_id_seq'::regclass),
    company_id INTEGER NOT NULL DEFAULT nextval('certifications_company_id_seq'::regclass),
    type TEXT NOT NULL,
    issuer TEXT NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    document_url TEXT,
    verified BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE companies (
    id INTEGER NOT NULL DEFAULT nextval('companies_id_seq'::regclass),
    user_id INTEGER NOT NULL DEFAULT nextval('companies_user_id_seq'::regclass),
    name TEXT NOT NULL,
    type USER-DEFINED NOT NULL DEFAULT 'EXPORTER'::company_type,
    country TEXT NOT NULL,
    region TEXT,
    description TEXT NOT NULL DEFAULT ''::text,
    logo_url TEXT,
    website TEXT,
    verified BOOLEAN NOT NULL DEFAULT false,
    origin_story TEXT,
    farmer_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    trust_score REAL NOT NULL DEFAULT 0,
    subscription_tier TEXT NOT NULL DEFAULT 'FREE'::text,
    response_time_hours REAL,
    export_destinations ARRAY NOT NULL DEFAULT '{}'::text[]
);

CREATE TABLE compliance_docs (
    id INTEGER NOT NULL DEFAULT nextval('compliance_docs_id_seq'::regclass),
    supplier_id INTEGER NOT NULL,
    rut_dian BOOLEAN NOT NULL DEFAULT false,
    ica_registro BOOLEAN NOT NULL DEFAULT false,
    fitosanitario_cert BOOLEAN NOT NULL DEFAULT false,
    dian_exportador BOOLEAN NOT NULL DEFAULT false,
    compliance_score SMALLINT,
    last_reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE compliance_requirements (
    id INTEGER NOT NULL DEFAULT nextval('compliance_requirements_id_seq'::regclass),
    country TEXT NOT NULL,
    product_type TEXT NOT NULL,
    requirement TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''::text,
    mandatory INTEGER NOT NULL DEFAULT 1,
    category TEXT NOT NULL DEFAULT 'DOCUMENT'::text
);

CREATE TABLE economics (
    id INTEGER NOT NULL DEFAULT nextval('economics_id_seq'::regclass),
    supplier_id INTEGER NOT NULL,
    tipo_comprador TEXT,
    volumen_kg_ultima_cosecha INTEGER,
    precio_venta_banda TEXT,
    tiempo_pago_dias INTEGER,
    deuda_actual TEXT,
    uso_capital ARRAY,
    comodidad_pagos TEXT,
    personas_dependientes INTEGER,
    otras_fuentes_ingreso TEXT,
    situacion_economica TEXT,
    interes_canal_premium BOOLEAN,
    conoce_precio_exportacion BOOLEAN,
    ha_intentado_exportar BOOLEAN
);

CREATE TABLE email_verification_tokens (
    id INTEGER NOT NULL DEFAULT nextval('email_verification_tokens_id_seq'::regclass),
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE farms (
    id INTEGER NOT NULL DEFAULT nextval('farms_id_seq'::regclass),
    supplier_id INTEGER NOT NULL,
    cultivo_principal TEXT,
    variedad_cafe TEXT,
    hectareas_produccion NUMERIC,
    edad_plantas_anos INTEGER,
    cosechas_por_ano INTEGER,
    metodo_secado TEXT,
    acceso_agua TEXT,
    anos_en_finca INTEGER,
    tenencia_tierra TEXT,
    asistencia_tecnica TEXT
);

CREATE TABLE inquiries (
    id INTEGER NOT NULL DEFAULT nextval('inquiries_id_seq'::regclass),
    product_id INTEGER NOT NULL DEFAULT nextval('inquiries_product_id_seq'::regclass),
    buyer_email TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    company TEXT NOT NULL,
    country TEXT NOT NULL,
    message TEXT NOT NULL,
    quantity_kg REAL,
    status TEXT NOT NULL DEFAULT 'PENDING'::text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE interaction_logs (
    id INTEGER NOT NULL DEFAULT nextval('interaction_logs_id_seq'::regclass),
    event_type TEXT NOT NULL,
    actor_id INTEGER,
    actor_type TEXT,
    reference_id INTEGER,
    reference_type TEXT,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE interactions (
    id INTEGER NOT NULL DEFAULT nextval('interactions_id_seq'::regclass),
    supplier_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    interaction_type TEXT,
    actor TEXT,
    notes TEXT,
    metadata JSONB
);

CREATE TABLE loans (
    id INTEGER NOT NULL DEFAULT nextval('loans_id_seq'::regclass),
    buyer_id INTEGER NOT NULL DEFAULT nextval('loans_buyer_id_seq'::regclass),
    order_id INTEGER DEFAULT nextval('loans_order_id_seq'::regclass),
    principal_usd REAL NOT NULL,
    fee_usd REAL NOT NULL,
    total_repayment_usd REAL NOT NULL,
    apr_percent REAL NOT NULL DEFAULT 12,
    term_days INTEGER NOT NULL DEFAULT 30,
    status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::loan_status,
    due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    credit_score_at_issuance INTEGER NOT NULL DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE marketing_campaigns (
    id INTEGER NOT NULL DEFAULT nextval('marketing_campaigns_id_seq'::regclass),
    admin_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    html TEXT NOT NULL,
    text_body TEXT,
    topic CHARACTER VARYING(80),
    country CHARACTER VARYING(80),
    state_filter CHARACTER VARYING(40),
    status CHARACTER VARYING(20) NOT NULL DEFAULT 'pending'::character varying,
    total_recipients INTEGER NOT NULL DEFAULT 0,
    sent INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE messages (
    id INTEGER NOT NULL DEFAULT nextval('messages_id_seq'::regclass),
    sender_id INTEGER NOT NULL DEFAULT nextval('messages_sender_id_seq'::regclass),
    receiver_id INTEGER NOT NULL DEFAULT nextval('messages_receiver_id_seq'::regclass),
    content TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE officer_applications (
    id INTEGER NOT NULL DEFAULT nextval('officer_applications_id_seq'::regclass),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    department TEXT NOT NULL,
    municipio TEXT NOT NULL,
    languages TEXT,
    experience_years INTEGER,
    has_motorcycle BOOLEAN,
    available_days ARRAY,
    motivation TEXT,
    referral_code TEXT,
    status TEXT NOT NULL DEFAULT 'pending'::text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    id INTEGER NOT NULL DEFAULT nextval('order_items_id_seq'::regclass),
    order_id INTEGER NOT NULL DEFAULT nextval('order_items_order_id_seq'::regclass),
    product_id INTEGER NOT NULL DEFAULT nextval('order_items_product_id_seq'::regclass),
    quantity_kg REAL NOT NULL,
    price_per_kg REAL NOT NULL,
    total_usd REAL NOT NULL,
    supplier_id INTEGER
);

CREATE TABLE orders (
    id INTEGER NOT NULL DEFAULT nextval('orders_id_seq'::regclass),
    buyer_id INTEGER NOT NULL DEFAULT nextval('orders_buyer_id_seq'::regclass),
    status USER-DEFINED NOT NULL DEFAULT 'INQUIRY'::order_status,
    total_usd REAL NOT NULL DEFAULT 0,
    incoterm TEXT NOT NULL DEFAULT 'FOB'::text,
    destination_port TEXT,
    shipping_method TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    fee_percentage REAL,
    fee_amount_usd REAL,
    fee_status TEXT
);

CREATE TABLE origin_stories (
    id INTEGER NOT NULL DEFAULT nextval('origin_stories_id_seq'::regclass),
    product_id INTEGER NOT NULL,
    farmer_name TEXT NOT NULL,
    farmer_photo TEXT,
    farm_name TEXT NOT NULL,
    region TEXT NOT NULL,
    elevation TEXT,
    farm_size_ha REAL,
    years_farming INTEGER,
    story TEXT NOT NULL,
    challenges TEXT NOT NULL,
    impact TEXT NOT NULL,
    images ARRAY NOT NULL DEFAULT '{}'::text[],
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE password_reset_tokens (
    id INTEGER NOT NULL DEFAULT nextval('password_reset_tokens_id_seq'::regclass),
    user_id INTEGER NOT NULL DEFAULT nextval('password_reset_tokens_user_id_seq'::regclass),
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE payment_milestones (
    id INTEGER NOT NULL DEFAULT nextval('payment_milestones_id_seq'::regclass),
    order_id INTEGER NOT NULL DEFAULT nextval('payment_milestones_order_id_seq'::regclass),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''::text,
    amount_usd REAL NOT NULL,
    percentage REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING'::text,
    due_date TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE product_analytics (
    id INTEGER NOT NULL DEFAULT nextval('product_analytics_id_seq'::regclass),
    product_id INTEGER NOT NULL DEFAULT nextval('product_analytics_product_id_seq'::regclass),
    views INTEGER NOT NULL DEFAULT 0,
    inquiries INTEGER NOT NULL DEFAULT 0,
    saves INTEGER NOT NULL DEFAULT 0,
    rfq_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE product_placeholders (
    id INTEGER NOT NULL DEFAULT nextval('product_placeholders_id_seq'::regclass),
    supplier_id INTEGER NOT NULL,
    category_hint TEXT,
    data_origin TEXT NOT NULL DEFAULT 'inferred'::text,
    verification_status TEXT NOT NULL DEFAULT 'unverified'::text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id INTEGER NOT NULL DEFAULT nextval('products_id_seq'::regclass),
    company_id INTEGER NOT NULL DEFAULT nextval('products_company_id_seq'::regclass),
    name TEXT NOT NULL,
    category USER-DEFINED NOT NULL DEFAULT 'COFFEE'::product_category,
    sub_category TEXT,
    description TEXT NOT NULL,
    origin TEXT NOT NULL,
    altitude TEXT,
    process TEXT,
    variety TEXT,
    min_order_kg REAL NOT NULL DEFAULT 100,
    max_order_kg REAL,
    price_per_kg_usd REAL NOT NULL,
    available_kg REAL NOT NULL DEFAULT 0,
    harvest_season TEXT,
    images ARRAY NOT NULL DEFAULT '{}'::text[],
    certifications ARRAY NOT NULL DEFAULT '{}'::text[],
    cupping REAL,
    active BOOLEAN NOT NULL DEFAULT true,
    featured BOOLEAN NOT NULL DEFAULT false,
    origin_story TEXT,
    farmer_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    farm_name TEXT,
    farm_lat REAL,
    farm_lng REAL,
    harvest_date TIMESTAMP WITH TIME ZONE,
    smallholder BOOLEAN NOT NULL DEFAULT false,
    women_led BOOLEAN NOT NULL DEFAULT false,
    direct_trade BOOLEAN NOT NULL DEFAULT false,
    climate_resilient BOOLEAN NOT NULL DEFAULT false,
    organic BOOLEAN NOT NULL DEFAULT false,
    families_supported INTEGER,
    supplier_id INTEGER
);

CREATE TABLE profiles (
    id INTEGER NOT NULL DEFAULT nextval('profiles_id_seq'::regclass),
    user_id INTEGER NOT NULL DEFAULT nextval('profiles_user_id_seq'::regclass),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    country TEXT,
    language TEXT NOT NULL DEFAULT 'en'::text,
    avatar_url TEXT
);

CREATE TABLE repayments (
    id INTEGER NOT NULL DEFAULT nextval('repayments_id_seq'::regclass),
    loan_id INTEGER NOT NULL DEFAULT nextval('repayments_loan_id_seq'::regclass),
    amount_usd REAL NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
    id INTEGER NOT NULL DEFAULT nextval('reviews_id_seq'::regclass),
    author_id INTEGER NOT NULL DEFAULT nextval('reviews_author_id_seq'::regclass),
    product_id INTEGER NOT NULL DEFAULT nextval('reviews_product_id_seq'::regclass),
    rating INTEGER NOT NULL,
    comment TEXT,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE rfq_responses (
    id INTEGER NOT NULL DEFAULT nextval('rfq_responses_id_seq'::regclass),
    rfq_id INTEGER NOT NULL DEFAULT nextval('rfq_responses_rfq_id_seq'::regclass),
    company_id INTEGER NOT NULL DEFAULT nextval('rfq_responses_supplier_id_seq'::regclass),
    price_per_kg_usd REAL NOT NULL,
    lead_time_days INTEGER NOT NULL,
    message TEXT NOT NULL,
    awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE rfqs (
    id INTEGER NOT NULL DEFAULT nextval('rfqs_id_seq'::regclass),
    buyer_id INTEGER NOT NULL DEFAULT nextval('rfqs_buyer_id_seq'::regclass),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    product_category TEXT NOT NULL,
    quantity_kg REAL NOT NULL,
    target_price_usd REAL,
    destination TEXT NOT NULL,
    destination_port TEXT,
    incoterm TEXT NOT NULL DEFAULT 'FOB'::text,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status USER-DEFINED NOT NULL DEFAULT 'OPEN'::rfq_status,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    origin_requirements TEXT,
    processing_method CHARACTER VARYING(50),
    quality_grade CHARACTER VARYING(100),
    required_certifications ARRAY NOT NULL DEFAULT '{}'::text[],
    preferred_certifications ARRAY NOT NULL DEFAULT '{}'::text[],
    required_documents ARRAY NOT NULL DEFAULT '{}'::text[],
    import_regs TEXT,
    annual_volume_mt NUMERIC,
    moq_mt NUMERIC,
    order_frequency CHARACTER VARYING(30),
    price_range_min_usd_kg NUMERIC,
    price_range_max_usd_kg NUMERIC,
    incoterms CHARACTER VARYING(10),
    lead_time_weeks INTEGER,
    cold_chain_required BOOLEAN NOT NULL DEFAULT false,
    packaging_requirements ARRAY NOT NULL DEFAULT '{}'::text[]
);

CREATE TABLE shipments (
    id INTEGER NOT NULL DEFAULT nextval('shipments_id_seq'::regclass),
    order_id INTEGER NOT NULL DEFAULT nextval('shipments_order_id_seq'::regclass),
    status USER-DEFINED NOT NULL DEFAULT 'BOOKED'::shipment_status,
    origin_port TEXT NOT NULL,
    destination_port TEXT NOT NULL,
    carrier TEXT,
    tracking_number TEXT,
    container_number TEXT,
    eta TIMESTAMP WITH TIME ZONE,
    departed_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE staff_roles (
    id INTEGER NOT NULL DEFAULT nextval('staff_roles_id_seq'::regclass),
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    assigned_by INTEGER NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
    id INTEGER NOT NULL DEFAULT nextval('subscriptions_id_seq'::regclass),
    company_id INTEGER NOT NULL DEFAULT nextval('subscriptions_company_id_seq'::regclass),
    tier USER-DEFINED NOT NULL DEFAULT 'FREE'::subscription_tier,
    active INTEGER NOT NULL DEFAULT 1,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE supplier_contacts (
    id INTEGER NOT NULL DEFAULT nextval('supplier_contacts_id_seq'::regclass),
    supplier_id INTEGER NOT NULL,
    contact_type TEXT NOT NULL,
    contact_value TEXT,
    source TEXT,
    consent_status TEXT DEFAULT 'UNKNOWN'::text,
    approved_for_outreach BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE supplier_evaluations (
    id INTEGER NOT NULL DEFAULT nextval('supplier_evaluations_id_seq'::regclass),
    supplier_id INTEGER NOT NULL,
    eligibility_status USER-DEFINED,
    commercial_score INTEGER,
    sellable_status USER-DEFINED,
    pathway USER-DEFINED,
    score_snapshot JSONB,
    threshold_version CHARACTER VARYING(64) NOT NULL,
    evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE supplier_ingestion_batches (
    id INTEGER NOT NULL DEFAULT nextval('supplier_ingestion_batches_id_seq'::regclass),
    batch_uuid CHARACTER VARYING(36) NOT NULL,
    created_by_admin_id INTEGER NOT NULL,
    status USER-DEFINED NOT NULL DEFAULT 'DRAFT'::batch_status,
    batch_size INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    submitted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE supplier_state_transitions (
    id INTEGER NOT NULL DEFAULT nextval('supplier_state_transitions_id_seq'::regclass),
    supplier_id INTEGER NOT NULL,
    from_state USER-DEFINED,
    to_state USER-DEFINED NOT NULL,
    threshold_version CHARACTER VARYING(64) NOT NULL,
    commercial_score_at_transition INTEGER,
    actor USER-DEFINED NOT NULL,
    justification TEXT,
    evaluation_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE suppliers (
    id INTEGER NOT NULL DEFAULT nextval('suppliers_id_seq'::regclass),
    nombre_completo TEXT NOT NULL,
    whatsapp_number TEXT,
    municipio TEXT NOT NULL,
    vereda TEXT,
    supplier_type USER-DEFINED NOT NULL DEFAULT 'FARMER'::supplier_type,
    registered_by TEXT,
    status USER-DEFINED NOT NULL DEFAULT 'ACTIVE'::supplier_status,
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    department TEXT,
    eligibility_status USER-DEFINED,
    commercial_score INTEGER,
    sellable_status USER-DEFINED,
    graduation_pathway USER-DEFINED,
    next_actions JSONB,
    commercial_score_at_onboarding INTEGER,
    last_evaluated_at TIMESTAMP WITH TIME ZONE,
    threshold_version CHARACTER VARYING(64),
    email TEXT,
    normalized_name TEXT,
    description TEXT,
    source_url TEXT,
    source_type TEXT,
    supplier_fingerprint TEXT,
    claim_status USER-DEFINED DEFAULT 'UNCLAIMED'::claim_status,
    claim_token TEXT,
    ingestion_source USER-DEFINED DEFAULT 'FIELD_COLLECTED'::ingestion_source,
    ingestion_status USER-DEFINED,
    created_by_admin_id INTEGER,
    batch_id INTEGER,
    country TEXT DEFAULT 'Colombia'::text,
    data_completeness_score NUMERIC,
    confidence_score NUMERIC,
    custom_supplier_type CHARACTER VARYING(120),
    published_to_origin_stories BOOLEAN NOT NULL DEFAULT false,
    origin_story_image_url TEXT
);

CREATE TABLE trade_history (
    id INTEGER NOT NULL DEFAULT nextval('trade_history_id_seq'::regclass),
    company_id INTEGER NOT NULL DEFAULT nextval('trade_history_company_id_seq'::regclass),
    product TEXT NOT NULL,
    volume_kg REAL NOT NULL,
    destination TEXT NOT NULL,
    year INTEGER NOT NULL,
    value_usd REAL
);

CREATE TABLE trust_scores (
    id INTEGER NOT NULL DEFAULT nextval('trust_scores_id_seq'::regclass),
    company_id INTEGER NOT NULL DEFAULT nextval('trust_scores_company_id_seq'::regclass),
    score REAL NOT NULL DEFAULT 0,
    orders_completed REAL NOT NULL DEFAULT 0,
    certifications_count REAL NOT NULL DEFAULT 0,
    response_time REAL NOT NULL DEFAULT 0,
    profile_completeness REAL NOT NULL DEFAULT 0,
    trade_volume REAL NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id INTEGER NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role USER-DEFINED NOT NULL DEFAULT 'BUYER'::role,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    email_verified_at TIMESTAMP WITH TIME ZONE
);