import { Server as IOServer } from "socket.io";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface Player {
  socketId: string;
  playerNum: 1 | 2;
  secretNumber: number | null;
  ready: boolean;
}

interface Room {
  id: string;
  players: Player[];
  status: "waiting" | "picking" | "playing" | "finished";
  createdAt: number;
}

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function findPlayerRoom(socketId: string): [string, Room] | null {
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.some((p) => p.socketId === socketId)) {
      return [roomId, room];
    }
  }
  return null;
}

let io: IOServer | null = null;

function initializeSocket(server: any) {
  if (io) return io;

  io = new IOServer(server, {
    cors: { origin: "*" },
    path: "/api/socket",
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    socket.on("create-room", () => {
      let roomId = generateRoomId();
      while (rooms.has(roomId)) roomId = generateRoomId();

      const room: Room = {
        id: roomId,
        players: [{ socketId: socket.id, playerNum: 1, secretNumber: null, ready: false }],
        status: "waiting",
        createdAt: Date.now(),
      };
      rooms.set(roomId, room);
      socket.join(roomId);
      socket.emit("room-created", { roomId });
    });

    socket.on("join-room", ({ roomId }: { roomId: string }) => {
      const room = rooms.get(roomId);

      if (!room) {
        socket.emit("game-error", { message: "Room not found. Check the code and try again." });
        return;
      }
      if (room.players.length >= 2) {
        socket.emit("game-error", { message: "This room is full." });
        return;
      }
      if (room.status !== "waiting") {
        socket.emit("game-error", { message: "This game has already started." });
        return;
      }

      room.players.push({ socketId: socket.id, playerNum: 2, secretNumber: null, ready: false });
      room.status = "picking";
      socket.join(roomId);

      socket.emit("room-joined", { playerNum: 2, roomId });
      io!.to(roomId).emit("both-connected");
    });

    socket.on("set-number", ({ number }: { number: number }) => {
      const entry = findPlayerRoom(socket.id);
      if (!entry) return;

      const [roomId, room] = entry;
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player || player.ready) return;

      if (!Number.isInteger(number) || number < 1 || number > 100) {
        socket.emit("game-error", { message: "Number must be an integer between 1 and 100." });
        return;
      }

      player.secretNumber = number;
      player.ready = true;

      const opponent = room.players.find((p) => p.socketId !== socket.id);

      if (room.players.every((p) => p.ready)) {
        room.status = "playing";
        io!.to(roomId).emit("game-start");
      } else {
        if (opponent) io!.to(opponent.socketId).emit("opponent-picked");
      }
    });

    socket.on("guess", ({ number }: { number: number }) => {
      const entry = findPlayerRoom(socket.id);
      if (!entry) return;

      const [roomId, room] = entry;
      if (room.status !== "playing") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      const opponent = room.players.find((p) => p.socketId !== socket.id);
      if (!player || !opponent || opponent.secretNumber === null) return;

      if (!Number.isInteger(number) || number < 1 || number > 100) {
        socket.emit("game-error", { message: "Guess must be an integer between 1 and 100." });
        return;
      }

      let result: "too-low" | "too-high" | "correct";
      if (number < opponent.secretNumber) result = "too-low";
      else if (number > opponent.secretNumber) result = "too-high";
      else result = "correct";

      socket.emit("guess-result", { guess: number, result });
      io!.to(opponent.socketId).emit("opponent-guessed");

      if (result === "correct") {
        room.status = "finished";
        io!.to(roomId).emit("game-over", { winnerNum: player.playerNum });
      }
    });

    socket.on("disconnect", () => {
      const entry = findPlayerRoom(socket.id);
      if (!entry) return;

      const [roomId, room] = entry;
      if (room.status !== "waiting" && room.status !== "finished") {
        socket.to(roomId).emit("player-disconnected");
      }
      rooms.delete(roomId);
    });
  });

  return io;
}

export async function GET(req: NextRequest) {
  try {
    const server = (req as any).socket?.server;
    if (server && !server.io) {
      initializeSocket(server);
      server.io = io;
    }
    return NextResponse.json({ status: "socket ok" });
  } catch (error) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ status: "ok" });
}
