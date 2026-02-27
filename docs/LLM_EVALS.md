# LLM Regression Evals

Use this before changing prompts, models, or JSON schemas for symptom extraction flows.

## Run

```bash
npm run eval:llm
```

Required env:

- `OPENAI_API_KEY`

## What it checks

- Structured JSON extraction still parses with strict schema.
- Summary retains expected clinical keywords from each case.
- Tags are present and follow-up fields are populated.

## Test data

- Cases are in `evals/llm_cases.json`.
- Add new real-world anonymised cases when issues are found in production.

