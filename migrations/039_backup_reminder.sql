-- Copyright (C) 2026 Miyel Brown
-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Backup reminders, 2026-10-20.
--
-- A journal asks for a copy of itself when it has something to lose (Miyel's
-- brief, backup reminders): writing that no copy holds, and a long while
-- since the last copy. It asks once, in an LN. Admin letter it writes itself,
-- and not again for sixty days (library/letterhead.js, ask_for_copy).
--
-- `settings.copied_at` is when a copy of the whole journal was last made:
-- Make a copy in Settings (app/api/export) or the nightly backup
-- (scripts/backup.mjs). Empty until the first copy after this file ran —
-- copies made before it were never written down, which is why the letter to
-- a journal that knows of none says it "doesn't seem" to have one.
--
-- `settings.copy_asked_at` is when the journal last asked.
--
-- `messages.door` is what a letter the journal wrote itself opens: 'copy',
-- Back up your journal in Settings. A letter that arrived never has one;
-- those stay words only (library/letterhead.js has why).
ALTER TABLE settings ADD COLUMN IF NOT EXISTS copied_at timestamptz;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS copy_asked_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS door text;
