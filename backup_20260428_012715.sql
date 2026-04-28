--
-- PostgreSQL database dump
--

\restrict pPtVxZ3hsfHTjB6njCCZqUwkeZatWTaXLIkX3skdNDCN16CBVJuv0hdhlYim7wg

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO postgres;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: actor; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.actor AS ENUM (
    'SYSTEM',
    'ADMIN',
    'FOUNDER'
);


ALTER TYPE public.actor OWNER TO postgres;

--
-- Name: company_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.company_type AS ENUM (
    'COOPERATIVE',
    'EXPORTER',
    'SMALLHOLDER',
    'IMPORTER',
    'DISTRIBUTOR',
    'ROASTER',
    'MANUFACTURER'
);


ALTER TYPE public.company_type OWNER TO postgres;

--
-- Name: eligibility_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.eligibility_status AS ENUM (
    'PASS',
    'FAIL'
);


ALTER TYPE public.eligibility_status OWNER TO postgres;

--
-- Name: graduation_pathway; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.graduation_pathway AS ENUM (
    'A',
    'B',
    'C',
    'D'
);


ALTER TYPE public.graduation_pathway OWNER TO postgres;

--
-- Name: loan_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.loan_status AS ENUM (
    'ACTIVE',
    'REPAID',
    'DEFAULTED',
    'CANCELLED'
);


ALTER TYPE public.loan_status OWNER TO postgres;

--
-- Name: order_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_status AS ENUM (
    'INQUIRY',
    'SAMPLE_REQUESTED',
    'QUOTED',
    'CONFIRMED',
    'IN_PRODUCTION',
    'SHIPPED',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public.order_status OWNER TO postgres;

--
-- Name: product_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.product_category AS ENUM (
    'COFFEE',
    'CACAO',
    'AVOCADO',
    'EXOTIC_FRUIT',
    'SUPERFOOD',
    'PROCESSED',
    'TEXTILE',
    'OTHER'
);


ALTER TYPE public.product_category OWNER TO postgres;

--
-- Name: rfq_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.rfq_status AS ENUM (
    'OPEN',
    'CLOSED',
    'AWARDED',
    'CANCELLED'
);


ALTER TYPE public.rfq_status OWNER TO postgres;

--
-- Name: role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.role AS ENUM (
    'BUYER',
    'SUPPLIER',
    'ADMIN'
);


ALTER TYPE public.role OWNER TO postgres;

--
-- Name: sellable_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sellable_status AS ENUM (
    'NOT_READY',
    'ELIGIBLE',
    'SELLABLE',
    'PUBLISHED'
);


ALTER TYPE public.sellable_status OWNER TO postgres;

--
-- Name: shipment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.shipment_status AS ENUM (
    'BOOKED',
    'PICKUP',
    'IN_TRANSIT',
    'CUSTOMS',
    'DELIVERED',
    'DELAYED'
);


ALTER TYPE public.shipment_status OWNER TO postgres;

--
-- Name: subscription_tier; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.subscription_tier AS ENUM (
    'FREE',
    'PRO',
    'PREMIUM'
);


ALTER TYPE public.subscription_tier OWNER TO postgres;

--
-- Name: supplier_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.supplier_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'PENDING'
);


ALTER TYPE public.supplier_status OWNER TO postgres;

--
-- Name: supplier_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.supplier_type AS ENUM (
    'FARMER',
    'COOPERATIVE',
    'EXPORTER'
);


ALTER TYPE public.supplier_type OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: postgres
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: postgres
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: postgres
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: ai_outputs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_outputs (
    id integer NOT NULL,
    supplier_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ai_model text,
    call_type text,
    export_readiness_score smallint,
    pathway text,
    capital_capacity_cop integer,
    compliance_gaps text,
    gap_analysis text,
    document_content text,
    whatsapp_message_sent text
);


ALTER TABLE public.ai_outputs OWNER TO postgres;

--
-- Name: ai_outputs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_outputs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_outputs_id_seq OWNER TO postgres;

--
-- Name: ai_outputs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_outputs_id_seq OWNED BY public.ai_outputs.id;


--
-- Name: buyer_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.buyer_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    company_name text,
    country text,
    destination_port text,
    target_products text[] DEFAULT '{}'::text[] NOT NULL,
    preferred_incoterm text,
    intended_volume_mt real,
    import_frequency text,
    onboarded_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.buyer_profiles OWNER TO postgres;

--
-- Name: buyer_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.buyer_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.buyer_profiles_id_seq OWNER TO postgres;

--
-- Name: buyer_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.buyer_profiles_id_seq OWNED BY public.buyer_profiles.id;


--
-- Name: certifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certifications (
    id integer NOT NULL,
    company_id integer NOT NULL,
    type text NOT NULL,
    issuer text NOT NULL,
    expiry_date timestamp with time zone,
    document_url text,
    verified boolean DEFAULT false NOT NULL
);


ALTER TABLE public.certifications OWNER TO postgres;

--
-- Name: certifications_company_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certifications_company_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.certifications_company_id_seq OWNER TO postgres;

--
-- Name: certifications_company_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.certifications_company_id_seq OWNED BY public.certifications.company_id;


--
-- Name: certifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.certifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.certifications_id_seq OWNER TO postgres;

--
-- Name: certifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.certifications_id_seq OWNED BY public.certifications.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    type public.company_type DEFAULT 'EXPORTER'::public.company_type NOT NULL,
    country text NOT NULL,
    region text,
    description text DEFAULT ''::text NOT NULL,
    logo_url text,
    website text,
    verified boolean DEFAULT false NOT NULL,
    origin_story text,
    farmer_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    trust_score real DEFAULT 0 NOT NULL,
    subscription_tier text DEFAULT 'FREE'::text NOT NULL,
    response_time_hours real,
    export_destinations text[] DEFAULT '{}'::text[] NOT NULL
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: companies_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_user_id_seq OWNER TO postgres;

--
-- Name: companies_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_user_id_seq OWNED BY public.companies.user_id;


--
-- Name: compliance_docs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.compliance_docs (
    id integer NOT NULL,
    supplier_id integer NOT NULL,
    rut_dian boolean DEFAULT false NOT NULL,
    ica_registro boolean DEFAULT false NOT NULL,
    fitosanitario_cert boolean DEFAULT false NOT NULL,
    dian_exportador boolean DEFAULT false NOT NULL,
    compliance_score smallint,
    last_reviewed_at timestamp with time zone
);


ALTER TABLE public.compliance_docs OWNER TO postgres;

--
-- Name: compliance_docs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.compliance_docs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.compliance_docs_id_seq OWNER TO postgres;

--
-- Name: compliance_docs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.compliance_docs_id_seq OWNED BY public.compliance_docs.id;


--
-- Name: compliance_requirements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.compliance_requirements (
    id integer NOT NULL,
    country text NOT NULL,
    product_type text NOT NULL,
    requirement text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    mandatory integer DEFAULT 1 NOT NULL,
    category text DEFAULT 'DOCUMENT'::text NOT NULL
);


ALTER TABLE public.compliance_requirements OWNER TO postgres;

--
-- Name: compliance_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.compliance_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.compliance_requirements_id_seq OWNER TO postgres;

--
-- Name: compliance_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.compliance_requirements_id_seq OWNED BY public.compliance_requirements.id;


--
-- Name: economics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.economics (
    id integer NOT NULL,
    supplier_id integer NOT NULL,
    tipo_comprador text,
    volumen_kg_ultima_cosecha integer,
    precio_venta_banda text,
    tiempo_pago_dias integer,
    deuda_actual text,
    uso_capital text[],
    comodidad_pagos text,
    personas_dependientes integer,
    otras_fuentes_ingreso text,
    situacion_economica text,
    interes_canal_premium boolean,
    conoce_precio_exportacion boolean,
    ha_intentado_exportar boolean
);


ALTER TABLE public.economics OWNER TO postgres;

--
-- Name: economics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.economics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.economics_id_seq OWNER TO postgres;

--
-- Name: economics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.economics_id_seq OWNED BY public.economics.id;


--
-- Name: email_verification_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_verification_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_verification_tokens OWNER TO postgres;

--
-- Name: email_verification_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_verification_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_verification_tokens_id_seq OWNER TO postgres;

--
-- Name: email_verification_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_verification_tokens_id_seq OWNED BY public.email_verification_tokens.id;


--
-- Name: farms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.farms (
    id integer NOT NULL,
    supplier_id integer NOT NULL,
    cultivo_principal text,
    variedad_cafe text,
    hectareas_produccion numeric(6,2),
    edad_plantas_anos integer,
    cosechas_por_ano integer,
    metodo_secado text,
    acceso_agua text,
    anos_en_finca integer,
    tenencia_tierra text,
    asistencia_tecnica text
);


ALTER TABLE public.farms OWNER TO postgres;

--
-- Name: farms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.farms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.farms_id_seq OWNER TO postgres;

--
-- Name: farms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.farms_id_seq OWNED BY public.farms.id;


