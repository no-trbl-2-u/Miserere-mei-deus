/**
 * The enemy frame engine: pure clip arithmetic, a Reanimated driver, and the
 * component that puts a validated frame set on screen. Nothing here is wired
 * into live combat — the combat pane picks it up in a later phase.
 */
export * from './framePlayback';
export * from './useFramePlayback';
export { EnemyFramePlayer, type EnemyFramePlayerProps } from './EnemyFramePlayer';
