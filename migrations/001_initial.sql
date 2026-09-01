-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- migrations/001_initial.sql
--
-- The whole schema as it stands, as one migration. Everything before this file
-- existed was applied by hand, so 001 has to be safe to run against a database
-- that already has all of it — and it is: every CREATE carries IF NOT EXISTS,
-- every added column carries IF NOT EXISTS, and the foreign keys are wrapped in
-- DO blocks that check pg_constraint first. Against the journal this was
-- written on, 001 does nothing at all. Against an empty database it builds
-- everything.
--
-- That is why there is no baseline step and no "assume 001 has run" flag. The
-- fiddliest part of adopting a migration runner is usually teaching it that an
-- existing database is already up to date; this schema was idempotent before
-- the runner existed, so the problem never arises.
--
-- Columns dropped along the way — entries.relationship, drafts.relationship,
-- submissions.submitter_email, comments.author_email — are not here. A fresh
-- database never creates them, and the one database that had them has already
-- lost them. Their reasons live in DECISIONS, which is where reasons go.
--
-- From here on, nothing edits this file. A change is a new numbered file.

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
  -- Where the commenter keeps their own journal, if they keep one. Optional,
  -- and it replaced author_email rather than joining it: nothing on this site
  -- sends email, so an address was a personal detail held for no purpose. A
  -- URL is the other kind of thing — where something is, not who somebody is —
  -- and one that resolves to a real journal is a better signal than an email,
  -- which anybody can invent. Stored without a scheme; see return_address.js.
  author_url text,
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
  -- Only ever set on a listen started from the inbox, where both are already
  -- known. Here rather than only on entries so that pausing such a listen and
  -- picking it up tomorrow does not lose who sent the record.
  received_from text,
  received_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT drafts_pkey PRIMARY KEY (id),
  CONSTRAINT drafts_lookup_key_key UNIQUE (lookup_key)
);

-- The two above, for a database that already has this table.
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS received_from text;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS received_date date;

