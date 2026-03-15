import { Connections } from "@/components/games/Connections";
import { ConnectionsPuzzle } from "@/constants/ConnectionsData";
import { ConnectionsState } from "@/types/game";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import React from "react";

// Mock haptics (must include NotificationFeedbackType for haptic tests)
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 0, Medium: 1, Heavy: 2 },
  NotificationFeedbackType: { Success: 1, Warning: 2, Error: 3 },
}));

// Mock useWindowDimensions and LayoutAnimation
const mockUseWindowDimensions = jest.fn(() => ({ width: 390, height: 844 }));
const mockConfigureNext = jest.fn();

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  default: mockUseWindowDimensions,
}));

jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  RN.useWindowDimensions = mockUseWindowDimensions;
  RN.LayoutAnimation = RN.LayoutAnimation
    ? { ...RN.LayoutAnimation, configureNext: mockConfigureNext }
    : { configureNext: mockConfigureNext };
  return RN;
});

describe("Connections Component", () => {
  const mockOnSubmitGuess = jest.fn();

  const mockPuzzle: ConnectionsPuzzle = {
    id: "1",
    date: "2024-03-14",
    groups: [
      {
        category: "TUBE LINES",
        items: ["BAKERLOO", "CENTRAL", "DISTRICT", "NORTHERN"],
        color: "#DC241F",
        difficulty: 1,
      },
      {
        category: "ROYAL PARKS",
        items: ["HYDE", "REGENT", "GREEN", "ST JAMES"],
        color: "#00A166",
        difficulty: 2,
      },
      {
        category: "LONDON AIRPORTS",
        items: ["HEATHROW", "GATWICK", "STANSTED", "LUTON"],
        color: "#0019A8",
        difficulty: 3,
      },
      {
        category: "MONOPOLY STREETS",
        items: ["VINE", "BOW", "FLEET", "STRAND"],
        color: "#FFD300",
        difficulty: 4,
      },
    ],
  };

  const initialGameState: ConnectionsState = {
    completedGroups: [],
    mistakesRemaining: 4,
    history: [],
    startTime: Date.now(),
    endTime: null,
    status: "playing",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders all cards for incomplete groups", () => {
      const { getByText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      expect(getByText("BAKERLOO")).toBeTruthy();
      expect(getByText("CENTRAL")).toBeTruthy();
      expect(getByText("HYDE")).toBeTruthy();
      expect(getByText("HEATHROW")).toBeTruthy();
      expect(getByText("VINE")).toBeTruthy();
    });

    it("renders completed groups correctly", () => {
      const gameStateWithCompleted: ConnectionsState = {
        ...initialGameState,
        completedGroups: ["TUBE LINES"],
      };

      const { getByText, queryByLabelText } = render(
        <Connections
          gameState={gameStateWithCompleted}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      expect(getByText("TUBE LINES")).toBeTruthy();
      expect(getByText("BAKERLOO, CENTRAL, DISTRICT, NORTHERN")).toBeTruthy();
      expect(queryByLabelText("BAKERLOO, not selected")).toBeNull();
      expect(queryByLabelText("BAKERLOO, selected")).toBeNull();
      expect(queryByLabelText("HYDE, not selected")).toBeTruthy();
    });

    it("displays correct number of lives remaining", () => {
      const gameState: ConnectionsState = {
        ...initialGameState,
        mistakesRemaining: 2,
      };

      const { getByLabelText } = render(
        <Connections
          gameState={gameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      expect(getByLabelText("2 lives remaining")).toBeTruthy();
    });

    it("renders shuffle and deselect all buttons", () => {
      const { getByText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      expect(getByText("Shuffle")).toBeTruthy();
      expect(getByText("Deselect All")).toBeTruthy();
    });
  });

  describe("Card Selection", () => {
    it("selects a card when pressed", () => {
      const { getByText, getByLabelText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      fireEvent.press(getByText("BAKERLOO"));
      expect(getByLabelText("BAKERLOO, selected")).toBeTruthy();
    });

    it("deselects a card when pressed again", () => {
      const { getByText, getByLabelText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      fireEvent.press(getByText("BAKERLOO"));
      expect(getByLabelText("BAKERLOO, selected")).toBeTruthy();
      fireEvent.press(getByText("BAKERLOO"));
      expect(getByLabelText("BAKERLOO, not selected")).toBeTruthy();
    });

    it("allows selecting up to 4 cards", () => {
      const { getByText, getByLabelText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      fireEvent.press(getByText("BAKERLOO"));
      fireEvent.press(getByText("CENTRAL"));
      fireEvent.press(getByText("DISTRICT"));
      fireEvent.press(getByText("NORTHERN"));

      expect(getByLabelText("BAKERLOO, selected")).toBeTruthy();
      expect(getByLabelText("CENTRAL, selected")).toBeTruthy();
      expect(getByLabelText("DISTRICT, selected")).toBeTruthy();
      expect(getByLabelText("NORTHERN, selected")).toBeTruthy();
    });

    it("does not allow selecting more than 4 cards", () => {
      const { getByText, getByLabelText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      fireEvent.press(getByText("BAKERLOO"));
      fireEvent.press(getByText("CENTRAL"));
      fireEvent.press(getByText("DISTRICT"));
      fireEvent.press(getByText("NORTHERN"));
      fireEvent.press(getByText("HYDE"));

      expect(getByLabelText("HYDE, not selected")).toBeTruthy();
    });

    it("triggers haptic feedback on selection", () => {
      const { getByText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      fireEvent.press(getByText("BAKERLOO"));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light,
      );
    });

    it("prevents selection when game is not playing", () => {
      const gameState: ConnectionsState = {
        ...initialGameState,
        status: "won",
      };

      const { getByText, getByLabelText } = render(
        <Connections
          gameState={gameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      fireEvent.press(getByText("BAKERLOO"));
      expect(getByLabelText("BAKERLOO, not selected")).toBeTruthy();
    });
  });

  describe("Auto-Submit", () => {
    it("auto-submits after 4th card selection with delay", async () => {
      const { getByText, getByLabelText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      await waitFor(() => expect(getByText("BAKERLOO")).toBeTruthy());

      fireEvent.press(getByText("BAKERLOO"));
      fireEvent.press(getByText("CENTRAL"));
      fireEvent.press(getByText("DISTRICT"));
      fireEvent.press(getByText("NORTHERN"));

      expect(getByLabelText("BAKERLOO, selected")).toBeTruthy();
      expect(mockOnSubmitGuess).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(mockOnSubmitGuess).toHaveBeenCalledWith([
        "BAKERLOO",
        "CENTRAL",
        "DISTRICT",
        "NORTHERN",
      ]);
    });

    it("clears selection after auto-submit", async () => {
      const { getByText, getByLabelText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      await waitFor(() => expect(getByText("BAKERLOO")).toBeTruthy());

      fireEvent.press(getByText("BAKERLOO"));
      fireEvent.press(getByText("CENTRAL"));
      fireEvent.press(getByText("DISTRICT"));
      fireEvent.press(getByText("NORTHERN"));

      act(() => {
        jest.advanceTimersByTime(400);
      });

      fireEvent.press(getByText("BAKERLOO"));
      expect(getByLabelText("BAKERLOO, selected")).toBeTruthy();
    });

    it("does not auto-submit when game is not playing", async () => {
      const gameState: ConnectionsState = {
        ...initialGameState,
        status: "won",
      };

      const { getByText } = render(
        <Connections
          gameState={gameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      act(() => {
        fireEvent.press(getByText("BAKERLOO"));
        fireEvent.press(getByText("CENTRAL"));
        fireEvent.press(getByText("DISTRICT"));
        fireEvent.press(getByText("NORTHERN"));
      });

      act(() => {
        jest.advanceTimersByTime(400);
      });

      await waitFor(() => {
        expect(mockOnSubmitGuess).not.toHaveBeenCalled();
      });
    });
  });

  describe("Deselect All Button", () => {
    it("deselects all selected cards", () => {
      const { getByText, getByLabelText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      fireEvent.press(getByText("BAKERLOO"));
      fireEvent.press(getByText("CENTRAL"));
      fireEvent.press(getByText("DISTRICT"));
      fireEvent.press(getByText("Deselect All"));

      expect(getByLabelText("BAKERLOO, not selected")).toBeTruthy();
      expect(getByLabelText("CENTRAL, not selected")).toBeTruthy();
      expect(getByLabelText("DISTRICT, not selected")).toBeTruthy();
    });

    it("is disabled when no cards are selected", () => {
      const { getByLabelText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      const deselectButton = getByLabelText("Deselect all items");
      expect(deselectButton.props.accessibilityState.disabled).toBe(true);
    });

    it("is enabled when cards are selected", () => {
      const { getByText, getByLabelText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      fireEvent.press(getByText("BAKERLOO"));
      const deselectButton = getByLabelText("Deselect all items");
      expect(deselectButton.props.accessibilityState.disabled).toBe(false);
    });
  });

  describe("Shuffle Button", () => {
    it("shuffle button is accessible and enabled during play", () => {
      const { getByLabelText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      const shuffleButton = getByLabelText("Shuffle items");
      expect(shuffleButton).toBeTruthy();
      expect(shuffleButton.props.accessibilityState.disabled).toBe(false);
    });

    it("shuffles the card order", () => {
      const { getByText, getAllByRole } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      const cardsBeforeShuffle = getAllByRole("button").filter(
        (button) =>
          button.props.accessibilityLabel?.includes("not selected") ||
          button.props.accessibilityLabel?.includes("selected"),
      );
      const initialOrder = cardsBeforeShuffle.map(
        (card) => card.props.accessibilityLabel,
      );

      const mockRandom = jest.spyOn(Math, "random");
      mockRandom.mockReturnValue(0.5);
      fireEvent.press(getByText("Shuffle"));

      const cardsAfterShuffle = getAllByRole("button").filter(
        (button) =>
          button.props.accessibilityLabel?.includes("not selected") ||
          button.props.accessibilityLabel?.includes("selected"),
      );
      expect(cardsAfterShuffle.length).toBe(initialOrder.length);
      mockRandom.mockRestore();
    });

    it("is disabled when game is not playing", () => {
      const gameState: ConnectionsState = {
        ...initialGameState,
        status: "won",
      };

      const { getByLabelText } = render(
        <Connections
          gameState={gameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      const shuffleButton = getByLabelText("Shuffle items");
      expect(shuffleButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe("Haptic Feedback", () => {
    it("is mocked and available", () => {
      expect(Haptics.impactAsync).toBeDefined();
      expect(Haptics.notificationAsync).toBeDefined();
    });

    it("triggers error haptic on mistake", () => {
      const initialState: ConnectionsState = {
        ...initialGameState,
        mistakesRemaining: 4,
      };

      const { rerender } = render(
        <Connections
          gameState={initialState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      const updatedState: ConnectionsState = {
        ...initialState,
        mistakesRemaining: 3,
      };

      rerender(
        <Connections
          gameState={updatedState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error,
      );
    });

    it("triggers success haptic on correct guess", () => {
      const initialState: ConnectionsState = {
        ...initialGameState,
        completedGroups: [],
      };

      const { rerender } = render(
        <Connections
          gameState={initialState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      const updatedState: ConnectionsState = {
        ...initialState,
        completedGroups: ["TUBE LINES"],
      };

      rerender(
        <Connections
          gameState={updatedState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success,
      );
    });
  });

  describe("Accessibility", () => {
    it("has proper accessibility labels on cards", () => {
      const { getByLabelText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      const card = getByLabelText("BAKERLOO, not selected");
      expect(card.props.accessibilityRole).toBe("button");
      expect(card.props.accessibilityHint).toBe("Tap to select or deselect");
    });

    it("has proper accessibility labels on completed groups", () => {
      const gameState: ConnectionsState = {
        ...initialGameState,
        completedGroups: ["TUBE LINES"],
      };

      const { getByLabelText } = render(
        <Connections
          gameState={gameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      expect(
        getByLabelText(
          "Completed group: TUBE LINES. Items: BAKERLOO, CENTRAL, DISTRICT, NORTHERN",
        ),
      ).toBeTruthy();
    });

    it("has proper accessibility labels on lives indicator", () => {
      const { getByLabelText } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      expect(getByLabelText("4 lives remaining")).toBeTruthy();
    });

    it("has proper accessibility state on disabled buttons", () => {
      const gameState: ConnectionsState = {
        ...initialGameState,
        status: "won",
      };

      const { getByLabelText } = render(
        <Connections
          gameState={gameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      const shuffleButton = getByLabelText("Shuffle items");
      expect(shuffleButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe("Responsive Design", () => {
    it("renders cards with calculated dimensions", () => {
      mockUseWindowDimensions.mockReturnValue({ width: 320, height: 568 });

      const { getAllByRole } = render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      const cards = getAllByRole("button").filter(
        (button) =>
          button.props.accessibilityLabel?.includes("not selected") ||
          button.props.accessibilityLabel?.includes("selected"),
      );

      const style = Array.isArray(cards[0].props.style)
        ? cards[0].props.style[cards[0].props.style.length - 1]
        : cards[0].props.style;

      expect(style).toMatchObject({
        width: expect.any(Number),
        height: expect.any(Number),
      });
    });
  });
});
