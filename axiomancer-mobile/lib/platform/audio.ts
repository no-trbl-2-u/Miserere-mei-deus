import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

/**
 * The audio seam. Backed by `expo-audio` (the SDK 54 module; `expo-av`'s
 * audio is deprecated). Only this file imports it, so tests and the web build
 * see one stable surface, and `jest.setup.ts` mocks the package so no suite
 * loads the native module.
 *
 * The surface is the one thing the background music needs: a single looping
 * track that can be started, paused in place (the position is kept, so a
 * later `play()` resumes where it stopped), and set to a volume. There is no
 * seek and no reload on purpose.
 */
export interface LoopingPlayer {
    /** Start or resume from the current position. */
    play(): void;
    /** Stop in place; the position is kept. */
    pause(): void;
    /** 0 to 1, clamped. */
    setVolume(volume: number): void;
    /** Free the native player. */
    release(): void;
}

/** A bundled asset id, as `require('...mp3')` returns. */
export type AudioAsset = number;

export function createLoopingPlayer(source: AudioAsset): LoopingPlayer {
    const player: AudioPlayer = createAudioPlayer(source);
    player.loop = true;
    player.volume = 0;
    return {
        play: () => player.play(),
        pause: () => player.pause(),
        setVolume: (volume) => {
            player.volume = Math.min(1, Math.max(0, volume));
        },
        release: () => player.remove(),
    };
}
