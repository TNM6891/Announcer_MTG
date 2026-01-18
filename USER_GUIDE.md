# MTG Announcer - User Guide

Welcome to the **MTG Announcer**! This guide will teach you everything you need to know to use the app.

## 📖 Table of Contents

1. [What is MTG Announcer?](#what-is-mtg-announcer)
2. [Getting Started](#getting-started)
3. [App Modes](#app-modes)
4. [Using the Interface](#using-the-interface)
5. [AI Announcer Features](#ai-announcer-features-optional)
6. [Token Generator](#token-generator)
7. [Settings](#settings)
8. [Troubleshooting](#troubleshooting)

---

## What is MTG Announcer?

MTG Announcer is a **free, offline-capable game tracker** for Magic: The Gathering. Think of it as your digital game pad that:

- Tracks players, life totals, and battlefield state
- Optionally uses AI to watch your camera and announce the game (like a sports commentator!)
- Generates custom token images
- Works on phones, tablets, and computers
- Connects multiple players at the same table via peer-to-peer

**No subscription, no ads, no paid features.** The AI announcer is optional and uses your own free Google API key if you want it.

---

## Getting Started

### First Time Setup

1. **Open the app** (either visit the URL or launch the installed PWA)
2. **Choose your mode** (see App Modes below)
3. **Set up your game** using the panels on the right

That's it! The app works offline after the first visit.

---

## App Modes

When you open the app, you'll see three mode options:

### 🎙️ Host / Announcer

**Use this if you are running the game session.**

**What it does:**

- Uses your device's camera to watch the table
- The AI can identify cards and announce plays
- Connects to other players' cameras via Room ID
- Acts as the "central hub" for multiplayer games

**Perfect for:**

- Solo play with AI commentary
- Being the designated "host" at a multiplayer table
- Streaming/recording games with AI narration

**Setup:**

1. Grant camera and microphone permissions
2. Select which camera(s) to use (top right camera menu)
3. Optionally: Share your Room ID with friends so they can connect
4. Click "ESTABLISH LINK" to start the AI (requires API key)

---

### 👓 Offline AR View

**Use this for solo play without AI commentary.**

**What it does:**

- Visual HUD for tracking game state
- Audio is muted by default
- Uses your camera to track the board locally
- **Does NOT connect to other players**
- **Does NOT use AI**

**Perfect for:**

- Casual solo games where you just want a tracker
- Practice/testing without needing AI
- Playing offline after card database syncs

---

### 🎮 Join Game

**Use this to connect to someone else's Host.**

**What it does:**

- Sends your camera feed to the Host's AI
- Displays the game state (life, phase, etc.) on your screen
- Lets you use Push-to-Talk to announce your plays

**Perfect for:**

- Multiplayer games where one person is hosting
- Playing from across the table with your phone/tablet
- Keeping your hands free while the AI tracks everything

**Setup:**

1. Get the Room ID from the Host
2. Enter it (just the numbers after `mtg-`)
3. Click "Connect"
4. Grant camera/mic permissions
5. Point your camera at your side of the battlefield

---

## Using the Interface

### Right Panel Overview

The right side of the app has several collapsible panels:

#### 🎮 Game Ritual Setup

- **Format**: Choose your game format (Commander, Standard, Modern, etc.)
- **Custom Rules**: Enter any house rules or special conditions

#### 👥 Planeswalkers (Players)

- **Add Players**: Type names and click `+` to add up to 8 players
- **Remove Players**: Click the `×` next to a name to remove them
- The AI can also register players if you tell it "We're playing: Alice, Bob, Carol"

#### ⚔️ Commander Damage (Commander only)

- Track damage dealt by each commander
- Shows lethal threshold (21 damage = automatic loss)
- Click `+/-` buttons to adjust

#### 🃏 Player Cards

Each player gets a card showing:

- **Name** (top left)
- **Life Total** (top right with `+/-` buttons)
- **Battlefield** (cards in play)
  - Click a card to tap/untap it
  - Right-click (or long-press) to add/remove status effects
- **Skull icon** if they've taken lethal commander damage

#### 🔄 Turn Phase

Click the phase buttons to track which phase you're in:

- Untap
- Upkeep
- Draw
- Main 1
- Combat
- Main 2
- End

---

## AI Announcer Features (Optional)

If you configured a Gemini API key in Settings, you can enable the AI Announcer:

### What the AI Does

1. **Watches your camera(s)** and identifies cards
2. **Announces plays**: "Player 1 casts Sol Ring!"
3. **Tracks triggers**: "Rhystic Study triggered - does anyone pay 1?"
4. **Enforces rules** (Level 3 Judge mode): Catches missed triggers and mandatory actions
5. **Provides commentary**: Hype, analysis, strategic insights

### How to Use It

1. **Click "ESTABLISH LINK"** (becomes "CEASE LINK" when active)
2. **Speak naturally**: "I cast Lightning Bolt targeting Player 2"
3. **Manual override**: You can always manually adjust life, tap cards, etc.
4. **Mute AI**: Click the speaker icon if you want to use the tracker silently

### Tips for Best Results

- **Good lighting**: Make sure cards are visible
- **Stable camera**: Use a phone stand or tripod
- **Clear speech**: Speak toward your microphone
- **Camera angles**: Point cameras down at the battlefield
- **Multiple cameras**: Host mode supports up to 4 local cameras + remote player cameras

---

## Token Generator

Create custom token images using AI!

### How to Use

1. Click the **wand icon** (🪄) in the left sidebar
2. Enter a description: "3/3 green Beast token with trample"
3. Click "Generate"
4. Save or use the token image

**Note**: Requires an API key to generate images.

---

## Settings

Click the **gear icon** (⚙️) in the left sidebar to access settings:

### Gemini API Key (Optional)

- **Where to get one**: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **Cost**: FREE (generous usage limits)
- **How to add**:
  1. Paste your API key
  2. Click "Save"
  3. Reload the app
  4. Click "ESTABLISH LINK" to start the AI

### Announcer Personality

- Currently: **Gemini 2.5 Live (Fenrir Voice)** - Esports Hype commentator
- Future: More voice/personality options coming

### Offline Database

- **Card Count**: Shows how many Scryfall Oracle cards are cached locally
- **Last Updated**: When the database was last synced
- **Check for Updates**: Manually sync the latest card data

---

## Troubleshooting

### The app shows a blue "Database Synchronized" bar that won't go away

**Fix**: Wait 10 seconds - it will auto-dismiss. Or refresh the page.

### "AI features require a Gemini API key" error

**Fix**: Go to Settings → Add your API key → Save → Reload app

### Camera not working

**Fix**:

- Make sure you granted camera permissions
- Check top-right camera menu - is a camera selected?
- Try a different browser (Chrome/Edge work best)

### AI isn't recognizing cards

**Solutions**:

- Improve lighting
- Move camera closer to the battlefield
- Manually tell the AI: "I played [Card Name]"
- Use manual controls - click cards to tap, right-click for status

### App won't install on my phone

**Fix**:

- **iOS**: Must use Safari browser (not Chrome)
- **Android**: Use Chrome or Edge
- Look for "Add to Home Screen" or "Install app" in browser menu

### Game state is wrong

**Fix**: All panels are manually adjustable! Just click the buttons to fix life, phases, etc.

### Room ID connection failing

**Fixes**:

- Make sure both devices are on the same **WiFi network** or have internet connection
- Double-check the Room ID (case-sensitive!)
- Try refreshing both devices

### App is offline but not working

**Fix**: You need to visit the app **once while online** to cache everything. After that, it works fully offline.

---

## Keyboard Shortcuts & Gestures

### Desktop

- **Click** card: Tap/Untap
- **Right-click** card: Add/remove status effects
- **F12**: Open browser console (for debugging)
- **Ctrl+Shift+R**: Hard refresh (clear cache)

### Mobile

- **Tap** card: Tap/Untap
- **Long-press** card: Add/remove status effects
- **Pull down**: Refresh app

---

## Pro Tips

1. **Multi-camera setup**: Use your laptop's webcam + phone camera for different angles
2. **Voice commands**: The AI responds to natural speech, not strict commands
3. **Manual is faster**: For quick adjustments, clicking buttons is faster than waiting for AI
4. **Offline mode**: Download the app while online, then use it anywhere (no internet needed)
5. **Share Room IDs via text**: Just send the 4-digit number to friends
6. **Token Generator**: Generate tokens before the game to save time

---

## Feature Checklist

Here's everything the app can do:

**Without AI:**

- ✅ Track up to 8 players
- ✅ Life total management
- ✅ Commander damage tracking
- ✅ Battlefield visualization (manual card placement)
- ✅ Turn phase tracking
- ✅ Custom game formats and rules
- ✅ Offline card database (Scryfall)
- ✅ Peer-to-peer multiplayer
- ✅ Works 100% offline after first sync

**With AI (Optional - Requires Free API Key):**

- ✅ Camera-based card recognition
- ✅ Real-time audio commentary
- ✅ Automatic trigger announcements
- ✅ Level 3 Judge rules enforcement
- ✅ Strategic analysis and hype
- ✅ Token image generation

---

## Need More Help?

- **Check the README**: Technical info and deployment details
- **Check INSTALL.md**: Platform-specific installation instructions
- **GitHub Issues**: Report bugs or request features at your repository
- **Community**: Share tips with other users!

---

**Enjoy your games! 🎴⚔️✨**
