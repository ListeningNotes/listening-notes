import { pull_entry_by_slug, update_entry, delete_entry } from '@/library/database_actions';

const PASSWORD = 'listeningnotes';

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
  try {
    const { slug } = await params;
    const body = await request.json();
    const { password, slug: _ignore, ...fields } = body;
    if (password !== PASSWORD) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const entry = await update_entry(slug, fields);
    if (!entry) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ entry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { slug } = await params;
    const { password } = await request.json();
    if (password !== PASSWORD) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const result = await delete_entry(slug);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
