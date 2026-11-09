/**
 * Shared presentational primitives for the `/dev` route.
 *
 * The dashed-border row, mono label, and sulfur button styles every
 * Debug* leaf shares. This module centralises them so the dev surface
 * reads as ONE system and a leaf is only its
 * behaviour: which store action it calls and what feedback it prints.
 *
 * Three primitives, composed top-down:
 *
 *   <DevRow label sub>            one control group — label column on the
 *                                 left, `children` (buttons/chips) on the
 *                                 right. `sub` is the live feedback line.
 *   <DevButton label onPress>     the primary action affordance.
 *   <DevChip label active onPress> a small toggle/pick affordance, meant
 *                                 to be rendered in a wrapping <DevChips>.
 *   <DevSelect value options>     a drop-down: the current pick, which opens
 *                                 an inline option list on press.
 *   <DevCheck label checked>      a checkbox row; render many inside
 *                                 <DevChips> for a grid.
 *
 * All primitives are pure functions of their props — no store access —
 * so the leaves stay the only place that touches state.
 */

import React from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { TYPE_ROLES } from '@/theme/axm';
import { makeStyles } from '@/theme/runtime';

/** Props for a labelled control group. */
export interface DevRowProps {
    /** Mono, letter-spaced caption — e.g. `DEBUG · XP`. */
    label: string;
    /** Live feedback / hint line under the label. */
    sub?: string | null;
    /** Optional tone for the sub line: `ok` (heal), `err` (blood). */
    subTone?: 'ok' | 'err' | null;
    /** Stack children under the label instead of beside it. */
    stacked?: boolean;
    /** Forwarded to the outer View for automation hooks. */
    testID?: string;
    children?: React.ReactNode;
}

/**
 * One control group. Renders the caption + sub line, then the children
 * either beside (default) or beneath (`stacked`) the label column.
 */
export function DevRow({ label, sub, subTone, stacked, testID, children }: DevRowProps) {
    const styles = useStyles();
    return (
        <View style={[styles.row, stacked && styles.rowStacked]} testID={testID}>
            <View style={styles.labelCol}>
                <Text style={styles.label}>{label}</Text>
                {sub ? (
                    <Text
                        style={[
                            styles.sub,
                            subTone === 'ok' && styles.subOk,
                            subTone === 'err' && styles.subErr,
                        ]}
                        numberOfLines={3}
                        testID={testID ? `${testID}-sub` : undefined}
                    >
                        {sub}
                    </Text>
                ) : null}
            </View>
            <View style={[styles.controls, stacked && styles.controlsStacked]}>{children}</View>
        </View>
    );
}

/** Props for the primary action button. */
export interface DevButtonProps {
    label: string;
    onPress: () => void;
    /** Accessibility label; defaults to `label`. */
    a11y?: string;
    testID?: string;
    /** Render in the "active/selected" treatment (inverted colours). */
    active?: boolean;
    /** Render in the destructive treatment (blood border). */
    danger?: boolean;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
}

/** The primary dev action affordance — gothic label, sulfur border. */
export function DevButton({ label, onPress, a11y, testID, active, danger, disabled, style }: DevButtonProps) {
    const styles = useStyles();
    return (
        <Pressable
            style={[
                styles.button,
                active && styles.buttonActive,
                danger && styles.buttonDanger,
                disabled && styles.buttonDisabled,
                style,
            ]}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={a11y ?? label}
            accessibilityState={{ selected: Boolean(active), disabled: Boolean(disabled) }}
            testID={testID}
        >
            <Text
                style={[
                    styles.buttonLabel,
                    active && styles.buttonLabelActive,
                    danger && styles.buttonLabelDanger,
                ]}
            >
                {label}
            </Text>
        </Pressable>
    );
}

/** Props for a small pick/toggle chip. */
export interface DevChipProps {
    label: string;
    onPress: () => void;
    active?: boolean;
    a11y?: string;
    testID?: string;
    /** Secondary tone for chips that mark something notable (e.g. a boss). */
    accent?: boolean;
}

/** A compact selectable chip; render many inside `<DevChips>`. */
export function DevChip({ label, onPress, active, a11y, testID, accent }: DevChipProps) {
    const styles = useStyles();
    return (
        <Pressable
            style={[styles.chip, active && styles.chipActive, accent && styles.chipAccent]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={a11y ?? label}
            accessibilityState={{ selected: Boolean(active) }}
            testID={testID}
        >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive, accent && styles.chipLabelAccent]}>
                {label}
            </Text>
        </Pressable>
    );
}

/** Wrapping flex container for chips. */
export function DevChips({ children, testID }: { children: React.ReactNode; testID?: string }) {
    const styles = useStyles();
    return (
        <View style={styles.chips} testID={testID}>
            {children}
        </View>
    );
}

/** One option in a {@link DevSelect}. */
export interface DevSelectOption {
    /** Stable value handed back to `onChange`. */
    value: string;
    /** Text shown for the option. */
    label: string;
}

/** Props for the drop-down. */
export interface DevSelectProps {
    /** The selected option's value; `null` shows `placeholder`. */
    value: string | null;
    options: readonly DevSelectOption[];
    /** Called with the picked option's value; the list then closes. */
    onChange: (value: string) => void;
    /** Shown when nothing is selected. */
    placeholder?: string;
    /** Accessibility label for the closed control. */
    a11y?: string;
    /** The trigger gets `testID`; each option gets `${testID}-option-${value}`. */
    testID?: string;
}

