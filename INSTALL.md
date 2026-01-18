# Installing MTG Announcer as a Standalone App

MTG Announcer works as a **Progressive Web App (PWA)**, which means you can install it on any device directly from your web browser - no app store needed!

## Quick Start

1. **Visit the app** in your web browser
2. **Install it** using your browser's install option
3. **Use it offline** - it works without internet after installation!

## Installation by Platform

### 📱 Android (Chrome/Edge)

1. Open the MTG Announcer URL in Chrome or Edge
2. Tap the three-dot menu (⋮) in the top right
3. Select **"Install app"** or **"Add to Home Screen"**
4. Confirm the installation
5. The app icon will appear on your home screen!

### 📱 iOS (Safari)

1. Open the MTG Announcer URL in Safari
2. Tap the **Share** button (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Give it a name (or keep "MTG Announcer")
5. Tap **"Add"**
6. The app icon will appear on your home screen!

### 💻 Windows/Linux (Chrome/Edge)

1. Open the MTG Announcer URL in Chrome or Edge
2. Click the three-dot menu (⋮) in the top right
3. Select **"Install MTG Announcer"** or **"Apps" → "Install this site as an app"**
4. Confirm the installation
5. The app will open in its own window and appear in your Start Menu/Applications!

**Tip**: You can also click the install icon (⊕) that appears in the address bar.

### 💻 macOS (Chrome/Edge)

Same as Windows/Linux above. The app will be added to your Applications folder.

---

## Features Without Internet

Once installed, these features work **100% offline**:

✅ Player tracking & registration  
✅ Life total management  
✅ Battlefield card tracking  
✅ Phase tracking  
✅ Commander damage tracking  
✅ Token generator  
✅ Scryfall card database (after first sync)  
✅ Peer-to-peer multiplayer (local network)  

❌ AI Announcer (requires internet + API key)

---

## Optional: Enable AI Features

The AI Announcer is **optional** and requires a free Gemini API key:

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"** (free tier has generous limits)
4. Copy your API key
5. In the MTG Announcer app, go to **Settings** (gear icon)
6. Paste your API key in the "Gemini API Key" field
7. Click **"Save"**
8. Reload the app

Now the AI Announcer will work!

---

## Updating the App

The app will automatically update when you're online. If you want to force an update:

1. Open the installed app
2. Pull down to refresh (mobile) or press Ctrl+R (desktop)
3. The service worker will check for updates

---

## Uninstalling

### Android/iOS

Long-press the app icon → Remove/Delete

### Windows/Linux/macOS

1. Open Chrome/Edge settings
2. Go to **Apps** → **Manage Apps**
3. Find "MTG Announcer" and click **Uninstall**

---

## Troubleshooting

**App won't install?**

- Make sure you're using a modern browser (Chrome, Edge, Safari)
- Try accessing via HTTPS (not HTTP)
- Clear your browser cache and try again

**AI not working?**

- Check that you've entered a valid API key in Settings
- Make sure you have internet connectivity
- Verify your API key at [aistudio.google.com](https://aistudio.google.com)

**Offline features not working?**

- Make sure you've visited the app at least once online
- Go to Settings and click "Check for Updates" to sync the card database
- Check your storage isn't full

---

## Free Hosting on GitHub Pages

Want to host your own copy?

1. Fork this repository on GitHub
2. Go to your repo's **Settings** → **Pages**
3. Set source to "main" branch and "/" root
4. GitHub will give you a URL like `https://yourusername.github.io/MTG-Announcer/`
5. Share that URL with your playgroup!

**Cost**: $0 (GitHub Pages is free for public repositories)
