# MTG Announcer - AI Game Tracker

**Track your Magic: The Gathering games with optional AI-powered commentary.**

✨ **Install as a standalone app on any device**  
📱 Works on Android, iOS, Windows, Linux, and macOS  
🔒 **100% free** - no hosting costs, optional AI features  
🚀 **Works offline** - download once, use anywhere  

## What is This?

MTG Announcer is a Progressive Web App that helps you track MTG games. It includes:

- **Manual game tracking** (players, life, battlefield, phases) - **Works without AI**
- **Optional AI Announcer** - Real-time commentary using Google's Gemini AI (requires free API key)
- **Peer-to-peer multiplayer** - Connect phones/tablets at the table
- **Token generator** - Create custom token images
- **Scryfall integration** - Offline card database

## 📥 Installation

**See [INSTALL.md](./INSTALL.md) for detailed platform-specific instructions.**

Quick version:

1. Visit the app in your browser (Chrome, Edge, or Safari)
2. Click the "Install" option in your browser menu
3. Use it like a native app!

## 🎮 Usage

### Without AI (Free, No Setup)

The app works perfectly as a manual game tracker:

1. Open the app
2. Select a mode (Host/Announcer, Offline AR View, or Join Game)
3. Enter player names
4. Track life, battlefield, and game state manually

### With AI (Optional, Free API Key Required)

To enable the AI Announcer:

1. Get a free Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. In the app, go to **Settings** → **Gemini API Key**
3. Paste your key and click **Save**
4. Reload the app
5. Click "Establish Link" to connect the AI

The AI can:

- Recognize cards via camera
- Announce game actions and triggers
- Act as a Level 3 Judge (rules enforcement)
- Provide audio commentary

## 🚀 Hosting Your Own Copy (Free)

Deploy to GitHub Pages for free:

```bash
# 1. Build the production version
npm install
npm run build

# 2. Deploy the `dist/` folder to GitHub Pages
# (or any static hosting service)
```

**GitHub Pages Setup:**

1. Push your repo to GitHub
2. Go to Settings → Pages
3. Set source to "main" branch, "/" root
4. Access at `https://yourusername.github.io/repository-name/`

## 💻 Local Development

If you want to modify the code:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📖 Features

- ✅ **Player Management** - Track up to 8 players
- ✅ **Life Tracking** - Standard and Commander damage
- ✅ **Battlefield Visualization** - See all permanents in play
- ✅ **Phase Tracker** - Keep track of the current turn phase
- ✅ **Multi-camera Support** - Use multiple cameras simultaneously
- ✅ **P2P Networking** - Players can join via Room ID
- ✅ **Offline Mode** - Everything works offline after first install
- ✅ **Token Generator** - AI-generated custom tokens
- ✅ **Optional AI Announcer** - Real-time commentary (requires API key)

## 🛠️ Tech Stack

- **React** + **TypeScript** + **Vite**
- **Dexie** (IndexedDB for offline storage)
- **PeerJS** (Peer-to-peer networking)
- **Google Gemini AI** (Optional, for AI features)
- **PWA** (Service Workers for offline support)

## 📄 License

This project uses the Scryfall Oracle database for card information.

---

**Made for Magic players who want a free, installable game tracker with optional AI features.**
