/**
 * The copy-text seam (HP2c): the web Clipboard API where there is one, the
 * native share sheet otherwise, and never a throw.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Share } from 'react-native';

import { copyText } from '@/lib/clipboard';

function setClipboard(writeText: ((text: string) => Promise<void>) | null): void {
    (globalThis as { navigator?: unknown }).navigator = writeText === null ? {} : { clipboard: { writeText } };
}

afterEach(() => {
    delete (globalThis as { navigator?: unknown }).navigator;
    jest.restoreAllMocks();
});

describe('copyText', () => {
    it('writes to the web clipboard when one is reachable', async () => {
        const written: string[] = [];
        setClipboard((text) => {
            written.push(text);
            return Promise.resolve();
        });
        const share = jest.spyOn(Share, 'share');
        await expect(copyText('{"attempts":[]}')).resolves.toBe(true);
        expect(written).toEqual(['{"attempts":[]}']);
        expect(share).not.toHaveBeenCalled();
    });

    it('reports failure when the clipboard rejects, without throwing', async () => {
        setClipboard(() => Promise.reject(new Error('not a secure context')));
        await expect(copyText('log')).resolves.toBe(false);
    });

    it('falls back to the native share sheet, and reports what it returned', async () => {
        setClipboard(null);
        const share = jest
            .spyOn(Share, 'share')
            .mockResolvedValue({ action: Share.sharedAction } as Awaited<ReturnType<typeof Share.share>>);
        await expect(copyText('log')).resolves.toBe(true);
        expect(share).toHaveBeenCalledWith({ message: 'log' });
        share.mockResolvedValue({ action: Share.dismissedAction } as Awaited<ReturnType<typeof Share.share>>);
        await expect(copyText('log')).resolves.toBe(false);
        share.mockRejectedValue(new Error('no sheet here'));
        await expect(copyText('log')).resolves.toBe(false);
    });
});
