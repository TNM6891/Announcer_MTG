import { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { NetworkMessage, PeerStream } from '../types';

interface UsePeerNetworkProps {
    role: 'host' | 'client';
    roomId?: string; // Used if client
    localStream?: MediaStream | null;
}

export const usePeerNetwork = ({ role, roomId, localStream }: UsePeerNetworkProps) => {
    const [peerId, setPeerId] = useState<string>('');
    const [connections, setConnections] = useState<DataConnection[]>([]);
    const [remoteStreams, setRemoteStreams] = useState<PeerStream[]>([]);
    const [incomingData, setIncomingData] = useState<NetworkMessage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const peerRef = useRef<Peer | null>(null);

    useEffect(() => {
        // Generate a random ID for the room if host, or auto-connect if client
        const newPeerId = role === 'host' 
            ? `mtg-${Math.floor(Math.random() * 9000 + 1000)}` 
            : `player-${Math.floor(Math.random() * 100000)}`;

        const peer = new Peer(newPeerId, {
            debug: 1
        });
        
        peerRef.current = peer;

        peer.on('open', (id) => {
            console.log(`My peer ID is: ${id}`);
            setPeerId(id);
            if (role === 'client' && roomId) {
                connectToHost(roomId);
            }
        });

        peer.on('error', (err) => {
            console.error(err);
            setError("Network error: " + err.type);
        });

        // HOST LOGIC: Receive connections
        if (role === 'host') {
            peer.on('connection', (conn) => {
                console.log("New data connection", conn.peer);
                setupDataConnection(conn);
            });

            peer.on('call', (call) => {
                console.log("Incoming video call", call.peer);
                call.answer(); // Answer automatically
                call.on('stream', (remoteStream) => {
                    setRemoteStreams(prev => {
                        if (prev.find(s => s.peerId === call.peer)) return prev;
                        return [...prev, { peerId: call.peer, stream: remoteStream }];
                    });
                });
            });
        }

        return () => {
            peer.destroy();
        };
    }, []);

    const connectToHost = (hostId: string) => {
        if (!peerRef.current) return;
        
        console.log(`Connecting to ${hostId}...`);
        const conn = peerRef.current.connect(hostId);
        
        conn.on('open', () => {
            console.log("Connected to host!");
            setIsConnected(true);
            setupDataConnection(conn);
            
            // Initiate Video Call
            if (localStream) {
                console.log("Calling host with stream...");
                const call = peerRef.current!.call(hostId, localStream);
                // We don't necessarily expect a stream back, but we could handle it
            }
        });
        
        conn.on('error', (err) => {
            console.error("Connection failed", err);
            setError("Could not find host. Check Room ID.");
        });
    };

    const setupDataConnection = (conn: DataConnection) => {
        setConnections(prev => [...prev, conn]);
        
        conn.on('data', (data: any) => {
            setIncomingData(data);
        });

        conn.on('close', () => {
            setConnections(prev => prev.filter(c => c.peer !== conn.peer));
            setRemoteStreams(prev => prev.filter(s => s.peerId !== conn.peer));
            if (role === 'client') setIsConnected(false);
        });
    };

    const broadcast = (message: NetworkMessage) => {
        connections.forEach(conn => {
            if (conn.open) conn.send(message);
        });
    };

    return {
        peerId,
        connections,
        remoteStreams,
        incomingData,
        error,
        isConnected,
        broadcast
    };
};