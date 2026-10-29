import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import Svg, { Path, Circle, G, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { Image } from '@/lib/platform/image';
import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import type { ExplorationNode, ExplorationEdge } from '@/state/presenters/exploration.engine';
import type { MapSheet } from '@/state/exploration-maps';
import { LEGACY_SHEET_SIZE } from '@/state/exploration-maps/sheet';
import { MapCameraContext, MapSheetContext, type SheetSize } from './mapSheetContext';
import { NODE_SIZE, nodeCounterScale } from './ExplorationNode';

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

const MAX_SCALE = 3;

/**
 * The zoom-out floor for this sheet in this viewport: the scale at which the
 * plate just COVERS the pane, so the map always fills the screen and never
 * shows black around it (T, 2026-10-28: "the screen would always be the map").
 *
 * Exported for unit coverage; the fit, the pinch and the wheel share it.
 */
export function minScaleFor(viewport: { w: number; h: number }, size: SheetSize = LEGACY_SHEET_SIZE): number {
    'worklet';
    const canvas = canvasSizeOf(size);
    return Math.max(viewport.w / canvas.w, viewport.h / canvas.h);
}

// The camera fits the whole focus bounding box in frame, zooming out (never
// in — a lone node shouldn't get punched in past 1x) just enough that every
// currently-open node starts visible, even on a branch wider than the
// viewport.
const FIT_PADDING = 40;

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
 * `completed` and `locked` nodes are deliberately NOT part of the key: they are
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
    const open = nodes.filter((n) => n.kind === 'available').map((n) => n.id).sort();
    return `${current}|${open.join(',')}`;
}

interface FocusTransform { scale: number; tx: number; ty: number; }

/**
 * Settle one axis of the camera against the plate's edges.
 *
 * Centring on the focus nodes alone can pull the plate's edge into the frame:
 * a node set near the top of a tall plate drops the plate a fifth of a phone
 * down and leaves flat black above it, with nothing there to drag to. A plate
 * that covers the axis at this scale is slid back until it meets the frame's
 * edge; one that does not is centred, so its margin splits evenly.
 *
 * Never takes a focus node off-screen: every node lies on the plate, and the
 * slide only moves plate that was already past the frame's edge. The pinch,
 * pan and wheel clamp through it too, so no gesture can drag black in.
 */
function settleAxis(t: number, viewportLen: number, canvasLen: number): number {
    'worklet';
    if (canvasLen <= viewportLen) return (viewportLen - canvasLen) / 2;
    return Math.min(0, Math.max(viewportLen - canvasLen, t));
}

