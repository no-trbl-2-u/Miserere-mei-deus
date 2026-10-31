/* ───────── C4 L1 ───────── */
D['d-context']=diagram('d-context',{w:1000,h:610,label:'C4 system context',intro:'sys',nodes:[
 {id:'doc',kind:'ext',x:30,y:30,w:220,h:84,title:'SomberSoft-Memory',desc:'Company law and decision records',path:'no-trbl-2-u/SomberSoft-Memory',info:'Company-wide doctrine (command ledger, CDRs). Governs policy, never executable rules: mechanics source and tests stay the authority.'},
 {id:'t',kind:'person',x:395,y:24,w:210,h:96,title:'T',desc:'Designer, owner, daily player',info:'Plays local builds that track main and EAS preview APKs. Brings work in through <code>/plot</code> (one known task) or <code>/messy</code> (a loose dump), merges <code>plot</code> PRs by hand, and owns every repository setting. Every deadline Item is a T act.'},
 {id:'r2',kind:'ext',x:750,y:30,w:220,h:84,title:'R2 artifact vault',desc:'Private bucket for verified evidence',path:'sombersoft-artifacts',info:'Playtest evidence, screenshots and build artifacts keyed <code>project/kind/YYYY-MM-DD/run/filename</code>. Free tier only; never a runtime dependency.'},
 {id:'gh',kind:'ext',x:30,y:255,w:240,h:110,title:'GitHub + Actions',desc:'Claude Code action runs the nexus loop; pr-review merges green PRs',path:'.github/workflows/ (36 workflows)',info:'Hosts the repo, runs <code>verify-*</code> CI and the loop ticks (<code>march.yml</code>, <code>night.yml</code>, <code>ship-a-phase.yml</code>…) through <code>_claude-skill.yml</code>. <code>pr-review.yml</code> merges any non-plot PR whose adversarial review is green (D95).'},
 {id:'sys',kind:'system',x:360,y:250,w:280,h:120,title:'Miserere Mei, Deus',tech:'npm-workspaces monorepo',desc:'Deterministic rules engine, Expo app, Worker, and the loop’s plan state',path:'no-trbl-2-u/Miserere-mei-deus',info:'A turn-based, single-player dark fantasy deckbuilder for mobile, where what you owe, and to whom, is a mechanical input. Internally still named <code>axiomancer-*</code>.'},
 {id:'eas',kind:'ext',x:730,y:255,w:240,h:110,title:'Expo EAS',desc:'Manual preview APKs and the iOS TestFlight beta',path:'axiomancer-mobile/eas.json · preview-build.yml',info:'The only way the app ships: manual builds after the mobile verify gate. The app never auto-deploys.'},
 {id:'readers',kind:'person',x:20,y:480,w:190,h:96,title:'Public readers',desc:'Visit the DevLog and catalog',info:'Read <code>axiomancer-devlog.pages.dev</code>: posts, before/after evidence and the full card catalog. T made it public on 2026-09-20.'},
 {id:'cf',kind:'ext',x:280,y:480,w:210,h:100,title:'Cloudflare',desc:'miserere-api Worker + D1; Pages for the DevLog and ballots',path:'backend/wrangler.toml',info:'Worker routes: <code>/v1/puzzle-attempts</code>, <code>/v1/fights</code>, <code>/v1/deck-events</code>, <code>/v1/reports/</code>, <code>/v1/ballot-verdicts</code>. Pages: <code>axiomancer-devlog</code> and <code>axiomancer-ballots</code>.'},
 {id:'kb',kind:'ext',x:525,y:480,w:200,h:100,title:'kb-query MCP',desc:'Board-game and Dawncaster prior art',path:'kb-mcp.no-trbl-2-u.workers.dev',info:'The only route to the external corpus (1,692 Dawncaster cards, 141 keywords). If it is down, prior-art claims are marked UNGROUNDED; there is no local copy.'},
 {id:'vault',kind:'ext',x:770,y:480,w:200,h:100,title:'Obsidian vault',desc:'T’s goal, thread map and inbox',path:'vault/ (separate private repo)',info:'Brainstorm-and-plot notes, synced by Obsidian Sync. Not rules authority and not a loop queue. Run with <code>/vault</code>.'}
],edges:[
 {a:'t',b:'sys',label:'plays · /plot · merges plot PRs',k:'blood'},
 {a:'gh',b:'sys',label:'loop:pr PRs'},
 {a:'sys',b:'eas',label:'manual builds'},
 {a:'eas',b:'t',label:'APK / TestFlight',bend:-40},
 {a:'doc',b:'sys',label:'company law',bend:20},
 {a:'sys',b:'r2',label:'verified artifacts',bend:-20},
 {a:'sys',b:'cf',label:'play log · verdicts · site',lx:-10},
 {a:'kb',b:'sys',label:'cited prior art',lx:20},
 {a:'sys',b:'vault',label:'/vault sessions',bend:-10},
 {a:'cf',b:'readers',label:'DevLog'}
]},'i-context');

