# Design audit, 2026-11-12

> Spec 156, chunk 156.4 (TY1d), acceptance A4. Every screen in the audit's list, checked against
> [`docs/design-direction.md`](../design-direction.md) at 390×844. This report changes no screen code: it
> lists what still reads as generated, why, and the fix. T confirms the emotional jobs and picks what is
> plotted. Today's palette stays (T, 2026-11-12), so no fix here proposes a colour change.

## How it was made

- **Base:** `09b6457db` (2026-11-12), after specs 152 to 155 and the type roles (156.2, 156.3) landed.
- **The shots are real.** Two sets, both at 390×844, device scale 1, reduced motion:
  - `SMOKE_ROUTES=all npm run verify:visual -w axiomancer-mobile` on this base: 35 routes, **35 matched
    their committed baselines, 0 differing, 0 console errors**. So the committed baselines in
    [`axiomancer-mobile/screenshots/baseline/`](../../axiomancer-mobile/screenshots/baseline/) are the
    screens as they stand at this base, and this report links them.
  - Eleven more shots the smoke routes do not cover, taken with the same drivers (`loadRoute`, the state
    fixtures, `enterLiveFight` into the board), saved small as WebP in
    [`design-audit-2026-11-12/`](./design-audit-2026-11-12/). The tabs (Wilds, Self, Satchel, Deck, Ledger,
    Settings) boot fixture `sage-bw-door-gate` (a level-15 Sage), because the smoke routes shoot them on a
    fresh boot with no character. The hand-open shot taps the second card of the seed-16 fight's hand.
- **Not shot:** the village (out of scope until its pitch, per spec 156), the blacksmith and the item
  reward (spec 154 judged only their empty states).
- **Screens reworked after spec 154:** the cutscene (172.2, the teller over a vellum panel) and the quest
  card (173.2, the quest card with beads and pay). The shots are of those versions.

## The tell count, before and after the UI rounds

Counted by `git grep` over `axiomancer-mobile/app` and `axiomancer-mobile/components` (`.ts` and `.tsx`,
tests excluded) at two commits:

- **Before:** `23b7a89c8` (2026-11-06, "plan: settle 153.7"), the parent of `f7ace1518`, the first commit of
  spec 152's first chunk (152.1, PR #1407). No chunk of spec 152 or 154 is in its history.
- **After:** `09b6457db`, this chunk's base.

| Tell | What is counted | Before | After |
|---|---|---:|---:|
| Monospace sets | `FONTS.mono` / `TYPE.mono` uses (JetBrains Mono before; 156.2 repointed the slot to Grenze and 156.3 moved every use to a role) plus literal `monospace`, `Menlo`, `Courier` faces | 195 | 0 |
| Tracked capitals | `letterSpacing` of 1 or more | 302 | 25 |
|  | any non-zero `letterSpacing` | 389 | 48 |
|  | `textTransform: 'uppercase'` | 14 | 16 |
| Distinct radii | distinct numeric `border*Radius` values (sets in brackets) | 24 (87) | 23 (87) |
| Translucent washes | `*Subtle` tokens, `*Wash` tokens, `withAlpha(`, and `rgba()` literals with alpha under 1 | 132 | 138 |
| Hairline borders | `border*Width` of 1 or 0.5, or `hairlineWidth` | 242 | 226 |

Files counted: 210 before, 241 after. A number to watch, not a gate.

**What the count says.** The type tells are nearly gone in the code: no monospace, and tracking fell by
about 92%. The shape tells did not move: the same 87 radius sets in 23 sizes, about as many washes, and
only 16 fewer hairlines. The kit pieces went on top of the boxes rather than replacing them. **What the
count misses:** Marcellus SC, the eyebrow role's face, is a small-capitals face, so a line set in it reads as
capitals with no `letterSpacing` or `uppercase` in the code. Several screens use the eyebrow role for whole
sentences (Rest, Self, Ledger), and on screen those read as the old tracked-capitals tell.

## Ranking: how much still reads as generated

The rank is by the number of rows in each screen's tells table; a tie goes to the screen whose tells
cover more of it. Most generated first.

