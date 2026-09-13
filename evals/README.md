# Evals for Nex

`bakeoff.ts` runs one realistic prospect conversation through the real system
prompt on any gateway models you name, and prints latency, tokens, cost, and the
replies for side-by-side judging against the rubric in the file header.

```bash
vercel env pull .env.local            # once; provides AI_GATEWAY_API_KEY
set -a; source .env.local; set +a
npx tsx evals/bakeoff.ts anthropic/claude-opus-5 anthropic/claude-sonnet-5 openai/gpt-5.6-sol
```

Result on 2026-09-12 (two turns, real prompt): Claude Opus 5 gave the most
human, most specific consulting answer at about $0.08 per conversation; Claude
Sonnet 5 was fastest (1.3 s to first token) and nearly as good at about $0.03;
GPT-5.6 Sol was correct but terse at about $0.02; gpt-oss-20b (the previous
production model) was generic. Production now runs `anthropic/claude-opus-5`.

Usage per request is logged from `app/api/chat/route.ts` as one JSON line
(`event: "chat.usage"`) with input, cached, output, and reasoning tokens, step and
tool-call counts, and the finish reason. Filter Vercel logs on `chat.usage` to
chart cost per conversation.
