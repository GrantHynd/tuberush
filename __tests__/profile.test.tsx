import ProfileScreen from '@/app/(tabs)/profile';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { useRouter } from 'expo-router';

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/stores/game-store', () => ({
  useGameStore: jest.fn(() => ({
    syncNow: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('@/components/ui/SearchSelect', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  const SearchSelectMock = ({ visible, onClose, onSelect }: any) => {
    if (!visible) return null;
    return (
      <View testID="search-select-modal">
        <Text>SearchSelect</Text>
        <TouchableOpacity testID="search-select-close" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="search-select-manchester"
          onPress={() => onSelect('Manchester')}
        >
          <Text>Select Manchester</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="search-select-london"
          onPress={() => onSelect('London')}
        >
          <Text>Select London</Text>
        </TouchableOpacity>
      </View>
    );
  };
  return { SearchSelect: SearchSelectMock };
});

jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.0.0' },
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    });
  });

  it('renders sign-in prompt when not logged in', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Not Signed In')).toBeTruthy();
    expect(getByText('Sign in to save your game progress and compete on the leaderboard.')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('renders City/Town preference when logged in', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: {
        id: 'user1',
        email: 'test@example.com',
        isPremium: false,
        city: 'Manchester',
        borough: null,
      },
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('City/Town')).toBeTruthy();
    expect(getByText('Manchester')).toBeTruthy();
  });

  it('shows London, borough when user has London and borough', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: {
        id: 'user1',
        email: 'test@example.com',
        isPremium: false,
        city: 'London',
        borough: 'Islington',
      },
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('City/Town')).toBeTruthy();
    expect(getByText('London, Islington')).toBeTruthy();
  });

  it('shows Not set when user has no city', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: {
        id: 'user1',
        email: 'test@example.com',
        isPremium: false,
        city: null,
        borough: null,
      },
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('City/Town')).toBeTruthy();
    expect(getByText('Not set')).toBeTruthy();
  });

  it('opens SearchSelect when tapping City/Town row', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: {
        id: 'user1',
        email: 'test@example.com',
        isPremium: false,
        city: 'Manchester',
        borough: null,
      },
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByText, getByTestId, queryByTestId } = render(<ProfileScreen />);

    expect(queryByTestId('search-select-modal')).toBeNull();

    fireEvent.press(getByText('Manchester'));

    expect(getByTestId('search-select-modal')).toBeTruthy();
    expect(getByText('SearchSelect')).toBeTruthy();
  });

  it('calls updateProfile when selecting a non-London city from SearchSelect', async () => {
    const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: {
        id: 'user1',
        email: 'test@example.com',
        isPremium: false,
        city: null,
        borough: null,
      },
      signOut: jest.fn(),
      updateProfile: mockUpdateProfile,
    });

    const { getByText, getByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByText('Not set'));
    fireEvent.press(getByTestId('search-select-manchester'));

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      city: 'Manchester',
      borough: null,
    });
  });
});
