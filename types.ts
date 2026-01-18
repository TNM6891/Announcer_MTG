export enum GamePhase {
  Untap = 'Untap',
  Upkeep = 'Upkeep',
  Draw = 'Draw',
  Main1 = 'Main 1',
  Combat = 'Combat',
  Main2 = 'Main 2',
  End = 'End',
  Cleanup = 'Cleanup'
}

export enum GameFormat {
  Standard = 'Standard',
  Commander = 'Commander',
  Modern = 'Modern',
  Pioneer = 'Pioneer',
  Legacy = 'Legacy',
  Vintage = 'Vintage',
  Pauper = 'Pauper',
  Draft = 'Draft',
  Sealed = 'Sealed',
  Custom = 'Custom'
}

export enum AppMode {
  Announcer = 'Announcer',
  ARView = 'AR View',
  JoinGame = 'Join Game'
}

export interface GameSettings {
  format: GameFormat;
  customRules: string;
}

// In-game temporary state
export interface PlayerState {
  id: number; // Database ID
  name: string;
  life: number;
  poison: number;
  commanderDamage: number;
}

export interface CardStatus {
  id: string;
  label: string;
  icon: string; // FontAwesome class
  color: string; // Tailwind color classes
}

export interface BattlefieldCard {
  instanceId: string;
  oracle_id: string;
  name: string;
  type_line: string;
  image_uri?: string;
  controller: string;
  tapped: boolean;
  oracle_text?: string; // Cache text for AI reasoning
  statuses: CardStatus[];
}

// Database persistent profile
export interface PlayerProfile {
  id?: number;
  name: string;
  created_at: Date;
}

// Database persistent match history
export interface MatchRecord {
  id?: number;
  winner_id: number;
  loser_ids: number[];
  match_type: '1v1' | 'multiplayer';
  timestamp: Date;
}

export interface GameState {
  turnCount: number;
  activePlayerId: number;
  phase: GamePhase;
}

export interface TokenCard {
  id: string;
  name: string;
  imageUrl: string;
  stats: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  speaker: 'User' | 'Announcer' | 'System';
  text: string;
}

// Live API specific types
export interface LiveConfig {
  model: string;
  systemInstruction: string;
  voiceName: string;
}

// --- NETWORKING ---
export interface PeerStream {
    peerId: string;
    stream: MediaStream;
}

export interface NetworkMessage {
    type: 'GAME_STATE';
    payload: {
        players: PlayerProfile[];
        battlefield: Record<string, BattlefieldCard[]>;
        phase: GamePhase;
        currentLife: Record<string, number>;
        commanderDamage: Record<string, Record<string, number>>;
    };
}