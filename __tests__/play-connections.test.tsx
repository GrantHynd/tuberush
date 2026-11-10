import PlayConnectionsScreen from "@/app/games/play-connections";
import { leaderboard } from "@/lib/leaderboard";
import { useAuthStore } from "@/stores/auth-store";
import { useGameStore } from "@/stores/game-store";
import { ConnectionsState } from "@/types/game";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import React from "react";

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

jest.mock("@/hooks/useUserStats", () => ({
  useUserStats: jest.fn(() => ({
    stats: { bestTime: null, bestTimeGameType: null, streak: 0 },
    loading: false,
    refresh: jest.fn(),
  })),
}));

const BISCUITS = ["DIGESTIVE", "HOBNOB", "BOURBON", "SHORTBREAD"] as const;
const CHARACTERS = ["PADDY", "CHARITY", "MARLON", "CAIN"] as const;
const PARK = ["LINKIN", "JURASSIC", "SOUTH", "THEME"] as const;
const LONG = ["JOHNS", "JUMP", "RANGE", "SUFFERING"] as const;
const WRONG = ["DIGESTIVE", "PADDY", "LINKIN", "JOHNS"] as const;
const WRONG_AFTER_BISCUITS = ["PADDY", "CHARITY", "LINKIN", "JOHNS"] as const;

const GROUP = {
  biscuits: "TYPES OF BRITISH BISCUIT",
  characters: "EMMERDALE CHARACTERS",
  park: "___ PARK",
  long: "LONG ___",
} as const;