| Rank | Screen | Tells | Bold thing |
|---:|---|---:|---|
| 1 | Hazard board (the puzzle node and the three-round board) | 8 | none |
| 2 | Fight, hand open (the board, and a card opened from the hand) | 7 | none (four compete) |
| 3 | Satchel | 6 | none |
| 4 | Settings | 5 | none |
| 5 | Spoils | 5 | the title |
| 6 | Self | 5 | the portrait frame |
| 7 | Ledger | 4 | none |
| 8 | Rest | 4 | the campfire |
| 9 | Cache | 4 | the chest |
| 10 | Labyrinth | 3 | the three act rows |
| 11 | Dialogue | 3 | the spoken line |
| 12 | Travel | 3 | the plate |
| 13 | Character select | 3 | the portrait |
| 14 | Deck | 3 | the open card's art |
| 15 | Hazard stakes card | 2 | the vellum card |
| 16 | Saves | 2 | the three vellum pages |
| 17 | Quest | 2 | the giver's figure |
| 18 | Fight with a foe (the reveal) | 2 | the foe |
| 19 | Main menu | 2 | the plate |
| 20 | Wilds | 2 | the map plate |
| 21 | Cutscene | 1 | the figure |
| 22 | Death return | 1 | the portrait |
| 23 | Game over | 1 | none |

**The three worst: the hazard board, the fight with the hand open, and the Satchel.** They go to 156.5 for
three directions each. All three are dense working screens built from coded boxes: the kit reached their
buttons and frames, but not the grids, meters, chips and tables that fill them.

## The screens

Each screen has its emotional job (proposed, for T to confirm or rewrite), the tells table, the bold thing,
and the top three fixes. **Look-only** changes type, colour use, borders or texture in place. **Layout** moves,
removes or regroups things.

### Wilds

Shot: [wilds](./design-audit-2026-11-12/wilds.webp) (fixture `sage-bw-door-gate`).

**Emotional job (proposed):** small on a drowned map, choosing a road anyway.

| Where | Why it reads as AI | Fix |
|---|---|---|
| The hint panel under the map ("walk the roads from where you stand…") | A full-width instruction box, the onboarding tooltip of an app, made permanent | Show the hint once, then let the map stand alone |
| "drag · scroll to zoom" under the hint | A tiny grey control legend, the web-map convention | Drop it, or fold it into the first-run hint |

**Bold thing:** the map plate, with the player's medallion on it. It works.

**Top three fixes:**
1. The hint panel shows only until the first move, then the map takes its height. Layout.
2. Drop the zoom legend. Layout.
3. The VITAE bar in the header goes from a plain filled rectangle to an inked rule on the vellum. Look-only.

### Fight with a foe (the reveal)

Shot: [combat-encounter](../../axiomancer-mobile/screenshots/baseline/combat-encounter.png); also
[combat-elite](../../axiomancer-mobile/screenshots/baseline/combat-elite.png) and
[combat-boss](../../axiomancer-mobile/screenshots/baseline/combat-boss.png).

**Emotional job (proposed):** faced. Something has seen you first.

| Where | Why it reads as AI | Fix |
|---|---|---|
| The teal radial glow behind the foe | A soft translucent gradient halo, the generated way to say "spotlight" | Let the foe stand on black, as every enemy plate is drawn |
| "LEVEL 3  108 VITAE" under the name | A stat line of small capitals and bold numbers, a dashboard caption | Say the level and vitae once, in the rules face, or leave them to the board |

**Bold thing:** the foe. It is the best screen in the fight.

**Top three fixes:**
1. Drop the radial glow; the foe on black. Look-only.
2. Set the level and vitae line in the rules role, sentence case, or drop it from the reveal. Look-only.
3. WITHDRAW's subline ("[content] No reward. You may try again.") moves out of the button, so the button holds one word. Layout.

### Fight, hand open (the board, and a card opened from the hand)

Shots: [combat-board](../../axiomancer-mobile/screenshots/baseline/combat-board.png) (the hand dealt) and
[fight-hand-open](./design-audit-2026-11-12/fight-hand-open.webp) (a card opened from the hand).

**Emotional job (proposed):** cornered, counting what you have left.