/* ───────── C4 L2 ───────── */
D['d-containers']=diagram('d-containers',{w:1040,h:800,label:'C4 containers',intro:'mech',groups:[{x:16,y:16,w:1008,h:770,label:'Miserere-mei-deus monorepo'}],nodes:[
 {id:'mobile',x:40,y:50,w:250,h:116,title:'axiomancer-mobile',tech:'Expo · React Native · expo-router',desc:'Screens, presenters, saves, theming',path:'axiomancer-mobile/',info:'36 route files under <code>app/</code>: a tabbed home (character, exploration, inventory, memoir, deck) plus per-encounter routes (combat-encounter, hazard, rest, village, blacksmith, cache, quest, travel, cutscene, death-return…) and dev routes. Owns presentation only: rules never live here.'},
 {id:'ballots',x:760,y:50,w:250,h:100,title:'plan/card-ledger',tech:'static HTML ballots',desc:'T votes on card families from the phone',path:'plan/card-ledger/ballot-kit.js',info:'Served by the <code>axiomancer-ballots</code> Pages site. Autosaves drafts locally; Save posts a <code>draft</code> row, Submit a <code>final</code> row.'},
 {id:'loop',x:40,y:290,w:250,h:116,title:'plan/ + skills/',tech:'Markdown state · loop verbs',desc:'Build plan, phase briefs, CRITIQUE, deadlines, lessons',path:'plan/bearings.md · skills/*.md',info:'The nexus loop’s memory and doctrine. Loop verbs (<code>/march</code>, <code>/ship-a-phase</code>, <code>/iterate</code>…) read and write it; plan-only commits push main, code lands by PR.'},
 {id:'mech',kind:'focus',x:380,y:280,w:270,h:136,title:'axiomancer-mechanics',tech:'TypeScript · deterministic · seeded RNG',desc:'Rules, state transitions, content libraries, sims and a CLI',path:'axiomancer-mechanics/src/',info:'The executable authority on every rule. Pure library + CLI: no databases, servers or containers. 226 source files, about 255 test files. Exposed to the app through the <code>src/index.ts</code> barrel.'},
 {id:'worker',x:760,y:290,w:250,h:116,title:'backend · miserere-api',tech:'Cloudflare Worker · workerd tests',desc:'Play log, puzzle solve times, ballot verdicts',path:'backend/src/',info:'Bearer-token routes. The play log switch is on by default only while T is the only player. Tests run in workerd against a local D1.'},
 {id:'art',x:40,y:540,w:250,h:100,title:'art-department/',tech:'any toolchain · not a workspace',desc:'Art tools and masters; nothing imported, nothing shipped',path:'art-department tree, outside the workspaces',info:'Outside npm workspaces on purpose. The EAS archive excludes it; what ships is what is copied into the app’s assets.'},
 {id:'devlog',x:380,y:530,w:270,h:100,title:'devlog/ + catalog',tech:'static site build',desc:'Nightly posts and the generated card catalog',path:'devlog/data/*.json',info:'<code>npm run catalog:export</code> writes <code>devlog/data/</code> from the engine; <code>npm run site:public</code> builds the Pages site into gitignored <code>dist/</code>.'},
 {id:'d1',kind:'store',x:820,y:530,w:130,h:100,title:'D1 miserere',desc:'numbered migrations',path:'backend/migrations/',info:'Tables for fights, deck events, puzzle attempts and <code>ballot_verdicts</code>.'},
 {id:'axio',x:380,y:680,w:270,h:90,title:'axio-query MCP',tech:'stdio · scripts/axio-mcp-server.mjs',desc:'Cards, effects, keywords for agents',info:'An accelerator over the repo’s own data; the Grep/Read path always works. It reads <code>devlog/data/</code>, so it is only as fresh as the last catalog export (see Alignment).'},
 {id:'ci',x:760,y:680,w:250,h:90,title:'scripts/ + workflows',tech:'Node lints · GitHub Actions',desc:'check-deadlines, check-lessons, plan-queue lints, verify-*',info:'The root <code>npm test</code> runs the plan lints; <code>verify-mechanics.yml</code> mechanizes the cross-package impact checklist.'}
],edges:[
 {a:'mobile',b:'mech',label:'@mechanics alias\n(local source)',k:'gold'},
 {a:'mobile',b:'worker',label:'POST /v1/fights · /v1/deck-events',bend:-30},
 {a:'ballots',b:'worker',label:'POST /v1/ballot-verdicts'},
 {a:'worker',b:'mech',label:'imports contract'},
 {a:'worker',b:'d1',label:'SQL'},
 {a:'loop',b:'mech',label:'loop:pr PRs'},
 {a:'devlog',b:'mech',label:'catalog:export'},
 {a:'axio',b:'devlog',label:'reads devlog/data'}
]},'i-containers');

/* ───────── C4 L3 engine ───────── */
D['d-engine']=diagram('d-engine',{w:1040,h:740,label:'Engine components',intro:'combat',nodes:[
 {id:'app',kind:'ext',x:30,y:24,w:230,h:66,title:'axiomancer-mobile',desc:'via @mechanics',info:'Imports only through the barrel. Mobile renders <code>portraitAsset</code> from Enemy and imports <code>EnemiesByMap</code>.'},
 {id:'barrel',x:405,y:20,w:230,h:74,title:'index.ts',tech:'export barrel',desc:'The public contract',path:'src/index.ts',info:'A rename or removal here breaks the app. Listed in the impact checklist.'},
 {id:'cli',x:780,y:20,w:230,h:74,title:'CLI',tech:'17 files',desc:'combat-sim, lane-pacing, act1-progression, puzzle-report…',path:'src/CLI/',info:'Measurement and debugging entry points: <code>npm run lane-pacing</code>, <code>act1-progression</code>, <code>roster-health</code>, <code>puzzle:report</code>, <code>measured-truth</code>.'},
 {id:'game',kind:'focus',x:380,y:150,w:280,h:100,title:'Game',tech:'29 files',desc:'store, reducer, death, persistence, run loop, migrations',path:'src/Game/',info:'<code>createGameStore</code>, <code>game.reducer.ts</code>, <code>death.ts</code> (<code>resolveDeath</code>), <code>game.migrate.ts</code> and <code>dropUnknownCardIds</code>. Holds <code>GameState</code>.'},
 {id:'world',x:30,y:310,w:290,h:150,title:'World',tech:'84 files',desc:'maps, roads, MapEvents, Hazard, Village, Blacksmith (Anvil), RestChoice, quests and questlines, Labyrinth',path:'src/World/',info:'The largest module. <code>map.registry.ts</code> (7 maps), <code>questline.ts</code> (several quests at once), <code>quest-gates.ts</code>, <code>roster-health.ts</code>, the hazard minigame and its puzzle solver.'},
 {id:'combat',kind:'focus',x:380,y:320,w:280,h:130,title:'Combat',tech:'39 files',desc:'engine, card programs, dice, threat, elements, spikes, rewards, signatures, sims',path:'src/Combat/',info:'<code>combat.engine.ts</code> (initialize, startTurn, playCombatCard, resolveThreatPhase, processBetweenPhases, selectMercyChoice); <code>combat.card-program.ts</code> runs trial-card programs; <code>combat.elements.ts</code> the weather; <code>combat.spikes.ts</code> THORNS/REFLECT.'},
 {id:'char',x:720,y:320,w:290,h:110,title:'Character',tech:'9 files',desc:'stats, experience curve, equipment and die-gear reducers, roster',path:'src/Character/',info:'<code>experience.ts</code> (the XP curve), <code>equipment.reducer.ts</code>, <code>dieGear.reducer.ts</code>, <code>roster.ts</code> for playable characters.'},
 {id:'npc',x:30,y:530,w:130,h:90,title:'NPCs',tech:'3 files',desc:'dialogue trees',small:1,path:'src/NPCs/',info:'Plumbing kept and tested with fixtures; Act 1 has no NPCs.'},
 {id:'enemy',x:190,y:530,w:150,h:90,title:'Enemy',tech:'6 files',desc:'library, befriend, loot',small:1,path:'src/Enemy/',info:'Three foes. <code>befriend.ts</code> holds the hpGate logic for The Open Hand.'},
 {id:'cards',kind:'focus',x:380,y:530,w:170,h:100,title:'Cards',tech:'17 files',desc:'library, lanes, upgrades, programs',small:1,path:'src/Cards/',info:'<code>cards.library.ts</code> (<code>TRIAL_SETS</code>), <code>card.lanes.ts</code>, <code>card-upgrades.ts</code> (the upgrade law), <code>card-program.types.ts</code>.'},
 {id:'effects',x:575,y:530,w:150,h:90,title:'Effects',tech:'5 files',desc:'buffs, debuffs, interactions',small:1,path:'src/Effects/',info:'JSON buff and debuff libraries and the amplification registry.'},
 {id:'items',x:760,y:530,w:250,h:100,title:'Items',tech:'12 files',desc:'relics, relic lanes, consumables, shop, caches',path:'src/Items/',info:'<code>relic.library.ts</code> (10 relics), <code>relic-lanes.ts</code>, <code>consumable.library.ts</code> (three potions).'},
 {id:'utils',x:380,y:670,w:170,h:56,title:'Utils · rng',tech:'seeded',small:1,path:'src/Utils/rng.ts',info:'The seeded RNG every roll and shuffle goes through. <code>GameState.rngState</code> persists it.'},
 {id:'log',x:575,y:670,w:150,h:56,title:'Log',small:1,path:'src/Log/',info:'Structured logger types.'}
],edges:[
 {a:'app',b:'barrel',label:'imports',k:'gold'},
 {a:'barrel',b:'game',k:'gold'},
 {a:'cli',b:'game',label:'drives'},
 {a:'game',b:'world',label:'walks map',k:'gold'},
 {a:'game',b:'combat',label:'runs fights',k:'gold'},
 {a:'game',b:'char',label:'levels, equips'},
 {a:'world',b:'combat',label:'encounter'},
 {a:'combat',b:'cards',label:'programs',k:'gold'},
 {a:'combat',b:'enemy',label:'foe decks',k:'gold'},
 {a:'combat',b:'effects',k:'gold'},
 {a:'world',b:'enemy',label:'EnemiesByMap',k:'gold'},
 {a:'world',b:'npc',label:'dialogue',k:'gold'},
 {a:'char',b:'items',label:'equipment'},
 {a:'items',b:'cards',label:'relic lanes',bend:-110}
]},'i-engine');

