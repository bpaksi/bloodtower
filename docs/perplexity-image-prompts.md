Use a fixed prompt template, a four-variant layout, and an explicitly selected image model. For your example, I’d organize the job as **10 comparison sheets**, each containing four square icons—40 candidate designs total.

One clarification about my earlier response: I couldn’t switch image models through the generator available in this conversation. You can, however, choose an image-generation model in Perplexity’s settings. That is separate from choosing the model that writes the chat response. [perplexity](https://www.perplexity.ai/help-center/en/articles/10354781-generating-images-with-perplexity)

## Comet and Perplexity options to select

For this workflow, I recommend opening Perplexity in a full Comet browser tab and using these settings:

| Option                 | Suggested selection                                                                 | Reason                                                                                                                                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image-generation model | Choose a named model rather than Default                                            | Default automatically selects a model; a named selection makes comparisons more controlled. Available documented choices are GPT Image 1, Nano Banana, and Seedream 4.5. [perplexity](https://www.perplexity.ai/help-center/en/articles/10354781-generating-images-with-perplexity) |
| Where to select it     | Perplexity Settings → Preferences → Image generation model                          | This is the documented control for the image generator. [perplexity](https://www.perplexity.ai/help-center/en/articles/10354781-generating-images-with-perplexity)                                                                                                                  |
| Chat model             | Best is sufficient for submitting the finished prompt                               | The chat-model selector and image-model preference are separate controls. Switching the chat model is not how you choose the image generator. [perplexity](https://www.perplexity.ai/help-center/en/articles/10354919-what-advanced-ai-models-are-included-in-my-subscription)      |
| Thinking               | Use for planning complicated prompt families, not necessary for this fixed template | Perplexity recommends Thinking for complex reasoning and multi-step planning. [perplexity](https://www.perplexity.ai/help-center/en/articles/10354919-what-advanced-ai-models-are-included-in-my-subscription)                                                                      |
| Deep Research          | Leave off for this task                                                             | It is intended for research reports rather than image-generation comparisons. [perplexity](https://www.perplexity.ai/help-center/en/articles/10354919-what-advanced-ai-models-are-included-in-my-subscription)                                                                      |
| Model Council          | Don’t use it as an image-model comparison mechanism                                 | Its documented purpose is comparing model perspectives; select the image model through Preferences instead. [perplexity](https://www.perplexity.ai/help-center/en/articles/10354919-what-advanced-ai-models-are-included-in-my-subscription)                                        |

Nano Banana access also depends on your subscription: the documentation says Max and Enterprise Max users receive Nano Banana Pro. Record the actual option available in your account rather than assuming everyone is testing the same version. [perplexity](https://www.perplexity.ai/help-center/en/articles/10354781-generating-images-with-perplexity)

## Reusable prompt format

Here is a copy-and-paste template. The structural instructions stay fixed; replace the bracketed fields for each subject.

```text
TASK
Generate one image containing a 2×2 comparison sheet of four
distinct square app-icon variants.

BATCH METADATA
Project: [PROJECT NAME]
Subject ID: [01–10]
Prompt version: [v1]
Requested filename: [SUBJECT]-[MODEL]-[PROMPT VERSION]-sheet.png

OUTPUT
- One square comparison sheet.
- Four equally sized square quadrants.
- Each quadrant is a complete, independently usable app-icon design.
- No gutters, divider lines, borders, labels, text, or lettering.
- Do not add a title or explanatory text inside the image.
- Keep the artwork in each quadrant separate; do not let features
  cross into neighboring quadrants.

SUBJECT — FIXED ACROSS ALL FOUR VARIANTS
[Describe the subject, viewpoint, pose, defining features, and colors.]

STYLE — FIXED ACROSS ALL FOUR VARIANTS
[Describe the medium, line work, shading, palette, and visual era.]

COMPOSITION — FIXED ACROSS ALL FOUR VARIANTS
[Describe crop, scale, focal point, background, and lighting.]

SMALL-SIZE REQUIREMENTS
Design each icon to remain recognizable when reduced to 64×64 pixels.
Prioritize silhouette, strong contrast, heavy outlines, and large
readable features over tiny decorative detail.

CONTROLLED VARIANTS
Top left — A: Baseline.
[Your balanced default interpretation.]

Top right — B: Shape variation.
[Change silhouette or proportions; preserve style and palette.]

Bottom left — C: Ink-detail variation.
[Change hatching and texture; preserve silhouette and palette.]

Bottom right — D: Graphic simplification.
[Reduce detail and emphasize large shapes; preserve identity and palette.]

NONNEGOTIABLE FEATURES
- [Required feature 1]
- [Required feature 2]
- [Required feature 3]

EXCLUSIONS
[Unwanted styles, objects, features, and effects.]

EXECUTION
Generate the image now. Do not rewrite the brief or substitute a
text description for the image.
```

The important design choice is to vary one main attribute per quadrant. That makes the comparison easier to interpret than four versions that simultaneously change proportions, colors, lighting, and rendering style.

## Filled-in dragon prompt

```text
Generate one square image containing a 2×2 comparison sheet of four
distinct square dragon app-icon variants.

Requested filename:
app-icon-dragon-[MODEL]-v1-sheet.png

LAYOUT
Four equally sized square quadrants. Each quadrant must be a complete,
independently usable icon. No gutters, divider lines, borders, labels,
text, or lettering. No features may cross into neighboring quadrants.

FIXED SUBJECT
Close-cropped, front-facing dragon face filling each quadrant.
Two head horns swept up and outward.
Glaring yellow eyes.
Exactly one white horn on the nose, separate from the two head horns.
Bared ivory fangs and a visible red tongue.
Green scales.
Maintain the same subject identity and color palette in all variants.

FIXED STYLE
Late-1970s fantasy role-playing rulebook interior illustration.
Bold hand-drawn pen-and-ink contours and crosshatching.
Limited flat color.
Rough, confident ink marks rather than polished digital rendering.

FIXED COMPOSITION
Centered frontal face, tight crop, minimal empty background.
Dark near-black background with orange fire glow rising from below.
Keep the eyes, white nose horn, and fangs visually distinct.

SMALL-SIZE REQUIREMENTS
Every quadrant must read clearly as a dragon icon at 64×64 pixels.
Use heavy outlines, strong contrast, and large readable shapes.
Do not let intricate scale detail obscure the expression.

CONTROLLED VARIANTS
Top left — A: Baseline.
Broad angular face, balanced upward-and-outward horns, moderate
crosshatching, restrained fire glow.

Top right — B: Shape variation.
Keep the baseline rendering and lighting, but use a wider jaw,
thicker head horns, and heavier cheek plates.

Bottom left — C: Ink-detail variation.
Keep the baseline face proportions and lighting, but use denser
crosshatching and more pronounced hand-inked scale texture.
Preserve clear eyes, nose horn, and mouth.

Bottom right — D: Graphic simplification.
Keep the baseline face proportions and lighting, but simplify scales
into large green and black shapes with minimal crosshatching.

EXCLUSIONS
No text, lettering, borders, watermarks, extra nose horns, extra eyes,
side profiles, full bodies, glossy 3D rendering, photorealism,
smooth airbrushed gradients, or cute cartoon styling.

Generate the image now.
```

## How to organize 10 images with four variants each

There are two different experiments you might mean:

| Goal                                     | Structure                                              | Total                     |
| ---------------------------------------- | ------------------------------------------------------ | ------------------------- |
| Compare ten subjects                     | Ten subject briefs, one four-variant sheet per subject | 10 sheets, 40 candidates  |
| Compare models on one subject            | Same dragon brief, repeated across selected models     | 10 sheets, 40 candidates  |
| Compare ten subjects across three models | Each subject rendered once by each model               | 30 sheets, 120 candidates |

For a ten-sheet dragon-model comparison, I’d use:

- GPT Image 1: three runs.
- Nano Banana: three runs.
- Seedream 4.5: three runs.
- One additional run using the strongest performer.

Those are the image-model families listed in Perplexity’s documentation; confirm their availability in your settings. [perplexity](https://www.perplexity.ai/help-center/en/articles/10354781-generating-images-with-perplexity)

The tenth run is a refinement or tiebreaker, not part of the evenly balanced initial comparison.

### Repeatable execution checklist

1. Save the exact prompt as `v1`.
2. Select the image model in Preferences.
3. Start a fresh thread for each independent comparison run.
4. Paste the same prompt without additional conversational instructions.
5. Request one sheet per turn rather than relying on a single request to produce all ten.
6. Record the selected model, run number, prompt version, and any missed requirements.
7. Finish the baseline comparison before changing the prompt.
8. Put any revisions into `v2` and evaluate those separately.

Suggested naming convention:

```text
dragon-gptimage1-v1-r01-sheet.png
dragon-nanobanana-v1-r01-sheet.png
dragon-seedream45-v1-r01-sheet.png
```

Treat these as organizational names, not proof of which backend generated a file. Also, a requested filename may need to be applied manually when saving.

## Evaluate the icons consistently

Use this small scorecard for every quadrant:

| Criterion                               | Score |
| --------------------------------------- | ----- |
| Recognizable at 64×64                   | 1–5   |
| Required anatomy and colors are correct | 1–5   |
| Matches the pen-and-ink style           | 1–5   |
| Strong silhouette and contrast          | 1–5   |
| No unwanted features or artifacts       | 1–5   |

For this project, I’d prioritize 64-pixel readability and correct anatomy over decorative detail.

Finally, distinguish a repeatable process from an identical result: the documented Perplexity workflow provides prompt and model selection, but does not document a seed control for exact reruns. Keep the brief and settings constant, while treating each output as a new sample. A four-quadrant sheet is also one image containing four designs—not four separate PNGs; extracting the quadrants is a separate step. [perplexity](https://www.perplexity.ai/help-center/en/articles/10354781-generating-images-with-perplexity)