--
-- Name: inquiries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inquiries (
    id integer NOT NULL,
    product_id integer NOT NULL,
    buyer_email text NOT NULL,
    buyer_name text NOT NULL,
    company text NOT NULL,
    country text NOT NULL,
    message text NOT NULL,
    quantity_kg real,
    status text DEFAULT 'PENDING'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inquiries OWNER TO postgres;

--
-- Name: inquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inquiries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inquiries_id_seq OWNER TO postgres;

--
-- Name: inquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inquiries_id_seq OWNED BY public.inquiries.id;


--
-- Name: inquiries_product_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inquiries_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inquiries_product_id_seq OWNER TO postgres;

--
-- Name: inquiries_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inquiries_product_id_seq OWNED BY public.inquiries.product_id;


--
-- Name: interaction_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.interaction_logs (
    id integer NOT NULL,
    event_type text NOT NULL,
    actor_id integer,
    actor_type text,
    reference_id integer,
    reference_type text,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.interaction_logs OWNER TO postgres;

--
-- Name: interaction_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.interaction_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.interaction_logs_id_seq OWNER TO postgres;

--
-- Name: interaction_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.interaction_logs_id_seq OWNED BY public.interaction_logs.id;


--
-- Name: interactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.interactions (
    id integer NOT NULL,
    supplier_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    interaction_type text,
    actor text,
    notes text,
    metadata jsonb
);


ALTER TABLE public.interactions OWNER TO postgres;

--
-- Name: interactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.interactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.interactions_id_seq OWNER TO postgres;

--
-- Name: interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.interactions_id_seq OWNED BY public.interactions.id;


--
-- Name: loans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loans (
    id integer NOT NULL,
    buyer_id integer NOT NULL,
    order_id integer,
    principal_usd real NOT NULL,
    fee_usd real NOT NULL,
    total_repayment_usd real NOT NULL,
    apr_percent real DEFAULT 12 NOT NULL,
    term_days integer DEFAULT 30 NOT NULL,
    status public.loan_status DEFAULT 'ACTIVE'::public.loan_status NOT NULL,
    due_at timestamp with time zone NOT NULL,
    credit_score_at_issuance integer DEFAULT 500 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.loans OWNER TO postgres;

--
-- Name: loans_buyer_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.loans_buyer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loans_buyer_id_seq OWNER TO postgres;

--
-- Name: loans_buyer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.loans_buyer_id_seq OWNED BY public.loans.buyer_id;


--
-- Name: loans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.loans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loans_id_seq OWNER TO postgres;

--
-- Name: loans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.loans_id_seq OWNED BY public.loans.id;


--
-- Name: loans_order_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.loans_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loans_order_id_seq OWNER TO postgres;

--
-- Name: loans_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.loans_order_id_seq OWNED BY public.loans.order_id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    receiver_id integer NOT NULL,
    content text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: messages_receiver_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_receiver_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_receiver_id_seq OWNER TO postgres;

--
-- Name: messages_receiver_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_receiver_id_seq OWNED BY public.messages.receiver_id;


--
-- Name: messages_sender_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_sender_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_sender_id_seq OWNER TO postgres;

--
-- Name: messages_sender_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_sender_id_seq OWNED BY public.messages.sender_id;


--
-- Name: officer_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.officer_applications (
    id integer NOT NULL,
    full_name text NOT NULL,
    email text,
    phone text NOT NULL,
    department text NOT NULL,
    municipio text NOT NULL,
    languages text,
    experience_years integer,
    has_motorcycle boolean,
    available_days text[],
    motivation text,
    referral_code text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.officer_applications OWNER TO postgres;

--
-- Name: officer_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.officer_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.officer_applications_id_seq OWNER TO postgres;

--
-- Name: officer_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.officer_applications_id_seq OWNED BY public.officer_applications.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity_kg real NOT NULL,
    price_per_kg real NOT NULL,
    total_usd real NOT NULL
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: order_items_order_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_order_id_seq OWNER TO postgres;

--
-- Name: order_items_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_order_id_seq OWNED BY public.order_items.order_id;


--
-- Name: order_items_product_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_product_id_seq OWNER TO postgres;

--
-- Name: order_items_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_product_id_seq OWNED BY public.order_items.product_id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    buyer_id integer NOT NULL,
    status public.order_status DEFAULT 'INQUIRY'::public.order_status NOT NULL,
    total_usd real DEFAULT 0 NOT NULL,
    incoterm text DEFAULT 'FOB'::text NOT NULL,
    destination_port text,
    shipping_method text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fee_percentage real,
    fee_amount_usd real,
    fee_status text
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_buyer_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_buyer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_buyer_id_seq OWNER TO postgres;

--
-- Name: orders_buyer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_buyer_id_seq OWNED BY public.orders.buyer_id;


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: origin_stories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.origin_stories (
    id integer NOT NULL,
    product_id integer NOT NULL,
    farmer_name text NOT NULL,
    farmer_photo text,
    farm_name text NOT NULL,
    region text NOT NULL,
    elevation text,
    farm_size_ha real,
    years_farming integer,
    story text NOT NULL,
    challenges text NOT NULL,
    impact text NOT NULL,
    images text[] DEFAULT '{}'::text[] NOT NULL,
    video_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.origin_stories OWNER TO postgres;

--
-- Name: origin_stories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.origin_stories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.origin_stories_id_seq OWNER TO postgres;

--
-- Name: origin_stories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.origin_stories_id_seq OWNED BY public.origin_stories.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO postgres;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: password_reset_tokens_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_tokens_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_user_id_seq OWNER TO postgres;

--
-- Name: password_reset_tokens_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_tokens_user_id_seq OWNED BY public.password_reset_tokens.user_id;


--
-- Name: payment_milestones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_milestones (
    id integer NOT NULL,
    order_id integer NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    amount_usd real NOT NULL,
    percentage real NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    due_date timestamp with time zone,
    released_at timestamp with time zone
);


ALTER TABLE public.payment_milestones OWNER TO postgres;

--
-- Name: payment_milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_milestones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_milestones_id_seq OWNER TO postgres;

--
-- Name: payment_milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_milestones_id_seq OWNED BY public.payment_milestones.id;


--
-- Name: payment_milestones_order_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_milestones_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_milestones_order_id_seq OWNER TO postgres;

--
-- Name: payment_milestones_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_milestones_order_id_seq OWNED BY public.payment_milestones.order_id;


--
-- Name: product_analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_analytics (
    id integer NOT NULL,
    product_id integer NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    inquiries integer DEFAULT 0 NOT NULL,
    saves integer DEFAULT 0 NOT NULL,
    rfq_count integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_analytics OWNER TO postgres;

--
-- Name: product_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_analytics_id_seq OWNER TO postgres;

--
-- Name: product_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_analytics_id_seq OWNED BY public.product_analytics.id;


--
-- Name: product_analytics_product_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_analytics_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_analytics_product_id_seq OWNER TO postgres;

--
-- Name: product_analytics_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_analytics_product_id_seq OWNED BY public.product_analytics.product_id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    company_id integer NOT NULL,
    name text NOT NULL,
    category public.product_category DEFAULT 'COFFEE'::public.product_category NOT NULL,
    sub_category text,
    description text NOT NULL,
    origin text NOT NULL,
    altitude text,
    process text,
    variety text,
    min_order_kg real DEFAULT 100 NOT NULL,
    max_order_kg real,
    price_per_kg_usd real NOT NULL,
    available_kg real DEFAULT 0 NOT NULL,
    harvest_season text,
    images text[] DEFAULT '{}'::text[] NOT NULL,
    certifications text[] DEFAULT '{}'::text[] NOT NULL,
    cupping real,
    active boolean DEFAULT true NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    origin_story text,
    farmer_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    farm_name text,
    farm_lat real,
    farm_lng real,
    harvest_date timestamp with time zone,
    smallholder boolean DEFAULT false NOT NULL,
    women_led boolean DEFAULT false NOT NULL,
    direct_trade boolean DEFAULT false NOT NULL,
    climate_resilient boolean DEFAULT false NOT NULL,
    organic boolean DEFAULT false NOT NULL,
    families_supported integer
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_company_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_company_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_company_id_seq OWNER TO postgres;

--
-- Name: products_company_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_company_id_seq OWNED BY public.products.company_id;


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    country text,
    language text DEFAULT 'en'::text NOT NULL,
    avatar_url text
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profiles_id_seq OWNER TO postgres;

--
-- Name: profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profiles_id_seq OWNED BY public.profiles.id;


--
-- Name: profiles_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profiles_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profiles_user_id_seq OWNER TO postgres;

--
-- Name: profiles_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profiles_user_id_seq OWNED BY public.profiles.user_id;


--
-- Name: repayments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.repayments (
    id integer NOT NULL,
    loan_id integer NOT NULL,
    amount_usd real NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.repayments OWNER TO postgres;

--
-- Name: repayments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.repayments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.repayments_id_seq OWNER TO postgres;

--
-- Name: repayments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.repayments_id_seq OWNED BY public.repayments.id;


--
-- Name: repayments_loan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.repayments_loan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.repayments_loan_id_seq OWNER TO postgres;

--
-- Name: repayments_loan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.repayments_loan_id_seq OWNED BY public.repayments.loan_id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    author_id integer NOT NULL,
    product_id integer NOT NULL,
    rating integer NOT NULL,
    comment text,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: reviews_author_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reviews_author_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reviews_author_id_seq OWNER TO postgres;

--
-- Name: reviews_author_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reviews_author_id_seq OWNED BY public.reviews.author_id;


--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reviews_id_seq OWNER TO postgres;

--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: reviews_product_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reviews_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reviews_product_id_seq OWNER TO postgres;

--
-- Name: reviews_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reviews_product_id_seq OWNED BY public.reviews.product_id;


--
-- Name: rfq_responses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rfq_responses (
    id integer NOT NULL,
    rfq_id integer NOT NULL,
    company_id integer NOT NULL,
    price_per_kg_usd real NOT NULL,
    lead_time_days integer NOT NULL,
    message text NOT NULL,
    awarded integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rfq_responses OWNER TO postgres;

--
-- Name: rfq_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rfq_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rfq_responses_id_seq OWNER TO postgres;

--
-- Name: rfq_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rfq_responses_id_seq OWNED BY public.rfq_responses.id;


--
-- Name: rfq_responses_rfq_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rfq_responses_rfq_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rfq_responses_rfq_id_seq OWNER TO postgres;

--
-- Name: rfq_responses_rfq_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rfq_responses_rfq_id_seq OWNED BY public.rfq_responses.rfq_id;


--
-- Name: rfq_responses_supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rfq_responses_supplier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rfq_responses_supplier_id_seq OWNER TO postgres;

--
-- Name: rfq_responses_supplier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rfq_responses_supplier_id_seq OWNED BY public.rfq_responses.company_id;


--
-- Name: rfqs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rfqs (
    id integer NOT NULL,
    buyer_id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    product_category text NOT NULL,
    quantity_kg real NOT NULL,
    target_price_usd real,
    destination text NOT NULL,
    destination_port text,
    incoterm text DEFAULT 'FOB'::text NOT NULL,
    deadline timestamp with time zone NOT NULL,
    status public.rfq_status DEFAULT 'OPEN'::public.rfq_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rfqs OWNER TO postgres;

--
-- Name: rfqs_buyer_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rfqs_buyer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rfqs_buyer_id_seq OWNER TO postgres;

--
-- Name: rfqs_buyer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rfqs_buyer_id_seq OWNED BY public.rfqs.buyer_id;


--
-- Name: rfqs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rfqs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rfqs_id_seq OWNER TO postgres;

--
-- Name: rfqs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rfqs_id_seq OWNED BY public.rfqs.id;


--
-- Name: shipments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shipments (
    id integer NOT NULL,
    order_id integer NOT NULL,
    status public.shipment_status DEFAULT 'BOOKED'::public.shipment_status NOT NULL,
    origin_port text NOT NULL,
    destination_port text NOT NULL,
    carrier text,
    tracking_number text,
    container_number text,
    eta timestamp with time zone,
    departed_at timestamp with time zone,
    arrived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shipments OWNER TO postgres;

--
-- Name: shipments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shipments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shipments_id_seq OWNER TO postgres;

--
-- Name: shipments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shipments_id_seq OWNED BY public.shipments.id;


--
-- Name: shipments_order_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shipments_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shipments_order_id_seq OWNER TO postgres;

--
-- Name: shipments_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shipments_order_id_seq OWNED BY public.shipments.order_id;


--
-- Name: staff_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_roles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role text NOT NULL,
    assigned_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.staff_roles OWNER TO postgres;

--
-- Name: staff_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staff_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_roles_id_seq OWNER TO postgres;

--
-- Name: staff_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staff_roles_id_seq OWNED BY public.staff_roles.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id integer NOT NULL,
    company_id integer NOT NULL,
    tier public.subscription_tier DEFAULT 'FREE'::public.subscription_tier NOT NULL,
    active integer DEFAULT 1 NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: subscriptions_company_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscriptions_company_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_company_id_seq OWNER TO postgres;

--
-- Name: subscriptions_company_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_company_id_seq OWNED BY public.subscriptions.company_id;


--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_id_seq OWNER TO postgres;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: supplier_evaluations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_evaluations (
    id integer NOT NULL,
    supplier_id integer NOT NULL,
    eligibility_status public.eligibility_status,
    commercial_score integer,
    sellable_status public.sellable_status,
    pathway public.graduation_pathway,
    score_snapshot jsonb,
    threshold_version character varying(64) NOT NULL,
    evaluated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.supplier_evaluations OWNER TO postgres;

--
-- Name: supplier_evaluations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supplier_evaluations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_evaluations_id_seq OWNER TO postgres;

--
-- Name: supplier_evaluations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supplier_evaluations_id_seq OWNED BY public.supplier_evaluations.id;


--
-- Name: supplier_state_transitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_state_transitions (
    id integer NOT NULL,
    supplier_id integer NOT NULL,
    from_state public.sellable_status,
    to_state public.sellable_status NOT NULL,
    threshold_version character varying(64) NOT NULL,
    commercial_score_at_transition integer,
    actor public.actor NOT NULL,
    justification text,
    evaluation_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.supplier_state_transitions OWNER TO postgres;

--
-- Name: supplier_state_transitions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supplier_state_transitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_state_transitions_id_seq OWNER TO postgres;

--
-- Name: supplier_state_transitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supplier_state_transitions_id_seq OWNED BY public.supplier_state_transitions.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    nombre_completo text NOT NULL,
    whatsapp_number text NOT NULL,
    municipio text NOT NULL,
    vereda text,
    supplier_type public.supplier_type DEFAULT 'FARMER'::public.supplier_type NOT NULL,
    registered_by text,
    status public.supplier_status DEFAULT 'ACTIVE'::public.supplier_status NOT NULL,
    consent_given boolean DEFAULT false NOT NULL,
    consent_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    department text,
    eligibility_status public.eligibility_status,
    commercial_score integer,
    sellable_status public.sellable_status,
    graduation_pathway public.graduation_pathway,
    next_actions jsonb,
    commercial_score_at_onboarding integer,
    last_evaluated_at timestamp with time zone,
    threshold_version character varying(64),
    email text
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: trade_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trade_history (
    id integer NOT NULL,
    company_id integer NOT NULL,
    product text NOT NULL,
    volume_kg real NOT NULL,
    destination text NOT NULL,
    year integer NOT NULL,
    value_usd real
);


ALTER TABLE public.trade_history OWNER TO postgres;

--
-- Name: trade_history_company_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trade_history_company_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trade_history_company_id_seq OWNER TO postgres;

--
-- Name: trade_history_company_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trade_history_company_id_seq OWNED BY public.trade_history.company_id;


--
-- Name: trade_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trade_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trade_history_id_seq OWNER TO postgres;

--
-- Name: trade_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trade_history_id_seq OWNED BY public.trade_history.id;


--
-- Name: trust_scores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trust_scores (
    id integer NOT NULL,
    company_id integer NOT NULL,
    score real DEFAULT 0 NOT NULL,
    orders_completed real DEFAULT 0 NOT NULL,
    certifications_count real DEFAULT 0 NOT NULL,
    response_time real DEFAULT 0 NOT NULL,
    profile_completeness real DEFAULT 0 NOT NULL,
    trade_volume real DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.trust_scores OWNER TO postgres;

--
-- Name: trust_scores_company_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trust_scores_company_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trust_scores_company_id_seq OWNER TO postgres;

--
-- Name: trust_scores_company_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trust_scores_company_id_seq OWNED BY public.trust_scores.company_id;


--
-- Name: trust_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trust_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trust_scores_id_seq OWNER TO postgres;

--
-- Name: trust_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trust_scores_id_seq OWNED BY public.trust_scores.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role public.role DEFAULT 'BUYER'::public.role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email_verified_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: ai_outputs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_outputs ALTER COLUMN id SET DEFAULT nextval('public.ai_outputs_id_seq'::regclass);


--
-- Name: buyer_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buyer_profiles ALTER COLUMN id SET DEFAULT nextval('public.buyer_profiles_id_seq'::regclass);


--
-- Name: certifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certifications ALTER COLUMN id SET DEFAULT nextval('public.certifications_id_seq'::regclass);


--
-- Name: certifications company_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certifications ALTER COLUMN company_id SET DEFAULT nextval('public.certifications_company_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: companies user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies ALTER COLUMN user_id SET DEFAULT nextval('public.companies_user_id_seq'::regclass);


--
-- Name: compliance_docs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compliance_docs ALTER COLUMN id SET DEFAULT nextval('public.compliance_docs_id_seq'::regclass);


--
-- Name: compliance_requirements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compliance_requirements ALTER COLUMN id SET DEFAULT nextval('public.compliance_requirements_id_seq'::regclass);


--
-- Name: economics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.economics ALTER COLUMN id SET DEFAULT nextval('public.economics_id_seq'::regclass);


--
-- Name: email_verification_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verification_tokens ALTER COLUMN id SET DEFAULT nextval('public.email_verification_tokens_id_seq'::regclass);


--
-- Name: farms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.farms ALTER COLUMN id SET DEFAULT nextval('public.farms_id_seq'::regclass);


--
-- Name: inquiries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries ALTER COLUMN id SET DEFAULT nextval('public.inquiries_id_seq'::regclass);


--
-- Name: inquiries product_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries ALTER COLUMN product_id SET DEFAULT nextval('public.inquiries_product_id_seq'::regclass);


--
-- Name: interaction_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interaction_logs ALTER COLUMN id SET DEFAULT nextval('public.interaction_logs_id_seq'::regclass);


--
-- Name: interactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interactions ALTER COLUMN id SET DEFAULT nextval('public.interactions_id_seq'::regclass);


--
-- Name: loans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans ALTER COLUMN id SET DEFAULT nextval('public.loans_id_seq'::regclass);


--
-- Name: loans buyer_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans ALTER COLUMN buyer_id SET DEFAULT nextval('public.loans_buyer_id_seq'::regclass);


--
-- Name: loans order_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans ALTER COLUMN order_id SET DEFAULT nextval('public.loans_order_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: messages sender_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN sender_id SET DEFAULT nextval('public.messages_sender_id_seq'::regclass);


--
-- Name: messages receiver_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN receiver_id SET DEFAULT nextval('public.messages_receiver_id_seq'::regclass);


--
-- Name: officer_applications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.officer_applications ALTER COLUMN id SET DEFAULT nextval('public.officer_applications_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: order_items order_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN order_id SET DEFAULT nextval('public.order_items_order_id_seq'::regclass);


--
-- Name: order_items product_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN product_id SET DEFAULT nextval('public.order_items_product_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: orders buyer_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN buyer_id SET DEFAULT nextval('public.orders_buyer_id_seq'::regclass);


--
-- Name: origin_stories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.origin_stories ALTER COLUMN id SET DEFAULT nextval('public.origin_stories_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: password_reset_tokens user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN user_id SET DEFAULT nextval('public.password_reset_tokens_user_id_seq'::regclass);


--
-- Name: payment_milestones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_milestones ALTER COLUMN id SET DEFAULT nextval('public.payment_milestones_id_seq'::regclass);


--
-- Name: payment_milestones order_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_milestones ALTER COLUMN order_id SET DEFAULT nextval('public.payment_milestones_order_id_seq'::regclass);


--
-- Name: product_analytics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_analytics ALTER COLUMN id SET DEFAULT nextval('public.product_analytics_id_seq'::regclass);


--
-- Name: product_analytics product_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_analytics ALTER COLUMN product_id SET DEFAULT nextval('public.product_analytics_product_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: products company_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN company_id SET DEFAULT nextval('public.products_company_id_seq'::regclass);


--
-- Name: profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles ALTER COLUMN id SET DEFAULT nextval('public.profiles_id_seq'::regclass);


--
-- Name: profiles user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles ALTER COLUMN user_id SET DEFAULT nextval('public.profiles_user_id_seq'::regclass);


--
-- Name: repayments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repayments ALTER COLUMN id SET DEFAULT nextval('public.repayments_id_seq'::regclass);


--
-- Name: repayments loan_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repayments ALTER COLUMN loan_id SET DEFAULT nextval('public.repayments_loan_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: reviews author_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews ALTER COLUMN author_id SET DEFAULT nextval('public.reviews_author_id_seq'::regclass);


--
-- Name: reviews product_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews ALTER COLUMN product_id SET DEFAULT nextval('public.reviews_product_id_seq'::regclass);


--
-- Name: rfq_responses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfq_responses ALTER COLUMN id SET DEFAULT nextval('public.rfq_responses_id_seq'::regclass);


--
-- Name: rfq_responses rfq_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfq_responses ALTER COLUMN rfq_id SET DEFAULT nextval('public.rfq_responses_rfq_id_seq'::regclass);


--
-- Name: rfq_responses company_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfq_responses ALTER COLUMN company_id SET DEFAULT nextval('public.rfq_responses_supplier_id_seq'::regclass);


--
-- Name: rfqs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfqs ALTER COLUMN id SET DEFAULT nextval('public.rfqs_id_seq'::regclass);


--
-- Name: rfqs buyer_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfqs ALTER COLUMN buyer_id SET DEFAULT nextval('public.rfqs_buyer_id_seq'::regclass);


--
-- Name: shipments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments ALTER COLUMN id SET DEFAULT nextval('public.shipments_id_seq'::regclass);


--
-- Name: shipments order_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments ALTER COLUMN order_id SET DEFAULT nextval('public.shipments_order_id_seq'::regclass);


--
-- Name: staff_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_roles ALTER COLUMN id SET DEFAULT nextval('public.staff_roles_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: subscriptions company_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN company_id SET DEFAULT nextval('public.subscriptions_company_id_seq'::regclass);


--
-- Name: supplier_evaluations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_evaluations ALTER COLUMN id SET DEFAULT nextval('public.supplier_evaluations_id_seq'::regclass);


--
-- Name: supplier_state_transitions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_state_transitions ALTER COLUMN id SET DEFAULT nextval('public.supplier_state_transitions_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: trade_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trade_history ALTER COLUMN id SET DEFAULT nextval('public.trade_history_id_seq'::regclass);


--
-- Name: trade_history company_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trade_history ALTER COLUMN company_id SET DEFAULT nextval('public.trade_history_company_id_seq'::regclass);


--
-- Name: trust_scores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_scores ALTER COLUMN id SET DEFAULT nextval('public.trust_scores_id_seq'::regclass);


--
-- Name: trust_scores company_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_scores ALTER COLUMN company_id SET DEFAULT nextval('public.trust_scores_company_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: postgres
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	3b22e9c61cb4ec5823f3f422851d10600587c1ec46ed767c4dad74c95e985ef1	1776570560518
2	8378c15a8ba4b177aaaa6d35327bae0b1ced6fa3f3640aaea6cf2133f8d63f74	1776570620000
\.


--
-- Data for Name: ai_outputs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_outputs (id, supplier_id, created_at, ai_model, call_type, export_readiness_score, pathway, capital_capacity_cop, compliance_gaps, gap_analysis, document_content, whatsapp_message_sent) FROM stdin;
49	64	2026-04-26 16:28:35.245166+00	claude-haiku-4-5	ONBOARD_SCORE	35	D	450000	RUT DIAN - Missing (Critical), Fitosanitary Certification - Missing (Critical), DIAN Exporter Registration - Missing (Critical), Production volume documentation - Insufficient, Land rights documentation - Not verified, Post-harvest quality protocols - Not documented	MVP Test Supplier scores critically low across all dimensions. Land rights status unknown (0/20). Production volume of 3,000 kg from 5 hectares indicates severe underperformance for commercial export (5/20 - below 600kg/ha threshold). Post-harvest quality completely undocumented with no drying method, water access, or technical assistance data (0/20). Compliance framework severely deficient: missing RUT DIAN, fitosanitary certification, and DIAN exporter status - only ICA registration present (5/20). Commitment indicators weak: no export attempt history, no premium channel interest documented, no economic stability data (5/20). This supplier is at pre-commercial stage.	\N	SM542870872e4eebf171d2d43c09b2ff28
4	16	2026-04-20 23:55:38.382592+00	claude-sonnet-4-6	DOCUMENT_GENERATION	\N	\N	\N	\N	\N	# Guía de Cumplimiento para Exportación Agrícola\n\n---\n\n## ¡Bienvenido, Ricardo!\n\nEsperamos que se encuentre muy bien en San Gil, Santander. En Fincava hemos revisado su perfil como productor de **bocadillo** y queremos acompañarle paso a paso para que pueda acceder a mercados de exportación con total tranquilidad.\n\n---\n\n## 📊 Resumen de Su Puntaje de Cumplimiento\n\n| Estado | Resultado |\n|--------|-----------|\n| **Puntaje actual** | ⚠️ 0 / 4 documentos completos |\n| **Cultivo principal** | Bocadillo (guayaba) |\n| **Hectáreas en producción** | 2 hectáreas |\n| **Municipio** | San Gil, Santander |\n\nRicardo, actualmente **ninguno de los cuatro documentos obligatorios** para exportar está en regla. ¡Pero no se preocupe! Con dedicación y siguiendo estos pasos, puede tenerlos todos resueltos en pocas semanas.\n\n---\n\n## 📋 Documentos que Le Faltan\n\n- ❌ RUT ante la DIAN\n- ❌ Registro ICA (productor agrícola)\n- ❌ Certificado Fitosanitario\n- ❌ Registro como Exportador ante la DIAN\n\n---\n\n## 🗂️ Pasos para Ponerse al Día\n\n### **Paso 1 — Obtener su RUT (Registro Único Tributario)**\n\n**¿Dónde?** Punto de Atención DIAN más cercano a San Gil, ubicado en Bucaramanga (Calle 49 N.º 14-27, Centro) o en línea en **www.dian.gov.co** si tiene acceso a internet y correo electrónico.\n\n**¿Qué necesita?**\n- Cédula de ciudadanía original\n- Comprobante de dirección (recibo de servicios o carta de la junta de acción comunal)\n- Llenar el formulario de inscripción RUT (lo ayudan en el punto de atención)\n\n**💰 Costo:** **$0 pesos** — Este trámite es completamente gratuito.\n\n---\n\n### **Paso 2 — Registro ICA como Productor Agrícola**\n\n**¿Dónde?** Oficina del ICA en Santander, ubicada en Bucaramanga (Carrera 26 N.º 54-50) o llame al **+57 (7) 657-1515**. También puede consultar en **www.ica.gov.co**.\n\n**¿Qué necesita?**\n- Copia de su RUT (del Paso 1)\n- Cédula de ciudadanía\n- Información de su predio: vereda, municipio, número de hectáreas\n- Certificado de tradición y libertad del predio o contrato de arrendamiento\n\n**💰 Costo:** **$0 pesos** — El registro básico de predio productor es gratuito.\n\n---\n\n### **Paso 3 — Certificado Fitosanitario para Exportación**\n\n**¿Dónde?** Una vez registrado en el ICA (Paso 2), solicite la inspección fitosanitaria en la misma oficina del ICA en Bucaramanga. El inspector visitará su finca en San Gil.\n\n**¿Qué necesita?**\n- Registro ICA activo (del Paso 2)\n- Solicitud formal de inspección (formulario en la oficina ICA)\n- Su cultivo de bocadillo debe estar libre de plagas visibles — el inspector lo verificará\n- Resultado de análisis de suelo (opcional pero recomendado)\n\n**💰 Costo:** Entre **$80.000 y $150.000 pesos** por inspección y emisión del certificado, según tarifas ICA vigentes para 2026.\n\n---\n\n### **Paso 4 — Registro como Exportador ante la DIAN**\n\n**¿Dónde?** En línea a través del portal **www.dian.gov.co** (sección "Servicios en línea") o en el punto de atención DIAN en Bucaramanga. Necesitará tener RUT activo del Paso 1.\n\n**¿Qué necesita?**\n- RUT activo con actividad económica de exportación habilitada\n- Cédula de ciudadanía\n- Datos bancarios de cuenta a su nombre\n- Registro ICA activo\n\n**💰 Costo:** **$0 pesos** — Trámite gratuito ante la DIAN.\n\n---\n\n## 💵 Estimado Total de Costos\n\n| Trámite | Costo Estimado |\n|---------|---------------|\n| RUT DIAN | $0 |\n| Registro ICA | $0 |\n| Certificado Fitosanitario | $80.000 – $150.000 |\n| Registro Exportador DIAN | $0 |\n| **TOTAL APROXIMADO** | **$80.000 – $150.000 COP** |\n\n> *Considere también los gastos de desplazamiento a Bucaramanga, aproximadamente $40.000 – $60.000 COP ida y vuelta desde San Gil.*\n\n---\n\n## 📞 Su Próximo Contacto con Fincava\n\nRicardo, una vez haya iniciado cualquiera de estos pasos, **escríbanos por WhatsApp al número de su asesor Fincava** para actualizar su puntaje de cumplimiento y orientarle en los siguientes trámites de exportación.\n\nRecuerde que en Fincava estamos para acompañarle en cada etapa. **¡Su bocadillo tiene potencial de llegar lejos!** 🍬🌍\n\n---\n\n*Guía	\N
50	65	2026-04-26 18:09:52.657249+00	claude-haiku-4-5	ONBOARD_SCORE	25	D	500000	RUT DIAN not registered, Fitosanitary certification absent, DIAN exporter registration missing, No post-harvest quality documentation, Incomplete farm operational data	Supplier demonstrates minimal export readiness. Land rights status unknown (0/20 pts). Production volume of 2,000 kg from 5 hectares indicates low productivity and insufficient scale for commercial export (5/20 pts). Critical post-harvest quality information missing - no drying method, water access, or technical assistance documented (0/20 pts). Compliance score severely deficient: missing RUT DIAN, fitosanitary certification, and DIAN exporter status (5/20 pts). Commitment uncertain: no export attempt history and incomplete engagement data (10/20 pts). Estimated capital capacity of COP $500,000 insufficient for compliance investments and infrastructure upgrades needed.	\N	SM31d6660f8b09ece3a3ab83f0607f37ca
51	66	2026-04-26 18:09:52.751322+00	claude-haiku-4-5	ONBOARD_SCORE	35	D	2000000	RUT DIAN registration missing, Phytosanitary certification absent, DIAN exporter registration not obtained, No post-harvest quality documentation, Land tenure rights not documented	Supplier demonstrates early-stage development with significant structural deficiencies. Land rights documentation completely absent (0/20pts). Production volume of 2,000kg from 5 hectares indicates low yield efficiency (5/20pts). Post-harvest handling methodology undefined with no quality certifications (2/20pts). Critical compliance infrastructure missing: lacks RUT DIAN, phytosanitary certification, and DIAN exporter status (8/20pts). Minimal commitment indicators with no export history or documented interest (3/20pts). Farm records lack essential agronomic data (plant age, harvest frequency, drying method, water access, technical assistance). Economic profile shows subsistence-level production unsuitable for export channel without substantial capacity building.	\N	SM112e8659fb0075a967d58a209fa86017
52	67	2026-04-26 18:09:53.382081+00	claude-haiku-4-5	ONBOARD_SCORE	25	D	4000000	RUT DIAN - Critical for export operations, Fitosanitary Certificate - Required for agricultural exports, DIAN Exporter Registration - Mandatory for cross-border trade, Farm tenure documentation - Not provided, Production methodology documentation - Incomplete	Supplier demonstrates minimal export readiness across all dimensions. Land rights cannot be verified (0/20) due to lack of tenure documentation. Production volume is severely limited at 2,000 kg from 5 hectares (5/20), indicating either underdeveloped capacity or incomplete data. Post-harvest quality assessment impossible without drying method, storage conditions, or quality certifications (2/20 - only ICA partially present). Compliance framework critically deficient with 3 of 4 major export requirements missing (3/20). Commitment indicators suggest early-stage involvement with no prior export attempts (15/20). Critical data gaps prevent full assessment of farm management practices, technical support, and production consistency.	\N	SMaee711cf8d6797f956bd773c1ee1e874
53	68	2026-04-26 18:09:54.430697+00	claude-haiku-4-5	ONBOARD_SCORE	28	D	2400000	RUT DIAN - Critical requirement for all export operations, Phytosanitary Certificate - Mandatory for agricultural exports, DIAN Exporter Registration - Legal requirement for cross-border commerce	Supplier demonstrates minimal export readiness across all dimensions. Land rights documentation absent (0/20), production volume of 2,000 kg last harvest indicates small-scale subsistence farming far below commercial export thresholds (4/20). Post-harvest quality controls not documented - no drying method specified despite coffee requiring precise processing (2/20). Compliance framework critically deficient with only ICA registration completed; missing 3 of 4 essential certifications (10/20). Commitment indicators weak - no prior export attempts, export price knowledge not established (2/20). Farm fundamentals underdeveloped: production area only 5 hectares, missing data on plant age, harvests/year, water access, tenure stability, and technical support.	\N	SMcebf4c435dcde88777e6b88a199e1bd1
54	73	2026-04-26 18:11:52.146872+00	claude-haiku-4-5	ONBOARD_SCORE	25	D	2250000	RUT DIAN - Not registered, ICA Registry - Not obtained, Phytosanitary Certificate - Not obtained, DIAN Exporter Status - Not registered	Supplier demonstrates critical deficiencies across all evaluation dimensions. Land rights status unknown (0/20). Production volume of 1,500 kg annually from 3 hectares indicates insufficient scale for commercial export (5/20). Post-harvest quality assessment impossible without process documentation (0/20). Complete compliance failure with zero regulatory certifications (0/20). Commitment indicators absent; no evidence of export intent, technical assistance engagement, or market knowledge (0/20). Estimated capital capacity (~COP 2.25M from last harvest) severely constrains compliance pathway investment.	\N	SM63deb89cbb9486f3e8c7682f231a39d9
55	70	2026-04-26 18:11:52.271653+00	claude-haiku-4-5	ONBOARD_SCORE	25	D	2250000	RUT DIAN - Not registered, ICA Registration - Not obtained, Phytosanitary Certificate - Not acquired, DIAN Exporter Status - Not registered	Supplier demonstrates critical deficiencies across all evaluation dimensions. Land rights documentation absent (0/20). Production volume of 1,500 kg from 3 hectares indicates severely underdeveloped capacity for commercial export (5/20). No post-harvest quality infrastructure documented (0/20). Complete compliance void: zero of four required certifications obtained (0/20). Minimal commitment signals: no documented technical assistance, export experience, or engagement with premium channels (5/20). Supplier is at pre-commercial stage requiring fundamental farm development before export viability.	\N	SM270f0ccc083cae0523da732868a5d0ec
56	71	2026-04-26 18:11:52.753891+00	claude-haiku-4-5	ONBOARD_SCORE	25	D	2250000	RUT DIAN not registered, ICA registro not obtained, Fitosanitario certification missing, DIAN exportador status not achieved	Supplier is at pre-export stage with severe deficiencies across all pillars. Land rights status unknown (0/20). Production volume of 1,500 kg annually is minimal for export viability (3/20). Post-harvest quality undefined - no drying method, technical assistance, or water access documentation (2/20). Complete compliance failure with zero certifications (0/20). Commitment unclear - new supplier with no export history or documented intentions (5/20). Farm size of 3 hectares is adequate but productivity metrics and plant age data missing. No evidence of commercial relationships or export-channel interest.	\N	SM3f7512918bb636b73821dc21ab4e13dd
57	72	2026-04-26 18:11:52.781713+00	claude-haiku-4-5	ONBOARD_SCORE	28	D	2250000	RUT DIAN not registered, ICA registro not obtained, Fitosanitario certification missing, DIAN exporter status not registered	Supplier scores critically low across all dimensions. Land rights status unknown (0/20). Production volume of 1,500 kg annually is severely below export minimum thresholds of 5,000+ kg (3/20). Post-harvest quality metrics completely absent - no drying method, water access, or technical assistance documented (2/20). Compliance infrastructure nonexistent - zero of four critical certifications obtained (0/20). Commitment indicators missing - no evidence of export intent, payment stability, or channel preference (3/20). Farm has only 3 hectares with primary crop being cacao but lacks foundational operational data (plant age, harvests/year, tenure clarity).	\N	SM3a40cb93b2fdef16f2657951d11257e0
58	69	2026-04-26 18:11:52.899216+00	claude-haiku-4-5	ONBOARD_SCORE	25	D	2250000	RUT DIAN not registered, ICA registration missing, Phytosanitary certification absent, DIAN exporter status not obtained, No export documentation framework	Supplier demonstrates severe deficiencies across all evaluation dimensions. Land rights documentation status unknown (0/20). Production volume of 1,500 kg from 3 hectares indicates marginal productivity (5/20) - approximately 500 kg/hectare in cacao is suboptimal and insufficient for commercial export viability. Post-harvest quality protocols completely undocumented; no drying method, water access, or technical assistance recorded (0/20). Critical compliance infrastructure absent: zero of four mandatory certifications obtained (0/20). Commitment indicators unclear due to incomplete onboarding data (15/20 based on active status and consent). Estimated liquid capital from last harvest (COP 2.25M at ~COP 1,500/kg floor price) is insufficient for export preparation costs.	\N	SMf388e59cf65a72e36c73e29192e8c45e
60	69	2026-04-28 01:20:34.524661+00	claude-sonnet-4-6	DOCUMENT_GENERATION	\N	\N	\N	\N	\N	# Guía de Cumplimiento para Exportación de Cacao\n## Preparada especialmente para usted: Rapid S4-1 1777227106\n\n---\n\nEstimado/a Rapid S4-1 1777227106,\n\nReciba un cordial saludo de parte del equipo de Fincava. Hemos revisado su perfil de proveedor y queremos acompañarle paso a paso en su camino hacia la exportación de cacao desde Nariño.\n\n---\n\n## 📊 Su Resumen de Puntaje Actual\n\n| Indicador | Resultado |\n|---|---|\n| **Puntaje de exportación** | 25 / 100 |\n| **Estado comercial** | No listo para exportar |\n| **Ruta asignada** | Ruta D (inicio del proceso) |\n| **Capital estimado disponible** | COP $2.250.000 |\n| **Hectáreas en producción** | 3 hectáreas de cacao |\n\nSu puntaje actual de **25 puntos** indica que se encuentra al inicio del proceso de cumplimiento. La buena noticia es que con los pasos correctos, usted puede avanzar significativamente en los próximos meses. Muchos agricultores de Nariño han recorrido este mismo camino con éxito.\n\n---\n\n## 📋 Documentos Que Le Faltan\n\nActualmente usted no cuenta con ninguno de los cuatro documentos obligatorios para exportar:\n\n- ❌ **RUT ante la DIAN** — Registro como persona natural o empresa\n- ❌ **Registro ICA** — Registro del predio productor ante el ICA\n- ❌ **Certificado Fitosanitario** — Certificación de su cacao para exportación\n- ❌ **Habilitación como Exportador DIAN** — Inscripción como exportador ante la aduana\n\n---\n\n## ✅ Pasos Numerados Para Completar Su Proceso\n\n---\n\n### PASO 1 — Obtenga su RUT ante la DIAN\n\n**DÓNDE:** Oficina DIAN más cercana a su municipio, o en línea en **www.dian.gov.co** (opción "Inscripción RUT").\n\n**QUÉ HACER:** Lleve su cédula de ciudadanía original y copia. Si tiene tierra o produce comercialmente, debe registrarse como **persona natural con actividad económica agrícola** (código CIIU 0125 — cultivo de otros productos agrícolas).\n\n**COSTO:** $0 — Este trámite es completamente **gratuito**.\n\n---\n\n### PASO 2 — Registre su Predio ante el ICA\n\n**DÓNDE:** Oficina del **ICA (Instituto Colombiano Agropecuario)** en Nariño. La oficina regional se encuentra en Pasto: Calle 20 No. 36-19, o llame al **01 8000 11 44 65**.\n\n**QUÉ HACER:** Solicite el **Registro de Predio Productor de Cacao**. Lleve: cédula, RUT recién obtenido, escritura o documento de tenencia de la tierra (arriendo, préstamo, escritura), y la ubicación exacta de su finca (vereda, municipio, coordenadas si las tiene).\n\n**COSTO:** $0 — Trámite **gratuito**. Sin embargo, si necesita transporte a Pasto, calcule entre **$20.000 y $40.000** en pasajes.\n\n---\n\n### PASO 3 — Gestione su Certificado Fitosanitario\n\n**DÓNDE:** Una vez registrado en el ICA (Paso 2), solicite este certificado en la **misma oficina del ICA en Pasto** o a través de un inspector ICA que visite su finca.\n\n**QUÉ HACER:** El ICA inspecciona su cultivo y certifica que su cacao cumple con las condiciones fitosanitarias requeridas para exportación. Antes de solicitar la visita, asegúrese de que su cultivo esté libre de plagas visibles y que tenga un mínimo de registros de manejo del cultivo.\n\n**COSTO:** Entre **$50.000 y $150.000** dependiendo del tipo de certificado y visita requerida. Consulte tarifas vigentes directamente con el ICA.\n\n---\n\n### PASO 4 — Inscríbase como Exportador ante la DIAN\n\n**DÓNDE:** Portal **www.dian.gov.co** — sección "Servicios al Ciudadano / Comercio Exterior / Inscripción como Exportador". También puede hacerlo en la oficina DIAN.\n\n**QUÉ HACER:** Con su RUT activo y documentos del ICA, actualice su RUT para incluir la actividad de **exportación** y complete la inscripción en el sistema de comercio exterior de la DIAN.\n\n**COSTO:** $0 — Trámite **gratuito**.\n\n---\n\n## 💰 Estimado de Costos Totales\n\n| Trámite | Costo Estimado |\n|---|---|\n| RUT DIAN | $0 |\n| Registro ICA | $0 + transporte ~$40.000 |\n| Certificado Fitosanitario | $50.000 – $150.000 |\n| Habilitación Exportador DIAN | $0 |\n| **TOTAL ESTIMADO** | **$50.000 – $190.000 COP** |\n\n> ⚠️ **Nota importante:** Su capital disponible estimado es de COP $2.250.000. Los costos de cumplimiento son manejables, pero necesitará también invertir en mejorar sus protocolos de poscosecha y productividad para alcanzar volúmenes exportables.\n\n---\n\n## 📞 Su Próximo Contacto con Fincava	\N
\.


--
-- Data for Name: buyer_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.buyer_profiles (id, user_id, company_name, country, destination_port, target_products, preferred_incoterm, intended_volume_mt, import_frequency, onboarded_at, updated_at) FROM stdin;
1	37	Acme Imports UPDATED	France	\N	{panela}	\N	\N	QUARTERLY	2026-04-26 16:07:12.950796+00	2026-04-26 16:07:13.009531+00
3	38	Bio Imports UPDATED	Belgium	\N	{}	\N	\N	MONTHLY	2026-04-26 16:07:34.481045+00	2026-04-26 16:07:34.536232+00
5	39	Green Imports BV	Belgium	\N	{}	\N	\N	MONTHLY	2026-04-26 16:12:34.230421+00	2026-04-26 16:12:34.302829+00
7	41	LogCo Updated	\N	\N	{}	\N	\N	\N	2026-04-26 16:23:54.356368+00	2026-04-26 16:23:54.43473+00
9	42	MVP Import Co	United States	\N	{cafe,cacao}	FOB	\N	\N	2026-04-26 16:30:13.05803+00	2026-04-26 16:30:13.057+00
10	43	Company Alpha UPDATED	USA	\N	{Coffee,Cacao}	FOB	50	MONTHLY	2026-04-26 18:11:10.081265+00	2026-04-26 18:11:10.533582+00
11	44	Company Beta UPDATED	UAE	\N	{Avocado}	CIF	40	QUARTERLY	2026-04-26 18:11:10.459703+00	2026-04-26 18:11:10.597577+00
14	45	Failsafe Co	USA	\N	{Coffee}	FOB	\N	\N	2026-04-26 18:12:17.711687+00	2026-04-26 18:12:17.711+00
15	46	Test Imports Ltd	United Arab Emirates	\N	{}	\N	\N	\N	2026-04-27 13:29:32.600188+00	2026-04-27 13:29:32.598+00
\.


--
-- Data for Name: certifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certifications (id, company_id, type, issuer, expiry_date, document_url, verified) FROM stdin;
1	1	USDA Organic	CCOF Certification Services	2026-06-30 00:00:00+00	\N	t
2	1	Fair Trade	Fairtrade International	2025-12-31 00:00:00+00	\N	t
3	1	SCA Q Grader	Specialty Coffee Association	2026-01-15 00:00:00+00	\N	t
4	2	USDA Organic	CCOF Certification Services	2026-03-31 00:00:00+00	\N	t
5	2	Rainforest Alliance	Rainforest Alliance	2025-11-30 00:00:00+00	\N	t
6	3	GlobalGAP	SGS Colombia	2025-09-30 00:00:00+00	\N	t
7	3	Halal	Islamic Chamber Research & Information Center	2026-02-28 00:00:00+00	\N	t
8	4	USDA Organic	Quality Assurance International	2026-05-31 00:00:00+00	\N	t
9	4	Halal	Islamic Chamber Research & Information Center	2026-02-28 00:00:00+00	\N	t
10	4	Kosher	OK Kosher Certification	2026-01-31 00:00:00+00	\N	t
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, user_id, name, type, country, region, description, logo_url, website, verified, origin_story, farmer_name, created_at, trust_score, subscription_tier, response_time_hours, export_destinations) FROM stdin;
1	1	Café Huilas Premium	COOPERATIVE	Colombia	Huila	Award-winning specialty coffee cooperative from the Huila region, exporting single-origin arabica to premium roasters worldwide. Our 120 member families cultivate coffee at 1,600-2,200 MASL using traditional washed processes.	\N	\N	t	Carlos grew up among the coffee trees of San Agustín, Huila, where his grandfather first planted Bourbon varieties in 1957. Three generations later, the Mendoza family leads a cooperative of 120 smallholder families who share processing infrastructure and export under a unified quality standard.	Carlos Mendoza	2024-04-07 13:35:03.543851+00	87	PREMIUM	4.5	{UAE,Japan,"South Korea"}
2	2	Cooperativa Cacao del Pacífico	COOPERATIVE	Colombia	Tumaco	Colombia's premier fine-flavor cacao cooperative, producing award-winning Nacional and hybrid varieties from the Tumaco coast. Certified organic and Rainforest Alliance, supplying craft chocolate makers in Europe and Asia.	\N	\N	t	Maria Santos founded the cooperative in 2008 after returning from Spain with a degree in agronomy. She organized 80 cacao-growing families along the Tumaco coastline and established the first communal fermentation and drying facilities in the region.	Maria Santos	2024-10-07 13:35:03.543851+00	79	PRO	8.2	{Germany,Belgium,Switzerland}
3	3	Exportaciones Andinas Colombia	EXPORTER	Colombia	Antioquia	Full-service Colombian agricultural exporter specializing in avocado Hass, exotic tropical fruits, and processed goods. We work directly with over 200 producers across 8 departments to deliver consistent quality to international buyers.	\N	\N	t	Jorge Herrera built Exportaciones Andinas from a small logistics operation into one of Colombia's top-10 fruit exporters. With cold-chain infrastructure across Antioquia and Córdoba, the company handles everything from farm gate to container stuffing.	Jorge Herrera	2025-04-07 13:35:03.543851+00	91	PREMIUM	2.8	{Netherlands,UK,UAE,Malaysia}
4	4	Santero Premium Superfoods	MANUFACTURER	Colombia	Nariño	Artisan manufacturer of freeze-dried Colombian superfoods: maca, açaí, camu camu, moringa, and goldenberry (uchuva). All products are USDA Organic and Halal certified, supplied to health food distributors across the GCC.	\N	\N	f	Rosa Vasquez left pharmaceutical research to pursue a mission: bringing Nariño's ancestral superfoods to health-conscious consumers worldwide. Her small-batch operation works with indigenous communities in the Andean highlands.	Rosa Vasquez	2025-10-07 13:35:03.543851+00	62	FREE	24	{"Saudi Arabia",UAE}
22	27	Café Huila Co.	EXPORTER	CO	Huila	Premium single-origin Colombian coffee exporter based in Huila.	\N	\N	t	\N	\N	2026-04-24 17:26:26.105689+00	0	FREE	\N	{}
17	18	FINCAVA	EXPORTER	US	\N		\N	\N	f	\N	\N	2026-04-20 16:55:48.994587+00	0	FREE	\N	{}
23	28	Gulf Trade International	IMPORTER	AE	\N	Dubai-based specialty food importer sourcing premium Colombian products.	\N	\N	f	\N	\N	2026-04-24 17:26:26.442329+00	0	FREE	\N	{}
30	37	Acme Imports	IMPORTER	Germany	\N		\N	\N	f	\N	\N	2026-04-26 16:07:12.863172+00	0	FREE	\N	{}
31	38	Bio Imports	IMPORTER	Netherlands	\N		\N	\N	f	\N	\N	2026-04-26 16:07:34.420038+00	0	FREE	\N	{}
32	39	Green Imports	IMPORTER	Netherlands	\N		\N	\N	f	\N	\N	2026-04-26 16:12:34.119131+00	0	FREE	\N	{}
33	40	XY	IMPORTER	US	\N		\N	\N	f	\N	\N	2026-04-26 16:12:56.512289+00	0	FREE	\N	{}
34	41	LogCo	IMPORTER	US	\N		\N	\N	f	\N	\N	2026-04-26 16:23:54.214893+00	0	FREE	\N	{}
35	42	MVP Import Co	IMPORTER	United States	\N		\N	\N	f	\N	\N	2026-04-26 16:30:12.690274+00	0	FREE	\N	{}
36	43	Company A	IMPORTER	USA	\N		\N	\N	f	\N	\N	2026-04-26 18:11:09.47241+00	0	FREE	\N	{}
37	44	Company B	IMPORTER	UAE	\N		\N	\N	f	\N	\N	2026-04-26 18:11:09.978975+00	0	FREE	\N	{}
38	45	Test Co	IMPORTER	USA	\N		\N	\N	f	\N	\N	2026-04-26 18:12:17.456188+00	0	FREE	\N	{}
39	46	Test Imports Ltd	IMPORTER	United Arab Emirates	\N		\N	\N	f	\N	\N	2026-04-27 13:29:32.501945+00	0	FREE	\N	{}
\.


--
-- Data for Name: compliance_docs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.compliance_docs (id, supplier_id, rut_dian, ica_registro, fitosanitario_cert, dian_exportador, compliance_score, last_reviewed_at) FROM stdin;
3	9	f	f	f	f	\N	\N
4	10	f	f	f	f	\N	\N
5	12	f	f	f	f	\N	\N
56	64	t	t	t	f	\N	\N
8	16	f	f	f	f	\N	\N
57	65	f	t	f	f	\N	\N
58	66	f	t	f	f	\N	\N
59	67	f	t	f	f	\N	\N
60	68	f	t	f	f	\N	\N
61	69	f	f	f	f	\N	\N
62	70	f	f	f	f	\N	\N
63	71	f	f	f	f	\N	\N
64	72	f	f	f	f	\N	\N
65	73	f	f	f	f	\N	\N
\.


--
-- Data for Name: compliance_requirements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.compliance_requirements (id, country, product_type, requirement, description, mandatory, category) FROM stdin;
1	UAE	COFFEE	Phytosanitary Certificate	Issued by ICA Colombia certifying the coffee is free from pests and diseases.	1	DOCUMENT
2	UAE	COFFEE	Certificate of Origin	Issued by the Colombian Coffee Federation or Chamber of Commerce.	1	DOCUMENT
3	UAE	COFFEE	Food Safety Certificate	UAE ESMA halal/food safety compliance for food imports.	1	COMPLIANCE
4	UAE	COFFEE	RUT DIAN	Colombian tax ID registration required for export invoicing.	1	DOCUMENT
5	UAE	COFFEE	DIAN Export Registration	Exporter must be registered with DIAN as an authorized exporter.	1	COMPLIANCE
6	Saudi Arabia	COFFEE	Phytosanitary Certificate	ICA-issued certificate required at Saudi customs.	1	DOCUMENT
7	Saudi Arabia	COFFEE	Halal Certificate	For processed coffee products entering Saudi Arabia.	0	COMPLIANCE
8	Saudi Arabia	COFFEE	Certificate of Origin	Must be authenticated by the Colombian Chamber of Commerce.	1	DOCUMENT
9	Saudi Arabia	COFFEE	SASO Conformity	Saudi Standards, Metrology and Quality Organization conformity certificate.	1	COMPLIANCE
10	Japan	COFFEE	Phytosanitary Certificate	Required by Japanese Ministry of Agriculture (MAFF).	1	DOCUMENT
11	Japan	COFFEE	Food Sanitation Act Compliance	Green and roasted coffee must meet Japan's residue limits.	1	COMPLIANCE
12	Japan	COFFEE	Organic JAS Certification	Required to market coffee as organic in Japan.	0	COMPLIANCE
13	UAE	CACAO	Phytosanitary Certificate	ICA Colombia certificate required for cacao exports.	1	DOCUMENT
14	UAE	CACAO	Certificate of Origin	Chamber of Commerce or FNC certificate.	1	DOCUMENT
15	UAE	CACAO	Heavy Metal Test Report	UAE requires cadmium and lead test results for cacao.	1	COMPLIANCE
16	UAE	CACAO	RUT DIAN	Colombian tax ID required for export.	1	DOCUMENT
17	EU	CACAO	EU Cadmium Regulation Compliance	Regulation 488/2014 — cadmium levels in cacao must be below 0.60 mg/kg.	1	COMPLIANCE
18	EU	CACAO	Phytosanitary Certificate	Required at EU border inspection post.	1	DOCUMENT
19	EU	CACAO	Deforestation Regulation (EUDR)	From Dec 2024: proof cacao was not grown on deforested land.	1	COMPLIANCE
20	EU	CACAO	Due Diligence Statement	EUDR operator due diligence statement filed in EU system.	1	DOCUMENT
21	UAE	AVOCADO	Phytosanitary Certificate	ICA certificate verifying fruit fly free status.	1	DOCUMENT
22	UAE	AVOCADO	Cold Treatment Certificate	Some markets require cold chain treatment certification.	0	COMPLIANCE
23	UAE	AVOCADO	GlobalGAP Certification	Good Agricultural Practices certification preferred by UAE buyers.	0	COMPLIANCE
24	EU	AVOCADO	Phytosanitary Certificate	EU plant health requirements for fresh avocado.	1	DOCUMENT
25	EU	AVOCADO	MRL Compliance	Maximum Residue Levels — pesticide testing required.	1	COMPLIANCE
26	EU	AVOCADO	GlobalGAP or equivalent	Required by most EU supermarket buyers.	0	COMPLIANCE
27	ALL	ALL	RUT DIAN	Colombian tax registration — required for all exports.	1	DOCUMENT
28	ALL	ALL	ICA Export Registration	Instituto Colombiano Agropecuario registration for agricultural exporters.	1	COMPLIANCE
29	ALL	ALL	DIAN Customs Authorization	Authorization to operate as exporter with Colombian customs.	1	COMPLIANCE
30	ALL	ALL	Commercial Invoice	Standard export commercial invoice with HS code.	1	DOCUMENT
31	ALL	ALL	Packing List	Detailed packing list per shipment.	1	DOCUMENT
32	ALL	ALL	Bill of Lading / Airway Bill	Shipping document issued by carrier.	1	DOCUMENT
\.


--
-- Data for Name: economics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.economics (id, supplier_id, tipo_comprador, volumen_kg_ultima_cosecha, precio_venta_banda, tiempo_pago_dias, deuda_actual, uso_capital, comodidad_pagos, personas_dependientes, otras_fuentes_ingreso, situacion_economica, interes_canal_premium, conoce_precio_exportacion, ha_intentado_exportar) FROM stdin;
3	9	\N	100	\N	\N	100	{Logistiucs}	\N	\N	\N	\N	\N	\N	\N
4	10	\N	5000	\N	\N	2000	{"No capital, don't know the process..."}	\N	\N	\N	\N	\N	\N	\N
5	12	\N	4000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
8	16	\N	3000	\N	\N	2000	{logistics}	\N	\N	\N	\N	\N	\N	\N
40	64	\N	3000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
41	65	\N	2000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
42	66	\N	2000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
43	67	\N	2000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
44	68	\N	2000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
45	69	\N	1500	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
46	70	\N	1500	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
47	71	\N	1500	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
48	72	\N	1500	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
49	73	\N	1500	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: email_verification_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_verification_tokens (id, user_id, token, expires_at, used, created_at) FROM stdin;
7	23	778fc83cf3c9dfafd6a968783de466f97ae549472aa009614e9ecb1b050f28ff	2026-04-26 02:06:05.065+00	f	2026-04-25 02:06:05.065754+00
8	37	8bd1b97f42c15908057a920d96e19566f3223e342f3968ee90202fef57d5018d	2026-04-27 16:07:13.131+00	f	2026-04-26 16:07:13.132321+00
9	38	9fc1b30eac7cbc8b6bc4fb864de566f29c26bab56ed0d4a22139c247070a0d4e	2026-04-27 16:07:34.559+00	f	2026-04-26 16:07:34.559453+00
10	39	ef0210f97a0a4f1387bbde79ef497d8ee69663037637ab468ae6cbd7f25f5651	2026-04-27 16:12:34.375+00	f	2026-04-26 16:12:34.375952+00
11	40	7effb0c571b6f18cda8103cbdf4122b01666f4e68d0e86abdeac07f773cc3bb0	2026-04-27 16:12:56.679+00	f	2026-04-26 16:12:56.679685+00
12	41	0ed6c9584ad52b0a38ad6d7e7733deb65f8c65c61805531e972b7eea601b385c	2026-04-27 16:23:54.535+00	f	2026-04-26 16:23:54.537251+00
13	42	67d46d93024e585bdcfd1a4f327dda5524025813e0c809aa53bb3e5227ea68d2	2026-04-27 16:30:12.939+00	f	2026-04-26 16:30:12.940324+00
14	43	0d2aba9a584161d4321ae36604f66cc4a2fff65904ce22537417b80472bda123	2026-04-27 18:11:09.926+00	f	2026-04-26 18:11:09.926974+00
15	44	bb7f1e25cd3ba492bd115de0a49a3ae0eb0c23e0b476d1a1dc99db4526e521ff	2026-04-27 18:11:10.455+00	f	2026-04-26 18:11:10.455896+00
16	45	507f164f5665391cca421732dbefe8d57cebac1715669d506cb357e96e3929e5	2026-04-27 18:12:17.745+00	f	2026-04-26 18:12:17.745531+00
17	23	82a158de0d2dd2e9b36be4a04d0c87f211106904040fe264dbb751ad53e9904b	2026-04-28 00:24:45.848+00	f	2026-04-27 00:24:45.848842+00
18	46	bff27c5d931ebc43fd9997e004c0c0a4019fe4de92e1ff32a6f21417e79d8c3f	2026-04-28 13:29:32.715+00	f	2026-04-27 13:29:32.716622+00
\.


--
-- Data for Name: farms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.farms (id, supplier_id, cultivo_principal, variedad_cafe, hectareas_produccion, edad_plantas_anos, cosechas_por_ano, metodo_secado, acceso_agua, anos_en_finca, tenencia_tierra, asistencia_tecnica) FROM stdin;
2	2	cacao	March, April	1.00	\N	\N	\N	\N	\N	\N	\N
4	7	cacao	March	1.00	\N	\N	\N	\N	\N	\N	\N
5	9	cacao	March	1.00	\N	\N	\N	\N	\N	\N	\N
6	10	cafe	March, April, October	2.50	\N	\N	\N	\N	\N	\N	\N
7	12	cacao	\N	3.00	\N	\N	\N	\N	\N	\N	\N
10	16	bocadillo	\N	2.00	\N	\N	\N	\N	\N	\N	\N
48	64	cafe	\N	5.00	\N	\N	\N	\N	\N	\N	\N
49	65	Coffee	March-June	5.00	\N	\N	\N	\N	\N	\N	\N
50	66	Coffee	March-June	5.00	\N	\N	\N	\N	\N	\N	\N
51	67	Coffee	March-June	5.00	\N	\N	\N	\N	\N	\N	\N
52	68	Coffee	March-June	5.00	\N	\N	\N	\N	\N	\N	\N
53	69	Cacao	\N	3.00	\N	\N	\N	\N	\N	\N	\N
54	70	Cacao	\N	3.00	\N	\N	\N	\N	\N	\N	\N
55	71	Cacao	\N	3.00	\N	\N	\N	\N	\N	\N	\N
56	72	Cacao	\N	3.00	\N	\N	\N	\N	\N	\N	\N
57	73	Cacao	\N	3.00	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: inquiries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inquiries (id, product_id, buyer_email, buyer_name, company, country, message, quantity_kg, status, created_at) FROM stdin;
1	1	e2everify_suwco-@test.com	Verify Test	Verify Co	CO	We are interested in buying your coffee. Please send us a quote.	500	PENDING	2026-04-25 01:27:32.062347+00
\.


--
-- Data for Name: interaction_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.interaction_logs (id, event_type, actor_id, actor_type, reference_id, reference_type, payload, created_at) FROM stdin;
1	buyer_onboarding	41	buyer	7	buyer_profile	{"country": "US", "targetProducts": ["cafe"], "preferredIncoterm": "FOB"}	2026-04-26 16:23:54.401087+00
2	order_created	41	buyer	14	order	{"incoterm": "CIF", "totalUSD": 425, "feeStatus": "WAIVED", "itemCount": 1, "feeAmountUSD": 0}	2026-04-26 16:23:55.04108+00
3	supplier_onboarding	64	supplier	64	supplier	{"correlationId": "543a08f9-5d31-4f20-9f9d-475ef443e6cf"}	2026-04-26 16:28:35.603218+00
4	buyer_onboarding	42	buyer	9	buyer_profile	{"country": "United States", "targetProducts": ["cafe", "cacao"], "preferredIncoterm": "FOB"}	2026-04-26 16:30:13.091208+00
5	order_created	42	buyer	15	order	{"incoterm": "FOB", "totalUSD": 2850, "feeStatus": "WAIVED", "itemCount": 1, "feeAmountUSD": 0}	2026-04-26 16:31:09.636946+00
6	order_created	42	buyer	16	order	{"incoterm": "CIF", "totalUSD": 1700, "feeStatus": "WAIVED", "itemCount": 1, "feeAmountUSD": 0}	2026-04-26 16:31:09.721218+00
7	supplier_onboarding	65	supplier	65	supplier	{"correlationId": "d6e98e29-218b-4c79-8661-cbb665a15288"}	2026-04-26 18:09:52.963433+00
8	supplier_onboarding	66	supplier	66	supplier	{"correlationId": "2d877252-fa3c-4ac4-b3cc-a755461c7218"}	2026-04-26 18:09:53.027842+00
9	supplier_onboarding	67	supplier	67	supplier	{"correlationId": "8bcc8a0c-fb19-4307-a47b-a7284ef11bfb"}	2026-04-26 18:09:53.664621+00
10	supplier_onboarding	68	supplier	68	supplier	{"correlationId": "5b1750a9-998d-4723-8247-260b01a0ca3c"}	2026-04-26 18:09:54.651322+00
11	buyer_onboarding	43	buyer	10	buyer_profile	{"country": "USA", "targetProducts": ["Coffee"], "preferredIncoterm": "FOB"}	2026-04-26 18:11:10.09684+00
12	buyer_onboarding	44	buyer	11	buyer_profile	{"country": "UAE", "targetProducts": ["Cacao"], "preferredIncoterm": "CIF"}	2026-04-26 18:11:10.484922+00
13	order_created	43	buyer	17	order	{"incoterm": "FOB", "totalUSD": 850, "feeStatus": "WAIVED", "itemCount": 1, "feeAmountUSD": 0}	2026-04-26 18:11:31.568406+00
14	order_created	43	buyer	18	order	{"incoterm": "FOB", "totalUSD": 850, "feeStatus": "WAIVED", "itemCount": 1, "feeAmountUSD": 0}	2026-04-26 18:11:31.726856+00
15	order_created	43	buyer	19	order	{"incoterm": "FOB", "totalUSD": 850, "feeStatus": "WAIVED", "itemCount": 1, "feeAmountUSD": 0}	2026-04-26 18:11:31.860617+00
16	order_created	43	buyer	20	order	{"incoterm": "FOB", "totalUSD": 850, "feeStatus": "WAIVED", "itemCount": 1, "feeAmountUSD": 0}	2026-04-26 18:11:31.994993+00
17	order_created	43	buyer	21	order	{"incoterm": "FOB", "totalUSD": 850, "feeStatus": "WAIVED", "itemCount": 1, "feeAmountUSD": 0}	2026-04-26 18:11:32.267794+00
18	order_created	43	buyer	22	order	{"incoterm": "FOB", "totalUSD": 850, "feeStatus": "WAIVED", "itemCount": 1, "feeAmountUSD": 0}	2026-04-26 18:11:32.419876+00
19	order_created	43	buyer	23	order	{"incoterm": "FOB", "totalUSD": 850, "feeStatus": "WAIVED", "itemCount": 1, "feeAmountUSD": 0}	2026-04-26 18:11:32.56341+00
20	order_created	43	buyer	24	order	{"incoterm": "FOB", "totalUSD": 850, "feeStatus": "WAIVED", "itemCount": 1, "feeAmountUSD": 0}	2026-04-26 18:11:32.701551+00
21	order_created	43	buyer	25	order	{"incoterm": "FOB", "totalUSD": 850, "feeStatus": "WAIVED", "itemCount": 1, "feeAmountUSD": 0}	2026-04-26 18:11:32.843451+00
22	order_created	43	buyer	26	order	{"incoterm": "FOB", "totalUSD": 850, "feeStatus": "WAIVED", "itemCount": 1, "feeAmountUSD": 0}	2026-04-26 18:11:32.997811+00
23	order_created	43	buyer	27	order	{"incoterm": "FOB", "totalUSD": 850, "feeStatus": "PENDING", "itemCount": 1, "feeAmountUSD": 34}	2026-04-26 18:11:33.143028+00
24	order_created	43	buyer	28	order	{"incoterm": "FOB", "totalUSD": 850, "feeStatus": "PENDING", "itemCount": 1, "feeAmountUSD": 34}	2026-04-26 18:11:33.290395+00
25	supplier_onboarding	73	supplier	73	supplier	{"correlationId": "11d95e73-ef8b-449d-9797-acdffdf941a0"}	2026-04-26 18:11:52.439505+00
26	supplier_onboarding	70	supplier	70	supplier	{"correlationId": "a401d699-dea2-4df6-9599-938766514973"}	2026-04-26 18:11:52.522273+00
27	supplier_onboarding	71	supplier	71	supplier	{"correlationId": "9f46af3e-0f7e-4b3f-a0e8-382ecdc85932"}	2026-04-26 18:11:53.21849+00
28	supplier_onboarding	69	supplier	69	supplier	{"correlationId": "0601d6a9-797a-410c-8f67-abce063286be"}	2026-04-26 18:11:53.24093+00
29	supplier_onboarding	72	supplier	72	supplier	{"correlationId": "ee8e1ec0-cf33-4424-8c5e-ea9d6b4095e8"}	2026-04-26 18:11:53.241286+00
30	buyer_onboarding	45	buyer	14	buyer_profile	{"country": "USA", "targetProducts": ["Coffee"], "preferredIncoterm": "FOB"}	2026-04-26 18:12:17.730621+00
31	buyer_onboarding	46	buyer	15	buyer_profile	{"country": "United Arab Emirates", "targetProducts": [], "preferredIncoterm": null}	2026-04-27 13:29:32.620788+00
32	supplier_onboarding	75	supplier	75	supplier	{"correlationId": "062040b0-d895-4d30-b3b0-420eed96311c"}	2026-04-28 01:11:37.03842+00
\.


--
-- Data for Name: interactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.interactions (id, supplier_id, created_at, interaction_type, actor, notes, metadata) FROM stdin;
3	9	2026-04-20 03:48:23.660388+00	FORM_SUBMISSION	Babar	needs help	{"has_rut": false, "department": "Santander", "officer_code": "OF-001", "has_bank_account": false, "organic_certified": false}
4	10	2026-04-20 04:11:30.547353+00	FORM_SUBMISSION	Maria Garcia	Initial onboarding form submitted	{"has_rut": true, "department": "Huila", "officer_code": null, "has_bank_account": true, "organic_certified": true}
5	12	2026-04-20 12:59:08.313774+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": true, "department": "Santander", "officer_code": null, "has_bank_account": true, "organic_certified": false}
8	16	2026-04-20 14:48:47.419518+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": false, "department": "Santander", "officer_code": null, "has_bank_account": true, "organic_certified": false}
40	64	2026-04-26 16:28:29.789572+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": true, "department": "Huila", "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
41	65	2026-04-26 18:09:46.99846+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": "Huila", "officer_code": null, "ica_registered": "yes", "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
42	66	2026-04-26 18:09:47.52699+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": "Huila", "officer_code": null, "ica_registered": "yes", "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
43	67	2026-04-26 18:09:47.728113+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": "Huila", "officer_code": null, "ica_registered": "yes", "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
44	68	2026-04-26 18:09:47.930962+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": "Huila", "officer_code": null, "ica_registered": "yes", "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
45	69	2026-04-26 18:11:47.014592+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
46	70	2026-04-26 18:11:47.165015+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
47	71	2026-04-26 18:11:47.353853+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
48	72	2026-04-26 18:11:47.517811+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
49	73	2026-04-26 18:11:47.665629+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
\.


--
-- Data for Name: loans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loans (id, buyer_id, order_id, principal_usd, fee_usd, total_repayment_usd, apr_percent, term_days, status, due_at, credit_score_at_issuance, created_at, updated_at) FROM stdin;
2	1	\N	5000	49.315067	5049.315	12	30	REPAID	2026-05-14 04:29:40.207+00	500	2026-04-14 04:29:40.208202+00	2026-04-14 04:29:52.266+00
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, sender_id, receiver_id, content, read, created_at) FROM stdin;
\.


--
-- Data for Name: officer_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.officer_applications (id, full_name, email, phone, department, municipio, languages, experience_years, has_motorcycle, available_days, motivation, referral_code, status, created_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, quantity_kg, price_per_kg, total_usd) FROM stdin;
2	2	1	10	28.5	285
3	3	1	20	28.5	570
4	12	1	100	28.5	2850
5	13	1	50	28.5	1425
6	14	2	50	8.5	425
7	15	1	100	28.5	2850
8	16	2	200	8.5	1700
9	17	2	100	8.5	850
10	18	2	100	8.5	850
11	19	2	100	8.5	850
12	20	2	100	8.5	850
13	21	2	100	8.5	850
14	22	2	100	8.5	850
15	23	2	100	8.5	850
16	24	2	100	8.5	850
17	25	2	100	8.5	850
18	26	2	100	8.5	850
19	27	2	100	8.5	850
20	28	2	100	8.5	850
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, buyer_id, status, total_usd, incoterm, destination_port, shipping_method, notes, created_at, updated_at, fee_percentage, fee_amount_usd, fee_status) FROM stdin;
2	39	INQUIRY	285	FOB	\N	\N	\N	2026-04-26 16:18:00.972041+00	2026-04-26 16:18:00.972041+00	4	0	WAIVED
3	39	INQUIRY	570	FOB	\N	\N	\N	2026-04-26 16:18:01.189113+00	2026-04-26 16:18:01.189113+00	4	0	WAIVED
4	39	INQUIRY	100	FOB	\N	\N	\N	2026-04-26 16:18:01.432699+00	2026-04-26 16:18:01.432699+00	4	0	WAIVED
5	39	INQUIRY	100	FOB	\N	\N	\N	2026-04-26 16:18:01.432699+00	2026-04-26 16:18:01.432699+00	4	0	WAIVED
6	39	INQUIRY	100	FOB	\N	\N	\N	2026-04-26 16:18:01.432699+00	2026-04-26 16:18:01.432699+00	4	0	WAIVED
7	39	INQUIRY	100	FOB	\N	\N	\N	2026-04-26 16:18:01.432699+00	2026-04-26 16:18:01.432699+00	4	0	WAIVED
8	39	INQUIRY	100	FOB	\N	\N	\N	2026-04-26 16:18:01.432699+00	2026-04-26 16:18:01.432699+00	4	0	WAIVED
9	39	INQUIRY	100	FOB	\N	\N	\N	2026-04-26 16:18:01.432699+00	2026-04-26 16:18:01.432699+00	4	0	WAIVED
10	39	INQUIRY	100	FOB	\N	\N	\N	2026-04-26 16:18:01.432699+00	2026-04-26 16:18:01.432699+00	4	0	WAIVED
11	39	INQUIRY	100	FOB	\N	\N	\N	2026-04-26 16:18:01.432699+00	2026-04-26 16:18:01.432699+00	4	0	WAIVED
12	39	INQUIRY	2850	FOB	\N	\N	\N	2026-04-26 16:18:01.486689+00	2026-04-26 16:18:01.486689+00	4	114	PENDING
13	39	INQUIRY	1425	FOB	\N	\N	\N	2026-04-26 16:18:01.676528+00	2026-04-26 16:18:01.676528+00	4	57	PENDING
14	41	INQUIRY	425	CIF	\N	\N	\N	2026-04-26 16:23:55.023912+00	2026-04-26 16:23:55.023912+00	4	0	WAIVED
15	42	INQUIRY	2850	FOB	Port of Miami	\N	MVP validation order 1	2026-04-26 16:31:09.57963+00	2026-04-26 16:31:09.57963+00	4	0	WAIVED
16	42	INQUIRY	1700	CIF	Port of New York	\N	MVP validation order 2	2026-04-26 16:31:09.700457+00	2026-04-26 16:31:09.700457+00	4	0	WAIVED
17	43	INQUIRY	850	FOB	\N	\N	\N	2026-04-26 18:11:31.530906+00	2026-04-26 18:11:31.530906+00	4	0	WAIVED
18	43	INQUIRY	850	FOB	\N	\N	\N	2026-04-26 18:11:31.698386+00	2026-04-26 18:11:31.698386+00	4	0	WAIVED
19	43	INQUIRY	850	FOB	\N	\N	\N	2026-04-26 18:11:31.846213+00	2026-04-26 18:11:31.846213+00	4	0	WAIVED
20	43	INQUIRY	850	FOB	\N	\N	\N	2026-04-26 18:11:31.980929+00	2026-04-26 18:11:31.980929+00	4	0	WAIVED
21	43	INQUIRY	850	FOB	\N	\N	\N	2026-04-26 18:11:32.123131+00	2026-04-26 18:11:32.123131+00	4	0	WAIVED
22	43	INQUIRY	850	FOB	\N	\N	\N	2026-04-26 18:11:32.396435+00	2026-04-26 18:11:32.396435+00	4	0	WAIVED
23	43	INQUIRY	850	FOB	\N	\N	\N	2026-04-26 18:11:32.545008+00	2026-04-26 18:11:32.545008+00	4	0	WAIVED
24	43	INQUIRY	850	FOB	\N	\N	\N	2026-04-26 18:11:32.686425+00	2026-04-26 18:11:32.686425+00	4	0	WAIVED
25	43	INQUIRY	850	FOB	\N	\N	\N	2026-04-26 18:11:32.827111+00	2026-04-26 18:11:32.827111+00	4	0	WAIVED
26	43	INQUIRY	850	FOB	\N	\N	\N	2026-04-26 18:11:32.965777+00	2026-04-26 18:11:32.965777+00	4	0	WAIVED
27	43	INQUIRY	850	FOB	\N	\N	\N	2026-04-26 18:11:33.122532+00	2026-04-26 18:11:33.122532+00	4	34	PENDING
28	43	INQUIRY	850	FOB	\N	\N	\N	2026-04-26 18:11:33.267545+00	2026-04-26 18:11:33.267545+00	4	34	PENDING
\.


--
-- Data for Name: origin_stories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.origin_stories (id, product_id, farmer_name, farmer_photo, farm_name, region, elevation, farm_size_ha, years_farming, story, challenges, impact, images, video_url, created_at) FROM stdin;
1	1	Carlos Andres Muñoz	https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400	Finca El Paraíso	Huila, Colombia	1,750m above sea level	4.2	23	Carlos inherited the land from his father in 2001, a 4-hectare plot on the slopes of the Andes where the morning cloud cover and volcanic soil create exceptional cup quality. For over two decades he has perfected the honey process — picking only the reddest cherries at peak ripeness, then drying them on raised African beds for 22 days under the Huila sun. His coffees consistently score above 87 on the SCA scale and have been served in specialty cafés from Seoul to Stockholm. Every harvest is personal for Carlos — he knows each tree by name, and it shows in the cup.	Erratic rainfall caused by La Niña has pushed harvest unpredictability up by 30% over the last 5 years. Input costs — fertilizer and labor — have risen faster than coffee prices on the C-market, squeezing margins. Carlos cannot afford to sell into commodity channels and survive. He needs buyers who value quality and pay for it.	Your purchase pays a direct farm-gate premium of 40–65% above the C-market price, directly into Carlos' hands. No coyote intermediaries, no cooperative overheads on this lot. The premium from one container funds school fees for 11 children in the community and pays two full-time farm workers a living wage year-round.	{https://images.unsplash.com/photo-1611174275735-6aa0c90db4ac?w=800,https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800}	\N	2026-04-07 16:45:29.487019+00
2	2	Doña Esperanza Villamil	https://images.unsplash.com/photo-1595701003538-e7e76b5eeea4?w=400	Finca Cacao Verde	Tumaco, Nariño, Colombia	60m above sea level	6.8	31	Doña Esperanza is one of 34 women who lead the Cacao del Pacífico cooperative in Tumaco, one of Colombia's most biodiverse coastal regions. She started her cacao farm in 1993 with 200 trees, building it through two decades of conflict and now peace into a 6.8-hectare model farm that trains younger women in proper fermentation. Her Nacional variety cacao ferments for exactly 6 days in wooden boxes she built herself, producing beans with the floral, red fruit notes that award-winning chocolate makers seek.	The Pacific coast's high humidity creates constant pressure from frosty pod disease, requiring organic pest management. The port at Tumaco adds logistical complexity — road infrastructure is poor and container access is limited. Buyers who understand these constraints and plan lead times accordingly are the foundation of Doña Esperanza's business.	Fine-flavor cacao directly supports one of Colombia's most biodiverse regions and its women-led farming community. Your sourcing decision supports 34 women-led farms, funds the cooperative's fermentation training program for 80 new farmers annually, and helps protect 1,200 hectares of Pacific rainforest through sustainable agroforestry.	{https://images.unsplash.com/photo-1511381939415-e44f5fc0ad35?w=800}	\N	2026-04-07 16:45:29.495132+00
3	3	Miguel Ángel Torres	https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400	Finca Aguacate Andino	Antioquia, Colombia	1,600m above sea level	22	14	Miguel transitioned from cattle ranching to Hass avocado cultivation in 2010 after participating in a government reforestation program. What started as 3 hectares of experimental planting is now 22 hectares of GlobalGAP-certified production. His farm sits in Antioquia's banana zone, where the altitude and temperature range produces the creamiest avocados in Colombia. Miguel works directly with 8 neighboring smallholder families through his packhouse, providing guaranteed purchase contracts at above-market prices.	Avocado's boom-and-bust price cycles make cashflow planning very difficult. The 2022–2023 market correction pushed farm-gate prices down 40%. Miguel has responded by investing in extended storage and cold-chain capacity to give buyers flexible delivery windows. Climate change is shifting optimal growing zones upward, requiring constant altitude monitoring.	Every tonne of avocado you source from Finca Aguacate Andino supports Miguel's 8 partner families' guaranteed income contracts. The farm practices strict water recycling — 85% of irrigation water is recaptured — protecting the watershed. Choosing Andean avocado instead of Chilean or Kenyan sources saves 4,200 kg of CO₂ in shipping per container.	{https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800}	\N	2026-04-07 16:45:29.505207+00
4	4	Rosario & Luis Cárdenas	https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400	Finca La Golondrina	Boyacá, Colombia	2,600m above sea level	1.8	19	At 2,600 meters in the Boyacá highlands, Rosario and Luis grow goldenberries under the damp cloud forest conditions that give the fruit its exceptional sweetness-acid balance. Their 1.8-hectare family farm is intercropped with native trees, creating biodiversity corridors that protect the watershed. The couple processes and freeze-dries their harvest in a small facility built with micro-credit from a fair trade organization. Their goldenberry powder is exported to premium superfood brands in 12 countries.	Frost events at this altitude can wipe out 40% of a harvest overnight, and insurance is unavailable in this microzone. The couple cannot afford crop losses and rely on forward purchase commitments from buyers to secure annual planning. Freeze-drying equipment maintenance is their biggest capital constraint.	This is one of Colombia's highest-altitude farms, producing some of the world's most nutrient-dense goldenberries. Purchasing directly eliminates 4 middlemen who would otherwise capture 65% of the final sale price. Your order provides the Cárdenas family with year-round income stability.	{https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800}	\N	2026-04-07 16:45:29.51503+00
5	5	Jorge Esteban Ríos	https://images.unsplash.com/photo-1547592180-85f173990554?w=400	Selva Viva Agroforestry	Amazon Foothills, Caquetá, Colombia	350m above sea level	45	11	Jorge is a pioneer in what he calls 'productive conservation' — growing native superfoods within a certified 45-hectare agroforestry system in the Colombian Amazon foothills. His operation is certified organic and employs 22 local families, many of whom are former coca growers who transitioned through a government alternative livelihoods program. The farm is a living laboratory for biodiversity — 178 plant species coexist with the crop rows.	Amazon logistics are the hardest in Colombia — a truck journey to Bogotá takes 18 hours on a partially-paved road. Cold chain continuity is the top constraint for fresh products. Jorge exports only freeze-dried and powdered products to manage this. Deforestation pressure from neighboring cattle operations is a constant threat.	Sourcing from Selva Viva directly protects 45 hectares of Amazon-adjacent forest. Every USD you spend here generates 3x the rural employment of commodity agriculture. The farm is part of Colombia's REDD+ carbon credit program. 22 families have a stable alternative to illegal crop cultivation because of buyers like you.	{https://images.unsplash.com/photo-1448375240586-882707db888b?w=800}	\N	2026-04-07 16:45:29.525013+00
6	6	Ximena Patiño Gómez	https://images.unsplash.com/photo-1546961342-ea5f62d918e2?w=400	Finca Paraíso Negro	Sierra Nevada de Santa Marta, Colombia	1,200m above sea level	3.1	8	Ximena returned to her family's land in the Sierra Nevada mountains after a decade working in Bogotá as an agronomist. What she found was a degraded 3-hectare plot with old, unproductive coffee trees. Over 8 years she has grafted new high-scoring varieties onto native rootstock, rebuilt the soil through composting, and installed a micro-wet mill. Her 2024 honey-process lot scored 90.3 at a Bogotá competition, placing first in the under-35 farmer category.	Young farmers like Ximena face systemic barriers: no collateral for bank credit, volatile input prices, and buyers who prefer established farms with track records. She relies entirely on buyers willing to take a chance on quality over history. Climate irregularity is compressing the ideal harvest window at her altitude.	Supporting Ximena is investing in the next generation of Colombian coffee. She is part of a cohort of 15 young farmers in the Sierra Nevada who will define Colombian specialty coffee's future. Your purchase funds her micro-processing expansion, allowing her to double production by 2026.	{https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800}	\N	2026-04-07 16:45:29.532466+00
7	7	Carlos Andres Muñoz	https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400	Finca El Paraíso	Huila, Colombia	1,750m above sea level	4.2	23	Carlos inherited the land from his father in 2001, a 4-hectare plot on the slopes of the Andes where the morning cloud cover and volcanic soil create exceptional cup quality. For over two decades he has perfected the honey process — picking only the reddest cherries at peak ripeness, then drying them on raised African beds for 22 days under the Huila sun. His coffees consistently score above 87 on the SCA scale and have been served in specialty cafés from Seoul to Stockholm. Every harvest is personal for Carlos — he knows each tree by name, and it shows in the cup.	Erratic rainfall caused by La Niña has pushed harvest unpredictability up by 30% over the last 5 years. Input costs — fertilizer and labor — have risen faster than coffee prices on the C-market, squeezing margins. Carlos cannot afford to sell into commodity channels and survive. He needs buyers who value quality and pay for it.	Your purchase pays a direct farm-gate premium of 40–65% above the C-market price, directly into Carlos' hands. No coyote intermediaries, no cooperative overheads on this lot. The premium from one container funds school fees for 11 children in the community and pays two full-time farm workers a living wage year-round.	{https://images.unsplash.com/photo-1611174275735-6aa0c90db4ac?w=800,https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800}	\N	2026-04-07 16:45:29.543582+00
8	8	Doña Esperanza Villamil	https://images.unsplash.com/photo-1595701003538-e7e76b5eeea4?w=400	Finca Cacao Verde	Tumaco, Nariño, Colombia	60m above sea level	6.8	31	Doña Esperanza is one of 34 women who lead the Cacao del Pacífico cooperative in Tumaco, one of Colombia's most biodiverse coastal regions. She started her cacao farm in 1993 with 200 trees, building it through two decades of conflict and now peace into a 6.8-hectare model farm that trains younger women in proper fermentation. Her Nacional variety cacao ferments for exactly 6 days in wooden boxes she built herself, producing beans with the floral, red fruit notes that award-winning chocolate makers seek.	The Pacific coast's high humidity creates constant pressure from frosty pod disease, requiring organic pest management. The port at Tumaco adds logistical complexity — road infrastructure is poor and container access is limited. Buyers who understand these constraints and plan lead times accordingly are the foundation of Doña Esperanza's business.	Fine-flavor cacao directly supports one of Colombia's most biodiverse regions and its women-led farming community. Your sourcing decision supports 34 women-led farms, funds the cooperative's fermentation training program for 80 new farmers annually, and helps protect 1,200 hectares of Pacific rainforest through sustainable agroforestry.	{https://images.unsplash.com/photo-1511381939415-e44f5fc0ad35?w=800}	\N	2026-04-07 16:45:29.554094+00
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, used, created_at) FROM stdin;
7	18	2491f8b9db7085c33f0aff750d5c4d43b60da0e591e6943a4fd98be627ba9761	2026-04-25 03:04:36.187+00	f	2026-04-25 02:04:36.188005+00
8	18	1a17bf732d0ce0d0055ecb1cd2c7c9e833e09c23ab9f644e461d4beae209b400	2026-04-25 03:12:43.643+00	f	2026-04-25 02:12:43.644668+00
9	18	e7ff709148d8b0733bc2c4ed6530b229fbaad612ea65710cc7bf0b681d6b13f5	2026-04-25 13:19:45.685+00	f	2026-04-25 12:19:45.686437+00
\.


--
-- Data for Name: payment_milestones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_milestones (id, order_id, name, description, amount_usd, percentage, status, due_date, released_at) FROM stdin;
\.


--
-- Data for Name: product_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_analytics (id, product_id, views, inquiries, saves, rfq_count, updated_at) FROM stdin;
1	1	847	34	89	12	2026-04-07 15:08:46.942332+00
2	2	612	28	54	8	2026-04-07 15:08:46.942332+00
3	3	1205	67	143	22	2026-04-07 15:08:46.942332+00
4	4	389	15	28	5	2026-04-07 15:08:46.942332+00
5	5	2134	89	287	41	2026-04-07 15:08:46.942332+00
6	6	456	19	67	9	2026-04-07 15:08:46.942332+00
7	7	678	31	98	14	2026-04-07 15:08:46.942332+00
8	8	523	22	76	11	2026-04-07 15:08:46.942332+00
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, company_id, name, category, sub_category, description, origin, altitude, process, variety, min_order_kg, max_order_kg, price_per_kg_usd, available_kg, harvest_season, images, certifications, cupping, active, featured, origin_story, farmer_name, created_at, farm_name, farm_lat, farm_lng, harvest_date, smallholder, women_led, direct_trade, climate_resilient, organic, families_supported) FROM stdin;
1	1	Huila Natural Geisha AAA	COFFEE	Specialty Single Origin	Extraordinary natural-processed Geisha from San Agustín, Huila. Wine-like fermentation notes, jasmine florals, and a clean bergamot finish. SCA score 92. One of Colombia's highest-scoring exports.	Huila	1,800-2,100 masl	Natural	Geisha	100	5000	28.5	3500	April-June	{https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800,https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800}	{"USDA Organic","Fair Trade","SCA Q Grade"}	92	t	t	Carlos inherited the land from his father in 2001, a 4-hectare plot on the slopes of the Andes where the morning cloud cover and volcanic soil create exceptional cup quality. For over two decades he has perfected the honey process — picking only the reddest cherries at peak ripeness, then drying them on raised African beds for 22 days under the Hui...	Carlos Andres Muñoz	2026-04-07 13:35:50.759877+00	Finca El Paraíso	\N	\N	\N	t	f	t	f	f	11
2	1	Huila Washed Castillo SCA 87	COFFEE	Specialty Single Origin	Classic washed Castillo from Acevedo municipality. Bright red apple acidity, caramel sweetness, balanced almond finish. Ideal for espresso blends or pour-over. FOB available from Bogotá port.	Huila	1,600-1,900 masl	Washed	Castillo	500	20000	8.5	18000	October-December	{https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800}	{"Rainforest Alliance",UTZ}	87	t	t	Doña Esperanza is one of 34 women who lead the Cacao del Pacífico cooperative in Tumaco, one of Colombia's most biodiverse coastal regions. She started her cacao farm in 1993 with 200 trees, building it through two decades of conflict and now peace into a 6.8-hectare model farm that trains younger women in proper fermentation. Her Nacional variety ...	Doña Esperanza Villamil	2026-04-07 13:35:50.759877+00	Finca Cacao Verde	\N	\N	\N	t	t	t	f	t	34
3	2	Tumaco Fine Flavor Cacao Nacional	CACAO	Fine Flavor	Rare Colombian Nacional cacao from Tumaco coast. Complex flavor profile: red berries, tobacco, and dark chocolate with notes of leather. 7-day box fermentation, 3-day sun drying. Ideal for craft single-origin chocolate.	Tumaco	0-200 masl	Fermented	Nacional	250	5000	4.2	8000	Year-round (primary October-February)	{https://images.unsplash.com/photo-1614088685112-0a760b71a3c8?w=800}	{"USDA Organic","Rainforest Alliance"}	\N	t	t	Miguel transitioned from cattle ranching to Hass avocado cultivation in 2010 after participating in a government reforestation program. What started as 3 hectares of experimental planting is now 22 hectares of GlobalGAP-certified production. His farm sits in Antioquia's banana zone, where the altitude and temperature range produces the creamiest av...	Miguel Ángel Torres	2026-04-07 13:35:50.759877+00	Finca Aguacate Andino	\N	\N	\N	f	f	t	t	f	8
4	2	Cacao Fino CCN-51 Fermentado	CACAO	Commercial Grade	High-yielding CCN-51 cacao, properly fermented and dried for consistent fat content and melt characteristics. Suitable for industrial chocolate manufacturers seeking reliable Colombian origin.	Tumaco	0-150 masl	Fermented	CCN-51	1000	\N	2.8	25000	Year-round	{https://images.unsplash.com/photo-1606312619070-d48b5c5fbe49?w=800}	{"Rainforest Alliance"}	\N	t	f	At 2,600 meters in the Boyacá highlands, Rosario and Luis grow goldenberries under the damp cloud forest conditions that give the fruit its exceptional sweetness-acid balance. Their 1.8-hectare family farm is intercropped with native trees, creating biodiversity corridors that protect the watershed. The couple processes and freeze-dries their harve...	Rosario & Luis Cárdenas	2026-04-07 13:35:50.759877+00	Finca La Golondrina	\N	\N	\N	t	f	t	t	t	4
5	3	Avocado Hass Colombia Premium	AVOCADO	Fresh Export Grade	Grade A Hass avocado from Antioquia and Santander. Buttery texture, green skin (Mendez variant), long shelf life (21-28 days post-harvest). Available FOB Barranquilla. Minimum 100 boxes per order.	Antioquia	1,200-2,000 masl	\N	Hass	1000	\N	1.8	50000	March-August (primary crop)	{https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800}	{GlobalGAP,"Rainforest Alliance"}	\N	t	t	Jorge is a pioneer in what he calls 'productive conservation' — growing native superfoods within a certified 45-hectare agroforestry system in the Colombian Amazon foothills. His operation is certified organic and employs 22 local families, many of whom are former coca growers who transitioned through a government alternative livelihoods program. T...	Jorge Esteban Ríos	2026-04-07 13:35:50.759877+00	Selva Viva Agroforestry	\N	\N	\N	f	f	t	t	t	22
6	3	Uchuva (Cape Gooseberry) IQF Frozen	EXOTIC_FRUIT	Processed Frozen	Individually quick-frozen Colombian uchuva (Physalis peruviana). Intense tropical-citrus flavor, high vitamin C content. Packed in 5kg bags, 10 bags per carton. Suitable for beverage, confectionery, and foodservice applications.	Cundinamarca	2,400-2,800 masl	\N	Physalis peruviana	500	5000	3.4	12000	Year-round	{https://images.unsplash.com/photo-1597005819399-0de55e64c80f?w=800}	{"USDA Organic",Halal}	\N	t	f	Ximena returned to her family's land in the Sierra Nevada mountains after a decade working in Bogotá as an agronomist. What she found was a degraded 3-hectare plot with old, unproductive coffee trees. Over 8 years she has grafted new high-scoring varieties onto native rootstock, rebuilt the soil through composting, and installed a micro-wet mill. H...	Ximena Patiño Gómez	2026-04-07 13:35:50.759877+00	Finca Paraíso Negro	\N	\N	\N	t	t	t	f	f	6
8	4	Maca Andina Gelatinizada Powder	SUPERFOOD	Processed Powder	Gelatinized Andean maca root powder from the Nariño highlands. Gelatinization removes starch for superior bioavailability and digestibility. 65g+ carbohydrates, 14g protein per 100g. USDA Organic, Halal certified.	Nariño	3,000-4,000 masl	\N	Lepidium meyenii	50	1000	22	2000	August-October	{https://images.unsplash.com/photo-1611695434398-4f4b330623e8?w=800}	{"USDA Organic",Halal,Non-GMO}	\N	t	t	Doña Esperanza is one of 34 women who lead the Cacao del Pacífico cooperative in Tumaco, one of Colombia's most biodiverse coastal regions. She started her cacao farm in 1993 with 200 trees, building it through two decades of conflict and now peace into a 6.8-hectare model farm that trains younger women in proper fermentation. Her Nacional variety ...	Doña Esperanza Villamil	2026-04-07 13:35:50.759877+00	Finca Cacao Verde	\N	\N	\N	t	t	t	f	t	34
7	4	Goldenberry Freeze-Dried Powder	SUPERFOOD	Freeze-Dried	Premium freeze-dried uchuva (goldenberry) powder. 25% vitamin C content, 15% dietary fiber. No additives, no fillers. Packed in nitrogen-flushed 1kg foil pouches. NSF certified, Halal and Kosher. Ideal for nutraceutical, supplement, and functional food applications.	Nariño	2,600-3,200 masl	\N	Physalis peruviana	50	500	38	800	Year-round (low season July-September)	{https://images.unsplash.com/photo-1630847564720-8ed96f7f0490?w=800}	{"USDA Organic",Halal,Kosher}	\N	t	t	Carlos inherited the land from his father in 2001, a 4-hectare plot on the slopes of the Andes where the morning cloud cover and volcanic soil create exceptional cup quality. For over two decades he has perfected the honey process — picking only the reddest cherries at peak ripeness, then drying them on raised African beds for 22 days under the Hui...	Carlos Andres Muñoz	2026-04-07 13:35:50.759877+00	Finca El Paraíso	\N	\N	\N	t	f	t	f	f	11
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profiles (id, user_id, first_name, last_name, phone, country, language, avatar_url) FROM stdin;
1	1	Carlos	Mendoza	\N	Colombia	es	\N
2	2	Maria	Santos	\N	Colombia	es	\N
3	3	Jorge	Herrera	\N	Colombia	es	\N
4	4	Rosa	Vasquez	\N	Colombia	es	\N
18	18	Syed	Irfan	5126591415	US	en	\N
7	7	Fincava	Admin	\N	\N	en	\N
23	23	Syed	Irfan	\N	CO	en	\N
27	27	Carlos	Sánchez	\N	CO	en	\N
28	28	Ahmed	Al-Rashid	\N	AE	en	\N
37	37	Test	Buyer	\N	Germany	en	\N
38	38	Ana	Buyer	\N	Netherlands	en	\N
39	39	Maria	Garcia	\N	Netherlands	en	\N
40	40	X	Y	\N	US	en	\N
41	41	Log	Test	\N	US	en	\N
42	42	MVP	Buyer	\N	United States	en	\N
43	43	Alice	Test	\N	USA	en	\N
44	44	Bob	Test	\N	UAE	en	\N
45	45	Failsafe	Test	\N	USA	en	\N
46	46	Email	Test	\N	United Arab Emirates	en	\N
\.


--
-- Data for Name: repayments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.repayments (id, loan_id, amount_usd, note, created_at) FROM stdin;
1	2	5049.32	Full repayment	2026-04-14 04:29:52.225923+00
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews (id, author_id, product_id, rating, comment, verified, created_at) FROM stdin;
\.


--
-- Data for Name: rfq_responses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rfq_responses (id, rfq_id, company_id, price_per_kg_usd, lead_time_days, message, awarded, created_at) FROM stdin;
\.


--
-- Data for Name: rfqs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rfqs (id, buyer_id, title, description, product_category, quantity_kg, target_price_usd, destination, destination_port, incoterm, deadline, status, created_at) FROM stdin;
\.


--
-- Data for Name: shipments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shipments (id, order_id, status, origin_port, destination_port, carrier, tracking_number, container_number, eta, departed_at, arrived_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: staff_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staff_roles (id, user_id, role, assigned_by, created_at) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (id, company_id, tier, active, expires_at, created_at) FROM stdin;
1	1	PREMIUM	1	\N	2026-04-07 15:08:42.803788+00
2	2	PRO	1	\N	2026-04-07 15:08:42.803788+00
3	3	PREMIUM	1	\N	2026-04-07 15:08:42.803788+00
4	4	FREE	1	\N	2026-04-07 15:08:42.803788+00
\.


--
-- Data for Name: supplier_evaluations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplier_evaluations (id, supplier_id, eligibility_status, commercial_score, sellable_status, pathway, score_snapshot, threshold_version, evaluated_at) FROM stdin;
50	64	FAIL	35	NOT_READY	D	{"pathway": "D", "aiOutputId": 49, "complianceGaps": "RUT DIAN - Missing (Critical), Fitosanitary Certification - Missing (Critical), DIAN Exporter Registration - Missing (Critical), Production volume documentation - Insufficient, Land rights documentation - Not verified, Post-harvest quality protocols - Not documented", "exportReadinessScore": 35}	v0_pre_buyer_calls	2026-04-26 16:28:35.551702+00
51	65	FAIL	25	NOT_READY	D	{"pathway": "D", "aiOutputId": 50, "complianceGaps": "RUT DIAN not registered, Fitosanitary certification absent, DIAN exporter registration missing, No post-harvest quality documentation, Incomplete farm operational data", "exportReadinessScore": 25}	v0_pre_buyer_calls	2026-04-26 18:09:52.943797+00
52	66	FAIL	35	NOT_READY	D	{"pathway": "D", "aiOutputId": 51, "complianceGaps": "RUT DIAN registration missing, Phytosanitary certification absent, DIAN exporter registration not obtained, No post-harvest quality documentation, Land tenure rights not documented", "exportReadinessScore": 35}	v0_pre_buyer_calls	2026-04-26 18:09:53.004793+00
53	67	FAIL	25	NOT_READY	D	{"pathway": "D", "aiOutputId": 52, "complianceGaps": "RUT DIAN - Critical for export operations, Fitosanitary Certificate - Required for agricultural exports, DIAN Exporter Registration - Mandatory for cross-border trade, Farm tenure documentation - Not provided, Production methodology documentation - Incomplete", "exportReadinessScore": 25}	v0_pre_buyer_calls	2026-04-26 18:09:53.640494+00
54	68	FAIL	28	NOT_READY	D	{"pathway": "D", "aiOutputId": 53, "complianceGaps": "RUT DIAN - Critical requirement for all export operations, Phytosanitary Certificate - Mandatory for agricultural exports, DIAN Exporter Registration - Legal requirement for cross-border commerce", "exportReadinessScore": 28}	v0_pre_buyer_calls	2026-04-26 18:09:54.628855+00
55	73	FAIL	25	NOT_READY	D	{"pathway": "D", "aiOutputId": 54, "complianceGaps": "RUT DIAN - Not registered, ICA Registry - Not obtained, Phytosanitary Certificate - Not obtained, DIAN Exporter Status - Not registered", "exportReadinessScore": 25}	v0_pre_buyer_calls	2026-04-26 18:11:52.405367+00
56	70	FAIL	25	NOT_READY	D	{"pathway": "D", "aiOutputId": 55, "complianceGaps": "RUT DIAN - Not registered, ICA Registration - Not obtained, Phytosanitary Certificate - Not acquired, DIAN Exporter Status - Not registered", "exportReadinessScore": 25}	v0_pre_buyer_calls	2026-04-26 18:11:52.500747+00
57	71	FAIL	25	NOT_READY	D	{"pathway": "D", "aiOutputId": 56, "complianceGaps": "RUT DIAN not registered, ICA registro not obtained, Fitosanitario certification missing, DIAN exportador status not achieved", "exportReadinessScore": 25}	v0_pre_buyer_calls	2026-04-26 18:11:53.174877+00
58	69	FAIL	25	NOT_READY	D	{"pathway": "D", "aiOutputId": 58, "complianceGaps": "RUT DIAN not registered, ICA registration missing, Phytosanitary certification absent, DIAN exporter status not obtained, No export documentation framework", "exportReadinessScore": 25}	v0_pre_buyer_calls	2026-04-26 18:11:53.194829+00
59	72	FAIL	28	NOT_READY	D	{"pathway": "D", "aiOutputId": 57, "complianceGaps": "RUT DIAN not registered, ICA registro not obtained, Fitosanitario certification missing, DIAN exporter status not registered", "exportReadinessScore": 28}	v0_pre_buyer_calls	2026-04-26 18:11:53.195016+00
\.


--
-- Data for Name: supplier_state_transitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplier_state_transitions (id, supplier_id, from_state, to_state, threshold_version, commercial_score_at_transition, actor, justification, evaluation_id, created_at) FROM stdin;
57	64	\N	NOT_READY	v0_pre_buyer_calls	35	SYSTEM	\N	50	2026-04-26 16:28:35.551702+00
58	64	NOT_READY	SELLABLE	v0_pre_buyer_calls	\N	ADMIN	MVP validation - docs reviewed, compliance confirmed	\N	2026-04-26 16:29:32.409486+00
59	65	\N	NOT_READY	v0_pre_buyer_calls	25	SYSTEM	\N	51	2026-04-26 18:09:52.943797+00
60	66	\N	NOT_READY	v0_pre_buyer_calls	35	SYSTEM	\N	52	2026-04-26 18:09:53.004793+00
61	67	\N	NOT_READY	v0_pre_buyer_calls	25	SYSTEM	\N	53	2026-04-26 18:09:53.640494+00
62	68	\N	NOT_READY	v0_pre_buyer_calls	28	SYSTEM	\N	54	2026-04-26 18:09:54.628855+00
63	73	\N	NOT_READY	v0_pre_buyer_calls	25	SYSTEM	\N	55	2026-04-26 18:11:52.405367+00
64	70	\N	NOT_READY	v0_pre_buyer_calls	25	SYSTEM	\N	56	2026-04-26 18:11:52.500747+00
65	71	\N	NOT_READY	v0_pre_buyer_calls	25	SYSTEM	\N	57	2026-04-26 18:11:53.174877+00
66	69	\N	NOT_READY	v0_pre_buyer_calls	25	SYSTEM	\N	58	2026-04-26 18:11:53.194829+00
67	72	\N	NOT_READY	v0_pre_buyer_calls	28	SYSTEM	\N	59	2026-04-26 18:11:53.195016+00
43	2	NOT_READY	SELLABLE	v0_pre_buyer_calls	\N	ADMIN	setup for test	\N	2026-04-22 18:49:40.43707+00
44	2	SELLABLE	PUBLISHED	v0_pre_buyer_calls	\N	ADMIN	Trying to publish non-sellable	\N	2026-04-22 18:49:40.848642+00
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, nombre_completo, whatsapp_number, municipio, vereda, supplier_type, registered_by, status, consent_given, consent_date, created_at, updated_at, department, eligibility_status, commercial_score, sellable_status, graduation_pathway, next_actions, commercial_score_at_onboarding, last_evaluated_at, threshold_version, email) FROM stdin;
64	MVP Test Supplier	+573001234999	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-26 16:28:29.426+00	2026-04-26 16:28:29.439156+00	2026-04-26 16:28:29.439156+00	Huila	FAIL	35	SELLABLE	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "fitosanitario"]}	\N	2026-04-26 16:28:35.571+00	v0_pre_buyer_calls	\N
65	Test Supplier S1-1 1777226986	+57300000001	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-26 18:09:46.49+00	2026-04-26 18:09:46.500402+00	2026-04-26 18:09:46.500402+00	Huila	FAIL	25	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "fitosanitario"]}	\N	2026-04-26 18:09:52.948+00	v0_pre_buyer_calls	\N
66	Test Supplier S1-2 1777226986	+57300000002	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-26 18:09:47.292+00	2026-04-26 18:09:47.306468+00	2026-04-26 18:09:47.306468+00	Huila	FAIL	35	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "fitosanitario"]}	\N	2026-04-26 18:09:53.01+00	v0_pre_buyer_calls	\N
67	Test Supplier S1-3 1777226986	+57300000003	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-26 18:09:47.65+00	2026-04-26 18:09:47.651185+00	2026-04-26 18:09:47.651185+00	Huila	FAIL	25	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "fitosanitario"]}	\N	2026-04-26 18:09:53.644+00	v0_pre_buyer_calls	\N
68	Test Supplier S1-4 1777226986	+57300000004	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-26 18:09:47.845+00	2026-04-26 18:09:47.846152+00	2026-04-26 18:09:47.846152+00	Huila	FAIL	28	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "fitosanitario"]}	\N	2026-04-26 18:09:54.632+00	v0_pre_buyer_calls	\N
7	Syed	+57 3166563616	San Gil		FARMER	Babar	ACTIVE	t	2026-04-20 03:45:24.273+00	2026-04-20 03:45:24.283175+00	2026-04-20 03:45:24.283175+00	\N	\N	\N	NOT_READY	\N	\N	\N	\N	\N	\N
9	Syed	+57 3166560000	San Gil		FARMER	Babar	ACTIVE	t	2026-04-20 03:48:23.634+00	2026-04-20 03:48:23.643819+00	2026-04-20 03:48:23.643819+00	\N	\N	\N	NOT_READY	\N	\N	\N	\N	\N	\N
10	Maria Garcia	+57 3009998877	Pitalito	La Esperanza	FARMER	Maria Garcia	ACTIVE	t	2026-04-20 04:11:30.514+00	2026-04-20 04:11:30.529503+00	2026-04-20 04:11:30.529503+00	\N	\N	\N	NOT_READY	\N	\N	\N	\N	\N	\N
12	Maria Lopez	+57 3001112233	San Gil		FARMER	\N	ACTIVE	t	2026-04-20 12:59:07.855+00	2026-04-20 12:59:07.864774+00	2026-04-20 12:59:07.864774+00	\N	\N	\N	NOT_READY	\N	\N	\N	\N	\N	\N
73	Rapid S4-5 1777227106	+573100000005	Nariño	\N	FARMER	\N	ACTIVE	t	2026-04-26 18:11:47.592+00	2026-04-26 18:11:47.592851+00	2026-04-26 18:11:47.592851+00	\N	FAIL	25	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "icaRegistration", "fitosanitario"]}	\N	2026-04-26 18:11:52.41+00	v0_pre_buyer_calls	\N
16	Ricardo	+57 3123637856	San Gil		FARMER	\N	ACTIVE	t	2026-04-20 14:48:47.037+00	2026-04-20 14:48:47.047059+00	2026-04-20 14:48:47.047059+00	Santander	\N	\N	NOT_READY	\N	\N	\N	\N	\N	\N
70	Rapid S4-2 1777227106	+573100000002	Nariño	\N	FARMER	\N	ACTIVE	t	2026-04-26 18:11:47.09+00	2026-04-26 18:11:47.091233+00	2026-04-26 18:11:47.091233+00	\N	FAIL	25	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "icaRegistration", "fitosanitario"]}	\N	2026-04-26 18:11:52.504+00	v0_pre_buyer_calls	\N
71	Rapid S4-3 1777227106	+573100000003	Nariño	\N	FARMER	\N	ACTIVE	t	2026-04-26 18:11:47.253+00	2026-04-26 18:11:47.25385+00	2026-04-26 18:11:47.25385+00	\N	FAIL	25	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "icaRegistration", "fitosanitario"]}	\N	2026-04-26 18:11:53.178+00	v0_pre_buyer_calls	\N
69	Rapid S4-1 1777227106	+573100000001	Nariño	\N	FARMER	\N	ACTIVE	t	2026-04-26 18:11:46.937+00	2026-04-26 18:11:46.938083+00	2026-04-26 18:11:46.938083+00	\N	FAIL	25	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "icaRegistration", "fitosanitario"]}	\N	2026-04-26 18:11:53.2+00	v0_pre_buyer_calls	\N
72	Rapid S4-4 1777227106	+573100000004	Nariño	\N	FARMER	\N	ACTIVE	t	2026-04-26 18:11:47.433+00	2026-04-26 18:11:47.433812+00	2026-04-26 18:11:47.433812+00	\N	FAIL	28	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "icaRegistration", "fitosanitario"]}	\N	2026-04-26 18:11:53.201+00	v0_pre_buyer_calls	\N
2	Syed	+57 3166563613	San Gil		FARMER	Babar	ACTIVE	t	2026-04-20 03:28:40.559+00	2026-04-20 03:28:40.567798+00	2026-04-20 03:28:40.567798+00	\N	\N	\N	PUBLISHED	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: trade_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trade_history (id, company_id, product, volume_kg, destination, year, value_usd) FROM stdin;
1	1	Coffee	85000	United Arab Emirates	2023	722500
2	1	Coffee	62000	South Korea	2023	527000
3	1	Coffee	45000	Japan	2024	382500
4	2	Cacao	120000	Germany	2023	504000
5	2	Cacao	95000	Belgium	2024	399000
6	3	Avocado	380000	Netherlands	2023	684000
7	3	Avocado	290000	United Kingdom	2024	522000
8	3	Exotic Fruits	45000	United Arab Emirates	2024	153000
9	4	Superfoods	12000	Saudi Arabia	2023	456000
10	4	Superfoods	8500	UAE	2024	323000
\.


--
-- Data for Name: trust_scores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trust_scores (id, company_id, score, orders_completed, certifications_count, response_time, profile_completeness, trade_volume, updated_at) FROM stdin;
1	1	87	25	20	15	15	12	2026-04-07 15:08:07.792606+00
2	2	79	18	15	12	15	19	2026-04-07 15:08:07.792606+00
3	3	91	25	15	18	13	20	2026-04-07 15:08:07.792606+00
4	4	62	8	25	8	10	11	2026-04-07 15:08:07.792606+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, role, created_at, email_verified_at) FROM stdin;
18	irfan@fincava.com	$2b$12$VVbvib3kBfmQ68v.3dmYe.hmjInsHajwO6yxr/q5UFM3DPfmPNmza	ADMIN	2026-04-20 11:57:11.972019+00	\N
7	info@fincava.com	$2b$12$X824Dr7hhg5ef37tGZmVK.JaNoEEOqK67nanHsrPfTU1nvwYDtbr.	ADMIN	2026-04-14 04:41:33.946046+00	\N
2	maria@cooperativacacao.co	$2b$12$M604IJxih6WFRkiD9ZTmiO.C0c1Tpy.Ggze7lAi8yMSp2QZcgKd7m	SUPPLIER	2024-10-07 13:34:28.678068+00	\N
3	jorge@exportcolombia.co	$2b$12$M604IJxih6WFRkiD9ZTmiO.C0c1Tpy.Ggze7lAi8yMSp2QZcgKd7m	SUPPLIER	2025-04-07 13:34:28.678068+00	\N
4	rosa@santeropremium.co	$2b$12$M604IJxih6WFRkiD9ZTmiO.C0c1Tpy.Ggze7lAi8yMSp2QZcgKd7m	SUPPLIER	2025-10-07 13:34:28.678068+00	\N
1	carlos@cafehuilas.co	$2b$12$fSvu1QYVACo63jcce04j4ekFzxaj5zrpWp44z6ISs066qXHRQg3nG	SUPPLIER	2024-04-07 13:34:28.678068+00	2026-04-25 01:26:12.765373+00
23	sbirfan@yahoo.com	$2b$12$6yAzc3/tDknCxENRqxtvDeWy17a7FqnT.c.NiP89mcPYF4EvAbTXG	BUYER	2026-04-24 13:10:12.604462+00	\N
27	social@fincava.com	$2b$12$8Q3bcZtzEvgp6ZV.InWK3uS8ejFbU/wh6p8osEOkbqTynOc9W3xVK	SUPPLIER	2026-04-24 17:26:26.097418+00	\N
28	buyer@gulf-trade.ae	$2b$12$I.Nda3eBavhTw1OCgRR3sufJIAgQvsg3jESF.oTSNhq7/PIPiip32	BUYER	2026-04-24 17:26:26.433717+00	\N
37	buyertest_1777219631@example.com	$2b$12$L9zHsdP849kKxA/VBQ0I5.2/WexHNuhYlXV0iPMnCmrNSXqVpaGxm	BUYER	2026-04-26 16:07:12.346452+00	\N
38	buyer2_1777219654@example.com	$2b$12$OwC.luh.3rmj/cnj/thlrOtK7DgNoQIt20Fg6ZTM5LqdHyYwzKyFS	BUYER	2026-04-26 16:07:34.375129+00	\N
40	nonadmin_1777219976@x.com	$2b$12$QXJd1cEjWgCb6qghWWxfK.MeObX2ZRa4DMBodKc9qTNKtsrV9VqVi	BUYER	2026-04-26 16:12:56.465786+00	\N
39	buyer_vis_1777219953@example.com	$2b$12$RM93i.KB0LDq3g/wXG.1uuWiW8Deo9RF2LHrW3EjqrzKN1o9NUYLu	BUYER	2026-04-26 16:12:33.808714+00	2026-04-26 16:17:37.064299+00
41	intlog_1777220633@example.com	$2b$12$/TDRsPztD1PTROd1WpE.M.7T9SU/8c.apJC5Y1InbPz1c8wQ2qOx6	BUYER	2026-04-26 16:23:54.139525+00	2026-04-26 16:23:54.525049+00
42	mvp_buyer_1777221012@testcorp.com	$2b$12$Atu65iH246QqeOxe86ul3Ojme3EJ/PkqrtnzUVjw1wvsAshztsYgS	BUYER	2026-04-26 16:30:12.645169+00	2026-04-26 16:30:26.958204+00
44	s2b_1777227068@test.com	$2b$12$iPLs86wJFSQB43GWjD8/y.e7SQ1sfGC0krCHNoSkoQa2AxizHjuG.	BUYER	2026-04-26 18:11:09.935565+00	\N
43	s2a_1777227068@test.com	$2b$12$dBvGkct198CXZJpWDiDAd.ImRFmgLncF9re5MqHtScR6oJxIAohhq	BUYER	2026-04-26 18:11:09.413844+00	2026-04-26 18:11:31.082176+00
45	s5_1777227136@test.com	$2b$12$/Mv.GvupCd7RIIME2P.BXetFkuDkbWqJ3HC/LYvpNbkV2Pjg.lh3W	BUYER	2026-04-26 18:12:17.161297+00	\N
46	emailtest_1777296571@test.com	$2b$12$YE9E65xwjLSNrtMKlhek9uA.0cfQAMW7cpxVU6FGOpQqAk6fprPxa	BUYER	2026-04-27 13:29:32.245867+00	\N
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: postgres
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 2, true);


--
-- Name: ai_outputs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_outputs_id_seq', 60, true);


--
-- Name: buyer_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.buyer_profiles_id_seq', 15, true);


--
-- Name: certifications_company_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certifications_company_id_seq', 1, false);


--
-- Name: certifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.certifications_id_seq', 10, true);


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.companies_id_seq', 39, true);


--
-- Name: companies_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.companies_user_id_seq', 1, false);


--
-- Name: compliance_docs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.compliance_docs_id_seq', 66, true);


--
-- Name: compliance_requirements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.compliance_requirements_id_seq', 32, true);


--
-- Name: economics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.economics_id_seq', 50, true);


--
-- Name: email_verification_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_verification_tokens_id_seq', 18, true);


--
-- Name: farms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.farms_id_seq', 58, true);


--
-- Name: inquiries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inquiries_id_seq', 1, true);


--
-- Name: inquiries_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inquiries_product_id_seq', 1, false);


--
-- Name: interaction_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.interaction_logs_id_seq', 32, true);


--
-- Name: interactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.interactions_id_seq', 50, true);


--
-- Name: loans_buyer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loans_buyer_id_seq', 1, false);


--
-- Name: loans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loans_id_seq', 3, true);


--
-- Name: loans_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loans_order_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: messages_receiver_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_receiver_id_seq', 1, false);


--
-- Name: messages_sender_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_sender_id_seq', 1, false);


--
-- Name: officer_applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.officer_applications_id_seq', 1, false);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 20, true);


--
-- Name: order_items_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_order_id_seq', 1, false);


--
-- Name: order_items_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_product_id_seq', 1, false);


--
-- Name: orders_buyer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_buyer_id_seq', 1, false);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 28, true);


--
-- Name: origin_stories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.origin_stories_id_seq', 8, true);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 9, true);


--
-- Name: password_reset_tokens_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_tokens_user_id_seq', 1, false);


--
-- Name: payment_milestones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_milestones_id_seq', 1, false);


--
-- Name: payment_milestones_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_milestones_order_id_seq', 1, false);


--
-- Name: product_analytics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_analytics_id_seq', 8, true);


--
-- Name: product_analytics_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_analytics_product_id_seq', 1, false);


--
-- Name: products_company_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_company_id_seq', 1, false);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 8, true);


--
-- Name: profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.profiles_id_seq', 46, true);


--
-- Name: profiles_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.profiles_user_id_seq', 1, false);


--
-- Name: repayments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.repayments_id_seq', 1, true);


--
-- Name: repayments_loan_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.repayments_loan_id_seq', 1, false);


--
-- Name: reviews_author_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reviews_author_id_seq', 1, false);


--
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reviews_id_seq', 5, true);


--
-- Name: reviews_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reviews_product_id_seq', 1, false);


--
-- Name: rfq_responses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rfq_responses_id_seq', 4, true);


--
-- Name: rfq_responses_rfq_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rfq_responses_rfq_id_seq', 1, false);


--
-- Name: rfq_responses_supplier_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rfq_responses_supplier_id_seq', 1, false);


--
-- Name: rfqs_buyer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rfqs_buyer_id_seq', 1, false);


--
-- Name: rfqs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rfqs_id_seq', 4, true);


--
-- Name: shipments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shipments_id_seq', 1, false);


--
-- Name: shipments_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shipments_order_id_seq', 1, false);


--
-- Name: staff_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.staff_roles_id_seq', 1, true);


--
-- Name: subscriptions_company_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscriptions_company_id_seq', 1, false);


--
-- Name: subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscriptions_id_seq', 4, true);


--
-- Name: supplier_evaluations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supplier_evaluations_id_seq', 60, true);


--
-- Name: supplier_state_transitions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supplier_state_transitions_id_seq', 72, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 75, true);


--
-- Name: trade_history_company_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trade_history_company_id_seq', 1, false);


--
-- Name: trade_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trade_history_id_seq', 10, true);


--
-- Name: trust_scores_company_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trust_scores_company_id_seq', 1, false);


--
-- Name: trust_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trust_scores_id_seq', 4, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 46, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: ai_outputs ai_outputs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_outputs
    ADD CONSTRAINT ai_outputs_pkey PRIMARY KEY (id);


--
-- Name: buyer_profiles buyer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buyer_profiles
    ADD CONSTRAINT buyer_profiles_pkey PRIMARY KEY (id);


--
-- Name: certifications certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: compliance_docs compliance_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compliance_docs
    ADD CONSTRAINT compliance_docs_pkey PRIMARY KEY (id);


--
-- Name: compliance_docs compliance_docs_supplier_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compliance_docs
    ADD CONSTRAINT compliance_docs_supplier_id_unique UNIQUE (supplier_id);


--
-- Name: compliance_requirements compliance_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compliance_requirements
    ADD CONSTRAINT compliance_requirements_pkey PRIMARY KEY (id);


--
-- Name: economics economics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.economics
    ADD CONSTRAINT economics_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_unique UNIQUE (token);


--
-- Name: farms farms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.farms
    ADD CONSTRAINT farms_pkey PRIMARY KEY (id);


--
-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);