D['d-app']=diagram('d-app',{w:1040,h:250,label:'App layers',intro:'presenters',nodes:[
 {id:'routes',x:20,y:70,w:170,h:110,title:'app/ routes',tech:'expo-router',desc:'(tabs) home + encounter routes',path:'axiomancer-mobile/app/',info:'Tabs: character, exploration, inventory, memoir, deck. Encounter routes per node kind; dev routes for puzzles, art, frames.'},
 {id:'gates',x:220,y:70,w:170,h:110,title:'Gates',tech:'components/*Gate.tsx',desc:'Combat, Hazard, Rest, Quest, Event…',info:'Route guards that open the right screen for the current encounter.'},
 {id:'presenters',kind:'focus',x:420,y:70,w:190,h:110,title:'Presenters',tech:'state/presenters',desc:'Format engine state for screens',path:'axiomancer-mobile/state/',info:'Presenter boundary: rules, state and RNG never duplicate here. The board glossary (<code>BOARD_GLOSSARY</code>) lives in <code>state/combat/keywords.ts</code>.'},
 {id:'store',x:640,y:70,w:170,h:110,title:'Mobile store',tech:'state/store.ts',desc:'wraps createGameStore + event slice',info:'Builds on the engine’s <code>createGameStore</code> and adds mobile sessions (hazard, rest, cache, village, labyrinth).'},
 {id:'mechx',kind:'ext',x:850,y:30,w:170,h:80,title:'@mechanics',desc:'engine source',info:'Resolved to <code>../axiomancer-mechanics/src</code> by the alias.'},
 {id:'saves',kind:'store',x:860,y:140,w:150,h:90,title:'Save slots',desc:'SaveSlotsProvider',info:'Persistence of <code>GameState</code>; load drops removed card ids (<code>dropUnknownCardIds</code>).'}
],edges:[
 {a:'routes',b:'gates'},{a:'gates',b:'presenters'},{a:'presenters',b:'store',label:'actions'},{a:'store',b:'mechx',label:'reducer',k:'gold'},{a:'store',b:'saves',label:'persist'}
]},'i-app');

