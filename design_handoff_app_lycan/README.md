# Handoff: App-Lycan — "Glass" Redesign

A full UI redesign of App-Lycan — a per-company workspace for tuning CVs and cover letters against job context, with an AI pair-writer embedded throughout.

---

## About the design files

Everything in this bundle is a **design reference built in HTML/CSS/JS** — a clickable prototype showing the intended look, motion, and behavior. It is **not production code to copy-paste**.

Your job is to **recreate these designs inside the App-Lycan repo**, using whatever stack and conventions already exist there (React components, Tailwind/SCSS/CSS modules, routing, state management, icon library, etc.). Treat the HTML as a visual spec — lift the tokens, layouts, copy, and interaction details, but implement everything as idiomatic code in the target codebase.

If you need to pick a framework from scratch: this design was built vanilla-JS + plain CSS, but React + CSS variables + a small utility layer (vanilla-extract, CSS Modules, or Tailwind) will port cleanly.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, radii, shadows, motion curves, copy, and interaction states are all specified. Recreate pixel-perfectly where possible.

---

## Design system — global

This is a **glassmorphic** design system. Three design primitives do most of the visual work:

1. **Ambient background** — a fixed fullscreen stage behind everything: layered radial gradients + 4 drifting blurred orbs + a faint star field. Never scrolls. Orbs animate over 22–32s each on alternating directions. Lives behind `z-index: 0`; all real content is `z-index: 1+`.
2. **Glass surfaces** — cards, sheets, modals, the nav dock, chrome. Semi-transparent fill (white @ 4–8% on dark, white @ 50–70% on light), `backdrop-filter: blur(20–40px) saturate(140%)`, 1px inner hairline border (`rgba(255,255,255,0.08)` dark / `rgba(0,0,0,0.06)` light), soft `box-shadow`, and an optional top-edge "sheen" (a 1px gradient border on the top ~8% of the element).
3. **Accent glow** — primary CTAs and active pills get a soft color-washed halo from the current palette accent.

### Tweakable system axes

The prototype exposes four axes via a Tweaks panel; real app should at minimum support the first two as themes:

| Axis           | Values                           | What it changes                     |
| -------------- | -------------------------------- | ----------------------------------- |
| `data-theme`   | `dark` \| `light`                | Background, foreground, orb opacity |
| `data-palette` | `moonlit` \| `aurora` \| `dusk`  | Accent color, orb colors, glow      |
| `data-glass`   | `light` \| `balanced` \| `heavy` | Blur intensity + surface opacity    |
| `data-orbs`    | `on` \| `off`                    | Show/hide drifting orbs             |
| `data-radius`  | `sm` \| `md` \| `lg` \| `xl`     | Base corner radius                  |

The **shipped defaults** the user confirmed: `theme=dark`, `palette=moonlit`, `glass=heavy`, `orbs=on`, `radius=lg`.

---

## Design tokens

Copy these straight into your token file. Everything is a CSS variable so palette swaps are a single attribute change on `<html>` or `<body>`.

### Typography

```
--font-sans:  "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif
--font-serif: "Instrument Serif", "Cormorant Garamond", Georgia, serif
--font-mono:  "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace
```

- Body copy: Inter, `letter-spacing: -0.01em`, `font-feature-settings: "ss01","cv11"`
- Display/hero/modal titles: Instrument Serif (italic for emphasis in hero), `letter-spacing: -0.02em`
- Numbers, timestamps, IDs, tags: JetBrains Mono, `font-feature-settings: "zero","cv01"`

### Type scale (used in the mocks)

| Role             | Size          | Weight                                                     | Family       |
| ---------------- | ------------- | ---------------------------------------------------------- | ------------ |
| Hero display     | 72px / 1.05   | 400                                                        | Serif        |
| Page title       | 40px / 1.1    | 500                                                        | Sans         |
| Section header   | 24px / 1.2    | 600                                                        | Sans         |
| Card title       | 18px / 1.3    | 600                                                        | Sans         |
| Body             | 14px / 1.5    | 400                                                        | Sans         |
| Small / meta     | 12px / 1.4    | 500                                                        | Sans or Mono |
| Micro / overline | 10–11px / 1.3 | 500, `letter-spacing: 0.08em`, `text-transform: uppercase` | Mono         |

### Radius scale

```
--radius-sm: 10px
--radius-md: 14px
--radius-lg: 18px  (buttons, pills, inputs)
--radius-xl: 24px  (cards)
--radius-2xl: 32px (sheets, modals)
```

