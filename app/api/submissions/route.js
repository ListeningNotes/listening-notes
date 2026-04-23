import { save_submission, pull_submissions } from '@/library/submission_actions';

export async function POST(request) {
  try {
    const { album, artist, year, note, submitter_name, submitter_email } = await request.json();

    if (!album?.trim() || !artist?.trim() || !note?.trim()) {
      return Response.json({ error: 'Album, artist, and note are required.' }, { status: 400 });
    }

    if (submitter_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitter_email)) {
      return Response.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const submission = await save_submission({ album, artist, year, note, submitter_name, submitter_email });
    return Response.json({ submission });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const submissions = await pull_submissions();
    return Response.json({ submissions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
