-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- migrations/007_people.sql
--
-- The address book. A person here is an address — where somebody's journal
-- is — and nothing more: they can be written down, read and compared against
-- without ever having sent anything. What they have sent is joined from
-- submissions by that same address when it is wanted, so a send is a layer
-- over a person, not what makes one exist.
--
-- Written by this copy's keeper alone, one-sidedly. There is nothing to
-- accept on the other side, because accepting would mean reaching into
-- somebody else's journal from outside, which is the phone-home this
-- software does not do. It is the shape of a feed reader's list of feeds.
--
-- The address is kept the way the send form keeps a return address — no
-- scheme, no path, no trailing slash, lower case — so the same journal typed
-- three ways is one row. The name is what their journal said it was called
-- when the address was filed, so the list draws without asking every journal
-- again. The face is never stored: every copy serves its portrait at the same
-- path, and an <img> can point straight at it.
CREATE TABLE IF NOT EXISTS people (
  id serial NOT NULL,
  address text NOT NULL,
  name text,
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT people_pkey PRIMARY KEY (id),
  CONSTRAINT people_address_key UNIQUE (address)
);