/* ───────── UML class ───────── */
const CLS={
 run:{w:1100,h:760,intro:'GameState',nodes:[
  {id:'GameState',kind:'class',k2:'gold',x:30,y:30,w:270,title:'GameState',path:'src/Game/types.ts',info:'The whole save. <code>rngState</code> keeps the seeded RNG; <code>dying</code> is set after a first death; <code>labyrinth</code> is absent until the Aporia is entered.',attrs:['runId|string','player|Character','world|WorldState','quests|QuestLog','flags|string[]','rngState|number','codex|CodexState','labyrinth?|LabyrinthProgress','dying?|true']},
  {id:'Character',kind:'class',x:400,y:30,w:300,title:'Character',path:'src/Character/types.ts',info:'The player. <code>knownCards</code> is the deck; <code>startingLaneIds</code> always feed the reward pool. VITAE is <code>health</code>/<code>maxHealth</code>.',attrs:['level · experience|number','health / maxHealth|VITAE','baseStats|body · mind · heart','knownCards|cardId[]','startingLaneIds?|laneId[]','equipment|EquipmentLoadout','inventory|Item[]','currency|shillings','dieGear?|per-colour faces','cardRemovals?|number']},
  {id:'Loadout',kind:'class',x:800,y:30,w:270,title:'EquipmentLoadout',path:'src/Character/types.ts',info:'One weapon, one armor, up to three relics (<code>SLOT_CAPACITY.relic</code>). Any relic fits any relic slot.',attrs:['weapon?|Equipment','armor?|Equipment','relic|Equipment[0..3]']},
  {id:'Relic',kind:'class',x:800,y:210,w:270,title:'Equipment «relic»',path:'src/Items/relic.library.ts',info:'Read from the library by id, so a saved copy takes the current stat lines and signature.',attrs:['statModifiers|body/mind/heart/maxHp','signature|SignatureSkillId','lane|laneId (relic-lanes.ts)','source|quest | elite']},
  {id:'Sig',kind:'class',x:800,y:400,w:270,title:'SignatureSkill',path:'src/Combat/combat.signature.ts',info:'Ten signatures, cost ◆3 to ◆6 Conviction. A signature that would do nothing is refused with a reason.',attrs:['id|SignatureSkillId','name|string','cost|◆ Conviction','kind|mercy | sacrifice-heals | …']},
  {id:'World',kind:'class',x:30,y:290,w:270,title:'WorldState',path:'src/World/types.ts',info:'Continents and the current map, plus a cache of per-map states.',attrs:['world|Continent[]','currentContinent|Continent','currentMap|MapState','mapStates?|Record<MapName,MapState>']},
  {id:'MapState',kind:'class',x:30,y:440,w:270,title:'MapState',path:'src/World/types.ts',info:'Runtime map progress. <code>arrivedFrom</code> is where a first death puts you back.',attrs:['currentNode|NodeId','available / locked|NodeId[]','completed / consumed|NodeId[]','arrivedFrom?|NodeId','blockedRoutes|BlockedRoute[]','hazardOutcomes|HazardNodeOutcome[]']},
  {id:'MapDef',kind:'class',x:30,y:640,w:270,title:'MapDefinition',path:'src/World/map.registry.ts',info:'Static, frozen template. Node events come from weighted pools in <code>MapEvents/content.ts</code>, not the definition.',attrs:['name · continent|MapName','nodes|MapNode[]']},
  {id:'Quests',kind:'class',x:400,y:330,w:300,title:'QuestLog',path:'src/World/types.ts',info:'One log; several questlines read their own steps off it (<code>questline.ts</code>, MQ1a).',attrs:['available|Quest[]','active|Quest[]','completed|QuestName[]']},
  {id:'Quest',kind:'class',x:400,y:470,w:300,title:'Quest',path:'src/World/types.ts',info:'A questline step. Gates (<code>gatesPast</code>) shut roads until the step completes; <code>settle: on-arrival</code> completes on entering its node.',attrs:['objectives|QuestObjective[]','reward / rewards|Reward','questline? · step?|id · n','status|available|active|completed|failed']},
  {id:'Obj',kind:'class',x:400,y:640,w:300,title:'QuestObjective',path:'src/World/types.ts',info:'One kill or hazard counts for every active objective that wants it.',attrs:['type|kill|collect|reach|talk|flag|hazard|carry','requiredCount · currentCount|number']}
 ],edges:[
  {a:'GameState',b:'Character',mark:'dia',solid:1,label:'1'},{a:'GameState',b:'World',mark:'dia',solid:1,label:'1'},{a:'GameState',b:'Quests',mark:'dia',solid:1,label:'1',bend:-20},
  {a:'Character',b:'Loadout',mark:'dia',solid:1},{a:'Loadout',b:'Relic',mark:'dia',solid:1,label:'0..3'},{a:'Relic',b:'Sig',label:'grants 1'},
  {a:'World',b:'MapState',mark:'dia',solid:1,label:'current'},{a:'MapState',b:'MapDef',label:'instance of'},{a:'Quests',b:'Quest',mark:'dia',solid:1,label:'*'},{a:'Quest',b:'Obj',mark:'dia',solid:1,label:'1..*'},
  {a:'Character',b:'Quests',label:'',solid:1,mark:'none'}
 ].filter(e=>e.mark!=='none')},
 card:{w:1100,h:800,intro:'Card',nodes:[
  {id:'TrialSet',kind:'class',x:30,y:30,w:260,title:'TrialSet',path:'src/Cards/card.lanes.ts',info:'Joins the library through one <code>TRIAL_SETS</code> line and leaves by deleting that line and its file (D75).',attrs:['id|string','cards|Card[]','lanes|CardLane[]','ruledCostGrowth?|Record']},
  {id:'Lane',kind:'class',x:30,y:200,w:260,title:'CardLane',path:'src/Cards/card.lanes.ts',info:'<code>CARD_LANES</code> = the grey lane + every trial set’s lanes. <code>laneRewardPool</code> and <code>deckLaneIds</code> read them.',attrs:['id|grey|blood-price|elementalist|defender','cardIds|cardId[] (30)','testDeck|cardId[] (20)']},
  {id:'Card',kind:'class',k2:'gold',x:380,y:30,w:320,title:'Card',path:'src/Cards/types.ts',info:'Grey cards carry their lines as data (<code>free</code>, <code>specialMechanics</code>, <code>combatEffects</code>); trial cards carry a <code>program</code>. <code>programAt(scale)</code> serves upgrades.',attrs:['id · name|string','color|body|mind|heart|any','cardType|attack|skill|spell|global|curse','rank|1 Ash … 5 Skull … 6','tier|1|2|3','free? · combatEffects?|grey data','program?|CardProgram','programAt?|(scale) → CardProgram','upgrade?|CardUpgrade']},
  {id:'Program',kind:'class',x:380,y:290,w:320,title:'CardProgram',path:'src/Cards/card-program.types.ts',info:'Two lines, or a Global body. Run by <code>combat.card-program.ts</code> for the live board and the sim alike.',attrs:['free?|ProgramLine','paid?|ProgramLine','global?|ProgramGlobal','onDiscard?|ProgramRider']},
  {id:'Line',kind:'class',x:380,y:450,w:320,title:'ProgramLine',path:'src/Cards/card-program.types.ts',info:'A line whose condition fails or whose SACRIFICE it cannot pay cannot be played, and the game says why (<code>programLineBlock</code>).',attrs:['text|printed, with number tokens','requires?|{test, why}','run|(ctx: ProgramCtx) → void','exile?|PAID only']},
  {id:'Global',kind:'class',x:30,y:420,w:300,title:'ProgramGlobal',path:'src/Cards/card-program.types.ts',info:'FREE: in play for 3 turn starts (<code>GLOBAL_FREE_TURNS</code>). PAID: the rest of combat. Copies stack and expire independently.',attrs:['trigger|turn ⟳ | sac 🩸 | curse 📜','free / paid|(ctx, n) → void','paidDelta?|string','stormGrowth?|number']},
  {id:'Ctx',kind:'class',x:380,y:620,w:320,title:'ProgramCtx',path:'src/Cards/card-program.types.ts',info:'The verbs a program may call: deal, guard, sacrifice, heal, leech, tether, weather, thorns, reflect, retrieve, draw, loseVitae…',attrs:['deal · guard · heal|(n)','sacrifice · waive · tether · leech|(n)','inferno · blizzard · storm|(n)','thorns · reflect · retrieve · draw|(n)']},
  {id:'Combat',kind:'class',k2:'gold',x:790,y:30,w:290,title:'CombatEncounterState',path:'src/Combat/combat.encounter.types.ts',info:'One fight. <code>program</code> exists only when the deck holds a trial card.',attrs:['phase|CombatEncounterPhase','dice|CombatManaDie[]','hand|≤ 5 entries','drawPile · discard|cardId[]','conviction|0..12','guard?|resets each threat phase','reserve?|≤ 2 banked dice','threatPhases|CombatThreatPhase[]','program?|ProgramLedger','enemy · player|deep clones']},
  {id:'Die',kind:'class',x:790,y:340,w:290,title:'CombatManaDie',path:'src/Combat/combat.encounter.types.ts',info:'Four a phase (die-0..die-3) plus temporary ghost dice from Momentum.',attrs:['color|heart|body|mind|wild|x','face|special|mana|miss','state|available|spent|…','temporary · floating?|boolean','pips?|0..2']},
  {id:'Ledger',kind:'class',x:790,y:520,w:290,title:'ProgramLedger',path:'src/Combat/combat.card-program.ts',info:'Trial-card bookkeeping: Globals in play, EXILE, the turn’s WAIVE and doubling, TETHER and LEECH, a death ward, a delayed HEAL.',attrs:['globals|GlobalInPlay[]','exiled|string[]','sacrificeCount · sacrificePaid|n','waives · nextDouble · nextTwice','nextDealBonus · tetherUntil|n','deathWardRound · pendingHeal']},
  {id:'Enemy',kind:'class',x:30,y:620,w:300,title:'Enemy',path:'src/Enemy/types.ts',info:'Three in the library. No enemy keywords (<code>EnemyKeyword = never</code>). Live fights double VITAE.',attrs:['level · difficulty|normal|elite|boss','vitae|(30 + 8·level) × mult','friendshipReward?|befriend','stages?|boss stages']}
 ],edges:[
  {a:'TrialSet',b:'Card',mark:'dia',solid:1,label:'30–31'},{a:'TrialSet',b:'Lane',mark:'dia',solid:1,label:'1..*'},{a:'Lane',b:'Card',label:'cardIds',bend:-30},
  {a:'Card',b:'Program',mark:'dia',solid:1,label:'0..1'},{a:'Program',b:'Line',mark:'dia',solid:1,label:'free · paid'},{a:'Program',b:'Global',mark:'dia',solid:1,label:'0..1'},
  {a:'Line',b:'Ctx',label:'run(ctx)'},{a:'Global',b:'Ctx',label:'fires',bend:30},
  {a:'Combat',b:'Die',mark:'dia',solid:1,label:'4 + ghosts'},{a:'Combat',b:'Ledger',mark:'dia',solid:1,label:'0..1',bend:-60},{a:'Combat',b:'Card',label:'hand / piles',bend:0},{a:'Ledger',b:'Ctx',label:'state for'},{a:'Combat',b:'Enemy',label:'clone',bend:110}
 ]}
};
function drawClass(which){const svg=document.getElementById('d-class');svg.innerHTML='';const s=CLS[which];s.sparks=false;diagram('d-class',s,'i-class');}
drawClass('run');
document.querySelectorAll('[data-cls]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-cls]').forEach(x=>x.classList.toggle('on',x===b));drawClass(b.dataset.cls);}));

