/**
 * The enemy frame engine: pure clip arithmetic, a Reanimated driver, the
 * component that puts a validated frame set on screen, and the beat wiring the
 * combat pane selects its clip with: idle as the resting loop, struck when the
 * enemy takes a hit, attacking on its own beat. An enemy with no frame set in
 * the registry goes through none of it and renders the single image it always
 * did.
 */
export * from './framePlayback';
export * from './useFramePlayback';
export * from './enemyAttackBeat';
export * from './enemyStruckBeat';
export * from './useEnemyClipSelection';
export { EnemyFramePlayer, type EnemyFramePlayerProps } from './EnemyFramePlayer';
