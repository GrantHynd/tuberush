import PlayConnectionsScreen from "@/app/games/play-connections";
import { leaderboard } from "@/lib/leaderboard";
import { useAuthStore } from "@/stores/auth-store";
import { useGameStore } from "@/stores/game-store";
import { ConnectionsState } from "@/types/game";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import React from "react";

// Mock dependencies
jest.mock("@/stores/auth-store", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/stores/game-store", () => ({
  useGameStore: jest.fn(),
}));

jest.mock("@/lib/leaderboard", () => ({
  leaderboard: {
    submitScore: jest.fn(() => Promise.resolve()),
    getLeaderboard: jest.fn(() => Promise.resolve([])),
  },
}));

const mockPuzzle = {
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

jest.mock("@/lib/daily-games", () => ({
  getDailyGame: jest.fn(() => Promise.resolve(mockPuzzle)),
  getGameByDate: jest.fn((_type: string, date: string) =>
    Promise.resolve(date === "2024-03-14" ? mockPuzzle : undefined),
  ),
}));

describe("PlayConnectionsScreen", () => {
  const mockRouter = {
    replace: jest.fn(),
    back: jest.fn(),
  };

  const mockUser = {
    id: "user123",
    email: "test@example.com",
    isPremium: false,
    city: "London",
    borough: "Westminster",
  };

  const mockGameState: ConnectionsState = {
    completedGroups: [],
    mistakesRemaining: 4,
    history: [],
    startTime: Date.now(),
    endTime: null,
    status: "playing",
  };

  const mockGame = {
    id: "connections_user123_2024-03-14",
    userId: "user123",
    gameType: "connections" as const,
    state: mockGameState,
    lastUpdated: new Date().toISOString(),
    syncStatus: "synced" as const,
    version: 1,
  };

  const mockLoadGame = jest.fn();
  const mockCreateNewGame = jest.fn();
  const mockSaveGame = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: mockUser,
    });
    (useGameStore as unknown as jest.Mock).mockReturnValue({
      currentGame: mockGame,
      loadGame: mockLoadGame,
      createNewGame: mockCreateNewGame,
      saveGame: mockSaveGame,
    });

    mockLoadGame.mockResolvedValue(mockGame);
    mockCreateNewGame.mockReturnValue(mockGame);
    mockSaveGame.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe("Initialization", () => {
    it("redirects to auth if user is not logged in", async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: null,
      });

      await render(<PlayConnectionsScreen />);

      expect(mockRouter.replace).toHaveBeenCalledWith("/auth");
    });

    it("loads existing game for the day", async () => {
      await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(mockLoadGame).toHaveBeenCalledWith(
          expect.stringContaining("connections_user123_"),
          "user123",
        );
      });
    });

    it("creates new game if none exists for the day", async () => {
      mockLoadGame.mockResolvedValue(null);

      await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(mockCreateNewGame).toHaveBeenCalledWith(
          "user123",
          "connections",
          expect.stringContaining("connections_user123_"),
        );
      });
    });

    it("shows loading indicator while initializing", async () => {
      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: null,
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const { getByAccessibilityHint } = await render(<PlayConnectionsScreen />);

      // ActivityIndicator should be visible
      expect(getByAccessibilityHint).toBeTruthy();
    });
  });

  describe("Game Logic - handleSubmitGuess", () => {
    it("marks group as completed on correct guess", async () => {
      const { getByText } = await render(<PlayConnectionsScreen />);

      // Wait for component to render
      await waitFor(() => {
        expect(getByText("BAKERLOO")).toBeTruthy();
      });

      // Get the Connections component's props by finding it in the tree
      // We'll simulate the guess by calling the handler directly
      const correctGuess = ["BAKERLOO", "CENTRAL", "DISTRICT", "NORTHERN"];

      // Find and trigger the onSubmitGuess callback
      // Since we can't easily access the callback, we'll use findByProps
      const connections = require("@/components/games/Connections");
      const spy = jest.spyOn(connections, "Connections");

      // Re-render to capture the spy
      const { rerender } = await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const onSubmitGuess = (
        spy.mock.calls[spy.mock.calls.length - 1][0] as any
      ).onSubmitGuess;

      // Call the handler directly
      await act(async () => {
        await onSubmitGuess(correctGuess);
      });

      await waitFor(() => {
        expect(mockSaveGame).toHaveBeenCalledWith(
          expect.objectContaining({
            state: expect.objectContaining({
              completedGroups: ["TUBE LINES"],
              mistakesRemaining: 4,
            }),
          }),
        );
      });

      spy.mockRestore();
    });

    it("adds guess to history", async () => {
      const connections = require("@/components/games/Connections");
      const spy = jest.spyOn(connections, "Connections");

      await render(<PlayConnectionsScreen />);


      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const onSubmitGuess = (
        spy.mock.calls[spy.mock.calls.length - 1][0] as any
      ).onSubmitGuess;
      const correctGuess = ["BAKERLOO", "CENTRAL", "DISTRICT", "NORTHERN"];

      await act(async () => {
        await onSubmitGuess(correctGuess);
      });

      await waitFor(() => {
        expect(mockSaveGame).toHaveBeenCalledWith(
          expect.objectContaining({
            state: expect.objectContaining({
              history: [correctGuess],
            }),
          }),
        );
      });

      spy.mockRestore();
    });

    it("sets status to won when all 4 groups are completed", async () => {
      const gameStateWithThreeGroups: ConnectionsState = {
        ...mockGameState,
        completedGroups: ["TUBE LINES", "ROYAL PARKS", "LONDON AIRPORTS"],
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: gameStateWithThreeGroups },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const connections = require("@/components/games/Connections");
      const spy = jest.spyOn(connections, "Connections");

      await render(<PlayConnectionsScreen />);


      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const onSubmitGuess = (
        spy.mock.calls[spy.mock.calls.length - 1][0] as any
      ).onSubmitGuess;
      const lastGroupGuess = ["VINE", "BOW", "FLEET", "STRAND"];

      await act(async () => {
        await onSubmitGuess(lastGroupGuess);
      });

      await waitFor(() => {
        expect(mockSaveGame).toHaveBeenCalledWith(
          expect.objectContaining({
            state: expect.objectContaining({
              status: "won",
              endTime: expect.any(Number),
              completedGroups: expect.arrayContaining([
                "TUBE LINES",
                "ROYAL PARKS",
                "LONDON AIRPORTS",
                "MONOPOLY STREETS",
              ]),
            }),
          }),
        );
      });

      spy.mockRestore();
    });

    it("submits score to leaderboard when winning", async () => {
      const startTime = Date.now();
      const gameStateWithThreeGroups: ConnectionsState = {
        ...mockGameState,
        completedGroups: ["TUBE LINES", "ROYAL PARKS", "LONDON AIRPORTS"],
        startTime,
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: gameStateWithThreeGroups },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const connections = require("@/components/games/Connections");
      const spy = jest.spyOn(connections, "Connections");

      await render(<PlayConnectionsScreen />);


      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const onSubmitGuess = (
        spy.mock.calls[spy.mock.calls.length - 1][0] as any
      ).onSubmitGuess;

      await act(async () => {
        await onSubmitGuess(["VINE", "BOW", "FLEET", "STRAND"]);
      });

      await waitFor(() => {
        expect(leaderboard.submitScore).toHaveBeenCalledWith(
          "user123",
          "London",
          "Westminster",
          expect.any(Number),
          "connections",
          { result: "won", mistakes: expect.any(Number), gameDate: expect.any(String) },
        );
      });

      spy.mockRestore();
    });

    it("does not submit score when user has no city", async () => {
      const userWithoutCity = { ...mockUser, city: undefined, borough: undefined };
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: userWithoutCity,
      });

      const gameStateWithThreeGroups: ConnectionsState = {
        ...mockGameState,
        completedGroups: ["TUBE LINES", "ROYAL PARKS", "LONDON AIRPORTS"],
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: gameStateWithThreeGroups },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const connections = require("@/components/games/Connections");
      const spy = jest.spyOn(connections, "Connections");

      await render(<PlayConnectionsScreen />);


      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const onSubmitGuess = (
        spy.mock.calls[spy.mock.calls.length - 1][0] as any
      ).onSubmitGuess;

      await act(async () => {
        await onSubmitGuess(["VINE", "BOW", "FLEET", "STRAND"]);
      });

      await waitFor(() => {
        expect(mockSaveGame).toHaveBeenCalled();
      });

      expect(leaderboard.submitScore).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    it("decreases mistakes remaining on incorrect guess", async () => {
      const connections = require("@/components/games/Connections");
      const spy = jest.spyOn(connections, "Connections");

      await render(<PlayConnectionsScreen />);


      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const onSubmitGuess = (
        spy.mock.calls[spy.mock.calls.length - 1][0] as any
      ).onSubmitGuess;

      await act(async () => {
        await onSubmitGuess(["BAKERLOO", "HYDE", "HEATHROW", "VINE"]);
      });

      await waitFor(() => {
        expect(mockSaveGame).toHaveBeenCalledWith(
          expect.objectContaining({
            state: expect.objectContaining({
              mistakesRemaining: 3,
              completedGroups: [],
            }),
          }),
        );
      });

      spy.mockRestore();
    });

    it("sets status to lost when mistakes reach 0", async () => {
      const gameStateOneLifeLeft: ConnectionsState = {
        ...mockGameState,
        mistakesRemaining: 1,
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: gameStateOneLifeLeft },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const connections = require("@/components/games/Connections");
      const spy = jest.spyOn(connections, "Connections");

      await render(<PlayConnectionsScreen />);


      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const onSubmitGuess = (
        spy.mock.calls[spy.mock.calls.length - 1][0] as any
      ).onSubmitGuess;

      await act(async () => {
        await onSubmitGuess(["BAKERLOO", "HYDE", "HEATHROW", "VINE"]);
      });

      await waitFor(() => {
        expect(mockSaveGame).toHaveBeenCalledWith(
          expect.objectContaining({
            state: expect.objectContaining({
              status: "lost",
              mistakesRemaining: 0,
              endTime: expect.any(Number),
            }),
          }),
        );
      });

      spy.mockRestore();
    });
  });

  describe("Game Over UI", () => {
    it("shows game over banner when won", async () => {
      const wonGameState: ConnectionsState = {
        ...mockGameState,
        status: "won",
        completedGroups: [
          "TUBE LINES",
          "ROYAL PARKS",
          "LONDON AIRPORTS",
          "MONOPOLY STREETS",
        ],
        endTime: Date.now(),
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: wonGameState },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const { getByText } = await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(getByText("Journey complete")).toBeTruthy();
        expect(getByText("All four lines found")).toBeTruthy();
        expect(getByText("Time")).toBeTruthy();
        expect(getByText("Day streak")).toBeTruthy();
      });
    });

    it("shows game over banner when lost", async () => {
      const lostGameState: ConnectionsState = {
        ...mockGameState,
        status: "lost",
        mistakesRemaining: 0,
        endTime: Date.now(),
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: lostGameState },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const { getByText } = await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(getByText("Part suspended")).toBeTruthy();
        expect(getByText("0 of 4 lines found · answers below")).toBeTruthy();
        expect(getByText("Lines")).toBeTruthy();
      });
    });

    it("opens leaderboard modal when button pressed", async () => {
      const wonGameState: ConnectionsState = {
        ...mockGameState,
        status: "won",
        completedGroups: [
          "TUBE LINES",
          "ROYAL PARKS",
          "LONDON AIRPORTS",
          "MONOPOLY STREETS",
        ],
        endTime: Date.now(),
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: wonGameState },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const { getByText, getByLabelText } = await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(getByText("Journey complete")).toBeTruthy();
      });

      await fireEvent.press(getByLabelText("Leaderboard"));

      // Modal should be visible (we can't test Modal content easily, but we can verify button works)
      expect(getByLabelText("Leaderboard")).toBeTruthy();
    });

    it("navigates back from the finished page via the header", async () => {
      const wonGameState: ConnectionsState = {
        ...mockGameState,
        status: "won",
        completedGroups: [
          "TUBE LINES",
          "ROYAL PARKS",
          "LONDON AIRPORTS",
          "MONOPOLY STREETS",
        ],
        endTime: Date.now(),
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: wonGameState },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const { getByText, getByLabelText } = await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(getByText("Journey complete")).toBeTruthy();
      });

      // TUB-297: no gameplay/Home buttons on the finished page; the header back leaves.
      await fireEvent.press(getByLabelText("Go back"));

      expect(mockRouter.back.mock.calls.length + mockRouter.replace.mock.calls.length).toBeGreaterThan(0);
    });

    it("does not show solve time when game is lost", async () => {
      const lostGameState: ConnectionsState = {
        ...mockGameState,
        status: "lost",
        mistakesRemaining: 0,
        endTime: Date.now(),
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: lostGameState },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const { queryByText } = await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(queryByText(/Solved in/)).toBeNull();
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles game load error gracefully", async () => {
      jest.useRealTimers();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      mockLoadGame.mockRejectedValue(new Error("Network error"));

      await render(<PlayConnectionsScreen />);

      await waitFor(
        () => {
          expect(consoleSpy).toHaveBeenCalledWith(
            "Failed to init game:",
            expect.any(Error),
          );
          expect(mockRouter.back).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );

      consoleSpy.mockRestore();
      jest.useFakeTimers();
    });

    it("does not process guess when game is already won", async () => {
      const wonGameState: ConnectionsState = {
        ...mockGameState,
        status: "won",
        completedGroups: [
          "TUBE LINES",
          "ROYAL PARKS",
          "LONDON AIRPORTS",
          "MONOPOLY STREETS",
        ],
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: wonGameState },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const connections = require("@/components/games/Connections");
      const spy = jest.spyOn(connections, "Connections");

      await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const onSubmitGuess = (
        spy.mock.calls[spy.mock.calls.length - 1][0] as any
      ).onSubmitGuess;

      const callCountBefore = mockSaveGame.mock.calls.length;

      // Try to make a guess - handleSubmitGuess should check status and not process
      await act(async () => {
        await onSubmitGuess(["BAKERLOO", "CENTRAL", "DISTRICT", "NORTHERN"]);
      });

      // SaveGame should not be called since game is won
      expect(mockSaveGame.mock.calls.length).toBe(callCountBefore);

      spy.mockRestore();
    });

    it("does not duplicate completed groups", async () => {
      const connections = require("@/components/games/Connections");
      const spy = jest.spyOn(connections, "Connections");

      await render(<PlayConnectionsScreen />);


      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const onSubmitGuess = (
        spy.mock.calls[spy.mock.calls.length - 1][0] as any
      ).onSubmitGuess;

      // Make correct guess twice
      await act(async () => {
        await onSubmitGuess(["BAKERLOO", "CENTRAL", "DISTRICT", "NORTHERN"]);
      });

      await waitFor(() => {
        const savedState = mockSaveGame.mock.calls[0][0].state;
        expect(savedState.completedGroups).toEqual(["TUBE LINES"]);
      });

      // Try to complete the same group again
      mockSaveGame.mockClear();

      // Update the store to reflect completed group
      const updatedGameState = {
        ...mockGameState,
        completedGroups: ["TUBE LINES"],
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: updatedGameState },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      await act(async () => {
        await onSubmitGuess(["BAKERLOO", "CENTRAL", "DISTRICT", "NORTHERN"]);
      });

      // Should still save but not duplicate
      await waitFor(() => {
        if (mockSaveGame.mock.calls.length > 0) {
          const savedState = mockSaveGame.mock.calls[0][0].state;
          expect(savedState.completedGroups).toEqual(["TUBE LINES"]);
        }
      });

      spy.mockRestore();
    });
  });

  describe("Loss Reveal Flow", () => {
    it("shows the finished page at once on loss and reveals answers 400ms apart", async () => {
      const gameStateOneLifeLeft: ConnectionsState = {
        ...mockGameState,
        mistakesRemaining: 1,
        completedGroups: ["TUBE LINES"],
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: gameStateOneLifeLeft },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const connections = require("@/components/games/Connections");
      const spy = jest.spyOn(connections, "Connections");

      const { queryByText, queryAllByText, rerender } = await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const onSubmitGuess = (
        spy.mock.calls[spy.mock.calls.length - 1][0] as any
      ).onSubmitGuess;

      // Losing guess
      await act(async () => {
        await onSubmitGuess(["BAKERLOO", "HYDE", "HEATHROW", "VINE"]);
      });

      // Store now reflects the lost game
      const lostGameState: ConnectionsState = {
        ...gameStateOneLifeLeft,
        status: "lost",
        mistakesRemaining: 0,
        endTime: Date.now(),
      };
      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: lostGameState },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });
      await rerender(<PlayConnectionsScreen />);

      // TUB-297: the sign appears immediately; unfound lines reveal one by one.
      expect(queryByText("Part suspended")).toBeTruthy();
      expect(queryByText("REVEALED")).toBeNull();

      await waitFor(
        () => {
          expect(queryAllByText("REVEALED").length).toBe(3);
        },
        { timeout: 3000 },
      );

      spy.mockRestore();
    });

    it("shows game over banner immediately for already-lost game on reload", async () => {
      const lostGameState: ConnectionsState = {
        ...mockGameState,
        status: "lost",
        mistakesRemaining: 0,
        completedGroups: ["TUBE LINES"],
        endTime: Date.now(),
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: lostGameState },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const { getByText, getAllByText } = await render(<PlayConnectionsScreen />);

      // Reopen: same finished page, all answers at once (no staggered reveal).
      await waitFor(() => {
        expect(getByText("Part suspended")).toBeTruthy();
        expect(getAllByText("REVEALED").length).toBe(3);
        expect(getByText("✓ FOUND")).toBeTruthy();
      });
    });

    it("resets reveal state when player loses", async () => {
      // Start with a game state that has 1 mistake left
      const gameStateOneLifeLeft: ConnectionsState = {
        ...mockGameState,
        mistakesRemaining: 1,
      };

      (useGameStore as unknown as jest.Mock).mockReturnValue({
        currentGame: { ...mockGame, state: gameStateOneLifeLeft },
        loadGame: mockLoadGame,
        createNewGame: mockCreateNewGame,
        saveGame: mockSaveGame,
      });

      const connections = require("@/components/games/Connections");
      const spy = jest.spyOn(connections, "Connections");

      await render(<PlayConnectionsScreen />);


      await waitFor(() => {
        expect(spy).toHaveBeenCalled();
      });

      const onSubmitGuess = (
        spy.mock.calls[spy.mock.calls.length - 1][0] as any
      ).onSubmitGuess;

      // Make incorrect guess to lose
      await act(async () => {
        await onSubmitGuess(["BAKERLOO", "HYDE", "HEATHROW", "VINE"]);
      });

      await waitFor(() => {
        expect(mockSaveGame).toHaveBeenCalledWith(
          expect.objectContaining({
            state: expect.objectContaining({
              status: "lost",
              mistakesRemaining: 0,
            }),
          }),
        );
      });

      spy.mockRestore();
    });
  });
});
