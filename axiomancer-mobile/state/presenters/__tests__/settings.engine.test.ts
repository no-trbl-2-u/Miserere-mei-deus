/**
 * Hermetic — the settings presenter (`settings.engine.ts`).
 */

import { describe, expect, it } from '@jest/globals';

import { DEFAULT_SETTINGS, TEXT_SCALES } from '@/state/settings';
import {
    REDUCED_MOTION_OPTIONS,
    TEXT_SCALE_OPTIONS,
    TOGGLE_OPTIONS,
    FEEDBACK_MAX_CHARS,
    selectFeedbackViewModel,
    selectSettingsViewModel,
    volumeStep,
} from '../settings.engine';

describe('option lists', () => {
    it('offer exactly the store\'s legal values', () => {
        expect(TEXT_SCALE_OPTIONS.map((o) => o.value)).toEqual([...TEXT_SCALES]);
        expect(TEXT_SCALE_OPTIONS.map((o) => o.label)).toEqual(['SMALL', 'DEFAULT', 'LARGE', 'LARGER']);
        expect(REDUCED_MOTION_OPTIONS.map((o) => o.value)).toEqual(['system', 'on', 'off']);
        expect(TOGGLE_OPTIONS.map((o) => o.value)).toEqual([true, false]);
    });
});

describe('volumeStep', () => {
    it('clamps to 0–100', () => {
        expect(volumeStep(0, -10)).toBe(0);
        expect(volumeStep(95, 10)).toBe(100);
        expect(volumeStep(50, 10)).toBe(60);
    });
});

describe('selectSettingsViewModel', () => {
    it('mirrors the settings and formats the volumes', () => {
        const vm = selectSettingsViewModel({ ...DEFAULT_SETTINGS, musicVolume: 40 }, true);
        expect(vm.musicLabel).toBe('40%');
        expect(vm.sfxLabel).toBe(`${DEFAULT_SETTINGS.sfxVolume}%`);
        expect(vm.inRun).toBe(true);
        expect(vm.textScale).toBe(1);
        expect(selectSettingsViewModel(DEFAULT_SETTINGS, false).inRun).toBe(false);
    });
});

describe('the music switch', () => {
    it('defaults on and reaches the view model', () => {
        expect(DEFAULT_SETTINGS.musicOn).toBe(true);
        expect(selectSettingsViewModel(DEFAULT_SETTINGS, false).musicOn).toBe(true);
        expect(selectSettingsViewModel({ ...DEFAULT_SETTINGS, musicOn: false }, false).musicOn).toBe(false);
    });
});

describe('selectFeedbackViewModel', () => {
    it('is disabled until a kind is picked and the text is not blank', () => {
        expect(selectFeedbackViewModel({ kind: null, text: 'it broke' }).canSubmit).toBe(false);
        expect(selectFeedbackViewModel({ kind: 'bug', text: '' }).canSubmit).toBe(false);
        expect(selectFeedbackViewModel({ kind: 'bug', text: '  \n ' }).canSubmit).toBe(false);
        expect(selectFeedbackViewModel({ kind: 'bug', text: 'it broke' }).canSubmit).toBe(true);
    });

    it('builds the draft only when submittable', () => {
        expect(selectFeedbackViewModel({ kind: null, text: 'x' }).draft).toBeNull();
        expect(selectFeedbackViewModel({ kind: 'proposal', text: 'add a map' }).draft).toEqual({
            kind: 'proposal',
            text: 'add a map',
        });
    });

    it('caps the text at 1000 characters and counts it', () => {
        const vm = selectFeedbackViewModel({ kind: 'bug', text: 'a'.repeat(FEEDBACK_MAX_CHARS + 50) });
        expect(vm.text).toHaveLength(FEEDBACK_MAX_CHARS);
        expect(vm.countLabel).toBe('1000 / 1000');
        expect(selectFeedbackViewModel({ kind: 'bug', text: 'abc' }).countLabel).toBe('3 / 1000');
    });
});
