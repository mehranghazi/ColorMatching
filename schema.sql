--
-- PostgreSQL database dump
--
-- Dumped from database version 16.14 (Homebrew)
-- Dumped by pg_dump version 16.14 (Homebrew)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: combination_member; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.combination_member (
    id integer NOT NULL,
    combination_id integer,
    dye_id integer,
    slot_index integer NOT NULL
);


--
-- Name: combination_member_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.combination_member_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: combination_member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.combination_member_id_seq OWNED BY public.combination_member.id;


--
-- Name: dye; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dye (
    id integer NOT NULL,
    fiber_type_id integer,
    trade_name character varying(100) NOT NULL,
    ci_number character varying(50),
    manufacturer character varying(100),
    dye_class character varying(50)
);


--
-- Name: dye_combination; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dye_combination (
    id integer NOT NULL,
    fiber_type_id integer,
    combo_type integer NOT NULL,
    name character varying(100),
    CONSTRAINT dye_combination_combo_type_check CHECK ((combo_type = ANY (ARRAY[2, 3])))
);


--
-- Name: dye_combination_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dye_combination_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dye_combination_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dye_combination_id_seq OWNED BY public.dye_combination.id;


--
-- Name: dye_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dye_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dye_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dye_id_seq OWNED BY public.dye.id;


--
-- Name: dye_reflectance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dye_reflectance (
    id integer NOT NULL,
    dye_id integer,
    concentration double precision NOT NULL,
    wavelength_nm integer NOT NULL,
    reflectance double precision NOT NULL
);


--
-- Name: dye_reflectance_full; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dye_reflectance_full (
    id integer NOT NULL,
    dye_id integer,
    concentration double precision NOT NULL,
    wavelength_nm integer NOT NULL,
    reflectance double precision NOT NULL
);


--
-- Name: dye_reflectance_full_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dye_reflectance_full_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dye_reflectance_full_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dye_reflectance_full_id_seq OWNED BY public.dye_reflectance_full.id;


--
-- Name: dye_reflectance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dye_reflectance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dye_reflectance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dye_reflectance_id_seq OWNED BY public.dye_reflectance.id;


--
-- Name: fiber_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiber_type (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text
);


--
-- Name: fiber_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fiber_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fiber_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fiber_type_id_seq OWNED BY public.fiber_type.id;


--
-- Name: illuminant_observer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.illuminant_observer (
    id integer NOT NULL,
    illuminant_name character varying(20) NOT NULL,
    observer_deg integer NOT NULL,
    wavelength_nm integer NOT NULL,
    d65_value double precision,
    x_bar double precision,
    y_bar double precision,
    z_bar double precision
);


--
-- Name: illuminant_observer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.illuminant_observer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: illuminant_observer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.illuminant_observer_id_seq OWNED BY public.illuminant_observer.id;


--
-- Name: ks_value; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ks_value (
    id integer NOT NULL,
    dye_id integer,
    concentration double precision NOT NULL,
    wavelength_nm integer NOT NULL,
    ks double precision NOT NULL
);


--
-- Name: ks_value_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ks_value_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ks_value_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ks_value_id_seq OWNED BY public.ks_value.id;


--
-- Name: lut_entry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lut_entry (
    id integer NOT NULL,
    combination_id integer,
    conc_1 double precision NOT NULL,
    conc_2 double precision NOT NULL,
    conc_3 double precision,
    x double precision,
    y double precision,
    z double precision,
    l_star double precision,
    a_star double precision,
    b_star double precision,
    sr double precision,
    sg double precision,
    sb double precision
);


--
-- Name: lut_entry_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lut_entry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lut_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lut_entry_id_seq OWNED BY public.lut_entry.id;


--
-- Name: matching_session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matching_session (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    method_used character varying(50),
    combo_type integer,
    combination_id integer,
    input_r double precision,
    input_g double precision,
    input_b double precision,
    input_x double precision,
    input_y double precision,
    input_z double precision,
    query_l double precision,
    query_a double precision,
    query_b double precision,
    delta_e_real double precision,
    inside_gamut boolean,
    result_json jsonb
);


--
-- Name: matching_session_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matching_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matching_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.matching_session_id_seq OWNED BY public.matching_session.id;


--
-- Name: munsell_reflectance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.munsell_reflectance (
    id integer NOT NULL,
    sample_index integer NOT NULL,
    wavelength_nm integer NOT NULL,
    reflectance double precision NOT NULL
);


--
-- Name: munsell_reflectance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.munsell_reflectance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: munsell_reflectance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.munsell_reflectance_id_seq OWNED BY public.munsell_reflectance.id;


--
-- Name: substrate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.substrate (
    id integer NOT NULL,
    fiber_type_id integer,
    wavelength_nm integer NOT NULL,
    reflectance double precision NOT NULL,
    ks double precision NOT NULL
);


--
-- Name: substrate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.substrate_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: substrate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.substrate_id_seq OWNED BY public.substrate.id;


--
-- Name: target_sample; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.target_sample (
    id integer NOT NULL,
    name character varying(100),
    sample_type character varying(20),
    wavelength_nm integer,
    reflectance double precision,
    CONSTRAINT target_sample_sample_type_check CHECK (((sample_type)::text = ANY ((ARRAY['real'::character varying, 'virtual'::character varying, 'imaged'::character varying])::text[])))
);


--
-- Name: target_sample_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.target_sample_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: target_sample_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.target_sample_id_seq OWNED BY public.target_sample.id;


--
-- Name: combination_member id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.combination_member ALTER COLUMN id SET DEFAULT nextval('public.combination_member_id_seq'::regclass);


--
-- Name: dye id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dye ALTER COLUMN id SET DEFAULT nextval('public.dye_id_seq'::regclass);


--
-- Name: dye_combination id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dye_combination ALTER COLUMN id SET DEFAULT nextval('public.dye_combination_id_seq'::regclass);


--
-- Name: dye_reflectance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dye_reflectance ALTER COLUMN id SET DEFAULT nextval('public.dye_reflectance_id_seq'::regclass);


--
-- Name: dye_reflectance_full id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dye_reflectance_full ALTER COLUMN id SET DEFAULT nextval('public.dye_reflectance_full_id_seq'::regclass);


--
-- Name: fiber_type id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiber_type ALTER COLUMN id SET DEFAULT nextval('public.fiber_type_id_seq'::regclass);


--
-- Name: illuminant_observer id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.illuminant_observer ALTER COLUMN id SET DEFAULT nextval('public.illuminant_observer_id_seq'::regclass);


--
-- Name: ks_value id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ks_value ALTER COLUMN id SET DEFAULT nextval('public.ks_value_id_seq'::regclass);


--
-- Name: lut_entry id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lut_entry ALTER COLUMN id SET DEFAULT nextval('public.lut_entry_id_seq'::regclass);


--
-- Name: matching_session id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matching_session ALTER COLUMN id SET DEFAULT nextval('public.matching_session_id_seq'::regclass);


--
-- Name: munsell_reflectance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.munsell_reflectance ALTER COLUMN id SET DEFAULT nextval('public.munsell_reflectance_id_seq'::regclass);


--
-- Name: substrate id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.substrate ALTER COLUMN id SET DEFAULT nextval('public.substrate_id_seq'::regclass);


--
-- Name: target_sample id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_sample ALTER COLUMN id SET DEFAULT nextval('public.target_sample_id_seq'::regclass);
