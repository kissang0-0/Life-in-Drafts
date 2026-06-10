import Groq from 'groq-sdk';

const CARD_SYSTEM = `You are Nimbus — a quiet, warm companion living inside Life in Drafts, a personal emotional archive.

Your job is to write ONE short home card message for the user, based on their real activity data.

STRICT RULES:
- Write 1 to 3 sentences ONLY. No more.
- Do NOT wrap the message in quotation marks
- Sound human, observant, and calm — like a trusted friend who has quietly been reading the story of someone's life and leaves a thoughtful note
- When observing patterns, use soft language: "it seems", "I notice", "you've been", "lately", "you tend to", "it looks like"
- Do NOT sound like a therapist, life coach, or motivational speaker
- Do NOT use these words: journey, tapestry, dive, let's, vibrant, empower, thrive, transformative, utilize
- Do NOT start with the word "I" — vary opening words naturally
- If the category is "Gentle Question" — write a single thoughtful, open-ended question that invites reflection (not productivity)
- If the category is "Memory Recall" — reference something specific from their past data in a warm, meaningful way
- If the category is "Pattern Recognition" — name a specific behavioral or emotional pattern you notice in their data (use soft language)
- Reference SPECIFIC details from their context whenever possible — generic messages feel hollow
- The user should feel: "How did Nimbus notice that?" — make it feel genuinely personal

Output ONLY the message text. No labels, no surrounding quotes, no explanation.`;

function getGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not configured');
  return new Groq({ apiKey: key });
}

export async function POST(request: Request) {
  try {
    const { context = '', history = [], category = 'Observation' } = await request.json();

    const groq = getGroq();

    const historyBlock = history.length > 0
      ? `\n\nPrevious cards — do NOT repeat these ideas, sentence structures, or openings:\n${history.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n')}`
      : '';

    const userPrompt = `Category: ${category}\n\nUser's activity data:\n${context}${historyBlock}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: CARD_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 130,
      temperature: 0.93,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    const message = raw.replace(/^["'\u201C\u201D]|["'\u201C\u201D]$/g, '').trim();

    return Response.json({ message });
  } catch (err: any) {
    console.error('[Nimbus HomeCard]', err?.message ?? err);
    return Response.json({ error: 'Could not generate card.' }, { status: 500 });
  }
}
