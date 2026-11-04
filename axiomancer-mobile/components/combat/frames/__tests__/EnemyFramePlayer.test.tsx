/**
 * The player's behavioural contracts: it holds the resting cell when motion is
 * reduced or the e2e escape hatch is set, it takes that answer from whatever
 * the caller already holds (a boolean, or the combat pane's own ref — never a
 * second mechanism of its own), and it refuses to render an invalid set rather
 * than playing a truncated loop.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import type { EnemyFrameSet } from '@/assets/images/enemies/frames';

import { EnemyFramePlayer } from '../EnemyFramePlayer';
import { readReducedMotion } from '../useFramePlayback';
import { SYNTHETIC_FRAME_KEY, SYNTHETIC_FRAME_SET } from '../syntheticFrameSet';

type GlobalWithFlag = typeof globalThis & { __AXM_JUICE_INSTANT__?: unknown };

function restingSet(rest: number): EnemyFrameSet {
    return {
        ...SYNTHETIC_FRAME_SET,
        manifest: {
            ...SYNTHETIC_FRAME_SET.manifest,
            clips: {
                ...SYNTHETIC_FRAME_SET.manifest.clips,
                idle: { ...SYNTHETIC_FRAME_SET.manifest.clips.idle, rest },
            },
        },
    };
}

afterEach(() => {
    delete (globalThis as GlobalWithFlag).__AXM_JUICE_INSTANT__;
});

describe('readReducedMotion', () => {
    it('takes a plain boolean', () => {
        expect(readReducedMotion(true)).toBe(true);
        expect(readReducedMotion(false)).toBe(false);
    });

    it('takes the combat pane\'s own ref, so nothing grows a second source', () => {
        expect(readReducedMotion({ current: true })).toBe(true);
        expect(readReducedMotion({ current: false })).toBe(false);
    });

    it('treats an absent answer as "motion is fine"', () => {
        expect(readReducedMotion(undefined)).toBe(false);
        expect(readReducedMotion(null)).toBe(false);
    });
});

describe('EnemyFramePlayer', () => {
    it('mounts one layer per cell in the set, so no cell decodes mid-clip', () => {
        render(<EnemyFramePlayer artKey={SYNTHETIC_FRAME_KEY} frameSet={SYNTHETIC_FRAME_SET} />);
        const root = screen.getByTestId('enemy-frame-player');
        expect(root.children).toHaveLength(SYNTHETIC_FRAME_SET.frames.length);
        // Exactly one of them is the opaque, active layer.
        const opaque = root.children.filter((child: unknown) => {
            const style = (child as { props?: { style?: unknown } }).props?.style;
            return JSON.stringify(style ?? '').includes('"opacity":1');
        });
        expect(opaque).toHaveLength(1);
    });

    it('holds the resting cell and plays nothing under reduced motion', () => {
        render(
            <EnemyFramePlayer
                artKey={SYNTHETIC_FRAME_KEY}
                frameSet={restingSet(2)}
                reducedMotion
            />,
        );
        expect(screen.getByTestId('enemy-frame-player-still')).toBeTruthy();
        expect(screen.getByTestId('enemy-frame-player-cell-2')).toBeTruthy();
    });

    it('takes reduced motion from the pane\'s ref exactly as from a boolean', () => {
        render(
            <EnemyFramePlayer
                artKey={SYNTHETIC_FRAME_KEY}
                frameSet={restingSet(3)}
                reducedMotion={{ current: true }}
            />,
        );
        expect(screen.getByTestId('enemy-frame-player-still')).toBeTruthy();
        expect(screen.getByTestId('enemy-frame-player-cell-3')).toBeTruthy();
    });

    it('short-circuits to the resting cell under the seeded e2e escape hatch', () => {
        // The same global every juice primitive honours, so a suite never
        // waits on a frame and the enemy is a still picture in e2e.
        (globalThis as GlobalWithFlag).__AXM_JUICE_INSTANT__ = true;
        render(<EnemyFramePlayer artKey={SYNTHETIC_FRAME_KEY} frameSet={restingSet(1)} />);
        expect(screen.getByTestId('enemy-frame-player-still')).toBeTruthy();
        expect(screen.getByTestId('enemy-frame-player-cell-1')).toBeTruthy();
    });

    it('is not still when motion is allowed and no hatch is set', () => {
        render(<EnemyFramePlayer artKey={SYNTHETIC_FRAME_KEY} frameSet={SYNTHETIC_FRAME_SET} />);
        expect(screen.queryByTestId('enemy-frame-player-still')).toBeNull();
    });

    it('shows the stepped cell when the harness drives it by hand', () => {
        render(
            <EnemyFramePlayer
                artKey={SYNTHETIC_FRAME_KEY}
                frameSet={SYNTHETIC_FRAME_SET}
                playing={false}
                frameOverride={2}
            />,
        );
        expect(screen.getByTestId('enemy-frame-player-cell-2')).toBeTruthy();
    });

    it('refuses a set whose files disagree with its manifest', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const broken: EnemyFrameSet = {
            ...SYNTHETIC_FRAME_SET,
            frames: SYNTHETIC_FRAME_SET.frames.slice(0, 5),
        };
        render(<EnemyFramePlayer artKey="broken" frameSet={broken} />);
        expect(screen.getByTestId('enemy-frame-player-invalid')).toBeTruthy();
        expect(screen.queryByTestId('enemy-frame-player')).toBeNull();
        warn.mockRestore();
    });

    it('refuses a clip the manifest does not name', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        render(
            <EnemyFramePlayer
                artKey={SYNTHETIC_FRAME_KEY}
                frameSet={SYNTHETIC_FRAME_SET}
                clipName="dancing"
            />,
        );
        expect(screen.getByTestId('enemy-frame-player-invalid')).toBeTruthy();
        warn.mockRestore();
    });
});

/**
 * 146.8 — the backing is per cell. Backing `i` is cut from cell `i` alone, so
 * the player draws it inside cell `i`'s own layer, under the cell, on the same
 * opacity swap: the dark shape on screen is always the current frame's shape.
 */
