#!/usr/bin/env node
/* Lightweight regression checks for structured symptom extraction prompts. */
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is required for evals.');
  process.exit(1);
}

const evalPath = path.join(process.cwd(), 'evals', 'llm_cases.json');
const cases = JSON.parse(fs.readFileSync(evalPath, 'utf8'));

async function runCase(testCase) {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      tags: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string' } },
      followup: {
        type: 'object',
        additionalProperties: false,
        properties: {
          onsetTimeline: { type: 'string' },
          mainSymptoms: { type: 'string' },
          associatedSymptoms: { type: 'string' },
          triggers: { type: 'string' },
          recentChanges: { type: 'string' },
          familyHistory: { type: 'string' }
        },
        required: [
          'onsetTimeline',
          'mainSymptoms',
          'associatedSymptoms',
          'triggers',
          'recentChanges',
          'familyHistory'
        ]
      }
    },
    required: ['summary', 'tags', 'followup']
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 500,
      messages: [
        { role: 'system', content: 'Return structured clinical extraction in JSON only.' },
        { role: 'user', content: `Input symptom text:\n${testCase.input}` }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'eval_extract',
          strict: true,
          schema
        }
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI error ${response.status}: ${JSON.stringify(data)}`);
  }

  const content = String(data?.choices?.[0]?.message?.content || '').trim();
  const parsed = JSON.parse(content);
  const summary = String(parsed.summary || '').toLowerCase();
  const passed = testCase.expected_keywords.every((keyword) => summary.includes(String(keyword).toLowerCase()));

  return {
    id: testCase.id,
    passed,
    summary: parsed.summary,
    tags: parsed.tags
  };
}

async function main() {
  const results = [];
  for (const testCase of cases) {
    try {
      const result = await runCase(testCase);
      results.push(result);
    } catch (error) {
      results.push({ id: testCase.id, passed: false, error: String(error) });
    }
  }

  const failed = results.filter((r) => !r.passed);
  console.log(JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2));
  if (failed.length > 0) {
    process.exit(2);
  }
}

main();

