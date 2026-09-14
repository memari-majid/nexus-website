# Plan — nexusaisolution.net

**Last updated:** 2026-09-14
**Repo:** https://github.com/memari-majid/nexus-website  
**This is the only living *site-ops* plan in this repo.** Positioning and channel strategy stay in [`../contract/docs/reference/PLAN.md`](../../contract/docs/reference/PLAN.md) (§11 / §11.1). Do not duplicate that strategy here.

**AI assistants:** standing editorial rules, edit map, and hard policies live in [`../AGENTS.md`](../AGENTS.md). Keep status and deploy notes here; keep “how to update” there.

Restore the company site after the Vercel project was removed.

| Track | Status | Notes |
|---|---|---|
| **Vercel project** | Tuned 2026-09-12 | `nexus-website` on `memari-majids-projects`, GitHub `memari-majid/nexus-website`, production branch `main`, Node **24.x**, region **iad1**. Skew protection 12h; Git fork protection on. WAF rate limits: `/api/chat` 30/min/IP, `/api/contact` 10/min/IP. `vercel.json` enables Fluid Compute + security headers. Preview now has the same public/config env as production (OIDC covers AI Gateway). **Majid must confirm in a terminal** (paid): `vercel project update nexus-website --fluid-compute on --function-cpu standard` and enable Web Analytics + Speed Insights if he wants those dashboards. |
| **Domain** | Attached | `nexusaisolution.net` + `www` — DNS is still on Cloudflare (`sreeni` / `valentin.ns.cloudflare.com`), not Vercel nameservers |
| **Env** | Production + development | Site URL, AI CPA URL, models, contact inbox, AI Gateway key. Preview-all-branches add is blocked by CLI in this environment |
| **Pages** | Live 2026-09-14 | `/` · `/about` (team index) · `/about/<slug>` ×2 (one shared template from `lib/people.ts`) · `/nvidia-dli-workshops` · `/nvidia-dli-workshops/details` · `/ai-consultant` · `/contact`. All in `sitemap.xml`. `/how-it-works` redirects to `/`. Nav remains exactly **Consulting · Training · About · Contact**, plus **Let's talk**, which opens chat. |
| **Design** | Minimal design update live 2026-09-14 | Owner preference: large keywords, generous space, quiet surfaces and links for details. Homepage = hero + Consulting + **Try our AI** + Training + Team + footer. The workshop overview leads with **Learn by doing**, duration, delivery, three topics and instructor credibility. Pricing, logistics and the expandable syllabus live at `/nvidia-dli-workshops/details`; full bios stay on individual profiles. The inline AI Consultant remains functional. Shared typography, translucent navigation and compact footer unify the overview, homepage, About and Contact. Standing rules remain in [`AGENTS.md`](../AGENTS.md) §8 / §9.3. |
| **Inline AI chat** | Live 2026-09-13 · trimmed to chat only the same evening | The homepage "Try our AI" section embeds a working AI Consultant chat in the normal page flow, with the floating launcher still covering the rest of the site. Fixed height on desktop (about 560 to 640 px), fills the section column, scrolls internally, never grows the page. Both shells share one conversation through `app/components/chat/chatStore.ts`, so a visitor who opens the floating panel keeps the transcript. One model, Claude Haiku 4.5, and no model picker, no per-reply stats line, no explainer cards. Every turn goes through the same limiter, budgets, and `chat.usage` log line as the widget; that log line is the only place cost, tokens, and timing are reported. |
| **Evaluations** | Removed 2026-09-13 | The Evaluations tab, the live run route (`app/api/evals/run`), the `evals/` scripts and their checked-in results, and the eval-only limiter counters are gone, not hidden. The owner judged the demo and evaluation work too complicated and expensive for what it bought; the record is [`AGENTS.md`](../AGENTS.md) §9.4. Nothing on the site quotes a score or a model comparison any more. |
| **People** | Live 2026-09-14 | `lib/people.ts` is the one registry for team cards, profiles and structured data. **Majid Memari, PhD — AI Educator & Consultant**, with his NVIDIA DLI Certified Instructor credential prominent. **Hamid Memari — Technical Consultant & Training Lead**, software engineering since 2012, supporting consulting and workshop delivery plus client partnerships and deals. Public team is these two people only. |
| **Naming & affiliations** | Policy 2026-09-12 · chat override 2026-09-13 | Full rules in [`AGENTS.md`](../AGENTS.md). Name style: postnominal **"Majid Memari, PhD"**: never a `Dr.` prefix, never `Ph.D.` with periods. **One scoped override (2026-09-13, do not revert):** the assistant is named **the AI Consultant** and inside the chat surface only it calls him **Dr. Memari**; website copy, metadata, and the phone voice prompt keep "Majid Memari, PhD". Names live in `lib/chat-persona.ts`. Rule: [`AGENTS.md`](../AGENTS.md) §9.1. **Omit current UVU faculty title** on this commercial site (conflict of interest). **Prior research may be named**: Penn (postdoc); Stanford / Johns Hopkins as collaborations through that appointment (not employers); U of Utah One-U RAI; SIU for PhD. Degree = PhD in CS with doctoral research in generative AI, not “PhD in LLMs.” Experience as **start year** ("since 2015"); **no** citation totals. Verifiable credentials (NVIDIA, AI Utah 100) stay. |
| **NVIDIA DLI** | Pricing confirmed by owner 2026-09-14 | `lib/dli.ts` is the source of truth. Industry workshops taught by a DLI Certified Instructor. Nexus handles enrollment and invoices **$500 per seat for groups up to 20**; larger groups receive a tailored quote. Quote pricing only when asked. NVIDIA provides curriculum, cloud GPU labs, assessment and certificate; no client GPUs required. The instructor credential is not NVIDIA sponsorship or endorsement. The current certified course is *Building Agentic AI Applications With LLMs* (8h). Keep academia, free delivery and the Ambassador program off the commercial site. Custom Nexus training is separate from DLI training. This supersedes the older NVIDIA-bills-seats / no-dollar-prices note. |
| **SEO** | NVIDIA pass 2026-09-12 · market pass 2026-09-13 | **Market is the United States, not Utah** (2026-09-13): home/about/contact/DLI titles and descriptions, layout keywords, the hero, and `areaServed` now read nationwide; em dashes removed from every `PAGE_COPY` title and description. Public phone and street address removed on 2026-09-14; factual Utah credentials stay. Realistic target is **intent**, not the bare word "NVIDIA" (nvidia.com owns that). `/nvidia-dli-workshops` is the ranking asset: focused title, module outline, `Course` JSON-LD with **NVIDIA DLI as provider/seller**, breadcrumbs, and internal links from nav/footer/homepage. Also live: ProfessionalService + Person ×2 + WebSite + ProfilePage schema (FAQPage dropped from `/` on 2026-09-13 because the homepage does not render the FAQ; `faqJsonLd()` stays for any page that does). The DLI page graph now includes the founder Person node so `Course.instructor` resolves. Every page ships a 1200×630 `og:image` (`public/og-image.png`), `og:site_name`, `og:locale`, and a `summary_large_image` Twitter card via `pageMetadata()` / the per-person template. Canonical **apex**; `www` 308s. **No keyword stuffing** — it hurts. **Majid must still** verify Search Console, submit the sitemap, and request indexing for the new pages. |
| **Contact** | Email contact live 2026-09-14 | Public phone and street address removed. Contact form and direct Gmail link; Resend notifications to Majid with Hamid copied. Historical voice setup is no longer an active website-contact plan. |

