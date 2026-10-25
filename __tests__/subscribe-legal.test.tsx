import SubscribeScreen from '@/app/subscribe';
import { PRIVACY_POLICY_ROUTE, TERMS_OF_USE_ROUTE } from '@/lib/legal';
import { useAuthStore } from '@/stores/auth-store';
import { fireEvent, render } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/lib/posthog', () => ({
  capture: jest.fn(),
}));

describe('SubscribeScreen legal links', () => {
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push,
      replace: jest.fn(),
      back: jest.fn(),
    });
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: 'user1', email: 'test@example.com', isPremium: false },
      refreshPremiumStatusFromRevenueCat: jest.fn(),
    });
  });

  it('shows the subscription terms and opens both legal pages', async () => {
    const { getByText, getByTestId } = await render(<SubscribeScreen />);

    expect(getByText(/auto-renewable subscription/)).toBeTruthy();
    expect(getByText(/at least 24 hours before the period ends/)).toBeTruthy();

    await fireEvent.press(getByTestId('subscribe-privacy-link'));
    await fireEvent.press(getByTestId('subscribe-terms-link'));

    expect(push).toHaveBeenCalledWith(PRIVACY_POLICY_ROUTE);
    expect(push).toHaveBeenCalledWith(TERMS_OF_USE_ROUTE);
  });
});

describe('SubscribeScreen benefits', () => {
  it('shows the premium benefits carried over from the crossword Upsell', async () => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), replace: jest.fn(), back: jest.fn() });
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: 'user1', email: 'test@example.com', isPremium: false },
      refreshPremiumStatusFromRevenueCat: jest.fn(),
    });
    const { getByText, queryByText } = await render(<SubscribeScreen />);
    expect(getByText(/a new London mini every day/)).toBeTruthy();
    expect(getByText('Leaderboards for your borough')).toBeTruthy();
    expect(getByText('Your full puzzle archive')).toBeTruthy();
    expect(queryByText('Ad-free experience')).toBeNull();
  });
});
