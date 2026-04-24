import { research_album } from '@/library/ai_integration';
import { requireWristband } from '@/library/wristband';

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const { album, artist } = await request.json();
    const data = await research_album(album, artist);
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
