import Dexie, { Table } from 'dexie';
import { PlayerProfile, MatchRecord, GameFormat, GameSettings } from './types';

// --- ENUMS & TYPES ---

export enum CardType {
  Creature = 'Creature',
  Instant = 'Instant',
  Sorcery = 'Sorcery',
  Enchantment = 'Enchantment',
  Artifact = 'Artifact',
  Planeswalker = 'Planeswalker',
  Land = 'Land',
  Battle = 'Battle',
  Token = 'Token'
}

export enum TriggerType {
  Upkeep = 'Upkeep',
  EndStep = 'EndStep',
  EnterBattlefield = 'ETB',
  Death = 'Death',
  Attack = 'Attack',
  Block = 'Block',
  SpellCast = 'SpellCast',
  Landfall = 'Landfall',
  CombatDamage = 'CombatDamage',
  PhaseChange = 'PhaseChange'
}

// --- INTERFACES (Tables) ---

export interface MetaData {
  key: string;
  value: any;
}

export interface Card {
  id: string; // Scryfall UUID
  oracle_id: string;
  name: string;
  lang: string;
  released_at: string;
  uri: string;
  layout: string;
  
  mana_cost: string;
  cmc: number;
  type_line: string;
  oracle_text: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  colors: string[]; 
  color_identity: string[];
  
  set_code: string;
  set_name: string;
  rarity: string;
  
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };

  legalities: Record<string, 'legal' | 'not_legal' | 'banned' | 'restricted'>;
}

export interface SetInfo {
  code: string; 
  name: string; 
  released_at: string;
  card_count: number;
  icon_svg_uri: string;
}

export interface RuleEntry {
  id: string; 
  rule_number: string;
  parent_section: string; 
  text: string;
  keywords: string[]; 
}

export interface Ruling {
  id: string; 
  oracle_id: string; 
  source: string;
  published_at: string;
  comment: string;
}

export interface CardTrigger {
  id?: number; 
  oracle_id: string; 
  trigger_type: TriggerType; 
  trigger_text: string; 
  is_mandatory: boolean; 
}

export interface UserToken {
  id?: number;
  name: string;
  prompt_used: string;
  image_base64: string; 
  stats: string; 
  colors: string[];
  created_at: Date;
}

// --- DATABASE CLASS ---

export class MTGDatabase extends Dexie {
  cards!: Table<Card>;
  sets!: Table<SetInfo>;
  rules!: Table<RuleEntry>;
  rulings!: Table<Ruling>;
  triggers!: Table<CardTrigger>;
  userTokens!: Table<UserToken>;
  metadata!: Table<MetaData>;
  players!: Table<PlayerProfile>;
  matches!: Table<MatchRecord>;

  constructor() {
    super('MTGAnnouncerDB');
    
    (this as any).version(1).stores({
      cards: 'id, oracle_id, name, set_code, [colors], type_line', 
      sets: 'code, name, released_at',
      rules: 'id, rule_number, *keywords', 
      rulings: 'id, oracle_id',
      triggers: '++id, oracle_id, trigger_type', 
      userTokens: '++id, name, created_at',
      metadata: 'key',
      players: '++id, name', // Index by name for fast lookup
      matches: '++id, winner_id, match_type'
    });
  }

  /**
   * Save the current game configuration
   */
  async saveGameSettings(settings: GameSettings) {
    await this.metadata.put({ key: 'current_game_settings', value: settings });
  }

  /**
   * Retrieve the current game configuration
   */
  async getGameSettings(): Promise<GameSettings | undefined> {
    const data = await this.metadata.get('current_game_settings');
    return data ? data.value : undefined;
  }

  /**
   * Quick lookup to see if any cards currently on the battlefield 
   * have triggers for the current phase.
   */
  async getTriggersForPhase(cardOracleIdsOnBoard: string[], phase: TriggerType) {
    return await this.triggers
      .where('trigger_type')
      .equals(phase)
      .and(t => cardOracleIdsOnBoard.includes(t.oracle_id))
      .toArray();
  }