---


## Dedicated chat page (2026-09-14)

- Owner request: give LinkedIn visitors a direct, separate page to try the existing assistant.
- Implemented `/ai-consultant`, reusing the shared chat and `/api/chat`. The chat is open on arrival, with no floating duplicate, no signup, and a viewport-bounded frame. The homepage demo now links to it. The four navigation links stay the same; its conversation CTA targets the visible chat.
- Added canonical, social metadata and sitemap entry. No model, tool, pricing or business-fact changes.
- Validation: all 350 tests pass on Node 22; TypeScript and production build pass. Desktop and 390px phone layout checked. Live replies, New chat, Stop, continued conversation after Stop and a consulting brief tested. The first brief call failed validation; the assistant recovered with a second valid brief. This is functional verification, not a guarantee about every generated answer.
- Email delivery remains unconfigured: production has neither `RESEND_API_KEY` nor `RESEND_FROM_EMAIL` (checked via Vercel environment listing). Chat can answer and draft, but cannot email a hand-off or book a meeting. Do not claim delivery.
- Live at https://nexusaisolution.net/ai-consultant. Production deployment `EfkrAXAGzHGTsF8Tz2cdAS1r4XBn` / `nexus-website-59xyxomhx-memari-majids-projects.vercel.app`; canonical, social metadata and sitemap verified over HTTPS.
- LinkedIn: Premium Visit my website button targets the direct demo URL, with display on posts/messages/search enabled. The initial Featured preview failure was resolved later the same day; see the LinkedIn integration record below.
- Search Console: request indexing for `/ai-consultant` alongside the existing pending pages.
- Work is uncommitted on local branch `codex/linkedin-ai-consultant-demo` in `../nexus-website-chat-demo`, based on the live `nvidia-green-redesign` branch at `a890f13`. The dedicated page changes are also copied to the canonical aiserver checkout as uncommitted changes so its next deploy preserves the page. Do not deploy the stale local `main` checkout over these changes.


## Chat reliability check (2026-09-14)

- Tested live customer questions, context across turns, training facts, explicit pricing, booking requests, delivery promises, unsupported credentials, prompt injection, consulting briefs, readiness and effort estimates using fictional inputs only. No emails or inquiries were sent.
- Fixed false claims that the AI personally teaches, unsolicited price mentions, overlong replies and overly long suggestion chips. Unknown client tools and budgets stay unknown in briefs.
- With Resend disconnected, send tools and hand-off chips are unavailable. The assistant says nobody is notified, offers an on-screen summary or the published phone, and does not promise email receipt, a follow-up or a confirmed meeting. The contact form is not presented as a reliable notification channel either.
- Added ordinary-error **Try again**, preserved non-JSON network errors for friendly handling, removed technical configuration details from visitor errors, and reject blank user turns before a model call or budget reservation.
- Added sensitive production `CHAT_APPROVAL_SECRET` so signed drafts and approvals remain valid across server instances. No secret value is stored in the repo. Resend credentials remain absent, and there is no live calendar. Email delivery has not been tested end to end; its SDK integration is tested with a mocked email provider.
- Validation: **357 tests across 21 files pass**, plus TypeScript, production build and whitespace checks. Live SDK regression covers 12 turns; brief, readiness and estimate cards render without tool errors. Blank input returns HTTP 400. Browser checks cover Send, Stop, conversation after Stop, New, retry without duplicate messages, and 360px mobile layout including a shortened viewport. AI answers can still vary; this is verification of the tested flows, not a claim of perfection.
- Live at https://nexusaisolution.net/ai-consultant on production deployment `5NUGz6zr8WCck5hzjFWLK6vNQQoJ` / `nexus-website-3yk5zm2mm-memari-majids-projects.vercel.app`. Final workshop, notification and readiness checks returned usable replies with no tool errors (66, 49 and 42 words, excluding chips). The workshop answer omitted unrequested prices and correctly attributed teaching to the instructor. Stop and New also cleared active generation in the live browser. Reply length is a prompt target, not a strict cap.
- Shared fixes are not yet ported to the personal website. That difference is recorded in its README because this request targets the Nexus customer demo.
- All source changes remain uncommitted in `../nexus-website-chat-demo` and are copied to the canonical aiserver checkout before hand-off. Do not deploy stale local `main` over them.


## Email delivery setup (2026-09-14, live and tested)

