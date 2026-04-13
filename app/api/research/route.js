import { research_album } from '@/library/ai_integration';

export async function POST(request) {
  try {
    const { album, artist } = await request.json();
    const data = await research_album(album, artist);
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
