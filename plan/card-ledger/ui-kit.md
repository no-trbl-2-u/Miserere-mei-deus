# UI kit ballot (2026-11-05)

T's experience kit, judged place by place after the Brass Gothic PR (#1398) was closed: for each place, keep Normal, Brass Gothic or Vellum & Ink.

Ballot: `ui-kit.ballot.html` (id `ui-kit-2026-11-05`). Crops: `ui-kit/<slot><a|b|c>.jpg` (a Normal from main, b Brass from branch `experience-brass-full`, c the same branch with vellum pieces swapped in).

Standing call: the title screen's EMBARK stays as it is on main (T, 2026-11-05).

## Places

| Slot | Screen | Place |
|---|---|---|
| M-01 | Main menu | Main menu buttons |
| W-01 | Wilds | Status card (place, level, VITAE) |
| W-02 | Wilds | Node panel |
| W-03 | Wilds | BACK / TRAVEL HERE buttons |
| W-04 | Wilds | Quest tracker |
| W-05 | Wilds | Map node marks |
| W-06 | Tabs | Bottom tab bar |
| S-01 | Strife | ENTER COMBAT / WITHDRAW |
| S-02 | Strife | Enemy name rail and VITAE bar |
| S-03 | Strife | Enemy intent badge |
| S-04 | Strife | Conviction chip |
| S-05 | Strife | Momentum chip |
| S-06 | Strife | Player dock (whole) |
| S-07 | Strife | END button |
| S-08 | Strife | Player portrait ring |
| S-09 | Strife | Player VITAE bar and phase marks |
| P-01 | Spoils | Fight summary panel |
| P-02 | Spoils | CONTINUE button |
| P-03 | Spoils | Card offer panel |
| P-04 | Spoils | TAKE NOTHING / TAKE CARD buttons |
| F-01 | Self | Portrait frame |
| F-02 | Self | Level badge |
| F-03 | Self | HEART / BODY / MIND tiles |
| F-04 | Self | HAZARD DECK link |
| F-05 | Self | Section headings and divider |
| F-06 | Self | VITAE pool bar |
| L-01 | The Ledger | Section headings and dividers |
| B-01 | Satchel | Purse |
| B-02 | Satchel | Burden bar |
| B-03 | Satchel | Worn-gear panel and corners |
| B-04 | Satchel | Gear slot rows |
| B-05 | Satchel | ALL / GEAR / PHIALS tabs |
| B-06 | Satchel | Item cards |
| D-01 | Deck | CARDS / DISTINCT / RARE tallies |
| D-02 | Deck | Rarity and colour chips |
| D-03 | Deck | Card-type heading and divider |
| D-04 | Deck | Card rows |
| O-01 | Settings | Section headings |
| O-02 | Settings | Colour theme list |
| O-03 | Settings | Segmented choices |
| O-04 | Settings | Radio choices |
| O-05 | Settings | On / off toggles |
| O-06 | Settings | Volume steppers |
| O-07 | Settings | Menu row buttons |

## Verdicts

Decided 2026-11-06 by T, in the kit mixer (`ui-kit-mixer.html`, a live mock where each place switches look), pasted into the session with "Copy picks". T's picks and notes, verbatim:

Open T's exact mix: https://miserere-mei-deus.pages.dev/ui-kit-mixer#s=wilds&p=bccccacbabbabaabccccbbbabbcaaabcaaaaababbbbb

