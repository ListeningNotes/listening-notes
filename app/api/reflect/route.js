import { ask_echo } from '@/library/ai_integration';

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await ask_echo(body);
    return Response.json({ reply: data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
