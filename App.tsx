import React, { useState, useEffect } from 'react';
import { AnnouncerView } from './components/AnnouncerView';
import { ARClientView } from './components/ARClientView';
import { TokenGenerator } from './components/TokenGenerator';
import { SettingsView } from './components/SettingsView';
import { HelpModal } from './components/HelpModal';
import { syncDatabase, db } from './database';
import { AppMode } from './types';

enum Tab {
    ANNOUNCER = 'announcer',
    TOKENS = 'tokens',
    SETTINGS = 'settings'
}

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>(Tab.ANNOUNCER);
    const [syncStatus, setSyncStatus] = useState<string>('');
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [dbReady, setDbReady] = useState<boolean>(false);

    // App Mode State (Selection Screen)
    const [appMode, setAppMode] = useState<AppMode | null>(null);

    // For Joining: Room ID state
    const [roomIdInput, setRoomIdInput] = useState('');
    const [showJoinInput, setShowJoinInput] = useState(false);

    // Help Modal State
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        // Initial Sync on App Load
        const initApp = async () => {
            const cardCount = await db.cards.count();
            if (cardCount === 0) {
                setIsSyncing(true); // Enforce syncing screen if empty
            }

            // Add timeout fallback in case sync gets stuck
            const timeoutId = setTimeout(() => {
                setIsSyncing(false);
                setDbReady(true);
            }, 10000); // Hide after 10 seconds max

            syncDatabase((msg) => {
                setSyncStatus(msg);
                // If we are actively downloading/processing, show the syncing overlay
                if (msg.includes("Downloading") || msg.includes("Processing") || msg.includes("Saving")) {
                    setIsSyncing(true);
                }
                if (msg.includes("Complete") || msg.includes("up to date") || msg.includes("Error")) {
                    clearTimeout(timeoutId);
                    setTimeout(() => setIsSyncing(false), 1500); // Small delay to read completion
                    setDbReady(true);
                }
            });
        };
        initApp();
    }, []);

    const handleJoinGame = () => {
        if (roomIdInput.trim()) {
            setAppMode(AppMode.JoinGame);
        }
    };

    // Render AR Client View if joining
    if (appMode === AppMode.JoinGame) {
        return <ARClientView roomId={roomIdInput} onBack={() => setAppMode(null)} />;
    }

    // Mode Selection Screen
    if (!appMode) {
        return (
            <div className="h-screen w-screen bg-gradient-mana-enhanced flex items-center justify-center p-6 relative overflow-hidden">
                {/* Animated Particle Background */}
                <div className="particle-background">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="particle"
                            style={{
                                color: i % 5 === 0 ? 'var(--mana-blue-500)' :
                                    i % 5 === 1 ? 'var(--mana-black-500)' :
                                        i % 5 === 2 ? 'var(--mana-red-500)' :
                                            i % 5 === 3 ? 'var(--mana-green-500)' :
                                                'var(--mana-white-500)',
                                bottom: `${Math.random() * 100}%`
                            }}
                        />
                    ))}
                </div>

                {/* Help Button */}
                <button
                    onClick={() => setShowHelp(true)}
                    className="absolute top-6 right-6 w-12 h-12 rounded-full glass-panel text-zinc-400 hover:text-white transition-all flex items-center justify-center shadow-lg z-50 border-2 border-transparent hover:border-purple-500 glow-md"
                >
                    <i className="fa-solid fa-question text-xl"></i>
                </button>

                <HelpModal
                    isOpen={showHelp}
                    onClose={() => setShowHelp(false)}
                    title="Choosing Your Interface"
                >
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-indigo-400 font-bold uppercase text-xs tracking-wider mb-1">Host / Announcer</h4>
                            <p>Select this if you are running the game session. The AI uses your camera to watch the table, track life totals, announce triggers, and act as a Judge. You can also see cameras from connected players.</p>
                        </div>
                        <div className="border-t border-zinc-800 pt-3">
                            <h4 className="text-cyan-400 font-bold uppercase text-xs tracking-wider mb-1">Offline AR View</h4>
                            <p>Use this for solo play or if you just want to track the board state visually using your own camera without connecting to others. The Announcer is muted by default but can be toggled.</p>
                        </div>
                        <div className="border-t border-zinc-800 pt-3">
                            <h4 className="text-green-400 font-bold uppercase text-xs tracking-wider mb-1">Join Game</h4>
                            <p>Select this to connect to a Host. Your camera feed will be sent to the Host Announcer AI, and you will see the game data (Life, Phase, Statuses) overlaid on your screen. You can use Push-to-Talk to announce your plays.</p>
                        </div>
                    </div>
                </HelpModal>

                <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="md:col-span-2 text-center mb-6">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-black flex items-center justify-center shadow-dramatic mx-auto mb-8 border-3 animate-float glow-lg texture-damasc" style={{ color: 'var(--mana-black-500)', borderWidth: '3px', borderColor: 'var(--mana-black-500)' }}>
                            <i className="fa-solid fa-dragon text-white text-5xl drop-shadow-lg"></i>
                        </div>
                        <h1 className="heading-xl text-white mb-4 text-shadow" style={{ textShadow: '0 4px 12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(150, 84, 255, 0.5)' }}>MTG ANNOUNCER</h1>
                        <p className="text-zinc-200 body-lg font-semibold">Choose your interface mode</p>
                    </div>

                    {/* Announcer Mode Card - Blue Mana Theme */}
                    <button
                        onClick={() => setAppMode(AppMode.Announcer)}
                        className="group mtg-card-premium mtg-corner-ornament dramatic-hover relative"
                        style={{ color: 'var(--mana-blue-500)' }}
                    >
                        <div className="mtg-card-premium-inner p-8 mtg-foil-effect texture-card-linen">
                            <div className="absolute inset-0 bg-gradient-blue opacity-15 group-hover:opacity-25 transition-opacity rounded-xl"></div>
                            <div className="mana-symbol-large mana-symbol-blue mb-6 group-hover:scale-110 transition-transform origin-left relative z-10">
                                U
                            </div>
                            <h2 className="heading-sm text-white mb-4 relative z-10" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>Host / Announcer</h2>
                            <p className="text-zinc-100 body-md leading-relaxed relative z-10">
                                Start a new session as the Host. The AI will watch your camera and any connected player cameras to announce the game.
                            </p>
                        </div>
                    </button>

                    {/* AR View Mode Card - Green Mana Theme */}
                    <button
                        onClick={() => setAppMode(AppMode.ARView)}
                        className="group mtg-card-premium mtg-corner-ornament dramatic-hover relative"
                        style={{ color: 'var(--mana-green-500)' }}
                    >
                        <div className="mtg-card-premium-inner p-8 mtg-foil-effect texture-card-linen">
                            <div className="absolute inset-0 bg-gradient-green opacity-15 group-hover:opacity-25 transition-opacity rounded-xl"></div>
                            <div className="mana-symbol-large mana-symbol-green mb-6 group-hover:scale-110 transition-transform origin-left relative z-10">
                                G
                            </div>
                            <h2 className="heading-sm text-white mb-4 relative z-10" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>Offline AR View</h2>
                            <p className="text-zinc-100 body-md leading-relaxed relative z-10">
                                Visual HUD focus. Audio is muted. Use your camera to track board state locally without connecting to a host.
                            </p>
                        </div>
                    </button>

                    {/* Join Game Card - Red Mana Theme */}
                    <div className={`md:col-span-2 group mtg-card-premium ${showJoinInput ? 'mtg-corner-ornament' : ''} relative`} style={{ color: 'var(--mana-red-500)' }}>
                        <div className="mtg-card-premium-inner p-8 mtg-foil-effect texture-card-linen">
                            <div className="absolute inset-0 bg-gradient-red opacity-15 group-hover:opacity-25 transition-opacity pointer-events-none rounded-xl"></div>

                            {!showJoinInput ? (
                                <button onClick={() => setShowJoinInput(true)} className="w-full text-left flex items-start gap-6">
                                    <div className="mana-symbol-large mana-symbol-red text-2xl mb-4 group-hover:scale-110 transition-transform origin-left flex-shrink-0">
                                        R
                                    </div>
                                    <div className="relative z-10">
                                        <h2 className="heading-sm text-white mb-4" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)' }}>Join Game</h2>
                                        <p className="text-zinc-100 body-md leading-relaxed">
                                            Connect to a nearby Host via Room ID. Your camera will be sent to the Announcer, and you will see the game state overlay.
                                        </p>
                                    </div>
                                </button>
                            ) : (
                                <div className="flex flex-col items-center justify-center animate-fade-in w-full relative z-10">
                                    <h3 className="heading-sm text-white mb-8">Enter Room ID</h3>
                                    <div className="flex gap-2 max-w-md w-full">
                                        <span className="glass-panel text-zinc-200 px-5 py-4 rounded-l-xl font-mono font-bold text-lg border-2 border-red-900/50">mtg-</span>
                                        <input
                                            type="text"
                                            value={roomIdInput}
                                            onChange={(e) => setRoomIdInput(e.target.value)}
                                            placeholder="1234"
                                            className="flex-1 glass-panel border-l-0 rounded-r-xl px-5 py-4 text-white placeholder-zinc-400 focus:outline-none focus:ring-3 focus:ring-red-500 font-mono tracking-widest text-xl border-2 border-red-900/50 focus:border-red-500"
                                        />
                                    </div>
                                    <div className="flex gap-6 mt-10">
                                        <button onClick={() => setShowJoinInput(false)} className="text-zinc-300 hover:text-white transition-colors px-8 py-3 font-semibold text-lg">Cancel</button>
                                        <button
                                            onClick={handleJoinGame}
                                            disabled={!roomIdInput.trim()}
                                            className="btn-premium btn-red px-10 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ color: 'var(--mana-red-500)' }}
                                        >
                                            <i className="fa-solid fa-bolt mr-2"></i> Connect
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main Application Layout (Host / Offline)
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-white font-sans selection:bg-indigo-500 selection:text-white">
            {/* Sidebar Navigation */}
            <nav className="w-16 md:w-20 flex flex-col items-center py-6 glass-panel border-r-2 border-purple-900/50 z-50">
                <div className="mb-8 w-12 h-12 rounded-xl bg-gradient-black flex items-center justify-center shadow-lg border-2 border-purple-500/50 animate-pulse-glow" style={{ color: 'var(--mana-black-400)' }}>
                    <i className="fa-solid fa-dragon text-white text-xl"></i>
                </div>

                <div className="flex-1 flex flex-col gap-4 w-full px-2">
                    <button
                        onClick={() => setActiveTab(Tab.ANNOUNCER)}
                        className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group relative border-2 ${activeTab === Tab.ANNOUNCER
                            ? 'bg-gradient-blue text-white shadow-lg border-blue-500'
                            : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-blue-400 border-transparent hover:border-blue-500/30'
                            }`}
                        title="Announcer"
                    >
                        <i className="fa-solid fa-microphone-lines text-xl"></i>
                        {activeTab === Tab.ANNOUNCER && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-400 rounded-l-full shadow-lg shadow-blue-500"></div>}
                    </button>

                    <button
                        onClick={() => setActiveTab(Tab.TOKENS)}
                        className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group border-2 ${activeTab === Tab.TOKENS
                            ? 'bg-gradient-green text-white shadow-lg border-green-500'
                            : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-green-400 border-transparent hover:border-green-500/30'
                            }`}
                        title="Token Forge"
                    >
                        <i className="fa-solid fa-wand-magic-sparkles text-xl"></i>
                        {activeTab === Tab.TOKENS && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-green-400 rounded-l-full shadow-lg shadow-green-500"></div>}
                    </button>

                    <button
                        onClick={() => setActiveTab(Tab.SETTINGS)}
                        className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group border-2 ${activeTab === Tab.SETTINGS
                            ? 'bg-gradient-artifact text-white shadow-lg border-gray-400'
                            : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-gray-400 border-transparent hover:border-gray-500/30'
                            }`}
                        title="Settings"
                    >
                        <i className="fa-solid fa-gear text-xl"></i>
                        {activeTab === Tab.SETTINGS && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gray-400 rounded-l-full shadow-lg shadow-gray-500"></div>}
                    </button>
                </div>

                <div className="mt-auto flex flex-col items-center gap-4">
                    {/* Sync Status Indicator */}
                    <div
                        className={`mana-orb w-3 h-3 ${dbReady ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ color: dbReady ? 'var(--mana-green-500)' : 'var(--mana-white-500)' }}
                        title={dbReady ? "Database Ready" : "Syncing..."}
                    ></div>

                    {/* Return to Mode Selection */}
                    <button
                        onClick={() => setAppMode(null)}
                        className="w-10 h-10 rounded-full glass-panel text-zinc-400 hover:text-white hover:border-red-500 border-2 border-transparent transition-all flex items-center justify-center"
                        title="Exit to Menu"
                    >
                        <i className="fa-solid fa-power-off"></i>
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-hidden card-texture" style={{ background: 'var(--bg-primary)' }}>
                {/* Syncing Overlay */}
                {isSyncing && (
                    <div className="absolute top-0 left-0 right-0 z-50 glass-panel text-white text-xs font-bold px-4 py-3 flex justify-between items-center shadow-lg border-b-2 border-purple-500 animate-shimmer">
                        <span className="flex items-center gap-2">
                            <i className="fa-solid fa-rotate fa-spin"></i>
                            {syncStatus || "Synchronizing Oracle Database..."}
                        </span>
                    </div>
                )}

                {activeTab === Tab.ANNOUNCER && <AnnouncerView appMode={appMode} />}
                {activeTab === Tab.TOKENS && <TokenGenerator />}
                {activeTab === Tab.SETTINGS && <SettingsView />}
            </main>
        </div>
    );
};

export default App;