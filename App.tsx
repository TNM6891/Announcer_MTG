import React, { useState, useEffect } from 'react';
import { AnnouncerView } from './components/AnnouncerView';
import { ARClientView } from './components/ARClientView';
import { TokenGenerator } from './components/TokenGenerator';
import { SettingsView } from './components/SettingsView';
import { HelpModal } from './components/HelpModal';
import { ToastProvider } from './hooks/useToast';
import { syncDatabase, db } from './database';
import { AppMode } from './types';

enum Tab {
    ANNOUNCER = 'announcer',
    TOKENS = 'tokens',
    SETTINGS = 'settings'
}

// Particle component for background - respects reduced motion
const ParticleBackground: React.FC = () => {
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduceMotion(mq.matches);
        const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    if (reduceMotion) return null;

    // Reduce particle count on mobile
    const count = window.innerWidth < 768 ? 10 : 20;
    const colors = [
        'var(--mana-blue-500)',
        'var(--mana-black-500)',
        'var(--mana-red-500)',
        'var(--mana-green-500)',
        'var(--mana-white-500)'
    ];

    return (
        <div className="particle-background">
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className="particle"
                    style={{
                        color: colors[i % 5],
                        bottom: `${Math.random() * 100}%`
                    }}
                />
            ))}
        </div>
    );
};

