--
-- PostgreSQL database dump
--

\restrict JtABcKKlxkdadrDeviWXm9IJddcolTuhVnqXroX7uUS1ZFTbPY0Mp1ObFZXde2Q

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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
    supplier_id integer NOT NULL,
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

ALTER SEQUENCE public.rfq_responses_supplier_id_seq OWNED BY public.rfq_responses.supplier_id;


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
-- Name: rfq_responses supplier_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfq_responses ALTER COLUMN supplier_id SET DEFAULT nextval('public.rfq_responses_supplier_id_seq'::regclass);


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
2	15	2026-04-20 13:37:42.318185+00	claude-sonnet-4-6	DOCUMENT_GENERATION	\N	\N	\N	\N	\N	# Guía de Cumplimiento para Exportación\n\n---\n\n## ¡Hola, Scoring Test!\n\nLe escribimos desde el equipo de Fincava para compartirle los resultados de su evaluación de preparación para exportación y orientarle en los próximos pasos concretos que debe seguir.\n\n---\n\n## 📊 Su Resumen de Puntaje\n\n| Indicador | Resultado |\n|---|---|\n| **Puntaje de Preparación** | 35 / 100 |\n| **Ruta Asignada** | Ruta D — Inicio de Proceso |\n| **Municipio** | Barichara, Santander |\n| **Cultivo Principal** | Cacao |\n| **Hectáreas en Producción** | 4 hectáreas |\n| **Producción Estimada** | ~6,000 kg/año |\n| **Capital Disponible Estimado** | $18.000.000 COP |\n\nSu puntaje actual de **35/100** indica que usted tiene potencial real como productor de cacao, pero necesita resolver documentación legal fundamental antes de poder exportar. La buena noticia es que estos pasos son alcanzables con orientación adecuada.\n\n---\n\n## ❌ Documentos Que Le Faltan\n\nUsted actualmente **no cuenta** con ninguno de los cuatro documentos obligatorios para exportar:\n\n1. ❌ **RUT DIAN** — Registro único tributario\n2. ❌ **Registro ICA** — Registro de productor ante el Instituto Colombiano Agropecuario\n3. ❌ **Certificado Fitosanitario ICA** — Certificado de sanidad vegetal para exportación\n4. ❌ **Habilitación como Exportador DIAN** — Autorización formal para exportar\n\n---\n\n## ✅ Pasos a Seguir — En Orden\n\n### Paso 1: Obtenga su RUT DIAN\n\n**DÓNDE:** Oficina DIAN más cercana en San Gil (Cra. 10 #12-45, San Gil) o en línea en **muisca.dian.gov.co**\n\n**QUÉ HACER:** Llevar cédula de ciudadanía original, recibo de servicios públicos reciente y diligenciar el formulario de inscripción como persona natural. Si hace el trámite en línea, necesita firma electrónica.\n\n**COSTO:** $0 — Este trámite es completamente gratuito.\n\n---\n\n### Paso 2: Regístrese ante el ICA como Productor\n\n**DÓNDE:** Oficina ICA Santander ubicada en Bucaramanga (Calle 45 #28-50, Bucaramanga) o contacte la línea nacional **01 8000 11 53 85**\n\n**QUÉ HACER:** Presentar cédula, RUT (del Paso 1), escritura o contrato de arrendamiento del predio, y mapa de ubicación de la finca en Barichara. Registrar las 4 hectáreas de cacao con sus datos de producción.\n\n**COSTO:** Aproximadamente **$80.000 – $150.000 COP** según la tarifa vigente para pequeños productores.\n\n---\n\n### Paso 3: Solicite el Certificado Fitosanitario ICA\n\n**DÓNDE:** Misma oficina ICA en Bucaramanga, una vez tenga activo su registro del Paso 2.\n\n**QUÉ HACER:** Solicitar inspección fitosanitaria de su finca. Un técnico del ICA visitará su predio en Barichara para revisar el estado sanitario del cultivo de cacao. El certificado se emite por lote de exportación.\n\n**COSTO:** Entre **$200.000 – $350.000 COP** por inspección y emisión del certificado. Este costo se repite por cada exportación.\n\n---\n\n### Paso 4: Habilítese como Exportador ante la DIAN\n\n**DÓNDE:** Portal MUISCA en **muisca.dian.gov.co** — sección "Inscripción y Actualización del RUT" — o en la oficina DIAN de San Gil.\n\n**QUÉ HACER:** Con su RUT activo, actualizar la actividad económica incluyendo el código de exportador (código CIIU 0125 para cacao). Luego registrarse en el sistema informático de comercio exterior **VUCE** en **vuce.gov.co** para obtener su perfil de exportador habilitado.\n\n**COSTO:** $0 — Trámite gratuito, pero puede requerir apoyo de un agente de aduanas para el primer registro VUCE. Consulte tarifas con agentes locales en Bucaramanga: entre **$300.000 – $500.000 COP** si requiere acompañamiento profesional.\n\n---\n\n## 💰 Estimado Total de Costos\n\n| Trámite | Costo Estimado |\n|---|---|\n| RUT DIAN | $0 |\n| Registro ICA productor | $80.000 – $150.000 |\n| Certificado Fitosanitario | $200.000 – $350.000 |\n| Habilitación Exportador DIAN/VUCE | $0 – $500.000 |\n| **TOTAL ESTIMADO** | **$280.000 – $1.000.000 COP** |\n\nEste monto es manejable dentro de su capital disponible de **$18.000.000 COP**.\n\n---\n\n## 📞 Su Próximo Contacto con Fincava\n\nUn asesor de Fincava le contactará por WhatsApp al número **+57 322 234 5678** dentro de los próximos **5 días hábiles** para acompañarle en el inicio de estos trámites.\n\nSi tiene preguntas antes de	\N
3	15	2026-04-20 15:31:45.419755+00	claude-sonnet-4-6	DOCUMENT_GENERATION	\N	\N	\N	\N	\N	# Guía de Cumplimiento para Exportación\n\n---\n\n## ¡Hola, Scoring Test!\n\nLe escribimos desde el equipo de Fincava para compartirle los resultados de su evaluación de preparación para exportación y orientarle en los próximos pasos concretos que debe seguir.\n\n---\n\n## 📊 Su Resumen de Puntaje\n\n| Indicador | Resultado |\n|---|---|\n| **Puntaje de Preparación** | 35 / 100 |\n| **Ruta Asignada** | Ruta D — Inicio de Proceso |\n| **Municipio** | Barichara, Santander |\n| **Cultivo Principal** | Cacao |\n| **Hectáreas en Producción** | 4 hectáreas |\n| **Producción Estimada** | ~6.000 kg/año |\n| **Capital Disponible Estimado** | $18.000.000 COP |\n\nSu puntaje actual de **35/100** indica que usted tiene potencial real como productor de cacao, pero necesita resolver documentación legal fundamental antes de poder exportar. La buena noticia es que estos pasos son alcanzables con la orientación adecuada.\n\n---\n\n## ❌ Documentos Que Le Faltan\n\nUsted actualmente **no cuenta** con ninguno de los cuatro documentos obligatorios para exportar:\n\n1. ❌ **RUT DIAN** — Registro Único Tributario\n2. ❌ **Registro ICA** — Registro de productor ante el Instituto Colombiano Agropecuario\n3. ❌ **Certificado Fitosanitario ICA** — Certificado de sanidad vegetal para exportación\n4. ❌ **Habilitación como Exportador DIAN** — Autorización formal para exportar\n\n---\n\n## ✅ Pasos a Seguir — En Orden\n\n### Paso 1: Obtenga su RUT DIAN\n\n**DÓNDE:** Oficina DIAN más cercana en San Gil (Cra. 10 #12-45, San Gil) o en línea en **muisca.dian.gov.co**\n\n**QUÉ HACER:** Llevar cédula de ciudadanía original y recibo de servicios públicos reciente. Diligenciar el formulario de inscripción como persona natural. Si hace el trámite en línea, necesita firma electrónica.\n\n**COSTO:** $0 — Este trámite es completamente gratuito.\n\n---\n\n### Paso 2: Regístrese ante el ICA como Productor\n\n**DÓNDE:** Oficina ICA Santander en Bucaramanga (Calle 45 #28-50) o llame a la línea nacional **01 8000 11 53 85**\n\n**QUÉ HACER:** Presentar cédula, RUT (del Paso 1), escritura o contrato de arrendamiento del predio, y mapa de ubicación de su finca en Barichara. Registrar las 4 hectáreas de cacao con sus datos de producción.\n\n**COSTO:** Entre **$80.000 – $150.000 COP** según la tarifa vigente para pequeños productores.\n\n---\n\n### Paso 3: Solicite el Certificado Fitosanitario ICA\n\n**DÓNDE:** Misma oficina ICA en Bucaramanga, una vez tenga activo su registro del Paso 2.\n\n**QUÉ HACER:** Solicitar inspección fitosanitaria de su finca. Un técnico del ICA visitará su predio en Barichara para revisar el estado sanitario del cultivo de cacao. El certificado se emite por lote de exportación.\n\n**COSTO:** Entre **$200.000 – $350.000 COP** por inspección y emisión del certificado. Este costo se repite con cada exportación.\n\n---\n\n### Paso 4: Habilítese como Exportador ante la DIAN\n\n**DÓNDE:** Portal MUISCA en **muisca.dian.gov.co** o en la oficina DIAN de San Gil. Luego en **vuce.gov.co** para completar su perfil exportador.\n\n**QUÉ HACER:** Con su RUT activo, actualizar la actividad económica incluyendo el código exportador (CIIU 0125 para cacao). Luego registrarse en el sistema VUCE para obtener su habilitación formal como exportador.\n\n**COSTO:** $0 en trámites oficiales. Si requiere acompañamiento de un agente de aduanas para el registro VUCE, consulte tarifas en Bucaramanga: entre **$300.000 – $500.000 COP**.\n\n---\n\n## 💰 Estimado Total de Costos\n\n| Trámite | Costo Estimado |\n|---|---|\n| RUT DIAN | $0 |\n| Registro ICA productor | $80.000 – $150.000 |\n| Certificado Fitosanitario | $200.000 – $350.000 |\n| Habilitación Exportador DIAN/VUCE | $0 – $500.000 |\n| **TOTAL ESTIMADO** | **$280.000 – $1.000.000 COP** |\n\nEste monto es completamente manejable dentro de su capital disponible de **$18.000.000 COP**.\n\n---\n\n## 📞 Su Próximo Contacto con Fincava\n\nUn asesor de Fincava le contactará por WhatsApp al número **+57 322 234 5678** dentro de los próximos **5 días hábiles** para acompañarle en el inicio de estos trámites. Si tiene preguntas antes de esa fecha, escríbanos directamente por WhatsApp y con gusto le orientamos.\n\n¡Usted tiene el potencial y nosotros le acomp	\N
1	15	2026-04-20 13:11:18.096287+00	claude-haiku-4-5	ONBOARD_SCORE	35	D	18000000	RUT DIAN not registered, ICA registro missing, Fitosanitario certification absent, DIAN exporter status not obtained	Supplier scores critically low across all dimensions. Land rights status unknown (0/20). Production volume of 6,000 kg annually indicates small-scale operation with limited export capacity (5/20). Post-harvest quality cannot be assessed due to missing data on drying methods and processing standards (0/20). Complete absence of legal compliance documentation (0/20). Commitment level unclear with no export experience and incomplete farm data (5/20). Farm infrastructure details missing (water access, technical assistance, land tenure) prevent comprehensive evaluation.	\N	SM4cc9f68f9cc417228966450a123904f2
4	16	2026-04-20 23:55:38.382592+00	claude-sonnet-4-6	DOCUMENT_GENERATION	\N	\N	\N	\N	\N	# Guía de Cumplimiento para Exportación Agrícola\n\n---\n\n## ¡Bienvenido, Ricardo!\n\nEsperamos que se encuentre muy bien en San Gil, Santander. En Fincava hemos revisado su perfil como productor de **bocadillo** y queremos acompañarle paso a paso para que pueda acceder a mercados de exportación con total tranquilidad.\n\n---\n\n## 📊 Resumen de Su Puntaje de Cumplimiento\n\n| Estado | Resultado |\n|--------|-----------|\n| **Puntaje actual** | ⚠️ 0 / 4 documentos completos |\n| **Cultivo principal** | Bocadillo (guayaba) |\n| **Hectáreas en producción** | 2 hectáreas |\n| **Municipio** | San Gil, Santander |\n\nRicardo, actualmente **ninguno de los cuatro documentos obligatorios** para exportar está en regla. ¡Pero no se preocupe! Con dedicación y siguiendo estos pasos, puede tenerlos todos resueltos en pocas semanas.\n\n---\n\n## 📋 Documentos que Le Faltan\n\n- ❌ RUT ante la DIAN\n- ❌ Registro ICA (productor agrícola)\n- ❌ Certificado Fitosanitario\n- ❌ Registro como Exportador ante la DIAN\n\n---\n\n## 🗂️ Pasos para Ponerse al Día\n\n### **Paso 1 — Obtener su RUT (Registro Único Tributario)**\n\n**¿Dónde?** Punto de Atención DIAN más cercano a San Gil, ubicado en Bucaramanga (Calle 49 N.º 14-27, Centro) o en línea en **www.dian.gov.co** si tiene acceso a internet y correo electrónico.\n\n**¿Qué necesita?**\n- Cédula de ciudadanía original\n- Comprobante de dirección (recibo de servicios o carta de la junta de acción comunal)\n- Llenar el formulario de inscripción RUT (lo ayudan en el punto de atención)\n\n**💰 Costo:** **$0 pesos** — Este trámite es completamente gratuito.\n\n---\n\n### **Paso 2 — Registro ICA como Productor Agrícola**\n\n**¿Dónde?** Oficina del ICA en Santander, ubicada en Bucaramanga (Carrera 26 N.º 54-50) o llame al **+57 (7) 657-1515**. También puede consultar en **www.ica.gov.co**.\n\n**¿Qué necesita?**\n- Copia de su RUT (del Paso 1)\n- Cédula de ciudadanía\n- Información de su predio: vereda, municipio, número de hectáreas\n- Certificado de tradición y libertad del predio o contrato de arrendamiento\n\n**💰 Costo:** **$0 pesos** — El registro básico de predio productor es gratuito.\n\n---\n\n### **Paso 3 — Certificado Fitosanitario para Exportación**\n\n**¿Dónde?** Una vez registrado en el ICA (Paso 2), solicite la inspección fitosanitaria en la misma oficina del ICA en Bucaramanga. El inspector visitará su finca en San Gil.\n\n**¿Qué necesita?**\n- Registro ICA activo (del Paso 2)\n- Solicitud formal de inspección (formulario en la oficina ICA)\n- Su cultivo de bocadillo debe estar libre de plagas visibles — el inspector lo verificará\n- Resultado de análisis de suelo (opcional pero recomendado)\n\n**💰 Costo:** Entre **$80.000 y $150.000 pesos** por inspección y emisión del certificado, según tarifas ICA vigentes para 2026.\n\n---\n\n### **Paso 4 — Registro como Exportador ante la DIAN**\n\n**¿Dónde?** En línea a través del portal **www.dian.gov.co** (sección "Servicios en línea") o en el punto de atención DIAN en Bucaramanga. Necesitará tener RUT activo del Paso 1.\n\n**¿Qué necesita?**\n- RUT activo con actividad económica de exportación habilitada\n- Cédula de ciudadanía\n- Datos bancarios de cuenta a su nombre\n- Registro ICA activo\n\n**💰 Costo:** **$0 pesos** — Trámite gratuito ante la DIAN.\n\n---\n\n## 💵 Estimado Total de Costos\n\n| Trámite | Costo Estimado |\n|---------|---------------|\n| RUT DIAN | $0 |\n| Registro ICA | $0 |\n| Certificado Fitosanitario | $80.000 – $150.000 |\n| Registro Exportador DIAN | $0 |\n| **TOTAL APROXIMADO** | **$80.000 – $150.000 COP** |\n\n> *Considere también los gastos de desplazamiento a Bucaramanga, aproximadamente $40.000 – $60.000 COP ida y vuelta desde San Gil.*\n\n---\n\n## 📞 Su Próximo Contacto con Fincava\n\nRicardo, una vez haya iniciado cualquiera de estos pasos, **escríbanos por WhatsApp al número de su asesor Fincava** para actualizar su puntaje de cumplimiento y orientarle en los siguientes trámites de exportación.\n\nRecuerde que en Fincava estamos para acompañarle en cada etapa. **¡Su bocadillo tiene potencial de llegar lejos!** 🍬🌍\n\n---\n\n*Guía	\N
19	29	2026-04-22 21:01:38.453255+00	claude-haiku-4-5	ONBOARD_SCORE	0	D	0	RUT DIAN not registered, ICA registro not obtained, Fitosanitario certification missing, DIAN exportador registration not completed	Supplier has critical data deficiencies across all evaluation dimensions. Farm production details are entirely absent (land size, plant age, harvest frequency, drying method, water access, land tenure, technical assistance - all null). Economic profile is incomplete (buyer type, harvest volume, sales price, payment terms, debt status, capital usage, dependent persons - all null). Compliance documentation is 0% complete (0/4 requirements met). No baseline commercial or eligibility assessment exists. This profile appears to be a test record or incomplete onboarding entry with no substantive agricultural operation data.	\N	SM3697c6cfbbb9dad6aee292fc53c0c6b1
20	30	2026-04-22 21:06:45.495041+00	\N	ONBOARD_SCORE	75	\N	\N	\N	\N	\N	\N
21	30	2026-04-22 21:06:49.248212+00	claude-haiku-4-5	ONBOARD_SCORE	0	D	0	RUT DIAN not registered, ICA registration missing, Phytosanitary certification absent, DIAN exporter status not obtained	Supplier lacks critical data across all evaluation dimensions. No land rights documentation (0/20), no production volume data (0/20), no post-harvest quality information (0/20), zero compliance certifications (0/20), and no demonstrated commitment indicators (0/20). This is a new onboarding record (created 2026-04-22) with incomplete farm profile and economics data. Supplier requires comprehensive baseline assessment before export pathway consideration.	\N	SMda3e7b86bae4ec505b0a00be1728ae09
15	27	2026-04-22 20:19:34.688746+00	claude-haiku-4-5	ONBOARD_SCORE	0	D	0	RUT DIAN not registered, ICA registro not obtained, Fitosanitario certification missing, DIAN exportador status not registered	Supplier has critical data gaps across all evaluation dimensions. Farm production details are completely absent (no cultivated area, crop variety, harvest volume, drying method, water access, or technical assistance data). Economic profile is undocumented (no production volume, sales price, payment terms, or financial capacity metrics). All four mandatory compliance certifications are missing. Without foundational farm information and zero compliance documentation, export readiness cannot be established.	\N	SM0b1b9fa3dd540473f05b40fdb35f2f13
16	28	2026-04-22 21:00:31.740986+00	\N	\N	75	\N	\N	\N	\N	\N	\N
17	28	2026-04-22 21:00:35.812991+00	claude-haiku-4-5	ONBOARD_SCORE	0	D	0	RUT DIAN not registered, ICA registration missing, Phytosanitary certification absent, DIAN exporter status not obtained	Supplier profile is incomplete across all critical dimensions. Land rights (0/20): No tenure data provided. Production volume (0/20): No harvest volume, crop type, or coffee variety information recorded. Post-harvest quality (0/20): No drying method, water access, or technical assistance data. Compliance documents (0/20): All four mandatory certifications are missing (RUT DIAN, ICA, Phytosanitary, DIAN Exporter). Commitment (0/20): No economic data, buyer relationships, or export interest documented. This appears to be an incomplete onboarding record requiring comprehensive data collection before any readiness assessment is possible.	\N	SMd90e32e897c62763c687ea47744b5f19
18	29	2026-04-22 21:01:33.341748+00	\N	ONBOARD_SCORE	75	\N	\N	\N	\N	\N	\N
22	31	2026-04-23 11:48:29.058492+00	claude-haiku-4-5	ONBOARD_SCORE	0	D	0	RUT DIAN not registered, ICA registro not obtained, Fitosanitario certification missing, DIAN exportador status not acquired	Supplier presents critical data deficiency across all evaluation dimensions. Farm profile is completely empty (no land size, crop type, production volume, water access, or land tenure data). Economics section lacks all key indicators (harvest volume, buyer type, payment terms, capital structure). Zero compliance certifications in place. This appears to be a newly registered supplier (created 2026-04-23) with consent but no substantive farm or business data collected. Land rights assessment: 0/20 (no tenencia data). Production volume: 0/20 (null hectareasProduccion, volumenKgUltimaCosecha). Post-harvest quality: 0/20 (no metodoSecado or quality indicators). Compliance docs: 0/20 (all four core certifications missing). Commitment: 0/20 (no economic indicators of viability). Total: 0/100.	\N	SM7c903600027af7478df6e4ac59b64a71
23	33	2026-04-23 15:19:47.584035+00	claude-haiku-4-5	ONBOARD_SCORE	5	D	0	RUT DIAN - Missing, ICA Registration - Missing, Phytosanitary Certificate - Missing, DIAN Exporter Registration - Missing	Supplier is at foundational stage with critical data gaps across all evaluation dimensions. Land rights assessment impossible (tenenciaTierra null). Production volume unknown (hectareasProduccion, volumenKgUltimaCosecha null). Post-harvest quality unmeasurable (metodoSecado, variedadCafe null). All 4 compliance documents missing. Economic viability unassessed (tipoComprador, precioVentaBanda, deudaActual null). No baseline commercial performance established. Supplier requires complete profiling before export pathway determination is possible.	\N	SM48c4e2f1c22479401aa53851e5481966
24	37	2026-04-23 18:07:00.217109+00	claude-haiku-4-5	ONBOARD_SCORE	0	D	0	RUT DIAN not registered, ICA agricultural registry missing, Phytosanitary certification absent, DIAN exporter registration incomplete	Critical data deficiency across all evaluation dimensions. Supplier profile contains no agricultural production data (land rights, hectares, crop type, harvest volume), no economic indicators (sales volume, pricing, payment terms, capital availability), and zero compliance documentation. Farm specifications entirely missing. Unable to assess land tenure, production capacity, post-harvest quality management, or commercial viability. Supplier appears newly registered with incomplete onboarding.	\N	SM18f90c204367cb54fc6f2b27086f5a27
25	36	2026-04-23 18:07:01.140531+00	claude-haiku-4-5	ONBOARD_SCORE	5	D	0	RUT DIAN - Missing, ICA Registration - Missing, Phytosanitary Certificate - Missing, DIAN Exporter Status - Missing	Critical data deficiency across all evaluation dimensions. Supplier has no documented land rights status, production volume data, post-harvest quality information, or compliance documentation. All farm operational metrics are absent (cultivated area, plant age, harvests/year, drying method, water access, land tenure, technical assistance). Economic profile completely undocumented (buyer type, harvest volume, pricing, payment terms, capital usage, income sources, interest in premium channels). Zero compliance infrastructure: no tax registration (RUT), no agricultural authority registration (ICA), no phytosanitary certifications, and no export trader status with customs. This is an onboarding-stage supplier requiring foundational development.	\N	SM776f3cfbe513de9ea4b2c330c5c3126e
26	35	2026-04-23 18:07:01.154464+00	claude-haiku-4-5	ONBOARD_SCORE	25	D	0	RUT DIAN - Critical missing, Fitosanitary certification - Required for export, DIAN exporter registration - Required for export operations, Production volume data - Not documented, Land rights documentation - Not provided, Post-harvest quality standards - No evidence	Supplier ICA Sync Test A presents severe readiness deficiencies across all evaluation dimensions. Only 1 of 3 compliance certifications present (ICA registro). Critical export prerequisites missing: RUT DIAN (tax identification), fitosanitary certification, and DIAN exporter status. Farm production data entirely absent (no hectares, crop variety, harvest volume, drying method documented). Economic profile incomplete with no data on sales volume, pricing, or financial capacity. Land tenure rights unverified. Without documented production metrics and baseline compliance framework, export capability cannot be assessed. Supplier requires foundational infrastructure development before commercial export consideration.	\N	SM11b444dd8c7b40a6f959c09ee0c5eb42
28	39	2026-04-23 23:04:56.893326+00	claude-haiku-4-5	ONBOARD_SCORE	5	D	0	RUT DIAN - Missing, Fitosanitary Certificate - Missing, DIAN Exporter Registration - Missing, Production Volume Data - Missing, Land Rights Documentation - Missing, Technical Assistance Records - Missing, Water Access Verification - Missing, Harvest Methodology - Missing	Supplier profile is critically incomplete with minimal data points established. Only ICA registration confirmed. Zero production metrics, no economic data, no land tenure documentation, and three major compliance certifications absent. Cannot assess farming capacity, post-harvest quality protocols, or export commitment. This appears to be a preliminary registration without substantive farm evaluation.	\N	SM36d43be38d71f57de7be0da57225b2a4
27	40	2026-04-23 23:04:56.873106+00	claude-haiku-4-5	ONBOARD_SCORE	0	D	0	RUT DIAN not obtained, ICA registro not obtained, Fitosanitario certification not obtained, DIAN exportador status not obtained	Supplier profile is incomplete across all evaluation dimensions. Critical data missing: land rights status (tenenciaTierra), production volume (hectareasProduccion, volumenKgUltimaCosecha), post-harvest quality indicators (metodoSecado), and all compliance certifications. Farm operational details (crop type, plant age, harvest frequency, water access, technical assistance) are undocumented. Economic profile shows no data on buyer relationships, pricing, payment terms, or export channel interest. Compliance score is 0/20 - no certifications in place.	\N	SM48d90b6af5c8e4d8fa1082b4a9175087
29	42	2026-04-23 23:11:45.509539+00	claude-haiku-4-5	ONBOARD_SCORE	0	D	0	RUT DIAN not registered, ICA registro missing, Fitosanitario certification absent, DIAN exportador status not obtained	Supplier P02 Test Bool False presents critical deficiencies across all evaluation dimensions. Land rights data absent (0/20pts). Production volume data completely missing - no hectares, crop type, harvest volume, or farming experience documented (0/20pts). Post-harvest quality metrics unavailable - no drying method, water access, technical assistance, or plant age data (0/20pts). Compliance documentation entirely missing with all four required certifications flagged as false or absent (0/20pts). Commitment indicators unrecorded - no buyer relationships, payment history, export interest documented, or economic stability data provided (0/20pts). This profile indicates a newly registered supplier with zero substantive operational data collected during onboarding.	\N	SM4d75dd58f8dc997d07b014e5d8183f70
30	45	2026-04-23 23:11:45.751569+00	claude-haiku-4-5	ONBOARD_SCORE	0	D	0	RUT DIAN - Not registered, ICA Registration - Not registered, Phytosanitary Certificate - Not obtained, DIAN Exporter Status - Not registered	Supplier P02 Test Omitted presents critical deficiencies across all evaluation dimensions. Land rights data is completely absent (0/20), production volume information is missing preventing any capacity assessment (0/20), post-harvest quality parameters are undocumented (0/20), and all four compliance documents are not obtained (0/20). Economic commitment indicators are entirely missing (0/20). The supplier appears to be at the initial onboarding stage with no substantive data collection completed. This is a foundational case requiring comprehensive assessment before any export pathway determination can be made.	\N	SMb1cad04865c09889483a8fdd037f74df
31	44	2026-04-23 23:11:46.047271+00	claude-haiku-4-5	ONBOARD_SCORE	0	D	0	RUT DIAN not obtained, ICA registration missing, Phytosanitary certification absent, DIAN exporter status not registered	Supplier P02 Test String No presents critical deficiencies across all evaluation dimensions. Land rights documentation cannot be assessed (0/20). Production volume data is absent - no hectares, crop type, harvest volume, or harvests per year recorded (0/20). Post-harvest quality parameters are undefined - drying method and water access unspecified (0/20). Compliance documentation is completely absent across all four required certifications (0/20). Commitment indicators show no engagement metrics - economic situation, buyer relationships, and export interest unknown (0/20). This is a newly onboarded record (23-Apr-2026) with minimal data population. No commercial score, graduation pathway, or threshold version assigned.	\N	SM443b88d8a38a7d2454201b9800a3bf31
32	43	2026-04-23 23:11:46.049921+00	claude-haiku-4-5	ONBOARD_SCORE	15	D	0	RUT DIAN not obtained, Fitosanitary certification missing, DIAN exporter status not registered, ICA registration incomplete	Supplier P02 is in early-stage onboarding with critical data gaps across all evaluation categories. Land rights status unknown (0/20pts). Production volume completely undocumented - no hectares, crop type, harvest volume, or yield data recorded (0/20pts). Post-harvest quality unmeasured - drying method and water access not documented (0/20pts). Compliance infrastructure severely deficient: missing RUT DIAN, fitosanitary certification, and DIAN exporter registration; only ICA registration partially complete (5/20pts). Commitment level unclear due to incomplete economics profile - purchase intentions, payment terms, capital usage preferences, and export interest not assessed (5/20pts). No financial profile exists to determine capital capacity. Supplier has provided basic consent but lacks foundational operational documentation required for export pathway qualification.	\N	SMab93f62e6086fd3e75308ae73029ec05
33	41	2026-04-23 23:11:46.077042+00	claude-haiku-4-5	ONBOARD_SCORE	15	D	0	RUT DIAN - Critical: No tax identification number, Fitosanitary Certificate - Critical: Missing phytosanitary compliance, DIAN Exporter Registration - Critical: Not registered as exporter, Production Data - Critical: No hectares, harvest volume, or crop details, Land Rights - Critical: No tenure documentation provided, Economic Data - Critical: No financial information recorded	Supplier P02 demonstrates severe deficiencies across all evaluation dimensions. Land rights assessment impossible (0pts) due to missing tenencia data. Production volume cannot be evaluated (0pts) - no hectare count, crop type, or harvest data provided. Post-harvest quality assessment blocked (0pts) - no drying method or production details. Compliance documentation critically insufficient (5pts) - only ICA registry confirmed; missing RUT DIAN (fundamental), fitosanitary certification, and DIAN exporter status. Commitment evident through consent (15pts) given, but no operational data supports serious export intent. Economic capacity undetermined - no financial metrics recorded. This appears to be a newly onboarded supplier with incomplete intake assessment.	\N	SM0379be5334a76853b77cf4649b6d15c8
34	46	2026-04-24 02:02:51.322229+00	claude-haiku-4-5	ONBOARD_SCORE	0	D	0	RUT DIAN not registered, ICA registro missing, Fitosanitario certification absent, DIAN exportador status not obtained	Supplier profile is critically incomplete with zero data points across all evaluation dimensions. Land rights documentation unavailable (0/20). Production volume entirely undocumented (0/20). Post-harvest quality metrics missing (0/20). All compliance certifications absent (0/20). No demonstrated commitment to agricultural operations (0/20). This appears to be a minimal test record with no substantive agricultural operation established.	\N	SM43f0b08fdcdafdd7c0bd3084605fdb9b
35	48	2026-04-24 02:02:53.099257+00	claude-haiku-4-5	ONBOARD_SCORE	5	D	0	RUT DIAN not obtained, Fitosanitary certification missing, DIAN exporter registration not completed, ICA registration obtained but incomplete compliance profile	Supplier 'Smoke Test ICA' presents critical data deficiencies across all evaluation dimensions. Land rights status unknown (0/20pts) - no tenure documentation provided. Production volume unverified (0/20pts) - no hectares, crop type, or harvest data recorded. Post-harvest quality cannot be assessed (0/20pts) - drying methods and technical assistance undefined. Compliance documentation severely incomplete (5/20pts) - only ICA registration present; missing RUT DIAN, fitosanitary cert, and exporter registration. Commitment level unconfirmed (0/20pts) - no economic engagement data, export interest, or operational details documented. This appears to be a test record with minimal substantive information.	\N	SMbb8e7723fcc110198bee1cdc39a1f2bd
36	47	2026-04-24 02:02:53.623472+00	claude-haiku-4-5	ONBOARD_SCORE	25	D	10000000	RUT DIAN not registered, ICA registration missing, Phytosanitary certification absent, DIAN exporter status not obtained, No post-harvest quality documentation	Supplier demonstrates critical deficiencies across all evaluation dimensions. Land rights tenure status unknown (0/20). Production volume of 2,000 kg annually is severely insufficient for export scale operations requiring minimum 10,000+ kg (5/20). Post-harvest quality infrastructure completely undocumented with no drying methodology, water access, or technical assistance recorded (0/20). Compliance framework entirely absent with zero certifications achieved (0/20). Commitment indicators unclear due to missing data on payment terms, farming experience, and export aspirations (15/20 baseline for active status only). Farm age, plant maturity, and harvest frequency unknown. No evidence of commercial engagement or graduation pathway assignment.	\N	SM3254e91b90c7ca59e99e7c98875079d9
37	49	2026-04-24 02:16:49.34241+00	claude-haiku-4-5	ONBOARD_SCORE	0	D	0	RUT DIAN not registered, ICA registro not obtained, Fitosanitario certification missing, DIAN exporter registration incomplete	Supplier Pre-T2 Check has no data populated across critical evaluation domains. Land rights status unknown (0/20). Production volume unassessed (0/20). Post-harvest quality metrics absent (0/20). All compliance certifications missing (0/20). Commitment indicators not evaluated (0/20). This is an incomplete onboarding record requiring full re-assessment before any export pathway determination is possible.	\N	SM0648f0febf1713336a5ed1a8e95041dd
38	50	2026-04-24 02:17:45.362652+00	claude-haiku-4-5	ONBOARD_SCORE	35	D	2500000	RUT DIAN - Critical: Not registered with tax authority, Fitosanitario Certificate - Critical: No phytosanitary certification, DIAN Exporter Registration - Critical: Not registered as exporter, Production Volume Documentation - Missing: No harvest data validation, Land Rights Documentation - Missing: Tenure status undocumented, Post-Harvest Quality Records - Missing: No quality certifications	Supplier demonstrates foundational agricultural activity (3 hectares coffee, 1,000 kg last harvest) but lacks essential export infrastructure. Only 1 of 4 compliance requirements met (ICA registration). No documented land tenure, production volume verification, quality standards, or export history. Economic data incomplete (missing buyer type, pricing, payment terms, capital availability assessment). Critical knowledge gaps evident regarding export pricing and channel premium interest. Current position: pre-commercial farmer with minimal export readiness.	\N	SMf935aa4a80e551b21756bf91c973473d
39	51	2026-04-24 02:27:02.060278+00	claude-haiku-4-5	ONBOARD_SCORE	5	D	0	RUT DIAN not registered, Fitosanitary certification missing, DIAN exporter status not obtained, ICA registration present but incomplete compliance portfolio	Supplier is at critical early stage with minimal data availability. Land rights documentation absent (0/20 pts). Production volume unspecified - no harvest data, acreage, or crop details recorded (0/20 pts). Post-harvest quality metrics completely missing (0/20 pts). Compliance score critically low with 3 of 4 essential certifications missing (5/20 pts). Commitment indicators not provided - no economic data, technical assistance records, or export interest documented (0/20 pts). This appears to be a newly registered profile with incomplete onboarding data entry.	\N	SMd51805efb4a4951326c260e5b38e685d
40	53	2026-04-24 02:30:19.67729+00	claude-haiku-4-5	ONBOARD_SCORE	35	D	2500000	RUT DIAN not registered, Fitosanitary certification missing, DIAN exporter status not obtained, No post-harvest quality documentation	Supplier demonstrates minimal export readiness. Land rights documentation absent (0/20). Production volume of 1,000 kg indicates subsistence-level farming with insufficient scale (5/20). Post-harvest quality controls not established - no drying method, water access, or technical assistance documented (0/20). Critical compliance gaps: missing RUT DIAN, fitosanitary cert, and DIAN exporter registration (15/20). Commitment indicators incomplete - no export interest, payment terms, or economic planning data recorded (15/20). Farm profile lacks essential operational details (age of plants, harvests/year, land tenure status).	\N	SM2235657e917425b065e67e717c115039
41	54	2026-04-24 02:41:51.068792+00	claude-haiku-4-5	ONBOARD_SCORE	5	D	0	RUT DIAN not registered, ICA registro not obtained, Fitosanitario certification missing, DIAN exportador status not acquired	Supplier Pre-T2 Smoke presents critical deficiencies across all evaluation dimensions. Land rights documentation cannot be verified (0/20pts) due to missing tenencia tierra data. Production volume assessment impossible (0/20pts) - no hectareas, crop type, harvest volume, or production frequency recorded. Post-harvest quality evaluation not feasible (0/20pts) - metodo secado and technical assistance data absent. Compliance documentation completely non-compliant (0/20pts) - all four critical certifications missing. Commitment assessment inconclusive (5/20pts) - profile created but no substantive engagement indicators, economic viability data, or export interest documentation. Profile appears incomplete at onboarding stage with minimal data collection.	\N	SM98c0dcb33b3bd505d301415f46982730
42	55	2026-04-24 02:57:19.299235+00	claude-haiku-4-5	ONBOARD_SCORE	35	D	2000000	RUT DIAN - Critical for any export operation, Fitosanitary Certification - Required for agricultural exports, DIAN Exporter Registration - Mandatory for legal export status	Supplier scores 35/100 indicating significant barriers to export readiness. Land rights status unknown (0/20pts). Production volume of 2,000 kg annually is severely below commercial export thresholds requiring minimum 10,000-20,000 kg/harvest (5/20pts). Post-harvest quality metrics completely absent - no drying method, water access, or technical assistance documented (0/20pts). Compliance critically deficient with only 1 of 4 key certifications present; missing RUT DIAN, fitosanitary cert, and exporter registration (5/20pts). Commitment indicators insufficient - no evidence of export interest, price knowledge, or premium channel awareness (5/20pts). Farm operation appears subsistence-oriented with minimal commercial infrastructure.	\N	SM84f361c6e6c92edc66bda078d9158ddc
43	57	2026-04-24 03:05:11.213811+00	claude-haiku-4-5	ONBOARD_SCORE	35	D	2500000	RUT DIAN - Missing, Fitosanitary Certificate - Missing, DIAN Exporter Registration - Missing, Production volume documentation - Incomplete, Land tenure rights - Not verified, Technical assistance records - Missing	Supplier demonstrates minimal export readiness across all assessment dimensions. Land rights verification absent (0/20). Production volume of 1,000 kg from 3 hectares indicates low productivity and insufficient scale for commercial export (5/20). Post-harvest quality documentation entirely missing with no drying method, water access, or technical support records (0/20). Critical compliance deficiencies: only 1 of 4 required certifications obtained; missing RUT DIAN, fitosanitary certification, and DIAN exporter status (5/20). Commitment indicators unclear with no documented export interest, channel preference, or payment term agreements (20/20 assumed minimal engagement). Fundamental infrastructure and regulatory barriers require resolution before export viability assessment.	\N	SM1bf924ff42c80776c0456d058e30f002
44	58	2026-04-24 23:45:46.272708+00	claude-haiku-4-5	ONBOARD_SCORE	12	D	0	RUT DIAN - Missing, ICA Registration - Missing, Phytosanitary Certificate - Missing, DIAN Exporter Status - Missing	Supplier presents critically low readiness (12/100). Only 25% of compliance requirements met (0/4 documents). Production data entirely absent: harvest volume unknown, drying methodology undocumented, water access unconfirmed, technical assistance status unclear. Land tenure status unverified despite 5 hectares claimed. No economic data captured: sales volume, export price awareness, payment capacity, and income diversification unknown. Farm operational details missing: plant age (años), harvest frequency (cosechas/año), years on property (años en finca) all null. Cannot assess actual production capacity, quality control systems, or export viability. Supplier appears newly registered (2026-04-24) with minimal onboarding completion.	\N	SM84eb312511fb8ae7c83b4b3c9dcbbe02
45	60	2026-04-25 01:08:20.646021+00	claude-haiku-4-5	ONBOARD_SCORE	28	D	2500000	RUT DIAN not registered, Fitosanitary certification missing, DIAN exporter status not obtained, Land tenure rights not documented, Technical assistance not confirmed	Supplier demonstrates minimal export readiness. Land rights documentation absent (0/20pts). Production volume of 1,000kg from 3 hectares indicates very low yields suggesting productivity issues (5/20pts). Post-harvest quality controls undefined - no drying method, water access, or technical support documented (3/20pts). Critical compliance deficiencies: missing RUT DIAN, fitosanitary certification, and DIAN exporter registration (8/20pts). No demonstrated commitment to export pathway - no prior export attempts, unknown interest in premium channels, unaware of export pricing (12/20pts). Farm infrastructure and market engagement severely underdeveloped.	\N	SM9e8b7f56ba81e1fa26aaea601f446b15
46	61	2026-04-25 01:08:28.993333+00	claude-haiku-4-5	ONBOARD_SCORE	32	D	2400000	RUT DIAN not registered, Fitosanitary certification missing, DIAN Exporter status not obtained, Land rights documentation incomplete, Production volume documentation insufficient	Supplier demonstrates minimal export readiness. Critical deficiencies across all assessment dimensions: Land rights status unknown (0/20pts - tenencia tierra not documented); Production volume marginal at 1,000 kg last harvest with incomplete production metrics (5/20pts - insufficient documentation of consistent yields, harvest frequency, storage capacity); Post-harvest quality undocumented (2/20pts - no drying method, storage, or quality control data); Compliance severely deficient (8/20pts - missing RUT DIAN, fitosanitary cert, DIAN exporter registration; only ICA registro confirmed); Commitment unclear (17/20pts - active status and consent present but no evidence of export intent or channel engagement). Farm infrastructure minimal (3 hectares, coffee cultivation) with inadequate data on plant age, technical assistance, water access, and land tenure. Economic profile shows subsistence-level production (1 MT last harvest) with incomplete financial documentation.	\N	SMada8a7a117a4103c8fc81aa97f39212a
47	62	2026-04-25 01:21:10.259553+00	claude-haiku-4-5	ONBOARD_SCORE	28	D	2250000	RUT DIAN not registered, Fitosanitary certification missing, DIAN exporter status not obtained, ICA registro present but incomplete compliance ecosystem	Supplier demonstrates minimal export readiness. Land rights documentation absent (0/20), production volume severely limited at 1,500kg last harvest insufficient for commercial export (5/20), post-harvest quality controls not documented (0/20), critical compliance framework incomplete with 3 of 4 essential certifications missing (5/20), and commitment indicators not assessed (13/20 default). Farmer operates small 4-hectare coffee farm with no evidence of technical assistance, water access clarity, or land tenure security. Zero commercial export experience and no documented knowledge of export pricing.	\N	SM68fc2f054636e523cdaa56a86fe714fe
48	63	2026-04-25 01:22:56.949204+00	claude-haiku-4-5	ONBOARD_SCORE	35	D	2400000	RUT DIAN - Required for legal trading, Fitosanitary Certification - Required for export, DIAN Exporter Registration - Required for international shipments, Land Rights Documentation - Not provided, Production Volume Evidence - Below commercial threshold	Hook Supplier is in early-stage development with critical foundation gaps. Score breakdown: Land Rights (0/20) - no documentation provided; Production Volume (8/20) - 1,200kg last harvest indicates small-scale operation, insufficient for consistent export volumes; Post-Harvest Quality (5/20) - no quality certifications or drying methodology documented; Compliance Docs (12/20) - has ICA registration but missing RUT DIAN, fitosanitary cert, and DIAN exporter status; Commitment (10/20) - limited evidence of export intent or commercial engagement. Farm size (4 hectares) and harvest data suggest subsistence-level production. No technical assistance, water access details, or land tenure documentation create legal and operational risks.	\N	SMcaaa303c1cb11e83445b446b76abddd6
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
18	22	E2E Test Co	IMPORTER	US	\N		\N	\N	f	\N	\N	2026-04-24 11:31:07.512414+00	0	FREE	\N	{}
23	28	Gulf Trade International	IMPORTER	AE	\N	Dubai-based specialty food importer sourcing premium Colombian products.	\N	\N	f	\N	\N	2026-04-24 17:26:26.442329+00	0	FREE	\N	{}
24	29	Test Imports LLC	DISTRIBUTOR	US	\N	Demo buyer account for testing.	\N	\N	f	\N	\N	2026-04-24 17:26:26.77063+00	0	FREE	\N	{}
25	30	Test Imports Co	IMPORTER	United Arab Emirates	\N		\N	\N	f	\N	\N	2026-04-25 01:11:07.671745+00	0	FREE	\N	{}
26	31	Verify Co	IMPORTER	CO	\N		\N	\N	f	\N	\N	2026-04-25 01:15:03.052439+00	0	FREE	\N	{}
27	32	Verify Co	IMPORTER	CO	\N		\N	\N	f	\N	\N	2026-04-25 01:15:15.173541+00	0	FREE	\N	{}
28	33	Verify Co	IMPORTER	CO	\N		\N	\N	f	\N	\N	2026-04-25 01:15:33.213643+00	0	FREE	\N	{}
29	34	Block Co	IMPORTER	CO	\N		\N	\N	f	\N	\N	2026-04-25 01:16:40.752401+00	0	FREE	\N	{}
\.


