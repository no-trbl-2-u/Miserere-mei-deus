import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FONTS } from '@/theme/axm';
import { makeStyles, usePalette } from '@/theme/runtime';
import { ActionIcon } from '@/components/ActionIcon';
import { AxmIcon } from '@/components/icons/AxmIcon';
import { getItemGlyph, getItemGlyphAccents, type ItemGlyphTable } from '@/components/icons/item-glyphs';
import { TooltipTarget } from '@/components/tooltip/TooltipTarget';
import { EquipDeltaPanel } from '@/components/inventory/EquipDeltaPanel';
import { rarityAffordance, rarityColors } from '@/components/inventory/rarityAffordance';
import type { InventoryCategory, InventoryItemRow } from '@/state/presenters/inventory.engine';

export const CATEGORY_ORDER: readonly InventoryCategory[] = [
    'equipment',
    'consumable',
    'material',
    'quest',
] as const;

/**
 * A collapsed tile's widest. The tile is a share of the panel, so on a wide
 * window it stretched to ~390px around a 28px glyph and read as an empty box;
 * capped near its phone width, the grid packs more tiles per row instead.
 */
export const ITEM_CARD_MAX_WIDTH = 140;

export function groupByCategory(items: readonly InventoryItemRow[]): Record<InventoryCategory, InventoryItemRow[]> {
    const out: Record<InventoryCategory, InventoryItemRow[]> = {
        equipment: [],
        consumable: [],
        material: [],
        quest: [],
    };
    for (const it of items) out[it.category].push(it);
    return out;
}

export interface ItemGlyphProps {
    category: InventoryCategory;
    sub: string | null;
    /** Engine item id. An id with an entry in the item glyph table draws that
     *  icon; any other id (or none) draws the category glyph below. */
    itemId?: string | null;
    /** Test seam: the table to resolve against (defaults to `ITEM_GLYPH_BY_ID`). */
    glyphs?: ItemGlyphTable;
}

export function ItemGlyph({ category, sub, itemId, glyphs }: ItemGlyphProps) {
    const AXM = usePalette();
    const byId = getItemGlyph(itemId, glyphs);
    if (byId !== null) {
        // Accents only ride the production table: a test's fixture table names
        // its own icons, so the shipped accents would not fit them.
        const accents = glyphs === undefined ? getItemGlyphAccents(itemId) : [];
        return <AxmIcon name={byId} size={28} color={AXM.parchment} accents={accents} />;
    }
    if (category === 'equipment' && sub === 'Weapon') {
        return <ActionIcon kind="sword" size={32} color={AXM.parchment} />;
    }
    if (category === 'equipment' && (sub === 'Armor' || sub === 'Shield')) {
        return <ActionIcon kind="shield" size={32} color={AXM.parchment} />;
    }
    // The icon is chosen by the slot kind the presenter labels 'Relic'.
    if (category === 'equipment' && sub === 'Relic') {
        return <AxmIcon name="category-relic" size={28} color={AXM.parchment} />;
    }
    if (category === 'consumable') {
        return <AxmIcon name="category-consumable" size={28} color={AXM.parchment} />;
    }
    if (category === 'material') {
        return (
            <Svg 
                width={28} 
                height={28} 
                viewBox="0 0 28 28" 
                fill="none"
                accessibilityRole="image"
                accessibilityLabel="Material item icon"
            >
                <Path
                    d="M14 4 L24 10 L24 20 L14 26 L4 20 L4 10 Z"
                    stroke={AXM.parchment}
                    strokeWidth={1.5}
                    fill="none"
                />
                <Path d="M14 4 L14 26 M4 10 L24 20 M24 10 L4 20" stroke={AXM.parchment} strokeWidth={0.7} />
            </Svg>
        );
    }
    if (category === 'quest') {
        return <AxmIcon name="category-quest" size={28} color={AXM.parchment} />;
    }
    return <AxmIcon name="mark-unknown" size={28} color={AXM.bone} />;
}

export interface ItemCardProps {
    item: InventoryItemRow;
    expanded: boolean;
    onTap: () => void;
    onUseOrEquip: () => void;
    onDiscard: () => void;
}

