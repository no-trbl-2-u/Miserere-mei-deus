import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Circle, G, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { Image } from '@/lib/platform/image';
import { MAP_FOG } from '@/assets/images/map-fog';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import type { ExplorationNode, ExplorationEdge } from '@/state/presenters/exploration.engine';
import type { MapSheet } from '@/state/exploration-maps';
import { LEGACY_SHEET_SIZE } from '@/state/exploration-maps/sheet';
import { MapCameraContext, MapSheetContext, type SheetSize } from './mapSheetContext';
import { NODE_SIZE, nodeCounterScale } from './ExplorationNode';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { resolveJuiceMode } from '@/lib/juice/instant';
import { edgeKey, HELD_ROAD_DRAW_MS, useOpeningRoads } from './heldRoads';
import { recallCamera, rememberCamera } from './mapCameraMemory';

interface MapCanvasProps {
    nodes: readonly ExplorationNode[];
    edges: readonly ExplorationEdge[];
    /**
     * The map's sheet: canvas size, scale, plate and plate opacity. Omitted,
     * the canvas uses `LEGACY_SHEET_SIZE` (360×400 ×2.6) with no plate.
     */
    sheet?: MapSheet | null;
    /**
     * Viewport-fixed chart furniture (legend, gesture line) —
     * rendered as a sibling of the vignette SVG, NOT inside the
     * pannable canvas, so absolute positions resolve against the visible
     * viewport instead of the pannable canvas.
     */
    overlays?: React.ReactNode;
    /**
     * The map's identity for the camera memory (MC1b): the camera is kept per
     * map across the map unmounting under a fight. Omitted, nothing is
     * remembered.
     */
    mapId?: string;
    children: React.ReactNode;
}

// Node coordinates live on the map's sheet (`MapSheet`), rendered `scale`x
// into a larger pannable canvas so each node has breathing room — the window
// clips to a viewport the user pans/zooms around.

/** The canvas size in device px for a sheet at 1x zoom. */
export function canvasSizeOf(size: SheetSize): { w: number; h: number } {
    'worklet';
    return { w: size.width * size.scale, h: size.height * size.scale };
}

export const MAX_SCALE = 3;

/**
 * The zoom-out floor for this sheet in this viewport: the scale at which the
 * WHOLE plate just fits inside the pane (contain, not cover). Past the plate's
 * edges the pane's near-black ground shows: T ruled stability over
 * edge-clamping (2026-10-31), so a zoom-out never has to fight the plate's
 * edge to keep the screen filled.
 *
 * Exported for unit coverage; the fit, the pinch and the wheel share it.
 */
export function minScaleFor(viewport: { w: number; h: number }, size: SheetSize = LEGACY_SHEET_SIZE): number {
    'worklet';
    const canvas = canvasSizeOf(size);
    return Math.min(viewport.w / canvas.w, viewport.h / canvas.h);
}

/**
 * The zoom a pinch or wheel step asks for, held between the contain floor and
 * `MAX_SCALE`. Exported for unit coverage.
 */
export function clampScale(next: number, floor: number): number {
    'worklet';
    return Math.min(MAX_SCALE, Math.max(floor, next));
}

/**
 * One axis of a zoom anchored on a pane point: with the canvas's top-left
 * transform origin a pane point is `t + s·c`, so holding the plate point that
 * was under `f` (at scale s, translation t) under `fNext` at scale s' = k·s
 * gives t' = fNext − k(f − t).
 *
 * `f` and `fNext` MUST be pane coordinates. Fed a point measured in the
 * transformed canvas's own frame (what RNGH reports when the detector is
 * attached to the canvas), every write moves the frame the next reading is
 * taken in and the map is thrown about (MC1a, the regression #1046 shipped).
 * Nothing clamps here: an edge clamp would move the anchor.
 */
export function anchorAxis(t: number, f: number, fNext: number, k: number): number {
    'worklet';
    return fNext - k * (f - t);
}

/**
 * One axis of a pan step: the translation after a drag of `d`, limited so a
 * plate edge comes no further than the middle of the pane (the plate can never
 * be lost entirely). The limit bounds the DELTA only: a camera already past it
 * (a pinch is never limited) is not snapped back, and a drag back toward the
 * plate is never refused.
 */
export function panAxis(t: number, d: number, viewportLen: number, canvasLen: number): number {
    'worklet';
    const hi = viewportLen / 2;
    const lo = viewportLen / 2 - canvasLen;
    const next = t + d;
    if (d > 0) return Math.min(next, Math.max(t, hi));
    if (d < 0) return Math.max(next, Math.min(t, lo));
    return t;
}

/**
 * RECENTRE's zoom: the pane spans this share of the sheet's width (MC1b,
 * Accepted at merge (default), #3). The same on every sheet, so a 1000-unit
 * Act 1 plate shows about 400 units across: the player's icon and its near
 * neighbours, not a seventh of the region.
 */
export const RECENTRE_SPAN = 0.4;

/** A move pans the camera only when the player's node leaves this share of the pane. */
export const INNER_FRAME = 0.8;

/**
 * True for a node that is one of the player's legal moves, new (`available`)
 * or a walked road back (`walkable`). Part of the camera's focus key.
 */
function isFocusMove(n: ExplorationNode): boolean {
    return n.kind === 'available' || (n.kind === 'completed' && n.walkable === true);
}

