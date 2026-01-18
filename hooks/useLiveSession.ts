import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { db } from '../database';
import { PlayerProfile, BattlefieldCard, GameFormat, CardStatus, PeerStream } from '../types';

// Types for internal audio management
interface AudioState {
    isConnected: boolean;
    isStreaming: boolean;
    error: string | null;
}

// --- HELPER: ICON MAPPING ---
const getStatusVisuals = (statusText: string): { icon: string, color: string } => {
    const text = statusText.toLowerCase();

    if (text.includes('counter') && text.includes('+')) return { icon: 'fa-arrow-up', color: 'bg-green-600 text-white' };
    if (text.includes('counter') && text.includes('-')) return { icon: 'fa-arrow-down', color: 'bg-red-600 text-white' };
    if (text.includes('hexproof')) return { icon: 'fa-shield-halved', color: 'bg-cyan-600 text-white' };
    if (text.includes('indestructible')) return { icon: 'fa-shield', color: 'bg-yellow-600 text-black' };
    if (text.includes('flying')) return { icon: 'fa-feather', color: 'bg-sky-500 text-white' };
    if (text.includes('trample')) return { icon: 'fa-shoe-prints', color: 'bg-orange-600 text-white' };
    if (text.includes('haste')) return { icon: 'fa-bolt', color: 'bg-red-500 text-white' };
    if (text.includes('vigilance')) return { icon: 'fa-eye', color: 'bg-white text-black' };
    if (text.includes('deathtouch')) return { icon: 'fa-skull', color: 'bg-purple-600 text-white' };
    if (text.includes('lifelink')) return { icon: 'fa-heart', color: 'bg-pink-600 text-white' };
    if (text.includes('stun')) return { icon: 'fa-snowflake', color: 'bg-blue-400 text-white' };
    if (text.includes('summoning sick')) return { icon: 'fa-dizzy', color: 'bg-green-800 text-white' };
    if (text.includes('goaded')) return { icon: 'fa-bullhorn', color: 'bg-red-700 text-white' };

    return { icon: 'fa-circle-info', color: 'bg-zinc-700 text-white' };
};

// --- TOOL DEFINITIONS ---

const registerPlayersTool: FunctionDeclaration = {
    name: 'register_players',
    description: 'Registers the names of the players for the current game session after the user has listed them.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            playerNames: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of player names spoken by the user."
            }
        },
        required: ['playerNames']
    }
};

const setFormatTool: FunctionDeclaration = {
    name: 'set_game_format',
    description: 'Sets the Magic: The Gathering format for the session (e.g. Commander, Standard).',
    parameters: {
        type: Type.OBJECT,
        properties: {
            format: {
                type: Type.STRING,
                description: "The format name (e.g., Commander, Standard, Modern)."
            }
        },
        required: ['format']
    }
};

const setCustomRulesTool: FunctionDeclaration = {
    name: 'set_custom_rules',
    description: 'Records any custom rules or house rules the players are using.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            rules: { type: Type.STRING, description: "The description of the custom rules." }
        },
        required: ['rules']
    }
};

const getStatsTool: FunctionDeclaration = {
    name: 'get_player_stats',
    description: 'Retrieves the win/loss history between two players.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            player1: { type: Type.STRING },
            player2: { type: Type.STRING },
            mode: {
                type: Type.STRING,
                enum: ['total', 'one_on_one'],
                description: "Whether to return total wins in all games or only 1v1 head-to-head records."
            }
        },
        required: ['player1', 'player2', 'mode']
    }
};

const recordWinTool: FunctionDeclaration = {
    name: 'record_win',
    description: 'Records the winner of the current game.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            winnerName: { type: Type.STRING },
        },
        required: ['winnerName']
    }
};

