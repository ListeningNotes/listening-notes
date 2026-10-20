-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- The spare key, 2026-10-20.
--
-- The way back into a journal when every device that held a passkey is gone
-- and the password with it, and the only way back on a journal that never
-- had a password (Miyel's brief, passkeys: "a recovery code is the floor";
-- her name for it, 2026-10-17). Sixteen letters and numbers, shown once when
-- made and kept here only as a hash, beside the password's, in the vault
-- that library/secrets.js alone reads. It opens the door once (her pick,
-- 2026-10-20): the sign-in it opens clears the hash and stamps
-- `spare_key_used_at`, and Your keys makes another.
ALTER TABLE secrets ADD COLUMN IF NOT EXISTS spare_key_hash text;
ALTER TABLE secrets ADD COLUMN IF NOT EXISTS spare_key_made_at timestamptz;
ALTER TABLE secrets ADD COLUMN IF NOT EXISTS spare_key_used_at timestamptz;