/**
 * The identity of the camera's SUBJECT — where the player stands, plus the
 * steps open from there — as a stable string.
 *
 * Exported for unit coverage. This function is the whole safety argument for
 * re-fitting the camera, so it is pinned directly rather than inferred from a
 * rendered transform.
 *
 * Two requirements meet here and pull in opposite directions:
 *
 *   - The camera MUST re-fit when the road ahead changes, or after a move the
 *     player's onward choices can sit entirely off-screen.
 *   - The camera MUST NOT fight a player panning to look around (issue #294).
 *
 * Keying the re-fit on this value satisfies both structurally instead of by
 * heuristic. Panning changes neither where the player stands nor what is open
 * to them, so it cannot produce a key change and therefore cannot produce a
 * re-fit — no "has the user panned?" flag, and no window in which the camera
 * could snap back mid-gesture. The camera moves only at moments the player
 * themselves changed the map's subject.
 *
 * `locked` nodes and walked nodes that are not a road away are deliberately NOT
 * part of the key (a walked node a road away is a legal move, so it is): they are
 * not the camera's subject, and folding them in would re-fit the view for
 * changes the player did not make to their own position or options.
 *
 * @param nodes - the exploration nodes as the presenter built them.
 * @returns a key that is equal for any two node arrays describing the same
 *   position and the same set of open steps, regardless of array identity or
 *   ordering.
 */
export function focusKeyOf(nodes: readonly ExplorationNode[]): string {
    const current = nodes.find((n) => n.kind === 'current')?.id ?? '';
    // Sorted so a reordering of the same options is NOT a change.
    const open = nodes.filter(isFocusMove).map((n) => n.id).sort();
    return `${current}|${open.join(',')}`;
}

interface FocusTransform { scale: number; tx: number; ty: number; }

/**
 * The zoom RECENTRE and a first visit use: the pane spans `RECENTRE_SPAN` of
 * the sheet's width, held between the contain floor and `MAX_SCALE`.
 */
export function recentreScale(viewport: { w: number; h: number }, size: SheetSize = LEGACY_SHEET_SIZE): number {
    const canvas = canvasSizeOf(size);
    return clampScale(viewport.w / (RECENTRE_SPAN * canvas.w), minScaleFor(viewport, size));
}

/**
 * Exported for unit coverage: the recentre framing. The player's node (the
 * `current` one) sits at the pane's centre at `recentreScale`; the open moves
 * are not framed, T asked for the player's icon (MC1b). With no current node
 * the sheet's centre is framed. No slide against the plate's edges: black past
 * an edge is allowed (T, 2026-10-31).
 */
export function computeFocusTransform(
    nodes: readonly ExplorationNode[],
    viewport: { w: number; h: number },
    size: SheetSize = LEGACY_SHEET_SIZE,
): FocusTransform {
    const canvas = canvasSizeOf(size);
    const scale = recentreScale(viewport, size);
    const current = nodes.find((n) => n.kind === 'current');
    const cx = current ? current.x * size.scale : canvas.w / 2;
    const cy = current ? current.y * size.scale : canvas.h / 2;
    return { scale, tx: viewport.w / 2 - cx * scale, ty: viewport.h / 2 - cy * scale };
}

/**
 * One axis of the move rule: the translation that keeps canvas coordinate `c`
 * inside the pane's inner `INNER_FRAME` share, moved only as far as needed.
 */
function keepInFrameAxis(t: number, c: number, scale: number, viewportLen: number): number {
    const margin = (viewportLen * (1 - INNER_FRAME)) / 2;
    const at = t + c * scale;
    if (at < margin) return margin - c * scale;
    if (at > viewportLen - margin) return viewportLen - margin - c * scale;
    return t;
}

/**
 * The move rule (MC1b A8): the same zoom, panned only if the node at canvas
 * point (`px`, `py`) is outside the pane's inner 80%, and then only enough to
 * bring it inside. A node already inside leaves the camera untouched.
 */
export function panIntoFrame(
    camera: FocusTransform,
    px: number,
    py: number,
    viewport: { w: number; h: number },
): FocusTransform {
    return {
        scale: camera.scale,
        tx: keepInFrameAxis(camera.tx, px, camera.scale, viewport.w),
        ty: keepInFrameAxis(camera.ty, py, camera.scale, viewport.h),
    };
}

/** How one edge is inked. Exported with `edgeStroke` for unit coverage. */
export interface EdgeStroke {
    color: string;
    width: number;
    opacity: number;
    /** SVG dash pattern, or `undefined` for a solid line. */
    dash: string | undefined;
    /** Whether the dark "road casing" is drawn under the stroke. */
    casing: boolean;
}

/** The palette tokens `edgeStroke` reads. Narrowed so the function stays pure. */
interface EdgePalette { parchment: string; ash: string; bone: string; }

/**
 * The ink for one edge — the whole of how the chart tells its road types
 * apart, as a pure function so it can be asserted without reading SVG.
 *
 * ── RIBS ARE NOT ROADS ──
 *
 * LATERAL LANE RIBS are sideways steps between neighbouring lanes of the
 * same column. They are traversal, not
 * progression: the engine's own route audits walk the forward skeleton and
 * deliberately ignore them (`forwardEdges()` in `world.reducer.ts`).
 *
 * Inked at the same weight as the forward roads, they would hide the spine:
 * a column of five lanes gains four ribs, the fan out of the gate before it
 * already draws five diagonals, and the chart becomes an even mesh in which
 * the spine the player is progressing along cannot be found. So a rib is drawn at
 * half the weight, without the dark casing that makes a road read as a road,
 * and finely dashed. The hierarchy on the page then matches the hierarchy in
 * the rules: solid, cased lines carry you forward; hairlines let you step
 * across.
 *
 * The three progression states are separated, and it is not
 * hue-only either: travelled is the widest and solid, open is mid-weight and
 * solid, sealed is thin and coarsely dashed.
 */