- Owner authorized either personal Hotmail or Gmail for business. Selected `memari.mj@gmail.com`; its Gmail browser session is signed in and usable. UVU email is excluded.
- Updated production `CONTACT_TO_EMAIL` and added `WORKSHOP_TO_EMAIL` to that Gmail address. Added production `RESEND_FROM_EMAIL` as `Nexus AI Solutions <hello@mail.nexusaisolution.net>`. These settings are live. The contact form and chat hand-offs share that inbox; customer-facing replies and CC use it too.
- Owner approved Resend Terms and signed in through the existing GitHub account. Dashboard account: `memari.majid@hotmail.com`. Existing `aicpa.dev` domain and its two API keys are untouched.
- DNS and registrar are Cloudflare; hosting remains Vercel. Existing website records, apex SPF `v=spf1 -all`, strict DMARC and prior root sending records are preserved. No nameserver migration or paid upgrade.
- Added sending domain `mail.nexusaisolution.net`, North Virginia, Resend ID `d49eb387-de9a-4cea-8b6d-c043ce383027`. Inbound receiving stays off; replies use Gmail. Resend confirmed DNS at 11:05 and the domain as Verified at 11:07 on September 14.
- Owner signed into Cloudflare. Added all three Resend records, TTL Auto: TXT `resend._domainkey.mail` with the public key shown below; MX `send.mail` to `feedback-smtp.us-east-1.amazonses.com`, priority 10; TXT `send.mail` with `v=spf1 include:amazonses.com ~all`. Public DNS queries returned all three exact values after saving.
- Public DKIM value (not a secret): `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDdRnRkRM3vCFksi+Sh8O14XX8jvHgJzmH9tfIo6QfPZ18xtia437AGPGp1LEJuNRNiaOkPxpLbn55oHKdTI1LZJYJVXxc9giBEtoP5dj6pRqwhgmXE5JoSZAiclhHZQ7p0UYMlp5m0jFH1h9zVjzdclxGp1zCEL8SOkWqTEZiibQIDAQAB`
- Owner prefers GitHub sign-in and Vercel native features wherever practical. Vercel's Resend marketplace supports linking the existing GitHub-backed Resend account; automatic DNS setup is limited to domains bought through Vercel, so verification stays in Cloudflare.
- Continued the requested connection and test for only `nexus-website` on `memari-majids-projects`. Vercel's popup did not open, but Resend Settings > Integrations > Vercel exposed the connected Nexus project. Selected it and only `mail.nexusaisolution.net`, created its `Vercel Integration` key, and saved `RESEND_API_KEY` directly into Vercel without exporting the secret. Vercel confirms the integration added the key for Production, Preview and Development. Only Production has the sender configured.
- Redeployed the previous live deployment through the authenticated Vercel CLI to pick up the new environment, with no code changes, commits or pushes. Deployment `23URuiawLKJWRWSxg5bHPMxQmY1v` / `nexus-website-1ky3vs58m-memari-majids-projects.vercel.app` is **Ready** and aliased to https://nexusaisolution.net. This supersedes the earlier email-unconfigured notes above.
- End-to-end browser test at 11:09 MDT: the production contact form accepted the clearly labeled `NEXUS-EMAIL-0914` inquiry. Its team notification and visitor confirmation both arrived in the Gmail Inbox. Resend IDs: notification `84d74af5-0961-4836-9c90-be17e7a9c845`, confirmation `054249c0-9f00-4078-bbfb-2727d0378a26`.
- The production chatbot generated an approval card for `NEXUS-CHAT-0914`. Only the two contact emails existed before approval. Clicking Send produced the third email, `[Nexus consultation] Hand-off from Nexus Chat Test`, which also arrived in Gmail. Resend shows all three Delivered. Inputs used the owner's authorized Gmail and clearly labeled test details; no real customer or meeting was involved.
- Gmail message details confirm From `hello@mail.nexusaisolution.net`, Reply-To `memari.mj@gmail.com`, mailed-by `send.mail.nexusaisolution.net`, signed-by `mail.nexusaisolution.net`, and TLS. This proves the tested flows delivered, not a guarantee of future inbox placement. There is still no live calendar or automatic meeting booking.


## LinkedIn demo integration (2026-09-14)

- Saved **Talk to my AI assistant** as the first Featured link, pointing to `https://nexusaisolution.net/ai-consultant`. LinkedIn generated the Nexus thumbnail successfully. The short description invites visitors to explore consulting or NVIDIA workshops and send an inquiry, with no signup.
- The Premium button remains **Visit my website**, pointing directly to the assistant, with display on posts/messages/search enabled. LinkedIn offers preset labels only. **View my services** opens LinkedIn's Services page instead of a custom URL, so it was not used; **Book an appointment** would imply calendar functionality the assistant does not have.
- About now starts with the assistant invitation and direct URL, followed by concise consulting, training and credential copy. The workshop page remains linked. Contact info now includes the Nexus homepage as Company and `https://www.majidmemari.com` as Personal, preserving the existing GitHub and NVIDIA instructor directory links.
- Saved the Services description with the same assistant URL and added a **Talk to my AI assistant** media link alongside the existing workshop outline and UVU workshop photos. Moved the demo to the first media position.
- Verified the actual profile button opens the dedicated chat page with its welcome message, suggestion buttons and message field, without signup. The assistant can pass an approved inquiry by email; it does not show live availability or confirm meetings. No new feed post, outreach, calendar event, website deployment, commit or push was needed for these profile changes.


## Team expertise update (2026-09-14)

