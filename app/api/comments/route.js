import { nest_comments, save_comment } from '@/library/comment_actions';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (!slug) return Response.json({ error: 'slug required' }, { status: 400 });

  const comments = await nest_comments(slug);
  return Response.json({ comments });
}

export async function POST(request) {
  try {
    const { slug, track_index, parent_id, author_name, author_email, content } = await request.json();

    if (!slug || !author_name?.trim() || !content?.trim()) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Email is optional — the comment form stopped asking for one. Anything
    // that does still send one has to send a valid one.
    if (author_email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author_email)) {
      return Response.json({ error: 'Invalid email' }, { status: 400 });
    }

    const comment = await save_comment({ slug, track_index, parent_id, author_name, author_email, content });
    return Response.json({ comment });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