const AppContent: React.FC = () => {
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
        const initApp = async () => {
            const cardCount = await db.cards.count();
            if (cardCount === 0) {
                setIsSyncing(true);
            }

            const timeoutId = setTimeout(() => {
                setIsSyncing(false);
                setDbReady(true);
            }, 10000);

            syncDatabase((msg) => {
                setSyncStatus(msg);
                if (msg.includes("Downloading") || msg.includes("Processing") || msg.includes("Saving")) {
                    setIsSyncing(true);
                }
                if (msg.includes("Complete") || msg.includes("up to date") || msg.includes("Error")) {
                    clearTimeout(timeoutId);
                    setTimeout(() => setIsSyncing(false), 1500);
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
            <div className="min-h-screen w-screen texture-dark-matter flex items-center justify-center p-4 md:p-6 relative overflow-auto safe-area-padding">
                {/* Animated Particle Background */}
                <ParticleBackground />

                {/* Help Button - Consistent position */}
                <button
                    onClick={() => setShowHelp(true)}
                    className="fixed top-4 right-4 w-12 h-12 rounded-full glass-panel text-zinc-400 hover:text-white transition-all flex items-center justify-center shadow-lg z-50 border-2 border-transparent hover:border-purple-500 touch-target"
                    aria-label="Help"
                >
                    <i className="fa-solid fa-question text-xl" aria-hidden="true"></i>
                </button>

                <HelpModal
                    isOpen={showHelp}
                    onClose={() => setShowHelp(false)}
                    title="Choosing Your Interface"
                >
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-blue-400 font-bold uppercase text-xs tracking-wider mb-1">Host / Announcer</h4>
                            <p>Select this if you are running the game session. The AI uses your camera to watch the table, track life totals, announce triggers, and act as a Judge.</p>
                        </div>
                        <div className="border-t border-zinc-800 pt-3">
                            <h4 className="text-green-400 font-bold uppercase text-xs tracking-wider mb-1">Offline AR View</h4>
                            <p>Use this for solo play or to track the board state visually using your own camera without connecting to others.</p>
                        </div>
                        <div className="border-t border-zinc-800 pt-3">
                            <h4 className="text-red-400 font-bold uppercase text-xs tracking-wider mb-1">Join Game</h4>
                            <p>Connect to a Host. Your camera feed will be sent to the Host, and you will see the game data overlaid on your screen.</p>
                        </div>
                    </div>
                </HelpModal>

                <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 relative z-10 py-8">
                    {/* Header */}
                    <div className="md:col-span-2 text-center mb-4 md:mb-6">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-black flex items-center justify-center shadow-lg mx-auto mb-6 md:mb-8 border-3 animate-float border-purple-500/50">
                            <i className="fa-solid fa-dragon text-white text-4xl md:text-5xl drop-shadow-lg" aria-hidden="true"></i>
                        </div>
                        <h1 className="heading-lg md:heading-xl text-white mb-3 md:mb-4 text-shadow-purple">MTG ANNOUNCER</h1>
                        <p className="text-zinc-200 body-md md:body-lg font-semibold">Choose your interface mode</p>
                    </div>

                    {/* Announcer Mode Card - Blue Mana Theme */}
                    <button
                        onClick={() => setAppMode(AppMode.Announcer)}
                        className="group mtg-card-frame mtg-card-frame-blue p-4 md:p-8 text-left transition-all hover:scale-[1.02] touch-target"
                    >
                        <div className="flex items-start gap-4">
                            <div className="mana-symbol-large mana-symbol-blue group-hover:scale-110 transition-transform flex-shrink-0">
                                U
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="heading-sm text-white mb-2 md:mb-4 text-shadow-blue">Host / Announcer</h2>
                                <p className="text-zinc-200 body-sm md:body-md leading-relaxed">
                                    Start a new session as the Host. The AI will watch your camera and announce the game.
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* AR View Mode Card - Green Mana Theme */}
                    <button
                        onClick={() => setAppMode(AppMode.ARView)}
                        className="group mtg-card-frame mtg-card-frame-green p-4 md:p-8 text-left transition-all hover:scale-[1.02] touch-target"
                    >
                        <div className="flex items-start gap-4">
                            <div className="mana-symbol-large mana-symbol-green group-hover:scale-110 transition-transform flex-shrink-0">
                                G
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="heading-sm text-white mb-2 md:mb-4 text-shadow-green">Offline AR View</h2>
                                <p className="text-zinc-200 body-sm md:body-md leading-relaxed">
                                    Visual HUD focus. Track board state locally without connecting to a host.
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* Join Game Card - Red Mana Theme */}
                    <div className="md:col-span-2 mtg-card-frame mtg-card-frame-red p-4 md:p-8 transition-all">
                        {!showJoinInput ? (
                            <button
                                onClick={() => setShowJoinInput(true)}
                                className="w-full text-left flex items-start gap-4 group touch-target"
                            >
                                <div className="mana-symbol-large mana-symbol-red group-hover:scale-110 transition-transform flex-shrink-0">
                                    R
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="heading-sm text-white mb-2 md:mb-4 text-shadow-red">Join Game</h2>
                                    <p className="text-zinc-200 body-sm md:body-md leading-relaxed">
                                        Connect to a nearby Host via Room ID. Your camera will be sent to the Announcer.
                                    </p>
                                </div>
                            </button>
                        ) : (
                            <div className="flex flex-col items-center justify-center animate-fade-in w-full">
                                <h3 className="heading-sm text-white mb-6 md:mb-8">Enter Room ID</h3>
                                <p className="text-zinc-400 text-sm mb-4">Ask the host for their room code</p>
                                <div className="flex flex-col sm:flex-row gap-2 max-w-md w-full">
                                    <input
                                        type="text"
                                        value={roomIdInput}
                                        onChange={(e) => setRoomIdInput(e.target.value)}
                                        placeholder="mtg-1234"
                                        className="flex-1 glass-panel rounded-xl px-4 py-3 md:px-5 md:py-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono tracking-widest text-lg md:text-xl border-2 border-red-900/50 focus:border-red-500"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 md:gap-6 mt-6 md:mt-10 w-full sm:w-auto">
                                    <button
                                        onClick={() => setShowJoinInput(false)}
                                        className="text-zinc-300 hover:text-white transition-colors px-6 py-3 font-semibold text-base md:text-lg touch-target order-2 sm:order-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleJoinGame}
                                        disabled={!roomIdInput.trim()}
                                        className="btn-mtg btn-red px-8 py-3 md:px-10 md:py-4 disabled:opacity-50 disabled:cursor-not-allowed touch-target order-1 sm:order-2"
                                    >
                                        <i className="fa-solid fa-bolt mr-2" aria-hidden="true"></i>
                                        Connect
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Main Application Layout (Host / Offline)
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-white font-sans selection:bg-indigo-500 selection:text-white">
            {/* Sidebar Navigation */}
            <nav className="w-16 md:w-20 flex flex-col items-center py-4 md:py-6 glass-panel border-r-2 border-purple-900/50 z-50 safe-area-padding">
                <div className="mb-6 md:mb-8 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-black flex items-center justify-center shadow-lg border-2 border-purple-500/50">
                    <i className="fa-solid fa-dragon text-white text-lg md:text-xl" aria-hidden="true"></i>
                </div>

                <div className="flex-1 flex flex-col gap-3 md:gap-4 w-full px-2">
                    <button
                        onClick={() => setActiveTab(Tab.ANNOUNCER)}
                        className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group relative border-2 touch-target ${activeTab === Tab.ANNOUNCER
                            ? 'bg-gradient-blue text-white shadow-lg border-blue-500'
                            : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-blue-400 border-transparent hover:border-blue-500/30'
                            }`}
                        title="Announcer"
                        aria-label="Announcer tab"
                        aria-current={activeTab === Tab.ANNOUNCER ? 'page' : undefined}
                    >
                        <i className="fa-solid fa-microphone-lines text-lg md:text-xl" aria-hidden="true"></i>
                        {activeTab === Tab.ANNOUNCER && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 md:h-8 bg-blue-400 rounded-l-full shadow-lg shadow-blue-500" aria-hidden="true"></div>}
                    </button>

                    <button
                        onClick={() => setActiveTab(Tab.TOKENS)}
                        className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group border-2 touch-target ${activeTab === Tab.TOKENS
                            ? 'bg-gradient-green text-white shadow-lg border-green-500'
                            : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-green-400 border-transparent hover:border-green-500/30'
                            }`}
                        title="Token Forge"
                        aria-label="Token Forge tab"
                        aria-current={activeTab === Tab.TOKENS ? 'page' : undefined}
                    >
                        <i className="fa-solid fa-wand-magic-sparkles text-lg md:text-xl" aria-hidden="true"></i>
                        {activeTab === Tab.TOKENS && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 md:h-8 bg-green-400 rounded-l-full shadow-lg shadow-green-500" aria-hidden="true"></div>}
                    </button>

                    <button
                        onClick={() => setActiveTab(Tab.SETTINGS)}
                        className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group border-2 touch-target ${activeTab === Tab.SETTINGS
                            ? 'bg-gradient-artifact text-white shadow-lg border-gray-400'
                            : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-gray-400 border-transparent hover:border-gray-500/30'
                            }`}
                        title="Settings"
                        aria-label="Settings tab"
                        aria-current={activeTab === Tab.SETTINGS ? 'page' : undefined}
                    >
                        <i className="fa-solid fa-gear text-lg md:text-xl" aria-hidden="true"></i>
                        {activeTab === Tab.SETTINGS && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 md:h-8 bg-gray-400 rounded-l-full shadow-lg shadow-gray-500" aria-hidden="true"></div>}
                    </button>
                </div>

                <div className="mt-auto flex flex-col items-center gap-3 md:gap-4">
                    {/* Sync Status Indicator */}
                    <div
                        className={`mana-orb w-3 h-3 ${dbReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}
                        title={dbReady ? "Database Ready" : "Syncing..."}
                        role="status"
                        aria-label={dbReady ? "Database Ready" : "Syncing database"}
                    ></div>

                    {/* Return to Mode Selection */}
                    <button
                        onClick={() => setAppMode(null)}
                        className="w-10 h-10 rounded-full glass-panel text-zinc-400 hover:text-white hover:border-red-500 border-2 border-transparent transition-all flex items-center justify-center touch-target"
                        title="Exit to Menu"
                        aria-label="Exit to main menu"
                    >
                        <i className="fa-solid fa-power-off" aria-hidden="true"></i>
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-hidden texture-carbon-fiber">
                {/* Syncing Overlay - Auto-dismiss */}
                {isSyncing && (
                    <div className="absolute top-0 left-0 right-0 z-50 glass-panel text-white text-xs font-bold px-4 py-3 flex justify-between items-center shadow-lg border-b-2 border-purple-500 banner-auto-dismiss" role="status">
                        <span className="flex items-center gap-2">
                            <i className="fa-solid fa-rotate fa-spin" aria-hidden="true"></i>
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

// Main App wrapper with ToastProvider
const App: React.FC = () => {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
};

export default App;