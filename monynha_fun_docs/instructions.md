# Monynha Fun – V0 Instructions

This document contains a complete audit of the current Monynha Fun codebase and a comprehensive plan for finishing the MVP and shipping the **V0** release.  It is meant to guide both human developers and AI agents (e.g. Lovable / Vercel v0) in completing the missing features, improving the user experience, adding internationalisation, connecting to external services, and preparing for production deployment.

## 1. Audit of the Current Implementation

The Lovable‐generated project (`monynha-fun-archive-main`) already provides a solid starting point.  The front‑end is built with **Vite**, **React**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, and integrates with **Supabase** for data and authentication.  The code is organised cleanly and follows modern React conventions.  However, only a subset of the MVP features have been implemented.  The table below summarises what is present and what is missing.

| Area | Implemented in current repo | Missing / incomplete |
| --- | --- | --- |
| **Database** | Supabase tables (`videos`, `tags`, `video_tags`, `categories`, `video_categories`, `suggestions`, `profiles`) and migrations exist, with RLS policies and triggers for updating `votes_count`.  Seed data populates example videos and tags. | No tables for **memes**; no view for suggestion counts; no worker jobs; no triggers for automatic approval; no seeds for users or profiles. |
| **Data fetching** | Home page fetches approved and pending videos, along with their tags and categories, via `supabase.from(...).select(...)`.  Data is transformed for local state. | No paginated or infinite scroll queries; no search or filtering by language; no API layer; no caching strategy beyond React Query default. |
| **Authentication** | Supabase client is configured with `persistSession`, but the UI only calls `supabase.auth.getUser()` to check if a user is present when voting.  There is no way for a visitor to log in, sign up or log out. | Missing login/registration page, OAuth sign‑in, password reset, user profile page, avatar upload, role management and moderation UI. |
| **Video submission** | There is a “Submeter” button in the header, but it does nothing.  There is no form or route for users to submit new videos. | Missing video submission page with URL parsing, duplicate detection, category/tag assignment, storage mode selection, OpenAI description generation, and insertion into the `videos` table. |
| **Voting mechanism** | Pending videos show a 👍 button and the current vote count.  Clicking the button inserts a row into the `suggestions` table and increments the `votes_count`. | No prevention of duplicate votes (except RLS); the UI doesn’t check if the user already voted; no downvote option; no threshold feedback (how many votes needed); no moderation tools to approve/reject videos manually. |
| **Browsing / filtering** | The home page lists “Acervo Aprovado” (approved videos) and “Aguardando Votos” (pending videos) in two tabs.  A sidebar allows filtering by a single category and by special tags (e.g. `biscoito`, `viral`, `clássico`). | Language filter buttons are present but not functional; search bar has no effect; multiple categories cannot be selected; there is no sorting beyond newest videos first; no separate page per category or tag; clicking on a video does not open a detail page with a player. |
| **Tag “biscoito”** | Videos tagged `biscoito` are given a glitchy border and cookie icon on their card. | There is no AI‑driven detection of “biscoito” content; no user confirmation workflow; no content warning prompt. |
| **i18n** | The UI is written entirely in Portuguese.  Category names have fields for PT/EN/ES/FR in the database, and the seed data is present, but only `title_pt` is used. | No internationalisation library; no translation dictionaries; no language switcher; video titles/descriptions are not translated; dates are formatted only in `pt-BR`. |
| **Meme Lab** | Not implemented.  There are no pages or tables for memes. |
| **OpenAI integration** | Not implemented.  There is no code to call the OpenAI API for generating descriptions, translations, meme captions or content classification. |
| **PWA / offline** | None.  The project is a standard Vite app without a service worker or manifest. | Need PWA support, icons, splash screens, offline shell and installation prompt. |
| **UI/UX & animations** | The home page has a vibrant hero section with neon text and gradient backgrounds.  Cards scale on hover and show simple loaders while data is fetching.  Colours and typography follow a dark “cyber‑queer” theme. | The parallax effect, psychedelic loaders, glitch transitions, micro‑interactions and gesture support described in the spec are not implemented.  The “Explore Acervo” and “Votar em Pendentes” buttons do not navigate anywhere.  Some components (e.g. language filter) are static. |
| **Testing / documentation** | README contains generic Lovable instructions. | No developer docs on how to run Supabase migrations, how to seed data, how to deploy to Coolify, or how to contribute. |

