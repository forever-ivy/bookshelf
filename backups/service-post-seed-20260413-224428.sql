--
-- PostgreSQL database dump
--

\restrict gqpELBqJTzrNku5LJLl7ayRI6goYTFj22noaqcecUDK0FNScHsHVPpwRJNzrEdH

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg12+1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: library
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO library;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: library
--

COMMENT ON SCHEMA public IS '';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_accounts; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.admin_accounts (
    id integer NOT NULL,
    username character varying(64) NOT NULL,
    password_hash character varying(128) NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.admin_accounts OWNER TO library;

--
-- Name: admin_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.admin_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_accounts_id_seq OWNER TO library;

--
-- Name: admin_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.admin_accounts_id_seq OWNED BY public.admin_accounts.id;


--
-- Name: admin_action_logs; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.admin_action_logs (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    target_type character varying(64) NOT NULL,
    target_id integer NOT NULL,
    action character varying(64) NOT NULL,
    before_state jsonb,
    after_state jsonb,
    note text,
    created_at timestamp without time zone
);


ALTER TABLE public.admin_action_logs OWNER TO library;

--
-- Name: admin_action_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.admin_action_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_action_logs_id_seq OWNER TO library;

--
-- Name: admin_action_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.admin_action_logs_id_seq OWNED BY public.admin_action_logs.id;


--
-- Name: admin_permissions; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.admin_permissions (
    id integer NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    created_at timestamp without time zone
);


ALTER TABLE public.admin_permissions OWNER TO library;

--
-- Name: admin_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.admin_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_permissions_id_seq OWNER TO library;

--
-- Name: admin_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.admin_permissions_id_seq OWNED BY public.admin_permissions.id;


--
-- Name: admin_role_assignments; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.admin_role_assignments (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    role_id integer NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.admin_role_assignments OWNER TO library;

--
-- Name: admin_role_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.admin_role_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_role_assignments_id_seq OWNER TO library;

--
-- Name: admin_role_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.admin_role_assignments_id_seq OWNED BY public.admin_role_assignments.id;


--
-- Name: admin_role_permissions; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.admin_role_permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.admin_role_permissions OWNER TO library;

--
-- Name: admin_role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.admin_role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_role_permissions_id_seq OWNER TO library;

--
-- Name: admin_role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.admin_role_permissions_id_seq OWNED BY public.admin_role_permissions.id;


--
-- Name: admin_roles; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.admin_roles (
    id integer NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.admin_roles OWNER TO library;

--
-- Name: admin_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.admin_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_roles_id_seq OWNER TO library;

--
-- Name: admin_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.admin_roles_id_seq OWNED BY public.admin_roles.id;


--
-- Name: alert_records; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.alert_records (
    id integer NOT NULL,
    source_type character varying(64) NOT NULL,
    source_id character varying(128),
    alert_type character varying(64) NOT NULL,
    severity character varying(32) NOT NULL,
    status character varying(32) NOT NULL,
    title character varying(255) NOT NULL,
    message text,
    metadata_json jsonb,
    acknowledged_by integer,
    acknowledged_at timestamp without time zone,
    resolved_by integer,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.alert_records OWNER TO library;

--
-- Name: alert_records_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.alert_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alert_records_id_seq OWNER TO library;

--
-- Name: alert_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.alert_records_id_seq OWNED BY public.alert_records.id;


--
-- Name: book_categories; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.book_categories (
    id integer NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    status character varying(32) NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.book_categories OWNER TO library;

--
-- Name: book_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.book_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.book_categories_id_seq OWNER TO library;

--
-- Name: book_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.book_categories_id_seq OWNED BY public.book_categories.id;


--
-- Name: book_copies; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.book_copies (
    id integer NOT NULL,
    book_id integer NOT NULL,
    cabinet_id character varying(64) NOT NULL,
    inventory_status character varying(32) NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.book_copies OWNER TO library;

--
-- Name: book_copies_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.book_copies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.book_copies_id_seq OWNER TO library;

--
-- Name: book_copies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.book_copies_id_seq OWNED BY public.book_copies.id;


--
-- Name: book_stock; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.book_stock (
    id integer NOT NULL,
    book_id integer NOT NULL,
    cabinet_id character varying(64) NOT NULL,
    total_copies integer NOT NULL,
    available_copies integer NOT NULL,
    reserved_copies integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    CONSTRAINT ck_book_stock_available_non_negative CHECK ((available_copies >= 0)),
    CONSTRAINT ck_book_stock_counts_consistent CHECK (((available_copies + reserved_copies) <= total_copies)),
    CONSTRAINT ck_book_stock_reserved_non_negative CHECK ((reserved_copies >= 0)),
    CONSTRAINT ck_book_stock_total_non_negative CHECK ((total_copies >= 0))
);


ALTER TABLE public.book_stock OWNER TO library;

--
-- Name: book_stock_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.book_stock_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.book_stock_id_seq OWNER TO library;

--
-- Name: book_stock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.book_stock_id_seq OWNED BY public.book_stock.id;


--
-- Name: book_tag_links; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.book_tag_links (
    id integer NOT NULL,
    book_id integer NOT NULL,
    tag_id integer NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.book_tag_links OWNER TO library;

--
-- Name: book_tag_links_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.book_tag_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.book_tag_links_id_seq OWNER TO library;

--
-- Name: book_tag_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.book_tag_links_id_seq OWNED BY public.book_tag_links.id;


--
-- Name: book_tags; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.book_tags (
    id integer NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.book_tags OWNER TO library;

--
-- Name: book_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.book_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.book_tags_id_seq OWNER TO library;

--
-- Name: book_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.book_tags_id_seq OWNED BY public.book_tags.id;


--
-- Name: books; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.books (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    author character varying(255),
    category_id integer,
    category character varying(128),
    isbn character varying(32),
    barcode character varying(64),
    cover_url character varying(512),
    keywords text,
    summary text,
    shelf_status character varying(32),
    embedding public.vector(1536),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.books OWNER TO library;

--
-- Name: books_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.books_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.books_id_seq OWNER TO library;

--
-- Name: books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.books_id_seq OWNED BY public.books.id;


--
-- Name: borrow_orders; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.borrow_orders (
    id integer NOT NULL,
    reader_id integer NOT NULL,
    book_id integer NOT NULL,
    assigned_copy_id integer,
    order_mode character varying(32) NOT NULL,
    status character varying(64) NOT NULL,
    priority character varying(32),
    due_at timestamp without time zone,
    failure_reason character varying(255),
    intervention_status character varying(64),
    attempt_count integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    picked_at timestamp without time zone,
    delivered_at timestamp without time zone,
    completed_at timestamp without time zone
);


ALTER TABLE public.borrow_orders OWNER TO library;

--
-- Name: borrow_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.borrow_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.borrow_orders_id_seq OWNER TO library;

--
-- Name: borrow_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.borrow_orders_id_seq OWNED BY public.borrow_orders.id;


--
-- Name: cabinet_slots; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.cabinet_slots (
    id integer NOT NULL,
    cabinet_id character varying(64) NOT NULL,
    slot_code character varying(64) NOT NULL,
    status character varying(32) NOT NULL,
    current_copy_id integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.cabinet_slots OWNER TO library;

--
-- Name: cabinet_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.cabinet_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cabinet_slots_id_seq OWNER TO library;

--
-- Name: cabinet_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.cabinet_slots_id_seq OWNED BY public.cabinet_slots.id;


--
-- Name: cabinets; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.cabinets (
    id character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    location character varying(255),
    status character varying(32) NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.cabinets OWNER TO library;

--
-- Name: conversation_messages; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.conversation_messages (
    id integer NOT NULL,
    session_id integer NOT NULL,
    role character varying(32) NOT NULL,
    content text NOT NULL,
    metadata_json jsonb,
    created_at timestamp without time zone
);


ALTER TABLE public.conversation_messages OWNER TO library;

--
-- Name: conversation_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.conversation_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversation_messages_id_seq OWNER TO library;

--
-- Name: conversation_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.conversation_messages_id_seq OWNED BY public.conversation_messages.id;


--
-- Name: conversation_sessions; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.conversation_sessions (
    id integer NOT NULL,
    reader_id integer,
    status character varying(32) NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.conversation_sessions OWNER TO library;

--
-- Name: conversation_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.conversation_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversation_sessions_id_seq OWNER TO library;

--
-- Name: conversation_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.conversation_sessions_id_seq OWNED BY public.conversation_sessions.id;


--
-- Name: delivery_orders; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.delivery_orders (
    id integer NOT NULL,
    borrow_order_id integer NOT NULL,
    delivery_target character varying(255) NOT NULL,
    eta_minutes integer NOT NULL,
    status character varying(64) NOT NULL,
    priority character varying(32),
    due_at timestamp without time zone,
    failure_reason character varying(255),
    intervention_status character varying(64),
    attempt_count integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    completed_at timestamp without time zone
);


ALTER TABLE public.delivery_orders OWNER TO library;

--
-- Name: delivery_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.delivery_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delivery_orders_id_seq OWNER TO library;

--
-- Name: delivery_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.delivery_orders_id_seq OWNED BY public.delivery_orders.id;


--
-- Name: dismissed_notifications; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.dismissed_notifications (
    id integer NOT NULL,
    reader_id integer NOT NULL,
    notification_id character varying(128) NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.dismissed_notifications OWNER TO library;

--
-- Name: dismissed_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.dismissed_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dismissed_notifications_id_seq OWNER TO library;

--
-- Name: dismissed_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.dismissed_notifications_id_seq OWNED BY public.dismissed_notifications.id;


--
-- Name: favorite_books; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.favorite_books (
    id integer NOT NULL,
    reader_id integer NOT NULL,
    book_id integer NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.favorite_books OWNER TO library;

--
-- Name: favorite_books_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.favorite_books_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.favorite_books_id_seq OWNER TO library;

--
-- Name: favorite_books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.favorite_books_id_seq OWNED BY public.favorite_books.id;


--
-- Name: inventory_events; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.inventory_events (
    id integer NOT NULL,
    cabinet_id character varying(64) NOT NULL,
    event_type character varying(64) NOT NULL,
    slot_code character varying(64),
    book_id integer,
    copy_id integer,
    payload_json jsonb,
    created_at timestamp without time zone
);


ALTER TABLE public.inventory_events OWNER TO library;

--
-- Name: inventory_events_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.inventory_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_events_id_seq OWNER TO library;

--
-- Name: inventory_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.inventory_events_id_seq OWNED BY public.inventory_events.id;


--
-- Name: reader_accounts; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.reader_accounts (
    id integer NOT NULL,
    username character varying(64) NOT NULL,
    password_hash character varying(128) NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.reader_accounts OWNER TO library;

--
-- Name: reader_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.reader_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reader_accounts_id_seq OWNER TO library;

--
-- Name: reader_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.reader_accounts_id_seq OWNED BY public.reader_accounts.id;


--
-- Name: reader_booklist_items; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.reader_booklist_items (
    id integer NOT NULL,
    booklist_id integer NOT NULL,
    book_id integer NOT NULL,
    rank_position integer NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.reader_booklist_items OWNER TO library;

--
-- Name: reader_booklist_items_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.reader_booklist_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reader_booklist_items_id_seq OWNER TO library;

--
-- Name: reader_booklist_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.reader_booklist_items_id_seq OWNED BY public.reader_booklist_items.id;


--
-- Name: reader_booklists; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.reader_booklists (
    id integer NOT NULL,
    reader_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.reader_booklists OWNER TO library;

--
-- Name: reader_booklists_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.reader_booklists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reader_booklists_id_seq OWNER TO library;

--
-- Name: reader_booklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.reader_booklists_id_seq OWNED BY public.reader_booklists.id;


--
-- Name: reader_profiles; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.reader_profiles (
    id integer NOT NULL,
    account_id integer NOT NULL,
    display_name character varying(128) NOT NULL,
    affiliation_type character varying(32),
    college character varying(128),
    major character varying(128),
    grade_year character varying(32),
    interest_tags jsonb,
    reading_profile_summary text,
    restriction_status character varying(32),
    restriction_until timestamp with time zone,
    risk_flags jsonb,
    preference_profile_json jsonb,
    segment_code character varying(64),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.reader_profiles OWNER TO library;

--
-- Name: reader_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.reader_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reader_profiles_id_seq OWNER TO library;

--
-- Name: reader_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.reader_profiles_id_seq OWNED BY public.reader_profiles.id;


--
-- Name: reading_events; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.reading_events (
    id integer NOT NULL,
    reader_id integer,
    event_type character varying(64) NOT NULL,
    metadata_json jsonb,
    created_at timestamp without time zone
);


ALTER TABLE public.reading_events OWNER TO library;

--
-- Name: reading_events_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.reading_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reading_events_id_seq OWNER TO library;

--
-- Name: reading_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.reading_events_id_seq OWNED BY public.reading_events.id;


--
-- Name: recommendation_logs; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.recommendation_logs (
    id integer NOT NULL,
    reader_id integer,
    book_id integer,
    query_text text NOT NULL,
    result_title character varying(255) NOT NULL,
    rank_position integer NOT NULL,
    score double precision NOT NULL,
    provider_note character varying(32) NOT NULL,
    explanation text,
    evidence_json jsonb,
    created_at timestamp without time zone
);


ALTER TABLE public.recommendation_logs OWNER TO library;

--
-- Name: recommendation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.recommendation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recommendation_logs_id_seq OWNER TO library;

--
-- Name: recommendation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.recommendation_logs_id_seq OWNED BY public.recommendation_logs.id;


--
-- Name: recommendation_placements; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.recommendation_placements (
    id integer NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    status character varying(32) NOT NULL,
    placement_type character varying(64) NOT NULL,
    config_json jsonb,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.recommendation_placements OWNER TO library;

--
-- Name: recommendation_placements_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.recommendation_placements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recommendation_placements_id_seq OWNER TO library;

--
-- Name: recommendation_placements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.recommendation_placements_id_seq OWNED BY public.recommendation_placements.id;


--
-- Name: recommendation_studio_publications; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.recommendation_studio_publications (
    id integer NOT NULL,
    version integer,
    status character varying(32) NOT NULL,
    payload_json jsonb,
    published_by integer,
    published_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.recommendation_studio_publications OWNER TO library;

--
-- Name: recommendation_studio_publications_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.recommendation_studio_publications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recommendation_studio_publications_id_seq OWNER TO library;

--
-- Name: recommendation_studio_publications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.recommendation_studio_publications_id_seq OWNED BY public.recommendation_studio_publications.id;


--
-- Name: return_requests; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.return_requests (
    id integer NOT NULL,
    borrow_order_id integer NOT NULL,
    note character varying(255),
    status character varying(64) NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.return_requests OWNER TO library;

--
-- Name: return_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.return_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.return_requests_id_seq OWNER TO library;

--
-- Name: return_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.return_requests_id_seq OWNED BY public.return_requests.id;


--
-- Name: robot_status_events; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.robot_status_events (
    id integer NOT NULL,
    robot_id integer NOT NULL,
    task_id integer,
    event_type character varying(64) NOT NULL,
    metadata_json jsonb,
    created_at timestamp without time zone
);


ALTER TABLE public.robot_status_events OWNER TO library;

--
-- Name: robot_status_events_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.robot_status_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.robot_status_events_id_seq OWNER TO library;

--
-- Name: robot_status_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.robot_status_events_id_seq OWNED BY public.robot_status_events.id;


--
-- Name: robot_tasks; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.robot_tasks (
    id integer NOT NULL,
    robot_id integer NOT NULL,
    delivery_order_id integer NOT NULL,
    status character varying(64) NOT NULL,
    path_json jsonb,
    reassigned_from_task_id integer,
    failure_reason character varying(255),
    attempt_count integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    completed_at timestamp without time zone
);


ALTER TABLE public.robot_tasks OWNER TO library;

--
-- Name: robot_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.robot_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.robot_tasks_id_seq OWNER TO library;

--
-- Name: robot_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.robot_tasks_id_seq OWNED BY public.robot_tasks.id;


--
-- Name: robot_units; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.robot_units (
    id integer NOT NULL,
    code character varying(64) NOT NULL,
    status character varying(64) NOT NULL,
    battery_level integer,
    heartbeat_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.robot_units OWNER TO library;

--
-- Name: robot_units_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.robot_units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.robot_units_id_seq OWNER TO library;

--
-- Name: robot_units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.robot_units_id_seq OWNED BY public.robot_units.id;


--
-- Name: search_logs; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.search_logs (
    id integer NOT NULL,
    reader_id integer,
    query_text character varying(512) NOT NULL,
    query_mode character varying(32) NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.search_logs OWNER TO library;

--
-- Name: search_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.search_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.search_logs_id_seq OWNER TO library;

--
-- Name: search_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.search_logs_id_seq OWNED BY public.search_logs.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    setting_key character varying(128) NOT NULL,
    value_type character varying(32) NOT NULL,
    value_json jsonb,
    description text,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.system_settings OWNER TO library;

--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_id_seq OWNER TO library;

--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: topic_booklist_items; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.topic_booklist_items (
    id integer NOT NULL,
    topic_booklist_id integer NOT NULL,
    book_id integer NOT NULL,
    rank_position integer NOT NULL,
    note text,
    created_at timestamp without time zone
);


ALTER TABLE public.topic_booklist_items OWNER TO library;

--
-- Name: topic_booklist_items_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.topic_booklist_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.topic_booklist_items_id_seq OWNER TO library;

--
-- Name: topic_booklist_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.topic_booklist_items_id_seq OWNED BY public.topic_booklist_items.id;


--
-- Name: topic_booklists; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.topic_booklists (
    id integer NOT NULL,
    slug character varying(128) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(32) NOT NULL,
    audience_segment character varying(64),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.topic_booklists OWNER TO library;

--
-- Name: topic_booklists_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.topic_booklists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.topic_booklists_id_seq OWNER TO library;

--
-- Name: topic_booklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.topic_booklists_id_seq OWNED BY public.topic_booklists.id;


--
-- Name: tutor_document_chunks; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.tutor_document_chunks (
    id integer NOT NULL,
    profile_id integer NOT NULL,
    document_id integer NOT NULL,
    chunk_index integer NOT NULL,
    content text NOT NULL,
    content_tsv text,
    embedding public.vector(1536),
    metadata_json jsonb,
    created_at timestamp without time zone
);


ALTER TABLE public.tutor_document_chunks OWNER TO library;

--
-- Name: tutor_document_chunks_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.tutor_document_chunks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tutor_document_chunks_id_seq OWNER TO library;

--
-- Name: tutor_document_chunks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.tutor_document_chunks_id_seq OWNED BY public.tutor_document_chunks.id;


--
-- Name: tutor_generation_jobs; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.tutor_generation_jobs (
    id integer NOT NULL,
    profile_id integer NOT NULL,
    job_type character varying(64) NOT NULL,
    status character varying(32) NOT NULL,
    attempt_count integer NOT NULL,
    payload_json jsonb,
    error_message text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.tutor_generation_jobs OWNER TO library;

--
-- Name: tutor_generation_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.tutor_generation_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tutor_generation_jobs_id_seq OWNER TO library;

--
-- Name: tutor_generation_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.tutor_generation_jobs_id_seq OWNED BY public.tutor_generation_jobs.id;


--
-- Name: tutor_profiles; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.tutor_profiles (
    id integer NOT NULL,
    reader_id integer NOT NULL,
    source_type character varying(32) NOT NULL,
    book_id integer,
    title character varying(255) NOT NULL,
    teaching_goal text,
    status character varying(32) NOT NULL,
    persona_json jsonb,
    curriculum_json jsonb,
    source_summary text,
    failure_code character varying(64),
    failure_message text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.tutor_profiles OWNER TO library;

--
-- Name: tutor_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.tutor_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tutor_profiles_id_seq OWNER TO library;

--
-- Name: tutor_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.tutor_profiles_id_seq OWNED BY public.tutor_profiles.id;


--
-- Name: tutor_session_messages; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.tutor_session_messages (
    id integer NOT NULL,
    session_id integer NOT NULL,
    role character varying(32) NOT NULL,
    content text NOT NULL,
    citations_json jsonb,
    metadata_json jsonb,
    created_at timestamp without time zone
);


ALTER TABLE public.tutor_session_messages OWNER TO library;

--
-- Name: tutor_session_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.tutor_session_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tutor_session_messages_id_seq OWNER TO library;

--
-- Name: tutor_session_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.tutor_session_messages_id_seq OWNED BY public.tutor_session_messages.id;


--
-- Name: tutor_sessions; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.tutor_sessions (
    id integer NOT NULL,
    profile_id integer NOT NULL,
    reader_id integer NOT NULL,
    status character varying(32) NOT NULL,
    current_step_index integer NOT NULL,
    current_step_title character varying(255),
    completed_steps_count integer NOT NULL,
    last_message_preview text,
    started_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.tutor_sessions OWNER TO library;

--
-- Name: tutor_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.tutor_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tutor_sessions_id_seq OWNER TO library;

--
-- Name: tutor_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.tutor_sessions_id_seq OWNED BY public.tutor_sessions.id;


--
-- Name: tutor_source_documents; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.tutor_source_documents (
    id integer NOT NULL,
    profile_id integer NOT NULL,
    reader_id integer NOT NULL,
    kind character varying(32) NOT NULL,
    mime_type character varying(128),
    file_name character varying(255),
    storage_path character varying(1024),
    extracted_text_path character varying(1024),
    parse_status character varying(32) NOT NULL,
    content_hash character varying(128),
    metadata_json jsonb,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.tutor_source_documents OWNER TO library;

--
-- Name: tutor_source_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.tutor_source_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tutor_source_documents_id_seq OWNER TO library;

--
-- Name: tutor_source_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.tutor_source_documents_id_seq OWNED BY public.tutor_source_documents.id;


--
-- Name: tutor_step_completions; Type: TABLE; Schema: public; Owner: library
--

CREATE TABLE public.tutor_step_completions (
    id integer NOT NULL,
    session_id integer NOT NULL,
    step_index integer NOT NULL,
    confidence double precision NOT NULL,
    reasoning text,
    message_id integer,
    completed_at timestamp without time zone
);


ALTER TABLE public.tutor_step_completions OWNER TO library;

--
-- Name: tutor_step_completions_id_seq; Type: SEQUENCE; Schema: public; Owner: library
--

CREATE SEQUENCE public.tutor_step_completions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tutor_step_completions_id_seq OWNER TO library;

--
-- Name: tutor_step_completions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: library
--

ALTER SEQUENCE public.tutor_step_completions_id_seq OWNED BY public.tutor_step_completions.id;


--
-- Name: admin_accounts id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_accounts ALTER COLUMN id SET DEFAULT nextval('public.admin_accounts_id_seq'::regclass);


--
-- Name: admin_action_logs id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_action_logs ALTER COLUMN id SET DEFAULT nextval('public.admin_action_logs_id_seq'::regclass);


--
-- Name: admin_permissions id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_permissions ALTER COLUMN id SET DEFAULT nextval('public.admin_permissions_id_seq'::regclass);


--
-- Name: admin_role_assignments id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_role_assignments ALTER COLUMN id SET DEFAULT nextval('public.admin_role_assignments_id_seq'::regclass);


--
-- Name: admin_role_permissions id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_role_permissions ALTER COLUMN id SET DEFAULT nextval('public.admin_role_permissions_id_seq'::regclass);


--
-- Name: admin_roles id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_roles ALTER COLUMN id SET DEFAULT nextval('public.admin_roles_id_seq'::regclass);


--
-- Name: alert_records id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.alert_records ALTER COLUMN id SET DEFAULT nextval('public.alert_records_id_seq'::regclass);


--
-- Name: book_categories id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_categories ALTER COLUMN id SET DEFAULT nextval('public.book_categories_id_seq'::regclass);


--
-- Name: book_copies id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_copies ALTER COLUMN id SET DEFAULT nextval('public.book_copies_id_seq'::regclass);


--
-- Name: book_stock id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_stock ALTER COLUMN id SET DEFAULT nextval('public.book_stock_id_seq'::regclass);


--
-- Name: book_tag_links id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_tag_links ALTER COLUMN id SET DEFAULT nextval('public.book_tag_links_id_seq'::regclass);


--
-- Name: book_tags id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_tags ALTER COLUMN id SET DEFAULT nextval('public.book_tags_id_seq'::regclass);


--
-- Name: books id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.books ALTER COLUMN id SET DEFAULT nextval('public.books_id_seq'::regclass);


--
-- Name: borrow_orders id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.borrow_orders ALTER COLUMN id SET DEFAULT nextval('public.borrow_orders_id_seq'::regclass);


--
-- Name: cabinet_slots id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.cabinet_slots ALTER COLUMN id SET DEFAULT nextval('public.cabinet_slots_id_seq'::regclass);


--
-- Name: conversation_messages id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.conversation_messages ALTER COLUMN id SET DEFAULT nextval('public.conversation_messages_id_seq'::regclass);


--
-- Name: conversation_sessions id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.conversation_sessions ALTER COLUMN id SET DEFAULT nextval('public.conversation_sessions_id_seq'::regclass);


--
-- Name: delivery_orders id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.delivery_orders ALTER COLUMN id SET DEFAULT nextval('public.delivery_orders_id_seq'::regclass);


--
-- Name: dismissed_notifications id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.dismissed_notifications ALTER COLUMN id SET DEFAULT nextval('public.dismissed_notifications_id_seq'::regclass);


--
-- Name: favorite_books id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.favorite_books ALTER COLUMN id SET DEFAULT nextval('public.favorite_books_id_seq'::regclass);


--
-- Name: inventory_events id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.inventory_events ALTER COLUMN id SET DEFAULT nextval('public.inventory_events_id_seq'::regclass);


--
-- Name: reader_accounts id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reader_accounts ALTER COLUMN id SET DEFAULT nextval('public.reader_accounts_id_seq'::regclass);


--
-- Name: reader_booklist_items id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reader_booklist_items ALTER COLUMN id SET DEFAULT nextval('public.reader_booklist_items_id_seq'::regclass);


--
-- Name: reader_booklists id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reader_booklists ALTER COLUMN id SET DEFAULT nextval('public.reader_booklists_id_seq'::regclass);


--
-- Name: reader_profiles id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reader_profiles ALTER COLUMN id SET DEFAULT nextval('public.reader_profiles_id_seq'::regclass);


--
-- Name: reading_events id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reading_events ALTER COLUMN id SET DEFAULT nextval('public.reading_events_id_seq'::regclass);


--
-- Name: recommendation_logs id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.recommendation_logs ALTER COLUMN id SET DEFAULT nextval('public.recommendation_logs_id_seq'::regclass);


--
-- Name: recommendation_placements id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.recommendation_placements ALTER COLUMN id SET DEFAULT nextval('public.recommendation_placements_id_seq'::regclass);


--
-- Name: recommendation_studio_publications id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.recommendation_studio_publications ALTER COLUMN id SET DEFAULT nextval('public.recommendation_studio_publications_id_seq'::regclass);


--
-- Name: return_requests id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.return_requests ALTER COLUMN id SET DEFAULT nextval('public.return_requests_id_seq'::regclass);


--
-- Name: robot_status_events id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.robot_status_events ALTER COLUMN id SET DEFAULT nextval('public.robot_status_events_id_seq'::regclass);


--
-- Name: robot_tasks id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.robot_tasks ALTER COLUMN id SET DEFAULT nextval('public.robot_tasks_id_seq'::regclass);


--
-- Name: robot_units id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.robot_units ALTER COLUMN id SET DEFAULT nextval('public.robot_units_id_seq'::regclass);


--
-- Name: search_logs id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.search_logs ALTER COLUMN id SET DEFAULT nextval('public.search_logs_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: topic_booklist_items id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.topic_booklist_items ALTER COLUMN id SET DEFAULT nextval('public.topic_booklist_items_id_seq'::regclass);


--
-- Name: topic_booklists id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.topic_booklists ALTER COLUMN id SET DEFAULT nextval('public.topic_booklists_id_seq'::regclass);


--
-- Name: tutor_document_chunks id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_document_chunks ALTER COLUMN id SET DEFAULT nextval('public.tutor_document_chunks_id_seq'::regclass);


--
-- Name: tutor_generation_jobs id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_generation_jobs ALTER COLUMN id SET DEFAULT nextval('public.tutor_generation_jobs_id_seq'::regclass);


--
-- Name: tutor_profiles id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_profiles ALTER COLUMN id SET DEFAULT nextval('public.tutor_profiles_id_seq'::regclass);


--
-- Name: tutor_session_messages id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_session_messages ALTER COLUMN id SET DEFAULT nextval('public.tutor_session_messages_id_seq'::regclass);


--
-- Name: tutor_sessions id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_sessions ALTER COLUMN id SET DEFAULT nextval('public.tutor_sessions_id_seq'::regclass);


--
-- Name: tutor_source_documents id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_source_documents ALTER COLUMN id SET DEFAULT nextval('public.tutor_source_documents_id_seq'::regclass);


--
-- Name: tutor_step_completions id; Type: DEFAULT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_step_completions ALTER COLUMN id SET DEFAULT nextval('public.tutor_step_completions_id_seq'::regclass);


--
-- Data for Name: admin_accounts; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.admin_accounts (id, username, password_hash, created_at, updated_at) FROM stdin;
1	admin	284634baea1faf9b72983b67a31e7326d46939dbb61012a4986841d149b12027	2026-04-13 14:30:15.703128	2026-04-13 14:30:15.703134
\.


--
-- Data for Name: admin_action_logs; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.admin_action_logs (id, admin_id, target_type, target_id, action, before_state, after_state, note, created_at) FROM stdin;
1	1	borrow_order_bundle	5	admin_correction	{"task_status": "arriving", "robot_status": "arriving", "borrow_status": "delivering", "delivery_status": "delivering"}	{"task_status": "returning", "robot_status": "returning", "borrow_status": "delivered", "delivery_status": "delivered"}	演示环境中手动将订单推进到送达状态。	2026-04-13 13:25:15.682766
\.


--
-- Data for Name: admin_permissions; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.admin_permissions (id, code, name, description, created_at) FROM stdin;
\.


--
-- Data for Name: admin_role_assignments; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.admin_role_assignments (id, admin_id, role_id, created_at) FROM stdin;
\.


--
-- Data for Name: admin_role_permissions; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.admin_role_permissions (id, role_id, permission_id, created_at) FROM stdin;
\.


--
-- Data for Name: admin_roles; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.admin_roles (id, code, name, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: alert_records; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.alert_records (id, source_type, source_id, alert_type, severity, status, title, message, metadata_json, acknowledged_by, acknowledged_at, resolved_by, resolved_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: book_categories; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.book_categories (id, code, name, description, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: book_copies; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.book_copies (id, book_id, cabinet_id, inventory_status, created_at, updated_at) FROM stdin;
1	1	cabinet-001	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
2	1	cabinet-001	borrowed	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
3	2	cabinet-001	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
4	2	cabinet-001	in_delivery	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
5	3	cabinet-001	borrowed	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
6	4	cabinet-001	reserved	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
7	9	cabinet-001	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
8	9	cabinet-001	in_delivery	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
9	10	cabinet-001	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
10	10	cabinet-001	reserved	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
11	5	cabinet-002	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
12	5	cabinet-002	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
13	6	cabinet-002	borrowed	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
14	7	cabinet-002	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
15	8	cabinet-002	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
16	11	cabinet-002	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
17	11	cabinet-002	borrowed	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
18	12	cabinet-002	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
19	13	cabinet-003	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
20	13	cabinet-003	borrowed	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
21	14	cabinet-003	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
22	14	cabinet-003	in_delivery	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
23	15	cabinet-003	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
24	16	cabinet-003	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
25	16	cabinet-003	borrowed	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
26	17	cabinet-003	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
27	17	cabinet-003	reserved	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
28	18	cabinet-003	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
29	18	cabinet-003	reserved	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
30	19	cabinet-004	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
31	19	cabinet-004	borrowed	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
32	20	cabinet-004	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
33	20	cabinet-004	reserved	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
34	21	cabinet-004	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
35	21	cabinet-004	borrowed	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
36	22	cabinet-004	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
37	22	cabinet-004	in_delivery	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
38	23	cabinet-004	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
39	24	cabinet-004	stored	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
40	24	cabinet-004	borrowed	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
\.


--
-- Data for Name: book_stock; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.book_stock (id, book_id, cabinet_id, total_copies, available_copies, reserved_copies, created_at, updated_at) FROM stdin;
1	1	cabinet-001	2	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
2	2	cabinet-001	2	1	1	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
3	3	cabinet-001	1	0	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
4	4	cabinet-001	1	0	1	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
5	9	cabinet-001	2	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
6	10	cabinet-001	2	1	1	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
7	5	cabinet-002	2	2	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
8	6	cabinet-002	1	0	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
9	7	cabinet-002	1	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
10	8	cabinet-002	1	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
11	11	cabinet-002	2	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
12	12	cabinet-002	1	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
13	13	cabinet-003	2	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
14	14	cabinet-003	2	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
15	15	cabinet-003	1	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
16	16	cabinet-003	2	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
17	17	cabinet-003	2	1	1	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
18	18	cabinet-003	2	1	1	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
19	19	cabinet-004	2	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
20	20	cabinet-004	2	1	1	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
21	21	cabinet-004	2	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
22	22	cabinet-004	2	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
23	23	cabinet-004	1	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
24	24	cabinet-004	2	1	0	2026-04-06 14:30:15.682766	2026-04-13 12:30:15.682766
\.


--
-- Data for Name: book_tag_links; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.book_tag_links (id, book_id, tag_id, created_at) FROM stdin;
\.


--
-- Data for Name: book_tags; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.book_tags (id, code, name, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: books; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.books (id, title, author, category_id, category, isbn, barcode, cover_url, keywords, summary, shelf_status, embedding, created_at, updated_at) FROM stdin;
1	智能图书馆运营实战	馆务创新组	\N	\N	\N	\N	\N	图书馆, 运营, 服务设计	面向现代图书馆的运营指挥、空间服务和馆务数字化实践。	\N	\N	2026-04-13 14:30:15.723762	2026-04-13 14:30:17.720062
2	生成式 AI 管理实践	程墨	\N	\N	\N	\N	\N	AI, 管理, 生成式模型	从应用场景到治理策略，帮助管理团队落地生成式 AI。	\N	\N	2026-04-13 14:30:15.725055	2026-04-13 14:30:17.720068
3	数据密集型产品设计	裴知行	\N	\N	\N	\N	\N	数据产品, 指标, 平台	讲解高密度后台、监控视图与数据工作流的产品设计方法。	\N	\N	2026-04-13 14:30:15.725779	2026-04-13 14:30:17.72007
4	Python 自动化与管理脚本	罗景川	\N	\N	\N	\N	\N	Python, 自动化, 脚本	适合运营与开发混合团队的脚本自动化入门与实战。	\N	\N	2026-04-13 14:30:15.726401	2026-04-13 14:30:17.72007
5	人机交互导论	王语宁	\N	\N	\N	\N	\N	HCI, 交互, 用户研究	从研究方法到交互评估，梳理人机交互基础框架。	\N	\N	2026-04-13 14:30:15.727065	2026-04-13 14:30:17.720071
6	校园服务系统架构	沈知白	\N	\N	\N	\N	\N	架构, 校园系统, SaaS	围绕校园业务、权限和服务编排的系统架构案例集。	\N	\N	2026-04-13 14:30:15.727747	2026-04-13 14:30:17.720071
7	机器学习推荐系统	许凌波	\N	\N	\N	\N	\N	推荐系统, 机器学习, 排序	覆盖召回、排序、特征工程与线上评估的推荐系统教材。	\N	\N	2026-04-13 14:30:15.728738	2026-04-13 14:30:17.720072
8	OCR 与文档数字化	段青	\N	\N	\N	\N	\N	OCR, 识别, 文档处理	面向纸质资料数字化和识别流程的工程实践。	\N	\N	2026-04-13 14:30:15.729366	2026-04-13 14:30:17.720072
9	知识治理与权限设计	陆安澜	\N	\N	\N	\N	\N	治理, 权限, 组织设计	围绕权限分层、流程审批与知识治理边界的后台设计案例。	\N	\N	2026-04-13 14:30:15.729967	2026-04-13 14:30:17.720073
10	服务蓝图与系统运营	谢闻舟	\N	\N	\N	\N	\N	服务蓝图, 运营, 旅程设计	帮助运营团队把服务触点、流程和后台支撑编织成稳定体系。	\N	\N	2026-04-13 14:30:15.73048	2026-04-13 14:30:17.720073
11	界面系统与交互节奏	宋知微	\N	\N	\N	\N	\N	界面系统, 动效, 交互节奏	从结构、留白到运动反馈，系统梳理产品界面的节奏感构建方法。	\N	\N	2026-04-13 14:30:15.730987	2026-04-13 14:30:17.720073
12	校园网络与边缘设备运维	何望川	\N	\N	\N	\N	\N	网络, 边缘设备, 运维	覆盖校园场景中的网络节点、边缘设备和巡检运维实践。	\N	\N	2026-04-13 14:30:15.731564	2026-04-13 14:30:17.720074
13	协同工作流编排方法	季临川	\N	\N	\N	\N	\N	工作流, 编排, 协同	围绕跨团队协同、节点编排和运营自动化的流程设计方法。	\N	\N	2026-04-13 14:30:15.732077	2026-04-13 14:30:17.720074
14	校园安全与权限运营	顾砚秋	\N	\N	\N	\N	\N	安全, 权限, 风控	聚焦校园业务中的账号安全、权限治理与风控运营机制。	\N	\N	2026-04-13 14:30:15.733201	2026-04-13 14:30:17.720074
15	科研服务数字化转型	韩知远	\N	\N	\N	\N	\N	科研服务, 数字化, 协同	把科研项目、资料流转与服务支持放到统一数字底座中。	\N	\N	2026-04-13 14:30:15.733724	2026-04-13 14:30:17.720075
16	组织领导力与服务协作	莫清辞	\N	\N	\N	\N	\N	领导力, 团队协作, 服务	帮助运营与服务团队建立稳定分工和跨部门协同机制。	\N	\N	2026-04-13 14:30:15.734202	2026-04-13 14:30:17.720075
17	数据库可靠性工程	苏见川	\N	\N	\N	\N	\N	数据库, 可用性, 容灾	从备份、监控到扩展性，系统介绍数据库可靠性实践。	\N	\N	2026-04-13 14:30:15.734704	2026-04-13 14:30:17.720076
18	服务设计地图	唐时雨	\N	\N	\N	\N	\N	服务设计, 蓝图, 旅程	将用户旅程、服务触点与后台协同串成完整服务地图。	\N	\N	2026-04-13 14:30:15.73518	2026-04-13 14:30:17.720076
19	运营自动化脚本集	闻一舟	\N	\N	\N	\N	\N	自动化, 脚本, 运营	面向馆务与运营场景的自动化脚本案例合集。	\N	\N	2026-04-13 14:30:15.735678	2026-04-13 14:30:17.720076
20	提示词工程与知识检索	许知遥	\N	\N	\N	\N	\N	提示词, 检索, LLM	讲解知识库检索、提示词编排与回答质量控制。	\N	\N	2026-04-13 14:30:15.736155	2026-04-13 14:30:17.720077
21	指标系统设计手册	范遇安	\N	\N	\N	\N	\N	指标, 监控, 运营	覆盖指标口径、分析看板和异常监控的设计方法。	\N	\N	2026-04-13 14:30:15.736596	2026-04-13 14:30:17.720077
22	云原生应用运维	江述白	\N	\N	\N	\N	\N	云原生, 容器, 运维	从容器编排到发布治理，系统梳理云原生运维实践。	\N	\N	2026-04-13 14:30:15.73706	2026-04-13 14:30:17.720077
23	媒体资产管理实务	方疏影	\N	\N	\N	\N	\N	媒体资产, 编目, 数字化	面向图片、视频与复合媒体资料的编目和资产管理流程。	\N	\N	2026-04-13 14:30:15.737537	2026-04-13 14:30:17.720078
24	学习空间与知识服务	陆初晴	\N	\N	\N	\N	\N	学习空间, 知识服务, 教育	讨论学习空间设计、知识服务触点与读者陪伴体验。	\N	\N	2026-04-13 14:30:15.738012	2026-04-13 14:30:17.720078
\.


--
-- Data for Name: borrow_orders; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.borrow_orders (id, reader_id, book_id, assigned_copy_id, order_mode, status, priority, due_at, failure_reason, intervention_status, attempt_count, created_at, updated_at, picked_at, delivered_at, completed_at) FROM stdin;
1	1	2	4	robot_delivery	delivering	\N	\N	\N	\N	0	2026-04-13 08:30:15.682766	2026-04-13 14:22:15.682766	2026-04-13 09:00:15.682766	\N	\N
2	2	3	5	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-11 14:30:15.682766	2026-04-11 20:30:15.682766	2026-04-11 15:30:15.682766	2026-04-11 18:30:15.682766	2026-04-11 20:30:15.682766
3	3	4	6	cabinet_pickup	awaiting_pick	\N	\N	\N	\N	0	2026-04-13 04:30:15.682766	2026-04-13 05:00:15.682766	\N	\N	\N
4	1	6	13	robot_delivery	completed	\N	\N	\N	\N	0	2026-04-09 14:30:15.682766	2026-04-09 18:30:15.682766	2026-04-09 15:30:15.682766	2026-04-09 17:30:15.682766	2026-04-09 18:30:15.682766
5	4	1	2	robot_delivery	delivered	\N	\N	\N	\N	0	2026-04-12 18:30:15.682766	2026-04-13 12:50:15.682766	2026-04-12 19:10:15.682766	2026-04-13 12:50:15.682766	\N
6	5	9	8	robot_delivery	delivering	\N	\N	\N	\N	0	2026-04-13 10:00:15.682766	2026-04-13 14:08:15.682766	2026-04-13 10:30:15.682766	\N	\N
7	6	10	10	cabinet_pickup	awaiting_pick	\N	\N	\N	\N	0	2026-04-13 00:30:15.682766	2026-04-13 00:50:15.682766	\N	\N	\N
8	5	11	17	robot_delivery	completed	\N	\N	\N	\N	0	2026-04-10 12:30:15.682766	2026-04-10 18:30:15.682766	2026-04-10 13:20:15.682766	2026-04-10 17:30:15.682766	2026-04-10 18:30:15.682766
9	7	13	20	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-08 11:30:15.682766	2026-04-08 18:30:15.682766	2026-04-08 12:10:15.682766	2026-04-08 16:30:15.682766	2026-04-08 18:30:15.682766
10	8	14	22	robot_delivery	delivering	\N	\N	\N	\N	0	2026-04-13 10:50:15.682766	2026-04-13 14:12:15.682766	2026-04-13 11:20:15.682766	\N	\N
11	9	16	25	robot_delivery	delivered	\N	\N	\N	\N	0	2026-04-12 10:30:15.682766	2026-04-13 12:20:15.682766	2026-04-12 11:15:15.682766	2026-04-13 12:20:15.682766	\N
12	10	17	27	cabinet_pickup	awaiting_pick	\N	\N	\N	\N	0	2026-04-13 05:10:15.682766	2026-04-13 05:35:15.682766	\N	\N	\N
13	11	18	29	cabinet_pickup	awaiting_pick	\N	\N	\N	\N	0	2026-04-13 08:20:15.682766	2026-04-13 09:00:15.682766	\N	\N	\N
14	12	19	31	robot_delivery	completed	\N	\N	\N	\N	0	2026-04-07 12:30:15.682766	2026-04-07 20:30:15.682766	2026-04-07 13:20:15.682766	2026-04-07 18:30:15.682766	2026-04-07 20:30:15.682766
15	8	20	33	cabinet_pickup	awaiting_pick	\N	\N	\N	\N	0	2026-04-12 20:20:15.682766	2026-04-12 21:10:15.682766	\N	\N	\N
16	9	21	35	robot_delivery	completed	\N	\N	\N	\N	0	2026-04-11 11:30:15.682766	2026-04-11 20:30:15.682766	2026-04-11 12:20:15.682766	2026-04-11 18:30:15.682766	2026-04-11 20:30:15.682766
17	10	22	37	robot_delivery	delivering	\N	\N	\N	\N	0	2026-04-13 12:10:15.682766	2026-04-13 14:21:15.682766	2026-04-13 12:35:15.682766	\N	\N
18	11	24	40	robot_delivery	completed	\N	\N	\N	\N	0	2026-04-09 08:30:15.682766	2026-04-09 18:30:15.682766	2026-04-09 09:10:15.682766	2026-04-09 16:30:15.682766	2026-04-09 18:30:15.682766
19	2	1	2	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-12 06:30:15.682766	2026-04-12 08:30:15.682766	2026-04-12 07:10:15.682766	2026-04-12 07:50:15.682766	2026-04-12 08:30:15.682766
20	3	2	4	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-11 09:30:15.682766	2026-04-11 11:30:15.682766	2026-04-11 10:15:15.682766	2026-04-11 10:55:15.682766	2026-04-11 11:30:15.682766
21	4	3	5	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-11 22:30:15.682766	2026-04-12 00:30:15.682766	2026-04-11 23:20:15.682766	2026-04-12 00:10:15.682766	2026-04-12 00:30:15.682766
22	5	18	29	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-10 08:30:15.682766	2026-04-10 10:30:15.682766	2026-04-10 09:00:15.682766	2026-04-10 09:45:15.682766	2026-04-10 10:30:15.682766
23	6	22	37	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-09 07:30:15.682766	2026-04-09 09:30:15.682766	2026-04-09 08:15:15.682766	2026-04-09 09:10:15.682766	2026-04-09 09:30:15.682766
24	7	17	27	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-08 06:30:15.682766	2026-04-08 08:30:15.682766	2026-04-08 07:20:15.682766	2026-04-08 08:05:15.682766	2026-04-08 08:30:15.682766
25	8	1	2	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-12 10:30:15.682766	2026-04-12 12:30:15.682766	2026-04-12 11:10:15.682766	2026-04-12 12:00:15.682766	2026-04-12 12:30:15.682766
26	9	1	2	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-11 07:30:15.682766	2026-04-11 09:30:15.682766	2026-04-11 08:15:15.682766	2026-04-11 09:00:15.682766	2026-04-11 09:30:15.682766
27	10	1	2	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-07 10:30:15.682766	2026-04-07 12:30:15.682766	2026-04-07 11:00:15.682766	2026-04-07 11:50:15.682766	2026-04-07 12:30:15.682766
28	11	2	4	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-12 04:30:15.682766	2026-04-12 06:30:15.682766	2026-04-12 05:15:15.682766	2026-04-12 06:10:15.682766	2026-04-12 06:30:15.682766
29	12	2	4	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-10 05:30:15.682766	2026-04-10 07:30:15.682766	2026-04-10 06:05:15.682766	2026-04-10 06:55:15.682766	2026-04-10 07:30:15.682766
30	1	2	4	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-08 09:30:15.682766	2026-04-08 11:30:15.682766	2026-04-08 10:10:15.682766	2026-04-08 10:55:15.682766	2026-04-08 11:30:15.682766
31	2	3	5	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-11 17:30:15.682766	2026-04-11 19:30:15.682766	2026-04-11 18:15:15.682766	2026-04-11 19:00:15.682766	2026-04-11 19:30:15.682766
32	3	3	5	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-09 06:30:15.682766	2026-04-09 08:30:15.682766	2026-04-09 07:20:15.682766	2026-04-09 08:10:15.682766	2026-04-09 08:30:15.682766
33	4	18	29	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-11 02:30:15.682766	2026-04-11 04:30:15.682766	2026-04-11 03:05:15.682766	2026-04-11 03:55:15.682766	2026-04-11 04:30:15.682766
34	5	18	29	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-08 03:30:15.682766	2026-04-08 05:30:15.682766	2026-04-08 04:10:15.682766	2026-04-08 05:00:15.682766	2026-04-08 05:30:15.682766
35	6	22	37	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-07 05:30:15.682766	2026-04-07 07:30:15.682766	2026-04-07 06:20:15.682766	2026-04-07 07:05:15.682766	2026-04-07 07:30:15.682766
36	7	17	27	cabinet_pickup	completed	\N	\N	\N	\N	0	2026-04-10 00:30:15.682766	2026-04-10 02:30:15.682766	2026-04-10 01:25:15.682766	2026-04-10 02:10:15.682766	2026-04-10 02:30:15.682766
\.


--
-- Data for Name: cabinet_slots; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.cabinet_slots (id, cabinet_id, slot_code, status, current_copy_id, created_at, updated_at) FROM stdin;
4	cabinet-001	A04	empty	\N	2026-04-13 14:30:15.743778	2026-04-13 14:30:15.743779
5	cabinet-001	A05	empty	\N	2026-04-13 14:30:15.744451	2026-04-13 14:30:15.744452
7	cabinet-001	A07	empty	\N	2026-04-13 14:30:15.745934	2026-04-13 14:30:15.745936
8	cabinet-001	A08	empty	\N	2026-04-13 14:30:15.746562	2026-04-13 14:30:15.746564
15	cabinet-002	B07	empty	\N	2026-04-13 14:30:15.750289	2026-04-13 14:30:15.75029
16	cabinet-002	B08	empty	\N	2026-04-13 14:30:15.750745	2026-04-13 14:30:15.750746
23	cabinet-003	C07	empty	\N	2026-04-13 14:30:15.75458	2026-04-13 14:30:15.754581
24	cabinet-003	C08	empty	\N	2026-04-13 14:30:15.755109	2026-04-13 14:30:15.755111
31	cabinet-004	D07	empty	\N	2026-04-13 14:30:15.758589	2026-04-13 14:30:15.75859
32	cabinet-004	D08	empty	\N	2026-04-13 14:30:15.759064	2026-04-13 14:30:15.759065
1	cabinet-001	A01	occupied	1	2026-04-13 14:30:15.741738	2026-04-13 14:30:15.763305
2	cabinet-001	A02	occupied	3	2026-04-13 14:30:15.742714	2026-04-13 14:30:15.765287
3	cabinet-001	A03	occupied	7	2026-04-13 14:30:15.743258	2026-04-13 14:30:15.771043
6	cabinet-001	A06	occupied	9	2026-04-13 14:30:15.744976	2026-04-13 14:30:15.77327
9	cabinet-002	B01	occupied	11	2026-04-13 14:30:15.747177	2026-04-13 14:30:15.77495
10	cabinet-002	B02	occupied	12	2026-04-13 14:30:15.747751	2026-04-13 14:30:15.776013
11	cabinet-002	B03	occupied	14	2026-04-13 14:30:15.748289	2026-04-13 14:30:15.777923
12	cabinet-002	B04	occupied	15	2026-04-13 14:30:15.748863	2026-04-13 14:30:15.778915
13	cabinet-002	B05	occupied	16	2026-04-13 14:30:15.74939	2026-04-13 14:30:15.779868
14	cabinet-002	B06	occupied	18	2026-04-13 14:30:15.749844	2026-04-13 14:30:15.781284
17	cabinet-003	C01	occupied	19	2026-04-13 14:30:15.7512	2026-04-13 14:30:15.782289
18	cabinet-003	C02	occupied	21	2026-04-13 14:30:15.751646	2026-04-13 14:30:15.78378
19	cabinet-003	C03	occupied	23	2026-04-13 14:30:15.752119	2026-04-13 14:30:15.785267
20	cabinet-003	C04	occupied	24	2026-04-13 14:30:15.752587	2026-04-13 14:30:15.78641
21	cabinet-003	C05	occupied	26	2026-04-13 14:30:15.753125	2026-04-13 14:30:15.788422
22	cabinet-003	C06	occupied	28	2026-04-13 14:30:15.754092	2026-04-13 14:30:15.790004
25	cabinet-004	D01	occupied	30	2026-04-13 14:30:15.755604	2026-04-13 14:30:15.791526
26	cabinet-004	D02	occupied	32	2026-04-13 14:30:15.756073	2026-04-13 14:30:15.793138
27	cabinet-004	D03	occupied	34	2026-04-13 14:30:15.75653	2026-04-13 14:30:15.794606
28	cabinet-004	D04	occupied	36	2026-04-13 14:30:15.75703	2026-04-13 14:30:15.796139
29	cabinet-004	D05	occupied	38	2026-04-13 14:30:15.757498	2026-04-13 14:30:15.797565
30	cabinet-004	D06	occupied	39	2026-04-13 14:30:15.758067	2026-04-13 14:30:15.798586
\.


--
-- Data for Name: cabinets; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.cabinets (id, name, location, status, created_at, updated_at) FROM stdin;
cabinet-001	东区主书柜	图书馆一层大厅	active	2026-04-13 14:30:15.739247	2026-04-13 14:30:15.739249
cabinet-002	南区副书柜	图书馆二层南阅览区	active	2026-04-13 14:30:15.73925	2026-04-13 14:30:15.73925
cabinet-003	西区流通柜	图书馆一层西翼流通区	active	2026-04-13 14:30:15.739251	2026-04-13 14:30:15.739252
cabinet-004	北区研修柜	图书馆三层北研修区	active	2026-04-13 14:30:15.739253	2026-04-13 14:30:15.739253
\.


--
-- Data for Name: conversation_messages; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.conversation_messages (id, session_id, role, content, metadata_json, created_at) FROM stdin;
1	1	user	我想看关于 AI 管理的入门书。	{"source": "chat"}	2026-04-13 07:30:15.682766
2	1	assistant	可以先看《生成式 AI 管理实践》。	{"recommendation_book_id": 2}	2026-04-13 07:32:15.682766
3	1	user	还想了解后台指挥台。	{"source": "chat"}	2026-04-13 09:20:15.682766
4	2	user	上次借的书什么时候要还？	{"source": "chat"}	2026-04-12 14:30:15.682766
5	2	assistant	你有一笔完成订单，归还申请已创建。	{"borrow_order_id": 2}	2026-04-12 14:31:15.682766
6	3	user	有没有适合做高密度后台的书？	{"source": "chat"}	2026-04-12 22:30:15.682766
7	3	assistant	推荐《数据密集型产品设计》。	{"recommendation_book_id": 3}	2026-04-12 22:32:15.682766
8	3	assistant	也可以搭配《机器学习推荐系统》一起看。	{"recommendation_book_id": 7}	2026-04-12 22:35:15.682766
9	4	user	OCR 入柜识别总是匹配错怎么办？	{"source": "chat"}	2026-04-13 05:30:15.682766
10	4	assistant	先检查图片清晰度，再看候选书目匹配。	{"source": "support"}	2026-04-13 05:33:15.682766
11	4	assistant	你可以先参考《OCR 与文档数字化》。	{"recommendation_book_id": 8}	2026-04-13 05:40:15.682766
12	5	user	权限系统分层应该怎么做？	{"source": "chat"}	2026-04-13 10:05:15.682766
13	5	assistant	可以先看《知识治理与权限设计》，它对角色和边界讲得很清楚。	{"recommendation_book_id": 9}	2026-04-13 10:07:15.682766
14	5	assistant	如果你还要梳理服务触点，再补《服务蓝图与系统运营》。	{"recommendation_book_id": 10}	2026-04-13 10:54:15.682766
15	6	user	有没有讲界面节奏和动效的书？	{"source": "chat"}	2026-04-13 00:30:15.682766
16	6	assistant	推荐《界面系统与交互节奏》，很适合做后台界面参考。	{"recommendation_book_id": 11}	2026-04-13 00:34:15.682766
17	7	user	我想把多团队流程串起来，有什么书适合？	{"source": "chat"}	2026-04-12 10:30:15.682766
18	7	assistant	可以先看《协同工作流编排方法》。	{"recommendation_book_id": 13}	2026-04-12 10:34:15.682766
19	7	assistant	如果你还要补服务旅程视角，再看《服务设计地图》。	{"recommendation_book_id": 18}	2026-04-12 10:42:15.682766
20	8	user	权限运营和云原生运维我都想补一下。	{"source": "chat"}	2026-04-13 10:40:15.682766
21	8	assistant	先看《校园安全与权限运营》，再配《云原生应用运维》。	{"recommendation_book_id": 14}	2026-04-13 10:43:15.682766
22	8	user	那我先下单安全治理这本。	{"borrow_order_id": 10}	2026-04-13 10:55:15.682766
23	9	user	有没有适合带团队做服务协同的书？	{"source": "chat"}	2026-04-12 08:30:15.682766
24	9	assistant	《组织领导力与服务协作》会很适合你。	{"recommendation_book_id": 16}	2026-04-12 08:36:15.682766
25	10	user	数据库可靠性和云原生治理想一起学。	{"source": "chat"}	2026-04-13 05:00:15.682766
26	10	assistant	先看《数据库可靠性工程》，再搭配《云原生应用运维》。	{"recommendation_book_id": 17}	2026-04-13 05:04:15.682766
27	10	assistant	这两本组合很适合值班和发布治理场景。	{"recommendation_book_id": 22}	2026-04-13 05:09:15.682766
28	11	user	我在做学习空间服务地图，有参考书吗？	{"source": "chat"}	2026-04-13 08:15:15.682766
29	11	assistant	先看《服务设计地图》。	{"recommendation_book_id": 18}	2026-04-13 08:18:15.682766
30	11	assistant	再补《学习空间与知识服务》，会更完整。	{"recommendation_book_id": 24}	2026-04-13 08:22:15.682766
31	12	user	有没有把自动化脚本和提示词工程一起讲的？	{"source": "chat"}	2026-04-07 13:30:15.682766
32	12	assistant	可以先读《运营自动化脚本集》，再补《提示词工程与知识检索》。	{"recommendation_book_id": 19}	2026-04-07 13:34:15.682766
\.


--
-- Data for Name: conversation_sessions; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.conversation_sessions (id, reader_id, status, created_at, updated_at) FROM stdin;
1	1	active	2026-04-13 07:30:15.682766	2026-04-13 09:30:15.682766
2	1	closed	2026-04-12 14:30:15.682766	2026-04-12 14:00:15.682766
3	2	active	2026-04-12 22:30:15.682766	2026-04-12 23:30:15.682766
4	4	active	2026-04-13 05:30:15.682766	2026-04-13 06:30:15.682766
5	5	active	2026-04-13 10:05:15.682766	2026-04-13 10:55:15.682766
6	6	active	2026-04-13 00:30:15.682766	2026-04-13 01:20:15.682766
7	7	closed	2026-04-12 10:30:15.682766	2026-04-12 11:10:15.682766
8	8	active	2026-04-13 10:40:15.682766	2026-04-13 11:55:15.682766
9	9	closed	2026-04-12 08:30:15.682766	2026-04-12 09:20:15.682766
10	10	active	2026-04-13 05:00:15.682766	2026-04-13 12:25:15.682766
11	11	active	2026-04-13 08:15:15.682766	2026-04-13 09:25:15.682766
12	12	closed	2026-04-07 13:30:15.682766	2026-04-07 14:50:15.682766
\.


--
-- Data for Name: delivery_orders; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.delivery_orders (id, borrow_order_id, delivery_target, eta_minutes, status, priority, due_at, failure_reason, intervention_status, attempt_count, created_at, updated_at, completed_at) FROM stdin;
1	1	三楼南阅览区 A 区	6	delivering	\N	\N	\N	\N	0	2026-04-13 08:30:15.682766	2026-04-13 14:22:15.682766	\N
2	4	二楼研讨间 04	0	completed	\N	\N	\N	\N	0	2026-04-09 14:30:15.682766	2026-04-09 18:30:15.682766	2026-04-09 18:30:15.682766
3	5	一楼服务台	1	delivered	\N	\N	\N	\N	0	2026-04-12 18:30:15.682766	2026-04-13 12:50:15.682766	\N
4	6	北区教师研修室	5	delivering	\N	\N	\N	\N	0	2026-04-13 10:00:15.682766	2026-04-13 14:08:15.682766	\N
5	8	数字媒体实验室	0	completed	\N	\N	\N	\N	0	2026-04-10 12:30:15.682766	2026-04-10 18:30:15.682766	2026-04-10 18:30:15.682766
6	10	信息学院实验中心	4	delivering	\N	\N	\N	\N	0	2026-04-13 10:50:15.682766	2026-04-13 14:12:15.682766	\N
7	11	艺术学院展厅准备区	0	delivered	\N	\N	\N	\N	0	2026-04-12 10:30:15.682766	2026-04-13 12:20:15.682766	\N
8	14	西区运营工位	0	completed	\N	\N	\N	\N	0	2026-04-07 12:30:15.682766	2026-04-07 20:30:15.682766	2026-04-07 20:30:15.682766
9	16	二楼数据分析室	0	completed	\N	\N	\N	\N	0	2026-04-11 11:30:15.682766	2026-04-11 20:30:15.682766	2026-04-11 20:30:15.682766
10	17	北区云原生工坊	3	delivering	\N	\N	\N	\N	0	2026-04-13 12:10:15.682766	2026-04-13 14:21:15.682766	\N
11	18	学习共享空间 3A	0	completed	\N	\N	\N	\N	0	2026-04-09 08:30:15.682766	2026-04-09 18:30:15.682766	2026-04-09 18:30:15.682766
\.


--
-- Data for Name: dismissed_notifications; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.dismissed_notifications (id, reader_id, notification_id, created_at) FROM stdin;
\.


--
-- Data for Name: favorite_books; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.favorite_books (id, reader_id, book_id, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_events; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.inventory_events (id, cabinet_id, event_type, slot_code, book_id, copy_id, payload_json, created_at) FROM stdin;
1	cabinet-001	book_stored	A01	1	1	{"source": "manual_seed"}	2026-04-06 14:30:15.682766
2	cabinet-001	book_stored	A02	2	3	{"source": "manual_seed"}	2026-04-06 18:30:15.682766
3	cabinet-001	book_picked	A04	2	4	{"borrow_order_id": 1}	2026-04-13 08:30:15.682766
4	cabinet-001	book_picked	A05	4	6	{"borrow_order_id": 3}	2026-04-13 04:30:15.682766
5	cabinet-002	book_stored	B03	7	10	{"source": "manual_seed"}	2026-04-11 14:30:15.682766
6	cabinet-002	stock_recount	B04	8	11	{"operator": "seed-script"}	2026-04-13 10:30:15.682766
7	cabinet-001	book_stored	A03	9	7	{"source": "manual_seed"}	2026-04-08 14:30:15.682766
8	cabinet-001	book_stored	A06	10	9	{"source": "manual_seed"}	2026-04-09 08:30:15.682766
9	cabinet-001	book_picked	A07	9	8	{"borrow_order_id": 6}	2026-04-13 10:00:15.682766
10	cabinet-002	book_stored	B06	12	18	{"operator": "seed-script"}	2026-04-12 06:30:15.682766
11	cabinet-003	book_stored	C01	13	19	{"source": "manual_seed"}	2026-04-07 06:30:15.682766
12	cabinet-003	book_stored	C02	14	21	{"source": "manual_seed"}	2026-04-07 20:30:15.682766
13	cabinet-003	book_stored	C03	15	23	{"source": "manual_seed"}	2026-04-08 11:30:15.682766
14	cabinet-003	book_stored	C04	16	24	{"source": "manual_seed"}	2026-04-08 22:30:15.682766
15	cabinet-003	book_stored	C05	17	26	{"source": "manual_seed"}	2026-04-09 08:30:15.682766
16	cabinet-003	stock_recount	C06	18	28	{"operator": "seed-script"}	2026-04-13 03:30:15.682766
17	cabinet-003	book_picked	C07	14	22	{"borrow_order_id": 10}	2026-04-13 10:50:15.682766
18	cabinet-003	book_picked	C08	17	27	{"borrow_order_id": 12}	2026-04-13 05:10:15.682766
19	cabinet-004	book_stored	D01	19	30	{"source": "manual_seed"}	2026-04-07 08:30:15.682766
20	cabinet-004	book_stored	D02	20	32	{"source": "manual_seed"}	2026-04-10 02:30:15.682766
21	cabinet-004	book_stored	D03	21	34	{"source": "manual_seed"}	2026-04-10 16:30:15.682766
22	cabinet-004	book_stored	D04	22	36	{"source": "manual_seed"}	2026-04-11 18:30:15.682766
23	cabinet-004	stock_recount	D05	23	38	{"operator": "seed-script"}	2026-04-13 07:30:15.682766
24	cabinet-004	book_picked	D08	22	37	{"borrow_order_id": 17}	2026-04-13 12:10:15.682766
\.


--
-- Data for Name: reader_accounts; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.reader_accounts (id, username, password_hash, created_at, updated_at) FROM stdin;
1	reader.ai	6b6650a89fabd314b5a522ec37819670f8821ccf5123fd1b15817112d264015d	2026-04-13 14:30:15.706191	2026-04-13 14:30:15.706196
2	reader.ops	6b6650a89fabd314b5a522ec37819670f8821ccf5123fd1b15817112d264015d	2026-04-13 14:30:15.709204	2026-04-13 14:30:15.709206
3	reader.lab	6b6650a89fabd314b5a522ec37819670f8821ccf5123fd1b15817112d264015d	2026-04-13 14:30:15.711095	2026-04-13 14:30:15.711101
4	reader.arch	6b6650a89fabd314b5a522ec37819670f8821ccf5123fd1b15817112d264015d	2026-04-13 14:30:15.712522	2026-04-13 14:30:15.712523
5	reader.policy	6b6650a89fabd314b5a522ec37819670f8821ccf5123fd1b15817112d264015d	2026-04-13 14:30:15.713701	2026-04-13 14:30:15.713702
6	reader.service	6b6650a89fabd314b5a522ec37819670f8821ccf5123fd1b15817112d264015d	2026-04-13 14:30:15.714834	2026-04-13 14:30:15.714835
7	reader.media	6b6650a89fabd314b5a522ec37819670f8821ccf5123fd1b15817112d264015d	2026-04-13 14:30:15.716667	2026-04-13 14:30:15.716669
8	reader.cloud	6b6650a89fabd314b5a522ec37819670f8821ccf5123fd1b15817112d264015d	2026-04-13 14:30:15.717703	2026-04-13 14:30:15.717704
9	reader.design	6b6650a89fabd314b5a522ec37819670f8821ccf5123fd1b15817112d264015d	2026-04-13 14:30:15.718704	2026-04-13 14:30:15.718705
10	reader.logistics	6b6650a89fabd314b5a522ec37819670f8821ccf5123fd1b15817112d264015d	2026-04-13 14:30:15.719641	2026-04-13 14:30:15.719642
11	reader.security	6b6650a89fabd314b5a522ec37819670f8821ccf5123fd1b15817112d264015d	2026-04-13 14:30:15.720696	2026-04-13 14:30:15.720697
12	reader.research	6b6650a89fabd314b5a522ec37819670f8821ccf5123fd1b15817112d264015d	2026-04-13 14:30:15.721841	2026-04-13 14:30:15.721844
\.


--
-- Data for Name: reader_booklist_items; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.reader_booklist_items (id, booklist_id, book_id, rank_position, created_at) FROM stdin;
\.


--
-- Data for Name: reader_booklists; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.reader_booklists (id, reader_id, title, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: reader_profiles; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.reader_profiles (id, account_id, display_name, affiliation_type, college, major, grade_year, interest_tags, reading_profile_summary, restriction_status, restriction_until, risk_flags, preference_profile_json, segment_code, created_at, updated_at) FROM stdin;
2	2	林书乔	student	管理学院	信息管理	2023	\N	\N	\N	\N	\N	\N	\N	2026-04-13 14:30:15.710014	2026-04-13 14:30:15.710022
3	3	周清和	teacher	计算机学院	人工智能	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-13 14:30:15.711883	2026-04-13 14:30:15.711886
4	4	顾望舒	student	建筑学院	数字媒体	2022	\N	\N	\N	\N	\N	\N	\N	2026-04-13 14:30:15.713057	2026-04-13 14:30:15.713059
5	5	许见山	teacher	公共管理学院	知识治理	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-13 14:30:15.714234	2026-04-13 14:30:15.714235
6	6	陈南乔	student	文学院	数字出版	2025	\N	\N	\N	\N	\N	\N	\N	2026-04-13 14:30:15.715745	2026-04-13 14:30:15.715746
7	7	沈星野	student	新闻传播学院	网络与新媒体	2024	\N	\N	\N	\N	\N	\N	\N	2026-04-13 14:30:15.717163	2026-04-13 14:30:15.717164
8	8	梁叙白	teacher	计算机学院	云计算	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-13 14:30:15.718218	2026-04-13 14:30:15.71822
9	9	宋以宁	student	艺术学院	交互媒体	2025	\N	\N	\N	\N	\N	\N	\N	2026-04-13 14:30:15.719171	2026-04-13 14:30:15.719172
10	10	贺川	student	管理学院	物流工程	2023	\N	\N	\N	\N	\N	\N	\N	2026-04-13 14:30:15.72017	2026-04-13 14:30:15.720172
11	11	姜予安	teacher	信息学院	网络安全	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-13 14:30:15.721217	2026-04-13 14:30:15.721219
12	12	白清禾	student	教育学院	教育技术	2022	\N	\N	\N	\N	\N	\N	\N	2026-04-13 14:30:15.722414	2026-04-13 14:30:15.722416
1	1	张一凡	student	信息学院	软件工程	2024	["人工智能", "课本精读", "考试复习"]	偏好先看章节框架，再进入细节和例题。	\N	\N	\N	\N	\N	2026-04-13 14:30:15.707719	2026-04-13 14:38:08.638294
\.


--
-- Data for Name: reading_events; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.reading_events (id, reader_id, event_type, metadata_json, created_at) FROM stdin;
1	1	borrow_order_created	{"borrow_order_id": 1}	2026-04-13 08:30:15.682766
2	1	recommendation_viewed	{"book_id": 2}	2026-04-13 09:30:15.682766
3	2	borrow_order_completed	{"borrow_order_id": 2}	2026-04-11 20:30:15.682766
4	2	return_request_created	{"borrow_order_id": 2}	2026-04-13 02:30:15.682766
5	3	borrow_order_created	{"borrow_order_id": 3}	2026-04-13 04:30:15.682766
6	3	search_performed	{"query": "自动化 脚本"}	2026-04-13 02:30:15.682766
7	4	borrow_order_created	{"borrow_order_id": 5}	2026-04-12 18:30:15.682766
8	4	conversation_started	{"session_id": 4}	2026-04-13 05:30:15.682766
9	1	delivery_completed	{"borrow_order_id": 5}	2026-04-13 12:50:15.682766
10	1	borrow_order_completed	{"borrow_order_id": 4}	2026-04-09 18:30:15.682766
11	5	borrow_order_created	{"borrow_order_id": 6}	2026-04-13 10:00:15.682766
12	5	recommendation_viewed	{"book_id": 9}	2026-04-13 10:40:15.682766
13	5	borrow_order_completed	{"borrow_order_id": 8}	2026-04-10 18:30:15.682766
14	6	borrow_order_created	{"borrow_order_id": 7}	2026-04-13 00:30:15.682766
15	6	conversation_started	{"session_id": 6}	2026-04-13 00:30:15.682766
16	7	borrow_order_completed	{"borrow_order_id": 9}	2026-04-08 18:30:15.682766
17	7	recommendation_viewed	{"book_id": 13}	2026-04-12 12:30:15.682766
18	7	conversation_started	{"session_id": 7}	2026-04-12 10:30:15.682766
19	7	return_request_created	{"borrow_order_id": 9}	2026-04-12 22:30:15.682766
20	8	borrow_order_created	{"borrow_order_id": 10}	2026-04-13 10:50:15.682766
21	8	borrow_order_created	{"borrow_order_id": 15}	2026-04-12 20:20:15.682766
22	8	recommendation_viewed	{"book_id": 14}	2026-04-13 10:43:15.682766
23	8	conversation_started	{"session_id": 8}	2026-04-13 10:40:15.682766
24	9	borrow_order_created	{"borrow_order_id": 11}	2026-04-12 10:30:15.682766
25	9	borrow_order_completed	{"borrow_order_id": 16}	2026-04-11 20:30:15.682766
26	9	recommendation_viewed	{"book_id": 16}	2026-04-12 08:36:15.682766
27	10	borrow_order_created	{"borrow_order_id": 12}	2026-04-13 05:10:15.682766
28	10	borrow_order_created	{"borrow_order_id": 17}	2026-04-13 12:10:15.682766
29	10	conversation_started	{"session_id": 10}	2026-04-13 05:00:15.682766
30	10	recommendation_viewed	{"book_id": 17}	2026-04-13 05:04:15.682766
31	11	borrow_order_created	{"borrow_order_id": 13}	2026-04-13 08:20:15.682766
32	11	borrow_order_completed	{"borrow_order_id": 18}	2026-04-09 18:30:15.682766
33	11	recommendation_viewed	{"book_id": 24}	2026-04-13 08:22:15.682766
34	11	conversation_started	{"session_id": 11}	2026-04-13 08:15:15.682766
35	12	borrow_order_completed	{"borrow_order_id": 14}	2026-04-07 20:30:15.682766
36	12	conversation_started	{"session_id": 12}	2026-04-07 13:30:15.682766
\.


--
-- Data for Name: recommendation_logs; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.recommendation_logs (id, reader_id, book_id, query_text, result_title, rank_position, score, provider_note, explanation, evidence_json, created_at) FROM stdin;
1	1	2	AI 管理 入门	生成式 AI 管理实践	1	0.96	seed	适合当前 AI 管理主题检索	{"source": "demo_seed", "book_id": 2}	2026-04-13 07:30:15.682766
2	1	1	后台 指挥台 设计	智能图书馆运营实战	2	0.88	seed	和运营指挥台主题高度相关	{"source": "demo_seed", "book_id": 1}	2026-04-13 09:30:15.682766
3	2	3	产品 数据密集	数据密集型产品设计	1	0.94	seed	命中高密度数据管理主题	{"source": "demo_seed", "book_id": 3}	2026-04-12 14:30:15.682766
4	2	7	推荐系统 实战	机器学习推荐系统	1	0.93	seed	契合推荐系统学习路径	{"source": "demo_seed", "book_id": 7}	2026-04-12 23:30:15.682766
5	3	4	自动化 脚本	Python 自动化与管理脚本	1	0.9	seed	满足自动化脚本需求	{"source": "demo_seed", "book_id": 4}	2026-04-13 02:30:15.682766
6	4	8	OCR 数字化	OCR 与文档数字化	1	0.95	seed	紧贴 OCR 和数字化主题	{"source": "demo_seed", "book_id": 8}	2026-04-13 05:30:15.682766
7	5	9	权限 系统 治理	知识治理与权限设计	1	0.97	seed	覆盖治理台最常见的权限设计议题	{"source": "demo_seed", "book_id": 9}	2026-04-13 10:10:15.682766
8	5	10	图书馆 服务 蓝图	服务蓝图与系统运营	2	0.91	seed	适合把前台触点与后台运营串起来	{"source": "demo_seed", "book_id": 10}	2026-04-13 10:50:15.682766
9	6	11	交互 节奏 设计	界面系统与交互节奏	1	0.96	seed	直接命中界面节奏与交互语言主题	{"source": "demo_seed", "book_id": 11}	2026-04-13 00:30:15.682766
10	6	12	边缘 设备 运维	校园网络与边缘设备运维	1	0.89	seed	补充设备和网络巡检运维视角	{"source": "demo_seed", "book_id": 12}	2026-04-13 01:15:15.682766
11	7	13	工作流 自动化 协同	协同工作流编排方法	1	0.95	seed	非常适合工作流配置和协作编排主题	{"source": "demo_seed", "book_id": 13}	2026-04-12 10:30:15.682766
12	7	18	流程 编排 设计	服务设计地图	2	0.88	seed	可以把前台流程和后台协同关系串起来	{"source": "demo_seed", "book_id": 18}	2026-04-12 12:30:15.682766
13	8	14	安全 权限 运营	校园安全与权限运营	1	0.96	seed	覆盖权限治理和安全运营重点	{"source": "demo_seed", "book_id": 14}	2026-04-13 10:40:15.682766
14	8	22	云原生 运维	云原生应用运维	2	0.9	seed	补齐云原生发布和运维视角	{"source": "demo_seed", "book_id": 22}	2026-04-13 11:50:15.682766
15	9	16	领导力 服务 协作	组织领导力与服务协作	1	0.92	seed	适合组织协作和服务管理主题	{"source": "demo_seed", "book_id": 16}	2026-04-12 08:30:15.682766
16	9	21	指标 看板 设计	指标系统设计手册	1	0.94	seed	有助于构建可执行的指标体系	{"source": "demo_seed", "book_id": 21}	2026-04-11 10:30:15.682766
17	10	17	数据库 容灾	数据库可靠性工程	1	0.97	seed	直接命中数据库可靠性和容灾设计	{"source": "demo_seed", "book_id": 17}	2026-04-13 05:00:15.682766
18	10	22	云原生 发布 治理	云原生应用运维	2	0.91	seed	适合作为数据库运维的配套阅读	{"source": "demo_seed", "book_id": 22}	2026-04-13 12:20:15.682766
19	11	18	服务地图 旅程	服务设计地图	1	0.95	seed	可以帮你拆出服务旅程和支撑节点	{"source": "demo_seed", "book_id": 18}	2026-04-13 08:15:15.682766
20	11	24	学习空间 设计	学习空间与知识服务	1	0.93	seed	和学习空间、知识服务主题高度相关	{"source": "demo_seed", "book_id": 24}	2026-04-09 10:30:15.682766
21	12	19	自动化 脚本 案例	运营自动化脚本集	1	0.94	seed	适合快速搭建自动化脚本实践	{"source": "demo_seed", "book_id": 19}	2026-04-07 13:30:15.682766
22	12	20	知识检索 提示词	提示词工程与知识检索	2	0.92	seed	适合作为 AI 检索与问答的延伸阅读	{"source": "demo_seed", "book_id": 20}	2026-04-12 20:30:15.682766
23	2	23	媒体 资产 编目	媒体资产管理实务	1	0.89	seed	补充数字化编目和媒体资料管理视角	{"source": "demo_seed", "book_id": 23}	2026-04-11 08:30:15.682766
24	4	15	科研服务协同	科研服务数字化转型	2	0.87	seed	帮助理解科研资料流转和服务协同	{"source": "demo_seed", "book_id": 15}	2026-04-12 04:30:15.682766
25	1	19	personalized_reader:1	运营自动化脚本集	1	0.275	personalized	结合你最近借阅的《生成式 AI 管理实践》等图书，且相似读者也经常借这本书	{"similar_score": 0.0, "history_titles": ["生成式 AI 管理实践"], "retrieval_mode": "personalized_hybrid_history", "signal_sources": ["collaborative"], "history_book_ids": [2], "collaborative_score": 0.275, "overlap_reader_count": 1}	2026-04-13 14:38:09.262598
26	1	24	personalized_reader:1	学习空间与知识服务	2	0.275	personalized	结合你最近借阅的《生成式 AI 管理实践》等图书，且相似读者也经常借这本书	{"similar_score": 0.0, "history_titles": ["生成式 AI 管理实践"], "retrieval_mode": "personalized_hybrid_history", "signal_sources": ["collaborative"], "history_book_ids": [2], "collaborative_score": 0.275, "overlap_reader_count": 1}	2026-04-13 14:38:09.262602
27	1	19	personalized_reader:1	运营自动化脚本集	1	0.275	personalized	结合你最近借阅的《生成式 AI 管理实践》等图书，且相似读者也经常借这本书	{"similar_score": 0.0, "history_titles": ["生成式 AI 管理实践"], "retrieval_mode": "personalized_hybrid_history", "signal_sources": ["collaborative"], "history_book_ids": [2], "collaborative_score": 0.275, "overlap_reader_count": 1}	2026-04-13 14:38:09.278023
28	1	24	personalized_reader:1	学习空间与知识服务	2	0.275	personalized	结合你最近借阅的《生成式 AI 管理实践》等图书，且相似读者也经常借这本书	{"similar_score": 0.0, "history_titles": ["生成式 AI 管理实践"], "retrieval_mode": "personalized_hybrid_history", "signal_sources": ["collaborative"], "history_book_ids": [2], "collaborative_score": 0.275, "overlap_reader_count": 1}	2026-04-13 14:38:09.27803
29	1	1		智能图书馆运营实战	1	2	provider	这本书适合你，因为它结合了后台指挥台设计与图书馆运营实践，能帮你理解服务协同与系统管理。	{"matched_fields": [], "retrieval_mode": "vector_fallback"}	2026-04-13 14:38:22.899664
30	1	20		提示词工程与知识检索	2	2	provider	这本书讲解知识库检索和提示词编排，适合软件工程专业学生提升AI应用能力。	{"matched_fields": [], "retrieval_mode": "vector_fallback"}	2026-04-13 14:38:22.899667
31	1	24		学习空间与知识服务	3	2	provider	这本书探讨学习空间设计与知识服务，适合你作为软件工程学生研究后台协同与用户体验。	{"matched_fields": [], "retrieval_mode": "vector_fallback"}	2026-04-13 14:38:22.899667
32	1	5		人机交互导论	4	2	provider	这本书系统梳理了人机交互的基础框架，能帮助你理解后台指挥台等系统的交互设计原理。	{"matched_fields": [], "retrieval_mode": "vector_fallback"}	2026-04-13 14:38:22.899668
33	1	8		OCR 与文档数字化	5	2	provider	这本书适合软件工程专业学生，能帮助你掌握纸质资料数字化的工程实践技能。	{"matched_fields": [], "retrieval_mode": "vector_fallback"}	2026-04-13 14:38:22.899668
37	1	19	personalized_reader:1	运营自动化脚本集	1	0.275	personalized	结合你最近借阅的《生成式 AI 管理实践》等图书，且相似读者也经常借这本书	{"similar_score": 0.0, "history_titles": ["生成式 AI 管理实践"], "retrieval_mode": "personalized_hybrid_history", "signal_sources": ["collaborative"], "history_book_ids": [2], "collaborative_score": 0.275, "overlap_reader_count": 1}	2026-04-13 14:40:35.646058
39	1	24	personalized_reader:1	学习空间与知识服务	2	0.275	personalized	结合你最近借阅的《生成式 AI 管理实践》等图书，且相似读者也经常借这本书	{"similar_score": 0.0, "history_titles": ["生成式 AI 管理实践"], "retrieval_mode": "personalized_hybrid_history", "signal_sources": ["collaborative"], "history_book_ids": [2], "collaborative_score": 0.275, "overlap_reader_count": 1}	2026-04-13 14:40:35.646059
34	1	2	collaborative_book:19	生成式 AI 管理实践	1	0.5	collaborative	有 1 位借过《运营自动化脚本集》的读者也借过这本书	{"retrieval_mode": "borrow_cooccurrence", "source_reader_count": 1, "overlap_reader_count": 1, "candidate_reader_count": 4}	2026-04-13 14:38:24.118853
35	1	2	hybrid_book:19	生成式 AI 管理实践	1	0.275	hybrid	有 1 位借过《运营自动化脚本集》的读者也借过这本书	{"similar_score": null, "retrieval_mode": "hybrid_book_recommendation", "signal_sources": ["collaborative"], "collaborative_score": 0.5, "source_reader_count": 1, "overlap_reader_count": 1, "candidate_reader_count": 4}	2026-04-13 14:38:24.134049
36	1	19	personalized_reader:1	运营自动化脚本集	1	0.275	personalized	结合你最近借阅的《生成式 AI 管理实践》等图书，且相似读者也经常借这本书	{"similar_score": 0.0, "history_titles": ["生成式 AI 管理实践"], "retrieval_mode": "personalized_hybrid_history", "signal_sources": ["collaborative"], "history_book_ids": [2], "collaborative_score": 0.275, "overlap_reader_count": 1}	2026-04-13 14:40:35.645585
38	1	24	personalized_reader:1	学习空间与知识服务	2	0.275	personalized	结合你最近借阅的《生成式 AI 管理实践》等图书，且相似读者也经常借这本书	{"similar_score": 0.0, "history_titles": ["生成式 AI 管理实践"], "retrieval_mode": "personalized_hybrid_history", "signal_sources": ["collaborative"], "history_book_ids": [2], "collaborative_score": 0.275, "overlap_reader_count": 1}	2026-04-13 14:40:35.645588
40	1	1		智能图书馆运营实战	1	2	provider	这本书适合软件工程专业的学生，能帮助你了解图书馆后台指挥台和数字化运营的实际应用。	{"matched_fields": [], "retrieval_mode": "vector_fallback"}	2026-04-13 14:40:49.645775
41	1	20		提示词工程与知识检索	2	2	provider	这本书能帮你掌握如何高效检索知识库并编排提示词，提升AI管理中的回答质量。	{"matched_fields": [], "retrieval_mode": "vector_fallback"}	2026-04-13 14:40:49.645777
42	1	24		学习空间与知识服务	3	2	provider	这本书探讨学习空间设计与知识服务，适合软件工程专业学生了解服务触点与用户体验。	{"matched_fields": [], "retrieval_mode": "vector_fallback"}	2026-04-13 14:40:49.645778
43	1	5		人机交互导论	4	2	provider	这本书系统梳理了人机交互的基础框架，适合软件工程专业学生构建交互设计知识体系。	{"matched_fields": [], "retrieval_mode": "vector_fallback"}	2026-04-13 14:40:49.645778
44	1	13		协同工作流编排方法	5	2	provider	这本书适合软件工程专业学生，能帮助你掌握跨团队协同与自动化流程设计，提升项目协作效率。	{"matched_fields": [], "retrieval_mode": "vector_fallback"}	2026-04-13 14:40:49.645779
\.


--
-- Data for Name: recommendation_placements; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.recommendation_placements (id, code, name, status, placement_type, config_json, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: recommendation_studio_publications; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.recommendation_studio_publications (id, version, status, payload_json, published_by, published_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: return_requests; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.return_requests (id, borrow_order_id, note, status, created_at, updated_at) FROM stdin;
1	2	已阅读完毕，准备归还到东区主书柜	created	2026-04-13 02:30:15.682766	2026-04-13 02:30:15.682766
2	4	借阅周期结束，等待老师统一归还	created	2026-04-13 11:30:15.682766	2026-04-13 11:30:15.682766
3	8	课程展示结束后统一归还到南区副书柜	created	2026-04-13 08:30:15.682766	2026-04-13 08:30:15.682766
4	9	工作流课程项目已结束，计划归还到西区流通柜。	created	2026-04-12 22:30:15.682766	2026-04-12 22:30:15.682766
5	14	自动化脚本演示完成，等待机器人回收。	created	2026-04-13 04:30:15.682766	2026-04-13 04:30:15.682766
6	16	指标复盘会结束后统一归还。	created	2026-04-13 09:30:15.682766	2026-04-13 09:30:15.682766
7	18	学习空间共创结束后归还到北区研修柜。	created	2026-04-13 12:00:15.682766	2026-04-13 12:00:15.682766
\.


--
-- Data for Name: robot_status_events; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.robot_status_events (id, robot_id, task_id, event_type, metadata_json, created_at) FROM stdin;
1	2	2	order_created	{"borrow_status": "created", "borrow_order_id": 4, "delivery_target": "二楼研讨间 04"}	2026-04-09 14:30:15.682766
2	2	2	order_progressed	{"borrow_status": "delivering", "borrow_order_id": 4, "delivery_target": "二楼研讨间 04"}	2026-04-09 15:30:15.682766
3	2	2	order_progressed	{"borrow_status": "completed", "borrow_order_id": 4, "delivery_target": "二楼研讨间 04"}	2026-04-09 18:30:15.682766
4	1	1	order_created	{"borrow_status": "created", "borrow_order_id": 1, "delivery_target": "三楼南阅览区 A 区"}	2026-04-13 08:30:15.682766
5	1	1	order_progressed	{"borrow_status": "delivering", "borrow_order_id": 1, "delivery_target": "三楼南阅览区 A 区"}	2026-04-13 13:50:15.682766
6	2	3	order_progressed	{"borrow_status": "delivered", "borrow_order_id": 5, "delivery_target": "一楼服务台"}	2026-04-13 13:00:15.682766
7	2	3	admin_correction	{"borrow_status": "delivered", "borrow_order_id": 5, "delivery_target": "一楼服务台"}	2026-04-13 13:25:15.682766
8	1	4	order_created	{"borrow_status": "created", "borrow_order_id": 6, "delivery_target": "北区教师研修室"}	2026-04-13 10:00:15.682766
9	1	4	order_progressed	{"borrow_status": "delivering", "borrow_order_id": 6, "delivery_target": "北区教师研修室"}	2026-04-13 14:08:15.682766
10	1	5	order_created	{"borrow_status": "created", "borrow_order_id": 8, "delivery_target": "数字媒体实验室"}	2026-04-10 12:30:15.682766
11	1	5	order_progressed	{"borrow_status": "delivering", "borrow_order_id": 8, "delivery_target": "数字媒体实验室"}	2026-04-10 15:30:15.682766
12	1	5	order_progressed	{"borrow_status": "completed", "borrow_order_id": 8, "delivery_target": "数字媒体实验室"}	2026-04-10 18:30:15.682766
13	3	6	order_created	{"borrow_status": "created", "borrow_order_id": 10, "delivery_target": "信息学院实验中心"}	2026-04-13 10:50:15.682766
14	3	6	order_progressed	{"borrow_status": "delivering", "borrow_order_id": 10, "delivery_target": "信息学院实验中心"}	2026-04-13 14:12:15.682766
15	2	7	order_created	{"borrow_status": "created", "borrow_order_id": 11, "delivery_target": "艺术学院展厅准备区"}	2026-04-12 10:30:15.682766
16	2	7	order_progressed	{"borrow_status": "delivered", "borrow_order_id": 11, "delivery_target": "艺术学院展厅准备区"}	2026-04-13 12:20:15.682766
17	2	7	admin_correction	{"borrow_status": "delivered", "borrow_order_id": 11, "delivery_target": "艺术学院展厅准备区"}	2026-04-13 12:40:15.682766
18	1	8	order_created	{"borrow_status": "created", "borrow_order_id": 14, "delivery_target": "西区运营工位"}	2026-04-07 12:30:15.682766
19	1	8	order_progressed	{"borrow_status": "delivering", "borrow_order_id": 14, "delivery_target": "西区运营工位"}	2026-04-07 17:30:15.682766
20	1	8	order_progressed	{"borrow_status": "completed", "borrow_order_id": 14, "delivery_target": "西区运营工位"}	2026-04-07 20:30:15.682766
21	3	9	order_created	{"borrow_status": "created", "borrow_order_id": 16, "delivery_target": "二楼数据分析室"}	2026-04-11 11:30:15.682766
22	3	9	order_progressed	{"borrow_status": "delivering", "borrow_order_id": 16, "delivery_target": "二楼数据分析室"}	2026-04-11 18:30:15.682766
23	3	9	order_progressed	{"borrow_status": "completed", "borrow_order_id": 16, "delivery_target": "二楼数据分析室"}	2026-04-11 20:30:15.682766
24	2	10	order_created	{"borrow_status": "created", "borrow_order_id": 17, "delivery_target": "北区云原生工坊"}	2026-04-13 12:10:15.682766
25	2	10	order_progressed	{"borrow_status": "delivering", "borrow_order_id": 17, "delivery_target": "北区云原生工坊"}	2026-04-13 14:21:15.682766
26	3	11	order_created	{"borrow_status": "created", "borrow_order_id": 18, "delivery_target": "学习共享空间 3A"}	2026-04-09 08:30:15.682766
27	3	11	order_progressed	{"borrow_status": "delivering", "borrow_order_id": 18, "delivery_target": "学习共享空间 3A"}	2026-04-09 16:30:15.682766
28	3	11	order_progressed	{"borrow_status": "completed", "borrow_order_id": 18, "delivery_target": "学习共享空间 3A"}	2026-04-09 18:30:15.682766
\.


--
-- Data for Name: robot_tasks; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.robot_tasks (id, robot_id, delivery_order_id, status, path_json, reassigned_from_task_id, failure_reason, attempt_count, created_at, updated_at, completed_at) FROM stdin;
1	1	1	carrying	\N	\N	\N	0	2026-04-13 08:30:15.682766	2026-04-13 14:22:15.682766	\N
2	2	2	completed	\N	\N	\N	0	2026-04-09 14:30:15.682766	2026-04-09 18:30:15.682766	2026-04-09 18:30:15.682766
3	2	3	returning	\N	\N	\N	0	2026-04-12 18:30:15.682766	2026-04-13 13:20:15.682766	\N
4	1	4	carrying	\N	\N	\N	0	2026-04-13 10:00:15.682766	2026-04-13 14:08:15.682766	\N
5	1	5	completed	\N	\N	\N	0	2026-04-10 12:30:15.682766	2026-04-10 18:30:15.682766	2026-04-10 18:30:15.682766
6	3	6	carrying	\N	\N	\N	0	2026-04-13 10:50:15.682766	2026-04-13 14:12:15.682766	\N
7	2	7	returning	\N	\N	\N	0	2026-04-12 10:30:15.682766	2026-04-13 12:40:15.682766	\N
8	1	8	completed	\N	\N	\N	0	2026-04-07 12:30:15.682766	2026-04-07 20:30:15.682766	2026-04-07 20:30:15.682766
9	3	9	completed	\N	\N	\N	0	2026-04-11 11:30:15.682766	2026-04-11 20:30:15.682766	2026-04-11 20:30:15.682766
10	2	10	carrying	\N	\N	\N	0	2026-04-13 12:10:15.682766	2026-04-13 14:21:15.682766	\N
11	3	11	completed	\N	\N	\N	0	2026-04-09 08:30:15.682766	2026-04-09 18:30:15.682766	2026-04-09 18:30:15.682766
\.


--
-- Data for Name: robot_units; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.robot_units (id, code, status, battery_level, heartbeat_at, created_at, updated_at) FROM stdin;
1	BOT-01	carrying	100	\N	2026-04-11 14:30:15.682766	2026-04-13 14:22:15.682766
2	BOT-02	returning	100	\N	2026-04-10 14:30:15.682766	2026-04-13 14:16:15.682766
3	BOT-03	carrying	100	\N	2026-04-12 14:30:15.682766	2026-04-13 14:25:15.682766
\.


--
-- Data for Name: search_logs; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.search_logs (id, reader_id, query_text, query_mode, created_at) FROM stdin;
1	1	AI 管理 入门	natural_language	2026-04-13 07:30:15.682766
2	1	后台 指挥台 设计	natural_language	2026-04-13 09:30:15.682766
3	2	产品 数据密集	keyword	2026-04-12 14:30:15.682766
4	2	推荐系统 实战	keyword	2026-04-12 23:30:15.682766
5	3	自动化 脚本	natural_language	2026-04-13 02:30:15.682766
6	3	校园 系统 架构	keyword	2026-04-13 03:30:15.682766
7	4	OCR 数字化	keyword	2026-04-13 05:30:15.682766
8	4	交互 设计 入门	natural_language	2026-04-13 06:30:15.682766
9	5	权限 系统 治理	keyword	2026-04-13 10:10:15.682766
10	5	图书馆 服务 蓝图	natural_language	2026-04-13 10:50:15.682766
11	6	交互 节奏 设计	keyword	2026-04-13 00:30:15.682766
12	6	边缘 设备 运维	keyword	2026-04-13 01:15:15.682766
13	7	工作流 自动化 协同	natural_language	2026-04-12 10:30:15.682766
14	7	流程 编排 设计	keyword	2026-04-12 12:30:15.682766
15	8	安全 权限 运营	keyword	2026-04-13 10:40:15.682766
16	8	云原生 运维	natural_language	2026-04-13 11:50:15.682766
17	9	领导力 服务 协作	keyword	2026-04-12 08:30:15.682766
18	9	指标 看板 设计	natural_language	2026-04-11 10:30:15.682766
19	10	数据库 容灾	keyword	2026-04-13 05:00:15.682766
20	10	云原生 发布 治理	keyword	2026-04-13 12:20:15.682766
21	11	服务地图 旅程	natural_language	2026-04-13 08:15:15.682766
22	11	学习空间 设计	keyword	2026-04-09 10:30:15.682766
23	12	自动化 脚本 案例	keyword	2026-04-07 13:30:15.682766
24	12	知识检索 提示词	natural_language	2026-04-12 20:30:15.682766
25	1	服务 触点 后台 协同	natural_language	2026-04-13 12:30:15.682766
26	2	媒体 资产 编目	keyword	2026-04-11 08:30:15.682766
27	5	学习空间 知识 服务	natural_language	2026-04-13 13:10:15.682766
28	6	数据库 可靠性	keyword	2026-04-13 07:00:15.682766
29	1		keyword	2026-04-13 14:38:22.897745
30	1		keyword	2026-04-13 14:40:49.643514
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.system_settings (id, setting_key, value_type, value_json, description, created_by, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: topic_booklist_items; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.topic_booklist_items (id, topic_booklist_id, book_id, rank_position, note, created_at) FROM stdin;
\.


--
-- Data for Name: topic_booklists; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.topic_booklists (id, slug, title, description, status, audience_segment, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tutor_document_chunks; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.tutor_document_chunks (id, profile_id, document_id, chunk_index, content, content_tsv, embedding, metadata_json, created_at) FROM stdin;
1	1	1	0	# 运营自动化脚本集\n\ntitle: 运营自动化脚本集\nauthor: 闻一舟\nkeywords: 自动化, 脚本, 运营\nsummary: 面向馆务与运营场景的自动化脚本案例合集。	运营自动化脚本集 title 运营自动化脚本集 author 闻一舟 keywords 自动化 脚本 运营 summary 面向馆务与运营场景的自动化脚本案例合集	[0,0,0,0,0,0,0,0,0,0,0,0,0,-0.03019606,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.03019606,-0.057647023,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.028823512,0,-0.057647023,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.12078424,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03019606,0,0,0,0,0,0,0,0,0,0,0,-0.016470578,0,0.06039212,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.02196077,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.090588175,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.2305881,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.06039212,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.028823512,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.06039212,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.057647023,0,-0.06039212,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.11529405,0,0,-0.03019606,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.2305881,0.06039212,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.06039212,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.057647023,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.17294107,0,0,0,-0.06039212,0,0,0,0,-0.11529405,0,0,0,0,0,0,0,0,-0.18117635,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0370588,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.11529405,0,-0.03019606,0,0,0,0,0,-0.028823512,0,0,-0.057647023,0,0,0,0,0,0,0,0,0,0,0,0,0,0.057647023,0,0,0,0,0,0,0,0,0,0,0,-0.057647023,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.028823512,0,0,0,0,0,0,0,0,0,0,0,0,0.028823512,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03019606,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0713725,0,0,0,0,0,0,0,0,0,0,0,0,0.06039212,0,0,0.03019606,0,0,0,0,0,0,0,0,0.028823512,0,0,0,0,0,-0.034313705,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.12078424,0,0.057647023,0,0,0,0,0,0,0.03019606,0,0,0,0,0,0,0,0,0,0,0,0,0,0.028823512,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03019606,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.038431346,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.2305881,0,0,0,0,0,0,0,0,0,0,0,0.03019606,0,0,0,0,0,0,0.057647023,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.028823512,-0.06039212,0,0,0,0,0,0.24156848,0,-0.03019606,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.24156848,0,0,0,0,0,0,-0.12078424,0,0,0,0,0,0,0.03019606,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.057647023,-0.028823512,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.028823512,0,0,0,0,-0.06039212,0,0,0,0,0,0.03019606,-0.12078424,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.11529405,0,0,0,0,0,0,0,0,0,0,0,0,-0.24156848,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.2305881,0,0,0,0,-0.2305881,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.028823512,0.2305881,0,0,0,0,0,0.010980385,0,-0.11529405,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.057647023,0,0,0,0,0,0,-0.057647023,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06039212,0,0,0,0,0,0.24156848,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06039212,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.2305881,0,0,0,0,0,0,-0.028823512,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03019606,0,-0.06039212,0,-0.11529405,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0741176,0,0,0,0,0,0,0,0,0,0,0,0,0.028823512,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.028823512,0,0.11529405,-0.06039212,0,0,0,0,0,0,0.12078424,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08647054,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.12078424,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03019606,0.06039212,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]	{"length": 91}	2026-04-13 14:38:27.339275
2	2	2	0	直接点击进入： \n \n \n \n大家网考研论坛，精品资源，精彩学术探讨，欢迎考研考生的光临 \n \n \n考研政治复习资料大全&考研政治备考指导 !!! \n \n \n考研英语精华资料大全 \n \n \n考研英语备考战略指导：提纲挈领式的方法+资料推荐，让你备考少走弯路！ \n \n \n考研数学精华资料大全：教材+真题+辅导班视频及讲义~~~！\n\n直接点击进入： \n \n \n \n大家网考研论坛，精品资源，精彩学术探讨，欢迎考研考生的光临 \n \n \n考研政治复习资料大全&考研政治备考指导 !!! \n \n \n考研英语精华资料大全 \n \n \n考研英语备考战略指导：提纲挈领式的方法+资料推荐，让你备考少走弯路！ \n \n \n考研数学精华资料大全：教材+真题+辅导班视频及讲义~~~！	直接点击进入 大家网考研论坛 精品资源 精彩学术探讨 欢迎考研考生的光临 考研政治复习资料大全 考研政治备考指导 考研英语精华资料大全 考研英语备考战略指导 提纲挈领式的方法 资料推荐 让你备考少走弯路 考研数学精华资料大全 教材 真题 辅导班视频及讲义 直接点击进入 大家网考研论坛 精品资源 精彩学术探讨 欢迎考研考生的光临 考研政治复习资料大全 考研政治备考指导 考研英语精华资料大全 考研英语备考战略指导 提纲挈领式的方法 资料推荐 让你备考少走弯路 考研数学精华资料大全 教材 真题 辅导班视频及讲义	[0.018439194,0,0,0,0,0.07375678,0,0,-0.115903504,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.07375678,0.0386345,0,-0.018439194,0,0,0,0,0,0,0,0,-0.057951752,0,0,0,0,0,-0.03687839,0,0,0,0,0,0,0.0386345,0,0,0,-0.03687839,0.01931725,0,0,0.018439194,-0.018439194,0,0,-0.018439194,0,0,0,-0.0386345,0,0,0,0,0,0,0,0,0,0,-0.018439194,0,0,0,0,0,0,-0.07375678,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0386345,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03687839,0,0,0,0,0,0,0,0,0,0,0,-0.018439194,0,0,0,0,0,0.03687839,0,0,0,0,0,0.01931725,0,0,0,0.0386345,0,0,0.03687839,0.0386345,0,0,0,0,0,0.01931725,0,0,0,0,0,0,0,0,0,0,0,-0.07375678,0,0,-0.03687839,0,0,0,0,0,-0.0386345,0,0,-0.018439194,0,0,0,0,-0.018439194,0.05619564,0,0,0,0,0,0,0,-0.18439195,0,0,0,0,0,0,-0.018439194,0,0,0,0.01931725,0,0.018439194,0,0,-0.0386345,0,0,-0.018439194,0.03687839,-0.09307403,0,0,0.018439194,0,0,0,0,0.0386345,0,0,0,-0.01931725,0,0,0,0,0,-0.01931725,0,0,0,0,0.077269,0,0,0.01931725,-0.0386345,0,0,0,0,0,0,0,0,0.03687839,0,0,0,0,0,-0.01931725,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.018439194,0,0,0.0386345,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.01931725,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0386345,0,0,-0.0386345,0,0.077269,0,-0.018439194,0,0.03687839,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.01931725,0,0,0,0.03687839,0,-0.0386345,0,0,0,0,0,0,0,0,0,0,0.0386345,0,0,0,0,0.01931725,-0.01931725,0,0,-0.03687839,0,0,0,0,0,-0.018439194,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03687839,0,0,0,0,0,0,0.018439194,0,0,0,0,0,0,0,0,0,0,0,0.01931725,0,0,0,0.0386345,0,-0.018439194,0,0,0,0,0,0,0.018439194,0,0,0,0,0,0,0,0,0,0,0,0.03687839,0,0,0,0,0,0,-0.0386345,-0.03687839,0.01931725,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0386345,0,0,0,0,0,0,0,0,0,0,0.0386345,0,-0.01931725,0,0,0,0,0.0386345,0,0,0,0,-0.0386345,0,0.01931725,-0.03687839,0,0,0,0,0.46361402,0,0,0,0,0.057951752,0,0,0.14751355,-0.018439194,0,0,0,-0.017561138,0,0,0,0,0,0,0,0,0.05619564,0,0,0,0,0,0,0,0,0,0,0.03687839,0,0,0,0,0,0,0,0,0,0,0,0,-0.0386345,0,0,0,0,0,0,0,-0.0386345,0,0,0,0,0,0,0,-0.018439194,0,-0.018439194,0.01931725,0,0,0,0,0,0,0,0.01931725,0,0,0.0386345,0,0,-0.018439194,0,-0.01931725,0.01931725,0,0,0,0,0,0,0,0,0,0,0,0.01931725,0,0,0,0,0,0,-0.03687839,0,0,0,0,0.0386345,0,-0.03687839,0,-0.0386345,0,0,0,0,0,0,0,-0.03687839,0,0.0386345,-0.077269,0,0,0,0.018439194,0,0,0,0,0.03687839,0,0,0,-0.11063517,0,0,0,0,0,-0.0386345,0,0,0.018439194,0,0,0,0,0,-0.0386345,0,0,0,0,0,0,0,0.03687839,0,0,0,0,0,0,0,0,0,0,0.01931725,0,0,0,0.077269,0,0,0,0,0,0,-0.0386345,-0.01931725,0,0,0,0,0,0,-0.03687839,0,0,0,0,0,0,0,0,0.0017561137,0.25814873,0,0,0,0,0,0,0,0,0.03687839,0,0,0.115903504,0,0,0.07375678,0,0.03687839,0,0,0,-0.115903504,0,0,0,0,0.03687839,0,0,0,-0.01931725,0.03687839,0,-0.03687839,0,0,0.0386345,0,0,0,0,-0.03687839,0,0,0,0,0,0,0,0,0,0,-0.03687839,0,0,0.01931725,0,0,0,0,0.018439194,-0.0386345,0,0,0,0.01931725,0,-0.01931725,0,0,0,0,0,0,0.077269,0,0,0.01931725,0,0,0,0,0,0,-0.018439194,0.03687839,0,0,0,0,0,0,0,0,-0.03687839,0,0,-0.03687839,0,-0.01931725,0.0386345,0,0,0,0.01931725,0,0,0,0,-0.0386345,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.01931725,0,0,0.01931725,0,0,0,0,0,0,-0.01931725,0,-0.01931725,0,0,0,0,-0.055317584,0.055317584,-0.14751355,0,0,0,0.13522075,0,0,-0.055317584,0,0.0386345,0,0,0,0,0,-0.01931725,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03687839,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0386345,0,0,0,0,-0.018439194,0,0,0,0,0,0,0,0,0,0,0,0,0.057951752,0,0,0,0,0,0,0,0,0,0,0,0,0.07375678,0,0,0,0.01931725,0,0,-0.077269,0,0,0,0,0,0,0,0,0,-0.0386345,0,0,0,0,0,0.01931725,0,0,0,0,0,0,0,0,0,0.018439194,0,0,0.03687839,0,0,-0.0386345,0,0,0,0,0,0,0,0,-0.03687839,0,0,0,0,0,0,0.03687839,0,0,0,0,0,0,0,0,0,0,-0.14926967,0,0,0,0,0.03687839,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.018439194,0,0.20283113,0,0,0,0,0,-0.03687839,0,0,0.0386345,0,0,0,0,0,0,0,0,0,0,-0.01931725,0,0.03687839,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03687839,0,0,0,0,0,0.0386345,0,0,0,-0.01931725,0,0,0,0,0,0,0,0,0,0,0,0,-0.03687839,0.07375678,0,-0.0386345,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.018439194,0,0,0,0,0,0,0,-0.018439194,-0.03687839,0,0.0386345,0,0.0386345,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.03687839,0,0,0.03687839,0,0,0,0.01931725,0,0,0,0.0386345,-0.018439194,0,0,0,0,-0.0386345,0,0,0,0,0,0,0,0,0,0,0.077269,0,0,0,0,0,0,-0.01931725,-0.01931725,-0.11063517,0,0,0,0,0,0,0,0,0,0.018439194,0.03687839,0.01931725,0,0,0,0,0,0,0,0,0,0,0,-0.07375678,0,0,0,0,0,0,-0.01931725,0,0,0,-0.01931725,0,0,0,0,0,-0.01931725,0,0,0,0,0,0,0,0.03687839,0,0,0,0,0,-0.018439194,0,0,0,0,0,0,0,-0.0386345,0,0,0,0,0,0,0,0,0,0,0,-0.018439194,0,0,0,0,0.07375678,0,0,0.0386345,0,0,0,0,0,0,0,0,0,0,0,0,0,0.018439194,0,0,0,0,0,0,0.0386345,0,0.03687839,0,-0.01931725,0,0,0,0,0.0386345,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03687839,0,0,0,-0.03687839,0,0,0,0,0,0,0,0,0,0,0,-0.03687839,0,0,0,-0.14751355,0,0,0,0,0,0.0386345,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0386345,0,0,0,0,0,0,0,0,0,0,-0.018439194,0,0,-0.057073697,0,0,-0.057951752,0,0,-0.15541607,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.07375678,-0.0386345,0,0.0386345,0,0,0,0,0.09219597,0,0,0,0,0.037756447,-0.018439194,0,0,0,0,0,0.018439194,0,0,0,0,0,0,0,-0.0386345,-0.0386345,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.07375678,0.0386345,0,0,0,0,0,0,0,0,0,0,0,0.2704415,-0.03687839,0,0,0,0,0,-0.018439194,-0.018439194,0,0,0,-0.018439194,0,0,-0.0386345,0,0,-0.03687839,0,0,0,0,0,0,-0.01931725,0,0,0,0,0,0,0,0,-0.01931725,0,0,0,0,0,0,-0.077269,0,0,0.0386345,0,0.01931725,0,0,0,0,0,0.0386345,0,0.01931725,0,0,-0.0386345,0,-0.0386345,0.0386345,0,-0.03687839,0,0,0,0.12907436,0,0,0,0,0,0,0,0,0,0,0,0,-0.01931725,0,-0.03687839]	{"length": 330}	2026-04-13 14:38:48.742874
3	3	3	0	BEN  YAHIA  MERIEM     English  to  Arabic  &  French  Localization  Specialist  |  E-commerce,           Games  &  MTPE  +86  18186006623  meriem _ mimi @163.com  Wuhan,China \nProfile \nNative  Arabic  and  French  linguist  with  a  trilingual  background  (Arabic,  French,  English),  \nproviding\n \nonline\n \nEnglish\n \nto\n \nArabic\n \nand\n \nFrench\n \ntranslation\n \nand\n \nlocalization\n \nservices.\n \nI\n \nspecialize\n \nin\n \nproducing\n \nfluent,\n \nculturally\n \naccurate\n \ncontent\n \nfor\n \ndigital\n \nplatforms,\n \nincluding\n \ne-commerce,\n \nmarketing,\n \nand\n \napp-related\n \nmaterials.\n \nMy\n \nstrengths\n \ninclude\n \nlocalization,\n \nMT\n \npost-editing,\n \nand\n \nmeticulous\n \nproofreading,\n \nensuring\n \nevery\n \ntext\n \n	ben yahia meriem english to arabic french localization specialist e commerce games mtpe 86 18186006623 meriem _ mimi 163 com wuhan china profile native arabic and french linguist with a trilingual background arabic french english providing online english to arabic and french translation and localization services i specialize in producing fluent culturally accurate content for digital platforms including e commerce marketing and app related materials my strengths include localization mt post editing and meticulous proofreading ensuring every text	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.118067086,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.07977506,0,0,0,0,0,0,0,0.08934806,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.07020205,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04467403,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08934806,0,0,0,0,0,0,0.08615706,0,0,0,0,0,0,0,0,-0.03988753,0,0,-0.08296606,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.16593212,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04148303,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.08934806,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.036696527,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04307853,0,0,0,0,0,0,0,0,0,-0.04467403,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.033505525,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04467403,0,0,0,0,0,0,0.04467403,0,-0.08934806,0.073393054,0,0,0,0,0,0,0,-0.076584056,0,0.36696526,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08934806,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.1404041,0,0,0,0,0,0,0,0,0,0,0.09413457,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04467403,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.035101026,0,0,0,0,-0.08934806,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04307853,0,0,0,0,0,0.01276401,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.17869613,0,0.076584056,0,0,0,0,0,0,0,0,0,0,0.04148303,0,0,0,0,0,0,0,0,0,0,0,0,0.035101026,0,0,0,0,0,0,-0.076584056,0,-0.1292356,0,0,0,0,0,0,0,0,0,0.009573007,0,0,0.07020205,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04467403,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08934806,0,0,0,0,0.08615706,-0.04307853,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.07977506,0,0,0,0,0,0.07020205,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.073393054,0,0,0.076584056,0,0,0.06701105,0,0,0,0.033505525,0,0,0,0,0,0,-0.08296606,-0.03988753,0,0,0,0,0,0,-0.07020205,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.1340221,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.33186424,0,0,0,0.07977506,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.1340221,0,0,-0.08934806,0,0,0,0,0,0,0,0,0,0,0,0,0.035101026,-0.08296606,0,0,0,0,0,0,0,-0.073393054,0,0,0,-0.073393054,0,0,0,0,0,0,-0.33186424,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04467403,0,0,0,0,0,0,0,-0.08934806,0,0.038292028,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.08934806,0,0.08934806,0,0,0,0,0,-0.08296606,0,0,0.08934806,0,0,0,0,0,0,0,-0.04467403,0,0,0,0,-0.036696527,0,0,0,0,0,0,0.06701105,0.038292028,0,0,-0.06701105,0,0,0.08934806,0,0,0,0,0,0,0.08934806,0,0,0,0.038292028,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08934806,-0.036696527,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04307853,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.06701105,-0.03988753,0,0,0,0,0,0,0,0,0,0.08615706,0,0,0,0,0,0,0.03988753,0,0,0,0,0,0.036696527,0,0,0.033505525,0,0,0,0,0.04467403,0,-0.04467403,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.08615706,0,0,0,-0.08934806,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04467403,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04307853,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04467403,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08615706,0,0,0,-0.04467403,0,0,0,0,0.036696527,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04467403,0,0,0,0,0,0,0,0,0,0,-0.08934806,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.07977506,0,0,0,0,0,-0.16593212,0,0,0,0,0,0,0,0,0.08934806,0,0,0,0,-0.07977506,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08296606,0,0,0,0.04467403,0,0,0,0,0,0,0,0,0,0,0.04467403,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.16593212,0.035101026,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04148303,0,0,0.08615706,0,0.038292028,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08934806,0.07020205,0,0,0,0,0,0.04467403,-0.08934806,0,0,0,0.038292028,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]	{"length": 700}	2026-04-13 14:40:58.016884
4	3	3	1	strengths\n \ninclude\n \nlocalization,\n \nMT\n \npost-editing,\n \nand\n \nmeticulous\n \nproofreading,\n \nensuring\n \nevery\n \ntext\n \nreads\n \nnaturally\n \nto\n \nnative\n \nspeakers.\n \nI\n \nam\n \ndetail-oriented,\n \nreliable,\n \nand\n \ncommitted\n \nto\n \ndelivering\n \nhigh-quality\n \nlanguage\n \nsolutions. \n Work  Experience Localization  Specialist  (Remote  Contractor)  (Feb,  2023  -  May,  2024) Shenzhen  LinkWorld  Technology  Solutions  -  Shenzhen \nPartnered  with  the  E-commerce  marketing  team  to  localize  product  listings  for  Consumer  \nElectronics\n \n(Smartwatches\n \n&\n \nAudio\n \ndevices)\n \ntargeting\n \nthe\n \nSaudi\n \nand\n \nUAE\n \nmarkets. Conducted  MTPE  (Machine  Translation  Post-Editing)  on  200,000+  	strengths include localization mt post editing and meticulous proofreading ensuring every text reads naturally to native speakers i am detail oriented reliable and committed to delivering high quality language solutions work experience localization specialist remote contractor feb 2023 may 2024 shenzhen linkworld technology solutions shenzhen partnered with the e commerce marketing team to localize product listings for consumer electronics smartwatches audio devices targeting the saudi and uae markets conducted mtpe machine translation post editing on 200 000	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04897538,0,0,0,0,0,0,0,0.09795076,0,-0.09795076,0,0,0.04897538,0,0,0,0,0,0,0,0,0,0,0,0,-0.04897538,0,0,0,0,-0.08395779,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.11544196,0,0.04897538,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.19590151,0,0,0,0,0,0,0,0,-0.08045955,0,-0.04897538,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08395779,0,0,0,0,0,0,0,0,0,-0.09795076,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.047226258,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04897538,0,0,0,0.040229775,0,0,0,0,0,0,0,0,0,0,0,0,0.04897538,0,0,0,0,0,0.094452515,0,0,0.038480654,0,0,0,-0.043728016,0,0,-0.04897538,0,0,0,0,0,0,0,0,0,0,0,0,-0.041978896,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04897538,0,0,0,0,0,0,-0.038480654,0,0,0,0,0,0,0,0,0,0,0,0.09795076,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04897538,0,-0.09795076,0.08045955,0,0,0,0,0,0,0,-0.08395779,0,0.24137865,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.090954274,0,0.04897538,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.23088393,0,0,0,0,0,0,0,0,0,0,0.120689325,0,0,-0.041978896,0,0,0,0,0,0,0,0,0,0,0,-0.04897538,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04897538,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04897538,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.02623681,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.094452515,0,0,-0.09795076,0,0.08395779,0,0,0,-0.09795076,0,0,0,0,0,0,-0.017491207,0,0,0,0.08045955,0,0,0,0,0.041978896,0,0,0,0.038480654,0,0,0,0,0,0,-0.08395779,0,0,0,0,0,0,0,0,0,0,0,0.19590151,0,0,0,0,0,0,0,0,0,0,0.07696131,0,0,0,0.08045955,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.09795076,-0.09795076,0,0,0,0,0,0.09795076,0,0,0,-0.047226258,0,0,0,0,0,0,0,0,0,0,0.047226258,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.09795076,0,0,0,0,0,0,0,0,0,0,0,0,0.036731534,0,0,0,-0.094452515,0,-0.043728016,-0.090954274,0,0,0,0,-0.1609191,0,0,0,0,0,0,-0.08045955,0,0,0,-0.08745603,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08045955,0.047226258,0,0,0,0.09795076,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.09795076,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.045477137,0,0,0,0,0,0,0,0,0,0,0,0,-0.04897538,0,-0.041978896,0,0,0,0,0,0,0,0,0,0,0.040229775,0,0,0,0,0,0,0,-0.18890503,0.04897538,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04897538,0.09795076,0,0,0,0,-0.04897538,0,0,0,0,0,0,0,-0.07346307,0,0,-0.09795076,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.040229775,0,0,0,0,0,0,0,0,0,0,-0.090954274,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.041978896,0,0,0,-0.04897538,0,0,0,0,0,0,0,0,0,0,0,0,0.09795076,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08745603,0,0,0,0,0,0,0,0,0,0,0,0,0,0.09795076,0,0,0,0,0,0,0,-0.04897538,0,0,0.09795076,0,0,0,0,0,0,0,-0.04897538,0,-0.09795076,0,0,-0.12418757,0,0,0,0,0,0,0.036731534,0.041978896,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.041978896,0,0,0.094452515,0,-0.09795076,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.041978896,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.09795076,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.09795076,-0.040229775,0,0,0.04897538,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04897538,-0.1609191,-0.043728016,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.047226258,0,0,0,0,0,0,0,0,0,0,0,0,0,0.09795076,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.08395779,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.08395779,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04897538,0,0,0,0,0,0,0,0,0.09795076,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04897538,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.09795076,0,0,0,0,0,0,0,0,0,0,0,0,-0.18890503,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.19590151,0,0,0,0,0,0,0,0,0,0,0,0,0.09795076,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04897538,0,0,0,0,-0.08745603,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.047226258,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.045477137,0,0,0,0,0,0,0,0,0,0,0.040229775,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.122438446,0,0,0.094452515,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04897538,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.07696131,0,0.09795076,0,0,0,0,-0.09795076,0,0,0,0.08395779,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]	{"length": 700}	2026-04-13 14:40:58.016888
5	3	3	2	)\n \ntargeting\n \nthe\n \nSaudi\n \nand\n \nUAE\n \nmarkets. Conducted  MTPE  (Machine  Translation  Post-Editing)  on  200,000+  words,  correcting  \ngrammatical\n \nerrors\n \nin\n \nmachine-translated\n \nArabic\n \nto\n \nensure\n \nnative\n \nfluency\n \nand\n \ncultural\n \nrelevance. Created  French  subtitles  for  product  promotional  videos  used  on  TikTok  and  YouTube  Shorts  to  \nengage\n \nFrancophone\n \nAfrican\n \naudiences. Maintained  a  glossary  of  technical  terms  to  ensure  consistency  across  user  manuals  and  \ninterface\n \n(UI)\n \nstrings. \n Freelance  Business  Interpreter  (Arabic/French)  (Jun,  2024  -  Nov,  2025) Guangzhou  Sino-Arab  Bridge  Trading  Co.,  Ltd  -  Guangzhou \nServed  as  th	targeting the saudi and uae markets conducted mtpe machine translation post editing on 200 000 words correcting grammatical errors in machine translated arabic to ensure native fluency and cultural relevance created french subtitles for product promotional videos used on tiktok and youtube shorts to engage francophone african audiences maintained a glossary of technical terms to ensure consistency across user manuals and interface ui strings freelance business interpreter arabic french jun 2024 nov 2025 guangzhou sino arab bridge trading co ltd guangzhou served as th	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.045977447,0,0,0,-0.045977447,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.044335395,0,0,0,0,0,0,0,0,0,0,0,-0.07225027,0,0,0,0,0,0,0,-0.10837541,0,0,0,0,0,0,0,0,0.03940924,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.037767187,0,0,0,0.036125135,0,0,0,0,0,0,0,0,0,0,0,0,0,0.08867079,0,0,0,0,-0.044335395,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.085386686,0,0,0,0,0,0,0,0,0,0,-0.085386686,0,0,-0.091954894,0,0,0,0,0,0.036125135,0,0,0,-0.04105129,0,0,0,0,0,0,0,0,0,-0.091954894,0,0,0,0,0,0,0,-0.085386686,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.091954894,0,0,0,0,0,-0.044335395,0,0,0,0,0.037767187,0,0,0,0,0,0,0,0.045977447,0,0,0,0,0,0.08210258,0,0,0,0,0.044335395,0,0,0,0,0,0,0,0,0,-0.045977447,0,-0.045977447,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.037767187,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.07225027,0.03940924,0,0,0,0,0,0,0,0,0,0,0.085386686,0,0,0.042693343,0,0,0,0,0,0.045977447,0,0,-0.091954894,0,0,0.091954894,-0.091954894,0,0,0,-0.085386686,0,0,0,0,0,0.07553437,0,0,0,0,0,0,0,0,0,0.3021375,0,0,0,0,0,0,0,0,0,0,-0.042693343,0,-0.042693343,0,0,0,0,-0.045977447,0,0,0,0,0,-0.091954894,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.042693343,0,0,0,0,0,0,0.07881848,0,0.085386686,0,0,0,-0.21675082,0,0,0,0,0,0,0,0,0,0,0.15106875,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.045977447,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.091954894,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.037767187,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04105129,0,0.08867079,0,0,-0.042693343,0.091954894,0.07881848,0,0,0,0,0,0,0,0,0,0,0.07553437,0,0,0,0,0,0,0,-0.07553437,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.045977447,0,0,-0.03940924,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.07553437,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.091954894,0,0,0,0,0,0,0,0,0,0.045977447,0.045977447,0,0,0,0,-0.044335395,0,-0.08867079,0,0,0,0,0,0.044335395,0,0,0,0,-0.08867079,0,0,0,0,0,0,0,0,0,0,0.085386686,0,0,0,0,0,0,0,0,-0.07881848,0.045977447,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.091954894,0,0,0,0,0,-0.085386686,0,0,0,0,-0.07553437,0,0,-0.07225027,0,0,0,-0.07553437,0,0.036125135,0,0,0,0,0,0,0,0,0,0,0,0,0.045977447,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.044335395,0.07881848,0,0,0,0,0,0,0.045977447,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.042693343,0,0.091954894,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.26601237,-0.091954894,0,0,0,0,0,0,0,-0.17077337,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.091954894,0,0,0,-0.091954894,0.03940924,0,0,0,0,0,0,0,0,0,0,0,0.036125135,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.17077337,0,0,0,0,0,0.07225027,0,0,-0.091954894,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.085386686,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.044335395,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08210258,0,0,0,0,0,0,-0.07225027,0,0,0,0,0,0,0,0,0.07881848,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08210258,0,0,-0.037767187,0,0,0,0,0,0,0,0,0,0,-0.068966165,0,0,-0.07881848,0,0,0,0.091954894,0,0,0,0,0,0,0.03940924,0,0,0,0,0,0,0,0,0,0,0,0,-0.045977447,0,0,-0.07553437,0,0,0,-0.03940924,0,0,0,0,0,0,0,0.091954894,0,0,0,0,0,0,0,0,0,0,0.085386686,0,0.17077337,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.091954894,-0.037767187,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.034483083,0,0,0,0,0,0.08867079,0,0,0,0,0,0,0,0,0,0.07553437,0,0.085386686,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.08867079,-0.091954894,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.045977447,0,0,0,0.07881848,0,0,0,0,0,0.045977447,0,0,0,0,0,0,0,-0.08867079,0,0,0,0,0,0,0,0.07225027,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.037767187,0,0,0,0,0,-0.08867079,0,0,0,0,0,-0.08867079,0,0.044335395,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.18390979,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08867079,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.042693343,0,0,0,0,0,0,0,0,-0.045977447,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.044335395,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.037767187,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.036125135,0,0,0,0,0,0,0,0,0,-0.03940924,0,0,0,0.07225027,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.036125135,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.085386686,0,0,0.037767187,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.18719389,0,0,0.045977447,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.045977447,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03940924,0,0,0,0,0,0,0,0,-0.042693343,0,0,0,0,0,0,0,0,0,0]	{"length": 700}	2026-04-13 14:40:58.016889
6	3	3	3	abic/French)  (Jun,  2024  -  Nov,  2025) Guangzhou  Sino-Arab  Bridge  Trading  Co.,  Ltd  -  Guangzhou \nServed  as  the  primary  linguistic  liaison  for  the  company's  North  African  clients  (Tunisia,  Algeria,  \nMorocco)\n \nduring\n \nthe\n \nCanton\n \nFair\n \nand\n \nfactory\n \nvisits\n \nin\n \nFoshan\n \nand\n \nGuangzhou. Provided  consecutive  interpretation  (English/Chinese Arabic/French)  during  price  negotiations,  helping  close  deals  worth  over  $50k  in  construction  \nmaterials\n \nand\n \ntextiles. Translated  commercial  documents  including  invoices,  packing  lists,  and  product  specifications  \nfrom\n \nChinese/English\n \ninto\n \nFrench\n \nand\n \nArabic\n \nfor\n \ncustoms\n \nclearance\n \np	abic french jun 2024 nov 2025 guangzhou sino arab bridge trading co ltd guangzhou served as the primary linguistic liaison for the company s north african clients tunisia algeria morocco during the canton fair and factory visits in foshan and guangzhou provided consecutive interpretation english chinese arabic french during price negotiations helping close deals worth over 50k in construction materials and textiles translated commercial documents including invoices packing lists and product specifications from chinese english into french and arabic for customs clearance p	[0,0,0,0,0,0,0,0,0,-0.08613774,0,0,-0.04306887,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0830614,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.06767965,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.079985045,0,0,0,0,0,0,0,0.08613774,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.106134005,0,0,0,0,0.0830614,0,0,0,-0.012305392,0,0,0,0,0,-0.0415307,0,0,0.0830614,0,0,0,0,-0.0415307,0,0,0,0,0,-0.04306887,-0.08613774,0,0,0,0,0,0,0,0,-0.0769087,-0.19688627,0,0,0,0,0,0,-0.0415307,0,0,0.03845435,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0769087,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.006152696,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.03845435,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.035378,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.036916174,0.04306887,-0.0415307,0,0,0,0,0,0,0,0,0.079985045,0.079985045,0,0.039992522,0,0,-0.079985045,0,0,0,0,0,0,0,0,0,-0.12920661,0,0,0,0,0,0,0,0,0,0.141512,0,0,0,0,0,0,0,0,0,0.35378,0.032301653,0,0,0,0,0,0,0,0,0,0,0,0.0830614,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.07383235,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04306887,0,0,0.17689,0,0,0,0,0,0,0,0,0,-0.0415307,0,0,0,0,0,0,-0.0830614,0,-0.04306887,0,0,0,0,0,0,0,-0.036916174,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0830614,0,0,0,0,0,0,0,0,0,0,0,0.04306887,0,0,0,0,0,0,0,0,0,0,0.04306887,0,0,0,0,0.1661228,0,0,0,0,0,0,0,0,0,0,0,0,0.036916174,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0830614,0,0,-0.039992522,0,0,0,0,0,0,0,0,0,0,0,0.04306887,0,0,0,-0.0830614,0,0,0,0,-0.070756,0,0,0,0,0,0.03845435,0,0,0,0,0,0,0,-0.044607043,0,0,-0.07383235,0,0,-0.036916174,0,0,0,-0.1661228,0,0,0,0,0,0,0,0.036916174,0,0,0,0,0,0,0,0,0,-0.036916174,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08613774,0,0,0,0,0,0,0,0,0,0,-0.0415307,0.0830614,0,0,0,0,0,0,0.0415307,0,0,0,0,0,0,0,0,0,0,0,-0.039992522,0.079985045,0,0,0,0,0,0,0,0,0,0,0,-0.07383235,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.247646,0,0,-0.1353593,0,0,-0.04306887,0,0,0.033839826,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06460331,0,-0.08613774,0,0,0.07383235,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06460331,0,0,-0.23995514,0,0,0,0,0,0,0,0,0,-0.0415307,0,0,0,0,0,0,0,0,0,0,0.16919914,0,0,0,0,0.036916174,0,0,0,0,0,0,0,0,0,0,0,0.06767965,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0769087,-0.03845435,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04306887,0,0,0,0,0,0,0,-0.08613774,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.03845435,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.06767965,0,0,0,0,0,0,0,0,0.039992522,0,0,0,0,0,0,0,0,0,-0.08613774,0,0,0,0,0,0,0,0,0,0,0.07383235,-0.070756,0,0,0,0,0,-0.0415307,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070756,0,0,0,-0.036916174,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0769087,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04306887,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04306887,0,0,0,0,0,0,0,0,0,-0.0415307,0.070756,0,0,0,0.0830614,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0830614,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.07383235,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08613774,0,0,0,0,0,0.035378,0,0,0,0,0,0,0,0,0,0,0,-0.0830614,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0769087,0.08613774,0,-0.25841323,0.07383235,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08613774,0,0,0,0.070756,0,0,0,0,0,0,0,0,0,0,0,0,0.0415307,0,0,0,0,0,0,0,0,0,0,0,-0.0830614,0,0,0,0,0.035378,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08613774,0,0,0,0,0,0,0,0,0,0,0,0.08613774,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.19380991,0,0,0,0,0,0,0,0,0,0,0,-0.036916174,0,0,0,0,0,0,-0.079985045,0,0,0,0,0,0.08613774,0,0,0,-0.0415307,0,0,0,0,0,0,0,0,0,0,0,0.04306887,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0769087,0,0,-0.0415307,0,0,0,-0.04306887,0,0,0,0,0,-0.04306887,0,-0.039992522,0,0,0.0092290435,0,0,0,0,0,0,0,0,0]	{"length": 700}	2026-04-13 14:40:58.01689
7	3	3	4	s,  and  product  specifications  \nfrom\n \nChinese/English\n \ninto\n \nFrench\n \nand\n \nArabic\n \nfor\n \ncustoms\n \nclearance\n \npurposes.\n\nEducation University  of  Carthage  (Feb,  2017  -  Jun,  2021)  Tunis,Tunisa \nBachelor  of  Arts  (B.A.),  Comparative  Literature  &  Translation  Studies  \nGraduated\n \nwith\n \nHonors. Completed  rigorous  multilingual  coursework  in  English,  French,  and  Arabic,  with  a  focus  on  \ncross-\n \ncultural\n \ncommunication,\n \nlinguistics,\n \nand\n \ntranslation. Specialized  in  Comparative  Literature  and  Translation  Studies  (English  Arabic  /  French). \n Beijing  Foreign  Studies  University  (Sept,  2021  -  Jun,  2023) Beijing,China \nMaster  of  Arts  (M.A.)	s and product specifications from chinese english into french and arabic for customs clearance purposes education university of carthage feb 2017 jun 2021 tunis tunisa bachelor of arts b a comparative literature translation studies graduated with honors completed rigorous multilingual coursework in english french and arabic with a focus on cross cultural communication linguistics and translation specialized in comparative literature and translation studies english arabic french beijing foreign studies university sept 2021 jun 2023 beijing china master of arts m a	[0,0,0,0,0,0,0,0,0,-0.0786693,0.0786693,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.03933465,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.070240445,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06743083,0,0,0,0,0,0,0,-0.03933465,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.03933465,0,-0.06743083,0,0,0,0,0,0,0,-0.035120223,0,0.06743083,0,0,0,0,0,0,0,0.070240445,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.1573386,0,0,0,0,-0.1095751,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.09271739,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0786693,0,0,0,0,0,0,0,0,0,0,0.0786693,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0786693,0,-0.11800395,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.06462121,0,0,0,0,0,0,-0.13486166,0,0,0,0,0,0,0,0,0,0,-0.030905796,0,0,0,0,0,0.10536067,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06462121,0,0,0,0,0,0,0,0,0,0.32310605,0.029500987,0,0,0,0,0,0,0,0,0,0,0,0,0.1573386,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.16155303,0,0,-0.033715416,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.033715416,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.07585968,0,0,0,0,0,0,0,0,0,0,0,0.03933465,0,0,0,0,0,0,0.036525033,0,0,0,0,0.06743083,0,0,0,0.07585968,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.07585968,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.07305007,0,0,0,0,0,0,0,0,0.036525033,0,0,0,0,0,0,0,0,0,0,-0.13486166,0,-0.11378952,0,0,0,0,0,0,0,0,0,-0.22757904,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.03792984,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0786693,0,0,0,0,0,0,0,0.0786693,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.123623185,0,0,0,0,0,-0.1573386,0,0,0,0,0,0,0,0,-0.07585968,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.059001975,0,0,-0.06462121,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0786693,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0786693,0,0,0,0,0,0,0,-0.2191502,0,0,0,0,0,0,0,0,0,-0.03792984,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.029500987,-0.2360079,0,0,-0.03933465,0,0,0.0786693,0,0,0,0,0.03933465,0,0.061811592,0,0.032310605,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.18122035,0,0,0,0,0,0.18543477,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.11378952,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.15171936,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.033715416,0,0,0,0,0,0,0,0,-0.0786693,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.07305007,0,0,0.06743083,-0.09974144,0,0,0,0,0,0,0,0.06743083,0,0.0786693,-0.17700593,0,0,0,0,0,0,-0.06743083,0,0,0,0,0,0,0,0,0,0,0,0,0.03933465,0,0,0,0,0,0,0,0,0,-0.12924242,-0.03933465,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0786693,0,0,0,0,0,0,0,0,0,0,0,0,0.03933465,0,0,0,0.03792984,0,0,0,0,0,0,0.03933465,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.059001975,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.088502966,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.070240445,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0786693,0,0,0,0,0,0,0,0,-0.0786693,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0786693,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.07305007,0,0,0,0,0,0,-0.035120223,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.03933465,0,0,0,0,0,0,0,0,0,0,0,0.070240445,0,0,0,0,0.0786693,0,0,0,0,0,0.0786693,0,0,0,0,0,0,-0.035120223,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.13486166,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.036525033,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.03933465,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.03933465,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.059001975,0,-0.22757904,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.033715416,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.035120223,0,0,0,0,0,0,0,0,0,0.03933465,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.033715416,0.03933465,0,0,0,0,0,-0.1095751,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.061811592,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]	{"length": 700}	2026-04-13 14:40:58.01689
8	3	3	5	  French). \n Beijing  Foreign  Studies  University  (Sept,  2021  -  Jun,  2023) Beijing,China \nMaster  of  Arts  (M.A.),  Regional  &  International  Studies Focused  on  economic  relations  between  China  and  the  MENA  region  (Middle  East  &  North  \nAfrica).\n \nConducted\n \nin-depth\n \nresearch\n \non\n \nlocalization\n \nstrategies\n \nfor\n \nChinese\n \nenterprises\n \nexpanding\n \nglobally,\n \nwith\n \nemphasis\n \non\n \ne-commerce\n \nand\n \ndigital\n \nmedia. Integrated  advanced  multilingual  and  linguistic  expertise  with  practical  business  and  trade  \nanalysis\n \nto\n \nsupport\n \nSino–Arab\n \ncommercial\n \ncooperation. \n Skills \n    Translation  \n●  English  →  Arabic  (Expert)  ●  English  →  French	french beijing foreign studies university sept 2021 jun 2023 beijing china master of arts m a regional international studies focused on economic relations between china and the mena region middle east north africa conducted in depth research on localization strategies for chinese enterprises expanding globally with emphasis on e commerce and digital media integrated advanced multilingual and linguistic expertise with practical business and trade analysis to support sino arab commercial cooperation skills translation english arabic expert english french	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0870948,0,0,0,0.097546175,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.1741896,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.048773088,-0.045289297,0,0,0,0,0,0,0,0.097546175,0,0,0,0,0,0,0,0,0,0,-0.03832171,0,0,0,0,0,0,0,0,0,0,0,0,0,0.048773088,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.048773088,0,0,0,-0.048773088,-0.083611004,-0.04006361,0,-0.048773088,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.097546175,0,0,0,0,0,0,0,0,0,0,0,-0.048773088,0,0,0,0,0,0.097546175,0,0,0,0,-0.09057859,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0870948,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.048773088,0,0,0,0,0,0,0,0,0,0,0,0.097546175,0,0,0,0,-0.04006361,0,0,0,0,0,0,-0.083611004,0,0,0,0,0,0,0,0,0.048773088,0,-0.11496513,0.041805502,0,0,0,0,0.13064219,0.048773088,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.08012722,0,0,0,0,0,0,0,0,0,0.32050887,0,0,0,0,0,0,-0.19509235,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.07664342,0,0,0,0,0,0,0,0,0,0,0.16025443,0,0,-0.13586788,0,0,-0.097546175,-0.048773088,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.048773088,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.097546175,0,0,0,0,0,0,-0.048773088,0.041805502,0,0,0,0.09406238,0,-0.048773088,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.097546175,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.16722201,0,-0.0052256878,0,0,0,0,-0.048773088,0,0,0,0,-0.045289297,0,0,0,0,0,0,0,-0.045289297,0,0,0,0,-0.09057859,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.048773088,0,0,0,0,0,0,0.09406238,0,0,0,0,-0.09057859,0,0,0,-0.0435474,0,0,0,0,0,0,0,0,0,0,0,-0.097546175,0,0,0,0,0,0,0,0,0,0,0,0,-0.09406238,0,0,0,0,0,0,-0.03483792,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.08012722,0,0,-0.07664342,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.09406238,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.083611004,0,0,0.048773088,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.041805502,0,0.097546175,0,0,0,0,0,0,0,0,0,0,0,0,-0.045289297,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.18115719,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.07315963,0,0,-0.097546175,0.041805502,0,0,0,0,0,0,0,0,0,0,0,0.03832171,0,0,0,0,0,0,0,0,-0.048773088,0,0,0,0,0,0,0,0,0,0,-0.0435474,0,0,0,0,0,0.07664342,0,0,0,-0.0435474,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.09406238,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.048773088,0.14631926,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.083611004,0,0,0,-0.097546175,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.097546175,0,0,0,0,0,0,0,0,0,0,0,-0.123674616,0,0,0,0,0,0,0.036579814,0.083611004,0,0.097546175,-0.07315963,0,0,0,0,0,0,-0.041805502,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.097546175,0,0,0,0,0,0,0,0,-0.08012722,0,0,0,0,0.04703119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.04703119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.09057859,0,0,0,0,0,0,0,0,0,0,0.07315963,0,0,0,0,0,0,0.0870948,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.036579814,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0870948,0,0,0,0,0,0,0,0,0,0.097546175,0,0,0,0,0,0,0,0,-0.09057859,0,0,0,0,0,0,0,0,0,0,0.09057859,0,-0.048773088,0,0.04703119,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0435474,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.097546175,0,0,0,-0.0870948,0,0,0,0,0,0,-0.048773088,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.083611004,0,0,0,0,0,0,0,0,0.097546175,-0.09406238,0,0.083611004,0,0,0,0,0,0,0.045289297,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.04703119,0,0,0,0,0,0,0,0,0,0,0,0,0.04703119,0,0,0,0,0.097546175,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.09057859,-0.18812476,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.041805502,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.0870948,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.045289297,0,0,0,0,0,0.097546175,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.22993027,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.048773088,0,0,0,0.097546175,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.097546175,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]	{"length": 700}	2026-04-13 14:40:58.01689
9	3	3	6	Sino–Arab\n \ncommercial\n \ncooperation. \n Skills \n    Translation  \n●  English  →  Arabic  (Expert)  ●  English  →  French  (Expert)  ●  French  →  Arabic  (Expert)  \n     Localization  \n●  Localization  Services  (Experienced)  \n     Editing  &  Quality  Assurance  \n●  Machine  Translation  Post-Editing  (MTPE)  (Expert)  ●  Proofreading  &  Editing  (Expert)	sino arab commercial cooperation skills translation english arabic expert english french expert french arabic expert localization localization services experienced editing quality assurance machine translation post editing mtpe expert proofreading editing expert	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.06296302,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.12592603,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.058465656,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.12592603,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.11693131,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.182143,0,0,0,0,0,0,0,0,0,-0.12592603,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0539683,0,0,0,0,0,0.06296302,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.12592603,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06296302,0,0,0,0,0,0,0,0,0,0,0,-0.1079366,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.1079366,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.17089961,0,0,0,0,0,0,0,0,0,0.008994716,0,0,0,0,0,0,0,0,0,0,0,0,-0.58465654,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.12592603,0,0,0,0,0,0,0,0,0,-0.060714334,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.1079366,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.12592603,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.1079366,0,0,0.12592603,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.12142867,0,0,0,0,0,0,0,0,-0.23386262,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.25185207,0.0539683,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.23386262,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.12592603,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0539683,0,0,0.12142867,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.11693131,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.060714334,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.364286,0,0,0,-0.06296302,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06296302,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-0.11693131,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.06296302,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.0539683,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]	{"length": 360}	2026-04-13 14:40:58.016891
\.


--
-- Data for Name: tutor_generation_jobs; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.tutor_generation_jobs (id, profile_id, job_type, status, attempt_count, payload_json, error_message, created_at, updated_at) FROM stdin;
1	1	generate_book_profile	completed	1	{"bookId": 19}	\N	2026-04-13 14:38:27.31257	2026-04-13 14:38:53.308106
2	2	ingest_uploaded_profile	failed	1	{"sourceDocumentId": 2}	Request timed out.	2026-04-13 14:38:43.429557	2026-04-13 14:40:35.044833
3	3	ingest_uploaded_profile	failed	1	{"sourceDocumentId": 3}	Request timed out.	2026-04-13 14:40:57.941484	2026-04-13 14:42:42.681454
\.


--
-- Data for Name: tutor_profiles; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.tutor_profiles (id, reader_id, source_type, book_id, title, teaching_goal, status, persona_json, curriculum_json, source_summary, failure_code, failure_message, created_at, updated_at) FROM stdin;
1	1	book	19	运营自动化脚本集	\N	ready	{"topicName": "运营自动化脚本集", "personaHints": "具备基础计算机操作能力，熟悉日常运营流程，希望提升工作效率但可能缺乏编程经验的运营人员", "targetAudience": "图书馆运营人员、馆务工作者、对自动化脚本感兴趣的运营从业者", "domainSpecificConstraints": "脚本需适用于图书馆等公共文化服务机构的运营场景，考虑数据安全与隐私保护，避免复杂环境依赖，确保易部署和可维护性"}	{"steps": [{"index": 1, "title": "导学与资料概览", "keywords": ["导学", "概览", "目标", "结构"], "guidingQuestion": "这份资料主要解决什么问题？它能帮助我实现什么目标？", "successCriteria": "能够清晰复述资料的核心目标与适用场景。", "learningObjective": "了解本资料的主题、目标与结构，明确学习路径。"}, {"index": 2, "title": "自动化脚本基础概念", "keywords": ["自动化", "脚本", "效率", "价值"], "guidingQuestion": "什么是运营自动化？脚本在其中扮演什么角色？", "successCriteria": "能够解释自动化脚本如何提升馆务与运营工作的效率。", "learningObjective": "理解自动化脚本在运营场景中的基本作用与价值。"}, {"index": 3, "title": "脚本案例学习与应用", "keywords": ["案例", "应用", "场景", "功能"], "guidingQuestion": "这些脚本案例具体能完成哪些任务？我可以在自己的工作中如何应用它们？", "successCriteria": "能够描述至少一个脚本案例的功能及其解决的运营问题。", "learningObjective": "学习并掌握资料中提供的具体脚本案例，理解其应用场景。"}, {"index": 4, "title": "实践与自定义脚本", "keywords": ["实践", "自定义", "修改", "运行"], "guidingQuestion": "如何开始使用这些脚本？如何让脚本更好地适应我的具体工作需求？", "successCriteria": "能够成功运行一个脚本，或提出一个针对自身工作场景的脚本修改思路。", "learningObjective": "尝试运行或根据自身需求修改现有脚本，初步实现流程自动化。"}, {"index": 5, "title": "总结与后续探索", "keywords": ["总结", "回顾", "规划", "探索"], "guidingQuestion": "通过这份资料我学到了什么？接下来我可以在自动化方面继续探索什么？", "successCriteria": "能够总结本资料的核心收获，并列出下一步的学习或实践计划。", "learningObjective": "回顾学习成果，规划后续的自动化学习与实践方向。"}], "title": "运营自动化脚本集", "overview": "《运营自动化脚本集》是一份面向图书馆等运营场景的自动化脚本案例合集，旨在通过实用脚本帮助读者提升日常馆务与运营工作的效率，快速实现流程自动化。"}	《运营自动化脚本集》是一份面向图书馆等运营场景的自动化脚本案例合集，旨在通过实用脚本帮助读者提升日常馆务与运营工作的效率，快速实现流程自动化。	\N	\N	2026-04-13 14:38:27.303237	2026-04-13 14:38:53.310499
2	1	upload	\N	计算机组成原理.pdf	\N	failed	\N	\N	\N	generation_failed	Request timed out.	2026-04-13 14:38:43.357644	2026-04-13 14:40:35.049437
3	1	upload	\N	Meriem_Ben_Yahia_CV.pdf	\N	failed	\N	\N	\N	generation_failed	Request timed out.	2026-04-13 14:40:57.933179	2026-04-13 14:42:42.690006
\.


--
-- Data for Name: tutor_session_messages; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.tutor_session_messages (id, session_id, role, content, citations_json, metadata_json, created_at) FROM stdin;
\.


--
-- Data for Name: tutor_sessions; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.tutor_sessions (id, profile_id, reader_id, status, current_step_index, current_step_title, completed_steps_count, last_message_preview, started_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tutor_source_documents; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.tutor_source_documents (id, profile_id, reader_id, kind, mime_type, file_name, storage_path, extracted_text_path, parse_status, content_hash, metadata_json, created_at, updated_at) FROM stdin;
1	1	1	book_synthetic	text/markdown	book-19.md	\N	artifacts/tutor/reader_1/profile_1/sources/extracted_1.md	parsed	016baa2c3443d27fd1f882a5a9ebaa4d6c6debcb4f9a2036cae0b6c56b0c611c	{"bookId": 19, "bookTitle": "运营自动化脚本集", "chunkCount": 1, "sourceKind": "synthetic-book-metadata"}	2026-04-13 14:38:27.309624	2026-04-13 14:38:53.314761
2	2	1	upload_file	application/pdf	E8-AE-A1-E7-AE-97-E6-9C-BA-E7-BB-84-E6-88-90-E5-8E-9F-E7-90-86.pdf	artifacts/tutor/reader_1/profile_2/uploads/E8-AE-A1-E7-AE-97-E6-9C-BA-E7-BB-84-E6-88-90-E5-8E-9F-E7-90-86.pdf	artifacts/tutor/reader_1/profile_2/sources/extracted_2.md	failed	17493836272b60ed16824b5ad189ab69c7ae49186acb30848a2c0fe9b9ba73d0	{"size": 63816364, "failureCode": "generation_failed", "failureMessage": "Request timed out."}	2026-04-13 14:38:43.424204	2026-04-13 14:40:35.050851
3	3	1	upload_file	application/pdf	Meriem_Ben_Yahia_CV.pdf	artifacts/tutor/reader_1/profile_3/uploads/Meriem_Ben_Yahia_CV.pdf	artifacts/tutor/reader_1/profile_3/sources/extracted_3.md	failed	9504191bb3fd5bdb9b6da92553df4244b6a67cec2147e55d36cb41c3d680aa72	{"size": 304941, "failureCode": "generation_failed", "failureMessage": "Request timed out."}	2026-04-13 14:40:57.938855	2026-04-13 14:42:42.693386
\.


--
-- Data for Name: tutor_step_completions; Type: TABLE DATA; Schema: public; Owner: library
--

COPY public.tutor_step_completions (id, session_id, step_index, confidence, reasoning, message_id, completed_at) FROM stdin;
\.


--
-- Name: admin_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.admin_accounts_id_seq', 1, true);


--
-- Name: admin_action_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.admin_action_logs_id_seq', 1, true);


--
-- Name: admin_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.admin_permissions_id_seq', 1, false);


--
-- Name: admin_role_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.admin_role_assignments_id_seq', 1, false);


--
-- Name: admin_role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.admin_role_permissions_id_seq', 1, false);


--
-- Name: admin_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.admin_roles_id_seq', 1, false);


--
-- Name: alert_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.alert_records_id_seq', 1, false);


--
-- Name: book_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.book_categories_id_seq', 1, false);


--
-- Name: book_copies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.book_copies_id_seq', 40, true);


--
-- Name: book_stock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.book_stock_id_seq', 24, true);


--
-- Name: book_tag_links_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.book_tag_links_id_seq', 1, false);


--
-- Name: book_tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.book_tags_id_seq', 1, false);


--
-- Name: books_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.books_id_seq', 24, true);


--
-- Name: borrow_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.borrow_orders_id_seq', 36, true);


--
-- Name: cabinet_slots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.cabinet_slots_id_seq', 32, true);


--
-- Name: conversation_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.conversation_messages_id_seq', 32, true);


--
-- Name: conversation_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.conversation_sessions_id_seq', 12, true);


--
-- Name: delivery_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.delivery_orders_id_seq', 11, true);


--
-- Name: dismissed_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.dismissed_notifications_id_seq', 1, false);


--
-- Name: favorite_books_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.favorite_books_id_seq', 1, false);


--
-- Name: inventory_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.inventory_events_id_seq', 24, true);


--
-- Name: reader_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.reader_accounts_id_seq', 12, true);


--
-- Name: reader_booklist_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.reader_booklist_items_id_seq', 1, false);


--
-- Name: reader_booklists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.reader_booklists_id_seq', 1, false);


--
-- Name: reader_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.reader_profiles_id_seq', 12, true);


--
-- Name: reading_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.reading_events_id_seq', 36, true);


--
-- Name: recommendation_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.recommendation_logs_id_seq', 44, true);


--
-- Name: recommendation_placements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.recommendation_placements_id_seq', 1, false);


--
-- Name: recommendation_studio_publications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.recommendation_studio_publications_id_seq', 1, false);


--
-- Name: return_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.return_requests_id_seq', 7, true);


--
-- Name: robot_status_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.robot_status_events_id_seq', 28, true);


--
-- Name: robot_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.robot_tasks_id_seq', 11, true);


--
-- Name: robot_units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.robot_units_id_seq', 3, true);


--
-- Name: search_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.search_logs_id_seq', 30, true);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 1, false);


--
-- Name: topic_booklist_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.topic_booklist_items_id_seq', 1, false);


--
-- Name: topic_booklists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.topic_booklists_id_seq', 1, false);


--
-- Name: tutor_document_chunks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.tutor_document_chunks_id_seq', 9, true);


--
-- Name: tutor_generation_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.tutor_generation_jobs_id_seq', 3, true);


--
-- Name: tutor_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.tutor_profiles_id_seq', 3, true);


--
-- Name: tutor_session_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.tutor_session_messages_id_seq', 1, false);


--
-- Name: tutor_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.tutor_sessions_id_seq', 1, false);


--
-- Name: tutor_source_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.tutor_source_documents_id_seq', 3, true);


--
-- Name: tutor_step_completions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: library
--

SELECT pg_catalog.setval('public.tutor_step_completions_id_seq', 1, false);


--
-- Name: admin_accounts admin_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_accounts
    ADD CONSTRAINT admin_accounts_pkey PRIMARY KEY (id);


--
-- Name: admin_action_logs admin_action_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_action_logs
    ADD CONSTRAINT admin_action_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_permissions admin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_pkey PRIMARY KEY (id);


--
-- Name: admin_role_assignments admin_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_role_assignments
    ADD CONSTRAINT admin_role_assignments_pkey PRIMARY KEY (id);


--
-- Name: admin_role_permissions admin_role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_role_permissions
    ADD CONSTRAINT admin_role_permissions_pkey PRIMARY KEY (id);


--
-- Name: admin_roles admin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_pkey PRIMARY KEY (id);


--
-- Name: alert_records alert_records_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.alert_records
    ADD CONSTRAINT alert_records_pkey PRIMARY KEY (id);


--
-- Name: book_categories book_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_categories
    ADD CONSTRAINT book_categories_pkey PRIMARY KEY (id);


--
-- Name: book_copies book_copies_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_copies
    ADD CONSTRAINT book_copies_pkey PRIMARY KEY (id);


--
-- Name: book_stock book_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_stock
    ADD CONSTRAINT book_stock_pkey PRIMARY KEY (id);


--
-- Name: book_tag_links book_tag_links_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_tag_links
    ADD CONSTRAINT book_tag_links_pkey PRIMARY KEY (id);


--
-- Name: book_tags book_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_tags
    ADD CONSTRAINT book_tags_pkey PRIMARY KEY (id);


--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);


--
-- Name: borrow_orders borrow_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.borrow_orders
    ADD CONSTRAINT borrow_orders_pkey PRIMARY KEY (id);


--
-- Name: cabinet_slots cabinet_slots_current_copy_id_key; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.cabinet_slots
    ADD CONSTRAINT cabinet_slots_current_copy_id_key UNIQUE (current_copy_id);


--
-- Name: cabinet_slots cabinet_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.cabinet_slots
    ADD CONSTRAINT cabinet_slots_pkey PRIMARY KEY (id);


--
-- Name: cabinets cabinets_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.cabinets
    ADD CONSTRAINT cabinets_pkey PRIMARY KEY (id);


--
-- Name: conversation_messages conversation_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.conversation_messages
    ADD CONSTRAINT conversation_messages_pkey PRIMARY KEY (id);


--
-- Name: conversation_sessions conversation_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.conversation_sessions
    ADD CONSTRAINT conversation_sessions_pkey PRIMARY KEY (id);


--
-- Name: delivery_orders delivery_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_pkey PRIMARY KEY (id);


--
-- Name: dismissed_notifications dismissed_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.dismissed_notifications
    ADD CONSTRAINT dismissed_notifications_pkey PRIMARY KEY (id);


--
-- Name: favorite_books favorite_books_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.favorite_books
    ADD CONSTRAINT favorite_books_pkey PRIMARY KEY (id);


--
-- Name: inventory_events inventory_events_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.inventory_events
    ADD CONSTRAINT inventory_events_pkey PRIMARY KEY (id);


--
-- Name: reader_accounts reader_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reader_accounts
    ADD CONSTRAINT reader_accounts_pkey PRIMARY KEY (id);


--
-- Name: reader_booklist_items reader_booklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reader_booklist_items
    ADD CONSTRAINT reader_booklist_items_pkey PRIMARY KEY (id);


--
-- Name: reader_booklists reader_booklists_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reader_booklists
    ADD CONSTRAINT reader_booklists_pkey PRIMARY KEY (id);


--
-- Name: reader_profiles reader_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reader_profiles
    ADD CONSTRAINT reader_profiles_pkey PRIMARY KEY (id);


--
-- Name: reading_events reading_events_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reading_events
    ADD CONSTRAINT reading_events_pkey PRIMARY KEY (id);


--
-- Name: recommendation_logs recommendation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.recommendation_logs
    ADD CONSTRAINT recommendation_logs_pkey PRIMARY KEY (id);


--
-- Name: recommendation_placements recommendation_placements_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.recommendation_placements
    ADD CONSTRAINT recommendation_placements_pkey PRIMARY KEY (id);


--
-- Name: recommendation_studio_publications recommendation_studio_publications_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.recommendation_studio_publications
    ADD CONSTRAINT recommendation_studio_publications_pkey PRIMARY KEY (id);


--
-- Name: return_requests return_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_pkey PRIMARY KEY (id);


--
-- Name: robot_status_events robot_status_events_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.robot_status_events
    ADD CONSTRAINT robot_status_events_pkey PRIMARY KEY (id);


--
-- Name: robot_tasks robot_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.robot_tasks
    ADD CONSTRAINT robot_tasks_pkey PRIMARY KEY (id);


--
-- Name: robot_units robot_units_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.robot_units
    ADD CONSTRAINT robot_units_pkey PRIMARY KEY (id);


--
-- Name: search_logs search_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.search_logs
    ADD CONSTRAINT search_logs_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: topic_booklist_items topic_booklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.topic_booklist_items
    ADD CONSTRAINT topic_booklist_items_pkey PRIMARY KEY (id);


--
-- Name: topic_booklists topic_booklists_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.topic_booklists
    ADD CONSTRAINT topic_booklists_pkey PRIMARY KEY (id);


--
-- Name: tutor_document_chunks tutor_document_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_document_chunks
    ADD CONSTRAINT tutor_document_chunks_pkey PRIMARY KEY (id);


--
-- Name: tutor_generation_jobs tutor_generation_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_generation_jobs
    ADD CONSTRAINT tutor_generation_jobs_pkey PRIMARY KEY (id);


--
-- Name: tutor_profiles tutor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_profiles
    ADD CONSTRAINT tutor_profiles_pkey PRIMARY KEY (id);


--
-- Name: tutor_session_messages tutor_session_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_session_messages
    ADD CONSTRAINT tutor_session_messages_pkey PRIMARY KEY (id);


--
-- Name: tutor_sessions tutor_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_sessions
    ADD CONSTRAINT tutor_sessions_pkey PRIMARY KEY (id);


--
-- Name: tutor_source_documents tutor_source_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_source_documents
    ADD CONSTRAINT tutor_source_documents_pkey PRIMARY KEY (id);


--
-- Name: tutor_step_completions tutor_step_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_step_completions
    ADD CONSTRAINT tutor_step_completions_pkey PRIMARY KEY (id);


--
-- Name: admin_role_assignments uq_admin_role_assignment; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_role_assignments
    ADD CONSTRAINT uq_admin_role_assignment UNIQUE (admin_id, role_id);


--
-- Name: admin_role_permissions uq_admin_role_permission; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_role_permissions
    ADD CONSTRAINT uq_admin_role_permission UNIQUE (role_id, permission_id);


--
-- Name: book_stock uq_book_stock_book_cabinet; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_stock
    ADD CONSTRAINT uq_book_stock_book_cabinet UNIQUE (book_id, cabinet_id);


--
-- Name: book_tag_links uq_book_tag_link; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_tag_links
    ADD CONSTRAINT uq_book_tag_link UNIQUE (book_id, tag_id);


--
-- Name: cabinet_slots uq_cabinet_slot_code; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.cabinet_slots
    ADD CONSTRAINT uq_cabinet_slot_code UNIQUE (cabinet_id, slot_code);


--
-- Name: dismissed_notifications uq_dismissed_notification_reader_item; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.dismissed_notifications
    ADD CONSTRAINT uq_dismissed_notification_reader_item UNIQUE (reader_id, notification_id);


--
-- Name: favorite_books uq_favorite_book; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.favorite_books
    ADD CONSTRAINT uq_favorite_book UNIQUE (reader_id, book_id);


--
-- Name: reader_booklist_items uq_reader_booklist_book; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reader_booklist_items
    ADD CONSTRAINT uq_reader_booklist_book UNIQUE (booklist_id, book_id);


--
-- Name: topic_booklist_items uq_topic_booklist_book; Type: CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.topic_booklist_items
    ADD CONSTRAINT uq_topic_booklist_book UNIQUE (topic_booklist_id, book_id);


--
-- Name: ix_admin_accounts_username; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_admin_accounts_username ON public.admin_accounts USING btree (username);


--
-- Name: ix_admin_action_logs_action; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_admin_action_logs_action ON public.admin_action_logs USING btree (action);


--
-- Name: ix_admin_action_logs_admin_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_admin_action_logs_admin_id ON public.admin_action_logs USING btree (admin_id);


--
-- Name: ix_admin_action_logs_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_admin_action_logs_created_at ON public.admin_action_logs USING btree (created_at);


--
-- Name: ix_admin_action_logs_target_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_admin_action_logs_target_id ON public.admin_action_logs USING btree (target_id);


--
-- Name: ix_admin_action_logs_target_type; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_admin_action_logs_target_type ON public.admin_action_logs USING btree (target_type);


--
-- Name: ix_admin_permissions_code; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_admin_permissions_code ON public.admin_permissions USING btree (code);


--
-- Name: ix_admin_role_assignments_admin_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_admin_role_assignments_admin_id ON public.admin_role_assignments USING btree (admin_id);


--
-- Name: ix_admin_role_assignments_role_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_admin_role_assignments_role_id ON public.admin_role_assignments USING btree (role_id);


--
-- Name: ix_admin_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_admin_role_permissions_permission_id ON public.admin_role_permissions USING btree (permission_id);


--
-- Name: ix_admin_role_permissions_role_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_admin_role_permissions_role_id ON public.admin_role_permissions USING btree (role_id);


--
-- Name: ix_admin_roles_code; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_admin_roles_code ON public.admin_roles USING btree (code);


--
-- Name: ix_alert_records_alert_type; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_alert_records_alert_type ON public.alert_records USING btree (alert_type);


--
-- Name: ix_alert_records_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_alert_records_created_at ON public.alert_records USING btree (created_at);


--
-- Name: ix_alert_records_severity; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_alert_records_severity ON public.alert_records USING btree (severity);


--
-- Name: ix_alert_records_source_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_alert_records_source_id ON public.alert_records USING btree (source_id);


--
-- Name: ix_alert_records_source_type; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_alert_records_source_type ON public.alert_records USING btree (source_type);


--
-- Name: ix_alert_records_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_alert_records_status ON public.alert_records USING btree (status);


--
-- Name: ix_book_categories_code; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_book_categories_code ON public.book_categories USING btree (code);


--
-- Name: ix_book_categories_name; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_book_categories_name ON public.book_categories USING btree (name);


--
-- Name: ix_book_categories_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_book_categories_status ON public.book_categories USING btree (status);


--
-- Name: ix_book_copies_book_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_book_copies_book_id ON public.book_copies USING btree (book_id);


--
-- Name: ix_book_copies_cabinet_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_book_copies_cabinet_id ON public.book_copies USING btree (cabinet_id);


--
-- Name: ix_book_copies_inventory_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_book_copies_inventory_status ON public.book_copies USING btree (inventory_status);


--
-- Name: ix_book_stock_book_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_book_stock_book_id ON public.book_stock USING btree (book_id);


--
-- Name: ix_book_stock_cabinet_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_book_stock_cabinet_id ON public.book_stock USING btree (cabinet_id);


--
-- Name: ix_book_tag_links_book_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_book_tag_links_book_id ON public.book_tag_links USING btree (book_id);


--
-- Name: ix_book_tag_links_tag_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_book_tag_links_tag_id ON public.book_tag_links USING btree (tag_id);


--
-- Name: ix_book_tags_code; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_book_tags_code ON public.book_tags USING btree (code);


--
-- Name: ix_book_tags_name; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_book_tags_name ON public.book_tags USING btree (name);


--
-- Name: ix_books_barcode; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_books_barcode ON public.books USING btree (barcode);


--
-- Name: ix_books_category_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_books_category_id ON public.books USING btree (category_id);


--
-- Name: ix_books_isbn; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_books_isbn ON public.books USING btree (isbn);


--
-- Name: ix_books_shelf_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_books_shelf_status ON public.books USING btree (shelf_status);


--
-- Name: ix_books_title; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_books_title ON public.books USING btree (title);


--
-- Name: ix_borrow_orders_assigned_copy_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_borrow_orders_assigned_copy_id ON public.borrow_orders USING btree (assigned_copy_id);


--
-- Name: ix_borrow_orders_book_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_borrow_orders_book_id ON public.borrow_orders USING btree (book_id);


--
-- Name: ix_borrow_orders_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_borrow_orders_created_at ON public.borrow_orders USING btree (created_at);


--
-- Name: ix_borrow_orders_intervention_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_borrow_orders_intervention_status ON public.borrow_orders USING btree (intervention_status);


--
-- Name: ix_borrow_orders_priority; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_borrow_orders_priority ON public.borrow_orders USING btree (priority);


--
-- Name: ix_borrow_orders_reader_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_borrow_orders_reader_id ON public.borrow_orders USING btree (reader_id);


--
-- Name: ix_cabinet_slots_cabinet_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_cabinet_slots_cabinet_id ON public.cabinet_slots USING btree (cabinet_id);


--
-- Name: ix_cabinet_slots_slot_code; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_cabinet_slots_slot_code ON public.cabinet_slots USING btree (slot_code);


--
-- Name: ix_cabinets_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_cabinets_status ON public.cabinets USING btree (status);


--
-- Name: ix_conversation_messages_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_conversation_messages_created_at ON public.conversation_messages USING btree (created_at);


--
-- Name: ix_conversation_messages_session_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_conversation_messages_session_id ON public.conversation_messages USING btree (session_id);


--
-- Name: ix_conversation_sessions_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_conversation_sessions_created_at ON public.conversation_sessions USING btree (created_at);


--
-- Name: ix_conversation_sessions_reader_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_conversation_sessions_reader_id ON public.conversation_sessions USING btree (reader_id);


--
-- Name: ix_delivery_orders_borrow_order_id; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_delivery_orders_borrow_order_id ON public.delivery_orders USING btree (borrow_order_id);


--
-- Name: ix_delivery_orders_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_delivery_orders_created_at ON public.delivery_orders USING btree (created_at);


--
-- Name: ix_delivery_orders_intervention_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_delivery_orders_intervention_status ON public.delivery_orders USING btree (intervention_status);


--
-- Name: ix_delivery_orders_priority; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_delivery_orders_priority ON public.delivery_orders USING btree (priority);


--
-- Name: ix_dismissed_notifications_notification_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_dismissed_notifications_notification_id ON public.dismissed_notifications USING btree (notification_id);


--
-- Name: ix_dismissed_notifications_reader_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_dismissed_notifications_reader_id ON public.dismissed_notifications USING btree (reader_id);


--
-- Name: ix_favorite_books_book_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_favorite_books_book_id ON public.favorite_books USING btree (book_id);


--
-- Name: ix_favorite_books_reader_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_favorite_books_reader_id ON public.favorite_books USING btree (reader_id);


--
-- Name: ix_inventory_events_book_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_inventory_events_book_id ON public.inventory_events USING btree (book_id);


--
-- Name: ix_inventory_events_cabinet_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_inventory_events_cabinet_id ON public.inventory_events USING btree (cabinet_id);


--
-- Name: ix_inventory_events_copy_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_inventory_events_copy_id ON public.inventory_events USING btree (copy_id);


--
-- Name: ix_inventory_events_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_inventory_events_created_at ON public.inventory_events USING btree (created_at);


--
-- Name: ix_inventory_events_event_type; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_inventory_events_event_type ON public.inventory_events USING btree (event_type);


--
-- Name: ix_reader_accounts_username; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_reader_accounts_username ON public.reader_accounts USING btree (username);


--
-- Name: ix_reader_booklist_items_book_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_reader_booklist_items_book_id ON public.reader_booklist_items USING btree (book_id);


--
-- Name: ix_reader_booklist_items_booklist_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_reader_booklist_items_booklist_id ON public.reader_booklist_items USING btree (booklist_id);


--
-- Name: ix_reader_booklists_reader_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_reader_booklists_reader_id ON public.reader_booklists USING btree (reader_id);


--
-- Name: ix_reader_profiles_account_id; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_reader_profiles_account_id ON public.reader_profiles USING btree (account_id);


--
-- Name: ix_reader_profiles_restriction_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_reader_profiles_restriction_status ON public.reader_profiles USING btree (restriction_status);


--
-- Name: ix_reader_profiles_segment_code; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_reader_profiles_segment_code ON public.reader_profiles USING btree (segment_code);


--
-- Name: ix_reading_events_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_reading_events_created_at ON public.reading_events USING btree (created_at);


--
-- Name: ix_reading_events_event_type; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_reading_events_event_type ON public.reading_events USING btree (event_type);


--
-- Name: ix_reading_events_reader_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_reading_events_reader_id ON public.reading_events USING btree (reader_id);


--
-- Name: ix_recommendation_logs_book_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_recommendation_logs_book_id ON public.recommendation_logs USING btree (book_id);


--
-- Name: ix_recommendation_logs_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_recommendation_logs_created_at ON public.recommendation_logs USING btree (created_at);


--
-- Name: ix_recommendation_logs_reader_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_recommendation_logs_reader_id ON public.recommendation_logs USING btree (reader_id);


--
-- Name: ix_recommendation_placements_code; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_recommendation_placements_code ON public.recommendation_placements USING btree (code);


--
-- Name: ix_recommendation_placements_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_recommendation_placements_status ON public.recommendation_placements USING btree (status);


--
-- Name: ix_recommendation_studio_publications_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_recommendation_studio_publications_status ON public.recommendation_studio_publications USING btree (status);


--
-- Name: ix_recommendation_studio_publications_version; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_recommendation_studio_publications_version ON public.recommendation_studio_publications USING btree (version);


--
-- Name: ix_return_requests_borrow_order_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_return_requests_borrow_order_id ON public.return_requests USING btree (borrow_order_id);


--
-- Name: ix_return_requests_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_return_requests_created_at ON public.return_requests USING btree (created_at);


--
-- Name: ix_robot_status_events_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_robot_status_events_created_at ON public.robot_status_events USING btree (created_at);


--
-- Name: ix_robot_status_events_event_type; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_robot_status_events_event_type ON public.robot_status_events USING btree (event_type);


--
-- Name: ix_robot_status_events_robot_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_robot_status_events_robot_id ON public.robot_status_events USING btree (robot_id);


--
-- Name: ix_robot_tasks_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_robot_tasks_created_at ON public.robot_tasks USING btree (created_at);


--
-- Name: ix_robot_tasks_delivery_order_id; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_robot_tasks_delivery_order_id ON public.robot_tasks USING btree (delivery_order_id);


--
-- Name: ix_robot_tasks_reassigned_from_task_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_robot_tasks_reassigned_from_task_id ON public.robot_tasks USING btree (reassigned_from_task_id);


--
-- Name: ix_robot_tasks_robot_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_robot_tasks_robot_id ON public.robot_tasks USING btree (robot_id);


--
-- Name: ix_robot_units_code; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_robot_units_code ON public.robot_units USING btree (code);


--
-- Name: ix_search_logs_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_search_logs_created_at ON public.search_logs USING btree (created_at);


--
-- Name: ix_search_logs_reader_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_search_logs_reader_id ON public.search_logs USING btree (reader_id);


--
-- Name: ix_system_settings_setting_key; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_system_settings_setting_key ON public.system_settings USING btree (setting_key);


--
-- Name: ix_topic_booklist_items_book_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_topic_booklist_items_book_id ON public.topic_booklist_items USING btree (book_id);


--
-- Name: ix_topic_booklist_items_topic_booklist_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_topic_booklist_items_topic_booklist_id ON public.topic_booklist_items USING btree (topic_booklist_id);


--
-- Name: ix_topic_booklists_slug; Type: INDEX; Schema: public; Owner: library
--

CREATE UNIQUE INDEX ix_topic_booklists_slug ON public.topic_booklists USING btree (slug);


--
-- Name: ix_topic_booklists_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_topic_booklists_status ON public.topic_booklists USING btree (status);


--
-- Name: ix_tutor_document_chunks_document_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_document_chunks_document_id ON public.tutor_document_chunks USING btree (document_id);


--
-- Name: ix_tutor_document_chunks_profile_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_document_chunks_profile_id ON public.tutor_document_chunks USING btree (profile_id);


--
-- Name: ix_tutor_generation_jobs_job_type; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_generation_jobs_job_type ON public.tutor_generation_jobs USING btree (job_type);


--
-- Name: ix_tutor_generation_jobs_profile_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_generation_jobs_profile_id ON public.tutor_generation_jobs USING btree (profile_id);


--
-- Name: ix_tutor_generation_jobs_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_generation_jobs_status ON public.tutor_generation_jobs USING btree (status);


--
-- Name: ix_tutor_profiles_book_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_profiles_book_id ON public.tutor_profiles USING btree (book_id);


--
-- Name: ix_tutor_profiles_reader_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_profiles_reader_id ON public.tutor_profiles USING btree (reader_id);


--
-- Name: ix_tutor_profiles_source_type; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_profiles_source_type ON public.tutor_profiles USING btree (source_type);


--
-- Name: ix_tutor_profiles_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_profiles_status ON public.tutor_profiles USING btree (status);


--
-- Name: ix_tutor_session_messages_created_at; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_session_messages_created_at ON public.tutor_session_messages USING btree (created_at);


--
-- Name: ix_tutor_session_messages_role; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_session_messages_role ON public.tutor_session_messages USING btree (role);


--
-- Name: ix_tutor_session_messages_session_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_session_messages_session_id ON public.tutor_session_messages USING btree (session_id);


--
-- Name: ix_tutor_sessions_profile_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_sessions_profile_id ON public.tutor_sessions USING btree (profile_id);


--
-- Name: ix_tutor_sessions_reader_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_sessions_reader_id ON public.tutor_sessions USING btree (reader_id);


--
-- Name: ix_tutor_sessions_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_sessions_status ON public.tutor_sessions USING btree (status);


--
-- Name: ix_tutor_source_documents_content_hash; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_source_documents_content_hash ON public.tutor_source_documents USING btree (content_hash);


--
-- Name: ix_tutor_source_documents_kind; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_source_documents_kind ON public.tutor_source_documents USING btree (kind);


--
-- Name: ix_tutor_source_documents_parse_status; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_source_documents_parse_status ON public.tutor_source_documents USING btree (parse_status);


--
-- Name: ix_tutor_source_documents_profile_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_source_documents_profile_id ON public.tutor_source_documents USING btree (profile_id);


--
-- Name: ix_tutor_source_documents_reader_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_source_documents_reader_id ON public.tutor_source_documents USING btree (reader_id);


--
-- Name: ix_tutor_step_completions_message_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_step_completions_message_id ON public.tutor_step_completions USING btree (message_id);


--
-- Name: ix_tutor_step_completions_session_id; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_step_completions_session_id ON public.tutor_step_completions USING btree (session_id);


--
-- Name: ix_tutor_step_completions_step_index; Type: INDEX; Schema: public; Owner: library
--

CREATE INDEX ix_tutor_step_completions_step_index ON public.tutor_step_completions USING btree (step_index);


--
-- Name: admin_action_logs admin_action_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_action_logs
    ADD CONSTRAINT admin_action_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_accounts(id);


--
-- Name: admin_role_assignments admin_role_assignments_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_role_assignments
    ADD CONSTRAINT admin_role_assignments_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_accounts(id);


--
-- Name: admin_role_assignments admin_role_assignments_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_role_assignments
    ADD CONSTRAINT admin_role_assignments_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.admin_roles(id);


--
-- Name: admin_role_permissions admin_role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_role_permissions
    ADD CONSTRAINT admin_role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.admin_permissions(id);


--
-- Name: admin_role_permissions admin_role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.admin_role_permissions
    ADD CONSTRAINT admin_role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.admin_roles(id);


--
-- Name: alert_records alert_records_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.alert_records
    ADD CONSTRAINT alert_records_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.admin_accounts(id);


--
-- Name: alert_records alert_records_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.alert_records
    ADD CONSTRAINT alert_records_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.admin_accounts(id);


--
-- Name: book_copies book_copies_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_copies
    ADD CONSTRAINT book_copies_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id);


--
-- Name: book_copies book_copies_cabinet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_copies
    ADD CONSTRAINT book_copies_cabinet_id_fkey FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id);


--
-- Name: book_stock book_stock_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_stock
    ADD CONSTRAINT book_stock_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id);


--
-- Name: book_stock book_stock_cabinet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_stock
    ADD CONSTRAINT book_stock_cabinet_id_fkey FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id);


--
-- Name: book_tag_links book_tag_links_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_tag_links
    ADD CONSTRAINT book_tag_links_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id);


--
-- Name: book_tag_links book_tag_links_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.book_tag_links
    ADD CONSTRAINT book_tag_links_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.book_tags(id);


--
-- Name: books books_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.book_categories(id);


--
-- Name: borrow_orders borrow_orders_assigned_copy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.borrow_orders
    ADD CONSTRAINT borrow_orders_assigned_copy_id_fkey FOREIGN KEY (assigned_copy_id) REFERENCES public.book_copies(id);


--
-- Name: borrow_orders borrow_orders_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.borrow_orders
    ADD CONSTRAINT borrow_orders_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id);


--
-- Name: borrow_orders borrow_orders_reader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.borrow_orders
    ADD CONSTRAINT borrow_orders_reader_id_fkey FOREIGN KEY (reader_id) REFERENCES public.reader_profiles(id);


--
-- Name: cabinet_slots cabinet_slots_cabinet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.cabinet_slots
    ADD CONSTRAINT cabinet_slots_cabinet_id_fkey FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id);


--
-- Name: cabinet_slots cabinet_slots_current_copy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.cabinet_slots
    ADD CONSTRAINT cabinet_slots_current_copy_id_fkey FOREIGN KEY (current_copy_id) REFERENCES public.book_copies(id);


--
-- Name: conversation_messages conversation_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.conversation_messages
    ADD CONSTRAINT conversation_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.conversation_sessions(id);


--
-- Name: conversation_sessions conversation_sessions_reader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.conversation_sessions
    ADD CONSTRAINT conversation_sessions_reader_id_fkey FOREIGN KEY (reader_id) REFERENCES public.reader_profiles(id);


--
-- Name: delivery_orders delivery_orders_borrow_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_borrow_order_id_fkey FOREIGN KEY (borrow_order_id) REFERENCES public.borrow_orders(id);


--
-- Name: dismissed_notifications dismissed_notifications_reader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.dismissed_notifications
    ADD CONSTRAINT dismissed_notifications_reader_id_fkey FOREIGN KEY (reader_id) REFERENCES public.reader_profiles(id);


--
-- Name: favorite_books favorite_books_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.favorite_books
    ADD CONSTRAINT favorite_books_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id);


--
-- Name: favorite_books favorite_books_reader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.favorite_books
    ADD CONSTRAINT favorite_books_reader_id_fkey FOREIGN KEY (reader_id) REFERENCES public.reader_profiles(id);


--
-- Name: inventory_events inventory_events_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.inventory_events
    ADD CONSTRAINT inventory_events_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id);


--
-- Name: inventory_events inventory_events_cabinet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.inventory_events
    ADD CONSTRAINT inventory_events_cabinet_id_fkey FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id);


--
-- Name: inventory_events inventory_events_copy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.inventory_events
    ADD CONSTRAINT inventory_events_copy_id_fkey FOREIGN KEY (copy_id) REFERENCES public.book_copies(id);


--
-- Name: reader_booklist_items reader_booklist_items_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reader_booklist_items
    ADD CONSTRAINT reader_booklist_items_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id);


--
-- Name: reader_booklist_items reader_booklist_items_booklist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reader_booklist_items
    ADD CONSTRAINT reader_booklist_items_booklist_id_fkey FOREIGN KEY (booklist_id) REFERENCES public.reader_booklists(id);


--
-- Name: reader_booklists reader_booklists_reader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reader_booklists
    ADD CONSTRAINT reader_booklists_reader_id_fkey FOREIGN KEY (reader_id) REFERENCES public.reader_profiles(id);


--
-- Name: reader_profiles reader_profiles_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reader_profiles
    ADD CONSTRAINT reader_profiles_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.reader_accounts(id);


--
-- Name: reading_events reading_events_reader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.reading_events
    ADD CONSTRAINT reading_events_reader_id_fkey FOREIGN KEY (reader_id) REFERENCES public.reader_profiles(id);


--
-- Name: recommendation_logs recommendation_logs_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.recommendation_logs
    ADD CONSTRAINT recommendation_logs_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id);


--
-- Name: recommendation_logs recommendation_logs_reader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.recommendation_logs
    ADD CONSTRAINT recommendation_logs_reader_id_fkey FOREIGN KEY (reader_id) REFERENCES public.reader_profiles(id);


--
-- Name: recommendation_studio_publications recommendation_studio_publications_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.recommendation_studio_publications
    ADD CONSTRAINT recommendation_studio_publications_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.admin_accounts(id);


--
-- Name: return_requests return_requests_borrow_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.return_requests
    ADD CONSTRAINT return_requests_borrow_order_id_fkey FOREIGN KEY (borrow_order_id) REFERENCES public.borrow_orders(id);


--
-- Name: robot_status_events robot_status_events_robot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.robot_status_events
    ADD CONSTRAINT robot_status_events_robot_id_fkey FOREIGN KEY (robot_id) REFERENCES public.robot_units(id);


--
-- Name: robot_status_events robot_status_events_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.robot_status_events
    ADD CONSTRAINT robot_status_events_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.robot_tasks(id);


--
-- Name: robot_tasks robot_tasks_delivery_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.robot_tasks
    ADD CONSTRAINT robot_tasks_delivery_order_id_fkey FOREIGN KEY (delivery_order_id) REFERENCES public.delivery_orders(id);


--
-- Name: robot_tasks robot_tasks_reassigned_from_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.robot_tasks
    ADD CONSTRAINT robot_tasks_reassigned_from_task_id_fkey FOREIGN KEY (reassigned_from_task_id) REFERENCES public.robot_tasks(id);


--
-- Name: robot_tasks robot_tasks_robot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.robot_tasks
    ADD CONSTRAINT robot_tasks_robot_id_fkey FOREIGN KEY (robot_id) REFERENCES public.robot_units(id);


--
-- Name: search_logs search_logs_reader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.search_logs
    ADD CONSTRAINT search_logs_reader_id_fkey FOREIGN KEY (reader_id) REFERENCES public.reader_profiles(id);


--
-- Name: system_settings system_settings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_accounts(id);


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.admin_accounts(id);


--
-- Name: topic_booklist_items topic_booklist_items_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.topic_booklist_items
    ADD CONSTRAINT topic_booklist_items_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id);


--
-- Name: topic_booklist_items topic_booklist_items_topic_booklist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.topic_booklist_items
    ADD CONSTRAINT topic_booklist_items_topic_booklist_id_fkey FOREIGN KEY (topic_booklist_id) REFERENCES public.topic_booklists(id);


--
-- Name: tutor_document_chunks tutor_document_chunks_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_document_chunks
    ADD CONSTRAINT tutor_document_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.tutor_source_documents(id);


--
-- Name: tutor_document_chunks tutor_document_chunks_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_document_chunks
    ADD CONSTRAINT tutor_document_chunks_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.tutor_profiles(id);


--
-- Name: tutor_generation_jobs tutor_generation_jobs_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_generation_jobs
    ADD CONSTRAINT tutor_generation_jobs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.tutor_profiles(id);


--
-- Name: tutor_profiles tutor_profiles_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_profiles
    ADD CONSTRAINT tutor_profiles_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id);


--
-- Name: tutor_profiles tutor_profiles_reader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_profiles
    ADD CONSTRAINT tutor_profiles_reader_id_fkey FOREIGN KEY (reader_id) REFERENCES public.reader_profiles(id);


--
-- Name: tutor_session_messages tutor_session_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_session_messages
    ADD CONSTRAINT tutor_session_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.tutor_sessions(id);


--
-- Name: tutor_sessions tutor_sessions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_sessions
    ADD CONSTRAINT tutor_sessions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.tutor_profiles(id);


--
-- Name: tutor_sessions tutor_sessions_reader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_sessions
    ADD CONSTRAINT tutor_sessions_reader_id_fkey FOREIGN KEY (reader_id) REFERENCES public.reader_profiles(id);


--
-- Name: tutor_source_documents tutor_source_documents_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_source_documents
    ADD CONSTRAINT tutor_source_documents_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.tutor_profiles(id);


--
-- Name: tutor_source_documents tutor_source_documents_reader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_source_documents
    ADD CONSTRAINT tutor_source_documents_reader_id_fkey FOREIGN KEY (reader_id) REFERENCES public.reader_profiles(id);


--
-- Name: tutor_step_completions tutor_step_completions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_step_completions
    ADD CONSTRAINT tutor_step_completions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.tutor_session_messages(id);


--
-- Name: tutor_step_completions tutor_step_completions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: library
--

ALTER TABLE ONLY public.tutor_step_completions
    ADD CONSTRAINT tutor_step_completions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.tutor_sessions(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: library
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict gqpELBqJTzrNku5LJLl7ayRI6goYTFj22noaqcecUDK0FNScHsHVPpwRJNzrEdH

