-- Listening Notes — database setup
--
-- The site runs this against its own database the first time it starts, before
-- showing the welcome screen. Nobody has to open a SQL editor: a new copy finds
-- an empty database, builds these tables, and gets on with it.
--
-- Every statement is written to be safe to run more than once, so a redeploy
-- that runs it again changes nothing.
--
-- It creates structure only — no albums, no notes, no owner. The `users` table
-- is left empty on purpose: the owner row has to carry the name of whoever set
-- this copy up, so the welcome screen writes it, not this file.
--
-- Generated from a live database's system catalogue, so it describes what
-- actually exists rather than what anyone remembers building.

CREATE TABLE IF NOT EXISTS briefings (
  id serial NOT NULL,
  lookup_key text NOT NULL,
  album text NOT NULL,
  artist text NOT NULL,
  brief jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  refreshed_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT briefings_pkey PRIMARY KEY (id),
  CONSTRAINT briefings_lookup_key_key UNIQUE (lookup_key)
);

CREATE TABLE IF NOT EXISTS comments (
  id serial NOT NULL,
  entry_slug text NOT NULL,
  track_index integer DEFAULT '-1'::integer NOT NULL,
  parent_id integer,
  author_name text NOT NULL,
  author_email text NOT NULL,
  content text NOT NULL,
  upvotes integer DEFAULT 0 NOT NULL,
  pending boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT comments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id serial NOT NULL,
  entry_slug text,
  role text NOT NULL,
  message text NOT NULL,
  phase text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS drafts (
  id serial NOT NULL,
  lookup_key text NOT NULL,
  album text NOT NULL,
  artist text,
  year text,
  genre text DEFAULT ''::text,
  entry_type text DEFAULT ''::text,
  relationship text DEFAULT ''::text,
  album_art text DEFAULT ''::text,
  collection_id text,
  step integer DEFAULT 0,
  elapsed integer DEFAULT 0,
  rating integer DEFAULT 0,
  masterpiece boolean DEFAULT false,
  favorite boolean DEFAULT false,
  notes text DEFAULT ''::text,
  tracks jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT drafts_pkey PRIMARY KEY (id),
  CONSTRAINT drafts_lookup_key_key UNIQUE (lookup_key)
);

CREATE TABLE IF NOT EXISTS echo_memory (
  id serial NOT NULL,
  user_id text DEFAULT 'miyel'::text,
  summary text,
  last_updated timestamp without time zone DEFAULT now(),
  CONSTRAINT echo_memory_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS entries (
  id serial NOT NULL,
  album text NOT NULL,
  artist text NOT NULL,
  year text,
  entry_type text,
  relationship text,
  rating text,
  favorite boolean DEFAULT false,
  background text,
  notes text,
  tags text[],
  horizon text,
  album_art text,
  post_link text,
  created_at timestamp without time zone DEFAULT now(),
  slug text,
  masterpiece boolean DEFAULT false,
  track_notes text,
  tracks jsonb,
  genre text,
  source_entry_id integer,
  received_from text,
  received_date date,
  user_id integer,
  rating_value numeric GENERATED ALWAYS AS (
CASE
    WHEN masterpiece THEN (5)::numeric
    WHEN (rating ~ '^s*[0-9]+(.[0-9]+)?'::text) THEN ("substring"(rating, '^s*([0-9]+(?:.[0-9]+)?)'::text))::numeric
    ELSE NULL::numeric
END) STORED,
  album_key text GENERATED ALWAYS AS (btrim(regexp_replace(replace(translate(lower(((COALESCE(album, ''::text) || ' '::text) || COALESCE(artist, ''::text))), 'àáâãäåèéêëìíîïòóôõöùúûüñçýÿšžāēīōūăąćčđěğıłńňőřşťůűźż'::text, 'aaaaaaeeeeiiiiooooouuuuncyyszaeiouaaccdegilnnorstuuzz'::text), '&'::text, 'and'::text), '[^a-z0-9]+'::text, ' '::text, 'g'::text))) STORED,
  CONSTRAINT entries_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id serial NOT NULL,
  album text NOT NULL,
  artist text NOT NULL,
  year text,
  note text NOT NULL,
  submitter_name text,
  submitter_email text,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT submissions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS users (
  id serial NOT NULL,
  handle text NOT NULL,
  display_name text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_handle_key UNIQUE (handle)
);

-- Foreign keys, added once every table exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_parent_id_fkey') THEN
    ALTER TABLE comments ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entries_user_id_fkey') THEN
    ALTER TABLE entries ADD CONSTRAINT entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_slug ON public.comments USING btree (entry_slug);
CREATE INDEX IF NOT EXISTS idx_comments_track ON public.comments USING btree (entry_slug, track_index);
CREATE INDEX IF NOT EXISTS entries_album_key_idx ON public.entries USING btree (album_key);
CREATE INDEX IF NOT EXISTS entries_source_entry_id_idx ON public.entries USING btree (source_entry_id);
CREATE INDEX IF NOT EXISTS entries_user_id_idx ON public.entries USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS entries_user_slug_idx ON public.entries USING btree (user_id, slug);
