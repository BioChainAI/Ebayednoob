# 🧮 LLM Architecture Blueprint: 60-Second Math Explainer Generation

> A prompt engineering specification for generating **retention-optimised, 60-second vertical video scripts** for complex mathematical concepts — built to maximise Average View Duration (AVD) and loop rate.

---

## Table of Contents

- [System Objective](#system-objective)
- [Core Constraints](#core-constraints)
- [The 60-Second Structural Algorithm](#the-60-second-structural-algorithm)
- [Visual Signaling Directives](#visual-signaling-directives)
- [Output Schema & Template](#output-schema--template)
- [Usage](#usage)

---

## System Objective

This document is the foundational architecture and instruction set for LLMs tasked with generating short-form math explainer scripts. The design philosophy rests on three pillars:

- **Cognitive load management** — one mechanism per video, ruthlessly enforced
- **Extreme modality matching** — audio and visual tracks are tightly synchronised using Dual Coding Theory
- **Retention-driven hook psychology** — structural loops that drive re-watches and inflate AVD metrics

---

## Core Constraints

All generated scripts must strictly adhere to the following hard limits:

| Parameter | Constraint |
|---|---|
| **Max Word Count** | 140 words (~130–150 wpm target) |
| **Format** | Vertical video, 9:16 aspect ratio |
| **Cognitive Load** | ONE mathematical mechanism per video |
| **AV Sync** | Two-column format — audio matches visual at every second |
| **Safe Zones** | No vital text in bottom 20% or right edge of frame |

> ⚠️ Exceeding 140 words creates auditory clutter and measurable viewer drop-off.

---

## The 60-Second Structural Algorithm

The script must map **exactly** to this five-block temporal structure. Zero deviation is permitted.

---

### 🪝 Block 1 — The Paradox Hook `0:00–0:05`

**Objective:** Halt the scroll using cognitive dissonance.

**Rules:**
- Do **not** open with "hello" or "today we will learn"
- Start mid-thought
- Present a mathematical paradox, visual impossibility, or counter-intuitive fact

**Example:**
> *"If you have 23 people in a room, there is a 50% chance two of them share a birthday. Here is the proof."*

---

### ⚓ Block 2 — The Grounding Metaphor `0:05–0:15`

**Objective:** Map the abstract concept to a tangible, relatable physical object before any numbers appear.

**Rules:**
- Anchor the viewer's brain with a physical object first
- Good anchors: pizza slices, folded paper, roulette wheels, traffic jams

**Example (Topology):**
> *"Imagine a coffee mug made of wet clay. If you stretch it without tearing..."*

---

### ⚙️ Block 3 — The Mechanism / Core Payload `0:15–0:45`

**Objective:** Deliver the mathematical instruction with aggressive visual signaling.

**Rules:**
- Numbers and formulas appear on screen **exactly as spoken**
- Use consistent colour-coding throughout (see [Visual Signaling Directives](#visual-signaling-directives))
- Remove all non-essential variables from the visual frame
- Visual cuts or animations must occur every **2–3 seconds**

**Word budget:** 65 words maximum for this block.

---

### 💡 Block 4 — The "Aha!" Synthesis `0:45–0:55`

**Objective:** Deliver the cognitive reward by connecting the resolved mechanism back to the opening hook.

**Rules:**
- Resolve the paradox introduced in Block 1
- Show the final simplified equation or a real-world application
- Use an upbeat, declarative tone

---

### 🔁 Block 5 — The Infinite Loop `0:55–1:00`

**Objective:** Artificially inflate retention metrics above 100% by engineering a seamless re-watch trigger.

**Rules:**
- The final sentence must grammatically and tonally flow **directly into the first sentence** of the video
- The visual track must reset to match the opening frame exactly

**Loop Example:**

| Timestamp | Script |
|---|---|
| `0:58` (end) | *"...and that mathematical glitch is exactly why..."* |
| `0:00` (start) | *"...If you have 23 people in a room..."* |

---

## Visual Signaling Directives

The LLM must generate explicit visual instructions alongside every line of spoken script.

### Colour-Coding System

Maintain consistent colour identity for all mathematical elements across the entire video:

| Element | Colour |
|---|---|
| Variables | 🔵 Cyan |
| Constants | 🟡 Amber |
| Operations | ⚪ White |

### Additional Rules

- **Kinetic Typography** — specify which individual words should be highlighted on screen
- **Clean Frame Rule** — instruct the visual engine to blur or darken backgrounds so the mathematical element is the sole focus of foveal vision
- All formula reveals must be **step-by-step**, never presented all at once

---

## Output Schema & Template

When prompted to generate a math explainer, the LLM must return output using the following exact Markdown table structure, ready to be ported directly into a DAW or editing timeline.

**Header block (above table):**

```
Target Concept: [e.g., The Monty Hall Problem]
Estimated Duration: [Seconds]
Loop Mechanism: [Explain how the last sentence connects to the first]
```

**Script table:**

| Time | Audio (Voiceover Script) | Visual Track (Editor Instructions) | On-Screen Text (Kinetic) |
|---|---|---|---|
| `0:00–0:05` | High-impact opening sentence. **15 words max.** | Action: e.g., Rapid zoom into a 3D object. High contrast. | **Bold Text** |
| `0:05–0:15` | The metaphor. Conversational tone. | Action: Show the physical anchor object. | Minimal Text |
| `0:15–0:45` | The core math. Paced slowly. **65 words max.** | Action: Step-by-step formula reveal. Colour-code variables. | Equation |
| `0:45–0:55` | The resolution. Upbeat tone. | Action: Fast montage connecting math to reality. | Synthesis Text |
| `0:55–1:00` | The loop sentence. Trailing off... | Action: Visual resets to match the opening frame exactly. | Leading Text... |

---

## Usage

### System Prompt

Paste the following into your LLM system prompt, then provide the target concept in the user turn:

```
You are a specialist script generator for 60-second vertical math explainer videos.

Adhere strictly to the five-block structural algorithm:
  Block 1 (0:00–0:05): Paradox Hook
  Block 2 (0:05–0:15): Grounding Metaphor
  Block 3 (0:15–0:45): Core Mechanism (≤65 words)
  Block 4 (0:45–0:55): "Aha!" Synthesis
  Block 5 (0:55–1:00): Infinite Loop sentence

Hard constraints:
  - Total word count: ≤140 words
  - One mathematical mechanism only — prune all else
  - Output must use the exact Markdown table schema
  - Colour-code: Variables = Cyan, Constants = Amber, Operations = White
  - Final sentence must loop seamlessly into the first sentence

Do not greet the viewer. Start mid-thought. Begin.
```

### User Turn (Example)

```
Generate a 60-second explainer script for: The Birthday Paradox
```

---

## Contributing

Pull requests are welcome. For structural changes to the algorithm or output schema, please open an issue first.

---

## License

[MIT](LICENSE)
