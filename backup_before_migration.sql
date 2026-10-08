--
-- PostgreSQL database dump
--

\restrict Z87KFhn8bahAA3ID1c8TQDGTU2u5fhN7Rk1sq4UvbrsYd6hEEKmfragqFrGyvTp

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

--
-- Name: campaignstatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.campaignstatus AS ENUM (
    'draft',
    'active',
    'paused',
    'completed'
);


ALTER TYPE public.campaignstatus OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaigns (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    goal character varying,
    budget double precision,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    status public.campaignstatus NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.campaigns OWNER TO postgres;

--
-- Name: campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaigns_id_seq OWNER TO postgres;

--
-- Name: campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.campaigns_id_seq OWNED BY public.campaigns.id;


--
-- Name: media; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media (
    id integer NOT NULL,
    user_id integer NOT NULL,
    filename character varying NOT NULL,
    original_filename character varying NOT NULL,
    file_path character varying NOT NULL,
    file_url character varying NOT NULL,
    media_type character varying NOT NULL,
    mime_type character varying,
    size_bytes integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.media OWNER TO postgres;

--
-- Name: media_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.media_id_seq OWNER TO postgres;

--
-- Name: media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.media_id_seq OWNED BY public.media.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying NOT NULL,
    title character varying NOT NULL,
    message text NOT NULL,
    related_post_id integer,
    related_campaign_id integer,
    is_read boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: post_platforms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_platforms (
    id integer NOT NULL,
    post_id integer NOT NULL,
    social_account_id integer NOT NULL,
    platform character varying NOT NULL,
    status character varying,
    published_at timestamp with time zone,
    external_post_id character varying,
    error_message text
);


ALTER TABLE public.post_platforms OWNER TO postgres;

--
-- Name: post_platforms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.post_platforms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.post_platforms_id_seq OWNER TO postgres;

--
-- Name: post_platforms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.post_platforms_id_seq OWNED BY public.post_platforms.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    media_urls json,
    scheduled_time timestamp with time zone,
    status character varying,
    created_at timestamp with time zone DEFAULT '2026-08-31 19:30:18.946838+05:30'::timestamp with time zone,
    title character varying,
    is_recurring boolean,
    recurrence_pattern character varying,
    recurrence_end_date timestamp with time zone,
    post_as_short boolean,
    campaign_id integer
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.posts_id_seq OWNER TO postgres;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: publish_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.publish_logs (
    id integer NOT NULL,
    post_id integer NOT NULL,
    platform character varying NOT NULL,
    event character varying NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT '2026-09-05 12:44:22.606576+05:30'::timestamp with time zone
);


ALTER TABLE public.publish_logs OWNER TO postgres;

--
-- Name: publish_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.publish_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.publish_logs_id_seq OWNER TO postgres;

--
-- Name: publish_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.publish_logs_id_seq OWNED BY public.publish_logs.id;


--
-- Name: social_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.social_accounts (
    id integer NOT NULL,
    user_id integer,
    platform character varying NOT NULL,
    account_name character varying NOT NULL,
    access_token character varying,
    status character varying,
    platform_user_id character varying,
    refresh_token character varying,
    token_expires_at timestamp with time zone
);


ALTER TABLE public.social_accounts OWNER TO postgres;

--
-- Name: social_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.social_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.social_accounts_id_seq OWNER TO postgres;

--
-- Name: social_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.social_accounts_id_seq OWNED BY public.social_accounts.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key character varying NOT NULL,
    value json NOT NULL,
    category character varying,
    description character varying,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    password_hash character varying NOT NULL,
    role character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    preferences jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true
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
-- Name: campaigns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns ALTER COLUMN id SET DEFAULT nextval('public.campaigns_id_seq'::regclass);


--
-- Name: media id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media ALTER COLUMN id SET DEFAULT nextval('public.media_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: post_platforms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_platforms ALTER COLUMN id SET DEFAULT nextval('public.post_platforms_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: publish_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publish_logs ALTER COLUMN id SET DEFAULT nextval('public.publish_logs_id_seq'::regclass);


--
-- Name: social_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_accounts ALTER COLUMN id SET DEFAULT nextval('public.social_accounts_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
f84567969f9f
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.campaigns (id, user_id, name, description, goal, budget, start_date, end_date, status, created_at, updated_at) FROM stdin;
5	52	E2E Campaign	\N	Sales	1000	\N	\N	draft	2026-10-03 11:03:33.662816	2026-10-03 11:03:33.662816
\.


--
-- Data for Name: media; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.media (id, user_id, filename, original_filename, file_path, file_url, media_type, mime_type, size_bytes, created_at) FROM stdin;
17	8	3c4a7e24d05542c7997f317d80799938.jpg	pexels-vikashkr50-31029367.jpg	C:\\Users\\hp\\socialpilot\\backend\\media\\3c4a7e24d05542c7997f317d80799938.jpg	https://postnasal-shivering-folic.ngrok-free.dev/media/3c4a7e24d05542c7997f317d80799938.jpg	image	image/jpeg	2472128	2026-10-05 12:07:25.088651+05:30
18	8	23bab134578c4759ac21172737ca5720.jpg	pexels-vikashkr50-31029367.jpg	C:\\Users\\hp\\socialpilot\\backend\\media\\23bab134578c4759ac21172737ca5720.jpg	https://postnasal-shivering-folic.ngrok-free.dev/media/23bab134578c4759ac21172737ca5720.jpg	image	image/jpeg	2472128	2026-10-05 12:07:57.014706+05:30
19	8	4c5ded10fbe04bba8a14c014189104cc.jpg	pexels-vikashkr50-31029367.jpg	C:\\Users\\hp\\socialpilot\\backend\\media\\4c5ded10fbe04bba8a14c014189104cc.jpg	https://postnasal-shivering-folic.ngrok-free.dev/media/4c5ded10fbe04bba8a14c014189104cc.jpg	image	image/jpeg	2472128	2026-10-05 12:08:29.014685+05:30
20	8	8c0028b061eb4c63801c268456baf852.jpg	pexels-grishkoff-5051444.jpg	C:\\Users\\hp\\socialpilot\\backend\\media\\8c0028b061eb4c63801c268456baf852.jpg	https://postnasal-shivering-folic.ngrok-free.dev/media/8c0028b061eb4c63801c268456baf852.jpg	image	image/jpeg	2019205	2026-10-05 12:10:26.546862+05:30
21	8	48b2510e133940c5b464b3528714844e.jpeg	WhatsApp Image 2026-08-22 at 12.54.58.jpeg	C:\\Users\\hp\\socialpilot\\backend\\media\\48b2510e133940c5b464b3528714844e.jpeg	https://postnasal-shivering-folic.ngrok-free.dev/media/48b2510e133940c5b464b3528714844e.jpeg	image	image/jpeg	140715	2026-10-05 12:10:52.232612+05:30
22	8	b60b60552b6c42b4a4a3679009847685.jpg	pexels-vikashkr50-31029367.jpg	C:\\Users\\hp\\socialpilot\\backend\\media\\b60b60552b6c42b4a4a3679009847685.jpg	https://postnasal-shivering-folic.ngrok-free.dev/media/b60b60552b6c42b4a4a3679009847685.jpg	image	image/jpeg	2472128	2026-10-05 12:22:03.307299+05:30
23	8	eea28c6974ce44279d27626a572f572c.jpg	pexels-vikashkr50-31029367.jpg	C:\\Users\\hp\\socialpilot\\backend\\media\\eea28c6974ce44279d27626a572f572c.jpg	https://postnasal-shivering-folic.ngrok-free.dev/media/eea28c6974ce44279d27626a572f572c.jpg	image	image/jpeg	2472128	2026-10-05 12:25:17.925038+05:30
24	8	003c43010a2e49a28074d569e3743bb2.jpeg	WhatsApp Image 2026-08-22 at 17.59.10.jpeg	C:\\Users\\hp\\socialpilot\\backend\\media\\003c43010a2e49a28074d569e3743bb2.jpeg	https://postnasal-shivering-folic.ngrok-free.dev/media/003c43010a2e49a28074d569e3743bb2.jpeg	image	image/jpeg	100516	2026-10-05 12:37:32.00225+05:30
25	8	6e0d82b4338747ed9ec1d32984650f88.jpeg	WhatsApp Image 2026-08-22 at 12.54.58.jpeg	C:\\Users\\hp\\socialpilot\\backend\\media\\6e0d82b4338747ed9ec1d32984650f88.jpeg	https://postnasal-shivering-folic.ngrok-free.dev/media/6e0d82b4338747ed9ec1d32984650f88.jpeg	image	image/jpeg	140715	2026-10-05 12:37:47.922168+05:30
26	8	4129349dc4d4427d9c82220a4d8e7a84.jpeg	WhatsApp Image 2026-08-22 at 12.54.58.jpeg	C:\\Users\\hp\\socialpilot\\backend\\media\\4129349dc4d4427d9c82220a4d8e7a84.jpeg	https://postnasal-shivering-folic.ngrok-free.dev/media/4129349dc4d4427d9c82220a4d8e7a84.jpeg	image	image/jpeg	140715	2026-10-05 12:53:05.030244+05:30
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, title, message, related_post_id, related_campaign_id, is_read, created_at) FROM stdin;
1	9	post_published	Post Published	Your post to Facebook was published	\N	\N	t	2026-09-29 12:45:40.57604+05:30
16	8	post_published	Post Published	Your post to Instagram was published	31	\N	t	2026-10-02 15:43:27.655907+05:30
17	8	post_published	Post Published	Your post was published	31	\N	t	2026-10-03 11:03:27.904827+05:30
18	8	post_failed	Post Failed	Publishing failed: Invalid token	\N	\N	t	2026-10-03 11:03:27.909953+05:30
21	8	post_published	Post Published	Your post to Facebook was published	40	\N	t	2026-10-05 12:53:53.546405+05:30
\.


--
-- Data for Name: post_platforms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.post_platforms (id, post_id, social_account_id, platform, status, published_at, external_post_id, error_message) FROM stdin;
6	5	20	YouTube	published	2026-09-02 13:51:21.402856+05:30	rNS6l9WuPpU	\N
12	10	25	LinkedIn	published	2026-09-02 17:47:31.278085+05:30	urn:li:share:7500889657921028096	\N
13	11	25	LinkedIn	published	2026-09-02 18:12:52.323823+05:30	urn:li:share:7500896037411291136	\N
14	12	25	LinkedIn	published	2026-09-03 17:57:02.187174+05:30	urn:li:share:7501254444509085696	\N
23	22	20	YouTube	published	2026-09-07 15:48:45.226908+05:30	Kw86UvXrdzQ	\N
41	31	33	Instagram	published	2026-10-02 15:43:27.603208+05:30	18021258779885884	\N
49	40	39	Facebook	published	2026-10-05 12:53:53.505419+05:30	1418708561319788_122100882771498736	\N
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posts (id, user_id, content, media_urls, scheduled_time, status, created_at, title, is_recurring, recurrence_pattern, recurrence_end_date, post_as_short, campaign_id) FROM stdin;
22	8	#trending	["http://localhost:8000/media/29c61ad5733d424a8ecd6533754f5a48.mp4"]	\N	published	2026-08-31 19:30:18.946838+05:30	Video	f	\N	\N	\N	\N
23	8	First post from my platform	["http://localhost:8000/media/a477e7cbf3a24107b8f64e33d38c24d3.jpg"]	\N	published	2026-08-31 19:30:18.946838+05:30	\N	f	\N	\N	f	\N
37	52	Hello World	null	\N	draft	2026-08-31 19:30:18.946838+05:30	E2E Post	f	\N	\N	f	5
40	8	Defining who we are professionally isn't just about our job titles. It's about our core values, the unique skills we bring to the table, and how we solve problems. For me, I define myself by my passion for continuous learning and helping others grow. Taking the time to reflect on this has truly reshaped my career path. How do you define yourself when someone asks what you do beyond your job title?	["https://postnasal-shivering-folic.ngrok-free.dev/media/4129349dc4d4427d9c82220a4d8e7a84.jpeg"]	\N	published	2026-08-31 19:30:18.946838+05:30	\N	f	\N	\N	f	\N
3	8	Testing my first scheduled post!	["https://download.samplelib.com/mp4/sample-5s.mp4"]	\N	published	2026-08-31 19:30:18.946838+05:30	SocialPilot Multi-Platform Test	f	\N	\N	\N	\N
5	8	Testing the full Celery Beat scheduling pipeline - Milestone 2 complete!	["https://download.samplelib.com/mp4/sample-5s.mp4"]	2026-09-02 13:50:32.93894+05:30	published	2026-08-31 19:30:18.946838+05:30	Automated Scheduling Test	f	\N	\N	\N	\N
10	9	Hii i am prabhav	null	\N	published	2026-08-31 19:30:18.946838+05:30	\N	f	\N	\N	\N	\N
11	9	Hii!	null	\N	published	2026-08-31 19:30:18.946838+05:30	\N	f	\N	\N	\N	\N
12	9	Hello everyone!!!	null	2026-09-03 17:57:00+05:30	published	2026-08-31 19:30:18.946838+05:30	\N	f	\N	\N	\N	\N
31	8	.	["https://postnasal-shivering-folic.ngrok-free.dev/media/97bd303fa8034d69a758331dadff8f2e.jpg"]	\N	published	2026-08-31 19:30:18.946838+05:30	Hostel Diaries Reel	f	\N	\N	f	\N
\.


--
-- Data for Name: publish_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.publish_logs (id, post_id, platform, event, message, created_at) FROM stdin;
13	22	YouTube	attempt	Attempting to publish to YouTube	2026-09-05 12:44:22.606576+05:30
14	22	YouTube	success	Published successfully, external_id=Kw86UvXrdzQ	2026-09-05 12:44:22.606576+05:30
15	23	LinkedIn	attempt	Attempting to publish to LinkedIn	2026-09-05 12:44:22.606576+05:30
16	23	LinkedIn	success	Published successfully, external_id=urn:li:share:7503790539738218496	2026-09-05 12:44:22.606576+05:30
53	31	Instagram	attempt	Attempting to publish to Instagram	2026-09-05 12:44:22.606576+05:30
54	31	Instagram	success	Published successfully, external_id=18190130680405748	2026-09-05 12:44:22.606576+05:30
61	40	Facebook	attempt	Attempting to publish to Facebook	2026-09-05 12:44:22.606576+05:30
62	40	Facebook	success	Published successfully, external_id=1418708561319788_122100882771498736	2026-09-05 12:44:22.606576+05:30
\.


--
-- Data for Name: social_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.social_accounts (id, user_id, platform, account_name, access_token, status, platform_user_id, refresh_token, token_expires_at) FROM stdin;
33	8	Instagram	mr.ex.plorer01	IGABAZBRHduWRVBZAGFhYmRQVUlMRmRFdHBPODRmdXp2Nm5VbUxqbHlEVkpjclR4ZAUVibTlZAajFxN1R4dU13ZAzNHb2x3SEpsMEdUTTY2V0QyWmgxUmgzWVB4MkJXdXNSdV9XMU5hTHh3R1RwZA183cHRhRFN3	connected	17841471637326044	\N	2026-12-01 15:27:43.747874+05:30
25	9	LinkedIn	Prabhav Jain	AQVhiwnNeYa2nXUHfYsgLqnbkfXnq2MMC4MVnwSdbj_yS-kt1kACVcqz6kMPLzQrJCoWKMXl2JaYVEptOjbVxsb-7jpjf6BztUr6bELmPlDNCWDPXrnDdFBUB5yFeF7volgu0V_ZpeMQ5IfM05EysiCJ0DNE9QIRlpTTBLWuX2l1nUElE4vcrSOLR-ugNeZ47alTCMvRrqSSHv_JrZNPL8deLponI0DWWMJeLaz_j7ZoyisP9yphG0n36Le6GO5JcUfrZLQSMMW79KH9P7jQMY4l8vMcOUjpxnpHW0uu6jdkRk92u2L8NOtn_aWFo3gAeQ48dNzwWnEPVWvMFOvpUOMaXnoeeA	connected	EPCuQmnkqh	\N	\N
20	8	YouTube	pal creations	ya29.a0AdMD6EjxN3PRUp-9QaDEeIXGkA8__cvmP3ES_G2dU4a9xNIL3MuaYh_Awauq4fe-vzTY5eAfvX6LQbxlb9H9fXRYb2vJ8ClMrgUo4IAveEC7VyRDPtpoTxSooFLWWi3itYIyRh1HNUg5MYUiRbBZhNkg06MouAfFaOGOLBL28kG5ZZNCaetaDfV3pzpgr-lPusKFsHyfaCgYKAb8SARYSFQHGX2MiSPMg7sLXR3f4vAcfIWNH2Q0207	connected	UCPmYCf3F3QZb0EC3Q-83ojg	1//0gFw2oZd-_WuHCgYIARAAGBASNwF-L9IrVlwTRPXIWTuSCuBIKV9vHCxB3sG1dPKbaNjgGpV4vjgSGY1M2ZgL71n7J-5vzFt4Xzo	2026-09-07 16:13:30.013301+05:30
27	9	YouTube	Prabhav Jain	ya29.a0AX07CmtjFIXz-Uh4yKzKjECT9NTqbQv3gTDRPgvk-w0UfW259LKd1v0V1FJ9yX5f_QXvsXhRM_4zW65CGFj5j8Li2OYnSIWWqRAnfU0TT8quu6jBQ_MOm5gtbwl1WyJYXtmC7fFMvHS5mLXf9xh-eBZ4PC7en6RHWTn52NTmh5ONI-vUNCDMIsZZGjaM03ndT423WvQaCgYKAU4SARMSFQHGX2MiHH8DKJ7n1T6AMLS6ajVIzQ0206	connected	UCs2-npH5eO9US9nZbwVDAIA	1//0g95uxh9kxUxmCgYIARAAGBASNwF-L9IrkHO6m5r9pDGTwUBUQXuj5tKKLRrlVEFOBWAGHUoGNhsICZpF2oAzn3IjyMi7Kem2abc	2026-09-24 18:43:01.570032+05:30
29	8	X	creations_1664	VkVmX1JZTXM5M3dTdklKNlR3cGFLUWg0RmRKbUMzeGJFVlZDZUlLeDR1OUlXOjE3OTA2NzM2NjkyMzg6MToxOmF0OjE	connected	2011095938404925443	eVM3ZElseVV0MFN4eUpkZkdXRFc5em9rYU5XZlI2OGotTWdEc3VBaDllSXk3OjE3OTA2NzM2NjkyMzg6MToxOnJ0OjE	2026-09-29 16:51:05.282289+05:30
32	8	LinkedIn	Prabhav Jain	AQVkB3pcGmUtza09v-7wdgSHn33qZz1o5UisWDaC7XniPGnqy7vGHfae-p2fF9Nq9InbjdGFMNb9cqGdGwjhuq29-p9imB_Cm2kTX4toUBAlBdO_jsQqM6OjEDMrM2ulfjUPFNbbc8OipqaCQBKD3aDIKYD1khPWVj9SPX5gmltVyIKBT-xv0SNqPWIIm0l0nhDlkEeAzqFQ6s90xoamSPy0UZP2EpQB4rz9fVE4l0kLeiJkSos2_Yk22mkRAc69FuX61NQXN32gtuxn-DWZjFoBUrTK9LMoKxCTLgGFNYcOMlbPFqb8-hK_gT4q_GqRPZ791NsB_hHhREHmR7ojGRBda8unUw	connected	EPCuQmnkqh	\N	\N
36	9	Instagram	mr.ex.plorer01	IGABAZBRHduWRVBZAGFXZATk5cThWN2F1QmlwbVJqTUhpRVp3dENPT0xoQkNwdXNoMjRxUjJNQVZA6Unc3RUc2ZAUpBUFRhdGxUVFQxelBPSzdyOE5hSmhXZAEM2R3FJazNGUkxndXZABV2hPbkJzOWUxWWZAsTk1R	connected	17841471637326044	\N	2026-12-01 15:27:49.40042+05:30
37	9	Facebook	Prabhav	EABBZAeE8t3AEBSv6NvzuJlKWKbvXiDJJC5EB4ENgGaaLM2jGcnsqf7JDPmGpZAJuPexeGK2apgqPBwfcx7Oml9jv5TZCZASFfnMfCnMDW1joFdnEDM7BUmXaIVHRgfY4WRrCdZAObmK6DZC6dp0d5wovuVjjCZBxZB6bAG5nAzUIavQDwTL7kk6KkbIWw1XbFhhyF0CFsD1v	connected	1418708561319788	\N	\N
38	9	X	creations_1664	WkI5M1dnWlZuQkYtektMenRqYjhiVVRUX0M4UUlhNmV2a3hBQTNqNzBVQ3VrOjE3OTEwMDg0Mzc1MDQ6MToxOmF0OjE	connected	2011095938404925443	T25ETlViUmlpQ2xnT2R4Q0dHenIyOTRLeUNsN3BZd09QSFFPQ3ozRnd4ZXhQOjE3OTEwMDg0Mzc1MDQ6MTowOnJ0OjE	2026-10-03 13:50:38.674964+05:30
39	8	Facebook	Prabhav	EABBZAeE8t3AEBSqZC8j54P1ZAKhxsLV4bsVCzjlhmyGlWlzJtVE0oNImpUrZC3R10b65ZBbzw67FC9GkHBEKzWgyHHA33DSOmEw6bK9doGzjfaLz7MUMNcHpP9dkZAvEMLLAtD3jH15soHAtZCpf5BKA9lwYSLaY6oIKom8iILnGHlvuNDh51JUA94yJVoWraqDqkOV	connected	1418708561319788	\N	\N
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (key, value, category, description, updated_at) FROM stdin;
default_user_role	"Content Creator"	general	\N	2026-10-04 10:39:16.506783+05:30
maintenance_mode	false	general	\N	2026-10-04 10:39:16.506783+05:30
allow_signups	true	general	\N	2026-10-04 10:39:28.073412+05:30
allowed_platforms	["instagram", "facebook", "linkedin", "youtube", "x"]	general	\N	2026-10-04 10:39:28.073412+05:30
email_notifications	true	general	\N	2026-10-04 10:39:28.073412+05:30
require_approval	false	general	\N	2026-10-04 10:39:28.073412+05:30
max_upload_size_mb	250	general	\N	2026-10-04 10:45:33.784366+05:30
system_announcement	"Welcome to the new release!"	general	\N	2026-10-04 10:45:33.784366+05:30
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password_hash, role, created_at, updated_at, preferences, is_active) FROM stdin;
10	Prabhav	prabhav@example.com	$2b$12$SDZfK00paBlK0RlgL27T.Opm0rrU3ORIjcYOwuEjzF6nSYBrQrWzq	Content Creator	2026-10-04 10:27:44.242547+05:30	2026-10-04 10:27:44.242547+05:30	{}	t
9	Prabhav Jain	prabhav1@example.com	$2b$12$IZrAlVfP9bcgoqKp5sxc3ed3DxnUa138H47XT6Qd9kw3cmeDtZMq2	Content Creator	2026-10-04 10:27:44.242547+05:30	2026-10-04 10:27:44.242547+05:30	{}	t
46	Test User	user_18ca6970@example.com	$2b$12$vKoJfGuLKTUhmhLlxczdcunjXWtvlZCD6opn1d158hr4QD6cDqxL2	Content Creator	2026-10-04 10:27:44.242547+05:30	2026-10-04 10:27:44.242547+05:30	{}	t
48	User Marketing Team	role_marketing_team_2d3710@example.com	$2b$12$ZWh7i0wASDlVh56d6r191uXtl8zXw3G7P6aaJeBDWuxrWa87RyF26	Marketing Team	2026-10-04 10:27:44.242547+05:30	2026-10-04 10:27:44.242547+05:30	{}	t
49	User Business User	role_business_user_133e5f@example.com	$2b$12$zC/S7GQLWA9rngIJSO2XWOSNvtg2h.n5WHTBIYnX/GckmLnOZx9Xa	Business User	2026-10-04 10:27:44.242547+05:30	2026-10-04 10:27:44.242547+05:30	{}	t
50	User Administrator	role_administrator_09e06d@example.com	$2b$12$1VgKri.c/D3C/sNeq.UzyeTARz4l55g/JQkneuIwY1IOEERuaJyAO	Administrator	2026-10-04 10:27:44.242547+05:30	2026-10-04 10:27:44.242547+05:30	{}	t
51	Default Role Check	def_77feb2@example.com	$2b$12$YeY4Rfrqok0IEA7zwWIyDuqdYeUvSH57iu2TDuvtRjWLi4tb/Ok7.	Content Creator	2026-10-04 10:27:44.242547+05:30	2026-10-04 10:27:44.242547+05:30	{}	t
47	Updated Creator Name	role_content_creator_bd96b7@example.com	$2b$12$8hkXQyvIoEQ4VN6FEpmN9udZlgZBRFd90ah6Mwk4RL0hhItK/kevC	Content Creator	2026-10-04 10:27:44.242547+05:30	2026-10-04 10:27:44.242547+05:30	{}	t
52	E2E User	e2e_bc95ef@example.com	$2b$12$AgwM64n7hOo7pCq1wD6ws.XWnaNHYzY6YEUufUtnij2Ub9n7V4HVm	Content Creator	2026-10-04 10:27:44.242547+05:30	2026-10-04 10:27:44.242547+05:30	{}	t
8	Admin	test@example.com	$2b$12$5hMK5pJOHiHcTS2me8tXHuWSh88d0FzYMZE/tfIE7CmnQBs1kqSVK	Administrator	2026-10-04 10:27:44.242547+05:30	2026-10-04 10:45:33.947655+05:30	{"dark_mode": true, "compact_layout": true}	t
53	Browser Test User	browsertest_random991@example.com	$2b$12$vRa6huBW/OPQccxFvCdWqOaeEX0N3PwyfaufHr/hlnBwRMYOfL1Xm	Content Creator	2026-10-04 18:24:09.24345+05:30	2026-10-04 18:24:09.24345+05:30	{}	t
\.


--
-- Name: campaigns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.campaigns_id_seq', 5, true);


--
-- Name: media_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.media_id_seq', 26, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 21, true);


--
-- Name: post_platforms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.post_platforms_id_seq', 49, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.posts_id_seq', 40, true);


--
-- Name: publish_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.publish_logs_id_seq', 62, true);


--
-- Name: social_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.social_accounts_id_seq', 39, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 53, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: post_platforms post_platforms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_platforms
    ADD CONSTRAINT post_platforms_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: publish_logs publish_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publish_logs
    ADD CONSTRAINT publish_logs_pkey PRIMARY KEY (id);


--
-- Name: social_accounts social_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_accounts
    ADD CONSTRAINT social_accounts_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_campaigns_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_campaigns_id ON public.campaigns USING btree (id);


--
-- Name: ix_media_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_media_id ON public.media USING btree (id);


--
-- Name: ix_notifications_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_notifications_id ON public.notifications USING btree (id);


--
-- Name: ix_post_platforms_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_post_platforms_id ON public.post_platforms USING btree (id);


--
-- Name: ix_posts_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_posts_id ON public.posts USING btree (id);


--
-- Name: ix_publish_logs_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_publish_logs_id ON public.publish_logs USING btree (id);


--
-- Name: ix_social_accounts_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_social_accounts_id ON public.social_accounts USING btree (id);


--
-- Name: ix_system_settings_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_system_settings_key ON public.system_settings USING btree (key);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: campaigns campaigns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: media media_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_related_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_campaign_id_fkey FOREIGN KEY (related_campaign_id) REFERENCES public.campaigns(id);


--
-- Name: notifications notifications_related_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_post_id_fkey FOREIGN KEY (related_post_id) REFERENCES public.posts(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: post_platforms post_platforms_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_platforms
    ADD CONSTRAINT post_platforms_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: post_platforms post_platforms_social_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_platforms
    ADD CONSTRAINT post_platforms_social_account_id_fkey FOREIGN KEY (social_account_id) REFERENCES public.social_accounts(id);


--
-- Name: posts posts_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id);


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: publish_logs publish_logs_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publish_logs
    ADD CONSTRAINT publish_logs_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: social_accounts social_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.social_accounts
    ADD CONSTRAINT social_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Z87KFhn8bahAA3ID1c8TQDGTU2u5fhN7Rk1sq4UvbrsYd6hEEKmfragqFrGyvTp

