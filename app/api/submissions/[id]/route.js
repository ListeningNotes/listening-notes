import { update_submission_status } from '@/library/submission_actions';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { status } = await request.json();
    if (!['pending', 'reviewed', 'dismissed'].includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }
    const submission = await update_submission_status(id, status);
    return Response.json({ submission });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