  /**
   * Finds a card by name (case insensitive).
   */
  async getCardByName(name: string): Promise<Card | undefined> {
    // Exact match first (fastest)
    let card = await this.cards.where('name').equals(name).first();
    if (card) return card;

    // Case insensitive scan (slower but necessary for fuzzy AI inputs)
    const lowerName = name.toLowerCase();
    card = await this.cards.filter(c => c.name.toLowerCase() === lowerName).first();
    if (card) return card;
    
    // Partial match fallback? (Optional, maybe risky)
    return undefined;
  }

  // --- PLAYER & MATCH LOGIC ---

  /**
   * Takes a list of names, finds existing players, creates new ones,
   * and returns the full PlayerProfile objects.
   */
  async registerSessionPlayers(names: string[]): Promise<PlayerProfile[]> {
    const profiles: PlayerProfile[] = [];
    
    await this.transaction('rw', this.players, async () => {
        for (const name of names) {
            const cleanName = name.trim();
            // Case-insensitive search roughly
            let player = await this.players
                .filter(p => p.name.toLowerCase() === cleanName.toLowerCase())
                .first();
            
            if (!player) {
                const id = await this.players.add({
                    name: cleanName,
                    created_at: new Date()
                });
                player = { id: id as number, name: cleanName, created_at: new Date() };
            }
            profiles.push(player);
        }
    });
    return profiles;
  }

  async recordMatchResult(winnerName: string, loserNames: string[], type: '1v1' | 'multiplayer') {
    // We assume players exist because they are registered at session start, 
    // but we look them up just in case.
    const allNames = [winnerName, ...loserNames];
    const profiles = await this.registerSessionPlayers(allNames);
    
    const winner = profiles.find(p => p.name.toLowerCase() === winnerName.toLowerCase());
    const losers = profiles.filter(p => loserNames.some(ln => ln.toLowerCase() === p.name.toLowerCase()));
    
    if (winner && losers.length > 0) {
        await this.matches.add({
            winner_id: winner.id!,
            loser_ids: losers.map(l => l.id!),
            match_type: type,
            timestamp: new Date()
        });
    }
  }

  /**
   * Logic: "How many games has P1 won against P2?"
   */
  async getPlayerStats(player1Name: string, player2Name: string) {
    const p1 = await this.players.filter(p => p.name.toLowerCase() === player1Name.toLowerCase()).first();
    const p2 = await this.players.filter(p => p.name.toLowerCase() === player2Name.toLowerCase()).first();

    if (!p1 || !p2) return null;

    const allMatches = await this.matches.toArray();

    let p1WinsTotal = 0;
    let p1Wins1v1 = 0;
    let p2WinsTotal = 0;
    let p2Wins1v1 = 0;

    for (const m of allMatches) {
        // P1 wins against P2 (P2 is in losers list)
        if (m.winner_id === p1.id && m.loser_ids.includes(p2.id!)) {
            p1WinsTotal++;
            if (m.match_type === '1v1') p1Wins1v1++;
        }
        // P2 wins against P1
        if (m.winner_id === p2.id && m.loser_ids.includes(p1.id!)) {
            p2WinsTotal++;
            if (m.match_type === '1v1') p2Wins1v1++;
        }
    }

    return {
        p1Name: p1.name,
        p2Name: p2.name,
        p1WinsTotal,
        p1Wins1v1,
        p2WinsTotal,
        p2Wins1v1
    };
  }
}

export const db = new MTGDatabase();

// --- SYNCHRONIZATION UTILITIES ---
const SCRYFALL_BULK_DATA_URL = 'https://api.scryfall.com/bulk-data';

