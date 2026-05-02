# GuessNumber - 2 Player Number Guessing Game

A real-time multiplayer number guessing game built with Next.js and Socket.IO.

## Architecture

- **Frontend**: Next.js deployed on Vercel
- **Backend**: Node.js + Socket.IO server (separate deployment)

This split architecture is necessary because Vercel's serverless functions don't support persistent WebSocket connections.

## Development Setup

### Prerequisites
- Node.js 18+
- npm or bun

### Local Development

1. **Install dependencies**:
```bash
npm install
cd server && npm install && cd ..
```

2. **Start the Socket.IO server** (in one terminal):
```bash
cd server
npm run dev
```

The server will run on `http://localhost:3001`

3. **Start the Next.js frontend** (in another terminal):
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Production Deployment

### Option 1: Deploy on Railway (Recommended)

Railway is free for static sites and has excellent support for Node.js servers with WebSocket.

#### Backend (Socket.IO Server)

1. Push your code to GitHub
2. Go to [Railway.app](https://railway.app)
3. Create a new project and connect your GitHub repository
4. Configure the server:
   - Set root directory to `server`
   - Add startup command: `npm run build && npm start`
   - Set PORT environment variable (Railway will set it automatically)

5. Once deployed, you'll get a URL like: `https://guessnumber-socket-xxxx.railway.app`

#### Frontend (Next.js)

1. In your Vercel dashboard, go to project settings
2. Add environment variable:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://guessnumber-socket-xxxx.railway.app
   ```
3. Redeploy the frontend

### Option 2: Other Hosting Options

**Render.com**:
- Free tier available
- Good WebSocket support
- Similar setup to Railway

**Heroku** (paid):
- Dyno pricing starts at $7/month
- Good documentation and WebSocket support

**Self-hosted VPS**:
- DigitalOcean, AWS EC2, Linode, etc.
- Full control but requires DevOps knowledge

## Environment Variables

### Frontend (.env.local or Vercel)
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001  # Development
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.com  # Production
```

### Backend (server/.env or Railway/platform settings)
```
PORT=3001  # or whatever your hosting platform provides
```

## Game Rules

1. **Create a Room**: Player 1 creates a room and shares the 6-character code
2. **Join Room**: Player 2 joins using the code
3. **Pick Number**: Both players secretly pick a number (1-100)
4. **Guess**: Players simultaneously guess each other's numbers
5. **Get Feedback**: "Too Low", "Too High", or "Correct"
6. **Win**: First player to guess correctly wins!

## Troubleshooting

### WebSocket Connection Failed
- Check that the backend server is running and accessible
- Ensure `NEXT_PUBLIC_SOCKET_URL` is correctly set
- Check browser console for error messages
- Verify CORS is enabled on the backend (it is by default)

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

## Development Commands

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
```

### Backend
```bash
cd server
npm run dev      # Start with hot reload
npm run build    # Build TypeScript
npm start        # Start production server
```

## Project Structure

```
guessnumber/
├── app/
│   ├── api/socket/route.ts     # Placeholder (no longer used)
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── room/
│       └── [roomId]/page.tsx    # Game room
├── lib/
│   └── socket.ts                # Socket.IO client
├── server/
│   ├── server.ts                # Socket.IO server
│   ├── package.json
│   └── tsconfig.json
└── .env.local                   # Local environment variables
```

## Related Files

- Game logic: `server/server.ts`
- Client connection: `lib/socket.ts`
- Game UI: `app/room/[roomId]/page.tsx`
- Home page: `app/page.tsx`