export function edgeStroke(e: ExplorationEdge, AXM: EdgePalette): EdgeStroke {
    // A blocked road (a questline's lock) draws closed: thin, dotted, ash,
    // whatever its ends are.
    if (e.blocked) {
        return { color: AXM.ash, width: 1.5, opacity: 0.6, dash: '1 6', casing: false };
    }
    const color = e.traveled ? AXM.parchment : (e.locked ? AXM.ash : AXM.bone);
    const baseWidth = e.traveled ? 3.5 : (e.locked ? 2 : 2.5);
    const baseOpacity = e.traveled ? 0.95 : 0.7;
    if (e.lateral) {
        return {
            color,
            width: baseWidth * 0.5,
            opacity: baseOpacity * 0.55,
            dash: '2 4',
            casing: false,
        };
    }
    return {
        color,
        width: baseWidth,
        opacity: baseOpacity,
        dash: e.locked ? '5 5' : undefined,
        casing: true,
    };
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The open ink of a road drawing itself open: a stroke that grows along the road's length. */
function OpeningStroke({ d, length, color, width, opacity }: { d: string; length: number; color: string; width: number; opacity: number }) {
    const progress = useSharedValue(0);
    React.useEffect(() => {
        progress.value = withTiming(1, { duration: HELD_ROAD_DRAW_MS, easing: Easing.inOut(Easing.cubic) });
    }, [progress]);
    const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));
    return (
        <AnimatedPath
            testID="map-edge-opening"
            d={d}
            stroke={color}
            strokeWidth={width}
            strokeDasharray={[length, length]}
            animatedProps={animatedProps}
            fill="none"
            opacity={opacity}
            strokeLinecap="round"
        />
    );
}

/** The dark road casing is this much wider than the stroke it sits under, in sheet units. */
const CASING_EXTRA = 3;
/** Radius of the travelled-road bead, in sheet units. */
const BEAD_RADIUS = 2.5;
/** Clear sheet units kept around a road's widest ink inside its strip, for anti-aliasing. */
const STRIP_MARGIN = 1;

/** Where one road's strip sits on the canvas. Exported with `edgeStripOf` for unit coverage. */
export interface EdgeStrip {
    /** Road length, in sheet units. */
    length: number;
    /** Sheet units from the strip's edge to the road's centre line and to each end. */
    pad: number;
    /** Clockwise rotation about the road's start, in degrees. */
    angle: number;
    /** The unrotated strip's box on the canvas, in device px at 1x zoom. */
    left: number;
    top: number;
    width: number;
    height: number;
}

/**
 * The strip one road is drawn in: a box as long as the road and only as tall
 * as its ink, laid flat and then rotated about the road's start.
 *
 * ── WHY A STRIP PER ROAD ──
 *
 * `react-native-svg` on Android rasterises every `<Svg>` into ONE ARGB bitmap
 * the size of the view (`SvgView.drawOutput`). A single SVG across the whole
 * canvas therefore costs `canvas px² × 4` bytes whatever it draws: an Act 1
 * sheet is 2400dp square, which is 92MB on a density-2 phone and 159MB at
 * density 2.625. A strip costs only the road's own area, so the roads of a
 * whole map come to a few megabytes.
 */
export function edgeStripOf(
    A: { x: number; y: number },
    B: { x: number; y: number },
    ink: EdgeStroke,
    bead: boolean,
    scale: number,
): EdgeStrip {
    const length = Math.hypot(B.x - A.x, B.y - A.y);
    const halfInk = (ink.casing ? ink.width + CASING_EXTRA : ink.width) / 2;
    const pad = Math.max(halfInk, bead ? BEAD_RADIUS : 0) + STRIP_MARGIN;
    return {
        length,
        pad,
        angle: (Math.atan2(B.y - A.y, B.x - A.x) * 180) / Math.PI,
        left: (A.x - pad) * scale,
        top: (A.y - pad) * scale,
        width: (length + pad * 2) * scale,
        height: pad * 2 * scale,
    };
}

// The map reads as a chart, not a void: a faint diagonal hatch over the
// whole sheet (drawn as strokes so no Pattern support is needed),
// cartographic contour "hills" in the dead zones, and an edge vignette. All tokenized; the hatch and hills are skipped
// when the sheet sets `chartTexture: false`.
const HATCH_STEP = 18;

/**
 * 45° hatch lines across a sheet: sweep the x-intercept from -height (a line
 * entering from the left edge) to width.
 */
export function hatchLines(width: number, height: number): string[] {
    const lines: string[] = [];
    for (let x0 = -height; x0 <= width; x0 += HATCH_STEP) {
        lines.push(`M ${x0} 0 L ${x0 + height} ${height}`);
    }
    return lines;
}

