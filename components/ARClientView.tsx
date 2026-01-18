import React, { useEffect, useRef, useState } from 'react';
import { usePeerNetwork } from '../hooks/usePeerNetwork';
import { GamePhase, BattlefieldCard } from '../types';
import { HelpModal } from './HelpModal';

interface ARClientViewProps {
    roomId: string;
    onBack: () => void;
}

export const ARClientView: React.FC<ARClientViewProps> = ({ roomId, onBack }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isTalking, setIsTalking] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    
    // Initialize stream immediately
    useEffect(() => {
        const startStream = async () => {
            try {
                // Ensure audio is requested but tracks are disabled initially for mute
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment", width: { ideal: 1280 } },
                    audio: true 
                });
                
                // Mute audio tracks by default
                stream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                });

                setLocalStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.muted = true; // Local playback muted to prevent echo
                }
            } catch (e) {
                console.error("Failed to access camera", e);
            }
        };
        startStream();
        return () => {
            if (localStream) localStream.getTracks().forEach(t => t.stop());
        }
    }, []);

    const { isConnected, incomingData, error } = usePeerNetwork({
        role: 'client',
        roomId: roomId,
        localStream: localStream
    });

    const handlePushToTalkStart = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = true);
            setIsTalking(true);
        }
    };

    const handlePushToTalkEnd = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = false);
            setIsTalking(false);
        }
    };

    const gameState = incomingData?.type === 'GAME_STATE' ? incomingData.payload : null;

    return (
        <div className="h-full w-full bg-black relative overflow-hidden">
             {/* Help Modal */}
            <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Player HUD Instructions">
                <div className="space-y-4">
                    <div>
                        <h4 className="text-green-400 font-bold uppercase text-xs tracking-wider mb-1">Game Connection</h4>
                        <p>You are connected to the Host's game session. Your camera feed is being sent to the AI Announcer so it can see your board.</p>
                    </div>
                    <div className="border-t border-zinc-800 pt-3">
                        <h4 className="text-indigo-400 font-bold uppercase text-xs tracking-wider mb-1">Push to Talk</h4>
                        <p>The Announcer cannot hear you by default.</p>
                        <p><strong>Press and Hold</strong> the large microphone button at the bottom to open your mic. Release to mute.</p>
                        <p>Use this to announce your plays: "I play a Mountain", "I tap my Elves for mana".</p>
                    </div>
                    <div className="border-t border-zinc-800 pt-3">
                        <h4 className="text-cyan-400 font-bold uppercase text-xs tracking-wider mb-1">HUD Data</h4>
                        <p>The overlay displays real-time data from the Announcer, including Life Totals, Phase, and Card Statuses (counters, tapped/untapped).</p>
                    </div>
                </div>
            </HelpModal>

            {/* Background Camera Feed */}
            <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover"
            />
            
            {/* AR Overlay - Data Layer */}
            <div className="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between">
                
                {/* Top Status Bar */}
                <div className="flex justify-between items-start">
                    <button onClick={onBack} className="pointer-events-auto bg-black/50 text-white px-3 py-1 rounded backdrop-blur flex items-center gap-2">
                        <i className="fa-solid fa-chevron-left"></i> Leave
                    </button>
                    
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setShowHelp(true)}
                            className="pointer-events-auto w-8 h-8 rounded-full bg-black/50 text-white backdrop-blur flex items-center justify-center border border-white/20"
                        >
                            <i className="fa-solid fa-question text-xs"></i>
                        </button>
                        <div className={`px-4 py-2 rounded-lg backdrop-blur-md border ${isConnected ? 'bg-indigo-900/60 border-indigo-400' : 'bg-red-900/60 border-red-400'} text-white text-xs font-bold uppercase tracking-widest`}>
                            {isConnected ? `Connected to ${roomId}` : error || 'Connecting...'}
                        </div>
                    </div>
                </div>

                {/* Game Info Overlay */}
                {gameState ? (
                    <div className="space-y-4">
                        {/* Phase Indicator */}
                        <div className="self-center bg-black/60 text-white text-center py-2 rounded-lg border border-white/20 backdrop-blur-sm">
                            <div className="text-[10px] text-zinc-400 uppercase tracking-widest">Current Phase</div>
                            <div className="text-xl font-serif font-bold text-[#eecfa1]">{gameState.phase}</div>
                        </div>

                        {/* Players HUD */}
                        <div className="grid grid-cols-2 gap-2">
                             {gameState.players.map(p => {
                                 const life = gameState.currentLife[p.name];
                                 const cards = gameState.battlefield[p.name] || [];
                                 
                                 return (
                                     <div key={p.name} className="bg-zinc-900/80 p-2 rounded border-l-4 border-indigo-500 backdrop-blur-sm">
                                         <div className="flex justify-between items-center mb-1">
                                             <span className="font-bold text-white text-sm shadow-black drop-shadow-md">{p.name}</span>
                                             <span className="font-mono text-xl text-green-400 font-bold">{life}</span>
                                         </div>
                                         
                                         {/* Card Icons / Summary */}
                                         <div className="flex flex-wrap gap-1">
                                             {cards.map(c => (
                                                 <div key={c.instanceId} className="relative">
                                                     <div className={`w-6 h-8 bg-zinc-700 rounded border border-zinc-500 ${c.tapped ? 'opacity-50' : ''}`}>
                                                         {/* Tiny representation */}
                                                     </div>
                                                     {c.statuses.length > 0 && (
                                                         <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] text-black font-bold">
                                                             {c.statuses.length}
                                                         </div>
                                                     )}
                                                 </div>
                                             ))}
                                             {cards.length === 0 && <span className="text-[10px] text-zinc-500 italic">Empty board</span>}
                                         </div>
                                     </div>
                                 )
                             })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-white/50 text-sm animate-pulse mt-10">
                        Waiting for game data from host...
                    </div>
                )}
            </div>
            
            {/* Action Bar / Push to Talk */}
            <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center pointer-events-auto">
                 <button 
                     onPointerDown={handlePushToTalkStart}
                     onPointerUp={handlePushToTalkEnd}
                     onPointerLeave={handlePushToTalkEnd}
                     className={`w-20 h-20 rounded-full border-4 shadow-2xl transition-all transform active:scale-95 flex items-center justify-center ${
                         isTalking 
                         ? 'bg-red-600 border-red-400 scale-110 shadow-red-500/50' 
                         : 'bg-zinc-800/80 border-zinc-500 backdrop-blur-sm'
                     }`}
                 >
                     <i className={`fa-solid fa-microphone text-2xl ${isTalking ? 'text-white animate-pulse' : 'text-zinc-400'}`}></i>
                 </button>
                 <div className="absolute -bottom-6 text-[10px] text-white/70 font-bold uppercase tracking-widest pointer-events-none">
                     {isTalking ? 'Transmitting...' : 'Hold to Announce'}
                 </div>
            </div>
        </div>
    );
};