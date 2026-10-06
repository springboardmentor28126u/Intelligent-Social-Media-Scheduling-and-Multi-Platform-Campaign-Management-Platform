--
-- PostgreSQL database dump
--

\restrict bZLfhvQnL4ME2buQ7h2AaFhigJKm5RTtGcZaBVWmbKhVY2J0xz0eqtFMv0nckcp

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaigns (
    campaign_id integer NOT NULL,
    user_id integer,
    campaign_name character varying(150) NOT NULL,
    description text,
    status character varying(30) DEFAULT 'draft'::character varying,
    start_date date,
    end_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.campaigns OWNER TO postgres;

--
-- Name: campaigns_campaign_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.campaigns_campaign_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaigns_campaign_id_seq OWNER TO postgres;

--
-- Name: campaigns_campaign_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.campaigns_campaign_id_seq OWNED BY public.campaigns.campaign_id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    post_id integer NOT NULL,
    campaign_id integer,
    account_id integer,
    content text NOT NULL,
    media_url text,
    scheduled_time timestamp without time zone,
    status character varying(30) DEFAULT 'scheduled'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- Name: posts_post_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posts_post_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_post_id_seq OWNER TO postgres;

--
-- Name: posts_post_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posts_post_id_seq OWNED BY public.posts.post_id;


--
-- Name: publishing_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.publishing_logs (
    log_id integer NOT NULL,
    queue_id integer,
    post_id integer,
    platform character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    published_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    error_message text,
    retry_count integer DEFAULT 0
);


ALTER TABLE public.publishing_logs OWNER TO postgres;

--
-- Name: publishing_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.publishing_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.publishing_logs_log_id_seq OWNER TO postgres;

--
-- Name: publishing_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.publishing_logs_log_id_seq OWNED BY public.publishing_logs.log_id;


--
-- Name: publishing_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.publishing_queue (
    queue_id integer NOT NULL,
    post_id integer,
    platform character varying(50) NOT NULL,
    scheduled_time timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    priority integer DEFAULT 1,
    retry_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.publishing_queue OWNER TO postgres;

--
-- Name: publishing_queue_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.publishing_queue_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.publishing_queue_queue_id_seq OWNER TO postgres;

--
-- Name: publishing_queue_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.publishing_queue_queue_id_seq OWNED BY public.publishing_queue.queue_id;


--
-- Name: recurring_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recurring_posts (
    recurring_id integer NOT NULL,
    post_id integer,
    platform character varying(50) NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    frequency character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    next_run timestamp without time zone
);


ALTER TABLE public.recurring_posts OWNER TO postgres;

--
-- Name: recurring_posts_recurring_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recurring_posts_recurring_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recurring_posts_recurring_id_seq OWNER TO postgres;

--
-- Name: recurring_posts_recurring_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recurring_posts_recurring_id_seq OWNED BY public.recurring_posts.recurring_id;


--
-- Name: scheduled_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scheduled_posts (
    schedule_id integer NOT NULL,
    post_id integer,
    scheduled_at timestamp without time zone NOT NULL,
    published_at timestamp without time zone,
    status character varying(30) DEFAULT 'pending'::character varying,
    error_message text
);


ALTER TABLE public.scheduled_posts OWNER TO postgres;

--
-- Name: scheduled_posts_schedule_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scheduled_posts_schedule_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scheduled_posts_schedule_id_seq OWNER TO postgres;

--
-- Name: scheduled_posts_schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scheduled_posts_schedule_id_seq OWNED BY public.scheduled_posts.schedule_id;


--
-- Name: social_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.social_accounts (
    account_id integer NOT NULL,
    user_id integer,
    platform character varying(50) NOT NULL,
    username character varying(100) NOT NULL,
    access_token text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.social_accounts OWNER TO postgres;

--
-- Name: social_accounts_account_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.social_accounts_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.social_accounts_account_id_seq OWNER TO postgres;

--
-- Name: social_accounts_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.social_accounts_account_id_seq OWNED BY public.social_accounts.account_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO postgres;

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: campaigns campaign_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns ALTER COLUMN campaign_id SET DEFAULT nextval('public.campaigns_campaign_id_seq'::regclass);


--
-- Name: posts post_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts ALTER COLUMN post_id SET DEFAULT nextval('public.posts_post_id_seq'::regclass);


--
-- Name: publishing_logs log_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publishing_logs ALTER COLUMN log_id SET DEFAULT nextval('public.publishing_logs_log_id_seq'::regclass);


--
-- Name: publishing_queue queue_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publishing_queue ALTER COLUMN queue_id SET DEFAULT nextval('public.publishing_queue_queue_id_seq'::regclass);


--
-- Name: recurring_posts recurring_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_posts ALTER COLUMN recurring_id SET DEFAULT nextval('public.recurring_posts_recurring_id_seq'::regclass);


--
-- Name: scheduled_posts schedule_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_posts ALTER COLUMN schedule_id SET DEFAULT nextval('public.scheduled_posts_schedule_id_seq'::regclass);


--
-- Name: social_accounts account_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_accounts ALTER COLUMN account_id SET DEFAULT nextval('public.social_accounts_account_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (campaign_id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (post_id);


--
-- Name: publishing_logs publishing_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publishing_logs
    ADD CONSTRAINT publishing_logs_pkey PRIMARY KEY (log_id);


--
-- Name: publishing_queue publishing_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publishing_queue
    ADD CONSTRAINT publishing_queue_pkey PRIMARY KEY (queue_id);


--
-- Name: recurring_posts recurring_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_posts
    ADD CONSTRAINT recurring_posts_pkey PRIMARY KEY (recurring_id);


--
-- Name: scheduled_posts scheduled_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_posts
    ADD CONSTRAINT scheduled_posts_pkey PRIMARY KEY (schedule_id);


--
-- Name: social_accounts social_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_accounts
    ADD CONSTRAINT social_accounts_pkey PRIMARY KEY (account_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: campaigns campaigns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: posts posts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.social_accounts(account_id);


--
-- Name: posts posts_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(campaign_id);


--
-- Name: publishing_logs publishing_logs_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publishing_logs
    ADD CONSTRAINT publishing_logs_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id);


--
-- Name: publishing_logs publishing_logs_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publishing_logs
    ADD CONSTRAINT publishing_logs_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.publishing_queue(queue_id);


--
-- Name: publishing_queue publishing_queue_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publishing_queue
    ADD CONSTRAINT publishing_queue_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id);


--
-- Name: recurring_posts recurring_posts_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_posts
    ADD CONSTRAINT recurring_posts_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id);


--
-- Name: scheduled_posts scheduled_posts_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_posts
    ADD CONSTRAINT scheduled_posts_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(post_id);


--
-- Name: social_accounts social_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_accounts
    ADD CONSTRAINT social_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- PostgreSQL database dump complete
--

\unrestrict bZLfhvQnL4ME2buQ7h2AaFhigJKm5RTtGcZaBVWmbKhVY2J0xz0eqtFMv0nckcp