/** Nested contour rings — hand-authored cartographic hills on a 360×400 sheet, scaled to the map's sheet. */
const CONTOUR_GROUPS: readonly string[][] = [
    [
        'M40 250 q 20 -22 44 -10 q 12 14 -10 20 q -26 4 -34 -10 z',
        'M50 252 q 14 -14 28 -6 q 8 9 -7 13 q -16 3 -21 -7 z',
    ],
    [
        'M250 280 q 30 -22 62 -6 q 10 20 -20 24 q -40 -2 -42 -18 z',
        'M262 282 q 20 -13 40 -4 q 6 12 -13 15 q -25 -1 -27 -11 z',
    ],
    [
        'M282 74 q 18 -16 38 -6 q 8 12 -12 16 q -22 2 -26 -10 z',
    ],
];

/**
 * One node's halo, in its own SVG no larger than the halo (see `edgeStripOf`).
 * `cx`/`cy`/`r` are sheet units. `counterScale` grows it with the node mark it
 * pools under (`nodeCounterScale`), about its centre.
 */
function NodeHalo({ cx, cy, r, scale, color, counterScale }: {
    cx: number; cy: number; r: number; scale: number; color: string;
    counterScale: React.ComponentProps<typeof Animated.View>['style'];
}) {
    const side = r * 2 * scale;
    return (
        <Animated.View
            style={[{ position: 'absolute', left: (cx - r) * scale, top: (cy - r) * scale, width: side, height: side }, counterScale]}
        >
            <Svg
                viewBox={`0 0 ${r * 2} ${r * 2}`}
                width={side}
                height={side}
            >
                <Defs>
                    <RadialGradient id="axmNodeHalo" cx="50%" cy="50%" r="50%">
                        <Stop offset="40%" stopColor={color} stopOpacity={0.85} />
                        <Stop offset="100%" stopColor={color} stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Circle cx={r} cy={r} r={r} fill="url(#axmNodeHalo)" />
            </Svg>
        </Animated.View>
    );
}

/**
 * The engraving plate. With a faded copy (`sheet.fadedBackdrop`) its rim
 * dissolves into the fog behind it (T, 2026-11-01): the copy is drawn twice,
 * once tinted to the old near-black ground at full strength and once at the
 * plate's own opacity over it, so a dimmed plate keeps its contrast in the
 * middle and only the rim gives way to fog. Without one, the plate keeps its
 * hard edge on a solid ground. Plain images, not an SVG mask: a mask across
 * the 2400dp sheet would rasterise to hundreds of MB on Android (see
 * `MapCanvas.raster.test.tsx`).
 */
function Plate({ sheet, ground }: { sheet: MapSheet; ground: string }) {
    if (sheet.fadedBackdrop == null) {
        return (
            <>
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: ground }]} />
                <Image
                    source={sheet.backdrop}
                    style={[StyleSheet.absoluteFillObject, { opacity: sheet.plateOpacity }]}
                    contentFit="cover"
                    testID="map-backdrop"
                />
            </>
        );
    }
    return (
        <>
            <Image source={sheet.fadedBackdrop} style={StyleSheet.absoluteFillObject} contentFit="cover" tintColor={ground} testID="map-backdrop-ground" />
            <Image
                source={sheet.fadedBackdrop}
                style={[StyleSheet.absoluteFillObject, { opacity: sheet.plateOpacity }]}
                contentFit="cover"
                testID="map-backdrop"
            />
        </>
    );
}

/** One fog tile's side, in pane px. */
const FOG_TILE = 512;

/**
 * One drifting fog layer: a grid of tiles one tile wider than the pane, slid
 * one whole tile to the right per loop, starting a tile left of the pane, so
 * the wrap is seamless and the layer always covers the pane (T, 2026-11-01:
 * always moving, never a gap). It sits under the plate, so it drifts only
 * past the plate's edge. Only a transform animates, on the UI thread;
 * nothing is redrawn per frame.
 */
function FogDrift({ viewport, tile, ms, opacity, still }: {
    viewport: { w: number; h: number }; tile: number; ms: number; opacity: number; still: boolean;
}) {
    const t = useSharedValue(0);
    React.useEffect(() => {
        if (still) return;
        t.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false);
        return () => cancelAnimation(t);
    }, [still, ms, t]);
    const slide = useAnimatedStyle(() => ({
        transform: [{ translateX: (t.value - 1) * tile }],
    }));
    const cols = Math.ceil(viewport.w / tile) + 1;
    const rows = Math.ceil(viewport.h / tile);
    return (
        <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', left: 0, top: 0, width: cols * tile, height: rows * tile, flexDirection: 'row', flexWrap: 'wrap', opacity }, slide]}
        >
            {Array.from({ length: cols * rows }, (_, i) => (
                <Image key={i} source={MAP_FOG.drift} style={{ width: tile, height: tile }} contentFit="fill" />
            ))}
        </Animated.View>
    );
}