/* ───────── FSM ───────── */
const fsm=diagram('d-fsm',{w:1220,h:470,label:'Combat state machine',intro:'play',sparks:false,nodes:[
 {id:'s0',kind:'start',x:30,y:110,w:20,h:20},
 {id:'reveal',kind:'state',x:80,y:80,w:150,h:80,title:'reveal',desc:'foe and opening hand shown',info:'<code>initializeCombatEncounter</code> builds the state: shuffled deck, a hand of <code>COMBAT_HAND_SIZE</code> = 5, the enemy’s ordered threat deck. The telegraph shows the first intent.'},
 {id:'roll',kind:'state',x:340,y:80,w:170,h:80,title:'dice-roll',desc:'four dice, once a phase',info:'<code>rollEncounterDice</code> / <code>startTurn</code>: one roll per phase; a second is refused. Banked dice gain a pip. ⟳ Globals fire at the start of your turn.'},
 {id:'play',kind:'state',x:640,y:70,w:200,h:100,title:'phase-play',desc:'play lines, scrap, cast signatures',info:'<code>playCombatCard</code>, <code>discardCombatCard</code> (scrap, +1 Conviction, 2 a turn), <code>playSignatureSkill</code>. FREE lines need no die; PAID lines need exactly one legal die. Ends with <code>endTurn</code>, which banks one unspent die.'},
 {id:'resolve',kind:'state',x:640,y:290,w:200,h:90,title:'phase-resolve',desc:'the foe’s card fires',info:'<code>resolveThreatPhase</code>: the enemy plays its card, scaled by escalation; GUARD absorbs, THORNS and REFLECT answer. The phase is marked clear or overwhelmed.'},
 {id:'between',kind:'state',x:340,y:290,w:170,h:90,title:'between-phases',desc:'ticks, GUARD reset, draw to 5',info:'<code>processBetweenPhases</code>: LEECH drains at the foe’s turn start, durations tick, GUARD resets to 0, the hand refills to 5 (discard reshuffles when the draw pile empties).'},
 {id:'mercy',kind:'state',x:1010,y:70,w:170,h:100,title:'mercy-choice',desc:'spare or exploit',info:'Opened by The Open Hand on a foe with a <code>friendshipReward</code> under its <code>hpGate</code> (Green Jelly: below 30%). <code>selectMercyChoice</code>: Spare ends as mercy; Exploit strikes for max(10, 50% max VITAE) and the fight goes on if the foe survives.'},
 {id:'complete',kind:'state',x:1010,y:290,w:170,h:90,title:'complete',desc:'victory · mercy · defeat',info:'Victory at foe VITAE 0; mercy by sparing; defeat at your VITAE 0 or after <code>MAX_PHASES</code> = 60. A won fight offers 3 reward cards.'},
 {id:'s1',kind:'end',x:1084,y:420,w:22,h:22}
],edges:[
 {a:'s0',b:'reveal',solid:1},{a:'reveal',b:'roll',label:'begin'},{a:'roll',b:'play',label:'dice on the table'},
 {a:'play',b:'play',label:'play / scrap / signature'},
 {a:'play',b:'resolve',label:'end turn'},{a:'resolve',b:'between',label:'foe survives'},{a:'between',b:'roll',label:'next phase'},
 {a:'play',b:'mercy',label:'Open Hand lands',bend:-22},{a:'mercy',b:'play',label:'exploit, foe lives',bend:-22},{a:'mercy',b:'complete',label:'spare',lx:30},
 {a:'resolve',b:'complete',label:'someone hits 0'},{a:'play',b:'complete',label:'foe VITAE 0',bend:30,lx:-20},{a:'complete',b:'s1',solid:1}
]},'i-fsm');
(function(){const order=['reveal','roll','play','resolve','between','roll','play','mercy','complete'];const cap=['reveal: the foe’s intent is telegraphed','dice-roll: four dice, one per colour','phase-play: spend dice on PAID lines, scrap for Conviction','phase-resolve: the foe’s card fires','between-phases: ticks, GUARD resets, draw to five','dice-roll: banked dice gained a pip','phase-play: The Open Hand at under 30% VITAE','mercy-choice: spare or exploit','complete'];
 let t=null;document.getElementById('fsm-play').addEventListener('click',()=>{if(t)return;let i=0;fsm.svg.classList.add('dim');
  const step=()=>{Object.values(fsm.byId).forEach(n=>n.g.classList.remove('pulse','lit'));fsm.edges.forEach(x=>x.g.classList.remove('lit'));
   if(i>=order.length){fsm.svg.classList.remove('dim');t=null;document.getElementById('fsm-cap').textContent='Press to walk the phases.';return;}
   const n=fsm.byId[order[i]];n.g.classList.add('pulse','lit');if(i>0){const pe=fsm.edges.find(x=>x.e.a===order[i-1]&&x.e.b===order[i]);if(pe){pe.g.classList.add('lit');}}
   document.getElementById('fsm-cap').textContent=cap[i];i++;t=setTimeout(step,reduce?600:1300);};step();});})();

