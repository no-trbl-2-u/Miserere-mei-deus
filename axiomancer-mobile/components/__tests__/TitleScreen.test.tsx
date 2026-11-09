/**
 * Hermetic tests for the TitleScreen component: the launch sequence's copy,
 * EMBARK's hand-off to the menu in place, and the `?menu=1` entry.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { EMBARK_PRESSED, EmbarkButton } from '../EmbarkButton';
import { TitleScreen } from '../TitleScreen';
import { EMBARK_SCROLL, EMBARK_SCROLL_ASPECT } from '@/assets/images/title';
import { createAppStore } from '@/state/store';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { TITLE_COPY, TITLE_TIMING } from '@/state/presenters/title.engine';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

let mockReduced = false;
jest.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }));

const MENU = <Text testID="stub-menu">menu</Text>;

function TestWrapper({ children }: { children: React.ReactNode }) {
  const store = createAppStore({ adapter: createMemoryAdapter() });
  return <GameStoreProvider store={store}>{children}</GameStoreProvider>;
}

function mount(props: Partial<React.ComponentProps<typeof TitleScreen>> = {}) {
  return render(
    <TestWrapper>
      <TitleScreen menu={MENU} {...props} />
    </TestWrapper>,
  );
}

/** Plays the sequence up to the moment EMBARK starts fading in. */
function playIntro() {
  act(() => {
    jest.advanceTimersByTime(TITLE_TIMING.holdMs + TITLE_TIMING.liftMs);
  });
}

