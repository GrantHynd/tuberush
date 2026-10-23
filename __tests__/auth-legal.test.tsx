import AuthScreen from '@/app/auth';
import { PRIVACY_POLICY_ROUTE, TERMS_OF_USE_ROUTE } from '@/lib/legal';
import { useAuthStore } from '@/stores/auth-store';
import { fireEvent, render } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

describe('AuthScreen legal links', () => {
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push,
      replace: jest.fn(),
      back: jest.fn(),
    });
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      signIn: jest.fn(),
      signUp: jest.fn(),
    });
  });

  it('hides the agreement until the player is signing up', async () => {
    const { queryByText, getByTestId } = await render(<AuthScreen />);

    expect(queryByText(/By creating an account/)).toBeNull();

    await fireEvent.press(getByTestId('auth-switch-button'));

    expect(queryByText(/By creating an account/)).toBeTruthy();
  });

  it('opens the terms and privacy policy from sign-up', async () => {
    const { getByTestId } = await render(<AuthScreen />);
    await fireEvent.press(getByTestId('auth-switch-button'));

    await fireEvent.press(getByTestId('auth-terms-link'));
    await fireEvent.press(getByTestId('auth-privacy-link'));

    expect(push).toHaveBeenCalledWith(TERMS_OF_USE_ROUTE);
    expect(push).toHaveBeenCalledWith(PRIVACY_POLICY_ROUTE);
  });
});