const manageBoardTool: FunctionDeclaration = {
    name: 'manage_board',
    description: 'Updates the virtual board state when cards are played, removed, or change status (tapped, counters, etc).',
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ['play', 'remove', 'update_status'] },
            cardName: { type: Type.STRING, description: "The name of the card to modify." },
            playerName: { type: Type.STRING, description: "The player who controls the card." },
            status: { type: Type.STRING, description: "The status/effect name (e.g. 'tapped', 'hexproof', '+1/+1 counter'). Required if action is update_status." },
            statusOperation: { type: Type.STRING, enum: ['add', 'remove'], description: "Whether to add or remove the status. Defaults to add." }
        },
        required: ['action', 'cardName', 'playerName']
    }
};

export const useLiveSession = (videoRefs: React.MutableRefObject<HTMLVideoElement[]>, remoteStreams: PeerStream[] = []) => {
    const [state, setState] = useState<AudioState>({
        isConnected: false,
        isStreaming: false,
        error: null,
    });

    const [volume, setVolume] = useState(0);
    const [sessionPlayers, setSessionPlayers] = useState<PlayerProfile[]>([]);
    const [battlefield, setBattlefield] = useState<Record<string, BattlefieldCard[]>>({});
    const [isOutputMuted, setIsOutputMuted] = useState(false);

    // Game Configuration State
    const [gameFormat, setGameFormatState] = useState<GameFormat | string>('Commander');
    const [customRules, setCustomRulesState] = useState<string>('');

    // Refs
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);

    // Audio Graph Refs
    const inputMixerRef = useRef<GainNode | null>(null);
    const remoteSourcesMapRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());

    const frameIntervalRef = useRef<number | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    const currentSessionRef = useRef<any>(null);

    // Stream tracking
    const inputStreamsRef = useRef<MediaStream[]>([]);

    const sessionPlayersRef = useRef<PlayerProfile[]>([]);

    // Need to track mute state in ref for callback access without closure staleness
    const isOutputMutedRef = useRef(false);
    useEffect(() => { isOutputMutedRef.current = isOutputMuted; }, [isOutputMuted]);

    // Helpers
    const decode = (base64: string) => {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        return bytes;
    };

    const encode = (bytes: Uint8Array) => {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    };

    const createBlob = (data: Float32Array) => {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
        }
        return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
    };

    const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }
        return buffer;
    };

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // --- DYNAMIC AUDIO MIXING FOR REMOTE STREAMS ---
    useEffect(() => {
        if (!state.isConnected || !inputAudioContextRef.current || !inputMixerRef.current) return;

        const ctx = inputAudioContextRef.current;
        const mixer = inputMixerRef.current;
        const activeIds = new Set(remoteStreams.map(s => s.peerId));

        // Add new streams
        remoteStreams.forEach(rs => {
            if (!remoteSourcesMapRef.current.has(rs.peerId)) {
                // Check if stream has audio tracks
                if (rs.stream.getAudioTracks().length > 0) {
                    try {
                        console.log(`Adding audio source for peer ${rs.peerId}`);
                        const source = ctx.createMediaStreamSource(rs.stream);
                        source.connect(mixer);
                        remoteSourcesMapRef.current.set(rs.peerId, source);
                    } catch (e) {
                        console.warn(`Could not add audio for peer ${rs.peerId}`, e);
                    }
                }
            }
        });

        // Remove old streams
        remoteSourcesMapRef.current.forEach((source, peerId) => {
            if (!activeIds.has(peerId)) {
                console.log(`Removing audio source for peer ${peerId}`);
                try {
                    source.disconnect();
                } catch (e) { }
                remoteSourcesMapRef.current.delete(peerId);
            }
        });

    }, [remoteStreams, state.isConnected]);

    // --- MANUAL STATE UPDATERS ---

    const setManualPlayers = async (names: string[]) => {
        const profiles = await db.registerSessionPlayers(names);
        sessionPlayersRef.current = profiles;
        setSessionPlayers(profiles);

        const initialBoard: Record<string, BattlefieldCard[]> = {};
        profiles.forEach(p => initialBoard[p.name] = []);
        setBattlefield(initialBoard);

        // Inform AI if connected
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                try {
                    session.sendRealtimeInput({
                        content: {
                            parts: [{ text: `SYSTEM UPDATE: The active players are now: ${names.join(", ")}.` }]
                        }
                    });
                } catch (e) { console.warn(e); }
            });
        }
    };

    const setManualFormat = (format: string) => {
        setGameFormatState(format);
        db.saveGameSettings({ format: format as any, customRules });
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                try {
                    session.sendRealtimeInput({
                        content: { parts: [{ text: `SYSTEM UPDATE: The Game Format is now set to ${format}. Skip asking for format.` }] }
                    });
                } catch (e) { console.warn(e); }
            });
        }
    };

    const setManualRules = (rules: string) => {
        setCustomRulesState(rules);
        db.saveGameSettings({ format: gameFormat as any, customRules: rules });
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                try {
                    session.sendRealtimeInput({
                        content: { parts: [{ text: `SYSTEM UPDATE: Custom Rules have been updated to: ${rules}. Skip asking for rules.` }] }
                    });
                } catch (e) { console.warn(e); }
            });
        }
    };

    const toggleCardTap = useCallback((playerName: string, instanceId: string) => {
        setBattlefield(prev => {
            const playerBoard = [...(prev[playerName] || [])];
            const index = playerBoard.findIndex(c => c.instanceId === instanceId);

            if (index > -1) {
                const card = { ...playerBoard[index] };
                card.tapped = !card.tapped; // Toggle tap state
                playerBoard[index] = card;

                // Notify AI of manual change so it stays in loop
                if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then(session => {
                        try {
                            session.sendRealtimeInput({
                                content: {
                                    parts: [{ text: `SYSTEM UPDATE: ${playerName} manually ${card.tapped ? 'tapped' : 'untapped'} ${card.name}.` }]
                                }
                            });
                        } catch (e) { console.warn(e); }
                    });
                }

                return { ...prev, [playerName]: playerBoard };
            }
            return prev;
        });
    }, []);

    const manualUpdateStatus = useCallback((playerName: string, instanceId: string, status: string, operation: 'add' | 'remove') => {
        setBattlefield(prev => {
            const playerBoard = [...(prev[playerName] || [])];
            const index = playerBoard.findIndex(c => c.instanceId === instanceId);

            if (index > -1) {
                const card = { ...playerBoard[index] };

                if (operation === 'add') {
                    if (!card.statuses.some(s => s.label === status)) {
                        const visuals = getStatusVisuals(status);
                        card.statuses = [...card.statuses, {
                            id: crypto.randomUUID(),
                            label: status,
                            icon: visuals.icon,
                            color: visuals.color
                        }];
                    }
                } else {
                    card.statuses = card.statuses.filter(s => s.label !== status);
                }

                playerBoard[index] = card;

                // Notify AI
                if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then(session => {
                        try {
                            session.sendRealtimeInput({
                                content: {
                                    parts: [{ text: `SYSTEM UPDATE: ${playerName} manually ${operation}ed status '${status}' on ${card.name}.` }]
                                }
                            });
                        } catch (e) { console.warn(e); }
                    });
                }

                return { ...prev, [playerName]: playerBoard };
            }
            return prev;
        });
    }, []);

    const connect = useCallback(async () => {
        try {
            // Check if API key is configured
            if (!process.env.API_KEY) {
                throw new Error("AI features require a Gemini API key. Configure it in Settings to enable the Announcer.");
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            inputAudioContextRef.current = inputCtx;
            outputAudioContextRef.current = outputCtx;

            // Get audio stream for microphone
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            inputStreamsRef.current.push(audioStream);

            // Create Mixer for Input (Local Mic + Remote Peers)
            const inputMixer = inputCtx.createGain();
            inputMixerRef.current = inputMixer;

            // Connect Local Mic
            const localSource = inputCtx.createMediaStreamSource(audioStream);
            localSource.connect(inputMixer);

            // Setup Script Processor to pull from Mixer
            // Note: We use 1 channel for Gemini
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            inputMixer.connect(scriptProcessor);

            scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);

                // Visualize Volume from Mixed Input
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                setVolume(Math.sqrt(sum / inputData.length));

                const pcmBlob = createBlob(inputData);
                if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then((session) => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                }
            };

            scriptProcessor.connect(inputCtx.destination);
            const outputNode = outputCtx.createGain();
            outputNode.connect(outputCtx.destination);

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
                    },
                    tools: [
                        { functionDeclarations: [registerPlayersTool, setFormatTool, setCustomRulesTool, getStatsTool, recordWinTool, manageBoardTool] }
                    ],
                    systemInstruction: `
            You are "The Announcer", an elite esports commentator and Level 3 Judge for Magic: The Gathering.
            
            **INITIALIZATION PROTOCOL (Follow strictly in order):**
            1. **Intro**: Introduce yourself energetically.
            2. **Players**: Ask for player names. (Wait for user or tool execution).
            3. **Format**: Ask what format they are playing (Standard, Commander, etc.). (If user says "I'll enter it", stop asking and wait for system update).
            4. **Custom Rules**: Ask if there are any custom rules/house rules. (If user says "I'll enter it", stop asking and wait for system update).
            
            **GAMEPLAY MANDATES (Level 3 Judge Mode):**
            1. **Visual Vigilance**: You have a video feed (possibly multiple cameras stitched together). You must identify cards played.
            2. **Mandatory Action Enforcement**:
               - When you identify a card via \`manage_board\`, READ its oracle text internally.
               - If it has a **Static Ability** (e.g. "Creatures enter tapped", "Players play with top card revealed"), you must MONITOR the board to ensure players comply.
               - If it has a **Triggered Ability** (e.g. "At the beginning of upkeep, sacrifice a creature"), you must ANNOUNCE it at the correct phase.
               - If a player misses a mandatory action (e.g. failing to discard), CALL IT OUT IMMEDIATELY: "Judge! [Player] needs to discard 2 cards due to [Card Name]!"
            3. **Status Tracking**:
               - Call \`manage_board(action='update_status', ...)\` when cards are tapped, get +1/+1 counters, become hexproof, etc.
               - Track these statuses meticulously.
            
            **BEHAVIOR:**
            - Professional, energetic, accurate.
            - Do not hallucinate rules. If unsure, ask: "I see a card that looks like [Name], is that correct?"
          `,
                },
                callbacks: {
                    onopen: () => {
                        console.log("Session Opened");
                        setState(prev => ({ ...prev, isConnected: true, isStreaming: true }));

                        // Video Processing Logic (Multi-Camera Stitching)
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        frameIntervalRef.current = window.setInterval(() => {
                            if (!ctx) return;

                            // Filter active videos
                            const activeVideos = videoRefs.current.filter(v => v && v.readyState === 4 && !v.paused);

                            if (activeVideos.length > 0) {
                                // Determine Grid Logic
                                const count = activeVideos.length;
                                const baseW = 1920;
                                const baseH = 1080;

                                canvas.width = baseW;
                                canvas.height = baseH;

                                // Clear
                                ctx.fillStyle = "#000";
                                ctx.fillRect(0, 0, baseW, baseH);

                                if (count === 1) {
                                    ctx.drawImage(activeVideos[0], 0, 0, baseW, baseH);
                                } else {
                                    // Grid Draw - Simple 2x2
                                    // Top Left
                                    if (activeVideos[0]) ctx.drawImage(activeVideos[0], 0, 0, baseW / 2, baseH / 2);
                                    // Top Right
                                    if (activeVideos[1]) ctx.drawImage(activeVideos[1], baseW / 2, 0, baseW / 2, baseH / 2);
                                    // Bottom Left
                                    if (activeVideos[2]) ctx.drawImage(activeVideos[2], 0, baseH / 2, baseW / 2, baseH / 2);
                                    // Bottom Right
                                    if (activeVideos[3]) ctx.drawImage(activeVideos[3], baseW / 2, baseH / 2, baseW / 2, baseH / 2);
                                }

                                // Send Frame
                                canvas.toBlob(async (blob) => {
                                    if (blob && sessionPromiseRef.current) {
                                        const base64Data = await blobToBase64(blob);
                                        sessionPromiseRef.current!.then((session) => {
                                            session.sendRealtimeInput({
                                                media: { data: base64Data, mimeType: 'image/jpeg' }
                                            });
                                        });
                                    }
                                }, 'image/jpeg', 0.6);
                            }
                        }, 1000);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // --- HANDLE TOOL CALLS ---
                        if (message.toolCall) {
                            const responses = [];
                            for (const fc of message.toolCall.functionCalls) {
                                let result: any = { error: "Unknown tool" };

                                if (fc.name === 'register_players') {
                                    const names = (fc.args as any).playerNames;
                                    const profiles = await db.registerSessionPlayers(names);
                                    sessionPlayersRef.current = profiles;
                                    setSessionPlayers(profiles);
                                    const initialBoard: Record<string, BattlefieldCard[]> = {};
                                    profiles.forEach(p => initialBoard[p.name] = []);
                                    setBattlefield(initialBoard);
                                    result = { success: true, registeredCount: profiles.length };
                                }
                                else if (fc.name === 'set_game_format') {
                                    const { format } = fc.args as any;
                                    setGameFormatState(format);
                                    await db.saveGameSettings({ format: format, customRules: customRules });
                                    result = { success: true, formatSetTo: format };
                                }
                                else if (fc.name === 'set_custom_rules') {
                                    const { rules } = fc.args as any;
                                    setCustomRulesState(rules);
                                    await db.saveGameSettings({ format: gameFormat as any, customRules: rules });
                                    result = { success: true, rulesRecorded: true };
                                }
                                else if (fc.name === 'manage_board') {
                                    const { action, cardName, playerName, status, statusOperation } = fc.args as any;
                                    const card = await db.getCardByName(cardName);

                                    // Handle board modifications
                                    setBattlefield(prev => {
                                        const playerBoard = [...(prev[playerName] || [])];

                                        if (action === 'play' && card) {
                                            const newCard: BattlefieldCard = {
                                                instanceId: crypto.randomUUID(),
                                                oracle_id: card.oracle_id,
                                                name: card.name,
                                                type_line: card.type_line,
                                                image_uri: card.image_uris?.small || card.image_uris?.normal,
                                                controller: playerName,
                                                tapped: false,
                                                oracle_text: card.oracle_text,
                                                statuses: []
                                            };
                                            return { ...prev, [playerName]: [...playerBoard, newCard] };
                                        }
                                        else if (action === 'remove') {
                                            const index = playerBoard.findIndex(c => c.name.toLowerCase() === cardName.toLowerCase());
                                            if (index > -1) {
                                                playerBoard.splice(index, 1);
                                                return { ...prev, [playerName]: playerBoard };
                                            }
                                        }
                                        else if (action === 'update_status' && status) {
                                            const index = playerBoard.findIndex(c => c.name.toLowerCase() === cardName.toLowerCase());
                                            if (index > -1) {
                                                const targetCard = { ...playerBoard[index] };
                                                const op = statusOperation || 'add';
                                                const lowerStatus = status.toLowerCase();

                                                // Special Case: Tapping
                                                if (lowerStatus.includes('tap') || lowerStatus.includes('untap')) {
                                                    targetCard.tapped = lowerStatus.includes('untap') ? false : true;
                                                }
                                                else {
                                                    // General Icons/Badges
                                                    if (op === 'add') {
                                                        if (!targetCard.statuses.some(s => s.label === status)) {
                                                            const visuals = getStatusVisuals(status);
                                                            targetCard.statuses = [...targetCard.statuses, {
                                                                id: crypto.randomUUID(),
                                                                label: status,
                                                                icon: visuals.icon,
                                                                color: visuals.color
                                                            }];
                                                        }
                                                    } else {
                                                        targetCard.statuses = targetCard.statuses.filter(s => s.label !== status);
                                                    }
                                                }
                                                playerBoard[index] = targetCard;
                                                return { ...prev, [playerName]: playerBoard };
                                            }
                                        }
                                        return prev;
                                    });

                                    result = { success: true, message: `Action ${action} performed on ${cardName}` };
                                }
                                else if (fc.name === 'get_player_stats') {
                                    const { player1, player2, mode } = fc.args as any;
                                    const stats = await db.getPlayerStats(player1, player2);
                                    if (!stats) {
                                        result = { error: "Players not found in history." };
                                    } else {
                                        if (mode === 'one_on_one') {
                                            result = {
                                                text: `In 1v1 games, ${stats.p1Name} has won ${stats.p1Wins1v1} times and ${stats.p2Name} has won ${stats.p2Wins1v1} times.`
                                            };
                                        } else {
                                            result = {
                                                text: `Overall against anyone, ${stats.p1Name} has ${stats.p1WinsTotal} wins and ${stats.p2Name} has ${stats.p2WinsTotal} wins in games they played together.`
                                            };
                                        }
                                    }
                                }
                                else if (fc.name === 'record_win') {
                                    const winnerName = (fc.args as any).winnerName;
                                    const currentPlayers = sessionPlayersRef.current;
                                    const winner = currentPlayers.find(p => p.name.toLowerCase() === winnerName.toLowerCase());

                                    if (winner) {
                                        const loserNames = currentPlayers
                                            .filter(p => p.id !== winner.id)
                                            .map(p => p.name);
                                        const type = currentPlayers.length === 2 ? '1v1' : 'multiplayer';
                                        await db.recordMatchResult(winner.name, loserNames, type);
                                        result = { success: true, saved: true };
                                    } else {
                                        result = { error: "Winner not found in current session players." };
                                    }
                                }

                                responses.push({
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result }
                                });
                            }

                            if (sessionPromiseRef.current) {
                                sessionPromiseRef.current.then(session => {
                                    session.sendToolResponse({ functionResponses: responses });
                                });
                            }
                        }

                        // --- HANDLE AUDIO OUTPUT ---
                        // Only play if not muted
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {

                            if (!isOutputMutedRef.current) {
                                const ctx = outputAudioContextRef.current;
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                                const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                                const source = ctx.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputAudioContextRef.current.destination);
                                source.addEventListener('ended', () => { sourcesRef.current.delete(source); });
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                sourcesRef.current.add(source);
                            }
                        }

                        if (message.serverContent?.interrupted) {
                            sourcesRef.current.forEach(src => src.stop());
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onclose: () => setState(prev => ({ ...prev, isConnected: false, isStreaming: false })),
                    onerror: (e) => setState(prev => ({ ...prev, error: "Connection Error" }))
                }
            });
            sessionPromiseRef.current = sessionPromise;
            sessionPromise.then(sess => currentSessionRef.current = sess);

        } catch (err: any) {
            console.error(err);
            setState(prev => ({ ...prev, error: err.message || "Failed to connect" }));
        }
    }, [videoRefs, gameFormat, customRules]);

    const disconnect = useCallback(() => {
        if (currentSessionRef.current) currentSessionRef.current.close();
        if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
        if (inputAudioContextRef.current) inputAudioContextRef.current.close();
        if (outputAudioContextRef.current) outputAudioContextRef.current.close();

        // Stop tracked streams
        inputStreamsRef.current.forEach(stream => stream.getTracks().forEach(t => t.stop()));
        inputStreamsRef.current = [];

        // Disconnect remote mixers
        remoteSourcesMapRef.current.forEach(source => source.disconnect());
        remoteSourcesMapRef.current.clear();

        sourcesRef.current.forEach(src => src.stop());
        sourcesRef.current.clear();
        setState({ isConnected: false, isStreaming: false, error: null });
        setSessionPlayers([]);
        sessionPlayersRef.current = [];
        setBattlefield({});
    }, []);

    return {
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
    };
};