export function MapCanvas({ nodes, edges, sheet, overlays, mapId, children }: MapCanvasProps) {
    const styles = useStyles();
    const AXM = usePalette();
    const size: SheetSize = sheet ?? LEGACY_SHEET_SIZE;
    const canvas = canvasSizeOf(size);
    const chartTexture = sheet?.chartTexture ?? true;
    const nodeHalo = sheet?.nodeHalo ?? false;
    // A halo reaches a little past the node glyph, in sheet units.
    const haloRadius = NODE_SIZE / size.scale;
    const hatch = React.useMemo(() => hatchLines(size.width, size.height), [size.width, size.height]);
    const instant = resolveJuiceMode({ reducedMotion: useReducedMotion() }) === 'instant';
    const opening = useOpeningRoads(edges, instant);
    const nodeById = React.useMemo(() => {
        const m = new Map<string, ExplorationNode>();
        for (const n of nodes) m.set(n.id, n);
        return m;
    }, [nodes]);

    // Pinch + pan over the map view (Q2=B). Reanimated shared values
    // drive a single transform; gestures compose simultaneously so the
    // user can zoom and drag at once.
    const scale = useSharedValue(1);
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);

    const [viewport, setViewport] = React.useState<{ w: number; h: number } | null>(null);
    const onWrapLayout = React.useCallback(
        (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
            const { width, height } = e.nativeEvent.layout;
            if (width === 0) return;
            setViewport((prev) => prev ?? { w: width, h: height });
        },
        [],
    );

    /**
     * Commit a camera transform to every shared value at once.
     *
     * Both the automatic fit and the manual RECENTRE go through here, so the
     * two can never drift into different ideas of what "framed on the player"
     * means.
     */
    const commitCamera = React.useCallback((fit: FocusTransform) => {
        scale.value = fit.scale;
        tx.value = fit.tx;
        ty.value = fit.ty;
    }, [scale, tx, ty]);

    /**
     * RECENTRE — the drag affordance's missing return leg.
     *
     * The chart is far larger than a phone-sized window, and the pan lets a
     * plate edge come as far as the middle of the pane, so a player who drags
     * to look down a side strand can end up holding a blank corner of the
     * sheet. With lateral ribs and frontier roaming, looking sideways is the
     * point, so looking sideways has to be undoable in one tap.
     *
     * It puts the player's icon at the pane's centre at the recentre zoom,
     * the same framing a first visit opens with, so it needs no geometry of
     * its own and cannot disagree with the opening camera.
     */
    const recenter = React.useCallback(() => {
        if (!viewport || nodes.length === 0) return;
        commitCamera(computeFocusTransform(nodes, viewport, size));
    }, [viewport, nodes, size, commitCamera]);

    // The camera's framing (MC1b). Three moments, all keyed on the player's
    // own node so a pan can never be fought (issue #294):
    //   - the first time the pane is measured, or `mapId` changes under a
    //     still-mounted canvas (crossing to another map in place, same
    //     screen): the camera that map was left at (memory), else the
    //     recentre framing; then the move rule, in case the player now
    //     stands off-frame (a fight's win moved them on);
    //   - the player's node changing later on the SAME map: the same zoom,
    //     panned only if the new node is outside the inner 80% of the pane;
    //   - never on a re-measure of the pane (MC1c owns the pane's relayout).
    const currentId = nodes.find((n) => n.kind === 'current')?.id ?? '';
    const framed = React.useRef(false);
    const lastCurrent = React.useRef<string | null>(null);
    const lastMapId = React.useRef<string | undefined>(undefined);
    React.useEffect(() => {
        if (!viewport || nodes.length === 0) return;
        const current = nodes.find((n) => n.kind === 'current');
        const px = current ? current.x * size.scale : canvas.w / 2;
        const py = current ? current.y * size.scale : canvas.h / 2;
        const crossedMap = framed.current && mapId !== lastMapId.current;
        if (!framed.current || crossedMap) {
            framed.current = true;
            lastCurrent.current = currentId;
            lastMapId.current = mapId;
            const remembered = mapId ? recallCamera(mapId) : undefined;
            if (!remembered) {
                commitCamera(computeFocusTransform(nodes, viewport, size));
                return;
            }
            const sc = clampScale(remembered.scale, minScaleFor(viewport, size));
            const restored = {
                scale: sc,
                tx: viewport.w / 2 - remembered.cx * sc,
                ty: viewport.h / 2 - remembered.cy * sc,
            };
            commitCamera(current ? panIntoFrame(restored, px, py, viewport) : restored);
            return;
        }
        if (lastCurrent.current === currentId) return;
        lastCurrent.current = currentId;
        commitCamera(panIntoFrame(
            { scale: scale.value, tx: tx.value, ty: ty.value },
            px, py, viewport,
        ));
        // `nodes` is deliberately NOT a dependency: it is a fresh array every
        // render. `currentId` is the stable projection of what the camera follows.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewport, currentId, mapId, size.width, size.height, size.scale, commitCamera]);

    // Remember the camera as the map unmounts (a fight, a rest, a hazard): the
    // canvas point at the pane's centre, so it survives a pane of another size.
    const viewportRef = React.useRef(viewport);
    viewportRef.current = viewport;
    React.useEffect(() => () => {
        const vp = viewportRef.current;
        if (!mapId || !vp || !framed.current) return;
        const sc = scale.value;
        rememberCamera(mapId, {
            scale: sc,
            cx: (vp.w / 2 - tx.value) / sc,
            cy: (vp.h / 2 - ty.value) / sc,
        });
    }, [mapId, scale, tx, ty]);

    // Every gesture works in DELTAS from its last event, so pinch and pan
    // compose without either replaying its whole translation over the
    // other's. The pinch and the wheel move the translation by the anchor
    // alone (`anchorAxis`): no edge clamp, so the point under the fingers
    // stays under them, black past the plate's edge included. Only the pan's
    // own delta is limited (`panAxis`).
    //
    // The detector sits on the untransformed gesture pane (see the JSX), so on
    // a device `focalX/Y` arrive in pane coordinates: native RNGH reports them
    // relative to the view the detector is attached to. Web RNGH does not: its
    // pinch averages the pointers' PAGE coordinates, so on web the pane's page
    // origin (`focalOrigin`, read on every pointer-down) is taken off first.
    // Both platforms then feed the anchor the same pane point.
    //
    // The pane and plate sizes ride in a shared value, not the callbacks'
    // closures: a handler built before the first layout must not read a
    // zero-sized pane.
    const bounds = useSharedValue({ vw: 0, vh: 0, cw: canvas.w, ch: canvas.h, min: 1 });
    React.useEffect(() => {
        bounds.value = {
            vw: viewport?.w ?? 0,
            vh: viewport?.h ?? 0,
            cw: canvas.w,
            ch: canvas.h,
            min: viewport ? minScaleFor(viewport, size) : 1,
        };
    }, [bounds, viewport, canvas.w, canvas.h, size]);
    // `pinching` is true only while TWO pointers drive the pinch; then its
    // focal point carries the drag and the pan stands down. A pinch event with
    // fewer pointers (a finger lifted mid-pinch: the focal point jumps to the
    // finger left down) moves nothing and asks for a rebase, so the next
    // two-pointer event, and the pan's next event, start from where the
    // fingers are instead of replaying the jump.
    const pinching = useSharedValue(false);
    const pinchRebase = useSharedValue(false);
    const panRebase = useSharedValue(false);
    const lastFocalX = useSharedValue(0);
    const lastFocalY = useSharedValue(0);
    const lastPinchScale = useSharedValue(1);
    const focalOrigin = useSharedValue({ x: 0, y: 0 });
    const pinch = Gesture.Pinch()
        .withTestId('map-pinch')
        .onStart((e) => {
            const two = (e.numberOfPointers ?? 2) >= 2;
            pinching.value = two;
            pinchRebase.value = !two;
            lastFocalX.value = e.focalX - focalOrigin.value.x;
            lastFocalY.value = e.focalY - focalOrigin.value.y;
            lastPinchScale.value = e.scale;
        })
        .onUpdate((e) => {
            const fx = e.focalX - focalOrigin.value.x;
            const fy = e.focalY - focalOrigin.value.y;
            if ((e.numberOfPointers ?? 2) < 2) {
                pinching.value = false;
                pinchRebase.value = true;
                panRebase.value = true;
                return;
            }
            if (pinchRebase.value) {
                pinching.value = true;
                pinchRebase.value = false;
                panRebase.value = true;
                lastFocalX.value = fx;
                lastFocalY.value = fy;
                lastPinchScale.value = e.scale;
                return;
            }
            const s = scale.value;
            const step = lastPinchScale.value > 0 ? e.scale / lastPinchScale.value : 1;
            const next = clampScale(s * step, bounds.value.min);
            const k = next / s;
            scale.value = next;
            tx.value = anchorAxis(tx.value, lastFocalX.value, fx, k);
            ty.value = anchorAxis(ty.value, lastFocalY.value, fy, k);
            lastFocalX.value = fx;
            lastFocalY.value = fy;
            lastPinchScale.value = e.scale;
        })
        .onFinalize(() => {
            // Only a pinch that actually held two fingers hands the pan a
            // rebase; a one-finger touch the pinch never claimed (it fails
            // straight from BEGAN) must not cost the drag its first step.
            if (pinching.value || pinchRebase.value) panRebase.value = true;
            pinching.value = false;
            pinchRebase.value = false;
        });

    // `withTestId` is RNGH's own test affordance, inert in production — it
    // lets the suite drive a real pan and then prove the focus re-fit does
    // not undo it (issue #294).
    const lastPanX = useSharedValue(0);
    const lastPanY = useSharedValue(0);
    const pan = Gesture.Pan()
        .withTestId('map-pan')
        .onBegin(() => {
            lastPanX.value = 0;
            lastPanY.value = 0;
            panRebase.value = false;
        })
        .onUpdate((e) => {
            const dx = e.translationX - lastPanX.value;
            const dy = e.translationY - lastPanY.value;
            lastPanX.value = e.translationX;
            lastPanY.value = e.translationY;
            // While two fingers pinch, the pinch's focal point carries the drag.
            if (pinching.value) return;
            // The first step after a pinch is a rebase, never a move.
            if (panRebase.value) {
                panRebase.value = false;
                return;
            }
            const b = bounds.value;
            tx.value = panAxis(tx.value, dx, b.vw, b.cw * scale.value);
            ty.value = panAxis(ty.value, dy, b.vh, b.ch * scale.value);
        });

    const composed = Gesture.Simultaneous(pinch, pan);

    // Web: a mouse has no pinch, so the wheel zooms (a trackpad pinch arrives
    // as ctrl+wheel and lands here too). Anchored at the cursor: with the
    // canvas's top-left transform origin a screen point is `t + s·c`, so
    // holding it fixed across s→s' gives t' = p − (s'/s)(p − t).
    const wrapRef = React.useRef<View>(null);
    React.useEffect(() => {
        if (Platform.OS !== 'web') return;
        const el = wrapRef.current as unknown as HTMLElement | null;
        if (!el?.addEventListener) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const s = scale.value;
            const next = clampScale(s * Math.exp(-e.deltaY * 0.0015), bounds.value.min);
            const k = next / s;
            scale.value = next;
            tx.value = anchorAxis(tx.value, px, px, k);
            ty.value = anchorAxis(ty.value, py, py, k);
        };
        // Capture phase on the wrapper, so the pane's page origin is current
        // before the gesture handler below it reads the pointer.
        const onDown = () => {
            const rect = el.getBoundingClientRect();
            focalOrigin.value = { x: rect.left, y: rect.top };
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        el.addEventListener('pointerdown', onDown, true);
        return () => {
            el.removeEventListener('wheel', onWheel);
            el.removeEventListener('pointerdown', onDown, true);
        };
    }, [bounds, scale, tx, ty, focalOrigin]);

    const mapTransform = useAnimatedStyle(() => ({
        transform: [
            { translateX: tx.value },
            { translateY: ty.value },
            { scale: scale.value },
        ],
    }));
    // Node marks (and their halos) hold a usable screen size at any zoom.
    const markerCounterScale = useAnimatedStyle(() => ({
        transform: [{ scale: nodeCounterScale(scale.value) }], // worklet-safe: nodeCounterScale is a worklet
    }));

    return (
        <View ref={wrapRef} style={styles.graphWrap} onLayout={onWrapLayout} testID="map-canvas-wrapper">
            {/* The fog past the plate's edge, fixed to the screen: a still fog
                plate, and over a sheet two drift layers sliding right, the
                larger, nearer one faster (stopped under reduced motion). The
                plate covers them, so the drift shows only past its rim. */}
            <View style={[StyleSheet.absoluteFillObject, styles.graphBackground]} pointerEvents="none">
                <Image source={MAP_FOG.still} style={StyleSheet.absoluteFillObject} contentFit="cover" testID="map-fog" />
                {sheet != null && viewport != null && (
                    <>
                        <FogDrift viewport={viewport} tile={FOG_TILE} ms={100000} opacity={0.5} still={instant} />
                        <FogDrift viewport={viewport} tile={FOG_TILE * 1.6} ms={80000} opacity={0.35} still={instant} />
                    </>
                )}
            </View>

            {/* The gesture pane: an UNTRANSFORMED layer that fills the
                wrapper and holds the canvas. The detector is attached here,
                never to the transformed canvas: RNGH reports `focalX/Y` and
                the pan's translation relative to the view it is attached to,
                so on this layer they are pane coordinates, the frame the
                anchor math is written in. On the canvas they would be the
                canvas's own scaled, moving frame, and every zoom step would
                move the frame of the next reading (the device jump #1046
                left behind). A drag that starts on the black past the
                plate's edge lands here too. */}
            <GestureDetector gesture={composed}>
                <View
                    testID="map-gesture-pane"
                    collapsable={false}
                    style={StyleSheet.absoluteFillObject}
                >
                    <Animated.View
                        testID="map-canvas"
                        style={[styles.canvas, { width: canvas.w, height: canvas.h }, mapTransform]}
                    >
                        {/* The engraving plate — pans and zooms with the chart so the
                            wood feels painted onto the page. An atmosphere plate is
                            dimmed so roads and nodes keep contrast (dim, never blur);
                            a plate that is the map itself reads near full. Its rim
                            fades into the fog (`Plate`).
                            Wrapped pointerEvents="none" so a mouse drag that starts
                            on the plate's image never fires the browser's image
                            drag-and-drop, which would cancel the pan's pointer
                            stream — the map would not move. */}
                        {sheet != null && (
                            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                                <Plate sheet={sheet} ground={AXM.deepBg} />
                            </View>
                        )}
                        {/* The chart sheet: diagonal hatch + contour hills under the
                            roads — only over an atmosphere plate, never over a plate
                            that draws its own terrain. This is the one canvas-wide
                            SVG left, so it is mounted only when a sheet asks for it. */}
                        {chartTexture && (
                            <Svg
                                viewBox={`0 0 ${size.width} ${size.height}`}
                                width={canvas.w}
                                height={canvas.h}
                                style={StyleSheet.absoluteFillObject}
                                pointerEvents="none"
                                testID="map-chart-texture"
                            >
                                <G stroke={AXM.parchment} strokeWidth={0.4} opacity={0.05}>
                                    {hatch.map((d) => (
                                        <Path key={d} d={d} fill="none" />
                                    ))}
                                </G>
                                {CONTOUR_GROUPS.map((group, gi) => (
                                    <G
                                        key={gi}
                                        opacity={0.45}
                                        stroke={AXM.ash}
                                        strokeWidth={1}
                                        fill="none"
                                        transform={`scale(${size.width / 360} ${size.height / 400})`}
                                    >
                                        {group.map((d) => (
                                            <Path key={d} d={d} />
                                        ))}
                                    </G>
                                ))}
                            </Svg>
                        )}
                        {/* Roads: straight node-to-node paths so the graph reads as a
                            connected route, each in its own strip (see `edgeStripOf`).
                            A dark casing under the stroke gives each path a defined
                            "road" edge. */}
                        {edges.map((e) => {
                            const A = nodeById.get(e.fromId);
                            const B = nodeById.get(e.toId);
                            if (!A || !B) return null;
                            // A road drawing itself open sits closed underneath while its open
                            // ink grows over it; the base lands open when the draw ends.
                            const drawing = opening.has(edgeKey(e));
                            const ink = edgeStroke(drawing ? { ...e, locked: true } : e, AXM);
                            const openInk = drawing ? edgeStroke(e, AXM) : null;
                            // The travelled-road bead marks progression, so a rib
                            // never wears one even once both its lanes are spent.
                            const bead = e.traveled && !e.lateral;
                            const strip = edgeStripOf(A, B, ink, bead, size.scale);
                            const pivot = strip.pad * size.scale;
                            const d = `M ${strip.pad} ${strip.pad} L ${strip.pad + strip.length} ${strip.pad}`;
                            return (
                                <View
                                    key={`${e.fromId}|${e.toId}`}
                                    pointerEvents="none"
                                    testID="map-edge"
                                    style={[
                                        styles.edgeStrip,
                                        {
                                            left: strip.left,
                                            top: strip.top,
                                            width: strip.width,
                                            height: strip.height,
                                            transformOrigin: `${pivot}px ${pivot}px`,
                                            transform: [{ rotate: `${strip.angle}deg` }],
                                        },
                                    ]}
                                >
                                    <Svg
                                        viewBox={`0 0 ${strip.length + strip.pad * 2} ${strip.pad * 2}`}
                                        width={strip.width}
                                        height={strip.height}
                                    >
                                        {ink.casing && (
                                            <Path d={d} stroke={AXM.deepBg} strokeWidth={ink.width + CASING_EXTRA} fill="none" opacity={0.95} strokeLinecap="round" />
                                        )}
                                        <Path
                                            d={d}
                                            stroke={ink.color}
                                            strokeWidth={ink.width}
                                            strokeDasharray={ink.dash}
                                            fill="none"
                                            opacity={ink.opacity}
                                            strokeLinecap="round"
                                        />
                                        {openInk !== null && (
                                            <OpeningStroke d={d} length={strip.length} color={openInk.color} width={openInk.width} opacity={openInk.opacity} />
                                        )}
                                        {bead && (
                                            <Circle cx={strip.pad + strip.length / 2} cy={strip.pad} r={BEAD_RADIUS} fill={AXM.sulfur} />
                                        )}
                                    </Svg>
                                </View>
                            );
                        })}
                        {/* Node halos over the roads and under the glyphs: a dark
                            pool that clears a dense plate's linework from around
                            each mark, so the mark reads as a mark. A node wearing
                            its kind token gets none: the opaque token covers the
                            roads itself. */}
                        {nodeHalo && (
                            <View style={StyleSheet.absoluteFillObject} pointerEvents="none" testID="map-node-halos">
                                {nodes.filter((n) => n.showKind !== true).map((n) => (
                                    <NodeHalo key={n.id} cx={n.x} cy={n.y} r={haloRadius} scale={size.scale} color={AXM.deepBg} counterScale={markerCounterScale} />
                                ))}
                            </View>
                        )}

                        <MapSheetContext.Provider value={size}>
                            <MapCameraContext.Provider value={scale}>{children}</MapCameraContext.Provider>
                        </MapSheetContext.Provider>
                    </Animated.View>
                </View>
            </GestureDetector>

            {/* Viewport-fixed chart furniture — never pans with the map.
                Sized explicitly: an SVG with no width/height falls back to
                300×150 on web and draws this vignette as a dark box in the
                chart's top-left corner. */}
            <Svg
                width="100%"
                height="100%"
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
                testID="map-vignette"
            >
                <Defs>
                    <RadialGradient id="axmMapVignette" cx="50%" cy="50%" rx="72%" ry="66%">
                        <Stop offset="55%" stopColor={AXM.deepBg} stopOpacity={0} />
                        <Stop offset="100%" stopColor={AXM.deepBg} stopOpacity={0.6} />
                    </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#axmMapVignette)" />
            </Svg>
            {/* Viewport-fixed overlays (legend etc.) — pointerEvents none so
                they never swallow a pan that starts over them. */}
            {overlays != null && (
                <View style={StyleSheet.absoluteFillObject} pointerEvents="none" testID="map-overlays-fixed">
                    {overlays}
                </View>
            )}
            {/* RECENTRE — the one piece of chart furniture that takes a touch.
                Rendered AFTER the pointerEvents="none" overlay layer so the
                legend can never sit on top of it. */}
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Recentre the chart on your position"
                accessibilityHint="Frames where you stand and every path open to you"
                onPress={recenter}
                hitSlop={8}
                style={styles.recenter}
                testID="map-recenter"
            >
                <Text style={styles.recenterGlyph}>◎</Text>
            </Pressable>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    graphWrap: {
        marginHorizontal: 10,
        marginVertical: 6,
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
    },
    canvas: {
        position: 'absolute',
        top: 0,
        left: 0,
        // `computeFocusTransform`'s tx/ty pivot the scale around the canvas's
        // own TOP-LEFT corner. The platform default pivots around the CENTER
        // instead, which is invisible whenever scale lands at 1 (desktop
        // always does — `Math.min(1, …)` caps it) but throws the whole canvas
        // off-frame the moment a narrow viewport clamps to MIN_SCALE.
        transformOrigin: '0 0',
    },
    graphBackground: {
        backgroundColor: AXM.deepBg,
    },
    // The chart's one instrument, pinned in its bottom-right corner.
    recenter: {
        position: 'absolute',
        right: 10,
        bottom: 10,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: 'rgba(10,10,10,0.72)',
        zIndex: 4,
    },
    recenterGlyph: {
        fontFamily: FONTS.mono,
        fontSize: 15,
        lineHeight: 18,
        color: AXM.bone,
    },
    edgeStrip: {
        position: 'absolute',
    },
}));