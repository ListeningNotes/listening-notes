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
  formative boolean DEFAULT false,
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
  -- The third and last flag. Formative was a relationship — one of five things
  -- a listen could be — which was the wrong shape for it: the others describe
  -- an occasion, this describes a standing fact about the record. An album that
  -- shaped how you listen goes on having done that on every later listen.
  formative boolean DEFAULT false,
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

-- ── settings ───────────────────────────────────────────────────────────────
-- Everything that makes a copy someone's own rather than a photocopy of the
-- journal it came from: the name on the cover, who keeps it, the portrait, the
-- links. These began life typed into the source, which meant a new copy wore
-- the first journal's name and pointed at its Instagram until somebody edited
-- code. They belong in a drawer the owner can open.
--
-- One row, forced by the check on id. A settings table that can hold two rows
-- eventually holds two rows, and then nothing agrees about which is real.
--
-- Every column is nullable with no default. A blank setting has to be a real
-- answer — "no Instagram" is a position, not an omission, and the site is
-- expected to render nothing rather than something broken.
CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  journal_name text,
  keeper_name text,
  bio text,
  portrait_url text,
  instagram_url text,
  lastfm_user text,
  site_address text,
  founded_at date,
  pinned_entry_id integer,
  -- The paragraph at the top of /about, and the long note behind it. Both
  -- live here rather than in the page for the same reason the name does: a
  -- copy of this software should not open carrying somebody else's writing.
  -- Blank is the shipped state — no note, no page, no link to one.
  about_intro text,
  why_essay text,
  why_date date,
  -- Wherever else this journal's keeper can be found. A list of plain URLs,
  -- not a column per service: a column per service means the software decides
  -- which services exist, and every copy that uses one nobody thought of has
  -- to wait for a migration. The card picks each icon off the hostname and
  -- falls back to a plain link mark for anything it doesn't recognise.
  --   ["https://instagram.com/name", "https://reddit.com/u/name"]
  social_links jsonb,
  -- Which of the card's counted rows its keeper would rather not show. They
  -- are read off the entries and can never be typed over — a journal that can
  -- be told how many records it has is a journal whose numbers mean nothing —
  -- but not everyone wants to publish how new they are or how few they have
  -- logged, so they can be left off. A list of keys: ["since", "albums"].
  hidden_fields jsonb,
  -- The one forward-looking line on the card. Printed as "Looking for"; the
  -- column keeps the name the idea was born with, because the wording on the
  -- card is a design decision that has already moved once and the concept it
  -- stores has not. Everything else on it says what
  -- somebody has already done; this says what they want next, and it sits
  -- directly above the button for sending them something — you read what they
  -- are asking for, then you send it. Deliberately its own column and not part
  -- of the bio: a bio is character and this is an instruction, and folded
  -- together nobody writes the instruction.
  send_me text,
  -- Where in the picture the face is. The card's slot is square and a
  -- photograph almost never is, so something gets cropped off — and left to
  -- the browser what gets cropped off is whatever is not in the middle, which
  -- for a photograph of a person is often their head. Two percentages, stored
  -- as a CSS object-position: "50% 32%".
  portrait_position text,
  -- The portrait itself, when its keeper uploaded one rather than pointing at
  -- one. Base64 in a column and served back by /api/portrait, so that adding a
  -- picture from a phone needs no storage bucket, no third-party account and no
  -- dependency — a copy of this software already has a database and that is all
  -- this asks for. Downscaled in the browser before it is sent, so this holds
  -- something like a hundred kilobytes rather than a camera's worth.
  --
  -- Deliberately never handed to the page: portrait_url carries the short path
  -- and this carries the bytes, so a portrait does not end up inlined into the
  -- HTML of every page on the site.
  portrait_data text,
  portrait_mime text,
  -- Only what the owner has rewritten. Anything untouched is absent and falls
  -- back to the text shipped in library/definitions.js, so a copy that never
  -- edits its definitions stores nothing at all.
  definitions jsonb,
  updated_at timestamp without time zone DEFAULT now()
);

-- Foreign keys, added once every table exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_parent_id_fkey') THEN
    ALTER TABLE comments ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settings_pinned_entry_id_fkey') THEN
    ALTER TABLE settings ADD CONSTRAINT settings_pinned_entry_id_fkey
      FOREIGN KEY (pinned_entry_id) REFERENCES entries(id) ON DELETE SET NULL;
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