- Owner clarified that the site should lead with expertise, not founder or C-suite titles. Majid is **AI Educator & Consultant**, with his NVIDIA DLI Certified Instructor credential prominent. Hamid is **Technical Consultant & Training Lead**, with software engineering experience since 2012 and enterprise medical-imaging delivery since 2015.
- Hamid supports technical consulting, workshop hosting and hands-on learning. He also represents Nexus, develops proposals, negotiates deals and leads partnerships, onboarding and ongoing client relationships. Only Majid holds the NVIDIA instructor certification.
- Public team is Majid and Hamid only. Removed the third profile, its published headshot, structured data and chatbot references. The homepage team grid now uses two columns. Previous profile URLs naturally return 404 through the shared person template.
- Final validation: TypeScript, **357 tests across 21 files**, production build and whitespace checks pass. Live homepage, About, both profiles and sitemap have no removed team-member references. Both remaining profiles have the new roles in their page titles. The removed profile and headshot return HTTP 404. The homepage uses two team columns and shows the NVIDIA credential under Majid only.
- Live chatbot check correctly identifies Majid as the NVIDIA DLI Certified Instructor and Hamid as Technical Consultant and Training Lead, describing technical support, hosting, client partnerships and deals. No inquiry or email was sent by this test.
- Live production deployment `2vnHTCFXTSbvN5cama45aQYdKmiy` / `nexus-website-6ms0ao3le-memari-majids-projects.vercel.app` is Ready and aliased to https://nexusaisolution.net.
- Deployment ran from the local checkout after aiserver became unreachable. Restored the missing local Vercel link to existing project `prj_MFgM7xxNcb8JxCNut7y3EoUtfUFj`. An accidentally created `nexus-website-chat-demo` Vercel project and its deployment were removed; it is not a second live project. Vercel added `.env*` to `.gitignore` while linking, keeping local environment values out of version control.
- **Remote synchronization pending:** aiserver timed out on two fresh SSH connections. Latest live source is saved in the local `nexus-website-chat-demo` checkout. Before deploying either remote checkout, copy these final files: `.gitignore`, `AGENTS.md`, `docs/PLAN.md`, `app/components/{Avatar,HomePageContent}.tsx`, `lib/{assistant,faq,hamid,inquiry-ai,majid,people,seo,team}.ts`; remove `lib/mohammad.ts` and `public/team-mohammad-jafarinejad.jpg`. Preserve all earlier chat-demo and email changes. No remote-sync success is claimed.
- No commit or push. Search Console: request indexing for the updated team and profile pages.


## Professional portrait update (2026-09-14)

- Owner identified the first supplied portrait as Hamid and the second as Majid. Both individual professional portraits now replace the older group-panel images.
- Preserved Hamid's original 1086×1448 PNG as `public/team-hamid-memari-professional.png`, with an identical SHA-256 to the supplied file. The canonical `HAMID.photo` drives the homepage, About, profile and structured data. `Avatar` frames the original in CSS; Next Image handles optimized delivery. Removed the incorrect square dimensions from the optional social headshot metadata.
- TypeScript and the production build pass. Visually checked the local profile crop and live About page. Production deployment `D161kn7wEtxjw6FGCaWVowh9MWw5` / `nexus-website-96qy0097q-memari-majids-projects.vercel.app` is Ready and aliased to https://nexusaisolution.net. The original photo returns HTTP 200 with the same SHA-256 as the supplied file, and the browser confirms the optimized image loaded successfully.
- Recovered Majid's exact clean original from Git (`f48016b^:public/majid-memari.png`) and preserved it under `~/Downloads/nexus-professional-portraits/majid-original.png`. Used the built-in image editor for the owner-requested localized smile correction and square crop, then a second pass to add subtle, realistic smile creases. The final 1254×1254 PNG is `public/team-majid-memari-professional.png`; `MAJID.photo` drives his public profile, team avatars and structured data. Full prompts and provenance are saved beside the preserved original in `majid-edit-notes.md`.
- Majid update: TypeScript, production build and whitespace checks pass. Visually checked the final circular crop on the local About page and live Majid profile. Production deployment `B6jHZBgt9bNNNZLgAJQfhiSZFsif` / `nexus-website-qeput7lzr-memari-majids-projects.vercel.app` is Ready and aliased to https://nexusaisolution.net. The new portrait is visible on the live profile.
- Owner subsequently requested a closer crop of Majid's portrait. The new `public/team-majid-memari-closeup.png` uses a tighter square framing; `MAJID.photo` now selects it. The previous portrait remains preserved. TypeScript, build and whitespace checks pass. Checked the circular framing locally and on the live profile. Production deployment `7QhgxWhqKqEJAfd36o83DCc77wfk` / `nexus-website-c7fdfljcn-memari-majids-projects.vercel.app` is Ready and aliased to https://nexusaisolution.net. The new asset returns HTTP 200 and matches the local SHA-256; the live profile references the new path.
- These additional files also need the pending remote sync: `public/team-{hamid,majid}-memari-professional.png`, `public/team-majid-memari-closeup.png`, `lib/{hamid,majid,people,seo}.ts`, `app/components/Avatar.tsx`, `app/about/[person]/page.tsx`, `AGENTS.md` and this plan. No commit or push.

## Minimal design update (2026-09-14)

- Owner requested an Apple-like site with fewer words and links for depth. The workshop overview now has fewer than 70 main-content words, down from roughly 800 in the previous layout. It now leads with **Learn by doing**, the official course title, key topics, duration, delivery and Majid's instructor credential.
- Added `/nvidia-dli-workshops/details` for delivery, pricing, course prerequisites, expandable syllabus and official NVIDIA resources. Workshop facts remain in `lib/dli.ts`; the new route has canonical/social metadata, breadcrumbs and a sitemap entry.
- Simplified the homepage, About and Contact with larger type, shorter copy, quiet panels and more prominent team photos. Preserved the existing inline AI chat, inquiry form, four navigation links and individual biographies. Chat and email behavior are unchanged by this design pass.
- Validation: TypeScript and production build pass; **357 tests across 21 files pass**; whitespace checks pass. Browser checks cover desktop and 390px mobile, light/dark themes, mobile navigation, workshop chat CTA, pricing link, syllabus expansion and the inline AI chat. All eight public routes tested return HTTP 200 with correct canonicals; the new details route is in the sitemap. No test inquiry or email was sent.
- Pre-edit source backup: `~/Downloads/nexus-design-before.zip`. Production deployment `HccxLHuCny4okdVkdn3nHCvkryjv` / `nexus-website-m9t77qpej-memari-majids-projects.vercel.app` is **Ready** and aliased to https://nexusaisolution.net. Final production build passed. Live checks confirm all eight public routes return HTTP 200 with correct canonicals, the details page appears in the sitemap, and the redesigned workshop layout renders correctly in the browser. No commit or push.
- **Remote synchronization remains pending.** Keep the local `nexus-website-chat-demo` checkout as the latest source. In addition to the earlier pending files, sync `app/components/{HomePageContent,NavBar,SiteFooter}.tsx`, `app/{about,contact,nvidia-dli-workshops}/page.tsx`, `app/nvidia-dli-workshops/details/page.tsx`, `app/globals.css`, `lib/{dli,site,seo}.ts`, `AGENTS.md` and this plan before any remote deployment.
- Search Console: request indexing for the refreshed workshop overview and new details page, alongside the other pending URLs.