describe('TitleScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    mockReduced = false;
  });

  it('prints the game\'s name as the wordmark, never the old title', () => {
    const { getByTestId, queryByText } = mount();
    expect(getByTestId('title-wordmark').props.children).toBe('Miserere Mei, Deus');
    expect(queryByText(/axiomancer/i)).toBeNull();
  });

  it('prints the psalm line, its source and the footer', () => {
    const { getByText } = mount();
    expect(getByText(TITLE_COPY.psalm)).toBeTruthy();
    expect(getByText(TITLE_COPY.psalmSource)).toBeTruthy();
    // A new game starts on the Breakwater, at the windmill.
    expect(getByText(/windmill above the breakwater/)).toBeTruthy();
  });

  /**
   * The title screen has no map, so the sub-line under its only button has
   * to describe what EMBARK does, not give map instructions.
   */
  it('labels EMBARK with what it does', () => {
    const { getByRole, queryByText } = mount();
    expect(getByRole('button').props.accessibilityLabel).toBe(TITLE_COPY.embarkLabel);
    expect(getByRole('button').props.accessibilityHint).toBe(TITLE_COPY.embarkHint);
    expect(queryByText(/glowing node/i)).toBeNull();
  });

  it('describes the plate for screen readers', () => {
    const { getByLabelText } = mount();
    expect(getByLabelText(TITLE_COPY.plateLabel)).toBeTruthy();
  });

  it('brings the menu up in place when EMBARK is pressed, keeping the wordmark', () => {
    const { getByRole, queryByTestId, getByTestId } = mount();
    expect(queryByTestId('stub-menu')).toBeNull();
    playIntro();
    fireEvent.press(getByRole('button'));
    expect(getByTestId('stub-menu')).toBeTruthy();
    expect(getByTestId('title-wordmark')).toBeTruthy();
    expect(getByTestId('title-plate')).toBeTruthy();
  });

  it('ignores EMBARK until it starts to fade in, so a tap during the lift opens nothing', () => {
    const { getByRole, queryByTestId } = mount();
    fireEvent.press(getByRole('button'));
    expect(queryByTestId('stub-menu')).toBeNull();
    act(() => {
      jest.advanceTimersByTime(TITLE_TIMING.holdMs + TITLE_TIMING.liftMs - 1);
    });
    fireEvent.press(getByRole('button'));
    expect(queryByTestId('stub-menu')).toBeNull();
    act(() => {
      jest.advanceTimersByTime(1);
    });
    fireEvent.press(getByRole('button'));
    expect(queryByTestId('stub-menu')).toBeTruthy();
  });

  it('hides the faded psalm and EMBARK from screen readers once the menu is up', () => {
    const { getByRole, getByTestId, queryByRole, queryByText } = mount();
    expect(getByTestId('title-cta').props.accessibilityElementsHidden).toBe(false);
    playIntro();
    fireEvent.press(getByRole('button'));
    // The default queries already skip it; reach it to read the props.
    const cta = getByTestId('title-cta', { includeHiddenElements: true });
    expect(cta.props.accessibilityElementsHidden).toBe(true);
    expect(cta.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(cta.props['aria-hidden']).toBe(true);
    expect(queryByRole('button', { name: TITLE_COPY.embarkLabel })).toBeNull();
    expect(queryByText(TITLE_COPY.psalm)).toBeNull();
  });

  // A15: the faded Embark scroll's image sat over LOAD GAME and ate its tap.
  it('unmounts the Embark block once its fade ends, so nothing of it can take a touch', () => {
    const { getByRole, queryByTestId } = mount();
    playIntro();
    fireEvent.press(getByRole('button'));
    expect(queryByTestId('title-embark-scroll', { includeHiddenElements: true })).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(TITLE_TIMING.menuMs);
    });
    expect(queryByTestId('title-cta', { includeHiddenElements: true })).toBeNull();
    expect(queryByTestId('title-embark', { includeHiddenElements: true })).toBeNull();
    expect(queryByTestId('title-embark-scroll', { includeHiddenElements: true })).toBeNull();
    expect(queryByTestId('stub-menu')).toBeTruthy();
  });

  // A19: with motion reduced there is no fade to wait out; no timer advances here.
  it('unmounts the Embark block at once under reduced motion, with no timer advancing', () => {
    mockReduced = true;
    const { getByRole, queryByTestId } = mount();
    expect(queryByTestId('title-cta', { includeHiddenElements: true })).toBeTruthy();
    fireEvent.press(getByRole('button'));
    expect(queryByTestId('title-cta', { includeHiddenElements: true })).toBeNull();
    expect(queryByTestId('title-embark', { includeHiddenElements: true })).toBeNull();
    expect(queryByTestId('title-embark-scroll', { includeHiddenElements: true })).toBeNull();
    expect(queryByTestId('stub-menu')).toBeTruthy();
  });

  it('never mounts the Embark block when it opens on the menu', () => {
    const { queryByTestId } = mount({ startAtMenu: true });
    expect(queryByTestId('title-cta', { includeHiddenElements: true })).toBeNull();
  });

  it('opens on the menu when asked to (RETURN TO TITLE lands on ?menu=1)', () => {
    const { getByTestId } = mount({ startAtMenu: true });
    expect(getByTestId('stub-menu')).toBeTruthy();
    expect(getByTestId('title-wordmark')).toBeTruthy();
  });

  // Critique pass 79: the menu shares the plate's band, so a wide window
  // never leaves its rows hanging past the art.
  it('hosts the menu in the plate\'s band', () => {
    const { getByTestId } = mount({ startAtMenu: true });
    const flat = (id: string) => StyleSheet.flatten(getByTestId(id).props.style);
    const plate = flat('title-plate');
    expect(flat('title-menu')).toMatchObject({ left: plate.left, width: plate.width });
  });

  /** Plan 121.3: EMBARK is T's parchment "Embark" scroll, not a text button. */
  it('draws EMBARK as the Embark scroll at its aspect, ringed on focus', () => {
    const { getByTestId, queryByTestId, queryByText } = mount();
    const scroll = getByTestId('title-embark-scroll');
    expect([scroll.props.source].flat()).toEqual([EMBARK_SCROLL]);
    const art = StyleSheet.flatten(scroll.props.style);
    expect(art.width).toBe('100%');
    expect(art.aspectRatio).toBeCloseTo(EMBARK_SCROLL_ASPECT);
    expect(queryByText(/EMBARK/)).toBeNull();
    playIntro();
    const button = getByTestId('title-embark');
    expect(queryByTestId('title-embark-focus')).toBeNull();
    fireEvent(button, 'focus');
    expect(getByTestId('title-embark-focus')).toBeTruthy();
    fireEvent(button, 'blur');
    expect(queryByTestId('title-embark-focus')).toBeNull();
  });

  it('dips the Embark scroll while it is held', () => {
    const { getByTestId } = render(
      <EmbarkButton onPress={jest.fn()} accessibilityLabel={TITLE_COPY.embarkLabel} testID="embark" testOnlyPressed />,
    );
    const held = StyleSheet.flatten(getByTestId('embark').props.style);
    expect(held.opacity).toBe(EMBARK_PRESSED.opacity);
    expect(held.transform).toEqual([{ scale: EMBARK_PRESSED.scale }]);
  });
});