```
ui-kit mixer picks (2026-11-06)
-- Main menu --
M-01 Main menu buttons: BRASS GOTHIC | Remove any text below each option so we can make space. They should each only say "New Game" /  "Load Game" /  "Settings"
-- Wilds & tabs --
W-01 Status card (place, level, VITAE): VELLUM & INK | Let's tighten everything up so it all fits inside the oval. Furthermore, when we make this change, let's try it with and without a black background behind the whole top part so minimize the chaotic lines
W-02 Node panel: VELLUM & INK | Let's adjust the UX experience to where, when a user clicks a node and this pops up,  the "quests" section disappears.
W-03 BACK / TRAVEL HERE buttons: VELLUM & INK
W-04 Quest tracker: VELLUM & INK | We can remove the "QUESTS" text at the top. And if the quest ends up being tracked as "0/1", then just don't have it there.
W-05 Map node marks: NORMAL
W-06 Bottom tab bar: VELLUM & INK | Let's not have the Gold wrapper around the current selection. The red text is enough. Furthermore, remove the text from underneath each option and make the icons bigger.
-- Strife --
S-01 ENTER COMBAT / WITHDRAW: BRASS GOTHIC | I do love the screen looking like this, so when we do the UI treatment work, refer to this screen. Also, remove "A FOE RISES"
S-02 Enemy name rail and VITAE bar: NORMAL
S-03 Enemy intent badge: BRASS GOTHIC | For this screen, while yes, we're swapping out these images, make sure the layout is maintained. (ie. keep intent in the upper right and momentum in the bottom-middle center)
S-04 Conviction chip: BRASS GOTHIC
S-05 Momentum chip: NORMAL
S-06 Player dock (whole): BRASS GOTHIC
S-07 END button: NORMAL
S-08 Player portrait ring: NORMAL
S-09 Player VITAE bar and phase marks: BRASS GOTHIC | We can remove the little circles underneath the VITAE to make room and make the END button smaller and this image at the bottom taller.
-- Spoils --
P-01 Fight summary panel: VELLUM & INK | We'll need to adjust the font to be easier to read (and change the yellow font to be readable)
P-02 CONTINUE button: VELLUM & INK
P-03 Card offer panel: VELLUM & INK
P-04 TAKE NOTHING / TAKE CARD buttons: VELLUM & INK
-- Self --
F-01 Portrait frame: BRASS GOTHIC
F-02 Level badge: BRASS GOTHIC
F-03 HEART / BODY / MIND tiles: BRASS GOTHIC
F-04 HAZARD DECK link: NORMAL | We can actually remove this entirely since it's no longer relevant as the hazard puzzle has changed
F-05 Section headings and divider: BRASS GOTHIC
F-06 VITAE pool bar: BRASS GOTHIC
-- The Ledger --
L-01 Section headings and dividers: VELLUM & INK
-- Satchel --
B-01 Purse: NORMAL
B-02 Burden bar: NORMAL | This shouldn't exist. Mark this as "remove" and make sure we have no "burden" or weight. The player can hold anything and everything
B-03 Worn-gear panel and corners: NORMAL
B-04 Gear slot rows: BRASS GOTHIC
B-05 ALL / GEAR / PHIALS tabs: VELLUM & INK
B-06 Item cards: NORMAL
-- Deck --
D-01 CARDS / DISTINCT / RARE tallies: NORMAL | This whole screen needs an adjusted UX treatment. When we discuss plotting all these changes, suggest that we plot a UX treatment for "Deck" to provoke a feeling of minimalist order while still providing images.
D-02 Rarity and colour chips: NORMAL
D-03 Card-type heading and divider: NORMAL
D-04 Card rows: NORMAL
-- Settings --
O-01 Section headings: BRASS GOTHIC
O-02 Colour theme list: NORMAL | Make sure this still shows what the theme changes the colors to (as it is today)
O-03 Segmented choices: BRASS GOTHIC
O-04 Radio choices: BRASS GOTHIC
O-05 On / off toggles: BRASS GOTHIC
O-06 Volume steppers: BRASS GOTHIC
O-07 Menu row buttons: BRASS GOTHIC
```

Tally: Brass Gothic 19, Vellum & Ink 12, Normal 13. B-02 is marked **remove** (T: "Mark this as 'remove'").