| Where | Why it reads as AI | Fix |
|---|---|---|
| CONVICTION chip, "no momentum" pill and the ⓘ circle | Three hairline-bordered rounded chips of three shapes, a dashboard's status row | One quiet line of text for both counts; drop the ⓘ |
| The foe's intent: a red ring around a thin crossed-swords icon | A generic line icon in a circle, the stock "attack" glyph | A painted intent mark (the `combat-intent-oxblood` kit piece is on record) or a word |
| The shield badge with the HP number over the foe's bar | A badge-on-a-progress-bar, the health-bar pattern of every app game | Keep the bar, set the number in the bigNumber role beside it, no badge |
| The empty dice slots (dark cubes with a thin circle) | Placeholder outlines: an empty state drawn as an empty box | Draw only the dice you have |
| The opened card's keyword box ("GUARD … Blocks that much…") | A tooltip: a dark translucent box, hairline border, radius | Set the keyword line as a gloss under the card, on the ground |
| The opened card's two-row table ("NO DIE / +DIE · ANY/WILD") | A two-row data table with hairline rules, a settings list | Two lines of rules text, the die line rubricated |
| Four things compete: the HP shield, the intent ring, the dice and the hand | No bold place; everything is accented | The hand is the bold thing; the rest goes quiet |

**Bold thing:** none. Four elements carry an accent or a glow.

**Top three fixes:**
1. Conviction and momentum become one line of quiet text; the chips, pill and ⓘ go. Layout.
2. The opened card loses its tooltip box and table: the keyword and the die lines set as plain rules text under the card. Layout.
3. The intent ring and the HP shield lose their accent and glow, so the hand is the one bold place. Look-only.

### Spoils

Shots: [victory-plain](../../axiomancer-mobile/screenshots/baseline/victory-plain.png) and
[victory-levelled](../../axiomancer-mobile/screenshots/baseline/victory-levelled.png).

**Emotional job (proposed):** spared, and picking over the dead.

| Where | Why it reads as AI | Fix |
|---|---|---|
| The XP bar in a gold 1 px box | A progress bar in an outlined card, the stock "level progress" widget | The bar alone, on the ground, as an inked rule |
| The three reward cards in hairline-bordered tiles with "COMMON" under each | A grid of identical cards in identical frames, the store-page pattern | The cards with no frames, the rarity left to the card |
| "Shillings +15 · XP +40" in the accent | A gold stats line, the receipt pattern | The gains in the count role, ink, not accent |
| The breadcrumb bar ("BREAKWATER … Shillings 41") | An app header with a place left and a balance right | Drop the header on this screen |
| The title "Victory — the enemy falls" | Fine as type, but it says what the screen shows | Flagged as copy below |

**Bold thing:** the title.

**Top three fixes:**
1. Drop the frames around the reward cards and the box around the XP bar. Look-only.
2. Drop the header bar; the purse shows only where it changes. Layout.
3. The gains line goes to the ink colour; the accent stays on the title. Look-only.

### Self

Shot: [self](./design-audit-2026-11-12/self.webp).

**Emotional job (proposed):** measured, seen as you are.

| Where | Why it reads as AI | Fix |
|---|---|---|
| HEART, BODY and MIND in three identical brass frames | A row of identical stat cards, the dashboard KPI tiles | One line of the three, or the three under the portrait without frames |
| The VITAE row in a hairline box with a radius | A coded box under a kit banner | The bar on the ground, under the banner |
| "NONE AT HAND." and the small-capitals labels | Whole sentences in the eyebrow face read as tracked capitals | Sentences in the rules or narration role; small capitals for labels only |
| "✠ POOLS", "✠ AFFLICTIONS & BLESSINGS" | The same glyph over every heading | Keep the glyph on one heading, or none |
| The bottom half empty | A stack that stops; the page is a list, not a page | Let the portrait take the room, or set the record below it |

**Bold thing:** the portrait in its Gothic frame.

**Top three fixes:**
1. The three stat tiles become one line under the name. Layout.
2. Empty-state sentences move from the eyebrow role to the narration role. Look-only.
3. The VITAE box loses its border and radius. Look-only.

### Satchel

Shot: [satchel](./design-audit-2026-11-12/satchel.webp).

**Emotional job (proposed):** burdened. A pilgrim's few things, and the weight of them.

