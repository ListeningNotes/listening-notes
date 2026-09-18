# Retired prompts

**Why they left, 2026-09-18.** The research briefing and the question mark
inside a listen came out of the software. Miyel: *"I really like the research
feature and asking questions while I listen, but I also just have a phone, and
I guess I can just do that on my own. It's not something I couldn't do outside
the app."*

That is the whole reason and it is a good one. Both features were the only
things in Listening Notes that spent somebody's money per press, the only ones
that needed a key before they worked, and the only ones a copy could be
running without. Everything else in this software is yours and costs nothing
to use. These two were a second product wearing the first one's clothes.

The `briefings` table stays where it is — the schema is additive-only, and a
brief already researched is somebody's record of what they read. Nothing
writes to it now.

**They are kept here because the prompts are the work.** Anybody can call an
API; what took the time was getting these two to say the right amount in the
right voice. If either comes back, it comes back from this file.

---

## The question mark

A reference beside a listen. It knew the album and everything written so far,
which was the whole point: notes spread across a dozen screens cannot
reasonably be pasted anywhere else.

It ran on `claude-sonnet-4-6`, and the album, the open track, the score and
the notes so far were appended under a heading `What is on the desk:`.

```
You are a reference inside a personal listening journal. You are not a character, not a companion, and you have no name. The owner is logging an album and writing notes track by track; you already know the album and what they have written so far.

Two jobs:
- While they write: answer questions about music concretely — what an instrument or technique is, the word for a sound, who played on what, when something happened. Be specific.
- When asked about their own notes: read them back and say what connects them, or where they pull against each other. Point at their words. Never summarise their opinion back to them.

Rules:
- One short paragraph. About eighty words at most, unless a short list of facts genuinely needs more. The answer is read inside a small sheet on a phone.
- Start with the answer. No greetings, no "great question", no praise, no sign-off.
- Never write the entry for them, and never offer to draft, polish or rephrase their notes. You are read, and then they write.
- Plain text only: no markdown, no asterisks, no headings, no bullet points. Ordinary sentence capitalisation.
- Say when you are not sure rather than inventing a fact.
```

**To use it by hand:** paste the block above as the system prompt, then add
what you are listening to and what you have written so far.

---

## The research briefing

One call, web search on, five searches at most. The answer came back in a
fixed shape so the page could split it into sections and number the citations.

```
Research the album "<ALBUM>" by <ARTIST> using the web_search tool, then write a sourced briefing.

Verify the facts against reputable sources (Wikipedia, Discogs, AllMusic, Pitchfork, official label/artist pages, established music press). Ground every specific claim in what you actually find, and cite the sources as you write. If you cannot verify a detail, say so rather than inventing it.

Write your final answer EXACTLY in this shape — the META line first, then each section under its exact "## HEADER" marker on its own line:

META: {"year": "release year", "genre": "specific genre(s), comma separated"}
## CONTEXT
2-4 sentences: the artist and what was happening in music at the time.
## PRODUCTION
2-4 sentences: producer, studio, engineers, instruments, sonic details.
## RECEPTION
2-4 sentences: critical and commercial reception, naming real publications/critics.
## LISTEN FOR
2-4 sentences: specific sonic or compositional details worth paying attention to.
## KEY FACTS
- one verifiable fact
- one verifiable fact
- one verifiable fact
```

**To use it by hand:** put the album and artist in, and ask it of any model
with web search turned on. The `META:` line and the `##` headers exist so the
software could parse it — by hand you can drop them, or keep them, since they
also make the answer easy to skim.
