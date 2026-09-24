# Minimal LinkedIn banners v2

Date: 2026-09-14
Mode: built-in image generation with the official NVIDIA horizontal logo as the conversation image reference. The tool could not resolve the local reference path, so the already displayed logo was supplied through the recent-image mechanism.

## User direction

Very few words and the logo only. Make type larger and easier to read after upload. The original five banners remain unchanged.

## Ready to upload

- 01-ai-workshops.png: AI workshops
- 02-build-ai-agents.png: Build AI agents
- 03-learn-by-doing.png: Learn by doing
- 04-train-your-team.png: Train your team
- 05-dli-ambassador.png: DLI Ambassador

All upload PNGs are 1584 x 396 pixels. The built-in tool returned 2048 x 768 originals despite the requested 4:1 canvas. Native macOS sips was used solely for the final center crop to 2048 x 512 and proportional export to 1584 x 396. Original generated files were preserved in originals/. No lettering or logo geometry was stretched.

LinkedIn's current recommended dimensions and PNG/JPG guidance were verified on 2026-09-14: https://www.linkedin.com/help/lms/answer/a568217

These are personal LinkedIn workshop banners, not commercial site assets or official NVIDIA-issued templates. The logo was used as a generation reference. The user's latest request removes fine print and all secondary copy. No dates, prices, sponsor claims or additional course certifications were added. Nothing was uploaded or posted in this revision.

## Prompts

## Final wording revision

The user preferred "Learn by doing". This replaces the coding version in the upload set. The previous coding PNG is preserved under originals/. The new generated original is 2172 x 724; its outer padding and faint border were removed with a centered 2112 x 528 crop, then proportionally exported to 1584 x 396. All five final PNGs were visually inspected for spelling, legibility, complete logos and margins. They are approximately 220-310 KB each. No upload was performed.

Final edit prompt:

Use case: text-localization. Make exactly one text change to the supplied LinkedIn banner. Replace the word "coding" with "doing", so the only headline reads "Learn by" on the first line and "doing" on the second. Keep "doing" left aligned at the same starting point as "coding". Preserve the very large heavy white font, font size, line spacing, black background, original green eye and white NVIDIA wordmark, logo proportions and position, blank left area, and overall composition. No small text, new decoration, names, taglines or extra wording. Preserve the source's ultra-wide 4:1 banner format, preferably exactly 1584x396 pixels. This is a precise edit, not a redesign. If a taller canvas is unavoidable, add only black space equally at top and bottom and keep the entire original 4:1 design centered so it can be exported at 4:1 without losing any text or logo.

Generated original: /Users/majid/.codex/generated_images/01a0a064-8597-7b41-ace2-cfbb33ed5e50/exec-a089cdda-d195-4689-a8ca-01390e18023c.png

The initial prompts below are retained as generation history.

### 1. 01-ai-workshops.png

Use case: ads-marketing. Create a new, radically simple personal LinkedIn cover for a NVIDIA DLI Certified Instructor. The single supplied reference is the official NVIDIA horizontal logo, shown in the conversation because its filesystem path is unavailable to this image tool. Preserve it faithfully.
CANVAS: ultra-wide 4:1 cover, exactly 1584 x 396 pixels. Solid pure black background, no texture or gradient. This is a finished standalone raster banner, not a screenshot or mockup.
ONLY CONTENT: the exact two-word headline "AI workshops" and the official NVIDIA horizontal logo from the reference. Delete every other word, all personal details, small print, credential lines and decorative lines. No new text whatsoever.
TYPOGRAPHY: enormous heavy sans serif, crisp solid white, about 115px font on this 1584px wide canvas. One line. Occupy the middle of the banner. Left align headline near x=470 y=125 and keep everything in x=440..1490, y=95..285 so it survives cropping and the profile photo. Leave the leftmost 27 percent completely empty.
LOGO: at far right x=1150..1480, vertically centered, around 330px wide. Preserve original green eye and white NVIDIA wordmark geometry, color and proportions with clear separation from headline. No tagline or fine print.
Professional, sparse, exceptionally readable at phone size. No tiny text, thin strokes, shadows, noise, futuristic detail or glowing effects. Do not add university logos or fake seals. Render the supplied logo faithfully.

Generated original: /Users/majid/.codex/generated_images/01a0a064-8597-7b41-ace2-cfbb33ed5e50/exec-37d82768-e5ed-4810-a401-930adb35e594.png

### 2. 02-build-ai-agents.png

Use case: ads-marketing. Create a new, radically simple personal LinkedIn cover for a NVIDIA DLI Certified Instructor. The single supplied reference is the official NVIDIA horizontal logo, shown in the conversation because its filesystem path is unavailable to this image tool. Preserve it faithfully.
CANVAS: ultra-wide 4:1 cover, exactly 1584 x 396 pixels. Solid pure black background, no texture or gradient. This is a finished standalone raster banner, not a screenshot or mockup.
ONLY CONTENT: the exact headline "Build\nAI agents" with the indicated line break and the official NVIDIA horizontal logo from the reference. Delete every other word, all personal details, small print, credential lines and decorative lines. No new text whatsoever.
TYPOGRAPHY: enormous heavy sans serif, crisp solid white, about 112px font on this 1584px wide canvas. Two lines with tight but clear leading. Occupy the middle of the banner. Left align headline near x=470 with its two lines centered vertically and keep everything in x=440..1490, y=65..320 so it survives cropping and the profile photo. Leave the leftmost 27 percent completely empty.
LOGO: at far right x=1150..1480, vertically centered, around 330px wide. Preserve original green eye and white NVIDIA wordmark geometry, color and proportions with clear separation from headline. No tagline or fine print.
Professional, sparse, exceptionally readable at phone size. No tiny text, thin strokes, shadows, noise, futuristic detail or glowing effects. Do not add university logos or fake seals. Render the supplied logo faithfully.