### Additional observations

- The Supabase URL and anonymous key are hard‑coded in `src/integrations/supabase/client.ts`.  This is convenient for local testing but should be moved to environment variables for production.
- The project currently uses **Vite** rather than **Next.js**.  That is acceptable for the front‑end, but some parts of the original spec (ISR, Server Components) will not be applicable.  Unless Next.js migration is required, we can proceed with Vite for the front‑end and rely on Supabase’s RPC and client‑side data fetching.
- There is no CMS (Payload).  If editorial workflows and role‑based moderation are needed, consider integrating Payload or building a lightweight admin UI with Supabase’s table editor.
- The codebase does not include any CI/CD pipeline, tests, or ESLint/Prettier configuration beyond Vite defaults.

## 2. Plan for V0 – Tasks to Complete

The following sections describe the tasks required to implement the missing features and polish the Monynha Fun application for the **V0 release**.  They are grouped by theme.  Each task includes pointers to the relevant files and suggested implementation details.  Feel free to adapt to your own coding style and framework.  The tasks are ordered logically but can be worked on in parallel by different agents or contributors.

### 2.1. Environment and Configuration

1. **Move secrets to environment variables**
   - Create a `.env` file at the project root (add `.env.example` to share structure).  Define `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENAI_API_KEY`, `VITE_SITE_URL` and any other secrets.  Example:

     ```env
     VITE_SUPABASE_URL=https://ytkknjsqpcxwbjaoiwax.supabase.co
     VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
     VITE_OPENAI_API_KEY=YOUR_OPENAI_KEY
     VITE_SITE_URL=https://monynha.fun
     VOTES_TO_PUBLISH=5
     ARCHIVAL_MODE=false
     ```

   - Update `src/integrations/supabase/client.ts` to read the URL and key from `import.meta.env` instead of hard‑coding them.
   - In Coolify and/or Vercel, configure these environment variables for the `prod` branch.

2. **Supabase migrations and seed scripts**
   - Review the migrations in `supabase/migrations` and ensure they are applied to your Supabase project.  Use `supabase db push` or the Supabase UI.
   - Add a migration for a `memes` table if you intend to implement the Meme Lab (fields: `id`, `image_url`, `caption_pt`, `caption_en`, etc., `status`, `author_id`, `created_at`).
   - Optionally add a materialised view `video_suggestions_count` to precompute vote counts and thresholds (e.g. `SELECT video_id, SUM(vote) AS total_votes FROM suggestions GROUP BY video_id`).  Expose this via RLS.
   - Create `seed.sql` with demo categories, tags and a few users if you need to test roles (e.g. admin, moderator, user).

### 2.2. Authentication and User Profiles

1. **User context & session management**
   - Create a React context (`AuthContext`) that wraps `supabase.auth.onAuthStateChange` to keep track of the current user (`session?.user`).  Provide helper functions for `signIn`, `signUp`, `signOut` and `updateProfile`.
   - Wrap your application in this context in `main.tsx` or `App.tsx`, and expose a `useAuth` hook to read the current user.

2. **Login / registration page**
   - Create a route `/login` (or a modal triggered by the user icon in the header).  Use shadcn/ui components to build a simple email/password login form.  Alternatively, integrate Supabase’s “magic link” or Google OAuth (requires enabling OAuth providers in Supabase).
   - Provide a link to a `/register` page where users can sign up.  On successful registration, insert a row into the `profiles` table with `user_id` and default role `user`.

3. **User menu and profile page**
   - When a user is logged in, display their avatar or initials in the header.  Clicking it should open a menu with “Profile”, “My Videos”, “Settings” and “Logout”.
   - The profile page (`/profile`) should allow the user to edit their display name, bio and avatar URL (stored in Supabase Storage).  Use RLS to restrict updates to the owner.

4. **Role‑based navigation**
   - If the user’s role is `moderator` or `admin`, show additional navigation links to the moderation dashboard (see section 2.5).

### 2.3. Video Submission & Metadata