--
-- Data for Name: compliance_docs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.compliance_docs (id, supplier_id, rut_dian, ica_registro, fitosanitario_cert, dian_exportador, compliance_score, last_reviewed_at) FROM stdin;
2	3	f	f	f	f	\N	\N
3	9	f	f	f	f	\N	\N
4	10	f	f	f	f	\N	\N
5	12	f	f	f	f	\N	\N
6	14	f	f	f	f	\N	\N
7	15	f	f	f	f	\N	\N
8	16	f	f	f	f	\N	\N
21	27	f	f	f	f	\N	\N
23	28	t	t	t	f	\N	\N
25	29	t	t	t	f	\N	\N
27	30	f	f	f	f	\N	\N
29	31	t	f	f	f	\N	\N
30	33	t	f	f	f	\N	\N
1	1	t	f	t	f	\N	\N
31	35	f	t	f	f	\N	\N
32	36	f	f	f	f	\N	\N
33	37	f	f	f	f	\N	\N
34	39	f	t	f	f	\N	\N
35	40	f	t	f	f	\N	\N
36	41	f	t	f	f	\N	\N
37	42	f	f	f	f	\N	\N
38	43	f	t	f	f	\N	\N
39	44	f	f	f	f	\N	\N
40	45	f	f	f	f	\N	\N
41	46	f	f	f	f	\N	\N
42	47	f	f	f	f	\N	\N
43	48	f	t	f	f	\N	\N
44	49	f	f	f	f	\N	\N
45	50	f	t	f	f	\N	\N
46	51	f	t	f	f	\N	\N
47	53	f	t	f	f	\N	\N
48	54	f	f	f	f	\N	\N
49	55	f	t	f	f	\N	\N
50	57	f	t	f	f	\N	\N
51	58	f	f	f	f	\N	\N
52	60	f	t	f	f	\N	\N
53	61	f	t	f	f	\N	\N
54	62	f	t	f	f	\N	\N
55	63	f	t	f	f	\N	\N
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
1	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
2	3	\N	5000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
3	9	\N	100	\N	\N	100	{Logistiucs}	\N	\N	\N	\N	\N	\N	\N
4	10	\N	5000	\N	\N	2000	{"No capital, don't know the process..."}	\N	\N	\N	\N	\N	\N	\N
5	12	\N	4000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
6	14	\N	5000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
7	15	\N	6000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
8	16	\N	3000	\N	\N	2000	{logistics}	\N	\N	\N	\N	\N	\N	\N
9	27	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
10	28	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
11	29	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
12	30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
13	31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
14	33	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
15	35	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
16	36	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
17	37	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
18	39	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
19	40	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
20	41	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
21	42	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
22	43	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
23	44	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
24	45	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
25	46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
26	47	\N	2000	5000-6000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
27	48	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
28	49	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
29	50	\N	1000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
30	51	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
31	53	\N	1000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
32	54	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
33	55	\N	2000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
34	57	\N	1000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
35	58	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
36	60	\N	1000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
37	61	\N	1000	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
38	62	\N	1500	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
39	63	\N	1200	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: email_verification_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_verification_tokens (id, user_id, token, expires_at, used, created_at) FROM stdin;
1	30	9deb3ba00de0fe92834edf075c4cc01e6c52dded5ae0fe8d399966eba73d85a5	2026-04-26 01:11:07.677+00	f	2026-04-25 01:11:07.678032+00
2	31	86b0d0ef014d020c8adf129c65b8dbb54a1ca94f4a654e78df4e811cbfdb5057	2026-04-26 01:15:03.058+00	f	2026-04-25 01:15:03.059563+00
3	32	88f73754835391f62b08c6d083e892e44d5ddc7d18ddf6bc2a115ba5e0eeb548	2026-04-26 01:15:15.176+00	f	2026-04-25 01:15:15.177138+00
4	33	02c1ef44aba63f7b7a637cab7cb9a6539dfe4957462923cf6446bdcea96987b4	2026-04-26 01:15:33.217+00	f	2026-04-25 01:15:33.217768+00
5	33	014950dfbb06cc1121d9ae08ef2ee1829d7b35bd1536a401f12ff55b24cb25ee	2026-04-26 01:15:44.829+00	t	2026-04-25 01:15:44.830099+00
6	34	20b40ad887b635eb21dd138b05729b4ed80ad8221c92a1f43aa42816382c5fb3	2026-04-26 01:16:40.756+00	f	2026-04-25 01:16:40.75662+00
7	23	778fc83cf3c9dfafd6a968783de466f97ae549472aa009614e9ecb1b050f28ff	2026-04-26 02:06:05.065+00	f	2026-04-25 02:06:05.065754+00
\.


