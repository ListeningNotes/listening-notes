// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      // Plain <img> on purpose. Album art comes from Apple's servers and the
      // covers are the site; routing every one through Next's image optimiser
      // would spend a metered allowance on every copy, on every read, for
      // pictures already sized upstream (see sizedAlbumArt). DECISIONS, "What
      // a read costs".
      '@next/next/no-img-element': 'off',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Other checkouts of this repository, made beside it as worktrees. Each
    // is linted in its own folder; read from here, their build output alone
    // is hundreds of errors in code nobody wrote, and the commit hook refuses
    // every commit until somebody deletes a worktree they may still want.
    ".claude/**",
  ]),
]);

export default eslintConfig;