| Where | Why it reads as AI | Fix |
|---|---|---|
| The title "INVENTORY" under the eyebrow "SATCHEL · PURSE" | The product word for the screen, in capitals | The tab's own name as the title |
| Five identical brass slot frames, each "- bare -" | A centred stack of identical cards, five times | The worn slots drawn on the figure, or one line per slot with no frame |
| The paperdoll panel: a dark box with a 1 px border | A coded box around the figure | The figure on the ground, as the portraits are drawn |
| The filter tabs (ALL, GEAR, PHIALS, STUFF, SEALED) with counts | A segmented control with badges | Fewer tabs, or section heads in the list itself |
| The item tile: a hairline box, a radius, a ×6 badge | A shop grid tile | The item drawn with its name, the count in the count role |
| The list panel: another hairline box with a radius | A box in a box in a box | One ground for the whole screen |

**Bold thing:** none. The five slot frames are the loudest thing, and they are empty.

**Top three fixes:**
1. Drop the two hairline panels (the paperdoll and the list): one ground. Look-only.
2. The five slot frames become a short list beside the figure, frames only on filled slots. Layout.
3. The title reads as the tab's name, not "INVENTORY". Look-only (the word is T's; see copy).

### Deck

Shot: [deck](./design-audit-2026-11-12/deck.webp).

**Emotional job (proposed):** reading your own scripture.

| Where | Why it reads as AI | Fix |
|---|---|---|
| ATTACKS / SKILLS / SPELLS as three outlined rectangles | A segmented control, one outlined in the accent | Three words on the ground, the chosen one rubricated |
| The card tile with a hairline border and a "×5" | A grid tile with a count badge | The card's own frame, the count in the count role |
| The empty space under one tile | A grid built for many tiles showing one | (Fixture-dependent; a full deck fills it) |

**Bold thing:** the open card's art. It works.

**Top three fixes:**
1. The tabs lose their boxes: three words, the chosen one in the accent. Look-only.
2. The tile loses its hairline border. Look-only.
3. The count moves from a corner badge to a line under the name. Look-only.

### Ledger

Shot: [ledger](./design-audit-2026-11-12/ledger.webp).

**Emotional job (proposed):** judged by the record.

| Where | Why it reads as AI | Fix |
|---|---|---|
| Three identical vellum banners (A CHRONICLE, ERRANDS, REMAINS) | A centred stack of identical section headers | One banner for the book; the sections as drop-capital heads |
| The empty-state lines in the eyebrow face ("THE PAGE IS BARE.") | Sentences in small capitals read as tracked capitals | The entry role (Fondamento), sentence case |
| Mixed cases under REMAINS ("you have not yet fallen." then "NOTHING KEPT.") | Two empty-state styles side by side | One case and one role for every empty line |
| The bottom half empty | A list that stops | Let a fresh book be short: margins, not a stack |

**Bold thing:** none.

**Top three fixes:**
1. Empty lines in the entry role, one case. Look-only.
2. One banner for the book, drop capitals for the three sections. Layout.
3. Wider margins and a narrower measure, like a page. Layout.

### Settings

Shot: [settings](./design-audit-2026-11-12/settings.webp).

**Emotional job (proposed):** out of the world for a moment; quiet.

| Where | Why it reads as AI | Fix |
|---|---|---|
| The five theme cards: hairline boxes, radius, three colour dots each | The theme picker of every app, swatch dots and all | (Palette stays; T, 2026-11-12) the cards lose box and dots, each theme named in its own ink |
| The theme blurbs ("Cursed lands — iron-gall ink, gold leaf and oxblood.") | Product-description copy | Flagged as copy below |
| TEXT SIZE and CARD TEXT in hairline boxes with radii | Settings sections as cards | Section heads on the ground, no boxes |
| The ✕ close in a hairline square | A stock modal close | The brass close piece, or a word |
| The "COLOUR THEME … Ashen Gold ▾" row over the open list | A web select control, its options shown as cards under it | The list alone, the current theme marked in it |

**Bold thing:** none.

**Top three fixes:**
1. The section boxes and theme cards lose their borders and radii. Look-only.
2. The swatch dots go; each theme's name in its own ink colour. Look-only.
3. The select row goes; the list marks the current theme. Layout.

