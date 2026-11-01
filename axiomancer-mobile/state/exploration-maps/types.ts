/**
 * Mobile-side map layout fixture — **pure presentation** (positions + copy).
 *
 * The engine's `MapDefinition` registry (`getMapDefinition(continent, name)`)
 * is the single source of truth for the node GRAPH (which nodes exist, their
 * `connectedNodes`, and traversal/unlock), and the engine's MapEvent pools
 * (`getNodePrimaryEventKind`) are the source of truth for each node's KIND
 * (which icon to show). This fixture supplies ONLY:
 *
 * - **Visual positions** (`x` / `y`) on the layout's own sheet (`sheet`)
 *   — the engine carries an abstract `location` grid, not pixel coordinates.
 * - **The sheet itself**: its size, render scale and plate.
 * - **Display labels and per-node thematic blurbs** — author-facing strings
 *   the engine doesn't carry.
 *
 * Node kind and edges are NOT carried here — the presenter reads them from the
 * engine. The `layout-engine-parity` test guards that this fixture's node-id
 * set stays exactly in sync with the engine's `MapDefinition`, so no engine
 * node silently renders at the canvas centre for want of a position.
 */
/**
 * The sheet a map is drawn on: its coordinate space, how large it renders, and
 * its plate. Each layout declares its own sheet, so a map's canvas can be
 * larger than the viewport on both axes and its nodes can sit on the plate's
 * own landmarks.
 */
export interface MapSheet {
    /** Width of the node coordinate space (the SVG viewBox), in sheet units. */
    width: number;
    /** Height of the node coordinate space, in sheet units. */
    height: number;
    /** Device px per sheet unit at 1x zoom: the canvas is `width * scale` by `height * scale`. */
    scale: number;
    /** The engraving plate drawn under the chart, stretched to the whole sheet. */
    backdrop: number;
    /**
     * Plate opacity. Atmosphere plates sit dim under the chart (0.2); a plate
     * that IS the map, with nodes on its landmarks, reads near full.
     */
    plateOpacity: number;
    /**
     * The same plate with its rim faded to transparent, so the map pane draws
     * the chart dissolving into the fog past its edge. Omitted, the plate
     * keeps its hard edge on the near-black ground.
     */
    fadedBackdrop?: number;
    /**
     * Draw the procedural chart texture (diagonal hatch + contour hills) over
     * the plate. True for the atmosphere-plate maps; false where the plate is
     * the map, since invented hills over drawn mountains would contradict it.
     */
    chartTexture: boolean;
    /**
     * Pool each node mark in a dark halo, so the marks hold contrast over a
     * dense plate's linework (the Lantern Deep's underworld).
     * Omitted means no halo.
     */
    nodeHalo?: boolean;
}

export interface NodeLayout {
    /** Stable engine node id (matches MapState.currentNode / completedNodes / availableNodes / lockedNodes). */
    id: string;
    /** Position on the layout's sheet (`MapLayout.sheet`), in sheet units. */
    x: number;
    y: number;
    label: string;
    /** Thematic blurb shown on the node options drawer when this node is currently selectable. */
    description: string;
}

export interface MapLayout {
    /** Engine map name. */
    mapId: string;
    continent: string;
    region: string;
    /**
     * Display copy for the header — the map ordinal only (e.g. "Map ii of
     * vii"). Never a node/path count: counts are computed live for the map
     * legend, and a static one here would drift out of agreement.
     */
    regionProgress: string;
    /** The sheet this map is drawn on — canvas size and plate. */
    sheet: MapSheet;
    nodes: readonly NodeLayout[];
}
