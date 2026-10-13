# EnerMod Africa design system

A clear, professional research-observatory look: white pages, the AISESA green for the brand,
one familiar sans-serif typeface, and colour in charts and maps only where it carries data.
It replaces the look inherited from Krinea (teal green, Inter, white cards on off-white) so the
two products no longer resemble each other.

Tokens live in `apps/web/src/app/globals.css`; components in `apps/web/src/components`.

## 1. Principles

1. **White and calm.** White page, slate text, light grey bands (`bg-muted`) to separate home
   sections, hairline borders. No textures, gradients or decorative imagery.
2. **AISESA green is the brand.** Buttons, links, active navigation, eyebrow labels, the logo
   mark, the top strip (light green) and the footer (deep green) use the green of the AISESA
   logo (`#217842`). The AISESA logo itself keeps its own colours.
3. **One typeface.** Source Sans 3 for everything (headings bold, body regular), self-hosted
   through `@fontsource-variable/source-sans-3`. Tabular figures in tables and axes.
4. **Data colours have one meaning each** (section 4) and never decorate the interface.
5. **Readable in English and French**, WCAG 2.1 AA contrast, no horizontal scroll at 390 px.

## 2. Tokens

| Token | Value | Use | Contrast on white |
|---|---|---|---:|
| `--background`, `--card` | `#ffffff` | page, cards | |
| `--foreground` | `#172133` | text | 16.1 |
| `--ink-2` | `#334155` | ledes, secondary paragraphs | 10.4 |
| `--muted-foreground` | `#5b6576` | secondary text | 5.9 |
| `--muted` | `#f4f6f9` | bands, tags, hover | |
| `--border` | `#e1e5ea` | hairlines, card borders | |
| `--rule` | `#d3d9e1` | section and table rules | |
| `--input` | `#7d8796` | control borders | 3.6 |
| `--primary` | `#217842` | buttons (white text 5.3:1), focus ring | 5.3 |
| `--link` | `#1b6437` | links | 6.6 |
| `--rubric` | `#217842` | eyebrow labels, study numbers, sort carets | 5.3 |
| `--brand-50 … 950` | `#eef7f0 … #0a2716` | green scale (strip `brand-50`, footer `brand-900`) | |
| `--radius` | 6px (sm 4, lg 8, xl 10) | controls and cards | |

Vocabulary used in code comments: *ink* = the text colour, *paper* = the page background,
*rubric* = the green eyebrow colour, *block* = a titled section under a thin rule, *plate* = a
bordered, rounded panel, *booktabs* = tables ruled top and bottom without vertical lines,
*kicker* = the eyebrow label above a title, *neatline* = the 1px line under the header.

## 3. Typography

| Role | Size / weight |
|---|---|
| Home title | 34 → 52px, 700; second sentence in green, 600 |
| Page title (h1) | 34 → 44px, 700 |
| Section title (h2) | 26 → 32px, 700 |
| Block title (h3) | 22–23px, 700 |
| Body | 16px / 1.55; reading pages 17px / 1.7 |
| Eyebrow (`.sc`) | 12px, 700, uppercase, 0.06em, green |
| Field label | 14px, 600 |
| KPI value | 34px, 700 (home figures 40px) |

## 4. Data colours

| Meaning | Colour |
|---|---|
| Studies (map counts) | blue five-class ramp `--seq-count-1…5` (`#85add7` → `#172b65`) |
| Whole energy-system / focused | deep blue `--full` `#2d4d95` / mid blue `--light` `#5a8bc7`, square vs half-filled key |
| African-led | green `--africa` `#237c49`; mixed teams = green/violet stripes; non-African = violet `--outside` `#8a4fc0` |
| Gap score | red-brown ramp `--seq-gap-*` |
| Readiness | green ramp `--seq-ready-*` (never in the same view as authorship) |
| Single series (rankings, meters, sparklines) | slate `--mark-ink` `#475467` |

Maps use the Lambert azimuthal equal-area projection (precomputed by
`apps/web/scripts/build-geo.mjs` into `src/data/geo-africa.json`, run with `pnpm geo`), five
fixed classes with a stepped legend, island states as dots and a hatch for missing data.
Country links on maps do not prefetch.

## 5. Components

- **Buttons**: green filled (primary), outlined (secondary), ghost, link; 38px default, 46px large.
- **Header**: light green top strip (AISESA logo, partner line, source code, EN / FR, sign in),
  white masthead with the EnerMod mark (white Africa on a green rounded square) and the
  navigation (active item green and underlined). The observatory adds a grey tab bar.
- **Footer**: deep green, white text, partner logos on a white panel.
- **Home**: title, map and live figures, then sections alternating white and light grey:
  questions (cards), inventory, latest studies, page cards, how the inventory stays alive
  (process diagram), partners.
- **Observatory pages**: eyebrow, title, lede, scope tabs, KPI strip, titled blocks with charts,
  maps and ruled tables; studies as entries with tags and keys.
- **Reading pages**: contents column, 680px text column, live figures column.
- **Forms**: labelled fields, chips for choices, green submit button.

## 6. Checks before release

- `cd apps/web && pnpm lint && pnpm build`, then look at the main pages in EN and FR at 1366
  and 390 px (no console errors, no horizontal scroll).
- New colours: contrast ≥ 4.5:1 for text, ≥ 3:1 for controls and data marks.
