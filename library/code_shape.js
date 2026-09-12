// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/code_shape.js
// Two numbers about the shape of a code, read on both sides of the wire: the
// press (library/portrait_code.js) draws by them on the server, and the
// things that show a pressed picture in the browser size it by them — the
// code is drawn to fill the square the picture stood in, and the quiet zone
// hangs off the edges, where the page is anyway. One file, so the two sides
// cannot drift. No imports, so either side can read it.

// Modules of margin on all four sides. A scanner needs the clear margin to
// find the edges, and four is the standard's minimum.
export const CODE_QUIET = 4;

// The smallest code drawn. A journal's address fits version 4 and an entry's
// address needs six to ten, so the version comes from the data — but never
// below this, because a version-3 code with a face in it is 29 modules of
// photograph and the card was designed around 33.
export const LEAST_VERSION = 4;
