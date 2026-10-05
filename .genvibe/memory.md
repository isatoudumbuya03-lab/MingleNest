<!-- genvibe-memory covers:msg-H2rZmlLdmDqYs1CtM63vCuKX -->
## What this app is
MingleNest is a Vite/React web app with Capacitor configuration for Android (`com.minglenest.app`). It combines social profiles, posts, stories, chats, and personalized AI Kids Stories.

## Built so far
- Home, Profile, Chats, Stories, and Kids Stories screens with local first-version account/content flows.
- Kids Stories generates personalized text using Gemini via `supabase/functions/generate-kids-story/index.ts`; the API key is kept server-side. Save-story and Create-another controls remain.
- Profile avatar and cover photo selection with instant preview. Supabase Storage upload was implemented, but database access remains unconfirmed.
- Story and post image-upload flows, and message deletion were implemented. User reported creating `posts` and `kids_stories` tables and enabling RLS; access was still reported denied.
- Profile Delete account opens a confirmation and then a Google Form; this is a deletion request, not confirmed direct account deletion.
- AI video app-side feature was removed; the previously deployed Veo endpoint could not be removed.
- Capacitor configuration was added; no production `.aab` build is confirmed.
- Supabase project: `amljaleklvaawyyqauyl`. Relevant files: `src/App.tsx`, `src/index.css`, `src/supabase.ts`, `capacitor.config.ts`.
- Updated existing desktop and mobile branding to use the original logo image from `https://ibb.co/xqSfqLVR`; files changed: `public/minglenest-logo.png`, `src/App.tsx`, `src/index.css`.
- Existing text, buttons, and text fields were made clearly and noticeably bold throughout the app by increasing font weight. Only `src/index.css` changed; wording, font style, size, layout, spacing, colors, navigation, logo, and features remain unchanged.

## Design
Lavender background, royal-purple actions, blue and green highlights, charcoal text, and white surfaces. App name: **MingleNest**. Logo is reported updated using the original image.

## Structure
Vite + React + TypeScript web app with Capacitor configuration; not a React Native/Expo project. Supabase is used for backend/storage and the Gemini Edge Function.

## User preferences & rules
- Preserve the existing app, features, screens, data, navigation, branding, and package ID. Do not rebuild or break existing functionality.
- Use the exact supplied logo artwork; do not recreate, redesign, crop, stretch, recolor, or modify it.
- Make existing text clearly and noticeably bold by increasing font weight only. Keep wording, font style, size, layout, spacing, colors, navigation, logo, features, and everything else unchanged.
- Do not redesign or change unrelated features.

## Open issues & next ideas
- Confirm Supabase table grants/policies and test uploads, reads, and deletes.
- Real chat media and production calling were discussed but not implemented; reliable background incoming calls require a provider and native/push integration.
- Android `.aab` packaging has not been confirmed or built.
