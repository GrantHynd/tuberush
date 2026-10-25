import {
    ClueBar,
    FeedbackToast,
    FinishedGameView,
    GameHeader,
    GameKeyboard,
    keyboardHeight,
    LineRail,
    Tile,
} from '@/components/game-ui';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, Text } from 'react-native';

describe('shared game components (TUB-294)', () => {
    beforeEach(() => {
        jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());

    it('GameHeader renders title, subtitle, 44pt back and right slot', async () => {
        const onBack = jest.fn();
        const { getByText, getByRole } = await render(
            <GameHeader title="Crossword" subtitle="Sun 25 Oct" lineColor="#A4161A" onBack={onBack} right={<Text>0:42</Text>} />,
        );
        expect(getByText('Sun 25 Oct')).toBeTruthy();
        expect(getByText('0:42')).toBeTruthy();
        await fireEvent.press(getByRole('button', { name: 'Go back' }));
        expect(onBack).toHaveBeenCalled();
    });

    it.each(['default', 'selected', 'solved', 'error', 'disabled'] as const)('Tile state %s goes in accessibilityState, not label', async (state) => {
        const { getByLabelText } = await render(<Tile label="HYDE" state={state} onPress={jest.fn()} />);
        const el = getByLabelText('HYDE');
        expect(el.props.accessibilityState.selected).toBe(state === 'selected');
        expect(el.props.accessibilityState.disabled).toBe(state === 'disabled' || state === 'solved');
    });

    it('selected Tile shows a station dot', async () => {
        const { getByTestId } = await render(<Tile testID="t" label="HYDE" state="selected" onPress={jest.fn()} />);
        expect(getByTestId('t-dot')).toBeTruthy();
    });

    it('FeedbackToast announces and auto-hides after 2.5s', async () => {
        jest.useFakeTimers();
        const onHide = jest.fn();
        const { getByText } = await render(<FeedbackToast message="Not a line. 3 tries left." onHide={onHide} />);
        expect(getByText('MIND THE GAP')).toBeTruthy();
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Mind the gap. Not a line. 3 tries left.');
        await act(async () => { jest.advanceTimersByTime(3000); });
        expect(onHide).toHaveBeenCalled();
        jest.useRealTimers();
    });

    it('GameKeyboard is 3 rows with Backspace and Check on row 3', async () => {
        const onKey = jest.fn(); const onBackspace = jest.fn(); const onCheck = jest.fn();
        const { getByTestId } = await render(<GameKeyboard onKey={onKey} onBackspace={onBackspace} onCheck={onCheck} />);
        await fireEvent.press(getByTestId('key-Q'));
        await fireEvent.press(getByTestId('key-backspace'));
        await fireEvent.press(getByTestId('key-check'));
        expect(onKey).toHaveBeenCalledWith('Q');
        expect(onBackspace).toHaveBeenCalled();
        expect(onCheck).toHaveBeenCalled();
        expect(keyboardHeight(46)).toBe(170);
        expect(keyboardHeight(42, 6)).toBe(154);
    });

    it('GameKeyboard disabled Check is not pressable', async () => {
        const onCheck = jest.fn();
        const { getByTestId } = await render(<GameKeyboard onKey={jest.fn()} onBackspace={jest.fn()} onCheck={onCheck} checkDisabled />);
        await fireEvent.press(getByTestId('key-check'));
        expect(onCheck).not.toHaveBeenCalled();
    });

    it('ClueBar exposes prev/next/toggle', async () => {
        const p = jest.fn(); const n = jest.fn(); const t = jest.fn();
        const { getByRole } = await render(
            <ClueBar label="1 Across" clue="Keep these open" length={4} lineColor="#A4161A" onPrev={p} onNext={n} onToggleDirection={t} />,
        );
        await fireEvent.press(getByRole('button', { name: 'Previous clue' }));
        await fireEvent.press(getByRole('button', { name: 'Next clue' }));
        await fireEvent.press(getByRole('button', { name: 'Switch direction' }));
        expect([p, n, t].every((f) => f.mock.calls.length === 1)).toBe(true);
    });

    it('LineRail labels a revealed group as one element', async () => {
        const { getByLabelText, getByText } = await render(
            <LineRail level={2} category="Royal parks" items={['Hyde', 'Regent', 'Green', 'St James']} marker="revealed" />,
        );
        expect(getByLabelText('Group 2, Royal parks, revealed: Hyde, Regent, Green, St James')).toBeTruthy();
        expect(getByText('REVEALED')).toBeTruthy();
    });

    it('FinishedGameView reopen: no announcement; just finished: announces', async () => {
        const props = {
            outcome: 'win' as const, lineColor: '#003688', title: 'Journey complete', time: '1:42',
            board: <Text>board</Text>, stats: [{ label: 'Time', value: '1:42' }],
            onLeaderboard: jest.fn(), onShare: jest.fn(), announcement: 'Journey complete.',
        };
        (AccessibilityInfo.announceForAccessibility as jest.Mock).mockClear();
        const r1 = await render(<FinishedGameView {...props} />);
        expect(r1.getByText('Journey complete')).toBeTruthy();
        expect(r1.getByRole('button', { name: 'Share' })).toBeTruthy();
        expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
        r1.unmount();
        await render(<FinishedGameView {...props} justFinished />);
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Journey complete.');
    });
});
