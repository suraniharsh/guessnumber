"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";

type Phase =
  | "connecting"
  | "waiting-p2"
  | "pick-number"
  | "waiting-pick"
  | "playing"
  | "game-over";

type GuessResult = "too-low" | "too-high" | "correct";

interface GuessEntry {
  value: number;
  result: GuessResult;
}

function resultMeta(result: GuessResult) {
  if (result === "too-low") return { icon: "↑", label: "Too Low", color: "text-blue-400" };
  if (result === "too-high") return { icon: "↓", label: "Too High", color: "text-red-400" };
  return { icon: "✓", label: "Correct!", color: "text-green-400" };
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("connecting");
  const [playerNum, setPlayerNum] = useState<1 | 2 | null>(null);
  const [displayRoomId, setDisplayRoomId] = useState(roomId === "new" ? "" : roomId);
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [opponentGuessCount, setOpponentGuessCount] = useState(0);
  const [secretInput, setSecretInput] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [isWinner, setIsWinner] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [opponentPicked, setOpponentPicked] = useState(false);
  const [inputError, setInputError] = useState("");
  const [round, setRound] = useState(1);
  const [opponentReadyForNext, setOpponentReadyForNext] = useState(false);

  const playerNumRef = useRef<1 | 2 | null>(null);
  const guessesEndRef = useRef<HTMLDivElement>(null);
  const hasEmitted = useRef(false);

  useEffect(() => {
    guessesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [guesses]);

  useEffect(() => {
    const socket = getSocket();

    // Guard against React StrictMode double-firing this effect
    if (!hasEmitted.current) {
      hasEmitted.current = true;
      if (roomId === "new") {
        socket.emit("create-room");
      } else {
        socket.emit("join-room", { roomId });
      }
    }

    socket.on("room-created", ({ roomId: newId }: { roomId: string }) => {
      setDisplayRoomId(newId);
      setPlayerNum(1);
      playerNumRef.current = 1;
      setPhase("waiting-p2");
      window.history.replaceState(null, "", `/room/${newId}`);
    });

    socket.on("room-joined", ({ playerNum: pNum }: { playerNum: 2 }) => {
      setPlayerNum(pNum);
      playerNumRef.current = pNum;
      setPhase("pick-number");
    });

    socket.on("both-connected", () => {
      setPhase("pick-number");
    });

    socket.on("opponent-picked", () => {
      setOpponentPicked(true);
    });

    socket.on("game-start", () => {
      setPhase("playing");
      setOpponentPicked(false);
    });

    socket.on("guess-result", ({ guess, result }: { guess: number; result: GuessResult }) => {
      setGuesses((prev) => [...prev, { value: guess, result }]);
    });

    socket.on("opponent-guessed", () => {
      setOpponentGuessCount((prev) => prev + 1);
    });

    socket.on("game-over", ({ winnerNum, round: gameRound }: { winnerNum: 1 | 2; round: number }) => {
      setIsWinner(playerNumRef.current === winnerNum);
      setRound(gameRound);
      setPhase("game-over");
    });

    socket.on("next-round-starting", ({ round: nextRound }: { round: number }) => {
      setRound(nextRound);
      setGuesses([]);
      setOpponentGuessCount(0);
      setSecretInput("");
      setGuessInput("");
      setOpponentPicked(false);
      setOpponentReadyForNext(false);
      setPhase("pick-number");
    });

    socket.on("player-ready-for-next", () => {
      setOpponentReadyForNext(true);
    });

    socket.on("player-disconnected", () => {
      setOpponentDisconnected(true);
    });

    socket.on("game-error", ({ message }: { message: string }) => {
      setError(message);
    });

    return () => {
      socket.off("room-created");
      socket.off("room-joined");
      socket.off("both-connected");
      socket.off("opponent-picked");
      socket.off("game-start");
      socket.off("guess-result");
      socket.off("opponent-guessed");
      socket.off("game-over");
      socket.off("next-round-starting");
      socket.off("player-ready-for-next");
      socket.off("player-disconnected");
      socket.off("game-error");
    };
  }, [roomId]);

  function handlePickNumber(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(secretInput, 10);
    if (isNaN(n) || n < 1 || n > 100) {
      setInputError("Pick a number between 1 and 100");
      return;
    }
    getSocket().emit("set-number", { number: n });
    setPhase("waiting-pick");
    setInputError("");
  }

  function handleGuess(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(guessInput, 10);
    if (isNaN(n) || n < 1 || n > 100) return;
    getSocket().emit("guess", { number: n });
    setGuessInput("");
  }

  function handleCopyRoomId() {
    navigator.clipboard.writeText(displayRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePlayAgain() {
    getSocket().emit("play-again");
  }

  // ─── Connecting ────────────────────────────────────────────────────────────
  if (phase === "connecting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Connecting...</p>
        </div>
      </div>
    );
  }

  // ─── Error screen ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Oops</h2>
          <p className="text-gray-400 mb-8">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ─── Waiting for Player 2 ──────────────────────────────────────────────────
  if (phase === "waiting-p2") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Room Created</h1>
          <p className="text-gray-500 mb-8 text-sm sm:text-base">Share this code with your opponent</p>

          <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 sm:p-8 mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Room Code
            </p>
            <p className="text-4xl sm:text-5xl font-mono font-bold text-violet-400 tracking-[0.3em] mb-6 break-all">
              {displayRoomId}
            </p>
            <button
              onClick={handleCopyRoomId}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors text-sm sm:text-base"
            >
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-gray-600 text-xs sm:text-sm">
            <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
            Waiting for Player 2 to join...
          </div>
        </div>
      </div>
    );
  }

  // ─── Pick Number ───────────────────────────────────────────────────────────
  if (phase === "pick-number") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4 py-8">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest bg-violet-500/10 px-3 py-1 rounded-full inline-block">
              Player {playerNum}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-4 mb-2">Pick Your Number</h1>
            <p className="text-gray-500 text-sm sm:text-base">Choose a secret number between 1 and 100</p>
          </div>

          <form
            onSubmit={handlePickNumber}
            className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 sm:p-8"
          >
            <input
              type="number"
              min="1"
              max="100"
              value={secretInput}
              onChange={(e) => {
                setSecretInput(e.target.value);
                setInputError("");
              }}
              placeholder="1 – 100"
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-4 py-3 sm:py-4 text-3xl sm:text-4xl font-mono font-bold text-white placeholder-gray-700 focus:outline-none focus:border-violet-500 mb-2 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoFocus
            />
            {inputError && (
              <p className="text-red-400 text-sm text-center mb-4">{inputError}</p>
            )}
            {!inputError && <div className="mb-4" />}
            <button
              type="submit"
              className="w-full py-3 sm:py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors text-base sm:text-lg"
            >
              Lock In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Waiting for Opponent to Pick ─────────────────────────────────────────
  if (phase === "waiting-pick") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
        <div className="text-center">
          <div className="text-5xl sm:text-6xl mb-6">🔒</div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Number Locked In!</h2>
          <p className="text-gray-500 mb-6 text-sm sm:text-base">
            {opponentPicked ? "Both ready! Starting soon..." : "Waiting for your opponent..."}
          </p>
          {!opponentPicked && (
            <div className="flex items-center justify-center gap-2 text-gray-600 text-xs sm:text-sm">
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
              Opponent is choosing their number
            </div>
          )}
          {opponentPicked && (
            <div className="flex items-center justify-center gap-2 text-green-500 text-xs sm:text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Both players ready!
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Playing ───────────────────────────────────────────────────────────────
  if (phase === "playing") {
    const lastGuess = guesses[guesses.length - 1];

    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
        {/* Header */}
        <div className="border-b border-[#1e1e2e] px-4 sm:px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest bg-violet-500/10 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">
              Player {playerNum}
            </span>
            <span className="text-lg font-black tracking-tight hidden sm:inline">GUESS</span>
            <span className="text-xs sm:text-sm text-gray-500 text-right">
              Opponent: {opponentGuessCount}
            </span>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col lg:flex-row gap-6">
          {/* Left: Guess History */}
          <div className="flex-1 flex flex-col min-h-0 order-2 lg:order-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
              Your Guesses ({guesses.length})
            </p>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-96 lg:max-h-none">
              {guesses.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-700 text-sm sm:text-base">
                  No guesses yet
                </div>
              ) : (
                guesses.map((g, i) => {
                  const meta = resultMeta(g.result);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-[#12121a] border border-[#1e1e2e] rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="w-6 h-6 flex items-center justify-center bg-[#0a0a0f] rounded-lg text-xs text-gray-600 font-mono">
                          {i + 1}
                        </span>
                        <span className="text-xl sm:text-2xl font-mono font-bold">{g.value}</span>
                      </div>
                      <span className={`text-xs sm:text-sm font-semibold ${meta.color}`}>
                        {meta.icon} {meta.label}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={guessesEndRef} />
            </div>
          </div>

          {/* Right: Input */}
          <div className="w-full lg:w-80 flex flex-col justify-start lg:pt-8 order-1 lg:order-2">
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-4 sm:p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 text-center">
                Guess Their Number
              </p>

              {lastGuess && (
                <div
                  className={`mb-4 p-3 rounded-xl text-center border text-sm ${
                    lastGuess.result === "too-low"
                      ? "bg-blue-500/10 border-blue-500/20"
                      : lastGuess.result === "too-high"
                      ? "bg-red-500/10 border-red-500/20"
                      : "bg-green-500/10 border-green-500/20"
                  }`}
                >
                  <span className={`text-xs sm:text-sm font-semibold ${resultMeta(lastGuess.result).color}`}>
                    {resultMeta(lastGuess.result).icon} {resultMeta(lastGuess.result).label}
                  </span>
                </div>
              )}

              <form onSubmit={handleGuess} className="space-y-3">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="1–100"
                  className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-4 py-3 sm:py-4 text-2xl sm:text-3xl font-mono font-bold text-white placeholder-gray-700 focus:outline-none focus:border-violet-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!guessInput}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors text-base sm:text-lg"
                >
                  Guess
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Disconnected overlay */}
        {opponentDisconnected && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4">
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 sm:p-8 text-center max-w-sm w-full">
              <div className="text-4xl mb-4">🔌</div>
              <p className="text-xl font-bold mb-2">Opponent Disconnected</p>
              <p className="text-gray-500 mb-6 text-sm">Your opponent has left the game.</p>
              <button
                onClick={() => router.push("/")}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors text-base sm:text-lg"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Game Over ─────────────────────────────────────────────────────────────
  if (phase === "game-over") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4 py-8">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl sm:text-8xl mb-4">{isWinner ? "🏆" : "💀"}</div>
          <h1
            className={`text-4xl sm:text-5xl font-black mb-2 ${isWinner ? "text-yellow-400" : "text-red-400"}`}
          >
            {isWinner ? "You Win!" : "You Lose"}
          </h1>
          <p className="text-gray-400 mb-1 text-sm sm:text-base">
            {isWinner
              ? `Guessed in ${guesses.length} ${guesses.length === 1 ? "try" : "tries"}`
              : "Your opponent guessed first"}
          </p>
          <p className="text-gray-600 text-xs sm:text-sm mb-8">
            Opponent made {opponentGuessCount}{" "}
            {opponentGuessCount === 1 ? "guess" : "guesses"}
          </p>

          {guesses.length > 0 && (
            <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-4 sm:p-6 mb-6 text-left">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
                Your Guesses
              </p>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {guesses.map((g, i) => {
                  const meta = resultMeta(g.result);
                  return (
                    <div key={i} className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600 w-6">#{i + 1}</span>
                      <span className="font-mono font-bold text-lg">{g.value}</span>
                      <span className={`${meta.color} font-semibold`}>
                        {meta.icon} {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handlePlayAgain}
              className="w-full py-3 sm:py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-base sm:text-lg transition-colors"
            >
              {opponentReadyForNext ? "Starting Next Round..." : "Play Again"}
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 sm:py-4 bg-[#12121a] border border-[#1e1e2e] hover:border-violet-500/50 text-gray-300 rounded-xl font-semibold text-base sm:text-lg transition-all"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
