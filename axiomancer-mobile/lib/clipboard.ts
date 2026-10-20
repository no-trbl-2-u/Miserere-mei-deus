/**
 * The copy-text seam, for dev surfaces that hand a blob of text to the
 * human running them (the HAZARD PUZZLES move log, phase HP2c).
 *
 * Two paths, no new dependency:
 *  - **web** (the dev build T plays locally, and the only end-to-end-testable
 *    platform here): the async Clipboard API, `navigator.clipboard.writeText`.
 *    It needs a secure context, so it is absent over plain http on a LAN
 *    address and the call reports failure rather than throwing.
 *  - **native**: React Native's core `Share`, whose sheet includes the
 *    platform's own Copy. `Clipboard` from react-native core is deprecated and
 *    `expo-clipboard` is a native module, which a dev-only control is not
 *    worth a new native build for.
 *
 * Never throws: the caller prints what it returns, and a dev control that
 * cannot reach a clipboard still shows the text for a hand-copy.
 */

import { Share } from 'react-native';

type AsyncClipboard = { writeText?: (text: string) => Promise<void> };

function webClipboard(): AsyncClipboard | null {
    const nav = (globalThis as { navigator?: { clipboard?: AsyncClipboard } }).navigator;
    return nav?.clipboard ?? null;
}

/** Copies `text`, or hands it to the native share sheet. True when the platform took it. */
export async function copyText(text: string): Promise<boolean> {
    const clipboard = webClipboard();
    if (clipboard?.writeText) {
        try {
            await clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    }
    try {
        const result = await Share.share({ message: text });
        return result.action === Share.sharedAction;
    } catch {
        return false;
    }
}