## Portrait delivery quality (2026-09-14)

- Owner reported pixelation after the closer crop. The live original matches the local 1254×1254 PNG exactly. The About page was selecting a 256×256, quality-75 AVIF of just 3,333 bytes at the inspected display density.
- Updated shared `Avatar` delivery to request at least 384 pixels at quality 95, with an 828-pixel 2x candidate for the current portrait sizes. CSS keeps the existing circular dimensions, crop and position. Both original portrait files are unchanged; this fixes delivery without another image edit. `next.config.ts` explicitly allows quality 75 for other images and 95 for portraits.
- TypeScript, local and Vercel production builds, and whitespace checks pass. Browser preview confirms both About portraits load the new source and remain 180×180 on the page; Majid's individual profile also loads correctly. Production deployment `F8JmaiScTEcpYXem5eRvuJZL2nfD` / `nexus-website-1h68qyw1o-memari-majids-projects.vercel.app` is **Ready** and aliased to https://nexusaisolution.net. Live browser confirms both portraits load at quality 95. Majid's 384- and 828-pixel AVIF variants return HTTP 200 at about 9 KB and 33 KB respectively. Original images and crop remain unchanged. No commit or push.
- Remote sync remains pending for `app/components/Avatar.tsx`, `next.config.ts` and this plan, in addition to the earlier listed files.

## Email contact update (2026-09-14)

- Owner requested removal of phone and address and email-based contact. Removed both from public site data, contact UI, page descriptions, organization JSON-LD, assistant facts/prompts, email footers and the legacy voice status response. Generated HTML, RSC and client bundles contain neither the old number nor street address.
- `/contact` now has one compact form and a direct link to the verified business Gmail, `memari.mj@gmail.com`. It confirms only an accepted email send; on delivery failure it keeps the visitor's text and offers direct email. Removed routing/classification labels from the visitor's confirmation.
- Added production `CONTACT_CC_EMAIL=hamid.mmr@gmail.com`. The common Resend sender copies the configured team on business notifications and visitor emails, preserving the visitor reply-to and removing duplicate recipients. Chat approvals disclose that the Nexus team receives the email. `CONTACT_TO_EMAIL` and `WORKSHOP_TO_EMAIL` remain the business Gmail; no UVU account is used.
- Updated contact fallback guidance, standing rules and README to match. Existing chat approvals, rate limits, classifier metering and email delivery status boundaries remain. The legacy voice integration is retained; there is no new phone setup.
- Validation: **361 tests across 21 files**, TypeScript, production build and whitespace checks pass. Added regression checks for correct CC, deduplication, failed sends and removal of phone/address from prompts, schema and email footers. Checked the 390px mobile contact layout and its direct-email link. Production deployment `FkyEzpPx93kUdg7z3eTDswP9RVST` / `nexus-website-grtdmhp15-memari-majids-projects.vercel.app` is **Ready** and aliased to https://nexusaisolution.net. Final Vercel build passed. All eight public pages plus the legacy voice status endpoint return HTTP 200 with no old phone/street address.
- Live delivery test at 2pm MDT: submitted the single labeled `NEXUS-CONTACT-0914` form request. The UI confirmed **Message sent**. Both the team notification and visitor confirmation arrived in the business Gmail. Gmail headers show To `memari.mj@gmail.com`, CC `hamid.mmr@gmail.com`, Reply-To `memari.mj@gmail.com`, verified sending domain and TLS. The visitor confirmation footer has no street address. Hamid was copied; his private inbox was not accessed. No repeat submission.
- A fresh live chatbot question asking for contact, phone and address returned the verified Gmail and contact form, and correctly stated that no phone or street address is published. No email or inquiry was triggered by this chat check.
- Remote synchronization remains pending for this checkout, including `lib/{site,seo,email,inquiry,assistant,site-facts,chat-tools,inquiry-ai}.ts`, affected tests, `app/contact/page.tsx`, `app/components/ContactForm.tsx`, `app/components/chat/{ApprovalCard,DeliveryBlock}.tsx`, `app/api/voice/route.ts`, `AGENTS.md`, `README.md` and this plan. No commit or push.
- Search Console: request fresh indexing for the updated contact and organization metadata.

## Deploy

Region `iad1` (`vercel.json`). From this repo:

```bash
npx vercel link --yes --scope memari-majids-projects --project nexus-website
npx vercel deploy --prod
```

Or push `main` — GitHub integration deploys automatically.

## DNS (Cloudflare)

Apex and `www` are on the Vercel project. Current nameservers are Cloudflare. Keep Cloudflare and point records at Vercel (`CNAME` to `cname.vercel-dns.com`, proxied or DNS-only per Vercel docs), **or** switch nameservers to `ns1.vercel-dns.com` / `ns2.vercel-dns.com`.

## SEO (organic search)

**Intent this site owns:** **Nexus AI Solutions**; AI consulting across the United States / team training / workshops; Applied AI, Gen AI, RAG, agents; AI Solution Architect. **AI Entrepreneurship** is training direction, not a launched SKU (no catalog numbers). Branded “Majid Memari” is a *supporting* result — the personal site is the name-query target.

**SEO keywords (on-page + metadata, no stuffing):** Nexus AI Solutions · AI consulting United States · nationwide AI team training · AI Solution Architect · Applied AI · Gen AI · RAG · agents · workshops · Majid Memari (supporting founder mention).

**Market framing (2026-09-13):** Utah is the **home base, not the market boundary**. Positioning copy says the **United States**: the hero, page titles and descriptions, keywords, and `areaServed` (now a single `Country: United States`) all read nationwide, with delivery **in person at the client offices or online**. The public phone and street address were removed on 2026-09-14. Factual Utah credentials (AI Utah 100 honoree, University of Utah One-U RAI, Utah public-sector work, Silicon Slopes) stay. Standing rule in [`AGENTS.md`](../AGENTS.md) §10.

**Shipped (2026-08-27)**