/* ───────── Sequence ───────── */
(function(){const svg=document.getElementById('d-seq');const L=[['Player','you'],['Board','presenter + store'],['combat.engine','playCombatCard'],['card-program','ProgramCtx'],['stat-scaling','scaleAmount'],['Foe','Enemy state']];
 const W=1040,col=W/L.length,top=20,rowH=40;const msgs=[
  [0,1,'drag a mana die onto Forfeit Strike’s PAID line'],
  [1,2,'programLineBlock(state, uid, paid=true)'],
  [2,1,'null — SACRIFICE 4 is payable',1],
  [1,2,'playCombatCard(state, uid, die)'],
  [2,2,'dieSatisfiesColorLaw(body die, body card) ✓'],
  [2,3,'run(ctx): SACRIFICE 4, DEAL 16'],
  [3,3,'sacrifice(4): VITAE −4, never below 1; 🩸 Globals fire'],
  [3,4,'scaleAmount(16, body) one-shot'],
  [4,3,'16 × 5 ÷ 5 = 16',1],
  [3,5,'deal(16) × (1 + VULNERABLE)'],
  [5,2,'VITAE 38 → 22',1],
  [2,1,'CombatTransition { state, events }',1],
  [1,0,'die spent, numbers land as the face printed',1]];
 const H=top+70+msgs.length*rowH+30;svg.setAttribute('viewBox',`0 0 ${W} ${H}`);defs(svg);
 L.forEach((l,i)=>{const x=col*i+col/2;el('line',{x1:x,x2:x,y1:top+50,y2:H-10,class:'life'},svg);const g=el('g',{class:'head'},svg);el('rect',{x:x-75,y:top,width:150,height:48,rx:4},g);el('text',{x,y:top+22,'text-anchor':'middle'},g,l[0]);el('text',{x,y:top+38,'text-anchor':'middle',class:'sub'},g,l[1]);});
 const act=el('rect',{class:'act',x:col*2+col/2-6,y:top+70+rowH*3-10,width:12,height:rowH*9},svg);
 const gs=msgs.map((m,i)=>{const y=top+80+i*rowH;const x1=col*m[0]+col/2,x2=col*m[1]+col/2;const g=el('g',{class:'msg'+(m[3]?' ret':'')},svg);let d;
  if(m[0]===m[1]){d=`M${x1+6},${y-6} h44 v16 h-40`;}else d=`M${x1+(x2>x1?6:-6)},${y} L${x2+(x2>x1?-8:8)},${y}`;
  const p=el('path',{d,id:'seq-m'+i},g);p.setAttribute('marker-end',`url(#d-seq-arr)`);
  const tx=m[0]===m[1]?x1+56:(x1+x2)/2;const t=el('text',{x:tx,y:y-6,'text-anchor':m[0]===m[1]?'start':'middle'},g);el('tspan',{class:'no'},t,(i+1)+'. ');el('tspan',null,t,m[2]);return g;});
 const tok=el('circle',{r:5,class:'tok',cx:-20,cy:-20},svg);let i=-1,timer=null;const cap=document.getElementById('seq-cap');
 function go(k){i=k;gs.forEach((g,j)=>{g.classList.toggle('cur',j===i);g.classList.toggle('past',j<i);});
  if(i>=0&&i<msgs.length){const m=msgs[i];const y=top+80+i*rowH;const x1=col*m[0]+col/2,x2=col*m[1]+col/2;cap.textContent=(i+1)+' / '+msgs.length;
   if(reduce){tok.setAttribute('cx',x2);tok.setAttribute('cy',y);return;}const t0=performance.now();const anim=now=>{const f=Math.min(1,(now-t0)/600);const x=m[0]===m[1]?x1+44*Math.sin(f*Math.PI):x1+(x2-x1)*f;tok.setAttribute('cx',x);tok.setAttribute('cy',y+(m[0]===m[1]?8*f:0));if(f<1)requestAnimationFrame(anim);};requestAnimationFrame(anim);}
  else{cap.textContent='';tok.setAttribute('cx',-20);}}
 document.getElementById('seq-step').addEventListener('click',()=>{clearInterval(timer);timer=null;go(i+1>=msgs.length?-1:i+1);});
 document.getElementById('seq-reset').addEventListener('click',()=>{clearInterval(timer);timer=null;go(-1);});
 document.getElementById('seq-play').addEventListener('click',()=>{clearInterval(timer);go(0);timer=setInterval(()=>{if(i+1>=msgs.length){clearInterval(timer);timer=null;return;}go(i+1);},reduce?700:1100);});
})();

diagram('d-death',{w:900,h:250,label:'Death states',intro:'dying',sparks:false,nodes:[
 {id:'s0',kind:'start',x:20,y:105,w:20,h:20},
 {id:'alive',kind:'state',x:70,y:80,w:170,h:70,title:'alive',info:'Normal play.'},
 {id:'dying',kind:'state',x:360,y:80,w:190,h:70,title:'dying',desc:'GameState.dying = true',info:'<code>resolveDeath</code>: back on the node you walked from (<code>MapState.arrivedFrom</code>) with 1 VITAE; the node you died on reopens. The board shows a skull for your portrait. In the app, a lethal hazard still resets the run until phase DY1c.'},
 {id:'reset',kind:'state',x:680,y:80,w:190,h:70,title:'run reset',desc:'new run and world, character kept',info:'A death while dying ends the run as a reset does: fresh run and world, full VITAE, the character kept. A defeat inside the Labyrinth always resets.'},
 {id:'s1',kind:'end',x:765,y:200,w:22,h:22}
],edges:[
 {a:'s0',b:'alive',solid:1},{a:'alive',b:'dying',label:'VITAE 0 (fight or hazard)'},{a:'dying',b:'alive',label:'rest heal · village paid rest\n(clearDying)',bend:-50},{a:'dying',b:'reset',label:'VITAE 0 again'},{a:'reset',b:'s1',solid:1}
]},'i-death');