export const syncDatabase = async (
  onProgress: (status: string, percentage?: number) => void
) => {
  try {
    if (!navigator.onLine) {
        const count = await db.cards.count();
        if (count === 0) {
            onProgress("Offline and database empty. Features limited.");
        } else {
            onProgress("Offline mode ready.");
        }
        return;
    }

    onProgress("Checking for card updates...");
    const response = await fetch(SCRYFALL_BULK_DATA_URL);
    if (!response.ok) throw new Error("Could not reach Scryfall API");
    
    const json = await response.json();
    const oracleEntry = json.data.find((d: any) => d.type === 'oracle_cards');
    
    if (!oracleEntry) throw new Error("Oracle cards data source not found");
    
    const lastUpdate = await db.metadata.get('oracle_cards_updated_at');
    
    if (lastUpdate && lastUpdate.value === oracleEntry.updated_at) {
        const count = await db.cards.count();
        if (count > 0) {
            onProgress("Database up to date.");
            return;
        }
    }

    onProgress("Downloading card database (this may take a minute)...");
    const dataResponse = await fetch(oracleEntry.download_uri);
    if (!dataResponse.ok) throw new Error("Download failed");
    
    const cardsRaw = await dataResponse.json();
    onProgress(`Processing ${cardsRaw.length} cards...`);
    
    const CHUNK_SIZE = 2000;
    const triggers: CardTrigger[] = [];
    const formattedCards: Card[] = [];
    
    for (const c of cardsRaw) {
        const card: Card = {
            id: c.id,
            oracle_id: c.oracle_id,
            name: c.name,
            lang: c.lang,
            released_at: c.released_at,
            uri: c.uri,
            layout: c.layout,
            mana_cost: c.mana_cost || "",
            cmc: c.cmc || 0,
            type_line: c.type_line || "",
            oracle_text: c.oracle_text || "",
            power: c.power,
            toughness: c.toughness,
            loyalty: c.loyalty,
            colors: c.colors || [],
            color_identity: c.color_identity || [],
            set_code: c.set,
            set_name: c.set_name,
            rarity: c.rarity,
            image_uris: c.image_uris,
            legalities: c.legalities || {}
        };
        formattedCards.push(card);
        
        const text = (c.oracle_text || "").toLowerCase();
        if (text.includes("at the beginning of your upkeep") || text.includes("at the beginning of each player's upkeep")) {
            triggers.push({ oracle_id: c.oracle_id, trigger_type: TriggerType.Upkeep, trigger_text: "Upkeep Trigger", is_mandatory: !text.includes("you may") });
        }
        if (text.includes("at the beginning of your end step") || text.includes("at the beginning of the end step")) {
            triggers.push({ oracle_id: c.oracle_id, trigger_type: TriggerType.EndStep, trigger_text: "End Step Trigger", is_mandatory: !text.includes("you may") });
        }
        if (text.includes("enters the battlefield")) {
             triggers.push({ oracle_id: c.oracle_id, trigger_type: TriggerType.EnterBattlefield, trigger_text: "ETB Trigger", is_mandatory: !text.includes("you may") });
        }
        if (text.includes("when") && text.includes("dies")) {
             triggers.push({ oracle_id: c.oracle_id, trigger_type: TriggerType.Death, trigger_text: "Death Trigger", is_mandatory: !text.includes("you may") });
        }
    }
    
    onProgress("Saving to offline storage...");
    
    await (db as any).transaction('rw', db.cards, db.triggers, db.metadata, async () => {
        await db.cards.clear();
        await db.triggers.clear();
        for (let i = 0; i < formattedCards.length; i += CHUNK_SIZE) {
            await db.cards.bulkPut(formattedCards.slice(i, i + CHUNK_SIZE));
        }
        for (let i = 0; i < triggers.length; i += CHUNK_SIZE) {
            await db.triggers.bulkPut(triggers.slice(i, i + CHUNK_SIZE));
        }
        await db.metadata.put({ key: 'oracle_cards_updated_at', value: oracleEntry.updated_at });
    });

    onProgress("Database Synchronized!");
    
  } catch (error: any) {
    console.error("Sync failed", error);
    onProgress(`Sync Error: ${error.message || "Unknown error"}`);
    throw error;
  }
};