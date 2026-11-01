# Save slots, the main menu, and settings

> Owner call 2026-09-23. The first screen after the title is a menu —
> CONTINUE · NEW GAME · LOAD GAME · SETTINGS — over **three save slots**,
> and a new game starts from **the very start**: no items, no coin, no XP.

## The launch flow

```
/  (app/index.tsx)
├─ TITLE   <TitleScreen>  EMBARK ──▶ MENU
├─ MENU    <MainMenu>     CONTINUE ──▶ the run (most recent slot, in place)
│                         NEW GAME ──▶ /saves?mode=new
│                         LOAD GAME ─▶ /saves?mode=load
│                         SETTINGS ──▶ /settings
└─ (fixture boot: straight to the run — no title, no menu)
```

`?menu=1` skips the title: SETTINGS → SAVE & RETURN TO TITLE lands there.
The native stack opens on `index` (`initialRouteName`), so a phone launch
and a web `/` behave the same. The former dev-only auto-seed
(`DevAutoSeed`, and EMBARK's `debugSeed()`) is gone: a new game starts
with nothing in every build; the `/dev` route still seeds on demand.

## Three slots

| Piece | Where |
|---|---|
| Vocabulary — ids, keys, `SaveSlotSummary`, `mostRecentSlot`, the `SaveSlotStore` interface | `state/persistence/saveSlots.ts` |
| Storage — `createAsyncStorageAdapter()` implements `PersistenceAdapter` **and** `SaveSlotStore` | `state/persistence/asyncStorageAdapter.ts` |
| In-memory twin for tests and fixture boots | `state/persistence/memorySlotStore.ts` |
| Verbs — new / load / continue / return, and the store hydration they share | `state/menu/store-actions.ts` |
| Context + hooks | `state/SaveSlotsProvider.tsx` |
| Presenter + copy | `state/presenters/main-menu.engine.ts` |
| Screens | `app/index.tsx`, `app/saves/index.tsx`; `components/menu/*` |

**Keys.** Each slot is `@axiomancer/save:v2:slot-{1,2,3}`, a
`StoredEnvelope` stamped with `savedAt`. `@axiomancer/save:v2:last-slot`
remembers which slot the store last ran from. The retired single-slot key
`@axiomancer/save:v1` is **deleted on preload and never read** (owner call:
discard the legacy save rather than migrate it).

**Boot.** `preload()` reads every slot and the remembered last slot, so a
cold launch (a browser refresh on `/exploration`, a phone relaunch) boots
the store straight into that slot's state — exactly as the single slot
always did. CONTINUE on the menu then simply confirms it.

**Scope.** `load()` returns the ACTIVE slot's state; `save()` writes the
ACTIVE slot only. With no active slot a save is **dropped and logged**
(`persistence/save-no-slot`): nothing is ever written into a slot the
player did not pick. Selecting a slot flushes any write pending for the
old one first.

**Unreadable slots.** Bytes that fail to parse or migrate read as
`unreadable`. They are never loaded, never thrown over; the LOAD screen
shows the row torn and offers DELETE SAVE. `preload()` rejects only when
storage itself fails (the root `CorruptSaveModal` still handles that).

**Hydration.** The store is created once at boot. Switching runs means
`hydrateStoreWithGameState(store, state)`: write the engine fields into
the live store, reset every mobile-only slice (event, rewards, hazard,
rest, cache, blacksmith, labyrinth, notifications, the event buffer), and
restore the engine RNG from `rngState` — so every screen and gate keeps
the store reference it holds and a loaded run replays deterministically.

**NEW GAME** saves at once, so CONTINUE finds the slot even if the app is
killed on the first screen. On the LOAD GAME screen an occupied row reads
JOURNEY ON…; DELETE SAVE sits beside it on any non-empty row. Overwriting an
occupied slot and deleting any slot go through a confirmation sheet.

## Settings

| Piece | Where |
|---|---|
| Store — `settingsStore`, `useSettings()`, `useSetting(key)`, `SettingsProvider` | `state/settings.ts` |
| Presenter + copy + option lists | `state/presenters/settings.engine.ts` |
| Body (one component, two hosts) | `components/settings/SettingsBody.tsx` |
| Hosts | the `/settings` route (`app/settings/index.tsx`, from the main menu, with a close control) and the SETTINGS tab (`app/(tabs)/settings/index.tsx`, the sixth tab, no close control; URL `/settings-tab`) |
| Feedback form | `components/menu/FeedbackSheet.tsx` — BUG or PROPOSAL, up to 1000 characters; SUBMIT sends and saves nothing yet |

Persisted under `@axiomancer/settings:v1`, hydrated at boot beside the
save preload. A UX preference, not gameplay state: a new game, a slot
change and a corrupt save leave it alone.

| Row | Value | Seam it drives |
|---|---|---|
| COLOUR THEME | the five palettes | `theme/runtime.tsx` (its own live store; the picker moved here from the SELF tab) |
| TEXT SIZE | 0.9 · 1 · 1.15 · 1.3 | `makeStyles` scales every `fontSize` / `lineHeight` (`scaleTextStyles`); chrome metrics hold |
| REDUCED MOTION | system · on · off | `hooks/useReducedMotion.ts` — the OS switch, overridable |
| HAPTICS | on · off | `lib/platform/haptics.ts` — `hapticsAllowed()` reads the store synchronously |
| MUSIC (switch) | on · off | `musicOn` (default on, an old save reads as on); off pauses the theme through `decideMusic`, the volume below is kept; RESET SETTINGS turns it on |
| MUSIC VOLUME | 0–100 | `components/BackgroundMusic.tsx` — T's theme loops under the whole game, paused for the whole fight (staged through its summary, until the player leaves the fight screen) and while a hazard is live, then resumed from where it stopped (`state/presenters/music.engine.ts`, which also holds the track table) |
| SOUND EFFECTS | 0–100 | persisted only — **no sound effects play yet**; the screen says so |
| STORY MODE | — | listed as COMING SOON, disabled; nothing persisted |
| SAVE & RETURN TO TITLE *(in a run)* | — | `returnToTitleAction` (save + flush) then `/?menu=1` |
| RESET SETTINGS | — | confirmation, then `settingsStore.reset()` |

## Tests

See `docs/E2E_INVENTORY.md` rows for `state/persistence/e2e/*`,
`state/e2e/menu-store-actions.engine.test.ts`, `state/e2e/app-routes.engine.test.tsx`,
`state/e2e/saves.screen.test.tsx`, `state/e2e/settings.*.test.ts(x)` and
`components/__tests__/MainMenu.test.tsx`. The engine side of the empty
start is pinned in `axiomancer-mechanics/src/Game/e2e/fresh-start.engine.test.ts`.
