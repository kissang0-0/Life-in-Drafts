export type ChatRole = 'user' | 'assistant';
export type ChatMsg = { role: ChatRole; content: string };

export async function sendToNimbus(params: {
  messages: ChatMsg[];
  context?: string;
  mode?: string | null;
}): Promise<string> {
  const res = await fetch('/api/nimbus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: params.messages,
      context: params.context ?? '',
      mode: params.mode ?? null,
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Nimbus is unavailable right now.');
  return json.reply as string;
}

export async function generateNimbusLetter(params: {
  context: string;
  type: 'weekly' | 'monthly';
}): Promise<string> {
  const res = await fetch('/api/nimbus/letter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Could not generate letter.');
  return json.letter as string;
}
