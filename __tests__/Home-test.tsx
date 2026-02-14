import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '@/app/(tabs)/index';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';

// Mock dependencies
jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(),
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

    // Check for welcome text for non-logged in user
    expect(getByText('Mind the Gap. Play the Game.')).toBeTruthy();

    // Check for "Sign In / Register" button
    expect(getByText('Sign In / Register')).toBeTruthy();

    // Check if games are rendered
    expect(getByText('Connections')).toBeTruthy();
    expect(getByText('Crossword Puzzle')).toBeTruthy();
  });

  it('renders correctly when logged in', () => {
    // Mock user as logged in
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com', isPremium: false },
    });

    const { getByText, queryByText } = render(<HomeScreen />);

    // Check for welcome back message
    expect(getByText('Welcome back, test!')).toBeTruthy();

    // Check "Sign In / Register" button is NOT present
    expect(queryByText('Sign In / Register')).toBeNull();
  });

  it('navigates to auth when clicking a game if not logged in', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
    });

    const { getByText } = render(<HomeScreen />);

    const gameTitle = getByText('Connections');
    fireEvent.press(gameTitle);

    expect(mockPush).toHaveBeenCalledWith('/auth');
  });

  it('navigates to game when logged in and game is free', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com', isPremium: false },
    });

    const { getByText } = render(<HomeScreen />);

    const gameTitle = getByText('Connections');
    fireEvent.press(gameTitle);

    expect(mockPush).toHaveBeenCalledWith('/games/play-connections');
  });

  it('navigates to subscribe when clicking premium game if not premium', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com', isPremium: false },
    });

    const { getByText } = render(<HomeScreen />);

    const gameTitle = getByText('Crossword Puzzle');
    fireEvent.press(gameTitle);

    expect(mockPush).toHaveBeenCalledWith('/subscribe');
  });

  it('navigates to premium game when logged in and premium', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { email: 'test@example.com', isPremium: true },
    });

    const { getByText } = render(<HomeScreen />);

    const gameTitle = getByText('Crossword Puzzle');
    fireEvent.press(gameTitle);

    expect(mockPush).toHaveBeenCalledWith('/games/play-crossword');
  });
});