/* ───────── Dice economy ───────── */
D['d-dice']=diagram('d-dice',{w:1060,h:640,label:'Dice and Conviction economy',intro:'conv',nodes:[
 {id:'tray',kind:'focus',x:20,y:250,w:160,h:110,title:'The tray',tech:'UPGRADEABLE_DIE_COLORS',desc:'body · mind · heart · gold, rolled once a phase',info:'Four dice per threat phase. A second roll is refused (<code>startTurn</code>).'},
 {id:'special',kind:'state',k2:'gold',x:300,y:110,w:160,h:70,title:'special face',desc:'1 per die',info:'Powers a card like mana, and pays <code>SPECIAL_CONVICTION_DEFAULT</code> = 2 Conviction when the die is used.'},
 {id:'mana',kind:'state',x:300,y:270,w:160,h:70,title:'mana face',desc:'2 coloured · 1 gold',info:'Powers a card. That is all a die does (D79).'},
 {id:'miss',kind:'state',x:300,y:430,w:160,h:70,title:'miss face',desc:'3 coloured · 4 gold',info:'Cannot power a card. The Anvil’s HONE turns one into mana.'},
 {id:'law',kind:'decision',x:510,y:250,w:150,h:110,title:'Color Law',info:'<code>dieSatisfiesColorLaw</code>: the card is <code>any</code>, the die is gold, or the colours match. A mismatch fizzles.'},
 {id:'paid',kind:'focus',x:700,y:260,w:160,h:90,title:'PAID line',desc:'exactly one die',info:'Numbers land as printed, scaled by stats. A Spell’s PAID line EXILEs and is a step stronger (the Spell law, D103).'},
 {id:'reserve',kind:'store',x:490,y:470,w:160,h:110,title:'Reserve',desc:'RESERVE_MAX 2 · pip cap 2',info:'At turn end one unspent die is banked. A banked die gains a pip per phase, up to 2. Each pip adds <code>PIP_GUARD_BONUS</code> = 5 GUARD or <code>PIP_INTENSITY_BONUS</code> = 2 status intensity.'},
 {id:'chain',kind:'state',x:690,y:470,w:160,h:90,title:'Momentum chain',desc:'heart → body → mind',info:'Using dice in <code>MOMENTUM_CHAIN_ORDER</code>, length 3, grants a temporary gold die (GHOST). Over <code>UPGRADEABLE_TABLE_CEILING</code> = 7 dice it becomes +1 Conviction.'},
 {id:'ghost',kind:'state',k2:'gold',x:920,y:470,w:120,h:90,title:'GHOST die',desc:'floating gold',info:'A temporary wild die for this combat phase.'},
 {id:'scrap',kind:'state',x:690,y:120,w:160,h:70,title:'Scrap a card',desc:'+1, first 2 a turn',info:'<code>SCRAP_CONVICTION_CAP_PER_TURN</code> = 2. A Curse cannot be scrapped.'},
 {id:'cards',kind:'state',x:690,y:14,w:170,h:62,title:'Cards',desc:'gain n Conviction',info:'Bloodletting, Binding Vow, Grim Resolve, Raised Stakes, Remission, Prickly Resolve, M-05.'},
 {id:'conv',kind:'focus',x:880,y:250,w:160,h:110,title:'Conviction',tech:'CONVICTION_CAP 12',desc:'spent only on signatures',info:'Spent on signatures at ◆3 to ◆6. One signature per worn signet relic.'},
 {id:'anvil',kind:'ext',x:30,y:470,w:190,h:110,title:'The Anvil',tech:'village counter',desc:'HONE 3s · TEMPER 5s · SWAP 8s',info:'The only way dice grow (D20 parks the rest). HONE miss → mana, TEMPER mana → special, SWAP changes a die’s gear. Also one card upgrade a visit for 5 shillings.'},
 {id:'sigs',kind:'state',k2:'gold',x:890,y:110,w:150,h:70,title:'Signatures',desc:'◆3 – ◆6',small:1,info:'See the Relics plate for all ten.'}
],edges:[
 {a:'tray',b:'special',label:'1/6 · gold 1/6',k:'gold'},{a:'tray',b:'mana',label:'2/6 · gold 1/6'},{a:'tray',b:'miss',label:'3/6 · gold 4/6'},
 {a:'special',b:'law'},{a:'mana',b:'law'},{a:'law',b:'paid',label:'legal',k:'gold'},
 {a:'special',b:'conv',label:'+2 when used',k:'gold',bend:-40},
 {a:'mana',b:'reserve',label:'unspent → bank',bend:30},{a:'reserve',b:'law',label:'+pips'},
 {a:'paid',b:'chain',label:'colour used'},{a:'chain',b:'ghost',label:'len 3'},{a:'ghost',b:'paid',label:'wild: any line'},
 {a:'scrap',b:'conv',label:'+1'},{a:'cards',b:'conv'},{a:'conv',b:'sigs',label:'spend',k:'blood'},
 {a:'anvil',b:'tray',label:'reshapes faces',k:'heal'}
]},'i-dice');
(function(){const tray=document.getElementById('tray');const cols=['body','mind','heart','gold'];
 function face(c){const r=Math.floor(Math.random()*6);if(c==='gold')return r===0?'special':r===1?'mana':'miss';return r===0?'special':r<3?'mana':'miss';}
 function render(fs){tray.innerHTML='';cols.forEach((c,i)=>{const d=document.createElement('div');d.className='die '+c+(fs&&fs[i]==='miss'?' miss':'');d.innerHTML=`<span><b>${fs?(fs[i]==='special'?'✦':fs[i]==='mana'?'●':'·'):'?'}</b>${c}<br>${fs?fs[i]:''}</span>`;tray.appendChild(d);});}
 render(['special','mana','miss','mana']);
 document.getElementById('rollout').textContent='Example tray.';
 document.getElementById('roll').addEventListener('click',()=>{tray.querySelectorAll('.die').forEach(d=>d.classList.add('roll'));setTimeout(()=>{const fs=cols.map(face);render(fs);const u=fs.filter(f=>f!=='miss').length,s=fs.filter(f=>f==='special').length;document.getElementById('rollout').textContent=`${u} usable · ${s} special (+${2*s} Conviction if used)`;},reduce?0:380);});
 const cl=document.getElementById('colorlaw');const dies=['body','mind','heart','gold'],cardc=['body','mind','heart','any'];
 cl.innerHTML='<tr><th>die \\ card</th>'+cardc.map(c=>`<th>${c}</th>`).join('')+'</tr>'+dies.map(d=>`<tr><td class="mono">${d}</td>`+cardc.map(c=>{const ok=c==='any'||d==='gold'||c===d;return `<td style="color:var(${ok?'--heal':'--blood'})">${ok?'powers':'fizzles'}</td>`}).join('')+'</tr>').join('');})();

/* ───────── Loop ───────── */
D['d-march']=diagram('d-march',{w:1060,h:560,label:'/march activity',intro:'iterate',trace:[0,1,2,3,4,5,6,7,8],nodes:[
 {id:'s0',kind:'start',x:30,y:60,w:22,h:22},
 {id:'sync',kind:'state',x:80,y:40,w:150,h:62,title:'0 · sync',desc:'main, ff-only',info:'<code>git switch main; git pull --ff-only</code>, load <code>GH_TOKEN</code>. Divergence stops the tick.'},
 {id:'tri',kind:'decision',x:290,y:26,w:150,h:90,title:'issues?',small:1,info:'Unlabeled open issues, or any <code>loop:do</code> (the concierge lane outranks everything).'},
 {id:'triage',kind:'state',x:290,y:170,w:150,h:62,title:'/triage',info:'Classify, label, comment, route; then the report sweep files unfiled reports into CRITIQUE.'},
 {id:'crit',kind:'decision',x:500,y:26,w:150,h:90,title:'critique due?',small:1,info:'Plan-only; never opens a PR, so the cap does not stop it.'},
 {id:'critique',kind:'state',x:500,y:170,w:150,h:62,title:'/critique',info:'Plays the local expo-web build as a first-time player and files findings to <code>plan/CRITIQUE.md</code>.'},
 {id:'cap',kind:'decision',x:710,y:26,w:150,h:90,title:'5 PRs open?',small:1,info:'The PR cap (D85). At the cap the tick reports what is waiting on T and returns.'},
 {id:'wait',kind:'state',x:710,y:170,w:150,h:62,title:'report: waiting on T',small:1,info:'Lists open PRs, plus any 7d+ or stuck ones.'},
 {id:'phase',kind:'decision',x:880,y:200,w:150,h:90,title:'pickable phase?',small:1,info:'An unchecked build-plan row with a brief, its <code>Requires</code> met, not owner-led or attended, not claimed by a PR.'},
 {id:'ship',kind:'state',k2:'gold',x:880,y:350,w:150,h:62,title:'/ship-a-phase',info:'Ships the phase end to end and lands it as a <code>loop:pr</code> PR.'},
 {id:'exp',kind:'decision',x:640,y:330,w:150,h:90,title:'expand due?',small:1,info:'Reads accumulated signals and proposes phase candidates to <code>PHASE_CANDIDATES.md</code>.'},
 {id:'expand',kind:'state',x:640,y:470,w:150,h:62,title:'/expand',info:'Posture-controlled candidate proposals.'},
 {id:'iterate',kind:'state',x:380,y:350,w:180,h:62,title:'/iterate',desc:'the default',info:'Audit, find the highest-impact weakness, ship one improvement.'},
 {id:'s1',kind:'end',x:200,y:370,w:22,h:22}
],edges:[
 {a:'s0',b:'sync',solid:1},{a:'sync',b:'tri'},{a:'tri',b:'crit',label:'no'},{a:'crit',b:'cap',label:'no'},{a:'cap',b:'phase',label:'no'},{a:'phase',b:'exp',label:'none',bend:-20},{a:'exp',b:'iterate',label:'no'},{a:'iterate',b:'s1',label:'return'},{a:'phase',b:'ship',label:'yes',k:'gold'},
 {a:'tri',b:'triage',label:'yes'},{a:'crit',b:'critique',label:'yes'},{a:'cap',b:'wait',label:'yes'},{a:'exp',b:'expand',label:'yes'}
]},'i-march');

