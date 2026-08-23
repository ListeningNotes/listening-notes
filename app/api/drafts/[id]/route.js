import { delete_draft } from '@/library/database_actions';
import { requireWristband } from '@/library/wristband';

export async function DELETE(request, { params }) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const { id } = await params;
    const result = await delete_draft(Number(id));
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