describe("EnemyFramePlayer draws each cell's own backing", () => {
    const backings = SYNTHETIC_FRAME_SET.frames.map((_, i) => ({ uri: `backing-${i}` }));
    type Node = { type: unknown; props: Record<string, unknown>; children: unknown[] };
    /** The host image may hand its source on wrapped in a list. */
    const src = (value: unknown) => [value].flat()[0];

    it('draws backing i under cell i, in the tint, placed as the cell is', () => {
        render(
            <EnemyFramePlayer
                artKey={SYNTHETIC_FRAME_KEY}
                frameSet={SYNTHETIC_FRAME_SET}
                playing={false}
                frameOverride={2}
                backings={backings}
                backingTint="black"
            />,
        );
        const backing = screen.getByTestId('enemy-frame-player-backing-2');
        const cell = screen.getByTestId('enemy-frame-player-cell-2');
        expect(src(backing.props.source)).toEqual(backings[2]);
        expect(backing.props.tintColor).toBeTruthy();
        // The backing rides in the active cell's own layer, painted first.
        const images = cell.findAll((n: Node) => typeof n.type === 'string' && n.props.contentFit !== undefined);
        expect(images).toHaveLength(2);
        expect(src(images[0].props.source)).toEqual(backings[2]);
        expect(src(images[1].props.source)).not.toEqual(backings[2]);
        expect(images[0].props.contentFit).toBe(images[1].props.contentFit);
        expect(images[0].props.contentPosition).toEqual(images[1].props.contentPosition);
    });

    it('changes with the frame', () => {
        const at = (frame: number) => {
            const view = render(
                <EnemyFramePlayer
                    artKey={SYNTHETIC_FRAME_KEY}
                    frameSet={SYNTHETIC_FRAME_SET}
                    playing={false}
                    frameOverride={frame}
                    backings={backings}
                />,
            );
            const source = src(view.getByTestId(`enemy-frame-player-backing-${frame}`).props.source);
            view.unmount();
            return source;
        };
        expect(at(0)).toEqual(backings[0]);
        expect(at(1)).toEqual(backings[1]);
    });

    it('draws no backing when none is passed', () => {
        render(<EnemyFramePlayer artKey={SYNTHETIC_FRAME_KEY} frameSet={SYNTHETIC_FRAME_SET} frameOverride={0} />);
        expect(screen.queryByTestId('enemy-frame-player-backing-0')).toBeNull();
    });

    it('draws none rather than a misregistered one when the list does not match the cells', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        render(
            <EnemyFramePlayer
                artKey={SYNTHETIC_FRAME_KEY}
                frameSet={SYNTHETIC_FRAME_SET}
                frameOverride={0}
                backings={backings.slice(1)}
            />,
        );
        expect(screen.queryByTestId('enemy-frame-player-backing-0')).toBeNull();
        expect(screen.getByTestId('enemy-frame-player-cell-0')).toBeTruthy();
        warn.mockRestore();
    });
});
