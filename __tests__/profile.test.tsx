import ProfileScreen from '@/app/(tabs)/profile';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Alert, Linking, Platform } from 'react-native';
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

  it('renders sign-in prompt when not logged in', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByText, queryByText } = await render(<ProfileScreen />);

    expect(getByText('Not Signed In')).toBeTruthy();
    expect(getByText('Sign in to save your game progress and compete on the leaderboard.')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(queryByText('Delete Account')).toBeNull();
  });

  it('renders City/Town preference when logged in', async () => {
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

    const { getByText } = await render(<ProfileScreen />);

    expect(getByText('City/Town')).toBeTruthy();
    expect(getByText('Manchester')).toBeTruthy();
  });

  it('shows London, borough when user has London and borough', async () => {
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

    const { getByText } = await render(<ProfileScreen />);

    expect(getByText('City/Town')).toBeTruthy();
    expect(getByText('London, Islington')).toBeTruthy();
  });

  it('shows Not set when user has no city', async () => {
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

    const { getByText } = await render(<ProfileScreen />);

    expect(getByText('City/Town')).toBeTruthy();
    expect(getByText('Not set')).toBeTruthy();
  });

  it('opens SearchSelect when tapping City/Town row', async () => {
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

    const { getByText, getByTestId, queryByTestId } = await render(<ProfileScreen />);

    expect(queryByTestId('search-select-modal')).toBeNull();

    await fireEvent.press(getByText('Manchester'));

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

    const { getByText, getByTestId } = await render(<ProfileScreen />);

    await fireEvent.press(getByText('Not set'));
    await fireEvent.press(getByTestId('search-select-manchester'));

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      city: 'Manchester',
      borough: null,
    });
  });

  it('confirms before deleting an account and explains that Apple subscriptions continue', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'ios';
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
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
      deleteAccount: jest.fn(),
    });

    const { getByTestId } = await render(<ProfileScreen />);
    await fireEvent.press(getByTestId('profile-delete-account-button'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete account?',
      expect.stringContaining('This cannot be undone'),
      expect.any(Array),
    );
    const message = alertSpy.mock.calls[0][1] as string;
    expect(message).toContain('does not cancel an Apple subscription');
    expect(message).toContain('Subscriptions');
    const buttons = alertSpy.mock.calls[0][2] as { text: string }[];
    expect(buttons.map((button) => button.text)).toEqual(['Cancel', 'Delete Account']);
    Platform.OS = originalOS;
    alertSpy.mockRestore();
  });

  it('offers subscription management when the membership is active', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'ios';
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: {
        id: 'user1',
        email: 'test@example.com',
        isPremium: true,
        city: 'Manchester',
        borough: null,
      },
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      deleteAccount: jest.fn(),
    });

    const { getByTestId } = await render(<ProfileScreen />);
    await fireEvent.press(getByTestId('profile-delete-account-button'));

    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    const manage = buttons.find((button) => button.text === 'Manage Subscription');
    manage?.onPress?.();

    expect(openURL).toHaveBeenCalledWith('https://apps.apple.com/account/subscriptions');
    Platform.OS = originalOS;
    alertSpy.mockRestore();
    openURL.mockRestore();
  });

  it('deletes the account and returns home after confirmation', async () => {
    const deleteAccount = jest.fn().mockResolvedValue(undefined);
    const replace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace,
      back: jest.fn(),
    });
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
      deleteAccount,
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByTestId } = await render(<ProfileScreen />);
    await fireEvent.press(getByTestId('profile-delete-account-button'));

    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => Promise<void> }[];
    const confirm = buttons.find((button) => button.text === 'Delete Account');
    await act(async () => {
      await confirm?.onPress?.();
    });

    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/');
    alertSpy.mockRestore();
  });

  it('stays on settings when account deletion fails', async () => {
    const deleteAccount = jest.fn().mockRejectedValue(new Error('Please try again.'));
    const replace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace,
      back: jest.fn(),
    });
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
      deleteAccount,
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByTestId } = await render(<ProfileScreen />);
    await fireEvent.press(getByTestId('profile-delete-account-button'));

    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => Promise<void> }[];
    const confirm = buttons.find((button) => button.text === 'Delete Account');
    await act(async () => {
      await confirm?.onPress?.();
    });

    expect(replace).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenLastCalledWith('Could not delete account', 'Please try again.');
    alertSpy.mockRestore();
  });
});