D['d-pr']=diagram('d-pr',{w:1060,h:420,label:'Change pipeline',intro:'review',nodes:[
 {id:'t',kind:'person',x:20,y:30,w:170,h:80,title:'T',desc:'an idea',info:'"Let’s add…", "the loop should build…", "queue this".'},
 {id:'plot',x:240,y:20,w:180,h:100,title:'/plot · /messy',tech:'attended intake',desc:'spec brief with acceptance IDs, split into one-tick phases',info:'<code>/plot</code> for one known task, <code>/messy</code> for a dump. Never builds; never fired by the loop.'},
 {id:'plotpr',kind:'decision',x:470,y:20,w:160,h:100,title:'plot PR',small:1,info:'Labelled <code>plot</code>, never <code>loop:pr</code> (D93). T approves the phase split by merging it (D101).'},
 {id:'rows',kind:'store',x:690,y:20,w:170,h:100,title:'build plan rows',desc:'plan/ + briefs',info:'Each phase becomes a build-plan row with a brief, and a deadlines Item where it unblocks a T act.'},
 {id:'tick',x:880,y:150,w:160,h:90,title:'loop tick',tech:'/march → /ship-a-phase',desc:'edits, verifies, commits',info:'Runs in GitHub Actions via the Claude Code action.'},
 {id:'lpr',x:640,y:300,w:180,h:90,title:'loop:pr PR',tech:'size:* · area:* · review:*',desc:'ready for review, never draft',info:'At most 5 open (D85). The loop never merges, closes or force-pushes (D86).'},
 {id:'review',kind:'decision',x:400,y:290,w:170,h:110,title:'adversarial review',small:1,info:'<code>pr-review.yml</code>. Green and complete → the merge job. Pipeline-changing PRs and held PRs wait for T.'},
 {id:'fix',x:640,y:170,w:180,h:70,title:'pr-autofix · pr-resolve',desc:'Haiku, two runs a PR',small:1,info:'Keeps a red <code>loop:pr</code> PR green and mergeable (D87).'},
 {id:'merge',kind:'focus',x:140,y:300,w:200,h:90,title:'merge job',desc:'checks refs/pull/n/merge with check-lessons, check-plan-queues, check-deadlines',info:'A red merged tree gets one branch update from main, then a hold naming the lint.'},
 {id:'main',kind:'store',x:20,y:170,w:120,h:90,title:'main',info:'Plan-only and telemetry commits push main directly.'}
],edges:[
 {a:'t',b:'plot'},{a:'plot',b:'plotpr'},{a:'plotpr',b:'rows',label:'T merges',k:'blood'},{a:'rows',b:'tick',label:'pickable'},{a:'tick',b:'lpr'},{a:'lpr',b:'review'},{a:'review',b:'fix',label:'red',bend:20},{a:'fix',b:'lpr',bend:30},{a:'review',b:'merge',label:'green',k:'gold'},{a:'merge',b:'main',k:'gold'}
]},'i-pr');

diagram('d-life',{w:1040,h:360,label:'Card lifecycle',intro:'hand',sparks:false,nodes:[
 {id:'draw',kind:'state',x:30,y:140,w:150,h:70,title:'draw pile',info:'Remaining draw order. When it empties, the discard reshuffles into it.'},
 {id:'hand',kind:'state',k2:'gold',x:260,y:140,w:150,h:70,title:'hand',desc:'refills to 5',info:'<code>COMBAT_HAND_SIZE</code> = 5. Unplayed cards stay. A Curse holds a hand slot until played and cannot be scrapped.'},
 {id:'discard',kind:'state',x:560,y:20,w:170,h:70,title:'discard',info:'Attack and Skill on either line, a Spell’s FREE line, scrapped cards, and random discards (Defender costs).'},
 {id:'exile',kind:'state',x:560,y:140,w:170,h:70,title:'exiled',desc:'out of combat',info:'A Spell’s PAID line, and other PAID lines marked EXILE. Rummage’s PAID line returns a random exiled card to the draw pile.'},
 {id:'inplay',kind:'state',x:560,y:260,w:170,h:70,title:'in play',desc:'Globals',info:'FREE: 3 turn starts (<code>GLOBAL_FREE_TURNS</code>). PAID: rest of combat. Each copy fires and expires on its own.'},
 {id:'conv',kind:'state',x:840,y:20,w:170,h:70,title:'+1 Conviction',desc:'scrap, 2 a turn',info:'Discarding by choice (scrap) pays Conviction.'}
],edges:[
 {a:'draw',b:'hand',label:'draw'},{a:'hand',b:'discard',label:'attack · skill · spell FREE · scrap'},{a:'hand',b:'exile',label:'spell PAID'},{a:'hand',b:'inplay',label:'global'},
 {a:'inplay',b:'discard',label:'turns run out',bend:-60,lx:60},{a:'discard',b:'draw',label:'reshuffle when empty',bend:60},{a:'exile',b:'draw',label:'Rummage PAID',bend:-30},{a:'discard',b:'hand',label:'RETRIEVE',bend:-20},{a:'discard',b:'conv',label:'scrap'}
]},'i-life');
diagram('d-reward',{w:1040,h:330,label:'Reward pool',intro:'pool',nodes:[
 {id:'start',x:20,y:30,w:220,h:80,title:'startingLaneIds',desc:'the character’s two lanes, always',info:'Widen the pool whether or not anything is worn, and never add a guaranteed slot.'},
 {id:'worn',x:20,y:200,w:220,h:80,title:'worn relics',desc:'each opens its lane',info:'An unworn relic opens nothing. Worn relics also count toward guaranteed lane slots.'},
 {id:'pool',kind:'focus',x:330,y:110,w:220,h:100,title:'rewardPoolFor',tech:'unlockedLaneIds',desc:'union of lanes, grey never',info:'No character and no worn lane relic: the pool is the grey office. The dev menu REWARD POOL can narrow it.'},
 {id:'offer',x:640,y:30,w:180,h:80,title:'won fight',desc:'3 cards',info:'<code>COMBAT_REWARD_OFFER_COUNT</code> = 3 (mobile). A cache offers one.'},
 {id:'elite',x:640,y:200,w:180,h:90,title:'won elite fight',desc:'best 3 by rarity · 1 from deckLaneIds · or an upgrade',info:'<code>rollEliteReward</code> (UP1f): the only reward steering in the game. The upgrade option hides when nothing can be upgraded.'},
 {id:'shop',x:880,y:110,w:140,h:90,title:'village shop',desc:'3 at 6s each',info:'Seeded by run and node, so a village offers the same three all run.'}
],edges:[{a:'start',b:'pool'},{a:'worn',b:'pool',k:'gold'},{a:'pool',b:'offer'},{a:'pool',b:'elite'},{a:'pool',b:'shop'}]},'i-reward');
