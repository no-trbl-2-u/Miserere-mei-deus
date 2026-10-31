import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

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
    /** What the native player reports now (false after an OS-side pause or focus loss). */
    isPlaying(): boolean;
    /** Free the native player. */
    release(): void;
}

/**
 * Looping game music: take lasting audio focus (not the transient request
 * `expo-audio` makes by default, which a permanent loss pauses for good),
 * play over the iOS silent switch, and stop when the app is backgrounded.
 * Best-effort: a refusal leaves the default mode.
 */
export function configureGameAudio(): void {
    try {
        void Promise.resolve(
            setAudioModeAsync({
                playsInSilentMode: true,
                interruptionMode: 'doNotMix',
                allowsRecording: false,
                shouldPlayInBackground: false,
                shouldRouteThroughEarpiece: false,
            }),
        ).catch(() => undefined);
    } catch {
        // web or a missing module: the default mode stands
    }
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
        isPlaying: () => player.playing,
        release: () => player.remove(),
    };
}