### Motion

```
--ease-smooth: cubic-bezier(0.22, 1, 0.36, 1)   /* UI state changes */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1) /* playful pops */
--dur-fast: 160ms   /* hovers, tiny transitions */
--dur-med:  280ms   /* modal open, panel slide */
--dur-slow: 520ms   /* hero entrance, orb drift staging */
```

### Shadows

```
--shadow-sm: 0 1px 2px rgba(0,0,0,0.18)
--shadow-md: 0 8px 28px rgba(4, 6, 20, 0.38)
--shadow-lg: 0 24px 60px rgba(4, 6, 20, 0.5)
--shadow-glow: 0 0 80px -20px var(--accent-glow)
```

### Palette — Moonlit (default, dark)

```
--bg-0: #070816   /* page base */
--bg-1: #0d0f24   /* elevated base */
--bg-2: #131634   /* panels */
--fg-0: #f4f1ff   /* primary text */
--fg-1: #d7d3ee   /* secondary text */
--fg-2: #948fb3   /* tertiary/meta */
--fg-3: #62607e   /* disabled */
--accent:      #a78bfa
--accent-2:    #7c3aed
--accent-soft: rgba(167,139,250,0.18)
--accent-glow: rgba(140, 92, 246, 0.55)
--ok:     #5eead4
--warn:   #fcd34d
--danger: #fb7185
--ai:     #c4b5fd  /* AI UI accent */
--ats:    #6ee7b7  /* ATS-mode accent */
/* Background orb colors */
--orb-1: #6d28d9
--orb-2: #c026d3
--orb-3: #1e3a8a
--orb-4: #f472b6
```

### Palette — Moonlit (light)

```
--bg-0: #eef0ff   --bg-1: #f5f3ff   --bg-2: #ffffff
--fg-0: #1a1433   --fg-1: #3b3368   --fg-2: #6b648f   --fg-3: #9d97b8
--accent: #7c3aed --accent-2: #5b21b6
--accent-soft: rgba(124,58,237,0.14)
--accent-glow: rgba(167,139,250,0.45)
--ok: #14b8a6    --warn: #d97706   --danger: #e11d48
--ai: #7c3aed    --ats: #10b981
--orb-1: #a78bfa --orb-2: #f0abfc --orb-3: #93c5fd --orb-4: #fbcfe8
```

Two additional palettes (`aurora`, `dusk`) are defined in `styles/tokens.css` in the bundle — port them if you want the palette-swap tweak.

### Glass surface recipes

```css
/* balanced (default) */
.glass {
  background: rgba(255, 255, 255, 0.055);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    var(--shadow-md),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
[data-theme='light'] .glass {
  background: rgba(255, 255, 255, 0.6);
  border-color: rgba(0, 0, 0, 0.06);
  box-shadow:
    var(--shadow-md),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

/* heavy (confirmed shipping default) */
[data-glass='heavy'] .glass {
  background: rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(40px) saturate(150%);
}

/* sheen — apply via separate .sheen class */
.sheen::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 40%);
  mix-blend-mode: overlay;
  opacity: 0.6;
}
```

Full CSS for all glass variants and the ambient stage lives in `styles/glass.css` in the bundle.

---

## Screens

The prototype covers **seven** states/screens. Implement them as distinct routes or view states in your app.

### 1. Workspaces dashboard (`/workspaces`)

**Purpose:** Landing page. User lands here and picks a company-workspace to work in, or creates a new one from a job description.

**Layout (1440px canvas, single column, ~1200px content max-width centered):**

- **App bar** (fixed top, 72px tall) — glass chrome. Left: wordmark "App-Lycan" in serif + ghost "cv" label. Right: Profile icon button, Float-AI icon button, theme toggle, layout toggles (grid/list), `Import` button, `+ New workspace` primary CTA.
- **Hero** (glass card, 32px padding, 24px border radius) — time-aware greeting in serif, e.g. "Good evening, Mira." A second serif line with a live stat: _"Five workspaces waiting."_ (the number word is italicized + accent-colored). Body copy describing the product beneath. Three colored pills at bottom: `• 12 CVs`, `• 6 cover letters`, `• 3 active applications`, `• AI tuned · 24h`.
- **Hero right rail** — two "context-restore" cards: latest touched workspace + readiest-to-send workspace. Each is a small glass button with icon, title, and 1-line meta. Click jumps into that workspace.
- **Section header** "Workspaces" with inline `sorted by · recent` and `filter · all` mono pills on the right.
- **Workspace grid** — 4-up grid at 1200+ width, 3-up at 1024, 2-up at 720. Each card:
  - 260×220 glass card, 24px radius
  - Top: 40×40 briefcase icon tile in `--accent-soft`
  - Title (company + role, 18px semibold)
  - Meta row: "N CVs · M letters" in `--fg-2`
  - Progress bar (match score): `height: 6px, background: rgba(255,255,255,0.06), fill: linear-gradient(90deg, var(--accent-2), var(--accent))`
  - Footer: mono date + status pill (`tuned` green-ok, `blank` neutral)
