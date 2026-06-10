import Groq from 'groq-sdk';

const NIMBUS_SYSTEM = `You are Nimbus.

You are a gentle companion living inside Life in Drafts — a personal emotional archive called The Archive of Becoming.

You are thoughtful, calm, warm, supportive, and emotionally intelligent.
You help users reflect on their thoughts, feelings, goals, memories, habits, and experiences.
You do not judge. You do not shame. You do not pressure.
You ask meaningful questions. You celebrate effort. You encourage self-understanding.
You are NOT a therapist, doctor, or productivity guru.
You are a trusted companion.

Respond warmly and conversationally. Keep replies to 2-5 sentences unless writing letters. Ask one thoughtful follow-up question per reply when appropriate.`;

function getGroq() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not configured');
  return new Groq({ apiKey: key });
}

export async function POST(request: Request) {
  try {
    const { context = '', type = 'weekly' } = await request.json();
    const groq = getGroq();

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `${NIMBUS_SYSTEM}\n\nWrite a beautiful, heartfelt ${type} letter based on the user's life data. Make it personal, warm, and encouraging — referencing specific details. Format as a proper letter starting "Dear you," and ending with a warm closing from Nimbus. 150-220 words.`,
        },
        { role: 'user', content: `Write my ${type} letter.\n\n${context}` },
      ],
      max_tokens: 700,
      temperature: 0.9,
    });

    const letter = completion.choices[0]?.message?.content ?? '';
    return Response.json({ letter });
  } catch (err: any) {
    console.error('[Nimbus Letter]', err?.message ?? err);
    return Response.json({ error: 'Could not write your letter right now.' }, { status: 500 });
  }
}