--
-- Name: interaction_logs interaction_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interaction_logs
    ADD CONSTRAINT interaction_logs_pkey PRIMARY KEY (id);


--
-- Name: interactions interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_pkey PRIMARY KEY (id);


--
-- Name: loans loans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: officer_applications officer_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.officer_applications
    ADD CONSTRAINT officer_applications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: origin_stories origin_stories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.origin_stories
    ADD CONSTRAINT origin_stories_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_unique UNIQUE (token);


--
-- Name: payment_milestones payment_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_milestones
    ADD CONSTRAINT payment_milestones_pkey PRIMARY KEY (id);


--
-- Name: product_analytics product_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_analytics
    ADD CONSTRAINT product_analytics_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: repayments repayments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repayments
    ADD CONSTRAINT repayments_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: rfq_responses rfq_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfq_responses
    ADD CONSTRAINT rfq_responses_pkey PRIMARY KEY (id);


--
-- Name: rfqs rfqs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: staff_roles staff_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_roles
    ADD CONSTRAINT staff_roles_pkey PRIMARY KEY (id);


--
-- Name: staff_roles staff_roles_user_role_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_roles
    ADD CONSTRAINT staff_roles_user_role_uniq UNIQUE (user_id, role);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: supplier_evaluations supplier_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_evaluations
    ADD CONSTRAINT supplier_evaluations_pkey PRIMARY KEY (id);


