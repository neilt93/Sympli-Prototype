const OPENAI_API_BASE = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

type ModerationResult = {
  blocked: boolean;
  reasons: string[];
};

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is missing');
  }
  return key;
}

export async function moderateInput(input: string): Promise<ModerationResult> {
  try {
    const key = getOpenAIKey();
    const response = await fetch(`${OPENAI_API_BASE}/moderations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: String(input || '').slice(0, 6000),
      }),
    });

    if (!response.ok) {
      return { blocked: false, reasons: [] };
    }

    const data = await response.json();
    const result = data?.results?.[0];
    const categories = result?.categories || {};
    const blocked = Boolean(result?.flagged);
    const reasons = Object.entries(categories)
      .filter(([, value]) => Boolean(value))
      .map(([name]) => name);

    return { blocked, reasons };
  } catch {
    // Fail open so the app remains available if moderation is temporarily unavailable.
    return { blocked: false, reasons: [] };
  }
}

type StructuredCompletionParams<T> = {
  schemaName: string;
  schema: Record<string, any>;
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  attempts?: number;
};

export async function structuredCompletion<T>({
  schemaName,
  schema,
  system,
  user,
  model = DEFAULT_MODEL,
  temperature = 0.3,
  maxTokens = 500,
  attempts = 2,
}: StructuredCompletionParams<T>): Promise<T> {
  const key = getOpenAIKey();
  let lastError: Error | null = null;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: schemaName,
              strict: true,
              schema,
            },
          },
        }),
      });

      const data = await response.json();
      const content = String(data?.choices?.[0]?.message?.content || '').trim();
      if (!content) {
        throw new Error('OpenAI returned empty structured content');
      }

      return JSON.parse(content) as T;
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error('OpenAI structured completion failed');
}

export async function textCompletion(params: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const key = getOpenAIKey();
  const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: params.model || DEFAULT_MODEL,
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 350,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
    }),
  });

  const data = await response.json();
  const content = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!content) {
    throw new Error('OpenAI returned empty text completion');
  }
  return content;
}