T, same message: "Plot this, open the PR, then we'll plot the other things I mentioned." The looks are plotted as spec 152 (UK1); the layout and feature changes in the notes (shorter labels, the quest tracker hiding, the tab bar's labels, the hazard deck link, no burden, the Deck treatment) are the follow-up plot, spec 153.

## Round 2 verdicts

Decided 2026-11-06 by T in the second kit mixer (`ui-kit-mixer-2.html`: the node screens, new game and the endings), pasted with "Copy picks + notes". Plotted as spec 154 (UK2). Verbatim:

```
ui-kit mixer round 2 picks (2026-11-06)
-- Village --
V-01 Header (kicker, title, flavour, purse line): NORMAL | Okay, so the Village actually needs a full adjustment. The player, when entering the village, will have options: 'Rest', 'Card Shop', 'Blacksmith', any other options Village offers, the 'Exit'. Then, each of those options show a different screen with an NPC/Image for each, then what they offer. Each screen inside of these will need to be plotted on their own with pitches for the design and NPC image. So until we know what all these screens look like, let's not swap anything out.
V-02 Section labels (A BED FOR THE NIGHT, THE CARD SHOP...): NORMAL
V-03 Offer panels (Rest, Remove a card): NORMAL
V-04 BUY buttons under the shop cards: NORMAL
V-05 TAKE THE ROAD button: NORMAL
V-06 Speaker row (Voices of the place): NORMAL
-- Dialogue --
E-01 Title and its underline: NORMAL
E-02 Spoken-line box: VELLUM & INK
E-03 Choice rows: BRASS GOTHIC | Inside "Take the quest", it should not have the errand text inside the button. The "placeholder line" will have all the information the player will need.
E-04 Tip-your-cap secondary button: NORMAL | What does this offer? There should only be two options. Remove this.
-- Cutscene --
C-01 Omen panel: NORMAL | This shouldn't even have a border. Just raw text on the background
C-02 SKIP button: NORMAL
-- Travel --
T-01 THE WAY ON tag: NORMAL | Add to deadlines that I need to find an image for the chapter 1 to chapter 2 traveling and an image for the chapter 1 cave shortcut travelling.
T-02 YES · MOVE / NO · STAY buttons: VELLUM & INK
-- Hazard --
H-01 Stakes card (goal, costs, pay): VELLUM & INK | Again, we'll need to figure out text here. 1) We should break down only what we need. (<Name of place>) (Goal: Force: 18 | Escape 10) (Time: 60 secs) No other information outside of that. Also, make sure the text is legible and not so thin and hard to read.
H-02 FACE IT button: NORMAL
-- Labyrinth --
X-01 Act rows: BRASS GOTHIC
X-02 LEAVE button: BRASS GOTHIC
-- Rest --
R-01 Purse and VITAE strip: NORMAL | Show the hp bar here. I want to move everything but the options up, put an animated campfire in the middle. When we plot this, pause and ask me to point to where we have an animated fire for this screen. Also, let's make the background black
R-02 Rest / Upgrade choice panels: NORMAL | Remove the "The node is spent the moment you stop here..." text. Also remove "A moment to stop".
-- Cache --
A-01 Take a card / Take the goods panels: NORMAL | Remove "The node is spent the moment you...." text. Remove the image of the Card. Remove "A find unclaimed", So leave title, flavor text underneath and then only provide the two options. BUT do not show what the reward is. Either Take a Card or Take the Goods. Only flavor text for both and that flavor text should be what you're doing on the adventure to earn it. (ie. (Take the Card) "Read the runes inside the cave" --- (Take the Goods) "Plunder the corpses left by the previous patrons" ) And then that'll be the pattern for all caches.
A-02 Reward chips (+ HEALING POTION, +6 SHILLINGS): NORMAL
-- Quest --
Q-01 Quest panel (next work, pay): VELLUM & INK | Don't show any rewards. Furthermore, for all quests that are "0/1" just don't track the number for it. It'll always just be one.
Q-02 ACCEPT / LEAVE buttons: NORMAL
-- New game --
N-01 Save slot rows: VELLUM & INK
N-02 BEGIN buttons: VELLUM & INK
N-03 Close (x) buttons: NORMAL
N-04 Portrait and relic cards (character select): BRASS GOTHIC
N-05 HEART / BODY / MIND tiles: VELLUM & INK
N-06 CONFIRM button: VELLUM & INK
N-07 Roster grid tiles: NORMAL
-- Endings --
G-01 CONTINUE / NEW CHARACTER button (death and game over): VELLUM & INK
G-02 Aftermath ledger rows: VELLUM & INK
G-03 BEGIN AGAIN band: VELLUM & INK | I don't even know when this page shows o.o!
```

T, same message: "For the ones that say to stop, do those last. Good luck". The aftermath panel (G-02, G-03) is shown by no game flow, only by the dev page `/devaftermath` (spec 154, call 2).
