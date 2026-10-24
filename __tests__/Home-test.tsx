import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '@/app/(tabs)/index';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';
import { useLocationRank } from '@/hooks/useLocationRank';

// Mock dependencies
jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/hooks/usePuzzleCarousel', () => ({
  usePuzzleCarousel: jest.fn(() => ({
    items: [
      {
        label: 'Today',
        isNew: true,
        isCompleted: false,
        status: 'unplayed',
        commuteCount: 0,
        date: '2025-03-15',
        puzzleId: '1',
      },
    ],
    loading: false,
    refresh: jest.fn(),
  })),
}));

jest.mock('@/hooks/useUserStats', () => ({
  useUserStats: jest.fn(() => ({
    stats: { bestTime: null, bestTimeGameType: null, streak: 0 },
    loading: false,
    refresh: jest.fn(),
  })),
}));

jest.mock('@/hooks/useLocationRank', () => ({
  useLocationRank: jest.fn(() => ({
    rank: null,
    loading: false,
    refresh: jest.fn(),
  })),
}));

describe('HomeScreen', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup useRouter mock return value
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('renders correctly when not logged in', async () => {
    // Mock user as null
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
    });

    const { getByText, getAllByText } = await render(<HomeScreen />);

    // Check for header and games
    expect(getByText('TubeRush')).toBeTruthy();
    expect(getByText('Beat the commute.')).toBeTruthy();
    expect(getAllByText('Connections').length).toBeGreaterThan(0);
    expect(getAllByText('Crossword').length).toBeGreaterThan(0);
  });

  it('renders correctly when logged in', async () => {
    // Mock user as logged in
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com', isPremium: false },
    });

    const { getByText, getAllByText, queryByText } = await render(<HomeScreen />);

    // Check for header and games
    expect(getByText('TubeRush')).toBeTruthy();
    expect(getByText('Beat the commute.')).toBeTruthy();
    expect(getAllByText('Connections').length).toBeGreaterThan(0);
    expect(getAllByText('Crossword').length).toBeGreaterThan(0);

    // Check "Sign In / Register" button is NOT present (no welcome section in new design)
    expect(queryByText('Sign In / Register')).toBeNull();
  });

  it('navigates to auth when clicking a puzzle card if not logged in', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
    });

    const { getAllByText } = await render(<HomeScreen />);

    const puzzleCards = getAllByText('Today');
    await fireEvent.press(puzzleCards[0]);

    expect(mockPush).toHaveBeenCalledWith('/auth');
  });

  it('navigates to connections game when logged in and puzzle card pressed', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: 'user1', email: 'test@example.com', isPremium: false },
    });

    const { getAllByText } = await render(<HomeScreen />);

    const puzzleCards = getAllByText('Today');
    await fireEvent.press(puzzleCards[0]);

    expect(mockPush).toHaveBeenCalledWith(
      '/games/play-connections?date=2025-03-15',
    );
  });

  it('navigates to subscribe when clicking crossword puzzle card if not premium', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: 'user1', email: 'test@example.com', isPremium: false },
    });

    const { getAllByText } = await render(<HomeScreen />);

    const todayLabels = getAllByText('Today');
    await fireEvent.press(todayLabels[1]);

    expect(mockPush).toHaveBeenCalledWith('/subscribe');
  });

  it('navigates to crossword game when logged in and premium', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: 'user1', email: 'test@example.com', isPremium: true },
    });

    const { getAllByText } = await render(<HomeScreen />);

    const todayLabels = getAllByText('Today');
    await fireEvent.press(todayLabels[1]);

    expect(mockPush).toHaveBeenCalledWith(
      '/games/play-crossword?puzzleId=1',
    );
  });

  it('explains how to get ranked when the user has no area rank yet', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: null });
    (useLocationRank as jest.Mock).mockReturnValueOnce({
      rank: { location: 'Barking and Dagenham', rank: 0 },
      loading: false,
      refresh: jest.fn(),
    });

    const { getByText } = await render(<HomeScreen />);

    expect(
      getByText("Play today's puzzle to get ranked in Barking and Dagenham"),
    ).toBeTruthy();
  });
});

describe('HomeScreen hero (TUB-251)', () => {
  it('shows the Today hero with Sign in rows when signed out', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: null });
    const { getByTestId, getByText } = await render(<HomeScreen />);
    expect(getByTestId('today-hero')).toBeTruthy();
    expect(getByText("Today's puzzles")).toBeTruthy();
    expect(getByTestId('today-hero-connections').props.accessibilityLabel).toMatch(/Sign in to play/);
  });
});

describe('HomeScreen stats empty state (TUB-255)', () => {
  it('replaces the tiles with the encouraging empty state for a new user', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: null });
    const { getByTestId, getByText, queryByText } = await render(<HomeScreen />);
    expect(getByTestId('home-stats-empty')).toBeTruthy();
    expect(getByText('Your stats start here')).toBeTruthy();
    expect(getByText("Play today's puzzle")).toBeTruthy();
    expect(queryByText('Best Time')).toBeNull();
  });
});
