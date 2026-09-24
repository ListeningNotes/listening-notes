// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/came-back/route.js
// What came back, owner-only all three ways: the list the inbox draws, what
// the keeper's browser noticed on their friends' journals, and a row opened.
//
// POST carries rows the feed matched — entries on other journals whose credit
// names this one — and nothing is asked of those journals here: the browser
// has already read their public feeds, and this copy only writes down what it
// was shown (library/came_back_actions.js). PATCH carries an id and marks it
// seen, which is the inbox's dot going out.
import { requireWristband } from '@/library/wristband';
import { pull_came_back, save_came_back, see_came_back } from '@/library/came_back_actions';

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    return Response.json({ cameBack: await pull_came_back() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const body = await request.json().catch(() => ({}));
    const added = await save_came_back(body?.rows);
    return Response.json({ added });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const body = await request.json().catch(() => ({}));
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id < 1) {
      return Response.json({ error: 'Which one?' }, { status: 400 });
    }
    await see_came_back(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