--
-- Data for Name: farms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.farms (id, supplier_id, cultivo_principal, variedad_cafe, hectareas_produccion, edad_plantas_anos, cosechas_por_ano, metodo_secado, acceso_agua, anos_en_finca, tenencia_tierra, asistencia_tecnica) FROM stdin;
1	1	cacao	\N	\N	\N	\N	\N	\N	\N	\N	\N
2	2	cacao	March, April	1.00	\N	\N	\N	\N	\N	\N	\N
3	3	cacao	\N	2.50	\N	\N	\N	\N	\N	\N	\N
4	7	cacao	March	1.00	\N	\N	\N	\N	\N	\N	\N
5	9	cacao	March	1.00	\N	\N	\N	\N	\N	\N	\N
6	10	cafe	March, April, October	2.50	\N	\N	\N	\N	\N	\N	\N
7	12	cacao	\N	3.00	\N	\N	\N	\N	\N	\N	\N
8	14	cacao	\N	3.00	\N	\N	\N	\N	\N	\N	\N
9	15	cacao	\N	4.00	\N	\N	\N	\N	\N	\N	\N
10	16	bocadillo	\N	2.00	\N	\N	\N	\N	\N	\N	\N
17	27	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
18	28	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
19	29	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
20	30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
21	31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
22	33	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
23	35	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
24	36	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
25	37	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
26	39	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
27	40	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
28	41	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
29	42	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
30	43	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
31	44	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
32	45	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
33	46	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
34	47	coffee	oct,nov	5.00	\N	\N	\N	\N	\N	\N	\N
35	48	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
36	49	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
37	50	cafe	\N	3.00	\N	\N	\N	\N	\N	\N	\N
38	51	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
39	53	cafe	\N	3.00	\N	\N	\N	\N	\N	\N	\N
40	54	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
41	55	cafe	\N	5.00	\N	\N	\N	\N	\N	\N	\N
42	57	cafe	\N	3.00	\N	\N	\N	\N	\N	\N	\N
43	58	Café especial	\N	5.00	\N	\N	\N	\N	\N	\N	\N
44	60	cafe	\N	3.00	\N	\N	\N	\N	\N	\N	\N
45	61	cafe	\N	3.00	\N	\N	\N	\N	\N	\N	\N
46	62	cafe	\N	4.00	\N	\N	\N	\N	\N	\N	\N
47	63	cafe	\N	4.00	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: inquiries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inquiries (id, product_id, buyer_email, buyer_name, company, country, message, quantity_kg, status, created_at) FROM stdin;
1	1	e2everify_suwco-@test.com	Verify Test	Verify Co	CO	We are interested in buying your coffee. Please send us a quote.	500	PENDING	2026-04-25 01:27:32.062347+00
\.