CREATE TABLE IF NOT EXISTS echo_memory (
  id serial NOT NULL,
  -- 'owner' rather than a person's name. This defaulted to the name of whoever
  -- wrote the first journal, which meant every copy of this software created a
  -- row belonging to a stranger. Nothing reads this table yet — Echo keeps no
  -- long-term memory at present — but a default is shipped code, and shipped
  -- code should not carry somebody's name.
  user_id text DEFAULT 'owner'::text,
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
  -- relationship text was here. First Listen / Revisit / Formative / Study /
  -- Submission: one word for what kind of listen this was. Every value has
  -- gone somewhere better or gone deliberately — Submission is entry_type,
  -- Formative is a flag of its own, and Revisit and Study were dropped on the
  -- grounds that a journal records listens going forward and whether you had
  -- heard something before is a sentence in the notes rather than a column.
  -- Dropped 2026-08-30, after the nine Formative rows were migrated onto the
  -- flag. See DECISIONS.
  rating text,
  favorite boolean DEFAULT false,
  background text,
  notes text,
  -- tags text[] was here. Autogenerated by the model in the old format call,
  -- never written by hand and never used to find anything; 54% of the values
  -- restated a column the table already had and the rest were generic
  -- descriptors. Dropped 2026-08-27, while the schema was still a draft and no
  -- copy of this software existed to migrate. Genre plus search over the notes
  -- is how the archive sorts now.
  horizon text,
  album_art text,
  post_link text,
  created_at timestamp without time zone DEFAULT now(),
  -- When the *album note* was last rewritten. Not the entry as a whole: each
  -- track carries its own stamp inside the tracks column below, because a date
  -- at the top of a post says only that something moved, where a date under
  -- track two says what. This column is the album note's because that note is
  -- the one piece of writing the entry itself owns.
  --
  -- Set by update_entry when the note genuinely differs from what is stored —
  -- not when a genre is corrected or a favourite toggled, which are filing
  -- rather than rewriting.
  --
  -- Null means never edited, which is why it is not defaulted to now(): an
  -- entry written once should say nothing rather than claim it was edited on
  -- the day it was posted.
  --
  -- The point is not an audit trail. An entry carrying five track stamps looks
  -- different from one carrying a single typo fix, and that visible difference
  -- is what keeps editing from becoming a quiet rewrite tool.
  edited_at timestamp without time zone,
  slug text,
  masterpiece boolean DEFAULT false,
  -- The third and last flag. Formative was a relationship — one of five things
  -- a listen could be — which was the wrong shape for it: the others describe
  -- an occasion, this describes a standing fact about the record. An album that
  -- shaped how you listen goes on having done that on every later listen.
  formative boolean DEFAULT false,
  track_notes text,
  -- [{ number, title, rating, favorite, note, edited }]. `edited` is an ISO
  -- timestamp set by update_entry when that one track's note changes, and it
  -- is why the stamps can sit next to the writing they belong to rather than
  -- at the top of the entry. Absent until a track has actually been rewritten.
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

-- ── submissions ────────────────────────────────────────────────────────────
-- An album somebody sent, and why. Three columns are what turn a form
-- submission into a gift being handed over: the cover, so the inbox shows the
-- record rather than reporting its title; the collection id, so the listen it
-- starts opens on the same pressing the sender chose rather than searching for
-- it again; and the sender's own journal, which is an address rather than a
-- contact detail and is what an address book would eventually be built from.
--
-- There is no email column. The send flow does not ask for one, and the
-- reason not to ask is the reason not to keep the ones already given: a
-- contact detail held for no purpose is the first crack in not holding
-- anybody's data. Dropped 2026-08-31, while the schema was still a draft and
-- dropping was still free. sender_url replaced it and is a different kind of
-- thing — an address is where something is, not who somebody is.
CREATE TABLE IF NOT EXISTS submissions (
  id serial NOT NULL,
  album text NOT NULL,
  artist text NOT NULL,
  year text,
  note text NOT NULL,
  submitter_name text,
  album_art text,
  collection_id text,
  sender_url text,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT submissions_pkey PRIMARY KEY (id)
);

-- The three above, for a database that already has this table. CREATE TABLE IF
-- NOT EXISTS does nothing to one that exists, so a live copy needs these
-- separately.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS album_art text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS collection_id text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS sender_url text;

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
  -- The one record from this journal shown as art on the About card. One, and
  -- the shape is the rule: a single column cannot hold two, so pinning a
  -- second unpins the first without anything having to check. The foreign key
  -- below carries ON DELETE SET NULL, so deleting a pinned entry clears the
  -- pin rather than leaving the card pointing at nothing.
  --
  -- A list of three lived here for an afternoon and was taken back out. Three
  -- needed jsonb, and jsonb meant losing the key and the guarantee with it.
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
  -- Which mark stands for the way this journal listens. Everybody has a rig of
  -- some kind and almost nobody has the same one, so the software offers a set
  -- and the owner picks: headphones, speakers, a turntable, a radio, a phone.
  -- One name out of a fixed list, or 'none' to leave the button off entirely —
  -- plenty of people listening on whatever they have would rather not describe
  -- it. See RIG_ICONS in components/main_components/IdentityCard.js.
  rig_icon text,
  -- The listening setup, as rows: [{ "name": "Sennheiser HD 600", "role":
  -- "Headphones" }]. It used to be a page of its own with several hundred
  -- words about why any of it matters, which is one person's essay shipped
  -- inside everybody's software. What is worth saying is what the thing is and
  -- what it does; the rest is the journal.
  rig jsonb,
  -- Three openings, finished. A keeper picks three of the nine that ship in
  -- library/bioprompt.js and answers each in a line, and this is where the
  -- answers go: [{ "key": "never-skip", "answer": "Voodoo, side two" }].
  --
  -- The key, never the sentence. The wording of a prompt is going to be
  -- revised and revising it must not orphan what somebody wrote — so the text
  -- lives in code, this holds only which opening and what was said, and a key
  -- that no longer matches a live prompt is dropped on render.
  --
  -- Replaced a free-text bio, which is still `bio` and still holds whatever
  -- anybody wrote in it. Asked to describe yourself in a box you write a
  -- paragraph about the project; asked what you can never skip you write two
  -- words worth reading.
  bioanswers jsonb,
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
  -- The portrait, made into the journal's own QR code: the photograph fills the
  -- dark modules and everything else is transparent, so the page shows through
  -- and the silhouette of the code *is* the picture. Base64 PNG with alpha,
  -- built in the browser when the photograph or the address changes — it is not
  -- cheap enough to make per request, and it only changes when one of those two
  -- does. portrait_code_url is the stamped path this is served back on.
  portrait_code text,
  portrait_code_url text,
  -- Only what the owner has rewritten. Anything untouched is absent and falls
  -- back to the text shipped in library/definitions.js, so a copy that never
  -- edits its definitions stores nothing at all.
  definitions jsonb,
  -- The name as its keeper writes it, decoration and all.
  --
  -- keeper_name is the plain one: it is what a machine reads, so it goes in the
  -- browser tab, the home-screen label, the feed and anything an external app
  -- files this journal under. This is what a person reads, on the card and in
  -- the About pane, and it is allowed to be ornamented — kaomoji, spacing,
  -- whatever somebody actually calls themselves.
  --
  -- Two columns rather than one because they are read by two different kinds
  -- of reader and only one of them can cope. A feed reader filing a
  -- subscription under a name full of combining characters, or a phone
  -- truncating one under a home-screen icon, is not a styling problem.
  --
  -- Nullable, and null is the ordinary state: leave it empty and the plain
  -- name is used everywhere, which is what most people will want.
  display_name text,
  -- This copy's own serial number, written once when it is first set up and
  -- never again. Not an id — the row already has one of those, and it counts
  -- from 1 in every database, so every copy in the world would claim to be
  -- number one. This is the number printed on the card, and the point of it is
  -- that it is *this* journal's and stays put: a card reissued after a portrait
  -- change should be the same card. Quoted because `serial` means an
  -- auto-incrementing integer everywhere else in this file and the quotes stop
  -- a reader, and the parser, from having to guess which one is meant here.
  "serial" text,
  -- Whether the welcome screen has run. False on a database that has just been
  -- built, which is how the site knows to ask who it belongs to rather than
  -- rendering an unnamed journal at a stranger. Nothing else keys off it, and
  -- it is deliberately not "has a keeper_name": someone is allowed to finish
  -- setup and leave their name blank, and being asked again every load is not
  -- the reward for that.
  setup_complete boolean DEFAULT false,
  updated_at timestamp without time zone DEFAULT now()
);