const mockPuzzle = {
  id: "1",
  date: "2024-03-14",
  groups: [
    {
      category: GROUP.biscuits,
      items: [...BISCUITS],
      color: "#DC241F",
      difficulty: 1,
    },
    {
      category: GROUP.characters,
      items: [...CHARACTERS],
      color: "#007D32",
      difficulty: 2,
    },
    {
      category: GROUP.park,
      items: [...PARK],
      color: "#0019A8",
      difficulty: 3,
    },
    {
      category: GROUP.long,
      items: [...LONG],
      color: "#FFD329",
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

type PressTarget = Parameters<typeof fireEvent.press>[0];
type HostNode = { type?: string; props?: Record<string, unknown>; children?: unknown };

function hostNodes(node: unknown, type: string): HostNode[] {
  if (!node || typeof node !== "object") return [];
  const el = node as HostNode;
  const here = el.type === type ? [el] : [];
  const children = Array.isArray(el.children) ? el.children : [];
  return [...here, ...children.flatMap((child) => hostNodes(child, type))];
}

async function submitGuess(getByTestId: (id: string) => PressTarget, items: readonly string[]) {
  await waitFor(() => {
    expect(getByTestId(`tile-${items[0]}`)).toBeTruthy();
  });
  for (const item of items) {
    await fireEvent.press(getByTestId(`tile-${item}`));
  }
  await fireEvent.press(getByTestId("btn-submit"));
}

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

  function setGame(state: ConnectionsState) {
    (useGameStore as unknown as jest.Mock).mockReturnValue({
      currentGame: { ...mockGame, state },
      loadGame: mockLoadGame,
      createNewGame: mockCreateNewGame,
      saveGame: mockSaveGame,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: mockUser,
    });
    setGame(mockGameState);

    mockLoadGame.mockResolvedValue(mockGame);
    mockCreateNewGame.mockReturnValue(mockGame);
    mockSaveGame.mockResolvedValue(undefined);
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

      const { toJSON } = await render(<PlayConnectionsScreen />);

      expect(hostNodes(toJSON(), "ActivityIndicator")).toHaveLength(1);
    });
  });

  describe("Game Logic - handleSubmitGuess", () => {
    it("marks group as completed on correct guess", async () => {
      const { getByTestId } = await render(<PlayConnectionsScreen />);

      await submitGuess(getByTestId, BISCUITS);

      await waitFor(() => {
        expect(mockSaveGame).toHaveBeenCalledWith(
          expect.objectContaining({
            state: expect.objectContaining({
              completedGroups: [GROUP.biscuits],
              mistakesRemaining: 4,
            }),
          }),
        );
      });
    });

    it("adds guess to history", async () => {
      const { getByTestId } = await render(<PlayConnectionsScreen />);

      await submitGuess(getByTestId, BISCUITS);

      await waitFor(() => {
        expect(mockSaveGame).toHaveBeenCalledWith(
          expect.objectContaining({
            state: expect.objectContaining({
              history: [[...BISCUITS]],
            }),
          }),
        );
      });
    });

    it("sets status to won when all 4 groups are completed", async () => {
      setGame({
        ...mockGameState,
        completedGroups: [GROUP.biscuits, GROUP.characters, GROUP.park],
      });

      const { getByTestId } = await render(<PlayConnectionsScreen />);
      await submitGuess(getByTestId, LONG);

      await waitFor(() => {
        expect(mockSaveGame).toHaveBeenCalledWith(
          expect.objectContaining({
            state: expect.objectContaining({
              status: "won",
              endTime: expect.any(Number),
              completedGroups: [
                GROUP.biscuits,
                GROUP.characters,
                GROUP.park,
                GROUP.long,
              ],
            }),
          }),
        );
      });
    });

    it("submits score to leaderboard when winning", async () => {
      const startTime = Date.now();
      setGame({
        ...mockGameState,
        completedGroups: [GROUP.biscuits, GROUP.characters, GROUP.park],
        startTime,
      });

      const { getByTestId } = await render(<PlayConnectionsScreen />);
      await submitGuess(getByTestId, LONG);

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
    });

    it("does not submit score when user has no city", async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: { ...mockUser, city: undefined, borough: undefined },
      });
      setGame({
        ...mockGameState,
        completedGroups: [GROUP.biscuits, GROUP.characters, GROUP.park],
      });

      const { getByTestId } = await render(<PlayConnectionsScreen />);
      await submitGuess(getByTestId, LONG);

      await waitFor(() => {
        expect(mockSaveGame).toHaveBeenCalled();
      });

      expect(leaderboard.submitScore).not.toHaveBeenCalled();
    });

    it("decreases mistakes remaining on incorrect guess", async () => {
      const { getByTestId } = await render(<PlayConnectionsScreen />);
      await submitGuess(getByTestId, WRONG);

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
    });

    it("sets status to lost when mistakes reach 0", async () => {
      setGame({ ...mockGameState, mistakesRemaining: 1 });

      const { getByTestId } = await render(<PlayConnectionsScreen />);
      await submitGuess(getByTestId, WRONG);

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
    });
  });

  describe("Game Over UI", () => {
    function wonGame(): ConnectionsState {
      return {
        ...mockGameState,
        status: "won",
        completedGroups: [GROUP.biscuits, GROUP.characters, GROUP.park, GROUP.long],
        endTime: Date.now(),
      };
    }

    it("shows game over banner when won", async () => {
      setGame(wonGame());

      const { getByText } = await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(getByText("Journey complete")).toBeTruthy();
        expect(getByText("All four lines found")).toBeTruthy();
        expect(getByText("Time")).toBeTruthy();
        expect(getByText("Day streak")).toBeTruthy();
      });
    });

    it("shows game over banner when lost", async () => {
      setGame({
        ...mockGameState,
        status: "lost",
        mistakesRemaining: 0,
        endTime: Date.now(),
      });

      const { getByText } = await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(getByText("Part suspended")).toBeTruthy();
        expect(getByText("0 of 4 lines found · answers below")).toBeTruthy();
        expect(getByText("Lines")).toBeTruthy();
      });
    });

    it("opens leaderboard modal when button pressed", async () => {
      setGame(wonGame());

      const { getByText, getByLabelText, queryByText } = await render(
        <PlayConnectionsScreen />,
      );

      await waitFor(() => {
        expect(getByText("Journey complete")).toBeTruthy();
      });

      expect(queryByText("All UK")).toBeNull();
      await fireEvent.press(getByLabelText("Leaderboard"));
      expect(getByText("All UK")).toBeTruthy();
      expect(getByText("Close")).toBeTruthy();
    });

    it("navigates back from the finished page via the header", async () => {
      setGame(wonGame());

      const { getByText, getByLabelText } = await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(getByText("Journey complete")).toBeTruthy();
      });

      // TUB-297: the finished page has no Home button; the header back leaves.
      await fireEvent.press(getByLabelText("Go back"));

      expect(mockRouter.back.mock.calls.length + mockRouter.replace.mock.calls.length).toBeGreaterThan(0);
    });

    it("does not show solve time when game is lost", async () => {
      setGame({
        ...mockGameState,
        status: "lost",
        mistakesRemaining: 0,
        endTime: Date.now(),
      });

      const { queryByText, getByText } = await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(getByText("Part suspended")).toBeTruthy();
      });
      expect(queryByText("Time")).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("handles game load error gracefully", async () => {
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
    });

    it("does not process guess when game is already won", async () => {
      setGame({
        ...mockGameState,
        status: "won",
        completedGroups: [GROUP.biscuits, GROUP.characters, GROUP.park, GROUP.long],
      });

      const { getByText, queryByLabelText } = await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(getByText("Journey complete")).toBeTruthy();
      });

      expect(queryByLabelText("Submit guess")).toBeNull();
      expect(mockSaveGame).not.toHaveBeenCalled();
    });

    it("does not duplicate completed groups", async () => {
      const { getByTestId } = await render(<PlayConnectionsScreen />);
      await submitGuess(getByTestId, BISCUITS);

      await waitFor(() => {
        expect(mockSaveGame.mock.calls[0][0].state.completedGroups).toEqual([GROUP.biscuits]);
      });

      mockSaveGame.mockClear();
      await fireEvent.press(getByTestId("btn-submit"));

      await waitFor(() => {
        expect(mockSaveGame).toHaveBeenCalled();
      });
      expect(mockSaveGame.mock.calls[0][0].state.completedGroups).toEqual([GROUP.biscuits]);
    });
  });

  describe("Loss Reveal Flow", () => {
    it("shows the finished page at once on loss and reveals answers 400ms apart", async () => {
      setGame({
        ...mockGameState,
        mistakesRemaining: 1,
        completedGroups: [GROUP.biscuits],
      });

      const screen = await render(<PlayConnectionsScreen />);
      await submitGuess(screen.getByTestId, WRONG_AFTER_BISCUITS);

      setGame({
        ...mockGameState,
        status: "lost",
        mistakesRemaining: 0,
        completedGroups: [GROUP.biscuits],
        endTime: Date.now(),
      });
      await screen.rerender(<PlayConnectionsScreen />);

      expect(screen.queryByText("Part suspended")).toBeTruthy();
      expect(screen.queryByText("REVEALED")).toBeNull();

      await waitFor(
        () => {
          expect(screen.queryAllByText("REVEALED").length).toBe(3);
        },
        { timeout: 3000 },
      );
    });

    it("shows game over banner immediately for already-lost game on reload", async () => {
      setGame({
        ...mockGameState,
        status: "lost",
        mistakesRemaining: 0,
        completedGroups: [GROUP.biscuits],
        endTime: Date.now(),
      });

      const { getByText, getAllByText } = await render(<PlayConnectionsScreen />);

      await waitFor(() => {
        expect(getByText("Part suspended")).toBeTruthy();
        expect(getAllByText("REVEALED").length).toBe(3);
        expect(getByText("✓ FOUND")).toBeTruthy();
      });
    });
  });
});