/**
 * A drop-down built from Pressables, so it renders the same on web and
 * native. Closed, it shows the current pick and a caret; pressed, it lists
 * every option beneath itself. Open state is local; the value is the
 * caller's.
 */
export function DevSelect({ value, options, onChange, placeholder = 'choose…', a11y, testID }: DevSelectProps) {
    const styles = useStyles();
    const [open, setOpen] = React.useState(false);
    const current = options.find((o) => o.value === value);
    return (
        <View style={styles.select}>
            <Pressable
                style={styles.selectTrigger}
                onPress={() => setOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityLabel={a11y ?? 'Open the option list'}
                accessibilityState={{ expanded: open }}
                testID={testID}
            >
                <Text style={styles.selectLabel} numberOfLines={1}>
                    {current?.label ?? placeholder}
                </Text>
                <Text style={styles.selectCaret}>{open ? '▴' : '▾'}</Text>
            </Pressable>
            {open ? (
                <View style={styles.selectList} testID={testID ? `${testID}-list` : undefined}>
                    {options.map((o) => (
                        <Pressable
                            key={o.value}
                            style={[styles.selectOption, o.value === value && styles.selectOptionActive]}
                            onPress={() => {
                                onChange(o.value);
                                setOpen(false);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={o.label}
                            accessibilityState={{ selected: o.value === value }}
                            testID={testID ? `${testID}-option-${o.value}` : undefined}
                        >
                            <Text style={[styles.selectLabel, o.value === value && styles.chipLabelActive]}>{o.label}</Text>
                        </Pressable>
                    ))}
                </View>
            ) : null}
        </View>
    );
}

/** Props for a checkbox. */
export interface DevCheckProps {
    label: string;
    checked: boolean;
    onToggle: () => void;
    a11y?: string;
    testID?: string;
}

/** A checkbox: a box that fills when checked, and its label. */
export function DevCheck({ label, checked, onToggle, a11y, testID }: DevCheckProps) {
    const styles = useStyles();
    return (
        <Pressable
            style={styles.check}
            onPress={onToggle}
            accessibilityRole="checkbox"
            accessibilityLabel={a11y ?? label}
            accessibilityState={{ checked }}
            testID={testID}
        >
            <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
                {checked ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.chipLabel}>{label}</Text>
        </Pressable>
    );
}

/** Horizontal button group. */
export function DevButtons({ children }: { children: React.ReactNode }) {
    const styles = useStyles();
    return <View style={styles.buttons}>{children}</View>;
}

/** Key/value line used by the state inspector. */
export function DevKv({ k, v, testID }: { k: string; v: string; testID?: string }) {
    const styles = useStyles();
    return (
        <View style={styles.kv} testID={testID}>
            <Text style={styles.kvKey}>{k}</Text>
            <Text style={styles.kvVal} selectable>
                {v}
            </Text>
        </View>
    );
}

const useStyles = makeStyles((AXM) => ({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: AXM.ash,
        borderStyle: 'dashed',
        gap: 8,
    },
    rowStacked: { flexDirection: 'column' },
    labelCol: { flex: 1, minWidth: 96 },
    label: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 9, color: AXM.bone },
    sub: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 10, color: AXM.parchment, marginTop: 2 },
    subOk: { color: AXM.heal },
    subErr: { color: AXM.blood },
    controls: { flexShrink: 1, alignItems: 'flex-end' },
    controlsStacked: { alignItems: 'stretch', width: '100%' },
    buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
    button: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: AXM.sulfur,
        backgroundColor: AXM.bg,
    },
    buttonActive: { backgroundColor: AXM.sulfur },
    buttonDanger: { borderColor: AXM.blood },
    buttonDisabled: { opacity: 0.4 },
    buttonLabel: { fontFamily: TYPE_ROLES.button.fontFamily, fontSize: 12, letterSpacing: TYPE_ROLES.button.letterSpacing, color: AXM.sulfur },
    buttonLabelActive: { color: AXM.bg },
    buttonLabelDanger: { color: AXM.blood },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingTop: 4 },
    chip: {
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.deepBg,
    },
    chipActive: { borderColor: AXM.sulfur, backgroundColor: AXM.sulfur },
    chipAccent: { borderColor: AXM.blood },
    chipLabel: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 9, color: AXM.parchment },
    chipLabelActive: { color: AXM.bg },
    chipLabelAccent: { color: AXM.blood },
    select: { flex: 1, minWidth: 140 },
    selectTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.deepBg,
    },
    selectLabel: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 10, color: AXM.parchment, flexShrink: 1 },
    selectCaret: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 10, color: AXM.bone },
    selectList: { borderWidth: 1, borderTopWidth: 0, borderColor: AXM.ash, backgroundColor: AXM.deepBg },
    selectOption: { paddingHorizontal: 8, paddingVertical: 6 },
    selectOptionActive: { backgroundColor: AXM.sulfur },
    check: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: AXM.ash,
        backgroundColor: AXM.deepBg,
    },
    checkBox: {
        width: 12,
        height: 12,
        borderWidth: 1,
        borderColor: AXM.bone,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkBoxOn: { borderColor: AXM.sulfur, backgroundColor: AXM.sulfur },
    checkMark: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 9, lineHeight: 10, color: AXM.bg },
    kv: { flexDirection: 'row', gap: 8, paddingVertical: 1 },
    kvKey: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 9, color: AXM.bone, width: 92 },
    kvVal: { fontFamily: TYPE_ROLES.count.fontFamily, fontSize: 9, color: AXM.parchment, flex: 1 },
}));