Generated original: /Users/majid/.codex/generated_images/01a0a064-8597-7b41-ace2-cfbb33ed5e50/exec-5bc17048-b802-490a-8eaf-be16d94408c1.png

### 3. 03-learn-by-coding.png

Use case: ads-marketing. Create a new, radically simple personal LinkedIn cover for a NVIDIA DLI Certified Instructor. The single supplied reference is the official NVIDIA horizontal logo, shown in the conversation because its filesystem path is unavailable to this image tool. Preserve it faithfully.
CANVAS: ultra-wide 4:1 cover, exactly 1584 x 396 pixels. Solid pure black background, no texture or gradient. This is a finished standalone raster banner, not a screenshot or mockup.
ONLY CONTENT: the exact headline "Learn by\ncoding" with the indicated line break and the official NVIDIA horizontal logo from the reference. Delete every other word, all personal details, small print, credential lines and decorative lines. No new text whatsoever.
TYPOGRAPHY: enormous heavy sans serif, crisp solid white, about 112px font on this 1584px wide canvas. Two lines with tight but clear leading. Occupy the middle of the banner. Left align headline near x=470 with its two lines centered vertically and keep everything in x=440..1490, y=65..320 so it survives cropping and the profile photo. Leave the leftmost 27 percent completely empty.
LOGO: at far right x=1150..1480, vertically centered, around 330px wide. Preserve original green eye and white NVIDIA wordmark geometry, color and proportions with clear separation from headline. No tagline or fine print.
Professional, sparse, exceptionally readable at phone size. No tiny text, thin strokes, shadows, noise, futuristic detail or glowing effects. Do not add university logos or fake seals. Render the supplied logo faithfully.

Generated original: /Users/majid/.codex/generated_images/01a0a064-8597-7b41-ace2-cfbb33ed5e50/exec-36961ac1-3edd-4ca5-a7f1-db681c139f75.png

### 4. 04-train-your-team.png

Use case: ads-marketing. Create a new, radically simple personal LinkedIn cover for a NVIDIA DLI Certified Instructor. The single supplied reference is the official NVIDIA horizontal logo, shown in the conversation because its filesystem path is unavailable to this image tool. Preserve it faithfully.
CANVAS: ultra-wide 4:1 cover, exactly 1584 x 396 pixels. Solid pure black background, no texture or gradient. This is a finished standalone raster banner, not a screenshot or mockup.
ONLY CONTENT: the exact headline "Train your\nteam" with the indicated line break and the official NVIDIA horizontal logo from the reference. Delete every other word, all personal details, small print, credential lines and decorative lines. No new text whatsoever.
TYPOGRAPHY: enormous heavy sans serif, crisp solid white, about 112px font on this 1584px wide canvas. Two lines with tight but clear leading. Occupy the middle of the banner. Left align headline near x=470 with its two lines centered vertically and keep everything in x=440..1490, y=65..320 so it survives cropping and the profile photo. Leave the leftmost 27 percent completely empty.
LOGO: at far right x=1150..1480, vertically centered, around 330px wide. Preserve original green eye and white NVIDIA wordmark geometry, color and proportions with clear separation from headline. No tagline or fine print.
Professional, sparse, exceptionally readable at phone size. No tiny text, thin strokes, shadows, noise, futuristic detail or glowing effects. Do not add university logos or fake seals. Render the supplied logo faithfully.

Generated original: /Users/majid/.codex/generated_images/01a0a064-8597-7b41-ace2-cfbb33ed5e50/exec-3564e7b0-a33f-4823-bb70-70dcb7d00f1e.png

### 5. 05-dli-ambassador.png

Use case: ads-marketing. Create a new, radically simple personal LinkedIn cover for a NVIDIA DLI Certified Instructor. The single supplied reference is the official NVIDIA horizontal logo, shown in the conversation because its filesystem path is unavailable to this image tool. Preserve it faithfully.
CANVAS: ultra-wide 4:1 cover, exactly 1584 x 396 pixels. Solid pure black background, no texture or gradient. This is a finished standalone raster banner, not a screenshot or mockup.
ONLY CONTENT: the exact headline "DLI\nAmbassador" with the indicated line break and the official NVIDIA horizontal logo from the reference. Delete every other word, all personal details, small print, credential lines and decorative lines. No new text whatsoever.
TYPOGRAPHY: enormous heavy sans serif, crisp solid white, about 112px font on this 1584px wide canvas. Two lines with tight but clear leading. Occupy the middle of the banner. Left align headline near x=470 with its two lines centered vertically and keep everything in x=440..1490, y=65..320 so it survives cropping and the profile photo. Leave the leftmost 27 percent completely empty.
LOGO: at far right x=1150..1480, vertically centered, around 330px wide. Preserve original green eye and white NVIDIA wordmark geometry, color and proportions with clear separation from headline. No tagline or fine print.
Professional, sparse, exceptionally readable at phone size. No tiny text, thin strokes, shadows, noise, futuristic detail or glowing effects. Do not add university logos or fake seals. Render the supplied logo faithfully.

Generated original: /Users/majid/.codex/generated_images/01a0a064-8597-7b41-ace2-cfbb33ed5e50/exec-60454828-b080-4edd-8031-531b8e05e2cd.png
