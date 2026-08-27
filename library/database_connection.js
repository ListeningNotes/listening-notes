// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { neon } from '@neondatabase/serverless';

const database = neon(process.env.DATABASE_URL);

export default database;
