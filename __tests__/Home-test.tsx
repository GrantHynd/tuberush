import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '@/app/(tabs)/index';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';

// Mock dependencies
jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/hooks/usePuzzleCarousel', () => ({
  usePuzzleCarousel: jest.fn(() => ({
    items: [
      {
        puzzleNumber: '#1',
        label: 'Today',
        isNew: true,
        isCompleted: false,
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
    stats: { bestTime: null, streak: 0 },
    loading: false,
    refresh: jest.fn(),
  })),
}));

jest.mock('@/hooks/useBoroughRank', () => ({
  useBoroughRank: jest.fn(() => ({
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

  it('renders correctly when not logged in', () => {
    // Mock user as null
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
    });

    const { getByText } = render(<HomeScreen />);

    // Check for header and games
    expect(getByText('TubeRush')).toBeTruthy();
    expect(getByText('Beat the commute.')).toBeTruthy();
    expect(getByText('Connections')).toBeTruthy();
    expect(getByText('Crossword')).toBeTruthy();
  });

  it('renders correctly when logged in', () => {
    // Mock user as logged in
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com', isPremium: false },
    });

    const { getByText, queryByText } = render(<HomeScreen />);

    // Check for header and games
    expect(getByText('TubeRush')).toBeTruthy();
    expect(getByText('Beat the commute.')).toBeTruthy();
    expect(getByText('Connections')).toBeTruthy();
    expect(getByText('Crossword')).toBeTruthy();

    // Check "Sign In / Register" button is NOT present (no welcome section in new design)
    expect(queryByText('Sign In / Register')).toBeNull();
  });

  it('navigates to auth when clicking a puzzle card if not logged in', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
    });

    const { getAllByText } = render(<HomeScreen />);

    const puzzleCards = getAllByText('Today');
    fireEvent.press(puzzleCards[0]);

    expect(mockPush).toHaveBeenCalledWith('/auth');
  });

  it('navigates to connections game when logged in and puzzle card pressed', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: 'user1', email: 'test@example.com', isPremium: false },
    });

    const { getAllByText } = render(<HomeScreen />);

    const puzzleCards = getAllByText('Today');
    fireEvent.press(puzzleCards[0]);

    expect(mockPush).toHaveBeenCalledWith(
      '/games/play-connections?date=2025-03-15',
    );
  });

  it('navigates to subscribe when clicking crossword puzzle card if not premium', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: 'user1', email: 'test@example.com', isPremium: false },
    });

    const { getAllByText } = render(<HomeScreen />);

    const todayLabels = getAllByText('Today');
    fireEvent.press(todayLabels[1]);

    expect(mockPush).toHaveBeenCalledWith('/subscribe');
  });

  it('navigates to crossword game when logged in and premium', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: 'user1', email: 'test@example.com', isPremium: true },
    });

    const { getAllByText } = render(<HomeScreen />);

    const todayLabels = getAllByText('Today');
    fireEvent.press(todayLabels[1]);

    expect(mockPush).toHaveBeenCalledWith(
      '/games/play-crossword?puzzleId=1',
    );
  });
});
