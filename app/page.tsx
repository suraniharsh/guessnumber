"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const [joiningMode, setJoiningMode] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const router = useRouter();

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setJoinError("Enter a room code");
      return;
    }
    router.push(`/room/${code}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4 py-8">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl sm:text-8xl font-black text-white tracking-tight mb-2">GUESS</h1>
        <p className="text-gray-500 text-base sm:text-lg mb-12">2-player number guessing game</p>

        <div className="space-y-3 mb-10">
          <Link
            href="/room/new"
            className="block w-full py-3 sm:py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-base sm:text-lg transition-colors"
          >
            Create Room
          </Link>

          {!joiningMode ? (
            <button
              onClick={() => setJoiningMode(true)}
              className="w-full py-3 sm:py-4 bg-[#12121a] border border-[#1e1e2e] hover:border-violet-500/50 text-gray-300 rounded-xl font-semibold text-base sm:text-lg transition-all"
            >
              Join Room
            </button>
          ) : (
            <form
              onSubmit={handleJoin}
              className="bg-[#12121a] border border-[#1e1e2e] rounded-xl p-4 space-y-3 text-left"
            >
              <input
                type="text"
                placeholder="ROOM CODE"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setJoinError("");
                }}
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-4 py-3 sm:py-4 text-xl sm:text-2xl font-mono font-bold text-white placeholder-gray-700 focus:outline-none focus:border-violet-500 tracking-[0.25em] uppercase text-center"
                autoFocus
                maxLength={6}
              />
              {joinError && <p className="text-red-400 text-sm text-center">{joinError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setJoiningMode(false);
                    setRoomCode("");
                    setJoinError("");
                  }}
                  className="flex-1 py-2 sm:py-3 bg-[#0a0a0f] border border-[#1e1e2e] text-gray-400 rounded-xl font-medium hover:border-gray-600 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 sm:py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors text-sm sm:text-base"
                >
                  Join
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-left bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-4 sm:p-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
            How to Play
          </p>
          <ol className="space-y-2 text-xs sm:text-sm text-gray-500">
            <li>
              <span className="text-violet-400 font-semibold">1.</span> Player 1 creates a room and
              shares the code
            </li>
            <li>
              <span className="text-violet-400 font-semibold">2.</span> Both players secretly pick a
              number (1–100)
            </li>
            <li>
              <span className="text-violet-400 font-semibold">3.</span> Both simultaneously guess
              each other&apos;s number
            </li>
            <li>
              <span className="text-violet-400 font-semibold">4.</span> After each guess: Too Low,
              Too High, or Correct
            </li>
            <li>
              <span className="text-violet-400 font-semibold">5.</span> First to guess correctly
              wins!
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