--
-- Name: supplier_state_transitions supplier_state_transitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_state_transitions
    ADD CONSTRAINT supplier_state_transitions_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_whatsapp_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_whatsapp_number_unique UNIQUE (whatsapp_number);


--
-- Name: trade_history trade_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trade_history
    ADD CONSTRAINT trade_history_pkey PRIMARY KEY (id);


--
-- Name: trust_scores trust_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_scores
    ADD CONSTRAINT trust_scores_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ai_outputs_supplier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_outputs_supplier_idx ON public.ai_outputs USING btree (supplier_id);


--
-- Name: buyer_profiles_user_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX buyer_profiles_user_id_unique ON public.buyer_profiles USING btree (user_id);


--
-- Name: companies_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX companies_user_id_idx ON public.companies USING btree (user_id);


--
-- Name: interactions_supplier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX interactions_supplier_idx ON public.interactions USING btree (supplier_id);


--
-- Name: products_company_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_company_id_idx ON public.products USING btree (company_id);


--
-- Name: supplier_evaluations_supplier_evaluated_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX supplier_evaluations_supplier_evaluated_idx ON public.supplier_evaluations USING btree (supplier_id, evaluated_at DESC NULLS LAST);


--
-- Name: supplier_state_transitions_supplier_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX supplier_state_transitions_supplier_created_idx ON public.supplier_state_transitions USING btree (supplier_id, created_at DESC NULLS LAST);


