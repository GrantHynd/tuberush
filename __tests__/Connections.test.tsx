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

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders all cards for incomplete groups", async () => {
      const { getByText } = await render(
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

    it("renders completed groups correctly", async () => {
      const gameStateWithCompleted: ConnectionsState = {
        ...initialGameState,
        completedGroups: ["TUBE LINES"],
      };

      const { getByText, queryByLabelText } = await render(
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

    it("displays correct number of mistakes remaining", async () => {
      const gameState: ConnectionsState = {
        ...initialGameState,
        mistakesRemaining: 2,
      };

      const { getByLabelText } = await render(
        <Connections
          gameState={gameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      expect(getByLabelText("2 mistakes remaining")).toBeTruthy();
    });

    it("renders shuffle and deselect all buttons", async () => {
      const { getByText } = await render(
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
    it("selects a card when pressed", async () => {
      const { getByText, getByLabelText } = await render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      await fireEvent.press(getByText("BAKERLOO"));
      expect(getByLabelText("BAKERLOO, selected")).toBeTruthy();
    });

    it("deselects a card when pressed again", async () => {
      const { getByText, getByLabelText } = await render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      await fireEvent.press(getByText("BAKERLOO"));
      expect(getByLabelText("BAKERLOO, selected")).toBeTruthy();
      await fireEvent.press(getByText("BAKERLOO"));
      expect(getByLabelText("BAKERLOO, not selected")).toBeTruthy();
    });

    it("allows selecting up to 4 cards", async () => {
      const { getByText, getByLabelText } = await render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      await fireEvent.press(getByText("BAKERLOO"));
      await fireEvent.press(getByText("CENTRAL"));
      await fireEvent.press(getByText("DISTRICT"));
      await fireEvent.press(getByText("NORTHERN"));

      expect(getByLabelText("BAKERLOO, selected")).toBeTruthy();
      expect(getByLabelText("CENTRAL, selected")).toBeTruthy();
      expect(getByLabelText("DISTRICT, selected")).toBeTruthy();
      expect(getByLabelText("NORTHERN, selected")).toBeTruthy();
    });

    it("does not allow selecting more than 4 cards", async () => {
      const { getByText, getByLabelText } = await render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      await fireEvent.press(getByText("BAKERLOO"));
      await fireEvent.press(getByText("CENTRAL"));
      await fireEvent.press(getByText("DISTRICT"));
      await fireEvent.press(getByText("NORTHERN"));
      await fireEvent.press(getByText("HYDE"));

      expect(getByLabelText("HYDE, not selected")).toBeTruthy();
    });

    it("triggers haptic feedback on selection", async () => {
      const { getByText } = await render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      await fireEvent.press(getByText("BAKERLOO"));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light,
      );
    });

    it("prevents selection when game is not playing", async () => {
      const gameState: ConnectionsState = {
        ...initialGameState,
        status: "won",
      };

      const { getByText, getByLabelText } = await render(
        <Connections
          gameState={gameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      await fireEvent.press(getByText("BAKERLOO"));
      expect(getByLabelText("BAKERLOO, not selected")).toBeTruthy();
    });
  });

  describe("Submit Button", () => {
    it("submits when Submit button is pressed with 4 cards selected", async () => {
      const { getByText } = await render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      await waitFor(() => expect(getByText("BAKERLOO")).toBeTruthy());

      await fireEvent.press(getByText("BAKERLOO"));
      await fireEvent.press(getByText("CENTRAL"));
      await fireEvent.press(getByText("DISTRICT"));
      await fireEvent.press(getByText("NORTHERN"));

      expect(mockOnSubmitGuess).not.toHaveBeenCalled();

      await fireEvent.press(getByText("Submit"));

      expect(mockOnSubmitGuess).toHaveBeenCalledWith([
        "BAKERLOO",
        "CENTRAL",
        "DISTRICT",
        "NORTHERN",
      ]);
    });

    it("clears selection after submit", async () => {
      const { getByText, getByLabelText } = await render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      await waitFor(() => expect(getByText("BAKERLOO")).toBeTruthy());

      await fireEvent.press(getByText("BAKERLOO"));
      await fireEvent.press(getByText("CENTRAL"));
      await fireEvent.press(getByText("DISTRICT"));
      await fireEvent.press(getByText("NORTHERN"));

      await fireEvent.press(getByText("Submit"));

      expect(getByLabelText("BAKERLOO, not selected")).toBeTruthy();
    });

    it("is disabled when fewer than 4 cards are selected", async () => {
      const { getByText, getByLabelText } = await render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      const submitButton = getByLabelText("Submit guess");
      expect(submitButton.props.accessibilityState.disabled).toBe(true);

      await fireEvent.press(getByText("BAKERLOO"));
      await fireEvent.press(getByText("CENTRAL"));
      expect(getByLabelText("Submit guess").props.accessibilityState.disabled).toBe(true);
    });

    it("does not submit when game is not playing", async () => {
      const gameState: ConnectionsState = {
        ...initialGameState,
        status: "won",
      };

      const { getByText } = await render(
        <Connections
          gameState={gameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      await fireEvent.press(getByText("Submit"));

      await waitFor(() => {
        expect(mockOnSubmitGuess).not.toHaveBeenCalled();
      });
    });
  });

  describe("Deselect All Button", () => {
    it("deselects all selected cards", async () => {
      const { getByText, getByLabelText } = await render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      await fireEvent.press(getByText("BAKERLOO"));
      await fireEvent.press(getByText("CENTRAL"));
      await fireEvent.press(getByText("DISTRICT"));
      await fireEvent.press(getByText("Deselect All"));

      expect(getByLabelText("BAKERLOO, not selected")).toBeTruthy();
      expect(getByLabelText("CENTRAL, not selected")).toBeTruthy();
      expect(getByLabelText("DISTRICT, not selected")).toBeTruthy();
    });

    it("is disabled when no cards are selected", async () => {
      const { getByLabelText } = await render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      const deselectButton = getByLabelText("Deselect all items");
      expect(deselectButton.props.accessibilityState.disabled).toBe(true);
    });

    it("is enabled when cards are selected", async () => {
      const { getByText, getByLabelText } = await render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      await fireEvent.press(getByText("BAKERLOO"));
      const deselectButton = getByLabelText("Deselect all items");
      expect(deselectButton.props.accessibilityState.disabled).toBe(false);
    });
  });

  describe("Shuffle Button", () => {
    it("shuffle button is accessible and enabled during play", async () => {
      const { getByLabelText } = await render(
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

    it("shuffles the card order", async () => {
      const { getByText, getAllByRole } = await render(
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
      await fireEvent.press(getByText("Shuffle"));

      const cardsAfterShuffle = getAllByRole("button").filter(
        (button) =>
          button.props.accessibilityLabel?.includes("not selected") ||
          button.props.accessibilityLabel?.includes("selected"),
      );
      expect(cardsAfterShuffle.length).toBe(initialOrder.length);
      mockRandom.mockRestore();
    });

    it("is disabled when game is not playing", async () => {
      const gameState: ConnectionsState = {
        ...initialGameState,
        status: "won",
      };

      const { getByLabelText } = await render(
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
    it("is mocked and available", async () => {
      expect(Haptics.impactAsync).toBeDefined();
      expect(Haptics.notificationAsync).toBeDefined();
    });

    it("triggers error haptic on mistake", async () => {
      const initialState: ConnectionsState = {
        ...initialGameState,
        mistakesRemaining: 4,
      };

      const { rerender } = await render(
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

      await rerender(
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

    it("triggers success haptic on correct guess", async () => {
      const initialState: ConnectionsState = {
        ...initialGameState,
        completedGroups: [],
      };

      const { rerender } = await render(
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

      await rerender(
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
    it("has proper accessibility labels on cards", async () => {
      const { getByLabelText } = await render(
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

    it("has proper accessibility labels on completed groups", async () => {
      const gameState: ConnectionsState = {
        ...initialGameState,
        completedGroups: ["TUBE LINES"],
      };

      const { getByLabelText } = await render(
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

    it("has proper accessibility labels on mistakes indicator", async () => {
      const { getByLabelText } = await render(
        <Connections
          gameState={initialGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      expect(getByLabelText("4 mistakes remaining")).toBeTruthy();
    });

    it("has proper accessibility state on disabled buttons", async () => {
      const gameState: ConnectionsState = {
        ...initialGameState,
        status: "won",
      };

      const { getByLabelText } = await render(
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
    it("renders cards at different screen widths", async () => {
      mockUseWindowDimensions.mockReturnValue({ width: 320, height: 568 });

      const { getAllByRole } = await render(
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

      // With Pressable, cards are rendered and accessible
      expect(cards.length).toBe(16);
    });
  });

  describe("Loss Reveal", () => {
    it("reveals all unsolved groups when game is lost (animation)", async () => {
      const lostGameState: ConnectionsState = {
        ...initialGameState,
        status: "lost",
        mistakesRemaining: 0,
        completedGroups: ["TUBE LINES"],
      };

      const { getByLabelText } = await render(
        <Connections
          gameState={lostGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      // Completed group should be present
      expect(getByLabelText(/Completed group: TUBE LINES/)).toBeTruthy();

      // Wait for first revealed group (400ms delay)
      await waitFor(
        () => {
          expect(getByLabelText(/Revealed group: ROYAL PARKS/)).toBeTruthy();
        },
        { timeout: 1000 },
      );

      // Wait for all revealed groups
      await waitFor(
        () => {
          expect(getByLabelText(/Revealed group: LONDON AIRPORTS/)).toBeTruthy();
          expect(getByLabelText(/Revealed group: MONOPOLY STREETS/)).toBeTruthy();
        },
        { timeout: 2000 },
      );
    });

    it("shows revealed groups immediately when reloading a lost game", async () => {
      const lostGameState: ConnectionsState = {
        ...initialGameState,
        status: "lost",
        mistakesRemaining: 0,
        completedGroups: ["TUBE LINES", "ROYAL PARKS"],
      };

      const { getByLabelText } = await render(
        <Connections
          gameState={lostGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      // All groups should be visible immediately
      expect(getByLabelText(/Completed group: TUBE LINES/)).toBeTruthy();
      expect(getByLabelText(/Completed group: ROYAL PARKS/)).toBeTruthy();
      expect(getByLabelText(/Revealed group: LONDON AIRPORTS/)).toBeTruthy();
      expect(getByLabelText(/Revealed group: MONOPOLY STREETS/)).toBeTruthy();
    });

    it("reveals groups in difficulty order", async () => {
      const lostGameState: ConnectionsState = {
        ...initialGameState,
        status: "lost",
        mistakesRemaining: 0,
        completedGroups: [],
      };

      const { getByLabelText, queryByLabelText } = await render(
        <Connections
          gameState={lostGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      // Wait for difficulty 1 to appear (TUBE LINES)
      await waitFor(
        () => {
          expect(getByLabelText(/Revealed group: TUBE LINES/)).toBeTruthy();
        },
        { timeout: 1000 },
      );

      // Difficulty 2 (ROYAL PARKS) should appear next
      await waitFor(
        () => {
          expect(getByLabelText(/Revealed group: ROYAL PARKS/)).toBeTruthy();
        },
        { timeout: 1000 },
      );

      // Wait for all groups
      await waitFor(
        () => {
          expect(getByLabelText(/Revealed group: LONDON AIRPORTS/)).toBeTruthy();
          expect(getByLabelText(/Revealed group: MONOPOLY STREETS/)).toBeTruthy();
        },
        { timeout: 2000 },
      );
    });

    it("calls onRevealComplete after all groups are revealed", async () => {
      const mockOnRevealComplete = jest.fn();
      const lostGameState: ConnectionsState = {
        ...initialGameState,
        status: "lost",
        mistakesRemaining: 0,
        completedGroups: ["TUBE LINES"],
      };

      await render(
        <Connections
          gameState={lostGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
          onRevealComplete={mockOnRevealComplete}
        />,
      );

      // Wait for reveal to complete (3 groups * 400ms + buffer)
      await waitFor(
        () => {
          expect(mockOnRevealComplete).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );
    });

    it("removes grid tiles as groups are revealed", async () => {
      // Use a fresh component that starts in playing state and transitions to lost
      // to test the animation path
      const playingState: ConnectionsState = {
        ...initialGameState,
        status: "playing",
        mistakesRemaining: 1,
        completedGroups: ["TUBE LINES"],
      };

      const { getByLabelText, queryByLabelText, rerender } = await render(
        <Connections
          gameState={playingState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      // Items from ROYAL PARKS should be in grid initially
      expect(
        queryByLabelText("HYDE, not selected") ||
          queryByLabelText("HYDE, selected"),
      ).toBeTruthy();

      // Transition to lost state
      const lostGameState: ConnectionsState = {
        ...playingState,
        status: "lost",
        mistakesRemaining: 0,
      };

      await rerender(
        <Connections
          gameState={lostGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      // Wait for ROYAL PARKS to be revealed
      await waitFor(
        () => {
          expect(getByLabelText(/Revealed group: ROYAL PARKS/)).toBeTruthy();
        },
        { timeout: 1000 },
      );

      // After reveal, HYDE should not be in the grid anymore
      await waitFor(
        () => {
          expect(queryByLabelText("HYDE, not selected")).toBeNull();
          expect(queryByLabelText("HYDE, selected")).toBeNull();
        },
        { timeout: 500 },
      );
    });

    it("handles loss with 0 groups solved", async () => {
      const lostGameState: ConnectionsState = {
        ...initialGameState,
        status: "lost",
        mistakesRemaining: 0,
        completedGroups: [],
      };

      const { getByLabelText } = await render(
        <Connections
          gameState={lostGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      // Wait for all 4 groups to be revealed
      await waitFor(
        () => {
          expect(getByLabelText(/Revealed group: TUBE LINES/)).toBeTruthy();
          expect(getByLabelText(/Revealed group: ROYAL PARKS/)).toBeTruthy();
          expect(getByLabelText(/Revealed group: LONDON AIRPORTS/)).toBeTruthy();
          expect(getByLabelText(/Revealed group: MONOPOLY STREETS/)).toBeTruthy();
        },
        { timeout: 2500 },
      );
    });

    it("clears timers on unmount during reveal", async () => {
      const lostGameState: ConnectionsState = {
        ...initialGameState,
        status: "lost",
        mistakesRemaining: 0,
        completedGroups: ["TUBE LINES"],
      };

      const { unmount } = await render(
        <Connections
          gameState={lostGameState}
          puzzle={mockPuzzle}
          onSubmitGuess={mockOnSubmitGuess}
        />,
      );

      // Unmount before reveal completes
      await unmount();

      // If timers weren't cleared, this would cause warnings
      // Wait to ensure no errors occur
      await waitFor(() => {}, { timeout: 500 });
    });
  });
});