### Main menu

Shot: [main-menu](./design-audit-2026-11-12/main-menu.webp) (`/?menu=1`); the title phase is
[root](../../axiomancer-mobile/screenshots/baseline/root.png). EMBARK is not touched (T, 2026-11-05).

**Emotional job (proposed):** summoned to the threshold.

| Where | Why it reads as AI | Fix |
|---|---|---|
| Three brass bars, each with a right chevron ">" | The chevron is the list-row "go" mark of a phone app | Drop the chevrons |
| "THE CHRONICLE" in tiny small capitals over the buttons | A caption that labels nothing on screen | Drop it, or make it the menu's one heading |

**Bold thing:** the Doré plate and the wordmark. It works.

**Top three fixes:**
1. Drop the chevrons. Look-only.
2. Drop or promote "THE CHRONICLE". Look-only.
3. NEW GAME keeps the bright brass, the other two go dark (already close; LOAD GAME's disabled look reads as a third style). Look-only.

### Dialogue

Shot: [dialogue](../../axiomancer-mobile/screenshots/baseline/dialogue.png).

**Emotional job (proposed):** addressed by a stranger who wants something.

| Where | Why it reads as AI | Fix |
|---|---|---|
| The plate inside a black frame with rounded corners (`ScreenBg`'s 28 pt vignette border, radius 24) | A rounded app card around the whole screen; reads as a phone inside the phone | A vignette that fades the plate's edges, no hard rounded frame |
| The gold underline under "A FIGURE" | An accent hairline rule under a heading | No rule, or the ornate ink divider |
| "◉ WORDS" and "✠ A RECKONING" | A glyph over every heading | One heading, no glyphs |

**Bold thing:** the spoken line on vellum.

**Top three fixes:**
1. The vignette fades instead of framing (this fixes Travel and Labyrinth too). Look-only.
2. Drop the gold rule under the name. Look-only.
3. Drop the two eyebrows over the name and the choices. Layout.

### Travel

Shots: [travel](../../axiomancer-mobile/screenshots/baseline/travel.png) and
[travel-cave](../../axiomancer-mobile/screenshots/baseline/travel-cave.png).

**Emotional job (proposed):** at a fork, about to commit.

| Where | Why it reads as AI | Fix |
|---|---|---|
| The rounded vignette frame around the lower plate | As in Dialogue | As in Dialogue |
| Two plates stacked: the destination art over the screen backdrop | Two pictures fight; the lower one shows through as noise | One plate: the destination |
| MOVE and STAY in identical brass bars | Both buttons styled the same; nothing says which is the step | MOVE in the brass piece, STAY as a word |

**Bold thing:** the destination plate.

**Top three fixes:**
1. Drop the screen backdrop under the destination plate. Layout.
2. STAY as a plain word under MOVE. Look-only.
3. The vignette fix from Dialogue. Look-only.

### Hazard stakes card

Shot: [hazard-puzzle-stakes](../../axiomancer-mobile/screenshots/baseline/hazard-puzzle-stakes.png).

**Emotional job (proposed):** warned.

| Where | Why it reads as AI | Fix |
|---|---|---|
| FACE IT in a 1 px parchment-outlined rectangle | A coded ghost button under a kit card | The vellum button piece, or the word on the card |
| The card floats in the middle of a black screen | A modal on nothing | The place's plate behind it, dimmed |

**Bold thing:** the vellum card. T's three lines (154.5) read well.

**Top three fixes:**
1. FACE IT wears a kit piece or sits on the card. Look-only.
2. The place's plate behind the card. Look-only.
3. None needed past these two.

### Hazard board (rank 1)

Shots: [hazard-puzzle-node](../../axiomancer-mobile/screenshots/baseline/hazard-puzzle-node.png) and
[hazard-board](../../axiomancer-mobile/screenshots/baseline/hazard-board.png).

**Emotional job (proposed):** pressed by the clock, choosing what to spend.

| Where | Why it reads as AI | Fix |
|---|---|---|
| FORCE and ESCAPE meters as rows of hairline boxes | A form field grid, one empty box per point | One inked rule per meter, filled as it grows |
| The dashed "PLAY AREA — 0 STAGED" box with "drag cards up from your hand" | An upload drop-zone, dashed border and help text | No box; the cards rise onto the ground |
| "RISK ROUTE" in a green filled chip | A status badge in a colour the game uses nowhere else | The route in the rules face, no chip |
| "MANA DICE — DRAG ONTO A MATCHING CARD", "BOTH REQUIRED", "2 READY", "DECK 2 · DISCARD 0", "FOR 18 ESC 10" | Five small-capital labels and counters, a control panel | Keep two: the dice count and the goal |
| The dotted round circles top right | Placeholder outlines for state not yet earned | Draw only what has happened |
| The round CONFIRM / PLAY disc over the hand | A floating action button over content | A brass END-style piece in the dock, off the cards |
| Horizontal hairline rules between every band | Every section ruled off like a settings page | Space instead of rules |
| The hand cards: pale tiles with coloured borders and boxed numbers | Unlike the fight's cards; a second card style in the same game | The fight's card face |

**Bold thing:** none. The title ("The noose tightens") tries, but the meters and labels out-shout it.

**Top three fixes:**
1. The meters become two inked rules; the box grids go. Look-only.
2. The play area loses its dashed box and help text, and four of the five small labels go. Layout.
3. The floating CONFIRM disc moves into a dock piece off the hand. Layout.

### Quest

Shots: [quest](../../axiomancer-mobile/screenshots/baseline/quest.png),
[quest-locked](../../axiomancer-mobile/screenshots/baseline/quest-locked.png) and
[quest-paid](../../axiomancer-mobile/screenshots/baseline/quest-paid.png).

**Emotional job (proposed):** bound by a promise.

| Where | Why it reads as AI | Fix |
|---|---|---|
| The figure in a card with a 1 px gold border and a radius | A coded frame around painted art | The figure on black, unframed, or a kit frame |
| The four beads on a line | A stepper, the checkout-progress pattern | Fine as a game element; keep it, ink not accent |

**Bold thing:** the giver's figure.

**Top three fixes:**
1. The figure loses its gold hairline frame. Look-only.
2. The beads in ink, the current one in the accent. Look-only.
3. The reward line ("+40 XP · Scavenger's Coat") in the rules role, not the accent. Look-only.

### Labyrinth

Shot: [labyrinth](../../axiomancer-mobile/screenshots/baseline/labyrinth.png) (the act select).

**Emotional job (proposed):** tempted to descend.

| Where | Why it reads as AI | Fix |
|---|---|---|
| Three identical brass act rows, each with "DESCEND" | A centred stack of identical cards | Act I lit, II and III dimmer until reached, or a single column of titles |
| The rounded vignette frame | As in Dialogue | As in Dialogue |
| LEAVE in a small brass pill | A third button style | LEAVE as a word |

**Bold thing:** the three act rows, together.

**Top three fixes:**
1. The act rows differ by state, not just by text. Layout.
2. LEAVE as a word. Look-only.
3. The vignette fix from Dialogue. Look-only.

### Cutscene

Shot: [cutscene](../../axiomancer-mobile/screenshots/baseline/cutscene.png).

**Emotional job (proposed):** told a portent.

| Where | Why it reads as AI | Fix |
|---|---|---|
| "1 of 2" under the line | A carousel pager | Drop it, or a row of small leaves |

**Bold thing:** the teller's figure over the plate. It works.

**Top three fixes:**
1. Drop the pager. Look-only.
2. The place name top left in the mapName role, larger. Look-only.
3. None needed past these two.

### Cache

Shots: [cache](../../axiomancer-mobile/screenshots/baseline/cache.png),
[cache-card](../../axiomancer-mobile/screenshots/baseline/cache-card.png) and
[cache-goods](../../axiomancer-mobile/screenshots/baseline/cache-goods.png).

**Emotional job (proposed):** tempted; robbing the dead.

| Where | Why it reads as AI | Fix |
|---|---|---|
| The header bar ("TWO WAYS TO LEAVE IT … 0 shillings") | An app bar with a title and a balance | Drop the bar; the purse only on the outcome |
| The chest in a black square over the plate | A thumbnail pasted on a banner | The chest on the plate, no square |
| Two rows with a hairline rule between, TAKE at the right | A list with row actions | The two action lines as the buttons themselves |
| The lower half empty | A page that stops | The plate takes the room |

**Bold thing:** the chest.

**Top three fixes:**
1. The chest sits on the plate, no black square. Look-only.
2. Each action line becomes its own button; the TAKE buttons go. Layout.
3. Drop the header bar. Layout.

### Rest

Shots: [rest](./design-audit-2026-11-12/rest.webp) (fixture `apprentice-bw-rest`) and
[rest-upgrade](../../axiomancer-mobile/screenshots/baseline/rest-upgrade.png).

**Emotional job (proposed):** a breath by the fire, alone.

| Where | Why it reads as AI | Fix |
|---|---|---|
| REST and UPGRADE A CARD as two gold-outlined boxes | Coded outline cards in the accent | The vellum or brass piece, or words on black |
| The descriptions in the eyebrow face ("SLEEP WHERE YOU STAND. FREE. RESTORES 43 VITAE.") | Whole sentences in small capitals read as tracked capitals | The rules role, sentence case |
| "FREE" chips at the right of each choice | A pricing badge | Drop it; the line already says it |
| The PURSE / VITAE strip in a hairline box | A stat strip in a box | The strip on the ground |

**Bold thing:** the campfire. It works.

**Top three fixes:**
1. The descriptions move to the rules role. Look-only.
2. The two choices lose their gold outline boxes. Look-only.
3. Drop the FREE chips. Look-only.

### Saves (new game)

Shot: [saves](./design-audit-2026-11-12/saves.webp).

**Emotional job (proposed):** choosing which page to stain.

| Where | Why it reads as AI | Fix |
|---|---|---|
| Three identical vellum rows | A stack of identical cards, though in kit | Fine for three slots; the empty ones could be fainter |
| The ✕ in a hairline square | A stock modal close | As in Settings |

**Bold thing:** the three vellum pages.

**Top three fixes:**
1. The ✕ wears a kit piece or becomes a word. Look-only.
2. Empty slots fainter than written ones. Look-only.
3. The page numerals as drop capitals, without their boxes. Look-only.

### Character select

Shot: [character-select](./design-audit-2026-11-12/character-select.webp).

**Emotional job (proposed):** choosing whom to send.

| Where | Why it reads as AI | Fix |
|---|---|---|
| The roster grid: eight hairline squares, seven with "?" | An empty grid of placeholder tiles | Show only who is unlocked, and a line for the rest |
| HEART / BODY / MIND as three identical vellum tiles | A row of KPI tiles | One line |
| The ✕ in a hairline square | As in Saves | As in Saves |

**Bold thing:** the portrait in its frame.

**Top three fixes:**
1. The locked "?" tiles go; one line says more wait. Layout.
2. The three stat tiles become one line. Layout.
3. The ✕ as in Saves. Look-only.

### Death return

Shot: [death-return](../../axiomancer-mobile/screenshots/baseline/death-return.png).

**Emotional job (proposed):** spared, barely.

| Where | Why it reads as AI | Fix |
|---|---|---|
| The VITAE bar in a boxed track with a label under it | A health widget | The bar as a thin red rule, no box |

**Bold thing:** the portrait.

**Top three fixes:**
1. The bar loses its box. Look-only.
2. The two body lines in the narration role, the second smaller. Look-only.
3. None needed past these two.

### Game over

Shot: [game-over](../../axiomancer-mobile/screenshots/baseline/game-over.png).

**Emotional job (proposed):** ended; the road forgets you.

| Where | Why it reads as AI | Fix |
|---|---|---|
| A title, a paragraph and a button centred on flat black | The empty-state page of an app | The fallen portrait, or the last place's plate, faint behind |

**Bold thing:** none.

**Top three fixes:**
1. Something of the run behind the words: the portrait or the plate. Layout.
2. The title in the title role, larger. Look-only.
3. None needed past these two.

## Copy flagged by screen

Flagged, not rewritten: the words are T's (D88). `[content]` placeholders are T's pending lines and are not
flagged. Source files are under `axiomancer-mobile/` unless named.

| Screen | Line | Why it reads as generated | Source |
|---|---|---|---|
| Wilds | "walk the roads from where you stand - choose a glowing node, or tap a trodden one to walk back." | A UI instruction ("node", "tap") in the game's voice | `state/presenters/exploration.engine.ts` |
| Wilds | "drag · scroll to zoom" | A control legend | `state/presenters/exploration.engine.ts` |
| Fight, board | "no momentum" | A status readout | `components/combat/encounter/CombatBoard.tsx` |
| Fight, card open | "NO DIE" / "+DIE · ANY/WILD" | Table headers, not words | the card detail |
| Spoils | "Victory — the enemy falls" | Says what the screen already shows | `components/combat/encounter/VictoryScreen.tsx` |
| Spoils | "Add a card to your deck", "TAKE NOTHING", "TAKE CARD" | Product instruction and button verbs | `state/presenters/combat-reward.copy.ts` |
| Spoils | "30 XP to level 2" | A progress readout | the level panel |
| Self | "XP TO LVL 16" | An abbreviation from a stats screen | `state/presenters/character.engine.ts` |
| Self | "NONE AT HAND." | An empty-state message | `state/presenters/character.engine.ts` |
| Satchel | "INVENTORY" (the title) | The product word for the screen | `app/(tabs)/inventory/index.tsx` |
| Satchel | "CHOOSE A SLOT TO SEE WHAT ELSE FITS" | A UI instruction | `state/presenters/inventory.engine.ts` |
| Satchel | "STUFF" (a filter tab) | A placeholder-grade category name | the satchel filters |
| Ledger | "THE PAGE IS BARE.", "NO ERRANDS WRITTEN HERE.", "NOTHING KEPT." | Empty-state messages, in three voices | `state/presenters/memoir.engine.ts` |
| Settings | "kept on this device; a new game never resets them" | A product settings line | `state/presenters/settings.engine.ts` |
| Settings | "grows every line of type; the chrome holds" | Developer language ("chrome") | `state/presenters/settings.engine.ts` |
| Settings | "keywords on a card face as words or as glyphs; the open card shows both" | A feature description | `state/presenters/settings.engine.ts` |
| Settings | "Cursed lands — iron-gall ink, gold leaf and oxblood." and the other four theme blurbs | Product-description copy for a colour theme | `theme/palette.ts` |
| Main menu | "THE CHRONICLE" | A caption that labels nothing | the main menu |
| Hazard board | "drag cards up from your hand", "drop dice to power cards — CONFIRM resolves the round" | Tutorial text left on the board | `components/hazard/puzzle/HazardPuzzleNodeBoard.tsx`, `state/presenters/hazard-puzzle.copy.ts` |
| Hazard board | "MANA DICE — DRAG ONTO A MATCHING CARD", "BOTH REQUIRED", "2 READY", "PLAY AREA — 0 STAGED" | Control-panel labels | `components/hazard/HazardBoard.tsx` |
| Hazard board | "Your stats unlock nothing here." | A system message | `state/presenters/hazard-puzzle.copy.ts` |
| Hazard board | "2 CARDS IN RESERVE" | A counter as a sentence | `state/presenters/hazard-puzzle.copy.ts` |
| Hazard board | "- break through the ambush - both meters" | A rule restated as a subtitle | `axiomancer-mechanics/src/World/Hazard/hazard.content.ts` |
| Rest | "Sleep where you stand. Free. Restores 43 Vitae." | A price tag ("Free.") inside the line | `state/presenters/rest.copy.ts` |
| Rest | "FREE" chips | A pricing badge | `state/presenters/rest.copy.ts` |
| Cache | "TWO WAYS TO LEAVE IT" | A header that explains the screen | `state/presenters/cache.copy.ts` |
| Cutscene | "1 of 2" | A pager | the cutscene |
| Character select | "Fumbling Squire trying to hold the line" | Reads like a class tagline | `axiomancer-mechanics/src/Character/roster.ts` |

## What this report does not do

- It changes no code. The fixes above are for T to pick; 156.5 mocks three directions for each of the three
  worst screens.
- It proposes no colour: today's palette stays (T, 2026-11-12).
- The emotional jobs are proposals (spec 156, open question 4).
