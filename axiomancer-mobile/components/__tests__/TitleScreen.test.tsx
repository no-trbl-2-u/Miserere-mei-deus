/**
 * Hermetic tests for the TitleScreen component: the launch sequence's copy,
 * EMBARK's hand-off to the menu in place, and the `?menu=1` entry.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { TitleScreen } from '../TitleScreen';
import { createAppStore } from '@/state/store';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { TITLE_COPY, TITLE_TIMING } from '@/state/presenters/title.engine';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

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
  afterEach(() => jest.useRealTimers());

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
    const { getByRole, getByText, queryByText } = mount();
    expect(getByRole('button').props.accessibilityLabel).toBe(TITLE_COPY.embarkLabel);
    expect(getByText(TITLE_COPY.embark)).toBeTruthy();
    expect(getByText(TITLE_COPY.embarkHint)).toBeTruthy();
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

  it('keeps the EMBARK label in the button face style', () => {
    const { getByText } = mount();
    expect(getByText(TITLE_COPY.embark).props.style).toMatchObject({
      fontFamily: expect.any(String),
      fontSize: 20,
      color: expect.any(String),
    });
  });
});
