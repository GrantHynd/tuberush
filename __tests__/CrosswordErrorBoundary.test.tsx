import React from 'react';
import { render } from '@testing-library/react-native';
import { CrosswordErrorBoundary } from '@/components/games/CrosswordErrorBoundary';
import { Text } from 'react-native';

function ThrowingChild(): React.ReactElement {
    throw new Error('Test puzzle crash');
}

function NormalChild() {
    return <Text>Normal content</Text>;
}

describe('CrosswordErrorBoundary', () => {
    const originalConsoleError = console.error;

    beforeAll(() => {
        // Suppress expected error boundary logs during tests
        console.error = jest.fn();
    });

    afterAll(() => {
        console.error = originalConsoleError;
    });

    it('renders children when no error', () => {
        const { getByText } = render(
            <CrosswordErrorBoundary>
                <NormalChild />
            </CrosswordErrorBoundary>
        );
        expect(getByText('Normal content')).toBeTruthy();
    });

    it('renders fallback UI when a child throws', () => {
        const { getByText } = render(
            <CrosswordErrorBoundary>
                <ThrowingChild />
            </CrosswordErrorBoundary>
        );
        expect(getByText('Something went wrong')).toBeTruthy();
        expect(getByText('Try Again')).toBeTruthy();
    });

    it('calls onReset when Try Again is pressed', () => {
        const onReset = jest.fn();
        const { getByText } = render(
            <CrosswordErrorBoundary onReset={onReset}>
                <ThrowingChild />
            </CrosswordErrorBoundary>
        );

        const { fireEvent } = require('@testing-library/react-native');
        fireEvent.press(getByText('Try Again'));

        expect(onReset).toHaveBeenCalledTimes(1);
    });
});