- Unique title/description for `/`, `/about`, `/contact`
- ProfessionalService + Person + WebSite + FAQPage JSON-LD. No SearchAction (no on-site search). Course schema stays on majidmemari.com so Nexus is not framed as selling the UVU class
- `sitemap.xml` + `robots.txt` (allow `/`, disallow `/api/`, host = apex)
- Middleware 308: `www.nexusaisolution.net` → `https://nexusaisolution.net` (both previously 200)
- Honest contact copy: `(801) 810-9152` is Google Voice, not a live AI receptionist
- Headings mention AI consulting, team training, and AI Entrepreneurship (UVU course the founder teaches; training direction, not a launched SKU)

**Planned — Majid must click**

1. [Google Search Console](https://search.google.com/search-console) → add `https://nexusaisolution.net` (and optionally a Domain property covering www) → verify → submit `https://nexusaisolution.net/sitemap.xml` → Request indexing for `/`, `/about`, `/contact`
2. **LinkedIn completed 2026-09-14**: both Nexus and the personal website are in Contact info; the direct assistant is promoted through the Premium button, Featured, About and Services.
3. Optional: company LinkedIn Page (only if a real page exists) — do not invent one
4. **Google Business Profile** — only if he wants a real local listing for Sandy, UT consulting. Do **not** create a fake GBP or reviews
5. Same profile backlinks as the personal PLAN (Scholar / ORCID / ResearchGate / UVU) should list **majidmemari.com**; Nexus is optional second URL

Do **not** buy links, spam directories, or fabricate reviews. Do not claim a $1M USHE award or a launched entrepreneurship product.

---

## Historical phone plan (superseded by email contact on 2026-09-14)

The owner removed phone and address from public contact. The notes below record earlier work, not active setup tasks. Existing integrations are unchanged.

**Product:** callers dial **(801) 810-9152**. An AI **personal assistant** answers, can briefly say who Majid Memari is / consulting & training, then takes **name + callback + message** and **emails that message** (`CONTACT_TO_EMAIL` / Resend, else server log). He calls back if he wants. **No live transfer. No “please hold.” 618 does not ring.**

**Why the 2026-08-25 test hit Google Voice voicemail:** Settings → Calls has **Forward calls to Web = OFF**, **Forward calls to (618) 412-1041 = OFF**, and **no other linked number**. GV has nowhere to send the call, so it plays its own voicemail. There is no “rings before voicemail” control that can send the call to Vercel. Vercel has no Twilio SID/token/number.

```text
Caller → Google Voice (801) 810-9152  →  hidden Twilio (AI answering line)  →  POST /api/voice  →  talk + take message  →  email Majid
```

### Routes

| Method | Path | Role |
|---|---|---|
| GET | `/api/voice` | Status JSON (`role: personal-assistant`) |
| POST | `/api/voice` | Personal-assistant greeting → speech gather |
| POST | `/api/voice/gather` | Brief Q&A (same facts as chat); then take a message |
| POST | `/api/voice/message` | Save transcript via `submitInquiry` → Resend or log |

### Env (no secrets in git)

| Variable | Purpose |
|---|---|
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Signature validation. Empty in production today |
| `TWILIO_PHONE_NUMBER` | Hidden Twilio answering number (not 801, not 618) |
| `VOICE_WEBHOOK` | `https://nexusaisolution.net/api/voice` |
| `AI_GATEWAY_API_KEY` / OIDC + `AI_CHAT_MODEL` | Same as site chat |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `CONTACT_TO_EMAIL` | How the **message** reaches Majid |

### Google Voice toggles (2026-08-25, voice.google.com/u/0/settings)

Public number unchanged: **(801) 810-9152**. No Vercel URL field in GV.

| Control | After this pass |
|---|---|
| Forward calls to Web | **OFF** |
| Forward calls to (618) 412-1041 | **OFF** — 618 does not ring |
| Screen calls | **OFF** |
| Linked numbers on file | (618) 412-1041 still listed, forwarding disabled |
| + New linked number | Still empty of Twilio — cannot add without a programmable number |

Until a hidden Twilio number is linked **and** its forwarding is ON, incoming 801 calls go to **Google Voice voicemail** (not the Vercel AI). His cell stays silent.

### Remaining clicks (Twilio still required)

1. Twilio: buy a hidden number. Console → Voice webhook HTTP POST → `https://nexusaisolution.net/api/voice`. Set SID / token / number in Vercel env.
2. GV → **Account → Linked numbers → + New linked number** → that Twilio number → verify.
3. GV → **Calls → Call forwarding** → **ON** for the Twilio number only. Keep 618 and Web **OFF**.
4. Set Resend if messages should email `info@nexusaisolution.net` (otherwise they log only).
5. Test: dial 801-810-9152 → hear the personal assistant → ask a brief question or leave name / number / message → Majid gets email.

### Honest limits

- Twilio webhook budget ~15s. Speech recognition (`<Gather>`), not `<Record>`.
- GV cannot POST to Vercel. A second number is required for AI pickup.
- Status: webhook live; **AI cannot answer 801 today** (no Twilio credentials).

---

## Follow-ups (in-repo, no owner click needed)

1. **Shared usage-log helper.** `/api/chat` writes its `chat.usage` JSON line and
   `lib/inquiry.ts` writes `contact.usage` in the same shape. Extracting one helper was
   deferred while the callers settled; do it when a third caller appears, and keep the field
   names stable so existing Vercel log filters keep working.
2. **Budget review on Haiku.** The dollar budgets in `lib/chat-limits.ts` were set for a dearer
   model and kept as they were when the chat moved to Claude Haiku 4.5 (2026-09-13). They now
   buy several times the conversations. Revisit them against a week of `chat.usage` lines and
   the gateway spend page; lowering them is the likely move, not raising them.
3. **Assistant naming is a prompt parameter now.** `nexusAssistantSystem("chat" | "site")`
   renders one founder naming rule per surface. If a third surface appears, give it a value;
   do not append a paragraph that overrides an earlier rule (`AGENTS.md` §9.1).
4. **Persona parity.** `lib/chat-persona.ts` and `../majidmemari/lib/chat-persona.ts` export the
   same SHARED NAMES block, same order. The personal site still renders its badge twice (widget
   header and inline chat) where this repo renders it once inside `ConversationView`; folding
   that into its `ConversationView` is the remaining parity edit, and it is cosmetic.

## Next

Owner clicks only (agents cannot finish these):

1. **Search Console** — verify the property, submit `sitemap.xml`, and request indexing for `/nvidia-dli-workshops` and the three `/about/<slug>` pages.
2. Confirm the NVIDIA logo usage against the terms of the Certified Instructor agreement.
3. **Decided 2026-09-14:** phone and street address removed; contact is by email.
4. Enable **AI Gateway** if chat / contact classifier / voice 503s; add Resend keys if voice messages should email.
5. Phone setup is no longer planned for website contact; use the email flow.

Done in-repo (2026-09-12): missing modules committed so GitHub/Vercel builds resolve; Contact restored in nav and footer; Node engine pinned to `22.x`.

### 2026-09-14 — Previous workshop photo gallery
- Owner selected photos from LinkedIn activity `7445686198456492032` (UGC post `7445686197596868608`). Retrieved the four actual carousel images; kept original delivered JPEG bytes in `public/workshops/` (1200px landscape / 800px portrait).
- Added three complementary photos to `/nvidia-dli-workshops#workshop-photos`: classroom, whiteboard teaching, participant discussion. Caption describes a previous session led by Majid; no industry-client, campus partnership, or endorsement claims. Fourth portrait retained as a source asset.
- Responsive Next Image gallery at quality 95, original aspect ratios, full-photo links, descriptive alt text. No photo retouching or upscaling. These LinkedIn-delivered images are not camera originals.
- Typecheck and production build pass. Desktop and 390px mobile layouts reviewed; no horizontal overflow. Production publication pending verification. No commit/push; remote source sync remains pending as recorded above.
- Published successfully: deployment `HDpV1eWGU1Swkx8EwnKyBqRRPDbg`, READY and aliased to `https://nexusaisolution.net`. Live browser verified all three gallery images loaded successfully at quality 95. Production build and whitespace checks passed. Search Console reindex request remains an owner follow-up.

### 2026-09-14 — Private contact form and team positioning
- Owner requested industry experience for Hamid, academic experience for Majid, and shared consulting/training positioning. Home/About now use “Industry meets academia” and “One team for AI consulting and training”, with start-year experience lines. Assistant facts and organization description aligned.
- Owner requested the Gmail address stay private. Removed it from SITE, contact UI, JSON-LD, prompts and delivery fallback links. Server email routing continues to Gmail, with internal copies sent as BCC. Visitor emails no longer expose personal team Reply-To addresses; further inquiries point to /contact.
- Live form test NEXUS-PRIVATE-0914 at 2:08pm MDT: Message sent confirmation, Gmail notification and visitor acknowledgment all received. No repeat send needed. Automated checks: 361 passed, TypeScript passed, build passed. First private-contact deploy DU1Q3KTm2haP66UNNFDfNvmhNwff READY. Final confirmation-copy fix pending deployment.
- Original workshop photo source found in UVU mail: Erin Peeples, April 2, 2026, “Nvidia Training 3-27-26 has been shared with you”; shared PhotoShelter album. No business email sent from UVU. Album originals have not yet replaced LinkedIn images.
- Final deployment E4jTS3s9GXfgpvfyRxH82i1oowAx READY and aliased. Final delivery tests 30/30 passed. Live /contact, /about and / HTML have no personal team inbox addresses; both team sections show the updated positioning. Visitor Gmail header inspection showed branded From, no team CC or personal Reply-To. No commit/push. Search Console reindex remains an owner follow-up.

### 2026-09-14 — Review improvements
- Clear CTA distinction: Ask our AI opens chat; Contact our team opens the private contact form. Updated desktop/mobile navigation, hero, workshop overview/details, About and AI page.
- Consulting copy describes use-case selection, practical training and implementation outcomes. No new homepage section.
- Workshop audience and prerequisites surfaced in overview, details, schema and grounded chat facts. Verified against the live NVIDIA course page: intermediate Python plus introductory deep learning including attention/transformers.
- Added the exact short public LinkedIn comment from Razan Alsulieman beside the existing workshop gallery, with attribution and source link. Evidence: owner-supplied screenshot of post 7445686197596868608. Not represented as a customer or participant testimonial.
- Restored compact NVIDIA trademark attribution in shared footer at owner's explicit request to apply the review suggestions. This supersedes the older local no-disclaimer rule.
- TypeScript and production build passed; all 361 tests passed. Browser checks: chat CTA opens chat, team CTA opens the private contact form, workshop prerequisites and attributed comment readable at 390px. Production deployment 9xr6VAwKe1xgjUMR9i1EYx1cyYcG READY and aliased to https://nexusaisolution.net. Live homepage and workshop page verified with updated copy, CTA destinations, feedback and notice. No commit or push. Search Console reindex remains an owner follow-up.

### 2026-09-14 — Balanced team presentation
- Kept parallel start-year experience lines and professional roles. Hamid now has a factual Stanford NLP coursework highlight opposite Majid’s individual NVIDIA credential, with equal-height rows on Home and About.
- Team summary: The knowledge to guide you. The experience to build it. Connects academic knowledge and industry implementation without adding long biographies.
- Owner supplied Stanford XCS224N-024 course completion, Jun to Aug 2025. Added a concise coursework section on Hamid’s profile and aligned chat facts; no Stanford degree, certification or employment claim. Removed the less precise graduate-program wording.
- Production build, type checks and 13 site-fact tests passed. Desktop team cards checked; Hamid’s course verified on live profile. Deployment CYXJhc3v9u2szn6DyMjdpbsjxbdR READY and aliased to nexusaisolution.net. No commit/push.

### 2026-09-14 — Stanford coursework logo
- Added owner-supplied Stanford PNG beside Hamid’s explicit Stanford NLP coursework label on Home and About. Original asset retained without modification; 24px presentation in a shared TeamCredential component. No institutional partnership or degree claim.
- Build and type checks passed. Deployment Gte8TcARf2ehUqsZk4MBkhB1Zd6d READY and aliased to nexusaisolution.net. Live logo and team-card alignment visually verified. No commit/push.

### 2026-09-14 — Matching team cards and transparent logo
- Shared TeamCard now powers Home and About, with matching portrait dimensions, heading/role/experience row heights, credential rows and links. Both credential logo boxes are 24px. Hamid’s portrait uses a 1.12 CSS scale to match apparent face framing; original portraits untouched.
- Stanford logo background removed with image editing tool; separate RGBA asset, alpha range 0–255 and transparent corner verified. Removed white CSS background. Original supplied logo retained.
- Production build/type checks passed. Desktop and mobile browser measurements: both About cards 432x532 desktop, 327x532 at 390px; identical row offsets, no horizontal overflow. Light and dark themes visually checked.
- Deployment CGVXZmVeSanHj5RhAriLxSiMJzDw READY and aliased to nexusaisolution.net. Live equal dimensions and transparent logo loading verified. No commit/push.

### 2026-09-14 — Equal team name presentation
- Owner requested Majid’s PhD suffix be omitted when shown beside Hamid. Shared TeamCard now uses canonical teamName for names, accessible labels and portrait alt text. Both names keep identical typography. Individual profile and workshop instructor credentials remain unchanged.
- Build and type checks passed. Deployment 5vh47eWWkMMu2Rm33gvpfx227CTy READY and aliased. Live Home and About team headings verified as Majid Memari and Hamid Memari. No commit/push.

### 2026-09-14 — Blue suits and red ties
- Clothing edits made with image tool to both supplied portraits. Majid uses wider original framing per owner correction. High resolution PNGs retained as separate assets; originals preserved. Avatar requests at least 640px at quality 95, including crop scale in resolution selection.
- Build/type checks passed. Live image delivery verified at 640px and quality 95 for 180px portraits. Final framing uses wider Majid source at scale 1.2 anchored at top, Hamid scale 1; matching circles retained. Deployment 9ed3c39o5kRCxPtv3stESPD6Bznn READY and aliased; live framing visually checked. No commit/push.


### 2026-09-14 — University of Utah event announcement
- Owner explicitly requested this specific academic event on the commercial site, overriding the earlier blanket campus-event restriction for this announcement only. Industry offer and pricing remain separate. Luma verified October 10, 2026, 9am to 5pm MDT, in person, academic eligibility, prerequisites, institutional email and host approval.
- Added compact Home training announcement, full workshop-page announcement and grounded assistant facts, all using DLI.academicEvent. Build/type checks and all 13 site-facts tests passed. Desktop/mobile and light/dark layouts checked. Deployment Bj4z2URLzruU3PiGe7zJj2ZnJKXf READY and aliased; live Home and workshop page verified. No commit/push.


### 2026-09-14 — Less-is-more visual polish
- Simplified workshop hero to two actions, removed repeated audience text and photo instructions. Prerequisites remain on the linked details page. Condensed shared academic event card; course, instructor and eligibility details remain accessible in a native disclosure, with registration always visible. About and Contact already use concise layouts and were preserved. Build/type checks passed; disclosure and mobile layout checked. Deployment GsSS3FgozZUJzskKacHiD8iQnp79 READY and aliased. No commit/push.


### 2026-09-14 — Student course feedback
- Owner requested positive SRI comments on the website. Added two anonymous selected excerpts to About and Majid’s profile; explicitly identified as course evaluations, Spring 2026. No workshop/customer attribution, student identities, current employer, course identifiers or report files published.
- Internal provenance only: faculty-portfolio/tenure/sri/Spring_2026_CS2700_002.pdf p6 Q16, complete first comment; Spring_2026_CS3390R_601.pdf p6 Q16, first sentence of final comment. Exact wording checked with pdftotext against original PDFs. Original reports stay outside the website repository. Build/type checks passed; mobile/dark and desktop/light layouts verified. Deployment it4aveiVGRCVu1aH7ScUMdv6sjBv READY and aliased; both public pages verified. No commit/push.


### 2026-09-14 — Workshop photo retouch
- Owner corrected the target to subtle face slimming. Used built-in image editing on the original whiteboard photo, with lower-cheek/jaw fullness as the edit target. Selected 1536x1024 PNG saved as workshop-2-face-retouched.png; original workshop-2.jpg preserved. Earlier torso variant was not published. Gallery uses new filename to avoid stale image caches.
- Prompt: Subtly slim the lower cheeks and jawline while preserving identity, speaking expression, skin texture, original body, pose and classroom. No crop or dramatic changes. Build/type checks passed. Deployment EW3ufrhpAfBH9u4AhZVgajXFaK26 READY and aliased. Live gallery reference and exact original-resolution asset checksum verified. No commit/push.

### 2026-09-14 — Closable workshop photo viewer
- Replaced raw-image new-tab links with a shared PhotoGallery using a native modal dialog. Added visible Close, outside-image click, Escape, previous/next controls, arrow keys, photo counter and captions. Photos stay on the workshop page; original assets remain downloadable by browser image controls.
- Preserves page scroll position and returns keyboard focus to the clicked thumbnail. Background stays inert; Tab and Shift+Tab wrap through the viewer controls. Safe-area padding and 44px controls on phones; image fits the viewport without cropping.
- Build/type checks passed. Browser checks: all 3 thumbnails open/close, next wraps, arrow keys, Escape, background click, focus wrap and restoration, exact 2002px scroll restoration. At 390x844 no dialog overflow; mobile previous/close verified. Deployment GBL3Zt9YT8DQpaQQS1VxCnpX4t73 READY and aliased; live open/close verified. Returned the original raw-photo tab to the gallery. No commit/push.


### 2026-09-14 — Teaching evaluation highlights
- Owner requested explicit SRI teaching evaluation highlights without UVU. Added selected skill ratings to existing About/Majid feedback section and a quiet link under the homepage team. Public labels omit institution and course identifiers; scope says one Spring 2026 course, 9 of 14 respondents. Not an all-course or workshop rating.
- Verified original faculty-portfolio/tenure/sri/Spring_2026_CS3390R_601.pdf p4: Q10 respectful responses 5.00/5 (9 strongly agree); Q11 helpful feedback 4.78/5 (7 strongly agree, 2 agree). No aggregate rating schema. Validation/deployment pending.
