import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { db, UserToken } from '../database';
import { HelpModal } from './HelpModal';

interface GeneratedToken {
    url: string;
    prompt: string;
    name: string;
    stats: string;
}

// Color mapping for mana symbols - extracted to avoid recreation
const MANA_COLOR_MAP: Record<string, string> = {
    W: 'white',
    U: 'blue',
    B: 'black',
    R: 'red',
    G: 'green'
};

// Helper function to get mana symbol class
const getManaSymbolClass = (color: string): string =>
    `mana-symbol mana-symbol-${MANA_COLOR_MAP[color] || 'colorless'}`;

// Mana color inference helper - keywords for each color
const COLOR_KEYWORDS: Record<string, string[]> = {
    W: ['white', 'plains', 'angel', 'soldier', 'knight', 'light', 'holy'],
    U: ['blue', 'island', 'drake', 'bird', 'wizard', 'water', 'sea'],
    B: ['black', 'swamp', 'zombie', 'horror', 'death', 'dark', 'demon'],
    R: ['red', 'mountain', 'goblin', 'dragon', 'fire', 'flame', 'burn'],
    G: ['green', 'forest', 'saproling', 'beast', 'elf', 'nature', 'tree']
};

export const TokenGenerator: React.FC = () => {
    // Form inputs
    const [prompt, setPrompt] = useState('');
    const [tokenName, setTokenName] = useState('');
    const [tokenStats, setTokenStats] = useState('');

    // Component state
    const [loading, setLoading] = useState(false);
    const [generatedTokens, setGeneratedTokens] = useState<GeneratedToken[]>([]);
    const [savedTokens, setSavedTokens] = useState<UserToken[]>([]);
    const [showHelp, setShowHelp] = useState(false);

    // Load saved tokens on mount
    const loadSavedTokens = useCallback(async () => {
        const tokens = await db.userTokens.toArray();
        setSavedTokens([...tokens].reverse()); // Fixed: Use spread operator instead of mutating
    }, []);

    useEffect(() => {
        loadSavedTokens();
    }, [loadSavedTokens]);

    // Infer mana colors from text
    const inferColors = useCallback((text: string): string[] => {
        const lower = text.toLowerCase();
        return Object.entries(COLOR_KEYWORDS)
            .filter(([_, keywords]) => keywords.some(kw => lower.includes(kw)))
            .map(([color]) => color);
    }, []);

    // Generate token image
    const handleGenerate = useCallback(async () => {
        if (!prompt || !process.env.API_KEY) return;
        setLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: {
                    parts: [{
                        text: `A high fantasy trading card game art illustration of: ${prompt}. Detailed, epic lighting, digital painting style.`
                    }],
                },
                config: {
                    imageConfig: {
                        imageSize: "1K",
                        aspectRatio: "3:4"
                    }
                },
            });

            const parts = response.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find(part => part.inlineData);

            if (imagePart?.inlineData) {
                const newToken: GeneratedToken = {
                    url: `data:image/png;base64,${imagePart.inlineData.data}`,
                    prompt,
                    name: tokenName || "Token",
                    stats: tokenStats || ""
                };
                setGeneratedTokens(prev => [newToken, ...prev]);
            }
        } catch (error) {
            console.error("Token gen failed", error);
            alert("Failed to generate token. Check API key or quota.");
        } finally {
            setLoading(false);
        }
    }, [prompt, tokenName, tokenStats]);

    // Save token to database
    const handleSave = useCallback(async (token: GeneratedToken) => {
        try {
            await db.userTokens.add({
                name: token.name,
                prompt_used: token.prompt,
                stats: token.stats,
                image_base64: token.url,
                colors: inferColors(token.prompt + " " + token.name),
                created_at: new Date()
            });
            await loadSavedTokens();
        } catch (e) {
            console.error("Failed to save token", e);
            alert("Could not save token to database.");
        }
    }, [inferColors, loadSavedTokens]);

    // Delete token from database
    const handleDelete = useCallback(async (id?: number) => {
        if (!id) return;
        await db.userTokens.delete(id);
        await loadSavedTokens();
    }, [loadSavedTokens]);

    // Memoized component for mana color badges
    const ManaColorBadges = useMemo(() => {
        const ColorBadge: React.FC<{ colors: string[]; size?: 'sm' | 'md' }> = ({ colors, size = 'md' }) => {
            const sizeClasses = size === 'sm' ? 'w-3 h-3 text-[7px]' : 'w-4 h-4 text-[8px]';
            return (
                <div className="flex gap-1">
                    {colors.map((color) => (
                        <div
                            key={color}
                            className={`${getManaSymbolClass(color)} ${sizeClasses} flex items-center justify-center`}
                        >
                            {color}
                        </div>
                    ))}
                </div>
            );
        };
        return ColorBadge;
    }, []);

    return (
        <div className="h-full flex flex-col p-6 max-w-6xl mx-auto relative">
            {/* Help Modal */}
            <HelpModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title="Token Forge Guide"
            >
                <div className="space-y-4">
                    <div>
                        <h4 className="text-green-400 font-bold uppercase text-xs tracking-wider mb-1">
                            Creating Tokens
                        </h4>
                        <p>Use Gemini 3 Pro to generate high-quality custom token art for your games.</p>
                        <p><strong>Prompt:</strong> Describe the visual appearance (e.g. "A mechanical dragon breathing blue fire").</p>
                        <p><strong>Name & Stats:</strong> Enter the game text (e.g. "Construct", "4/4") to overlay it on the saved token.</p>
                    </div>
                    <div className="border-t border-zinc-800 pt-3">
                        <h4 className="text-green-400 font-bold uppercase text-xs tracking-wider mb-1">
                            Saving & Library
                        </h4>
                        <p>Click <strong>SAVE</strong> on any generated image to store it in your local library. These tokens are persisted offline.</p>
                    </div>
                </div>
            </HelpModal>

            {/* Help Button */}
            <button
                onClick={() => setShowHelp(true)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full glass-panel text-zinc-400 hover:text-white border-2 border-transparent hover:border-green-500 transition-all flex items-center justify-center shadow-lg z-10"
                title="Help"
                aria-label="Open help modal"
            >
                <i className="fa-solid fa-question text-sm" aria-hidden="true" />
            </button>

            {/* Header */}
            <header className="text-center mb-8">
                <div className="flex items-center justify-center gap-6 mb-6">
                    <div className="mana-symbol-large mana-symbol-green animate-pulse-glow">G</div>
                    <h2 className="heading-lg text-white text-shadow-green">TOKEN FORGE</h2>
                    <div className="mana-symbol-large mana-symbol-green animate-pulse-glow">G</div>
                </div>
                <p className="text-zinc-200 body-lg font-semibold">
                    Create custom tokens for your battlefield using Gemini 3 Pro.
                </p>
            </header>

            {/* Creation Controls */}
            <div className="mtg-card-premium mtg-corner-ornament mb-10 color-green">
                <div className="mtg-card-premium-inner p-8 texture-card-linen relative">
                    <div className="absolute inset-0 bg-gradient-green opacity-10 pointer-events-none rounded-xl" />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 relative z-10">
                        {/* Prompt Input */}
                        <div className="md:col-span-2">
                            <label
                                htmlFor="token-prompt"
                                className="text-xs text-green-400 uppercase font-bold block mb-2 ml-1 flex items-center gap-2"
                            >
                                <i className="fa-solid fa-paintbrush" aria-hidden="true" />
                                Prompt Description
                            </label>
                            <input
                                id="token-prompt"
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., A 1/1 green Saproling with glowing spores..."
                                className="input-mtg input-green"
                            />
                        </div>

                        {/* Token Name Input */}
                        <div>
                            <label
                                htmlFor="token-name"
                                className="text-xs text-green-400 uppercase font-bold block mb-2 ml-1 flex items-center gap-2"
                            >
                                <i className="fa-solid fa-tag" aria-hidden="true" />
                                Token Name
                            </label>
                            <input
                                id="token-name"
                                type="text"
                                value={tokenName}
                                onChange={(e) => setTokenName(e.target.value)}
                                placeholder="e.g. Saproling"
                                className="input-mtg input-green"
                            />
                        </div>

                        {/* Stats Input */}
                        <div>
                            <label
                                htmlFor="token-stats"
                                className="text-xs text-green-400 uppercase font-bold block mb-2 ml-1 flex items-center gap-2"
                            >
                                <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                                Stats (P/T)
                            </label>
                            <input
                                id="token-stats"
                                type="text"
                                value={tokenStats}
                                onChange={(e) => setTokenStats(e.target.value)}
                                placeholder="e.g. 1/1"
                                className="input-mtg input-green font-bold font-mono"
                            />
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !prompt}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all uppercase tracking-widest text-lg btn-mtg ${loading ? 'btn-disabled' : 'btn-green'
                            }`}
                        aria-busy={loading ? "true" : undefined}
                    >
                        {loading ? (
                            <span>
                                <i className="fa-solid fa-circle-notch fa-spin mr-3" aria-hidden="true" />
                                Forging Token...
                            </span>
                        ) : (
                            <span>
                                <i className="fa-solid fa-wand-magic-sparkles mr-3" aria-hidden="true" />
                                Generate Token
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Content: Token Display */}
            <main className="flex-1 overflow-y-auto pr-2 space-y-8">
                {/* Freshly Generated Section */}
                {generatedTokens.length > 0 && (
                    <section aria-labelledby="generated-heading">
                        <h3
                            id="generated-heading"
                            className="text-green-400 font-bold uppercase tracking-widest text-sm mb-4 border-b border-green-900/50 pb-2 flex items-center gap-2"
                        >
                            <i className="fa-solid fa-sparkles" aria-hidden="true" />
                            Fresh from the Forge
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            {generatedTokens.map((token, idx) => {
                                const colors = inferColors(token.prompt + " " + token.name);
                                return (
                                    <article
                                        key={`generated-${idx}-${token.name}`}
                                        className="mtg-card-frame mtg-card-frame-green p-3 hover:scale-105 transition-transform group"
                                    >
                                        <div className="aspect-[3/4] rounded-lg overflow-hidden relative mb-3 border-2 border-black shadow-xl">
                                            <img
                                                src={token.url}
                                                alt={`Generated token: ${token.name}`}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                            {token.stats && (
                                                <div className="absolute bottom-2 right-2 glass-panel text-white px-2 py-1 rounded border-2 border-green-600 font-bold font-mono text-xs shadow-lg">
                                                    {token.stats}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <p className="text-white font-bold text-sm truncate font-serif">
                                                    {token.name}
                                                </p>
                                                <ManaColorBadges colors={colors} />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleSave(token)}
                                            className="w-full py-2 glass-panel hover:bg-green-700 text-zinc-300 hover:text-white rounded text-xs font-bold uppercase transition-all border-2 border-transparent hover:border-green-500"
                                            aria-label={`Save ${token.name} token`}
                                        >
                                            <i className="fa-solid fa-floppy-disk mr-1" aria-hidden="true" />
                                            Save
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Saved Library Section */}
                <section aria-labelledby="library-heading">
                    <div className="flex justify-between items-end mb-4 border-b border-zinc-800 pb-2">
                        <h3
                            id="library-heading"
                            className="text-zinc-300 font-bold uppercase tracking-widest text-sm flex items-center gap-2"
                        >
                            <i className="fa-solid fa-book-open" aria-hidden="true" />
                            Token Library ({savedTokens.length})
                        </h3>
                    </div>

                    {savedTokens.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-xl glass-panel">
                            <i className="fa-regular fa-clone text-3xl mb-2" aria-hidden="true" />
                            <p>No tokens saved yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {savedTokens.map((token) => (
                                <article
                                    key={`saved-${token.id}`}
                                    className="glass-panel p-2 rounded-lg border-2 border-zinc-800 hover:border-green-600 transition-all group"
                                >
                                    <div className="aspect-[3/4] rounded overflow-hidden relative mb-2 border-2 border-black shadow-lg">
                                        <img
                                            src={token.image_base64}
                                            alt={`Saved token: ${token.name}`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        {token.stats && (
                                            <div className="absolute bottom-1 right-1 glass-panel text-white px-1.5 py-0.5 rounded border border-green-600 font-bold font-mono text-[10px]">
                                                {token.stats}
                                            </div>
                                        )}
                                        {/* Hover Actions */}
                                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleDelete(token.id)}
                                                className="w-8 h-8 rounded-full bg-red-900/90 text-red-200 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors border-2 border-red-500"
                                                title="Delete token"
                                                aria-label={`Delete ${token.name} token`}
                                            >
                                                <i className="fa-solid fa-trash text-xs" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-zinc-200 font-bold text-xs truncate font-serif">
                                            {token.name}
                                        </p>
                                        <div className="flex gap-1 justify-center mt-1">
                                            <ManaColorBadges colors={token.colors || []} size="sm" />
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};