- **Nav dock** — fixed bottom-center, floating glass chrome, 7 buttons: Workspaces, Inside workspace, Editor, New modal, Settings, Profile, Float AI. Active state = accent-soft background + accent text.

### 2. Inside a workspace (`/workspaces/:id`)

**Purpose:** A single company-workspace. Shows the job context the user pasted, their CVs and letters tuned for it, match score, history.

**Layout:**

- Same app bar + nav dock.
- **Breadcrumb row** — `Workspaces › Nebula AI` + status pill `• 92% match`.
- **Top hero panel** — split two-column glass card:
  - Left 60%: company + role title (page-title scale), 3-line job summary (body), tag row (the skills the JD emphasizes, as outline pills).
  - Right 40%: "Match score" big number (48px, serif), "Last tuned 2h ago" meta, `Open in editor` primary button, `Re-tune` ghost button.
- **Tabs** beneath hero — `CVs (3)`, `Cover letters (1)`, `Context`, `Activity`. Active tab = accent underline + accent text; others are `--fg-2`.
- **CVs/Letters grid** — 3-up at 1200px. Each document card: doc name, mono "last edited" timestamp, 4 line preview (first 4 lines of content, low contrast), hover shows action row: Open, Duplicate, Export PDF.
- **Right side floating AI chip** (bottom-right, above dock) — pulsing accent dot + "Ask about this workspace" pill. Expands into the Float AI panel (see Screen 7).

### 3. Editor (`/workspaces/:id/documents/:docId`)

**Purpose:** The core writing surface. Three-pane layout: document outline, the writing canvas, AI assistant.

**Layout:** fixed-height 100vh minus top bar, three columns:

- **Left rail — 240px** (glass panel): document list within this workspace, nested by type. Active doc has accent-soft background.
- **Center — flex-1** (glass canvas, max-width ~720px centered within center column):
  - Sticky header: doc title (editable h1), save state ("Saved · 2s ago" in mono), toolbar row (Bold, Italic, Underline, H1/H2, List, Link, Quote) — RTE toolbar, same pattern used in the profile modal.
  - Writing area: prose, generous line-height (1.7), large paragraph spacing. Placeholder copy is realistic resume prose.
  - Bottom toolbar: word count, "ATS mode" toggle (a segmented toggle — when on, strips formatting and shows keyword coverage overlay), export menu.
- **Right rail — 360px** (glass panel): **AI pair-writer** — header `Assistant` with a tiny spark icon, a threaded chat, context chips showing what the AI can see (current doc, job description, profile). Input anchored to bottom with `Ask anything · ⌘⏎ to send` placeholder. A ghost suggestion strip sits above input: three tappable prompt chips (e.g. _"Tighten the opening"_, _"Mirror their language"_, _"Add a metric"_).

**Editor interactions:**

- Typing in the canvas streams suggestions into the right rail after 1.5s idle. Suggestions are collapsible cards, each with Apply/Dismiss.
- ATS mode toggle fades formatting and overlays a keyword-coverage heatmap (yellow highlights on matched keywords, red X pills for missing keywords at the top).

### 4. "New workspace" modal

**Purpose:** Create a workspace by pasting a job description. This is the primary "get started" flow.

**Layout (centered 640px-wide glass sheet, 32px border radius, 40px padding):**

- Header row: title `Create workspace` (24px semibold) + close X.
- Sub-copy: one line explaining "Paste a JD and we'll build the workspace around it."
- Big textarea (min-height 240px, glass inset, 18px body copy, placeholder "Paste the full job description…").
- Below textarea: toggle row — `Auto-detect company`, `Auto-tag skills`, `Pull in my most-recent CV` (all on by default).
- Bottom row: cancel (ghost) + `Create workspace` (primary CTA with accent glow).
- **AI hint strip** below the textarea while empty: small accent-glow panel saying _"Or paste a job URL · we'll fetch it"_ with a paste icon.

