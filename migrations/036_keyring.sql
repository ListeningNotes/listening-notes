-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- The keyring, 2026-10-20.
--
-- A passkey is a way into this journal that is not a password: the device
-- keeps a private key in its own secure chip, behind Face ID, Touch ID or a
-- phone's fingerprint, and the journal keeps only the matching public half,
-- which opens nothing on its own (Miyel's brief, passkeys, 2026-10-17). One
-- row per device's key, read and written by library/keyring.js and nothing
-- else, and never selected alongside settings.
--
-- `credential_id` is the key's own name as the device gives it, and
-- `public_key` its public half, both base64url. `counter` is the count some
-- devices keep of their signatures, checked so a copied key would show
-- itself; `transports` how a browser can reach the key. `device` is what
-- the keeper reads in Settings ("iPhone"). `made_for` is the address the key
-- was made at: a passkey belongs to one address, so a journal that moves
-- needs a new one there.
CREATE TABLE IF NOT EXISTS keyring (
  id             serial PRIMARY KEY,
  credential_id  text NOT NULL UNIQUE,
  public_key     text NOT NULL,
  counter        bigint NOT NULL DEFAULT 0,
  transports     jsonb,
  device         text,
  made_for       text,
  added_at       timestamptz NOT NULL DEFAULT now(),
  used_at        timestamptz
);