--
-- Data for Name: interactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.interactions (id, supplier_id, created_at, interaction_type, actor, notes, metadata) FROM stdin;
1	1	2026-04-20 03:26:05.577817+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": "Santander", "officer_code": null, "has_bank_account": null, "organic_certified": null}
2	3	2026-04-20 03:30:59.408972+00	FORM_SUBMISSION	Test Officer	Test visit	{"has_rut": true, "department": "Santander", "officer_code": null, "has_bank_account": true, "organic_certified": true}
3	9	2026-04-20 03:48:23.660388+00	FORM_SUBMISSION	Babar	needs help	{"has_rut": false, "department": "Santander", "officer_code": "OF-001", "has_bank_account": false, "organic_certified": false}
4	10	2026-04-20 04:11:30.547353+00	FORM_SUBMISSION	Maria Garcia	Initial onboarding form submitted	{"has_rut": true, "department": "Huila", "officer_code": null, "has_bank_account": true, "organic_certified": true}
5	12	2026-04-20 12:59:08.313774+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": true, "department": "Santander", "officer_code": null, "has_bank_account": true, "organic_certified": false}
6	14	2026-04-20 13:05:55.541137+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": "yes", "department": "Santander", "officer_code": null, "has_bank_account": "yes", "organic_certified": null}
7	15	2026-04-20 13:11:13.778001+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": "yes", "department": "Santander", "officer_code": null, "has_bank_account": "yes", "organic_certified": null}
8	16	2026-04-20 14:48:47.419518+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": false, "department": "Santander", "officer_code": null, "has_bank_account": true, "organic_certified": false}
9	27	2026-04-22 20:19:30.294322+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
10	28	2026-04-22 21:00:31.516915+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": "Antioquia", "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
11	29	2026-04-22 21:01:33.14016+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": "Valle del Cauca", "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
12	30	2026-04-22 21:06:45.231132+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
13	31	2026-04-23 11:48:23.263628+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
14	33	2026-04-23 15:19:39.589041+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
15	35	2026-04-23 18:06:55.274863+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
16	36	2026-04-23 18:06:55.50021+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": false, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
17	37	2026-04-23 18:06:55.719576+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
18	39	2026-04-23 23:04:52.327646+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
19	40	2026-04-23 23:04:52.549603+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": false, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
20	41	2026-04-23 23:11:40.046051+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
21	42	2026-04-23 23:11:40.382256+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": false, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
22	43	2026-04-23 23:11:40.612623+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": "yes", "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
23	44	2026-04-23 23:11:40.832813+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": "no", "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
24	45	2026-04-23 23:11:41.060957+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
25	46	2026-04-24 02:02:47.823279+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
26	47	2026-04-24 02:02:48.01394+00	FORM_SUBMISSION	SELF	Smoke test full payload	{"has_rut": true, "department": "Antioquia", "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": true, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
27	48	2026-04-24 02:02:48.272856+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
28	49	2026-04-24 02:16:45.84024+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
29	50	2026-04-24 02:17:40.23342+00	FORM_SUBMISSION	Test Officer	Initial onboarding form submitted	{"has_rut": true, "department": null, "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
30	51	2026-04-24 02:26:56.831558+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
31	53	2026-04-24 02:30:14.827877+00	FORM_SUBMISSION	Test Officer	Initial onboarding form submitted	{"has_rut": true, "department": null, "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
32	54	2026-04-24 02:41:46.207321+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": null, "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
33	55	2026-04-24 02:57:14.130793+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": true, "department": null, "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
34	57	2026-04-24 03:05:04.913648+00	FORM_SUBMISSION	Test Officer	Initial onboarding form submitted	{"has_rut": true, "department": null, "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
35	58	2026-04-24 23:45:40.032929+00	FORM_SUBMISSION	SELF	Initial onboarding form submitted	{"has_rut": null, "department": "Huila", "officer_code": null, "ica_registered": null, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
36	60	2026-04-25 01:08:15.377719+00	FORM_SUBMISSION	Test Officer	Initial onboarding form submitted	{"has_rut": true, "department": null, "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
37	61	2026-04-25 01:08:22.494088+00	FORM_SUBMISSION	Test Officer	Initial onboarding form submitted	{"has_rut": true, "department": null, "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
38	62	2026-04-25 01:21:04.634693+00	FORM_SUBMISSION	Test Officer	Initial onboarding form submitted	{"has_rut": true, "department": null, "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
39	63	2026-04-25 01:22:51.07126+00	FORM_SUBMISSION	Hook Officer	Initial onboarding form submitted	{"has_rut": true, "department": null, "officer_code": null, "ica_registered": true, "invima_approved": null, "invima_required": null, "vuce_registered": null, "has_bank_account": null, "organic_certified": null, "business_structure": null, "part_of_cooperative": null}
\.


--
-- Data for Name: loans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loans (id, buyer_id, order_id, principal_usd, fee_usd, total_repayment_usd, apr_percent, term_days, status, due_at, credit_score_at_issuance, created_at, updated_at) FROM stdin;
2	1	\N	5000	49.315067	5049.315	12	30	REPAID	2026-05-14 04:29:40.207+00	500	2026-04-14 04:29:40.208202+00	2026-04-14 04:29:52.266+00
3	33	\N	300	2.958904	302.9589	12	30	DEFAULTED	2026-05-25 01:28:10.613+00	500	2026-04-25 01:28:10.613789+00	2026-04-25 01:28:10.613789+00
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, sender_id, receiver_id, content, read, created_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, quantity_kg, price_per_kg, total_usd) FROM stdin;
1	1	1	150	28.5	4275
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, buyer_id, status, total_usd, incoterm, destination_port, shipping_method, notes, created_at, updated_at) FROM stdin;
1	33	SHIPPED	4275	FOB	Hamburg	SEA	E2E test order	2026-04-25 01:27:55.35578+00	2026-04-25 01:28:05.128+00
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
1	29	26877cb1f2d576382ed19d0443c8714965c37c37cc48a926b8d99d8349dea0a7	2026-04-24 22:42:36.368+00	t	2026-04-24 21:42:36.370078+00
2	29	52c7d167e28b88595f88c3f689764b3c406620f9ac5a64a19f4835e7f98354e2	2026-04-24 22:43:02.54+00	t	2026-04-24 21:43:02.540707+00
3	29	24f38002cdd2e0ecb3d305dc32530114a2bdb17ec13bef23f7ad2b749815d759	2026-04-24 22:45:54.952+00	t	2026-04-24 21:45:54.953185+00
4	29	d5c10eb3de9820f06aff22e88900b22e219eaa21273a84ed129bce67c1441dec	2026-04-24 22:48:23.493+00	t	2026-04-24 21:48:23.494627+00
5	29	46aa3c623166293eeafb601a74d0fd6e8b2777fd8bdbb22d0a3ac8805a2c6e18	2026-04-24 22:50:55.279+00	t	2026-04-24 21:50:55.280822+00
6	30	24268c603352e0f6a263d43326913ff74a1deaedd55ecc550739ac1fa4b96300	2026-04-25 02:13:09.241+00	t	2026-04-25 01:13:09.241311+00
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
5	5	Ahmed	Al-Rashid	\N	UAE	ar	\N
6	6	Li	Wei	\N	China	zh	\N
18	18	Syed	Irfan	5126591415	US	en	\N
7	7	Fincava	Admin	\N	\N	en	\N
22	22	E2E	Tester	\N	US	en	\N
23	23	Syed	Irfan	\N	CO	en	\N
27	27	Carlos	Sánchez	\N	CO	en	\N
28	28	Ahmed	Al-Rashid	\N	AE	en	\N
29	29	Test	Buyer	\N	US	en	\N
30	30	E2E	Buyer	\N	United Arab Emirates	en	\N
31	31	Verify	Test	\N	CO	en	\N
32	32	Verify	Test	\N	CO	en	\N
33	33	Verify	Test	\N	CO	en	\N
34	34	Block	Test	\N	CO	en	\N
35	35	Admin	Created	\N	\N	en	\N
36	36	Hook	Test	\N	\N	en	\N
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
1	5	1	5	Exceptional Geisha — our roastery's best-selling single origin. The jasmine and bergamot notes are extraordinary. Highly recommend for specialty roasters.	t	2026-04-07 13:36:13.815126+00
2	6	1	5	We sourced this for our Shanghai café. Clients love the complexity. Will re-order next harvest.	t	2026-04-07 13:36:13.815126+00
3	5	3	5	Best cacao we've worked with from Colombia. The fermentation is consistent and the flavor profile is excellent for our 80% dark bars.	t	2026-04-07 13:36:13.815126+00
4	6	2	4	Solid commercial grade coffee at a good price. Consistent quality, good FOB logistics from Bogotá.	f	2026-04-07 13:36:13.815126+00
5	5	5	4	Good avocado quality. The cold chain was maintained well through UAE customs. Some size variation but overall acceptable.	t	2026-04-07 13:36:13.815126+00
\.


--
-- Data for Name: rfq_responses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rfq_responses (id, rfq_id, supplier_id, price_per_kg_usd, lead_time_days, message, awarded, created_at) FROM stdin;
1	1	1	11.5	21	We can supply 5MT of our Huila Geisha SCA 92. Natural processed, Q-grade certified. Available from April harvest. FOB Cartagena. Sample available on request.	0	2026-04-07 15:09:15.503278+00
2	1	2	12.8	28	We have limited lots of washed Caturra SCA 87 from Nariño. Small batch, 2MT available this season.	0	2026-04-07 15:09:15.503278+00
3	2	2	3.6	35	Cooperativa Cacao del Pacífico can supply 10MT annually of Nacional fine-flavor cacao. Full fermentation documentation and DNA traceability available.	0	2026-04-07 15:09:15.503278+00
4	4	1	6.2	21	We can supply the requested quantity at the offered price.	0	2026-04-25 01:27:49.548744+00
\.


--
-- Data for Name: rfqs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rfqs (id, buyer_id, title, description, product_category, quantity_kg, target_price_usd, destination, destination_port, incoterm, deadline, status, created_at) FROM stdin;
1	5	Specialty Coffee - UAE Specialty Roasters	We are a specialty coffee roaster in Dubai seeking 3-5 lots of high-scoring Colombian single-origin coffee (SCA 85+). Prefer natural or honey processed. Must have Q-grader report.	COFFEE	5000	12	UAE	Jebel Ali Port	FOB	2026-05-22 15:09:11.601596+00	OPEN	2026-04-07 15:09:11.601596+00
2	6	Fine Cacao for Craft Chocolate - Shanghai	Our Shanghai craft chocolate operation needs 10MT of fine-flavor Colombian cacao annually. Need consistent fermentation and full traceability documentation.	CACAO	10000	3.8	China	Shanghai Port	CIF	2026-06-06 15:09:11.601596+00	OPEN	2026-04-07 15:09:11.601596+00
3	5	Organic Avocado Hass - GCC Distribution	Gulf food distributor seeking reliable supply of organic Hass avocado for Carrefour and LuLu Hypermarket. Year-round supply preferred. GlobalGAP required.	AVOCADO	50000	1.6	UAE	Jebel Ali Port	FOB	2026-05-07 15:09:11.601596+00	OPEN	2026-04-07 15:09:11.601596+00
4	33	E2E Test RFQ for Coffee	We need 2000kg of premium Colombian coffee.	cafe	2000	6.5	Germany	Hamburg	FOB	2026-12-31 00:00:00+00	OPEN	2026-04-25 01:27:38.034548+00
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
38	29	FAIL	75	NOT_READY	\N	{"pathway": null, "aiOutputId": 18, "complianceGaps": null, "exportReadinessScore": 75}	v0_pre_buyer_calls	2026-04-22 21:01:34.169407+00
39	30	FAIL	75	NOT_READY	\N	{"pathway": null, "aiOutputId": 20, "complianceGaps": null, "exportReadinessScore": 75}	v0_pre_buyer_calls	2026-04-22 21:06:46.302394+00
40	51	FAIL	5	NOT_READY	D	{"pathway": "D", "aiOutputId": 39, "complianceGaps": "RUT DIAN not registered, Fitosanitary certification missing, DIAN exporter status not obtained, ICA registration present but incomplete compliance portfolio", "exportReadinessScore": 5}	v0_pre_buyer_calls	2026-04-24 02:27:03.302034+00
41	53	FAIL	35	NOT_READY	D	{"pathway": "D", "aiOutputId": 40, "complianceGaps": "RUT DIAN not registered, Fitosanitary certification missing, DIAN exporter status not obtained, No post-harvest quality documentation", "exportReadinessScore": 35}	v0_pre_buyer_calls	2026-04-24 02:30:19.94886+00
42	54	FAIL	5	NOT_READY	D	{"pathway": "D", "aiOutputId": 41, "complianceGaps": "RUT DIAN not registered, ICA registro not obtained, Fitosanitario certification missing, DIAN exportador status not acquired", "exportReadinessScore": 5}	v0_pre_buyer_calls	2026-04-24 02:41:51.296909+00
43	55	FAIL	35	NOT_READY	D	{"pathway": "D", "aiOutputId": 42, "complianceGaps": "RUT DIAN - Critical for any export operation, Fitosanitary Certification - Required for agricultural exports, DIAN Exporter Registration - Mandatory for legal export status", "exportReadinessScore": 35}	v0_pre_buyer_calls	2026-04-24 02:57:19.566249+00
44	57	FAIL	35	NOT_READY	D	{"pathway": "D", "aiOutputId": 43, "complianceGaps": "RUT DIAN - Missing, Fitosanitary Certificate - Missing, DIAN Exporter Registration - Missing, Production volume documentation - Incomplete, Land tenure rights - Not verified, Technical assistance records - Missing", "exportReadinessScore": 35}	v0_pre_buyer_calls	2026-04-24 03:05:11.428654+00
45	58	FAIL	12	NOT_READY	D	{"pathway": "D", "aiOutputId": 44, "complianceGaps": "RUT DIAN - Missing, ICA Registration - Missing, Phytosanitary Certificate - Missing, DIAN Exporter Status - Missing", "exportReadinessScore": 12}	v0_pre_buyer_calls	2026-04-24 23:45:46.630572+00
46	60	FAIL	28	NOT_READY	D	{"pathway": "D", "aiOutputId": 45, "complianceGaps": "RUT DIAN not registered, Fitosanitary certification missing, DIAN exporter status not obtained, Land tenure rights not documented, Technical assistance not confirmed", "exportReadinessScore": 28}	v0_pre_buyer_calls	2026-04-25 01:08:20.907888+00
47	61	FAIL	32	NOT_READY	D	{"pathway": "D", "aiOutputId": 46, "complianceGaps": "RUT DIAN not registered, Fitosanitary certification missing, DIAN Exporter status not obtained, Land rights documentation incomplete, Production volume documentation insufficient", "exportReadinessScore": 32}	v0_pre_buyer_calls	2026-04-25 01:08:29.185266+00
48	62	FAIL	28	NOT_READY	D	{"pathway": "D", "aiOutputId": 47, "complianceGaps": "RUT DIAN not registered, Fitosanitary certification missing, DIAN exporter status not obtained, ICA registro present but incomplete compliance ecosystem", "exportReadinessScore": 28}	v0_pre_buyer_calls	2026-04-25 01:21:10.521621+00
49	63	FAIL	35	NOT_READY	D	{"pathway": "D", "aiOutputId": 48, "complianceGaps": "RUT DIAN - Required for legal trading, Fitosanitary Certification - Required for export, DIAN Exporter Registration - Required for international shipments, Land Rights Documentation - Not provided, Production Volume Evidence - Below commercial threshold", "exportReadinessScore": 35}	v0_pre_buyer_calls	2026-04-25 01:22:57.192907+00
\.


--
-- Data for Name: supplier_state_transitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplier_state_transitions (id, supplier_id, from_state, to_state, threshold_version, commercial_score_at_transition, actor, justification, evaluation_id, created_at) FROM stdin;
41	1	NOT_READY	SELLABLE	v0_pre_buyer_calls	\N	ADMIN	Manual override for QA	\N	2026-04-22 18:49:19.807039+00
42	1	SELLABLE	PUBLISHED	v0_pre_buyer_calls	\N	ADMIN	Verified and ready for marketplace	\N	2026-04-22 18:49:40.350293+00
43	2	NOT_READY	SELLABLE	v0_pre_buyer_calls	\N	ADMIN	setup for test	\N	2026-04-22 18:49:40.43707+00
44	2	SELLABLE	PUBLISHED	v0_pre_buyer_calls	\N	ADMIN	Trying to publish non-sellable	\N	2026-04-22 18:49:40.848642+00
45	29	\N	NOT_READY	v0_pre_buyer_calls	75	SYSTEM	\N	38	2026-04-22 21:01:34.169407+00
46	30	\N	NOT_READY	v0_pre_buyer_calls	75	SYSTEM	\N	39	2026-04-22 21:06:46.302394+00
47	51	\N	NOT_READY	v0_pre_buyer_calls	5	SYSTEM	\N	40	2026-04-24 02:27:03.302034+00
48	53	\N	NOT_READY	v0_pre_buyer_calls	35	SYSTEM	\N	41	2026-04-24 02:30:19.94886+00
49	54	\N	NOT_READY	v0_pre_buyer_calls	5	SYSTEM	\N	42	2026-04-24 02:41:51.296909+00
50	55	\N	NOT_READY	v0_pre_buyer_calls	35	SYSTEM	\N	43	2026-04-24 02:57:19.566249+00
51	57	\N	NOT_READY	v0_pre_buyer_calls	35	SYSTEM	\N	44	2026-04-24 03:05:11.428654+00
52	58	\N	NOT_READY	v0_pre_buyer_calls	12	SYSTEM	\N	45	2026-04-24 23:45:46.630572+00
53	60	\N	NOT_READY	v0_pre_buyer_calls	28	SYSTEM	\N	46	2026-04-25 01:08:20.907888+00
54	61	\N	NOT_READY	v0_pre_buyer_calls	32	SYSTEM	\N	47	2026-04-25 01:08:29.185266+00
55	62	\N	NOT_READY	v0_pre_buyer_calls	28	SYSTEM	\N	48	2026-04-25 01:21:10.521621+00
56	63	\N	NOT_READY	v0_pre_buyer_calls	35	SYSTEM	\N	49	2026-04-25 01:22:57.192907+00
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, nombre_completo, whatsapp_number, municipio, vereda, supplier_type, registered_by, status, consent_given, consent_date, created_at, updated_at, department, eligibility_status, commercial_score, sellable_status, graduation_pathway, next_actions, commercial_score_at_onboarding, last_evaluated_at, threshold_version, email) FROM stdin;
57	E2E Test Supplier	3001111188	Test Region	\N	FARMER	Test Officer	ACTIVE	t	2026-04-24 03:05:04.884+00	2026-04-24 03:05:04.895357+00	2026-04-24 03:05:04.895357+00	\N	FAIL	35	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "fitosanitario"]}	\N	2026-04-24 03:05:11.434+00	v0_pre_buyer_calls	\N
3	Test Farmer 2	3001234568	San Gil	\N	FARMER	Test Officer	ACTIVE	t	2026-04-20 03:30:59.349+00	2026-04-20 03:30:59.357334+00	2026-04-20 03:30:59.357334+00	\N	\N	\N	NOT_READY	\N	\N	\N	\N	\N	\N
7	Syed	+57 3166563616	San Gil		FARMER	Babar	ACTIVE	t	2026-04-20 03:45:24.273+00	2026-04-20 03:45:24.283175+00	2026-04-20 03:45:24.283175+00	\N	\N	\N	NOT_READY	\N	\N	\N	\N	\N	\N
9	Syed	+57 3166560000	San Gil		FARMER	Babar	ACTIVE	t	2026-04-20 03:48:23.634+00	2026-04-20 03:48:23.643819+00	2026-04-20 03:48:23.643819+00	\N	\N	\N	NOT_READY	\N	\N	\N	\N	\N	\N
10	Maria Garcia	+57 3009998877	Pitalito	La Esperanza	FARMER	Maria Garcia	ACTIVE	t	2026-04-20 04:11:30.514+00	2026-04-20 04:11:30.529503+00	2026-04-20 04:11:30.529503+00	\N	\N	\N	NOT_READY	\N	\N	\N	\N	\N	\N
12	Maria Lopez	+57 3001112233	San Gil		FARMER	\N	ACTIVE	t	2026-04-20 12:59:07.855+00	2026-04-20 12:59:07.864774+00	2026-04-20 12:59:07.864774+00	\N	\N	\N	NOT_READY	\N	\N	\N	\N	\N	\N
14	Score Test Farm	+57 3111234567	Barichara	\N	FARMER	\N	ACTIVE	t	2026-04-20 13:05:55.469+00	2026-04-20 13:05:55.485425+00	2026-04-20 13:05:55.485425+00	\N	\N	\N	NOT_READY	\N	\N	\N	\N	\N	\N
16	Ricardo	+57 3123637856	San Gil		FARMER	\N	ACTIVE	t	2026-04-20 14:48:47.037+00	2026-04-20 14:48:47.047059+00	2026-04-20 14:48:47.047059+00	Santander	\N	\N	NOT_READY	\N	\N	\N	\N	\N	\N
15	Scoring Test	+57 3222345678	Barichara	\N	FARMER	\N	ACTIVE	t	2026-04-20 13:11:13.719+00	2026-04-20 13:11:13.728896+00	2026-04-20 13:11:13.728896+00	\N	\N	\N	NOT_READY	\N	\N	\N	\N	\N	\N
2	Syed	+57 3166563613	San Gil		FARMER	Babar	ACTIVE	t	2026-04-20 03:28:40.559+00	2026-04-20 03:28:40.567798+00	2026-04-20 03:28:40.567798+00	\N	\N	\N	PUBLISHED	\N	\N	\N	\N	\N	\N
27	QA Validation Farmer	+573008740892	Bogotá	\N	FARMER	\N	ACTIVE	t	2026-04-22 20:19:30.254+00	2026-04-22 20:19:30.264728+00	2026-04-22 20:19:30.264728+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
28	E2E Pipeline Test	+57314299598	Medellín	\N	FARMER	\N	ACTIVE	t	2026-04-22 21:00:31.08+00	2026-04-22 21:00:31.090607+00	2026-04-22 21:00:31.090607+00	Antioquia	\N	\N	\N	\N	\N	\N	\N	\N	\N
29	E2E Pipeline Test v2	+57323917255	Cali	\N	FARMER	\N	ACTIVE	t	2026-04-22 21:01:33.061+00	2026-04-22 21:01:33.071031+00	2026-04-22 21:01:33.071031+00	Valle del Cauca	FAIL	75	NOT_READY	\N	{"pathwaySteps": [], "missingFields": ["rutDian", "icaRegistration", "fitosanitario"]}	\N	2026-04-22 21:01:34.178+00	v0_pre_buyer_calls	\N
30	Constraint Test Supplier	+57335602268	Bogotá	\N	FARMER	\N	ACTIVE	t	2026-04-22 21:06:45.146+00	2026-04-22 21:06:45.164591+00	2026-04-22 21:06:45.164591+00	\N	FAIL	75	NOT_READY	\N	{"pathwaySteps": [], "missingFields": ["rutDian", "icaRegistration", "fitosanitario"]}	\N	2026-04-22 21:06:46.311+00	v0_pre_buyer_calls	\N
31	Idempotent Test	+57333182059	Bogotá	\N	FARMER	\N	ACTIVE	t	2026-04-23 11:48:22.106+00	2026-04-23 11:48:23.154166+00	2026-04-23 11:48:23.154166+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
33	Deploy Test	+57339804836	Medellín	\N	FARMER	\N	ACTIVE	t	2026-04-23 15:19:39.447+00	2026-04-23 15:19:39.457219+00	2026-04-23 15:19:39.457219+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
60	E2E Test Supplier	300884394868	Test Region	\N	FARMER	Test Officer	ACTIVE	t	2026-04-25 01:08:15.328+00	2026-04-25 01:08:15.337734+00	2026-04-25 01:08:15.337734+00	\N	FAIL	28	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "fitosanitario"]}	\N	2026-04-25 01:08:20.913+00	v0_pre_buyer_calls	\N
1	Test Farmer	3001234567	San Gil	\N	FARMER	\N	ACTIVE	t	2026-04-20 03:26:05.053+00	2026-04-20 03:26:05.061895+00	2026-04-20 03:26:05.061895+00	\N	\N	\N	PUBLISHED	\N	\N	\N	\N	\N	\N
35	ICA Sync Test A	573001111001	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-23 18:06:54.98+00	2026-04-23 18:06:54.999871+00	2026-04-23 18:06:54.999871+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
36	ICA Sync Test B	573001111002	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-23 18:06:55.484+00	2026-04-23 18:06:55.485626+00	2026-04-23 18:06:55.485626+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
37	ICA Sync Test C	573001111003	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-23 18:06:55.704+00	2026-04-23 18:06:55.705419+00	2026-04-23 18:06:55.705419+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
39	ICA Fix Test A	573002221001	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-23 23:04:51.748+00	2026-04-23 23:04:51.763019+00	2026-04-23 23:04:51.763019+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
58	Carlos Prueba Email	+57300000TEST	Pitalito	\N	FARMER	\N	ACTIVE	t	2026-04-24 23:45:39.786+00	2026-04-24 23:45:39.787806+00	2026-04-24 23:45:39.787806+00	Huila	FAIL	12	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "icaRegistration", "fitosanitario"]}	\N	2026-04-24 23:45:46.639+00	v0_pre_buyer_calls	carlos.test@example.com
40	ICA Fix Test B	573002221002	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-23 23:04:52.533+00	2026-04-23 23:04:52.533731+00	2026-04-23 23:04:52.533731+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
41	P02 Test Bool True	573009001001	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-23 23:11:39.968+00	2026-04-23 23:11:39.984006+00	2026-04-23 23:11:39.984006+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
42	P02 Test Bool False	573009001002	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-23 23:11:40.261+00	2026-04-23 23:11:40.262427+00	2026-04-23 23:11:40.262427+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
43	P02 Test String Yes	573009001003	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-23 23:11:40.59+00	2026-04-23 23:11:40.590928+00	2026-04-23 23:11:40.590928+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
44	P02 Test String No	573009001004	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-23 23:11:40.818+00	2026-04-23 23:11:40.818612+00	2026-04-23 23:11:40.818612+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
45	P02 Test Omitted	573009001005	Huila	\N	FARMER	\N	ACTIVE	t	2026-04-23 23:11:41.046+00	2026-04-23 23:11:41.047358+00	2026-04-23 23:11:41.047358+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
46	Smoke Test Minimal	+573001110001	Bogota	\N	FARMER	\N	ACTIVE	t	2026-04-24 02:02:47.308+00	2026-04-24 02:02:47.32497+00	2026-04-24 02:02:47.32497+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
47	Smoke Test Full	+573001110002	Medellin	\N	FARMER	\N	ACTIVE	t	2026-04-24 02:02:47.997+00	2026-04-24 02:02:47.998828+00	2026-04-24 02:02:47.998828+00	Antioquia	\N	\N	\N	\N	\N	\N	\N	\N	\N
48	Smoke Test ICA	+573001110003	Cali	\N	FARMER	\N	ACTIVE	t	2026-04-24 02:02:48.176+00	2026-04-24 02:02:48.176804+00	2026-04-24 02:02:48.176804+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
49	Pre-T2 Check	+573001119999	Bucaramanga	\N	FARMER	\N	ACTIVE	t	2026-04-24 02:16:45.775+00	2026-04-24 02:16:45.784833+00	2026-04-24 02:16:45.784833+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
50	E2E Test Supplier	3001111111	Test Region	\N	FARMER	Test Officer	ACTIVE	t	2026-04-24 02:17:40.187+00	2026-04-24 02:17:40.19722+00	2026-04-24 02:17:40.19722+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
51	Pipeline Fix Test	3009990001	Palmira	\N	FARMER	\N	ACTIVE	t	2026-04-24 02:26:56.754+00	2026-04-24 02:26:56.768858+00	2026-04-24 02:26:56.768858+00	\N	FAIL	5	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "fitosanitario"]}	\N	2026-04-24 02:27:03.31+00	v0_pre_buyer_calls	\N
53	E2E Test Supplier	3001111199	Test Region	\N	FARMER	Test Officer	ACTIVE	t	2026-04-24 02:30:14.79+00	2026-04-24 02:30:14.801141+00	2026-04-24 02:30:14.801141+00	\N	FAIL	35	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "fitosanitario"]}	\N	2026-04-24 02:30:19.954+00	v0_pre_buyer_calls	\N
54	Pre-T2 Smoke	3007770001	Bogota	\N	FARMER	\N	ACTIVE	t	2026-04-24 02:41:46.15+00	2026-04-24 02:41:46.160223+00	2026-04-24 02:41:46.160223+00	\N	FAIL	5	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "icaRegistration", "fitosanitario"]}	\N	2026-04-24 02:41:51.301+00	v0_pre_buyer_calls	\N
55	T2 Scoring Test	3008880002	Manizales	\N	FARMER	\N	ACTIVE	t	2026-04-24 02:57:13.763+00	2026-04-24 02:57:13.780288+00	2026-04-24 02:57:13.780288+00	\N	FAIL	35	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "fitosanitario"]}	\N	2026-04-24 02:57:19.572+00	v0_pre_buyer_calls	\N
61	E2E Test Supplier	3001892303	Test Region	\N	FARMER	Test Officer	ACTIVE	t	2026-04-25 01:08:22.48+00	2026-04-25 01:08:22.481458+00	2026-04-25 01:08:22.481458+00	\N	FAIL	32	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "fitosanitario"]}	\N	2026-04-25 01:08:29.189+00	v0_pre_buyer_calls	\N
62	Email Hook Supplier	3007777777	Medellín	\N	FARMER	Test Officer	ACTIVE	t	2026-04-25 01:21:04.607+00	2026-04-25 01:21:04.608816+00	2026-04-25 01:21:04.608816+00	\N	FAIL	28	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "fitosanitario"]}	\N	2026-04-25 01:21:10.527+00	v0_pre_buyer_calls	emailhook@supplier.com
63	Hook Supplier	3007070707	Cali	\N	FARMER	Hook Officer	INACTIVE	t	2026-04-25 01:22:51.055+00	2026-04-25 01:22:51.055976+00	2026-04-25 01:22:51.055976+00	\N	FAIL	35	NOT_READY	D	{"pathwaySteps": ["Complete pathway D requirements"], "missingFields": ["rutDian", "fitosanitario"]}	\N	2026-04-25 01:22:57.198+00	v0_pre_buyer_calls	emailhook_supplier@test.com
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
33	e2everify_suwco-@test.com	$2b$12$LarDWq96sYUVlmK2o5x6L.zrDtYm8GtJ7sc4huY5yIac9sjzl5wK.	BUYER	2026-04-25 01:15:33.175888+00	2026-04-25 01:16:00.305+00
34	e2eunverified_kt9zb_@test.com	$2b$12$GYkXMds6p4MzBwAvSM6J2OhxJnhmV8T6WasNbdSSXFq/mLWLSdvku	BUYER	2026-04-25 01:16:40.716391+00	\N
18	irfan@fincava.com	$2b$12$VVbvib3kBfmQ68v.3dmYe.hmjInsHajwO6yxr/q5UFM3DPfmPNmza	ADMIN	2026-04-20 11:57:11.972019+00	\N
35	e2eadmincreated_test001@test.com	$2b$12$kUWW2fw.fcxJIY06IxdPwO941V1tQ2MC79gSeMP6yIp3W3ljnweK6	SUPPLIER	2026-04-25 01:20:40.919268+00	\N
36	e2etest_hook001@test.com	$2b$12$AuTmOlOacwnNs8k6Q3neS.YLtmlrzcNx.wfHR3Ff6n5cswCvjPtiO	SUPPLIER	2026-04-25 01:22:28.068829+00	\N
22	e2e_batch1@fincava.dev	$2b$12$C9pt/b2UfZEP.7K///3HO.1ihUytA5gexoLg4YpU5tsSBlY64n07e	BUYER	2026-04-24 11:31:07.453928+00	\N
7	info@fincava.com	$2b$12$X824Dr7hhg5ef37tGZmVK.JaNoEEOqK67nanHsrPfTU1nvwYDtbr.	ADMIN	2026-04-14 04:41:33.946046+00	\N
2	maria@cooperativacacao.co	$2b$12$M604IJxih6WFRkiD9ZTmiO.C0c1Tpy.Ggze7lAi8yMSp2QZcgKd7m	SUPPLIER	2024-10-07 13:34:28.678068+00	\N
3	jorge@exportcolombia.co	$2b$12$M604IJxih6WFRkiD9ZTmiO.C0c1Tpy.Ggze7lAi8yMSp2QZcgKd7m	SUPPLIER	2025-04-07 13:34:28.678068+00	\N
4	rosa@santeropremium.co	$2b$12$M604IJxih6WFRkiD9ZTmiO.C0c1Tpy.Ggze7lAi8yMSp2QZcgKd7m	SUPPLIER	2025-10-07 13:34:28.678068+00	\N
5	buyer1@gulf-trade.ae	$2b$12$hQM3461eN7M1M0Y3A.yO8.HazYcRQ1NqxuJmLxUbm2p68FsbAaeBS	BUYER	2025-04-07 13:34:28.678068+00	\N
6	buyer2@chinafoods.cn	$2b$12$hQM3461eN7M1M0Y3A.yO8.HazYcRQ1NqxuJmLxUbm2p68FsbAaeBS	BUYER	2025-08-07 13:34:28.678068+00	\N
1	carlos@cafehuilas.co	$2b$12$fSvu1QYVACo63jcce04j4ekFzxaj5zrpWp44z6ISs066qXHRQg3nG	SUPPLIER	2024-04-07 13:34:28.678068+00	2026-04-25 01:26:12.765373+00
23	sbirfan@yahoo.com	$2b$12$6yAzc3/tDknCxENRqxtvDeWy17a7FqnT.c.NiP89mcPYF4EvAbTXG	BUYER	2026-04-24 13:10:12.604462+00	\N
27	social@fincava.com	$2b$12$8Q3bcZtzEvgp6ZV.InWK3uS8ejFbU/wh6p8osEOkbqTynOc9W3xVK	SUPPLIER	2026-04-24 17:26:26.097418+00	\N
28	buyer@gulf-trade.ae	$2b$12$I.Nda3eBavhTw1OCgRR3sufJIAgQvsg3jESF.oTSNhq7/PIPiip32	BUYER	2026-04-24 17:26:26.433717+00	\N
29	test@test.com	$2b$12$XcmEzriL1nyS08fgw7akHeY6vUQgiv2YnDeWq84OLd5muzi7Wvnze	BUYER	2026-04-24 17:26:26.762143+00	\N
30	e2ebuyer_mf_tgm@test.com	$2b$12$cNdE.XQ7z17NbcjZ2x50C.Lamy.WFodReizljvwPKajXMK.K9CXIS	BUYER	2026-04-25 01:11:07.627779+00	\N
31	e2everify_qaompi@test.com	$2b$12$QEN5stWsGXedGyN07P4JY.QgadfjUFK/Lw/uwlcMwCZYLTm7Tood2	BUYER	2026-04-25 01:15:03.044115+00	\N
32	e2everify_oo7tnb@test.com	$2b$12$8E4k8XpISf5kckrgku5Mcu.dgXefsckqzKfzoDeKwJXl1lXcO50Z.	BUYER	2026-04-25 01:15:15.167884+00	\N
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: postgres
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 2, true);