1. **Create a submission page**
   - Add a new route `/submit` that renders a form for logged‑in users.  Use a combination of text inputs, selects and tag pickers.  Fields should include:
     - `video_url` (required) – paste YouTube/Vimeo/TikTok/Instagram link.
     - `title` (optional) – pre‑fill with platform title after fetch.
     - `description` (optional) – pre‑fill with AI‑generated summary.
     - `language` (select: pt/en/es/fr, default from user’s browser).
     - `categories` (multi‑select from `categories` table).
     - `tags` (multi‑select or free‑text input that maps to existing `tags` rows; allow users to enter new tags, which a moderator can later approve).

   - When the URL is entered, parse it to determine the platform (e.g. YouTube, Vimeo, TikTok).  Extract the video ID and normalise the embed URL.  You can reuse the helper from `VideoCard.getThumbnailUrl`.  If the video already exists in the database (same `platform_id`), show a message and offer to vote for it instead of re‑submitting.

   - Use the **OpenAI API** to generate a description and translations:
     1. Send a prompt such as “Generate a concise description (max 2 sentences) of the following video titled *<title>* in Portuguese.  Then translate it to English, Spanish and French.  Only return a JSON object with keys `pt`, `en`, `es`, `fr`.”
     2. Use your `VITE_OPENAI_API_KEY` and the `fetch` API on the server side (e.g. via a Vercel Edge Function or Supabase Edge Function) to call GPT‑4 Turbo.  Do not expose the key in client-side code.
     3. Store the generated descriptions in the `videos` table (adding columns `description_en`, `description_es`, `description_fr` if needed) or a separate `video_translations` table.

   - After the insert succeeds, redirect the user to a success page or the pending list with a toast message like “Seu vídeo foi submetido e aguarda votos!”.

2. **Connect the submission button**
   - In `Header.tsx`, wrap the “Submeter” button in a `<Link to="/submit">…</Link>` (using `react-router-dom`).  Alternatively, open a modal containing the submission form.

3. **Normalize video data**
   - Add a helper utility in `src/lib/videos.ts` that accepts a URL and returns an object `{ platform, platform_id, embed_url }`.  Consider YouTube (`youtu.be` and `youtube.com/watch?v=`), Vimeo (`vimeo.com/{id}`), TikTok (`tiktok.com/@user/video/{id}`) and Instagram Reels.  Reject unsupported platforms.
   - When inserting, populate `platform` and `platform_id` fields and compute a slug if desired (e.g. `videos.slug` could be `platform-platform_id`).

4. **Prevent duplicates**
   - Before calling `supabase.from('videos').insert`, query `videos` where `platform_id` matches the parsed ID.  If a row exists, return an error message and show a CTA to vote for that video instead.  This avoids duplicates.

### 2.4. Voting and Community Curation

1. **Prevent double voting**
   - When rendering pending videos, query the `suggestions` table for the current user’s existing votes.  For each video, set `hasVoted` accordingly so the 👍 button is disabled if a vote exists.
   - Consider adding a downvote (vote = −1) so the community can demote spammy submissions.  Update `update_video_votes()` accordingly and display up/down counts.

2. **Display vote threshold**
   - Read `VOTES_TO_PUBLISH` from an environment variable.  Show a progress bar or badge on each pending card indicating “X / N votos para publicar”.  When the threshold is reached, the trigger in Supabase will automatically change `status` to `approved` and set `approved_at`.  You can also show a celebration effect when the status flips.

3. **Moderation dashboard**
   - Create a page `/moderate` accessible only to `moderator` and `admin` roles.  It should list videos with status `pending` and allow the moderator to “Approve”, “Reject” or “Edit”.  Approving sets `status = 'approved'` and optionally tags `approved_by`.  Rejecting sets `status = 'rejected'` and records `approved_by` as the moderator.  Editing opens a form to change title, description, categories, tags and language.
   - Use RLS to ensure only moderators can update videos they did not submit.  Provide confirmation dialogs before destructive actions.

4. **Suggestion counts view**
   - Create a SQL view `public.video_suggestions_count(video_id, total_votes)` that aggregates votes from `suggestions`.  Join this view in your queries so you always display the up‑to‑date vote count, even if triggers fail.  Example:

     ```sql
     CREATE VIEW public.video_suggestions_count AS
       SELECT video_id, SUM(vote) AS total_votes
       FROM public.suggestions
       GROUP BY video_id;
     ```