export function ItemCard({ item, expanded, onTap, onUseOrEquip, onDiscard }: ItemCardProps) {
    const styles = useStyles();
    const AXM = usePalette();
    const [isFocused, setIsFocused] = useState(false);

    // Equipment carries no rarity; the presenter always passes `null`.
    const affordance = rarityAffordance(item.rarity ?? null);
    const colors = rarityColors(item.rarity ?? null, AXM);

    const baseLabel = item.equipped
        ? `${item.name}, worn`
        : item.quantity > 1
            ? `${item.name}, ${item.quantity}`
            : item.name;
    const itemLabel = affordance.label !== null
        ? `${baseLabel}, ${affordance.label}`
        : baseLabel;

    // Unique's red outline wins the border (colour + 2px weight) over
    // the equipped sulfur border, but the WORN badge below still renders
    // so worn-ness stays legible. Uncommon / rare paint a soft shine via
    // shadow/elevation rather than a hard border so they read as a glow.
    const rarityBorderColor = affordance.isOutline
        ? colors.accent
        : item.equipped
            ? AXM.sulfur
            : AXM.ash;
    const rarityBorderWidth = affordance.isOutline || item.equipped ? 2 : 1;
    const shineStyle = affordance.isShine
        ? {
            borderColor: colors.accent,
            shadowColor: colors.glow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 6,
            elevation: 4,
        }
        : null;

    // The card is a frame, not a button: the tap-to-expand header and the
    // USE / DISCARD actions are sibling buttons. Nested inside one touchable,
    // the actions rendered as a `<button>` in a `<button>` on web and were
    // folded into the card's single a11y element on native, out of a screen
    // reader's reach.
    return (
        <View
            style={[
                styles.itemCard,
                expanded && styles.itemCardExpanded,
                isFocused && styles.itemCardFocused,
                {
                    borderColor: rarityBorderColor,
                    borderWidth: rarityBorderWidth,
                },
                shineStyle,
            ]}
            testID={`item-card-${item.id}`}
        >
            {affordance.isShine && (
                <View
                    pointerEvents="none"
                    style={[styles.rarityShine, { borderColor: colors.accent }]}
                    testID={`rarity-shine-${item.id}`}
                />
            )}
            {affordance.isOutline && (
                <View
                    pointerEvents="none"
                    style={[styles.rarityOutline, { borderColor: colors.accent }]}
                    testID={`rarity-outline-${item.id}`}
                />
            )}
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={itemLabel}
                accessibilityState={{ expanded }}
                onPress={onTap}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                testID={`item-${item.id}`}
            >
                <View style={styles.itemIcon}>
                    <ItemGlyph category={item.category} sub={item.sub} itemId={item.id} />
                </View>
                <Text style={styles.itemName} numberOfLines={expanded ? undefined : 2}>
                    {item.name}
                </Text>
                {item.category === 'equipment' && !expanded && item.sub !== null && (
                    <Text style={styles.itemSlotTag} testID={`slot-tag-${item.id}`}>
                        SLOT {'·'} {item.sub.toUpperCase()}
                    </Text>
                )}
            </TouchableOpacity>
            {item.quantity > 1 && (
                <View style={styles.qtyBadge} pointerEvents="none">
                    <Text style={styles.qtyText}>{'×'}{item.quantity}</Text>
                </View>
            )}
            {item.wornLabel !== null && (
                <View
                    style={item.equipped ? styles.wornBadge : styles.notWornBadge}
                    pointerEvents="none"
                    testID={item.equipped ? undefined : `item-not-worn-${item.id}`}
                >
                    <Text style={item.equipped ? styles.wornText : styles.notWornText}>{item.wornLabel}</Text>
                </View>
            )}
            {expanded && (
                <View style={styles.expandedContent}>
                    <Text style={styles.itemDesc}>{'"'}{item.description}{'"'}</Text>
                    {item.replacePreview !== null && (
                        <View style={styles.replacePreview} testID={`replace-preview-${item.id}`}>
                            <Text style={styles.replacePreviewEyebrow}>REPLACES</Text>
                            <View style={styles.replacePreviewNameRow}>
                                <Text style={styles.replacePreviewOldName} numberOfLines={1}>
                                    {item.replacePreview.replacing.name}
                                </Text>
                                <Text style={styles.replacePreviewArrow}>{'→'}</Text>
                                <Text style={styles.replacePreviewNewName} numberOfLines={1}>
                                    {item.name}
                                </Text>
                            </View>
                            {item.replacePreview.deltas.length > 0 && (
                                <View style={styles.replacePreviewDeltas}>
                                    <Text style={styles.replacePreviewLabel}>NET</Text>
                                    {item.replacePreview.deltas.map((d) => {
                                        const positive = d.delta > 0;
                                        return (
                                            <TooltipTarget
                                                key={d.stat}
                                                kind="item-stat"
                                                id={d.stat}
                                                accessibilityLabel={`Explain ${d.stat}`}
                                                accessibilityHint="tap to read description"
                                                testID={`inventory-delta-${d.stat}`}
                                            >
                                                <View
                                                    style={[
                                                        styles.replaceDeltaChip,
                                                        positive ? styles.replaceDeltaChipPos : styles.replaceDeltaChipNeg,
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.replaceDeltaChipText,
                                                            positive ? styles.replaceDeltaChipTextPos : styles.replaceDeltaChipTextNeg,
                                                        ]}
                                                    >
                                                        {positive ? '+' : ''}{d.delta} {d.stat}
                                                    </Text>
                                                </View>
                                            </TooltipTarget>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    )}
                    {item.equipDelta !== null && (
                        <EquipDeltaPanel itemId={item.id} delta={item.equipDelta} />
                    )}
                    <View style={styles.actionsRow}>
                        {item.canUse && (
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={`${item.actionLabel.charAt(0)}${item.actionLabel.slice(1).toLowerCase()} ${item.name}`}
                                style={styles.actionBtn}
                                onPress={onUseOrEquip}
                                testID={`use-${item.id}`}
                            >
                                <Text style={styles.actionBtnText}>
                                    {item.actionLabel}
                                </Text>
                            </TouchableOpacity>
                        )}
                        {item.canDiscard && (
                            <TouchableOpacity
                                accessibilityRole="button"
                                accessibilityLabel={`Discard ${item.name}`}
                                style={[styles.actionBtn, styles.discardBtn]}
                                onPress={onDiscard}
                                testID={`discard-${item.id}`}
                            >
                                <Text style={[styles.actionBtnText, { color: AXM.blood }]}>DISCARD</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    itemCard: {
        width: '31.5%',
        maxWidth: ITEM_CARD_MAX_WIDTH,
        backgroundColor: AXM.panelBg,
        padding: 6,
        minHeight: 92,
        position: 'relative',
    },
    itemCardExpanded: { width: '100%', maxWidth: '100%' },
    itemIcon: {
        width: '100%',
        height: 50,
        backgroundColor: AXM.deepBg,
        borderWidth: 1,
        borderColor: AXM.ash,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemName: { fontFamily: FONTS.gothic, fontSize: 13, color: AXM.parchment, lineHeight: 16, marginTop: 4 },
    qtyBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: AXM.parchment, paddingHorizontal: 4 },
    qtyText: { fontFamily: FONTS.mono, fontSize: 11, color: AXM.bg },
    wornBadge: { position: 'absolute', top: 2, left: 2, backgroundColor: AXM.sulfur, paddingHorizontal: 3 },
    wornText: { fontFamily: FONTS.sans, fontSize: 9, letterSpacing: 1, color: AXM.bg },
    // A carried relic whose signature is off: an outlined badge, so it reads
    // as a state to fix rather than a second WORN.
    notWornBadge: {
        position: 'absolute', top: 2, left: 2, borderWidth: 1, borderColor: AXM.rust,
        backgroundColor: AXM.bg, paddingHorizontal: 3,
    },
    notWornText: { fontFamily: FONTS.sans, fontSize: 9, letterSpacing: 1, color: AXM.bone },
    expandedContent: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: AXM.ash, borderStyle: 'dashed' },
    itemDesc: { fontFamily: FONTS.serifItalic, fontSize: 13, color: AXM.bone },
    actionsRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
    actionBtn: {
        flex: 1,
        paddingVertical: 5,
        paddingHorizontal: 6,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: AXM.parchment,
        alignItems: 'center',
    },
    discardBtn: { borderColor: AXM.blood },
    actionBtnText: { fontFamily: FONTS.gothic, fontSize: 13, letterSpacing: 1.5, color: AXM.parchment },
    itemSlotTag: {
        fontFamily: FONTS.mono,
        fontSize: 9,
        color: AXM.bone,
        letterSpacing: 1.2,
        marginTop: 1,
    },
    replacePreview: {
        marginTop: 6,
        padding: 6,
        paddingHorizontal: 8,
        borderLeftWidth: 2,
        borderLeftColor: AXM.blood,
        backgroundColor: AXM.bloodSubtle,
    },
    replacePreviewEyebrow: {
        fontFamily: FONTS.mono,
        fontSize: 8,
        color: AXM.bone,
        letterSpacing: 1.4,
        marginBottom: 4,
    },
    replacePreviewNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    replacePreviewOldName: {
        fontFamily: FONTS.gothic,
        fontSize: 12,
        color: AXM.bone,
        textDecorationLine: 'line-through',
        flexShrink: 1,
    },
    replacePreviewArrow: {
        fontFamily: FONTS.gothic,
        fontSize: 14,
        color: AXM.sulfur,
    },
    replacePreviewNewName: {
        fontFamily: FONTS.gothic,
        fontSize: 12,
        color: AXM.parchment,
        flexShrink: 1,
    },
    replacePreviewDeltas: {
        marginTop: 6,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        alignItems: 'center',
    },
    replacePreviewLabel: {
        fontFamily: FONTS.mono,
        fontSize: 7,
        color: AXM.bone,
        letterSpacing: 1.4,
        marginRight: 2,
    },
    replaceDeltaChip: {
        paddingVertical: 1,
        paddingHorizontal: 4,
        borderWidth: 1,
    },
    replaceDeltaChipPos: {
        backgroundColor: AXM.sulfurSubtle,
        borderColor: AXM.sulfur,
    },
    replaceDeltaChipNeg: {
        backgroundColor: AXM.bloodSubtle,
        borderColor: AXM.blood,
    },
    replaceDeltaChipText: {
        fontFamily: FONTS.mono,
        fontSize: 9,
        letterSpacing: 0.8,
    },
    replaceDeltaChipTextPos: {
        color: AXM.sulfur,
    },
    replaceDeltaChipTextNeg: {
        color: AXM.blood,
    },
    itemCardFocused: {
        shadowColor: AXM.sulfur,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 3,
        borderColor: AXM.sulfur,
    },
    rarityShine: {
        position: 'absolute',
        top: 1,
        left: 1,
        right: 1,
        bottom: 1,
        borderWidth: 1,
        opacity: 0.7,
    },
    rarityOutline: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderWidth: 2,
    },
}));