--
-- Name: suppliers_sellable_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX suppliers_sellable_status_idx ON public.suppliers USING btree (sellable_status) WHERE (sellable_status = ANY (ARRAY['SELLABLE'::public.sellable_status, 'PUBLISHED'::public.sellable_status]));


--
-- Name: suppliers_whatsapp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX suppliers_whatsapp_idx ON public.suppliers USING btree (whatsapp_number);


--
-- Name: ai_outputs ai_outputs_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_outputs
    ADD CONSTRAINT ai_outputs_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: buyer_profiles buyer_profiles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.buyer_profiles
    ADD CONSTRAINT buyer_profiles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: certifications certifications_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: companies companies_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: compliance_docs compliance_docs_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compliance_docs
    ADD CONSTRAINT compliance_docs_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: economics economics_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.economics
    ADD CONSTRAINT economics_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: email_verification_tokens email_verification_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: farms farms_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.farms
    ADD CONSTRAINT farms_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: inquiries inquiries_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: interactions interactions_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interactions
    ADD CONSTRAINT interactions_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: loans loans_buyer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_buyer_id_users_id_fk FOREIGN KEY (buyer_id) REFERENCES public.users(id);


--
-- Name: loans loans_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: messages messages_receiver_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_users_id_fk FOREIGN KEY (receiver_id) REFERENCES public.users(id);