### 5. Settings modal

**Purpose:** All app-level preferences. Large glass modal (800px wide, `max-height: 80vh`, internal scroll, 40px padding).

- Two-column layout inside modal: 200px nav rail (Account, Appearance, AI, Integrations, Data, Advanced) + content pane.
- **Appearance section** exposes the Tweaks (theme, palette, glass, orbs, radius) as named segmented controls with visual swatches — this is what the real app should also expose.
- **AI section**: temperature slider, "Always cite job-description terms" toggle, model picker, prompt library with re-orderable prompts.
- **Integrations**: LinkedIn, Google Drive, Notion, Gmail — each is a row with icon, status pill, Connect/Disconnect button.
- Bottom: `Done` primary button pinned to modal footer.

### 6. Profile modal — **AI context** editor

**Purpose:** A freeform rich-text editor where the user writes their AI context — the running narrative of who they are, what they want, how they work — that seeds every AI interaction. (The user explicitly asked for this to be a single freeform textarea, not a fielded form.)

**Layout (centered glass sheet, 720px wide, 40px padding, 32px radius):**

- Header row (top-aligned): left — 56px circular avatar placeholder + user name (24px serif) + role subtitle + mono "member since" line. Right — `?` help icon button + close X.
- One-line intro sub-copy: _"Lycan reads this before every draft. The more specific, the better."_
- **RTE toolbar** — glass strip with: Bold, Italic, Underline, H1, H2, Bullet list, Numbered list, Link, Quote, Clear formatting. Keyboard shortcuts tooltip on hover.
- **Contenteditable area** — min-height 420px, max-height 60vh, `overflow-y: auto`, generous 1.7 line-height, 18px body, serif display is OK for h1/h2 inside.
- **Help popover** — when the `?` is hovered/focused/clicked, a small glass popover appears to the right of the button listing the things worth including:
  - Roles you've held (titles, scope, dates)
  - Metrics you're proud of
  - Tools, stacks, methods
  - Vocabulary you use vs. avoid
  - Soft context (work style, what you're avoiding next)
- **Footer**: mono `Autosaved · 3s ago` on the left, `Done` primary button on the right.

Seed the editor with realistic Mira Vale content (see `index.html` in the bundle for the exact string used) so the layout can be visually validated at real scale.

### 7. Float AI panel

**Purpose:** A persistent AI-assistant that can be opened from any screen (other than the editor, which has its own rail).

**Layout:** A 380×560 glass panel pinned to bottom-right, 24px above the nav dock, 24px from right edge. Drop-shadow-lg + accent-glow.

- Header: "Assistant" + context pill showing what it can see ("· Workspaces view" or "· Inside Nebula AI"), close X.
- Message thread, same styling as editor's AI rail.
- Input bar at bottom with send button.
- Minimize to a 56px circular floating button with spark icon + pulsing accent dot.

---

## Global interaction & behavior

- **Navigation**: every screen reachable via the bottom nav dock. Dock buttons for _modals_ open the modal; dock buttons for _screens_ switch the main view. Active state sync is important — users should always see where they are.
- **Modal dismiss**: click backdrop, press `Esc`, or click X. Backdrop is `rgba(8, 10, 30, 0.6)` with `backdrop-filter: blur(8px)`.
- **RTE**: plain `document.execCommand` is fine for a prototype, but in production use your editor library of choice (Tiptap, Lexical, ProseMirror). Toolbar buttons must use `mousedown → preventDefault` (not click) so focus stays in the editor.
- **Autosave**: debounce 800ms, show "Saving…" → "Saved · Ns ago" state in mono near the title.
- **Responsive**: designed for 1200–1600px. Below 1024px, the workspace grid drops to 2-up and the editor's right rail becomes a bottom sheet. Below 720px, the layout becomes single-column and the nav dock becomes a 4-icon bar (rest in a "more" sheet).
- **Keyboard**:
  - `⌘K` — open command palette (not shown but reserve the shortcut)
  - `⌘N` — new workspace modal
  - `⌘⏎` — send AI message from any AI input
  - `Esc` — close any modal / panel
- **Motion budget**: keep animations under 400ms for state changes. The only long-running motion is the orb drift (20–30s loops, infinite alternate).

---

## State

Minimum state your app needs:

```ts
type AppState = {
  screen: 'workspaces' | 'dashboard' | 'editor'
  modal: null | 'new' | 'settings' | 'profile'
  activeWorkspaceId: string | null
  activeDocumentId: string | null
  floatAi: boolean // Float AI panel visible
  editorAi: boolean // Editor right-rail AI visible (default on)
  showForm: boolean // Editor form/outline visible
  atsMode: boolean // Editor ATS view
  theme: { theme; palette; glass; orbs; radius } // Tweaks
}
```

Persist `theme` to localStorage under `lycan.tweaks`.

Data model:

```ts
type Workspace = {
  id: string
  company: string
  role: string
  jobDescription: string // the pasted JD
  tags: string[] // extracted skills
  matchScore: number // 0–100
  lastTunedAt: Date
  status: 'blank' | 'tuned' | 'ready'
  cvs: Document[]
  letters: Document[]
}

type Document = {
  id: string
  workspaceId: string
  kind: 'cv' | 'letter'
  title: string
  body: string // rich text, store as HTML or JSON depending on editor
  updatedAt: Date
}

type Profile = {
  name: string
  role: string
  avatarUrl: string | null
  aiContext: string // the freeform RTE body — HTML string
  memberSince: Date
}
```

---

## Assets

The prototype uses **no image assets** — every "icon" is an inline SVG defined in `scripts/icons.js`. Port these or swap for whatever icon library the repo already uses (lucide-react, heroicons, phosphor, etc.). The SVGs follow a 16×16 grid, 1.5px stroke, round caps and joins.

The user avatar in the Profile modal is a placeholder — use your existing avatar component.

---

## Files in this bundle

`index.html` is **self-contained** — open it directly in a browser and the prototype runs with no external dependencies (beyond Google Fonts). All CSS and JS are inlined in a single file. This is the authoritative visual reference.

The `styles/` and `scripts/` folders are a **pre-split, readable version of the same code** — easier to navigate when you're lifting specific pieces. They are parallel to index.html, not loaded by it.

| File                    | What it is                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`            | Root file — self-contained prototype. ~2600 lines. Contains all CSS, all JS, all seed data, and the app shell.                                                                           |
| `styles/tokens.css`     | All design tokens: typography, radius, motion, shadows, **full palette definitions for all three palettes (moonlit/aurora/dusk) in both dark and light variants**. Copy values verbatim. |
| `styles/glass.css`      | Glass surface primitives, ambient stage (orbs + stars), sheen effect, glass-chrome variant for top-bar and dock.                                                                         |
| `styles/app.css`        | Component-level styling: app bar, hero, cards, grid, tabs, pills, buttons, inputs, modal shell, nav dock, editor layout, AI rail.                                                        |
| `scripts/data.js`       | Seed data (workspaces, documents, profile, tags) — references for realistic demo content and copy.                                                                                       |
| `scripts/icons.js`      | All icons as functions returning SVG strings.                                                                                                                                            |
| `scripts/components.js` | Reusable bits: pills, tags, toggles, cardMenu, etc.                                                                                                                                      |
| `scripts/screens.js`    | Per-screen render functions — authoritative source for layout & markup structure of each screen.                                                                                         |
| `scripts/app.js`        | State, routing, event delegation, modal management, RTE handler, Tweaks wiring.                                                                                                          |

**Start here:** open `index.html` in a browser to see everything live. Then use `styles/tokens.css` as your first copy target, and `scripts/screens.js` to understand per-screen structure.

---

## Recommended implementation order

1. **Token layer** — port `tokens.css` 1:1 into your token system. Don't rename variables; the palette swap depends on the attribute selectors.
2. **Ambient + glass primitives** — build the `<BackgroundStage />` and the `<Glass />` / `<GlassChrome />` surface components. Nothing else looks right without these.
3. **Nav dock + app bar** — these are on every screen; get them solid first.
4. **Workspaces dashboard** (screen 1) — ships the hero + grid patterns you'll reuse.
5. **Inside-workspace view + Editor** — heaviest screens; build document cards first, then the three-pane editor.
6. **Modals** — New, Settings, Profile (with RTE).
7. **Float AI** — last; it depends on the editor AI rail being built first since they share a component.
8. **Tweaks panel** (Appearance settings in Settings modal) — wire up the 5 axes to the `<html>` data-attributes.

Good luck. Questions → reference `index.html` and `scripts/screens.js` first; the design choices are all there.
