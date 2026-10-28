/**
 * Hardware back button handler for Android.
 *
 * Disables back button during combat, and during an open rest-choice node
 * ("no back-out": `resolveMapEvent` consumes the node on entry, before any
 * choice, so a back-out would burn it for nothing).
 *
 * Also locked while a **paced** event is pending (`/cutscene`, `/dialogue`,
 * `/village`, `/event`). `EventGate` pushes each paced route exactly once
 * (its latch) and only re-arms when the event resolves, so a hardware back
 * that popped the modal would leave the event pending with no screen
 * showing it. Same doctrine as the rest node: the node is already consumed,
 * there is nothing to back out to.
 */

import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useCombatMode } from '@/state/combat-mode';
import { useGameState } from '@/state/GameStoreProvider';
import { selectHasActivePacedEvent } from '@/state/presenters/event.engine';
import { selectHasActiveQuest } from '@/state/presenters/quest.engine';
import { selectHasActiveRest } from '@/state/presenters/rest.engine';

export function HardwareBackHandler() {
  const { inCombat } = useCombatMode();
  const hasActiveRest = useGameState(selectHasActiveRest);
  const hasPacedEvent = useGameState(selectHasActivePacedEvent);
  // The quest screen has its own LEAVE; a hardware back that popped it would
  // leave the quest slice open with no screen showing it.
  const hasActiveQuest = useGameState(selectHasActiveQuest);
  const locked = inCombat || hasActiveRest || hasPacedEvent || hasActiveQuest;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      // Disable back button during combat, an open rest-choice node, or a
      // pending paced event — all three are modal and must not be
      // interrupted by hardware back.
      if (locked) {
        return true; // Prevent default behavior
      }
      return false; // Allow default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [locked]);

  return null; // This component doesn't render anything
}