--
-- Name: ai_outputs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_outputs_id_seq', 48, true);


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

SELECT pg_catalog.setval('public.companies_id_seq', 29, true);


--
-- Name: companies_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.companies_user_id_seq', 1, false);


--
-- Name: compliance_docs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.compliance_docs_id_seq', 55, true);


--
-- Name: compliance_requirements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.compliance_requirements_id_seq', 32, true);


--
-- Name: economics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.economics_id_seq', 39, true);


--
-- Name: email_verification_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_verification_tokens_id_seq', 7, true);


--
-- Name: farms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.farms_id_seq', 47, true);


--
-- Name: inquiries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inquiries_id_seq', 1, true);


--
-- Name: inquiries_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inquiries_product_id_seq', 1, false);


--
-- Name: interactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.interactions_id_seq', 39, true);


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
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, true);


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

SELECT pg_catalog.setval('public.orders_id_seq', 1, true);


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

SELECT pg_catalog.setval('public.profiles_id_seq', 36, true);


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

SELECT pg_catalog.setval('public.supplier_evaluations_id_seq', 49, true);


--
-- Name: supplier_state_transitions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supplier_state_transitions_id_seq', 56, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 63, true);


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

SELECT pg_catalog.setval('public.users_id_seq', 36, true);


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
-- Name: interactions_supplier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX interactions_supplier_idx ON public.interactions USING btree (supplier_id);


--
-- Name: supplier_evaluations_supplier_evaluated_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX supplier_evaluations_supplier_evaluated_idx ON public.supplier_evaluations USING btree (supplier_id, evaluated_at DESC NULLS LAST);


--
-- Name: supplier_state_transitions_supplier_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX supplier_state_transitions_supplier_created_idx ON public.supplier_state_transitions USING btree (supplier_id, created_at DESC NULLS LAST);


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
-- Name: rfq_responses rfq_responses_rfq_id_rfqs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfq_responses
    ADD CONSTRAINT rfq_responses_rfq_id_rfqs_id_fk FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id);


--
-- Name: rfq_responses rfq_responses_supplier_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfq_responses
    ADD CONSTRAINT rfq_responses_supplier_id_companies_id_fk FOREIGN KEY (supplier_id) REFERENCES public.companies(id);


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

\unrestrict JtABcKKlxkdadrDeviWXm9IJddcolTuhVnqXroX7uUS1ZFTbPY0Mp1ObFZXde2Q