### 2.5. Search and Filtering Improvements

1. **Search bar functionality**
   - In `Header.tsx`, pass a `onSearch` callback to the parent.  The search should filter videos by title, description, tags and platform.  Use Supabase’s full‑text search (`ilike` or `text_search`) if enabled:

     ```ts
     const { data } = await supabase
       .from('videos')
       .select('*, video_tags(tags(*)), video_categories(categories(*))')
       .ilike('title', `%${query}%`);
     ```

   - Debounce the search input to avoid spamming queries.

2. **Language filter**
   - Add state `selectedLanguage: string | undefined` in `Index.tsx`.  Modify `filteredVideos` to also check `video.language === selectedLanguage` if set.  Bind each language button to update this state.  Highlight the active language.
   - Optionally allow multiple languages or “all” languages.

3. **Multiple categories and tags**
   - Update `selectedCategory` to accept an array.  Allow the user to select multiple categories (e.g. using checkboxes or toggles).  Modify the filter logic to check if any of the video’s categories matches any selected category.
   - For tags, provide a dropdown with multi‑select or allow typed tokens.  Use a component like `Combobox` from shadcn/ui.  Save selected tags in the URL query string (e.g. `?tags=biscoito,viral`).

4. **Sorting and pagination**
   - Offer sorting options: most recent, most voted, trending, oldest.  Use a `<Select>` component to switch sorting.  Modify the Supabase query to order accordingly.
   - Implement pagination or infinite scroll using React Query’s `useInfiniteQuery`.  Fetch 12–20 items at a time.  Provide a “Load more” button or load on scroll.

### 2.6. Internationalisation (i18n)

1. **Setup i18n library**
   - Install a library such as `react-i18next`.  Create a folder `src/i18n` with translation JSONs for `pt`, `en`, `es` and `fr`.  Example:

     ```json
     {
       "title": "Monynha Fun",
       "tagline": "A community‑curated library of Internet gems",
       "explore": "Explore Library",
       "vote_pending": "Vote on Pending"
     }
     ```

   - Initialise i18n in `main.tsx` and wrap the app with `I18nextProvider`.  Provide a hook `useTranslation` to translate keys.

2. **Language switcher**
   - Add a dropdown or buttons to select the language.  When a language is chosen, call `i18n.changeLanguage(lang)`.  Persist the choice in `localStorage` or the user’s profile.  Use flags 🇧🇷, 🇺🇸, 🇪🇸, 🇫🇷 for clarity.

3. **Translate database content**
   - Extend the `videos` table to include `title_en`, `title_es`, `title_fr`, `description_en`, etc., or create a table `video_translations(video_id, lang, title, description)`.  Fill these fields using OpenAI (see section 2.3).
   - When fetching videos, choose the appropriate field based on the current language.  Fallback to the original Portuguese if translation is missing.

4. **Localise dates and numbers**
   - Use `Intl.DateTimeFormat` to format dates according to the current locale.  Replace `new Date(video.created_at).toLocaleDateString('pt-BR')` with `new Date(video.created_at).toLocaleDateString(currentLanguage)`.  Similarly, format numbers (e.g. vote counts) with `Intl.NumberFormat`.

### 2.7. UI/UX Enhancements & Animations

1. **Parallax hero section**
   - Replace the static gradient in the hero with a parallax background.  Use a `<div>` with `background-image: url('/path/to/bg.jpg')` and `background-attachment: fixed`.  For mobile devices, disable the parallax via media queries to avoid jank.

2. **Psychedelic loader**
   - Create a custom loader component that shows a multicolour swirling animation.  Use CSS keyframes or a Lottie animation.  Display this loader during page transitions or while waiting for data.

3. **Page transitions**
   - Install `framer-motion` and wrap your `Routes` in `<AnimatePresence>`.  Define animations for page entry/exit (e.g. fade, slide, glitch).  Ensure animations are `prefers-reduced-motion` aware: disable or simplify them for users who have reduced motion enabled.

4. **Micro‑interactions**
   - Enhance button hover states: scale up slightly, glow with a neon shadow, rotate icons.  Use the `motion` component from Framer Motion for spring animations.
   - Add tooltips with humorous text on interactive elements (e.g. “Espalha essa fofoca!” on the share button).  Use Radix UI’s `<Tooltip>` or shadcn/ui’s `<Popover>`.

