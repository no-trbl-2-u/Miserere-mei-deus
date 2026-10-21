/**
 * The enemy frame engine: pure clip arithmetic, a Reanimated driver, the
 * component that puts a validated frame set on screen, and the beat wiring the
 * combat pane selects its clip with. An enemy with no frame set in the
 * registry goes through none of it and renders the single image it always did.
 */
export * from './framePlayback';
export * from './useFramePlayback';
export * from './enemyAttackBeat';
export * from './useEnemyAttackClip';
export { EnemyFramePlayer, type EnemyFramePlayerProps } from './EnemyFramePlayer';
