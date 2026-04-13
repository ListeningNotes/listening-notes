import { format_post } from '@/library/ai_integration';

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await format_post(body);
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
