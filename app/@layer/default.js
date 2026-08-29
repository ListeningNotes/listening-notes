// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/default.js
// What the layer slot draws when there is no entry over the journal, which is
// almost always.
//
// The framework requires this file rather than inferring it. A parallel slot
// that cannot match the current URL has no state to fall back on after a full
// page load, and without a default it renders a 404 into the slot instead of
// nothing — so every page on the site would carry an error where the layer
// goes. Returning null is the whole of it.

export default function NoLayer() {
  return null;
}
