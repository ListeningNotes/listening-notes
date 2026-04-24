import { format_post } from '@/library/ai_integration';
import { requireWristband } from '@/library/wristband';

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const body = await request.json();
    const data = await format_post(body);
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
