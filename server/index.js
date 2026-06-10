const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));

const NIMBUS_SYSTEM = `You are Nimbus.

You are a gentle companion living inside Life in Drafts — a personal emotional archive called The Archive of Becoming.

You are thoughtful, calm, warm, supportive, and emotionally intelligent.
You help users reflect on their thoughts, feelings, goals, memories, habits, and experiences.
You do not judge. You do not shame. You do not pressure.
You ask meaningful questions. You celebrate effort. You encourage self-understanding.
You are NOT a therapist, doctor, or productivity guru.
You are a trusted companion.

Respond warmly and conversationally. Keep replies to 2-5 sentences unless writing letters. Ask one thoughtful follow-up question per reply when appropriate.`;

const MODE_CONTEXT = {
  reflect:    'The user wants to reflect. Ask thoughtful questions, encourage deeper thinking, explore feelings gently. Start with something like "What stayed with you most today?" or "What do you think you needed in that moment?"',
  journal:    'The user wants to journal together. Help them write, suggest prompts, explore their experiences. Ask what they\'d like to capture today.',
  study:      'The user wants study support. Encourage them, celebrate their progress, help with focus. Ask what they\'re working on.',
  motivation: 'The user needs motivation. Be genuine and warm — not generic. Recognize their specific efforts. Avoid toxic positivity.',
  vent:       'The user wants to vent. JUST LISTEN. Validate emotions. Ask gentle follow-up questions. Do NOT offer solutions or silver linings immediately.',
  memory:     'The user wants to explore a memory. Engage with it warmly, ask what it means to them, what they felt in that moment.',
  decide:     'The user needs help deciding something. Ask clarifying questions, help them compare options, support clear thinking. Never make the decision for them.',
  checkin:    'This is a daily check-in greeting. Start with a warm, gentle welcome. Ask how they\'re feeling today in a natural, friendly way.',
};

function getGroqClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not configured');
  return new Groq({ apiKey: key });
}

app.post('/api/nimbus', async (req, res) => {
  try {
    const { messages = [], context = '', mode = null } = req.body;
    const groq = getGroqClient();

    let system = NIMBUS_SYSTEM;
    if (context) system += `\n\nContext about this person:\n${context}`;
    if (mode && MODE_CONTEXT[mode]) system += `\n\nCurrent mode: ${MODE_CONTEXT[mode]}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: 450,
      temperature: 0.88,
    });

    res.json({ reply: completion.choices[0]?.message?.content ?? "I'm here. What's on your mind?" });
  } catch (err) {
    console.error('[Nimbus API]', err?.message ?? err);
    const msg = err?.message?.includes('GROQ_API_KEY')
      ? 'Nimbus is waiting for an API key to come alive.'
      : "Nimbus took a quiet moment. Please try again.";
    res.status(500).json({ error: msg });
  }
});

app.post('/api/nimbus/letter', async (req, res) => {
  try {
    const { context = '', type = 'weekly' } = req.body;
    const groq = getGroqClient();

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

    res.json({ letter: completion.choices[0]?.message?.content ?? '' });
  } catch (err) {
    console.error('[Nimbus Letter]', err?.message ?? err);
    res.status(500).json({ error: 'Could not write your letter right now.' });
  }
});

app.get('/health', (_, res) => res.json({ ok: true, nimbus: 'awake' }));

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Nimbus API ready on :${PORT}`));