5. **Touch gestures**
   - Implement swipe gestures to open/close the filter sidebar on mobile.  Use a hook like `useSwipeable` or write custom handlers for `onTouchStart`, `onTouchMove`, `onTouchEnd`.  The threshold to trigger a swipe can be ~50 px.
   - For infinite scroll, allow pull‑to‑refresh if desired.

6. **Player page**
   - Create a dedicated route `/videos/:id` to display the embedded player.  When a card is clicked, navigate to this page.  Show the video’s title, description, tags, categories, vote count, publication date and a list of related videos.  Use an `<iframe>` for embed mode or `<video>` with HLS if `storage_mode = 'hosted'`.
   - Display a badge next to the player indicating whether it is “Embedded ✅” or “Archival 🏷️”.  If the video is `biscoito`, show a content warning overlay that the user must click to reveal the video.

7. **Dark/light themes**
   - Provide a toggle for dark vs light mode.  Use Tailwind’s `dark:` variants and persist the preference in `localStorage`.

8. **Accessibility**
   - Ensure all interactive elements have focus styles and ARIA labels.  Use `aria-label` on icons.  Test with keyboard navigation.  Provide alt text for images and decorative elements.  Comply with WCAG AA contrast ratios.

### 2.8. Meme Lab

1. **Database**
   - Add a `memes` table via a new Supabase migration:

     ```sql
     CREATE TABLE public.memes (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
       image_url TEXT NOT NULL,
       caption_pt TEXT,
       caption_en TEXT,
       caption_es TEXT,
       caption_fr TEXT,
       author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
       status TEXT NOT NULL DEFAULT 'pending',
       created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
       updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
     );
     ```

   - Enable RLS policies similar to `videos`: public read of `status = 'approved'`, authors can insert/update their memes, moderators can approve/reject.

2. **Upload and create memes**
   - Create a page `/memes/create` where authenticated users can upload an image (use Supabase Storage) or paste an image URL.  Use `<input type="file">` and `supabase.storage.from('memes').upload(...)`.  Provide fields to enter a caption in their language.
   - Automatically generate caption suggestions via OpenAI: send the image description (use alt text or ask the user to provide context) and ask GPT‑4 to propose a funny caption.  Translate it to other languages.

3. **Meme gallery**
   - Create a route `/memes` that lists approved memes in a masonry grid.  Show the image, caption (based on selected language), author and like count.  Allow users to like/favourite memes (store in a `meme_likes` table).  Provide filters by video, tag or language.

4. **Moderation**
   - Add memes to the moderation dashboard.  Allow moderators to approve or reject meme submissions.  Show a preview and the generated captions in all languages.

### 2.9. OpenAI Integration

1. **Serverless API wrapper**
   - Because the OpenAI API key must remain secret, create a serverless function (e.g. Vercel Edge Function, Netlify Function, or Supabase Edge Function) that acts as a proxy.  The client will send prompts to `/api/gpt` with `prompt` and optional `params`.  The function calls the OpenAI completion or chat endpoint and returns the result.
   - Example with Vercel Edge Functions:

     ```ts
     import { NextRequest, NextResponse } from 'next/server';
     import { Configuration, OpenAIApi } from 'openai';

     const config = new Configuration({ apiKey: process.env.OPENAI_API_KEY! });
     const openai = new OpenAIApi(config);

     export async function POST(req: NextRequest) {
       const { prompt, max_tokens = 300 } = await req.json();
       const response = await openai.createChatCompletion({
         model: 'gpt-4-turbo',
         messages: [{ role: 'user', content: prompt }],
         max_tokens,
       });
       return NextResponse.json(response.data.choices[0].message?.content);
     }
     ```

   - Deploy this function and call it from the client.  For example, when submitting a video, send the prompt described in section 2.3.

2. **Content classification (Biscoito detection)**
   - Create a helper function that sends the video title and description to your API proxy with a prompt like: “Classify this video as ‘biscoito’ if it is sexually suggestive or a thirst trap.  Respond only ‘biscoito’ or ‘normal’.”  If the response is `biscoito`, automatically apply the `biscoito` tag and show a user warning.