/** Exported for unit coverage — the pure math behind the initial camera fit. */
export function computeFocusTransform(
    nodes: readonly ExplorationNode[],
    viewport: { w: number; h: number },
    size: SheetSize = LEGACY_SHEET_SIZE,
): FocusTransform {
    const canvas = canvasSizeOf(size);
    const focus = nodes.filter((n) => n.kind === 'available' || n.kind === 'current');
    if (focus.length === 0) {
        const s = Math.max(1, minScaleFor(viewport, size));
        return { scale: s, tx: (viewport.w - canvas.w * s) / 2, ty: (viewport.h - canvas.h * s) / 2 };
    }

    const xs = focus.map((n) => n.x * size.scale);
    const ys = focus.map((n) => n.y * size.scale);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const fitScaleX = bboxW > 0 ? (viewport.w - FIT_PADDING * 2) / bboxW : MAX_SCALE;
    const fitScaleY = bboxH > 0 ? (viewport.h - FIT_PADDING * 2) / bboxH : MAX_SCALE;
    const scale = Math.max(minScaleFor(viewport, size), Math.min(1, fitScaleX, fitScaleY));

    return {
        scale,
        tx: settleAxis(viewport.w / 2 - cx * scale, viewport.w, canvas.w * scale),
        ty: settleAxis(viewport.h / 2 - cy * scale, viewport.h, canvas.h * scale),
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

export function MapCanvas({ nodes, edges, sheet, overlays, children }: MapCanvasProps) {
    const styles = useStyles();
    const AXM = usePalette();
    const size: SheetSize = sheet ?? LEGACY_SHEET_SIZE;
    const canvas = canvasSizeOf(size);
    const chartTexture = sheet?.chartTexture ?? true;
    const nodeHalo = sheet?.nodeHalo ?? false;
    // A halo reaches a little past the node glyph, in sheet units.
    const haloRadius = NODE_SIZE / size.scale;
    const hatch = React.useMemo(() => hatchLines(size.width, size.height), [size.width, size.height]);
    const nodeById = React.useMemo(() => {
        const m = new Map<string, ExplorationNode>();
        for (const n of nodes) m.set(n.id, n);
        return m;
    }, [nodes]);

    // Pinch + pan over the map view (Q2=B). Reanimated shared values
    // drive a single transform; gestures compose simultaneously so the
    // user can zoom and drag at once.
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);

    // Open the map framed on the nodes the player can actually act on
    // right now — the current position plus its available next steps —
    // rather than the geometric middle of the (much larger) spread
    // canvas. We measure the viewport on layout, then centre once both
    // the viewport and the node set are available.
    /**
     * The identity of the camera's SUBJECT — where the player stands plus the
     * steps open from there — as a stable string.
     *
     * The camera re-fits whenever this changes, so after a move the newly
     * opened branch is framed. Keying the fit on THIS rather than on `nodes`
     * keeps it safe: `nodes` is a fresh array every render, while this key
     * changes only when the player's actual position or set of options
     * changes. See the effect below for why that matters.
     */
    const focusKey = React.useMemo(() => focusKeyOf(nodes), [nodes]);
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
     * means — and, just as importantly, both write `savedScale` as well.
     */
    const commitCamera = React.useCallback((fit: FocusTransform) => {
        scale.value = fit.scale;
        savedScale.value = fit.scale;
        tx.value = fit.tx;
        ty.value = fit.ty;
    }, [scale, savedScale, tx, ty]);

    /**
     * RECENTRE — the drag affordance's missing return leg.
     *
     * The chart is far larger than a phone-sized window and the pan is
     * unbounded, so a player who drags to look down a side strand can end up
     * holding a blank corner of the sheet with no way back except guessing.
     * With lateral ribs and frontier roaming, looking sideways is the point,
     * so looking sideways has to be undoable.
     *
     * It re-runs the SAME fit the camera performs on mount and whenever the
     * road ahead changes, which is why it needs no geometry of its own and
     * cannot disagree with the automatic camera. Chosen over clamping the pan
     * because a clamp has to model where the scaled canvas actually sits on
     * screen, and this file's fit math and React Native's transform origin do
     * not currently agree about that; a wrong clamp fights the player's drag
     * on every gesture, whereas a redundant recentre costs one tap.
     */
    const recenter = React.useCallback(() => {
        if (!viewport || nodes.length === 0) return;
        commitCamera(computeFocusTransform(nodes, viewport, size));
    }, [viewport, nodes, size, commitCamera]);

    React.useEffect(() => {
        if (!viewport || nodes.length === 0) return;
        // The choosable nodes: where the player stands + the steps they
        // can take from here, fit whole into frame (zoomed out if a wide
        // branch demands it) rather than just centred at 1x.
        //
        // This runs on every CHANGE OF `focusKey` — not once, and not on every
        // render. That distinction is the whole design, because it has to
        // satisfy two requirements at once:
        //
        //   - The camera must re-fit when the road ahead changes, or the
        //     player's onward choices sit off-screen after a move.
        //   - The camera must NOT fight a player who is panning to look
        //     around (issue #294).
        //
        // Keying on `focusKey` satisfies both structurally rather than by
        // heuristic: panning does not change where the player stands or what
        // is open to them, so it cannot produce a re-fit — no "has the user
        // panned?" flag is needed, and there is no window in which the camera
        // could snap back mid-gesture. The camera moves only at the moments the
        // player themselves changed the map's subject.
        commitCamera(computeFocusTransform(nodes, viewport, size));
        // `nodes` is deliberately NOT a dependency — it is a fresh array every
        // render, and depending on it would re-fit constantly and fight the
        // player's pan (issue #294). `focusKey` is its stable projection.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewport, focusKey, size.width, size.height, size.scale, commitCamera]);

    // Every gesture works in DELTAS from its last event and clamps through
    // `settleAxis`, so pinch and pan compose without either replaying its
    // whole translation over the other's, and the plate always covers the
    // pane. With the canvas's top-left transform origin a screen point is
    // `t + s·c`; holding the pinch's focal point fixed across s→s' while it
    // moves f→f' gives t' = f' − (s'/s)(f − t).
    //
    // The pane and plate sizes ride in a shared value, not the callbacks'
    // closures: a handler built before the first layout must not clamp
    // against a zero-sized pane.
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
    const pinching = useSharedValue(false);
    const lastFocalX = useSharedValue(0);
    const lastFocalY = useSharedValue(0);
    const pinch = Gesture.Pinch()
        .withTestId('map-pinch')
        .onStart((e) => {
            pinching.value = true;
            savedScale.value = scale.value;
            lastFocalX.value = e.focalX;
            lastFocalY.value = e.focalY;
        })
        .onUpdate((e) => {
            const s = scale.value;
            const b = bounds.value;
            const next = Math.min(MAX_SCALE, Math.max(b.min, savedScale.value * e.scale));
            const k = next / s;
            scale.value = next;
            tx.value = settleAxis(e.focalX - k * (lastFocalX.value - tx.value), b.vw, b.cw * next);
            ty.value = settleAxis(e.focalY - k * (lastFocalY.value - ty.value), b.vh, b.ch * next);
            lastFocalX.value = e.focalX;
            lastFocalY.value = e.focalY;
        })
        .onFinalize(() => {
            pinching.value = false;
            savedScale.value = scale.value;
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
        })
        .onUpdate((e) => {
            const dx = e.translationX - lastPanX.value;
            const dy = e.translationY - lastPanY.value;
            lastPanX.value = e.translationX;
            lastPanY.value = e.translationY;
            // While two fingers pinch, the pinch's focal point carries the drag.
            if (pinching.value) return;
            const b = bounds.value;
            tx.value = settleAxis(tx.value + dx, b.vw, b.cw * scale.value);
            ty.value = settleAxis(ty.value + dy, b.vh, b.ch * scale.value);
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
            const b = bounds.value;
            const next = Math.min(MAX_SCALE, Math.max(b.min, s * Math.exp(-e.deltaY * 0.0015)));
            const k = next / s;
            scale.value = next;
            savedScale.value = next;
            tx.value = settleAxis(px - k * (px - tx.value), b.vw, b.cw * next);
            ty.value = settleAxis(py - k * (py - ty.value), b.vh, b.ch * next);
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [bounds, scale, savedScale, tx, ty]);

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
            <View style={[StyleSheet.absoluteFillObject, styles.graphBackground]} />

            <GestureDetector gesture={composed}>
                <Animated.View
                    testID="map-canvas"
                    style={[styles.canvas, { width: canvas.w, height: canvas.h }, mapTransform]}
                >
                    {/* The engraving plate — pans and zooms with the chart so the
                        wood feels painted onto the page. An atmosphere plate is
                        dimmed so roads and nodes keep contrast (dim, never blur);
                        a plate that is the map itself reads near full.
                        Wrapped pointerEvents="none": on web `expo-image` is a
                        native <img>, and a mouse drag that starts on it fires
                        the browser's image drag-and-drop, which cancels the
                        pan's pointer stream — the map would not move. */}
                    {sheet != null && (
                        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                            <Image
                                source={sheet.backdrop}
                                style={[styles.backdropPlate, { opacity: sheet.plateOpacity }]}
                                contentFit="cover"
                                testID="map-backdrop"
                            />
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
                        const ink = edgeStroke(e, AXM);
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
                                    {bead && (
                                        <Circle cx={strip.pad + strip.length / 2} cy={strip.pad} r={BEAD_RADIUS} fill={AXM.sulfur} />
                                    )}
                                </Svg>
                            </View>
                        );
                    })}
                    {/* Node halos over the roads and under the glyphs: a dark
                        pool that clears a dense plate's linework from around
                        each mark, so the mark reads as a mark. */}
                    {nodeHalo && (
                        <View style={StyleSheet.absoluteFillObject} pointerEvents="none" testID="map-node-halos">
                            {nodes.map((n) => (
                                <NodeHalo key={n.id} cx={n.x} cy={n.y} r={haloRadius} scale={size.scale} color={AXM.deepBg} counterScale={markerCounterScale} />
                            ))}
                        </View>
                    )}

                    <MapSheetContext.Provider value={size}>
                        <MapCameraContext.Provider value={scale}>{children}</MapCameraContext.Provider>
                    </MapSheetContext.Provider>
                </Animated.View>
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
    backdropPlate: {
        ...StyleSheet.absoluteFillObject,
    },
    edgeStrip: {
        position: 'absolute',
    },
}));