-- ── Later columns ──────────────────────────────────────────────────────────
-- CREATE TABLE IF NOT EXISTS builds a table that is missing and does nothing at
-- all to one that already exists. So every column added to `settings` after the
-- first copy went out has to be added twice: once above, for a database being
-- built from nothing, and once here, for one that was built last month.
--
-- ADD COLUMN IF NOT EXISTS rather than a DO block that checks the catalogue —
-- shorter, and it says the same thing. Re-running is a no-op either way.
--
-- Additive only, once anyone else is running a copy. Nothing in this section
-- may then rename a column, change its type, or repurpose what one means: a
-- copy in the wild belongs to somebody who cannot be reached, and a migration
-- that fails is their journal not opening.
--
-- The rule has a start date rather than being eternal, and the date is the
-- first install that is not the author's own. Until then this file describes
-- one database, owned by the person editing it, and cleaning it up costs
-- nothing. Publishing the repo did not start the clock; somebody installing
-- from it does.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS "serial" text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS setup_complete boolean DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS bioanswers jsonb;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS edited_at timestamp without time zone;

-- Foreign keys, added once every table exists.
--
-- Scoped to the table by conrelid, not matched on the constraint name alone.
-- A bare name check asks "does anything anywhere call itself this", which is
-- true of another schema in the same database that happens to use the same
-- names — and the answer to that question skips creating the key here, so a
-- fresh install silently comes up with no foreign keys at all. Found exactly
-- that way, rehearsing 001 against an empty schema alongside a populated one.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'comments_parent_id_fkey'
                   AND conrelid = 'comments'::regclass) THEN
    ALTER TABLE comments ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'settings_pinned_entry_id_fkey'
                   AND conrelid = 'settings'::regclass) THEN
    ALTER TABLE settings ADD CONSTRAINT settings_pinned_entry_id_fkey
      FOREIGN KEY (pinned_entry_id) REFERENCES entries(id) ON DELETE SET NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'entries_user_id_fkey'
                   AND conrelid = 'entries'::regclass) THEN
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
