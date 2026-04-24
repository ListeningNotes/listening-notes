import { pull_entry_by_slug, update_entry, delete_entry } from '@/library/database_actions';
import { requireWristband } from '@/library/wristband';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const entry = await pull_entry_by_slug(slug);
    if (!entry) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ entry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const { slug } = await params;
    const body = await request.json();
    const { slug: _ignore, ...fields } = body;
    const entry = await update_entry(slug, fields);
    if (!entry) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ entry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const { slug } = await params;
    const result = await delete_entry(slug);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