3. **Translation and localisation**
   - When generating descriptions and captions, request translations into EN/ES/FR.  E.g. “Translate this sentence into English, Spanish and French” with JSON output.
   - Use OpenAI embeddings (optional) to implement semantic search: generate embeddings for titles and descriptions and store them in Supabase’s `vector` extension.  When users search, compute similarity to return relevant results.  This can be a stretch goal.

### 2.10. Backend Worker & Scheduled Jobs (Optional)

1. **Metadata fetcher**
   - Implement a separate Node service (or Supabase function) that takes a video URL from the queue and fetches metadata via oEmbed or platform API (YouTube, Vimeo).  Populate missing fields like `title` and `duration` if not provided by the user.  This service can run on a schedule (Cron) or be triggered on insert into `videos`.

2. **HLS transcoding**
   - If you enable `storage_mode = 'hosted'`, build a worker that downloads the uploaded video, runs `ffmpeg` to transcode it into HLS variants (360p, 480p, 720p) and uploads the resulting `.m3u8` and segment files to Supabase Storage.  Store the `hls_url` in the `videos` table.  Only run this when the uploader attests they own the rights to the video.  For the MVP, this is optional.

### 2.11. Deployment & Domain Setup

1. **Branch strategy**
   - Use `main` (or `dev`) as your development branch.  When you are satisfied with new features, merge into `prod`.  Coolify will automatically deploy from `prod`.  Make sure tests pass before merging.

2. **Configure Coolify**
   - Create a new app in Coolify for each service (front‑end, optional API/serverless functions).  Set environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENAI_API_KEY`, etc.).  For the front‑end, use the `Dockerfile` generated by Vercel or build the static output with `npm run build` and serve with an Nginx container.  Alternatively, enable Vercel’s integration with Coolify.
   - Set up a Postgres service or connect to Supabase’s hosted database.
   - Use Coolify’s domain management to point `monynha.fun` to the app.  Configure SSL certificates via Let’s Encrypt.

3. **Prepare for production**
   - Run `npm run build` to generate the production build.  Verify that all routes work, there are no console errors, and the PWA manifest loads.
   - Test on mobile devices via Chrome DevTools (device toolbar) to ensure the design is responsive and gestures work.
   - After deploy, perform a smoke test: sign up, submit a video, vote, approve via moderator, browse in multiple languages.

### 2.12. Testing & Quality Assurance

1. **Unit and integration tests**
   - Use `vitest` or `jest` with `@testing-library/react` to create tests for key components: `VideoCard` (renders tags, shows vote button), `CategoryFilter` (selecting categories updates state), `AuthContext` (handles login/logout), etc.
   - Mock Supabase calls with test doubles and verify that components react correctly to API responses.

2. **End‑to‑end tests**
   - Set up an E2E framework like **Playwright**.  Write tests for the critical flows: user registration, video submission, voting, moderation, browsing, meme creation.  Use a test Supabase project and environment variables.

3. **Accessibility testing**
   - Use tools such as **axe** or **lighthouse** to audit the site for accessibility issues.  Address any violations (e.g. missing alt text, low contrast, missing labels).

### 2.13. Documentation & Future Work

1. **Developer README**
   - Expand the existing README to explain how to set up the project locally (install dependencies, run migrations, seed data, start the dev server), how to configure environment variables, and how to run tests.  Include commands for running and deploying with Coolify.
   - Document the database schema in an ER diagram and describe each table briefly.

2. **User guide**
   - Create a short user guide (Markdown or a page on the site) explaining how to submit videos, vote, filter content, change language, and participate in the Meme Lab.  Include screenshots and GIFs to illustrate the steps.

3. **Roadmap**
   - Outline post‑V0 improvements, such as playlists, user favourites, AI embeddings for search, social sharing (webhooks to repost approved videos), caption translation pipeline, rate limiting on submissions, and so on.

## 3. Conclusion

By following the above plan, the Monynha Fun project will evolve from a basic MVP to a feature‑complete, polished, and production‑ready platform.  The steps cover not only functional requirements (submission, voting, i18n, memes) but also user experience enhancements, accessibility, legal considerations, and deployment pipelines.  Implementing these tasks will allow the community to curate, preserve and celebrate the gems of the internet across cultures and languages, while maintaining the playful “queer‑techy” vibe that makes Monynha Fun unique.