--
-- Name: messages messages_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_buyer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_buyer_id_users_id_fk FOREIGN KEY (buyer_id) REFERENCES public.users(id);


--
-- Name: origin_stories origin_stories_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.origin_stories
    ADD CONSTRAINT origin_stories_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payment_milestones payment_milestones_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_milestones
    ADD CONSTRAINT payment_milestones_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: product_analytics product_analytics_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_analytics
    ADD CONSTRAINT product_analytics_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: products products_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: profiles profiles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: repayments repayments_loan_id_loans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.repayments
    ADD CONSTRAINT repayments_loan_id_loans_id_fk FOREIGN KEY (loan_id) REFERENCES public.loans(id);


--
-- Name: reviews reviews_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: reviews reviews_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: rfq_responses rfq_responses_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfq_responses
    ADD CONSTRAINT rfq_responses_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: rfq_responses rfq_responses_rfq_id_rfqs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfq_responses
    ADD CONSTRAINT rfq_responses_rfq_id_rfqs_id_fk FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id);


--
-- Name: rfqs rfqs_buyer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_buyer_id_users_id_fk FOREIGN KEY (buyer_id) REFERENCES public.users(id);


--
-- Name: shipments shipments_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: staff_roles staff_roles_assigned_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_roles
    ADD CONSTRAINT staff_roles_assigned_by_users_id_fk FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: staff_roles staff_roles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_roles
    ADD CONSTRAINT staff_roles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: supplier_evaluations supplier_evaluations_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_evaluations
    ADD CONSTRAINT supplier_evaluations_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: supplier_state_transitions supplier_state_transitions_evaluation_id_supplier_evaluations_i; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_state_transitions
    ADD CONSTRAINT supplier_state_transitions_evaluation_id_supplier_evaluations_i FOREIGN KEY (evaluation_id) REFERENCES public.supplier_evaluations(id) ON DELETE CASCADE;


--
-- Name: supplier_state_transitions supplier_state_transitions_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_state_transitions
    ADD CONSTRAINT supplier_state_transitions_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: trade_history trade_history_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trade_history
    ADD CONSTRAINT trade_history_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: trust_scores trust_scores_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trust_scores
    ADD CONSTRAINT trust_scores_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- PostgreSQL database dump complete
--

\unrestrict pPtVxZ3hsfHTjB6njCCZqUwkeZatWTaXLIkX3skdNDCN16CBVJuv0hdhlYim7wg

