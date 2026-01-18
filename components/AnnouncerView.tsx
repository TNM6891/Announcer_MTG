import React, { useRef, useEffect, useState } from 'react';
import { useLiveSession } from '../hooks/useLiveSession';
import { usePeerNetwork } from '../hooks/usePeerNetwork';
import { GamePhase, GameFormat, AppMode, PlayerProfile, BattlefieldCard } from '../types';
import { HelpModal } from './HelpModal';

interface AnnouncerViewProps {
    appMode: AppMode;
}

export const AnnouncerView: React.FC<AnnouncerViewProps> = ({ appMode }) => {
  // Video Management
  const [activeDeviceIds, setActiveDeviceIds] = useState<string[]>([]);
  const videoRefs = useRef<HTMLVideoElement[]>([]);
  
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [audioOnlyMode, setAudioOnlyMode] = useState(false);
  
  // Camera Selection State
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  
  // Manual Player Entry State
  const [manualPlayerName, setManualPlayerName] = useState('');
  const [activePlayersList, setActivePlayersList] = useState<string[]>([]);
  
  // Panels
  const [showPlayerConfig, setShowPlayerConfig] = useState(true);
  const [showSetupPanel, setShowSetupPanel] = useState(true);
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  // Commander Damage State
  const [commanderDamage, setCommanderDamage] = useState<Record<string, Record<string, number>>>({});
  const [showCommanderDamage, setShowCommanderDamage] = useState(false);

  // Status Editing State
  const [editingCard, setEditingCard] = useState<{player: string, cardId: string, cardName: string} | null>(null);

  // Help State
  const [showHelp, setShowHelp] = useState(false);

  // --- HOST NETWORK SETUP ---
  // Only activate P2P host if we are in Announcer mode (default host)
  const { peerId, remoteStreams, broadcast } = usePeerNetwork({ role: 'host' });

  // Integrate remote streams with local video refs
  const { 
      connect, 
      disconnect, 
      setManualPlayers, 
      setManualFormat, 
      setManualRules,
      toggleCardTap,
      manualUpdateStatus,
      setIsOutputMuted,
      isOutputMuted,
      state, 
      volume, 
      sessionPlayers, 
      battlefield, 
      gameFormat, 
      customRules 
  } = useLiveSession(videoRefs, remoteStreams);

  const [currentLife, setCurrentLife] = useState<Record<string, number>>({}); 
  const [phase, setPhase] = useState<GamePhase>(GamePhase.Main1);

  // Broadcast Game State on change
  useEffect(() => {
      if (sessionPlayers.length > 0) {
          broadcast({
              type: 'GAME_STATE',
              payload: {
                  players: sessionPlayers,
                  battlefield,
                  phase,
                  currentLife,
                  commanderDamage
              }
          });
      }
  }, [sessionPlayers, battlefield, phase, currentLife, commanderDamage]);

  // Setup Initial Mode State
  useEffect(() => {
      if (appMode === AppMode.ARView) {
          setIsOutputMuted(true);
      } else {
          setIsOutputMuted(false);
      }
  }, [appMode, setIsOutputMuted]);

  const AVAILABLE_STATUSES = ['+1/+1 Counter', '-1/-1 Counter', 'Flying', 'Hexproof', 'Indestructible', 'Trample', 'Vigilance', 'Deathtouch', 'Lifelink', 'Haste', 'Stun Counter', 'Summoning Sick', 'Goaded'];

  // Get Video Devices
  useEffect(() => {
      const getDevices = async () => {
          try {
              const devs = await navigator.mediaDevices.enumerateDevices();
              const videoDevs = devs.filter(d => d.kind === 'videoinput');
              setAvailableDevices(videoDevs);
              
              if (videoDevs.length > 0 && activeDeviceIds.length === 0) {
                  setActiveDeviceIds([videoDevs[0].deviceId]);
              }
          } catch (e) {
              console.warn("Could not enumerate devices", e);
          }
      };
      getDevices();
  }, []);

  // Update life trackers when new players are registered
  useEffect(() => {
      if (sessionPlayers.length > 0) {
          const initialLife: Record<string, number> = {};
          sessionPlayers.forEach(p => {
              initialLife[p.name] = currentLife[p.name] || 40;
          });
          setCurrentLife(initialLife);
          setActivePlayersList(sessionPlayers.map(p => p.name));
          setShowPlayerConfig(false); 
      }
  }, [sessionPlayers]);

  const toggleSession = () => {
    if (state.isConnected) {
      disconnect();
    } else {
      connect();
    }
  };
  
  const toggleCamera = (deviceId: string) => {
      if (activeDeviceIds.includes(deviceId)) {
          setActiveDeviceIds(prev => prev.filter(id => id !== deviceId));
      } else {
          if (activeDeviceIds.length < 4) {
              setActiveDeviceIds(prev => [...prev, deviceId]);
          }
      }
  };

  const adjustLife = (playerName: string, amount: number) => {
      setCurrentLife(prev => ({
          ...prev,
          [playerName]: (prev[playerName] || 40) + amount
      }));
  };

  const adjustCommanderDamage = (victim: string, attacker: string, amount: number) => {
      setCommanderDamage(prev => {
          const victimRecord = prev[victim] || {};
          const currentVal = victimRecord[attacker] || 0;
          const newVal = Math.max(0, currentVal + amount);
          return {
              ...prev,
              [victim]: { ...victimRecord, [attacker]: newVal }
          };
      });
  };

  const getLethalSources = (victim: string): string[] => {
      const victimRecord = commanderDamage[victim];
      if (!victimRecord) return [];
      return Object.entries(victimRecord)
          .filter(([_, dmg]) => dmg >= 21)
          .map(([attacker]) => attacker);
  };

  const addManualPlayer = () => {
      if (manualPlayerName.trim() && activePlayersList.length < 8) {
          const updatedList = [...activePlayersList, manualPlayerName.trim()];
          setActivePlayersList(updatedList);
          setManualPlayerName('');
          setManualPlayers(updatedList); 
      }
  };

  const removeManualPlayer = (name: string) => {
      const updatedList = activePlayersList.filter(p => p !== name);
      setActivePlayersList(updatedList);
      setManualPlayers(updatedList);
  };

  const handleRightClickCard = (e: React.MouseEvent, player: string, cardId: string, cardName: string) => {
      e.preventDefault(); 
      setEditingCard({ player, cardId, cardName });
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-zinc-950">
      
      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Announcer Command Center">
          <div className="space-y-4">
              <div>
                  <h4 className="text-indigo-400 font-bold uppercase text-xs tracking-wider mb-1">Starting the Game</h4>
                  <p>1. Enter player names in the "Planeswalkers" panel or simply tell the Announcer who is playing once connected.</p>
                  <p>2. Select your camera sources using the View menu (Top Right). You can select multiple local cameras.</p>
                  <p>3. Share the <strong>Room ID</strong> (Top Left) with friends so they can join via their phones.</p>
                  <p>4. Click <strong>ESTABLISH LINK</strong> to connect to the AI.</p>
              </div>
              <div className="border-t border-zinc-800 pt-3">
                  <h4 className="text-indigo-400 font-bold uppercase text-xs tracking-wider mb-1">Interacting with AI</h4>
                  <p>The Announcer is listening! You can speak naturally.</p>
                  <ul className="list-disc pl-4 text-zinc-400 mt-1 space-y-1">
                      <li>"I cast Sol Ring."</li>
                      <li>"I attack Player B with everything."</li>
                      <li>"End my turn."</li>
                      <li>"Add a +1/+1 counter to my Commander."</li>
                  </ul>
              </div>
              <div className="border-t border-zinc-800 pt-3">
                  <h4 className="text-indigo-400 font-bold uppercase text-xs tracking-wider mb-1">Manual Controls</h4>
                  <p>If the AI misses something, you can manually adjust Life Totals, Phase, and Tap states (Click card).</p>
                  <p><strong>Right Click</strong> (or Long Press) on a card to manually add/remove Status Effects like Flying or Poison.</p>
              </div>
          </div>
      </HelpModal>

      {/* Left: Video Feed Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black border-r-4 border-zinc-900 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
        {cameraError && !audioOnlyMode ? (
            <div className="absolute top-20 z-10 bg-red-950/90 border border-red-500 text-red-200 px-6 py-4 rounded-xl shadow-2xl">
                <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                {cameraError}
            </div>
        ) : null}

        {audioOnlyMode ? (
            <div className="flex flex-col items-center justify-center text-zinc-600">
                <i className="fa-solid fa-microphone-lines text-6xl mb-4 animate-pulse-slow text-indigo-900"></i>
                <p className="font-serif text-indigo-800/50 tracking-widest uppercase">Blind Seer Mode Active</p>
            </div>
        ) : (
            // Video Grid (Local + Remote)
            <div className={`w-full h-full grid ${(activeDeviceIds.length + remoteStreams.length) > 1 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-1 grid-rows-1'} gap-1 bg-zinc-900`}>
                
                {/* Local Cameras */}
                {activeDeviceIds.map((deviceId, index) => (
                    <div key={deviceId} className="relative bg-black flex items-center justify-center overflow-hidden">
                        <video
                            ref={el => {
                                if (el) {
                                    videoRefs.current[index] = el;
                                    if (!el.srcObject) {
                                        navigator.mediaDevices.getUserMedia({ 
                                            video: { deviceId: { exact: deviceId } } 
                                        }).then(stream => { el.srcObject = stream; el.play(); })
                                          .catch(console.error);
                                    }
                                }
                            }}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded">
                            Host Cam {index + 1}
                        </div>
                    </div>
                ))}

                {/* Remote Peer Streams */}
                {remoteStreams.map((peerStream, i) => (
                    <div key={peerStream.peerId} className="relative bg-black flex items-center justify-center overflow-hidden border-2 border-indigo-500/50">
                        <video
                            ref={el => {
                                if (el) {
                                    // Append to the end of the refs array
                                    videoRefs.current[activeDeviceIds.length + i] = el;
                                    el.srcObject = peerStream.stream;
                                    el.play();
                                }
                            }}
                            autoPlay
                            playsInline
                            muted // Mute remote audio to prevent feedback loops in close proximity
                            className="w-full h-full object-cover"
                        />
                         <div className="absolute top-2 left-2 bg-indigo-900/80 text-white text-[10px] px-2 py-1 rounded">
                            Player Cam {i + 1}
                        </div>
                    </div>
                ))}
            </div>
        )}
        
        {/* Overlay UI - Room ID */}
        <div className="absolute top-4 left-4 z-20">
             <div className={`px-4 py-1.5 rounded-sm border-2 text-xs font-serif font-bold uppercase tracking-widest backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center gap-2 ${state.isConnected ? 'bg-indigo-950/80 border-indigo-400 text-indigo-200 shadow-indigo-500/20' : 'bg-red-950/80 border-red-900 text-red-400'}`}>
                {state.isConnected ? '● Linked' : '○ Unlinked'}
                {state.isConnected && isOutputMuted && <span className="text-yellow-400 ml-2"><i className="fa-solid fa-volume-xmark"></i> Muted</span>}
            </div>
            {peerId && (
                <div className="mt-2 bg-zinc-900/90 border border-zinc-600 px-3 py-2 rounded text-zinc-300 text-xs">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">Session Room ID</div>
                    <div className="font-mono text-lg font-bold text-white select-all tracking-wider">{peerId.split('-')[1] || peerId}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">Players can join using this code</div>
                </div>
            )}
        </div>
        
        {/* Overlay UI - Camera Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
            <button 
                onClick={() => setShowHelp(true)}
                className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-600 transition-all flex items-center justify-center shadow-lg"
            >
                <i className="fa-solid fa-question text-xs"></i>
            </button>
            <div className="relative group">
                <button 
                    onClick={() => setShowCameraMenu(!showCameraMenu)}
                    className="bg-black/60 hover:bg-black/80 backdrop-blur text-white px-3 py-2 rounded-lg border border-white/10 flex items-center gap-2 text-xs uppercase tracking-wide"
                >
                     <i className="fa-solid fa-video"></i> {activeDeviceIds.length + remoteStreams.length} View{activeDeviceIds.length + remoteStreams.length !== 1 ? 's' : ''}
                     <i className="fa-solid fa-chevron-down text-[10px]"></i>
                </button>
                
                {showCameraMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-30">
                        <div className="p-2 text-xs text-zinc-500 font-bold uppercase border-b border-zinc-800">
                            Active Feeds ({activeDeviceIds.length + remoteStreams.length})
                        </div>
                        {availableDevices.map(dev => {
                            const isActive = activeDeviceIds.includes(dev.deviceId);
                            return (
                                <button 
                                    key={dev.deviceId}
                                    onClick={() => toggleCamera(dev.deviceId)}
                                    disabled={!isActive && activeDeviceIds.length >= 4}
                                    className={`w-full text-left px-4 py-2 text-xs truncate flex justify-between items-center ${isActive ? 'bg-indigo-900/30 text-indigo-300' : 'text-zinc-400 hover:bg-zinc-800'} ${(!isActive && activeDeviceIds.length >= 4) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span>{dev.label || `Camera ${dev.deviceId.slice(0,5)}...`}</span>
                                    {isActive && <i className="fa-solid fa-check text-indigo-500"></i>}
                                </button>
                            )
                        })}
                         {remoteStreams.length > 0 && (
                            <div className="bg-zinc-950 p-2 border-t border-zinc-800">
                                <div className="text-[10px] text-indigo-400 uppercase font-bold mb-1">Network Feeds</div>
                                {remoteStreams.map((s, i) => (
                                    <div key={s.peerId} className="text-xs text-zinc-400 px-2 py-1">
                                        Remote Player {i+1} (Connected)
                                    </div>
                                ))}
                            </div>
                        )}
                        <button 
                             onClick={() => setAudioOnlyMode(!audioOnlyMode)}
                             className="w-full text-left px-4 py-2 text-xs text-yellow-500 hover:bg-zinc-800 border-t border-zinc-800"
                        >
                            {audioOnlyMode ? "Enable Video" : "Disable Video (Audio Only)"}
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Audio Visualizer */}
        {state.isConnected && !isOutputMuted && (
            <div className="absolute bottom-4 right-4 flex items-end gap-1 h-12 pointer-events-none mix-blend-screen">
                {[...Array(8)].map((_, i) => (
                    <div 
                        key={i} 
                        className="w-2 bg-gradient-to-t from-indigo-600 to-cyan-400 rounded-t-sm transition-all duration-75 shadow-[0_0_10px_#4f46e5]"
                        style={{ height: `${Math.max(10, volume * 150 * (Math.random() + 0.5))}px` }}
                    ></div>
                ))}
            </div>
        )}
      </div>

      {/* Right: Dashboard (Existing) */}
      <div className={`w-full md:w-96 bg-zinc-900 border-l-4 border-zinc-800 flex flex-col h-full shadow-[inset_10px_0_20px_rgba(0,0,0,0.5)] relative transition-all`}>
        {/* Background Texture Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

        {/* Controls Header */}
        <div className="p-4 border-b-2 border-zinc-800 relative z-10 bg-gradient-to-b from-zinc-800 to-zinc-900">
            <button
                onClick={toggleSession}
                className={`w-full py-3 rounded-lg font-serif font-bold text-lg shadow-lg border-2 transition-all transform active:scale-95 flex items-center justify-center gap-3 ${
                    state.isConnected 
                    ? 'bg-red-900 hover:bg-red-800 border-red-500 text-red-100 shadow-red-900/50' 
                    : 'bg-indigo-900 hover:bg-indigo-800 border-indigo-500 text-indigo-100 shadow-indigo-900/50'
                }`}
            >
                {state.isConnected ? (
                    <><i className="fa-solid fa-hand"></i> CEASE LINK</>
                ) : (
                    <><i className="fa-solid fa-link"></i> ESTABLISH LINK</>
                )}
            </button>
            {state.error && <div className="mt-2 text-center text-xs text-red-400 font-serif">{state.error}</div>}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 relative z-10 custom-scrollbar">
            
            {/* Game Setup Panel */}
            <div className="bg-zinc-950 rounded-lg border-2 border-zinc-700 shadow-lg overflow-hidden">
                <div 
                    className="p-3 flex justify-between items-center cursor-pointer bg-zinc-900/50"
                    onClick={() => setShowSetupPanel(!showSetupPanel)}
                >
                    <h3 className="text-zinc-400 text-xs font-serif uppercase tracking-widest font-bold">
                        Game Ritual Setup
                    </h3>
                    <i className={`fa-solid fa-chevron-${showSetupPanel ? 'up' : 'down'} text-zinc-500`}></i>
                </div>
                
                {showSetupPanel && (
                    <div className="p-3 space-y-4 animate-fadeIn border-t border-zinc-800">
                        {/* Format */}
                        <div>
                            <label className="text-xs text-zinc-500 uppercase font-bold block mb-1">Format</label>
                            <select 
                                value={gameFormat}
                                onChange={(e) => setManualFormat(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 outline-none font-serif"
                            >
                                {Object.values(GameFormat).map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </div>

                        {/* Custom Rules */}
                        <div>
                            <label className="text-xs text-zinc-500 uppercase font-bold block mb-1">Custom / House Rules</label>
                            <textarea 
                                value={customRules}
                                onChange={(e) => setManualRules(e.target.value)}
                                placeholder="e.g. No infinite combos, free mulligan..."
                                className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 outline-none font-serif h-16 resize-none"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Player Configuration Panel */}
            <div className={`transition-all duration-300 ${showPlayerConfig && activePlayersList.length === 0 ? 'block' : 'hidden md:block'}`}>
                 <div className="bg-zinc-950 rounded-lg p-3 border-2 border-zinc-700 shadow-lg">
                    <div 
                        className="flex justify-between items-center cursor-pointer mb-2"
                        onClick={() => setShowPlayerConfig(!showPlayerConfig)}
                    >
                        <h3 className="text-zinc-400 text-xs font-serif uppercase tracking-widest font-bold">
                            Planeswalkers ({activePlayersList.length}/8)
                        </h3>
                        <i className={`fa-solid fa-chevron-${showPlayerConfig ? 'up' : 'down'} text-zinc-500`}></i>
                    </div>
                    
                    {showPlayerConfig && (
                        <div className="space-y-3 animate-fadeIn">
                             <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={manualPlayerName}
                                    onChange={(e) => setManualPlayerName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addManualPlayer()}
                                    placeholder="Enter Name..."
                                    className="flex-1 bg-zinc-900 border border-zinc-600 rounded px-3 py-1 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none font-serif"
                                />
                                <button 
                                    onClick={addManualPlayer}
                                    disabled={activePlayersList.length >= 8}
                                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded text-zinc-300 disabled:opacity-50"
                                >
                                    <i className="fa-solid fa-plus"></i>
                                </button>
                             </div>
                             
                             <div className="flex flex-wrap gap-2">
                                {activePlayersList.map(name => (
                                    <div key={name} className="flex items-center gap-2 bg-indigo-900/30 border border-indigo-500/30 rounded px-2 py-1 text-xs text-indigo-200">
                                        {name}
                                        <button onClick={() => removeManualPlayer(name)} className="hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                 </div>
            </div>

            {/* Commander Damage Panel */}
            <div className={`transition-all duration-300 ${sessionPlayers.length > 1 ? 'block' : 'hidden'}`}>
                <div className="bg-zinc-950 rounded-lg p-3 border-2 border-zinc-700 shadow-lg">
                    <div 
                        className="flex justify-between items-center cursor-pointer mb-2"
                        onClick={() => setShowCommanderDamage(!showCommanderDamage)}
                    >
                        <h3 className="text-zinc-400 text-xs font-serif uppercase tracking-widest font-bold">
                            Commander Damage
                        </h3>
                        <i className={`fa-solid fa-chevron-${showCommanderDamage ? 'up' : 'down'} text-zinc-500`}></i>
                    </div>
                    
                    {showCommanderDamage && (
                        <div className="space-y-4 animate-fadeIn overflow-y-auto max-h-60 custom-scrollbar pr-1">
                            {sessionPlayers.map(victim => (
                                <div key={victim.name} className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                                    <div className="text-xs font-bold text-zinc-300 mb-2 flex justify-between">
                                        <span>{victim.name} (Takes Dmg)</span>
                                        {getLethalSources(victim.name).length > 0 && <span className="text-red-500 animate-pulse"><i className="fa-solid fa-skull"></i> Lethal</span>}
                                    </div>
                                    <div className="space-y-1">
                                        {sessionPlayers.filter(p => p.name !== victim.name).map(attacker => {
                                            const dmg = commanderDamage[victim.name]?.[attacker.name] || 0;
                                            return (
                                                <div key={attacker.name} className="flex justify-between items-center text-xs">
                                                    <span className="text-zinc-500 w-24 truncate">vs {attacker.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => adjustCommanderDamage(victim.name, attacker.name, -1)} className="w-5 h-5 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400">-</button>
                                                        <span className={`w-6 text-center font-mono font-bold ${dmg >= 21 ? 'text-red-500' : 'text-zinc-200'}`}>{dmg}</span>
                                                        <button onClick={() => adjustCommanderDamage(victim.name, attacker.name, 1)} className="w-5 h-5 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400">+</button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Game State Cards */}
            <div className="space-y-4">
                {sessionPlayers.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600 font-serif italic border-2 border-dashed border-zinc-800 rounded-lg">
                        "Summon the players to begin..."
                    </div>
                ) : (
                    sessionPlayers.map((player) => {
                        const lethalSources = getLethalSources(player.name);
                        const isLethal = lethalSources.length > 0;
                        
                        return (
                        <div key={player.id} className={`bg-zinc-900 rounded-xl overflow-hidden border-2 ${isLethal ? 'border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'border-[#b8860b] shadow-[0_0_15px_rgba(184,134,11,0.1)]'} relative group transition-all duration-300`}>
                             {/* Card Header */}
                            <div className="bg-gradient-to-r from-zinc-800 via-[#3d3318] to-zinc-800 p-2 border-b border-[#b8860b] flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="font-serif font-bold text-[#eecfa1] tracking-wide text-sm drop-shadow-md">
                                        {player.name}
                                    </div>
                                    {isLethal && <i className="fa-solid fa-skull text-red-500 text-xs animate-pulse" title="Lethal Commander Damage"></i>}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => adjustLife(player.name, -1)} className="w-6 h-6 rounded flex items-center justify-center bg-black/40 hover:bg-red-900/80 text-[#eecfa1] border border-[#b8860b]/30">-</button>
                                    <span className="font-mono font-bold text-xl w-10 text-center text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{currentLife[player.name] || 40}</span>
                                    <button onClick={() => adjustLife(player.name, 1)} className="w-6 h-6 rounded flex items-center justify-center bg-black/40 hover:bg-green-900/80 text-[#eecfa1] border border-[#b8860b]/30">+</button>
                                </div>
                            </div>

                            {/* Card Content (Battlefield) */}
                            <div className="p-3 bg-zinc-950/80 min-h-[100px]">
                                <div className="text-[10px] uppercase text-[#8a7e66] font-bold mb-2 tracking-widest border-b border-[#8a7e66]/30 pb-1">
                                    Battlefield
                                </div>
                                <div className="flex flex-wrap gap-4 px-2 py-2">
                                    {battlefield[player.name]?.length > 0 ? (
                                        battlefield[player.name].map((card) => (
                                            <div key={card.instanceId} className="relative group/card">
                                                <div 
                                                    onClick={() => toggleCardTap(player.name, card.instanceId)}
                                                    onContextMenu={(e) => handleRightClickCard(e, player.name, card.instanceId, card.name)}
                                                    className={`w-16 h-24 bg-black rounded border border-zinc-600 cursor-pointer relative transition-transform duration-200 ease-out hover:scale-105 hover:shadow-[0_0_15px_rgba(167,139,250,0.5)] hover:z-20 ${card.tapped ? 'rotate-90 brightness-75 border-zinc-500' : ''}`}
                                                >
                                                    {card.image_uri ? (
                                                        <img src={card.image_uri} alt={card.name} className="w-full h-full object-cover rounded-[3px]" />
                                                    ) : (
                                                        <div className="p-1 text-[8px] text-center text-zinc-300 leading-tight flex items-center justify-center h-full">{card.name}</div>
                                                    )}
                                                </div>

                                                {/* Status Icons Overlay */}
                                                <div className="absolute -top-2 -right-2 flex flex-col gap-1 z-20 pointer-events-none scale-75 origin-top-right">
                                                    {card.statuses?.map((status) => (
                                                        <div key={status.id} className={`${status.color} rounded-full w-5 h-5 flex items-center justify-center shadow-md border border-white/20`} title={status.label}>
                                                            <i className={`fa-solid ${status.icon} text-[10px]`}></i>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="w-full text-center text-zinc-700 text-xs italic py-4">No permanents detected</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )})
                )}
            </div>

            {/* Phase Tracker */}
            <div className="bg-zinc-900 rounded-lg p-3 border-2 border-zinc-700">
                <h3 className="text-zinc-400 text-xs font-serif uppercase tracking-widest font-bold mb-2">Turn Phase</h3>
                <div className="grid grid-cols-2 gap-1">
                    {Object.values(GamePhase).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPhase(p)}
                            className={`text-[10px] py-1.5 px-2 rounded border transition-all font-serif uppercase tracking-wider ${
                                phase === p 
                                ? 'bg-[#3d3318] border-[#b8860b] text-[#eecfa1] shadow-[0_0_10px_rgba(184,134,11,0.2)]' 
                                : 'bg-black/40 border-zinc-800 text-zinc-600 hover:text-zinc-400'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>
            
        </div>
      </div>

      {/* Manual Status Edit Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEditingCard(null)}>
            <div className="bg-zinc-900 border border-zinc-600 p-5 rounded-xl shadow-2xl max-w-sm w-full animate-fadeIn" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4 border-b border-zinc-700 pb-2">
                    <div>
                        <h3 className="text-white font-serif font-bold text-lg">{editingCard.cardName}</h3>
                        <p className="text-zinc-400 text-xs uppercase tracking-wide">Edit Status Effects</p>
                    </div>
                    <button onClick={() => setEditingCard(null)} className="text-zinc-500 hover:text-white">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <div className="mb-4">
                    <h4 className="text-xs text-zinc-500 uppercase font-bold mb-2">Active Statuses</h4>
                    <div className="flex flex-wrap gap-2">
                        {battlefield[editingCard.player]?.find(c => c.instanceId === editingCard.cardId)?.statuses.length === 0 && (
                            <span className="text-zinc-600 text-xs italic">No active statuses.</span>
                        )}
                        {battlefield[editingCard.player]?.find(c => c.instanceId === editingCard.cardId)?.statuses.map(s => (
                             <button 
                                key={s.id} 
                                onClick={() => manualUpdateStatus(editingCard.player, editingCard.cardId, s.label, 'remove')}
                                className={`${s.color} px-2 py-1 rounded text-xs font-bold flex items-center gap-1 hover:brightness-110`}
                             >
                                <i className={`fa-solid ${s.icon}`}></i> {s.label} <i className="fa-solid fa-xmark ml-1 opacity-50"></i>
                             </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="text-xs text-zinc-500 uppercase font-bold mb-2">Add Status</h4>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {AVAILABLE_STATUSES.map(status => (
                            <button
                                key={status}
                                onClick={() => manualUpdateStatus(editingCard.player, editingCard.cardId, status, 'add')}
                                className="text-left px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded border border-zinc-700 hover:border-indigo-500 transition-colors truncate"
                            >
                                <i className="fa-solid fa-plus text-[10px] mr-1 text-indigo-400"></i> {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};