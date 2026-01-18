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

        syncDatabase((msg) => {
            setSyncStatus(msg);
            // If we are actively downloading/processing, show the syncing overlay
            if (msg.includes("Downloading") || msg.includes("Processing") || msg.includes("Saving")) {
                setIsSyncing(true);
            }
            if (msg.includes("Complete") || msg.includes("up to date") || msg.includes("Error")) {
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
          <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] relative overflow-hidden">
              {/* Help Button */}
              <button 
                  onClick={() => setShowHelp(true)}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-600 transition-all flex items-center justify-center shadow-lg z-50"
              >
                  <i className="fa-solid fa-question text-lg"></i>
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

              <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                  <div className="md:col-span-2 text-center mb-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
                        <i className="fa-solid fa-dragon text-white text-3xl"></i>
                      </div>
                      <h1 className="text-4xl font-bold text-white font-serif tracking-tight mb-2">MTG Announcer</h1>
                      <p className="text-zinc-400">Choose your interface mode</p>
                  </div>

                  {/* Announcer Mode Card */}
                  <button 
                      onClick={() => setAppMode(AppMode.Announcer)}
                      className="group bg-zinc-900 border-2 border-zinc-800 hover:border-indigo-500 rounded-2xl p-8 text-left transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] flex flex-col relative overflow-hidden"
                  >
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <i className="fa-solid fa-microphone-lines text-4xl text-indigo-400 mb-4 group-hover:scale-110 transition-transform origin-left"></i>
                      <h2 className="text-2xl font-bold text-white mb-2">Host / Announcer</h2>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                          Start a new session as the Host. The AI will watch your camera and any connected player cameras to announce the game.
                      </p>
                  </button>

                  {/* AR View Mode Card */}
                  <button 
                      onClick={() => setAppMode(AppMode.ARView)}
                      className="group bg-zinc-900 border-2 border-zinc-800 hover:border-cyan-500 rounded-2xl p-8 text-left transition-all hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col relative overflow-hidden"
                  >
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <i className="fa-solid fa-glasses text-4xl text-cyan-400 mb-4 group-hover:scale-110 transition-transform origin-left"></i>
                      <h2 className="text-2xl font-bold text-white mb-2">Offline AR View</h2>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                          Visual HUD focus. Audio is muted. Use your camera to track board state locally without connecting to a host.
                      </p>
                  </button>
                  
                  {/* Join Game Card */}
                  <div className={`md:col-span-2 group bg-zinc-900 border-2 border-zinc-800 ${showJoinInput ? 'border-green-500' : 'hover:border-green-500'} rounded-2xl p-8 text-left transition-all hover:shadow-[0_0_30px_rgba(34,197,94,0.2)] flex flex-col relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      
                      {!showJoinInput ? (
                          <button onClick={() => setShowJoinInput(true)} className="w-full text-left flex items-start gap-4">
                              <i className="fa-solid fa-users-viewfinder text-4xl text-green-400 mb-4 group-hover:scale-110 transition-transform origin-left"></i>
                              <div>
                                <h2 className="text-2xl font-bold text-white mb-2">Join Game</h2>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    Connect to a nearby Host via Room ID. Your camera will be sent to the Announcer, and you will see the game state overlay.
                                </p>
                              </div>
                          </button>
                      ) : (
                          <div className="flex flex-col items-center justify-center animate-fadeIn w-full relative z-10">
                               <h3 className="text-xl font-bold text-white mb-4">Enter Room ID</h3>
                               <div className="flex gap-2 max-w-md w-full">
                                   <span className="bg-zinc-800 border border-zinc-700 text-zinc-400 px-3 py-2 rounded-l-lg font-mono">mtg-</span>
                                   <input 
                                        type="text" 
                                        value={roomIdInput}
                                        onChange={(e) => setRoomIdInput(e.target.value)}
                                        placeholder="1234"
                                        className="flex-1 bg-zinc-950 border border-zinc-700 border-l-0 rounded-r-lg px-4 py-2 text-white focus:outline-none focus:border-green-500 font-mono tracking-widest text-lg"
                                   />
                               </div>
                               <div className="flex gap-4 mt-6">
                                   <button onClick={() => setShowJoinInput(false)} className="text-zinc-500 hover:text-white transition-colors">Cancel</button>
                                   <button 
                                        onClick={handleJoinGame}
                                        disabled={!roomIdInput.trim()}
                                        className="bg-green-600 hover:bg-green-500 text-white px-8 py-2 rounded-lg font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/50"
                                   >
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
          <nav className="w-16 md:w-20 flex flex-col items-center py-6 bg-zinc-900 border-r border-zinc-800 z-50">
              <div className="mb-8 w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <i className="fa-solid fa-dragon text-white text-lg"></i>
              </div>

              <div className="flex-1 flex flex-col gap-4 w-full px-2">
                  <button 
                      onClick={() => setActiveTab(Tab.ANNOUNCER)}
                      className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group relative ${activeTab === Tab.ANNOUNCER ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-zinc-500 hover:bg-zinc-800 hover:text-indigo-400'}`}
                      title="Announcer"
                  >
                      <i className="fa-solid fa-microphone-lines text-xl"></i>
                      {activeTab === Tab.ANNOUNCER && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full"></div>}
                  </button>
                  
                  <button 
                      onClick={() => setActiveTab(Tab.TOKENS)}
                      className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group ${activeTab === Tab.TOKENS ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-zinc-500 hover:bg-zinc-800 hover:text-indigo-400'}`}
                      title="Token Forge"
                  >
                      <i className="fa-solid fa-wand-magic-sparkles text-xl"></i>
                  </button>

                  <button 
                      onClick={() => setActiveTab(Tab.SETTINGS)}
                      className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group ${activeTab === Tab.SETTINGS ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-zinc-500 hover:bg-zinc-800 hover:text-indigo-400'}`}
                      title="Settings"
                  >
                      <i className="fa-solid fa-gear text-xl"></i>
                  </button>
              </div>

              <div className="mt-auto flex flex-col items-center gap-4">
                  {/* Sync Status Indicator */}
                  <div className={`w-2 h-2 rounded-full ${dbReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} title={dbReady ? "Database Ready" : "Syncing..."}></div>
                  
                   {/* Return to Mode Selection */}
                   <button 
                      onClick={() => setAppMode(null)}
                      className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-red-900 hover:border-red-500 border border-transparent transition-all flex items-center justify-center"
                      title="Exit to Menu"
                  >
                      <i className="fa-solid fa-power-off"></i>
                  </button>
              </div>
          </nav>

          {/* Main Content Area */}
          <main className="flex-1 relative overflow-hidden bg-zinc-950">
              {/* Syncing Overlay */}
              {isSyncing && (
                  <div className="absolute top-0 left-0 right-0 z-50 bg-indigo-600/90 text-white text-xs font-bold px-4 py-2 flex justify-between items-center shadow-lg backdrop-blur-sm">
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