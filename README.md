# PantryPal

PantryPal is an AI-assisted kitchen companion: **buy → store → plan → cook → update inventory → buy again**.

The MVP answers one question well: **what should I do with the food I have?**

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose **Continue with demo kitchen**. The demo kitchen lives in the browser (`localStorage`) so you can try the loop without cloud credentials.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

- Without Supabase keys, sign-in is demo-only. Cloud auth, RLS, and persistence are ready once you create a project and run `supabase/schema.sql`.
- Without `OPENAI_API_KEY`, “What can I cook?” still works using deterministic matching against your inventory and the recipe catalog. With a key, the same route calls OpenAI, validates JSON with Zod, and never writes to the database.

Never put the OpenAI key or a Supabase service-role key in client code.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (schema + auth) · OpenAI (optional)

## What’s in the MVP

- Dashboard with greeting, expiring items, tonight’s meal, and Ask PantryPal
- Fridge / freezer / pantry visualization plus list view
- Inventory add / edit / move / used / discarded
- Recipe catalog, ingredient matching, missing items → shopping list
- Week meal planner
- Shopping list grouped by category with source (`manual`, `meal_plan`, `low_inventory`)
- Cooking steps with “I cooked this” inventory updates (deterministic, not LLM)

## Later phases (interfaces exist, not built yet)

Receipt OCR, budget charts, storage advisor, cooking-mode timers, and chat assistant.

## Supabase setup

1. Create a project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Add the URL and anon key to `.env.local`.
4. Enable email/password auth if you want cloud sign-in.
