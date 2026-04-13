import { pull_all_entries, save_new_entry } from '@/library/database_actions';

export async function GET() {
  try {
    const entries = await pull_all_entries();
    return Response.json({ entries });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const entry = await save_new_entry(body);
    return Response.json({ entry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
