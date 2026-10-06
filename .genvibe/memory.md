<!-- genvibe-memory covers:rGqrdobJacGqJRoG -->
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
- Supabase project: `amljaleklvaawyyqauyl`.
- Desktop and mobile branding use the original logo image from `https://ibb.co/xqSfqLVR`; files changed: `public/minglenest-logo.png`, `src/App.tsx`, `src/index.css`.
- Existing text, buttons, and text fields were made noticeably bold by increasing font weight; only `src/index.css` changed.
- Chat uses the restored Supabase session and same user ID as the signed-in profile/social features; no separate Chat registration. Private one-to-one text/emoji messaging and live updates use Supabase.
- Voice messages support recording, timing, canceling, sending, authenticated Storage download/playback, pause, and replay. Own-message deletion removes its database row, attempts audio removal, and notifies the recipient to reload.
- Chat security work includes `src/privateChat.ts`, `src/VoicePlayer.tsx`, `src/App.tsx`, `supabase/migrations/harden_private_chat_voice_permissions.sql`, and `supabase/migrations/chat_directory_realtime.sql`. Changes also include `src/supabase.ts`, `src/authCallback.ts`, and `docs/minglenest-auth-android.md`.
- Native verification return uses `com.minglenest.app://auth/callback`. `@capacitor/app@^8.0.0` was added. Device testing remains unconfirmed.

## Design
Lavender background, royal-purple actions, blue and green highlights, charcoal text, and white surfaces. App name: **MingleNest**. Logo is reported updated using the original image.

## Structure
Vite + React + TypeScript web app with Capacitor configuration; not a React Native/Expo project. Supabase is used for backend/storage and the Gemini Edge Function.

## User preferences & rules
- Continue working on the existing MingleNest app; do not create a new app or rebuild from scratch.
- Preserve existing features, screens, data, navigation, branding, package ID, logo, colors, typography, and bottom navigation. Do not redesign the app or break functionality.
- Keep the exact supplied logo artwork unchanged.
- Make existing text noticeably bold by increasing font weight only; preserve wording, font style, size, layout, spacing, colors, navigation, logo, and features.
- Do not create fake/demo voice messaging.

## Open issues & next ideas
- Test live text and real voice messaging on devices; verify microphone permissions, uploads, playback, and deletion.
- Confirm Supabase table grants/policies and test uploads, reads, and deletes.
- Configure and verify production authentication/verification redirects and test-account setup.
- Real voice calling and reliable background incoming calls require a provider and native/push integration.
- Android `.aab` packaging has not been confirmed or built.
