import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { db, UserToken } from '../database';
import { HelpModal } from './HelpModal';

interface GeneratedToken {
    url: string;
    prompt: string;
    name: string;
    stats: string;
}

export const TokenGenerator: React.FC = () => {
    // Inputs
    const [prompt, setPrompt] = useState('');
    const [tokenName, setTokenName] = useState('');
    const [tokenStats, setTokenStats] = useState('');
    
    // State
    const [loading, setLoading] = useState(false);
    const [generatedTokens, setGeneratedTokens] = useState<GeneratedToken[]>([]);
    const [savedTokens, setSavedTokens] = useState<UserToken[]>([]);
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        loadSavedTokens();
    }, []);

    const loadSavedTokens = async () => {
        const tokens = await db.userTokens.toArray();
        setSavedTokens(tokens.reverse()); // Newest first
    };

    const handleGenerate = async () => {
        if (!prompt || !process.env.API_KEY) return;
        setLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Using Gemini 3 Pro for high quality token art
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-image-preview',
                contents: {
                    parts: [{ text: `A high fantasy trading card game art illustration of: ${prompt}. Detailed, epic lighting, digital painting style.` }],
                },
                config: {
                    imageConfig: {
                        imageSize: "1K",
                        aspectRatio: "3:4" // Standard Card aspect
                    }
                },
            });

            // Extract image
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    const base64 = part.inlineData.data;
                    const url = `data:image/png;base64,${base64}`;
                    
                    const newToken: GeneratedToken = {
                        url,
                        prompt,
                        name: tokenName || "Token",
                        stats: tokenStats || ""
                    };
                    
                    setGeneratedTokens(prev => [newToken, ...prev]);
                    break;
                }
            }

        } catch (error) {
            console.error("Token gen failed", error);
            alert("Failed to generate token. Check API key or quota.");
        } finally {
            setLoading(false);
        }
    };

    const inferColors = (text: string): string[] => {
        const colors: string[] = [];
        const lower = text.toLowerCase();
        if (lower.includes('white') || lower.includes('plains') || lower.includes('angel') || lower.includes('soldier')) colors.push('W');
        if (lower.includes('blue') || lower.includes('island') || lower.includes('drake') || lower.includes('bird')) colors.push('U');
        if (lower.includes('black') || lower.includes('swamp') || lower.includes('zombie') || lower.includes('horror')) colors.push('B');
        if (lower.includes('red') || lower.includes('mountain') || lower.includes('goblin') || lower.includes('dragon')) colors.push('R');
        if (lower.includes('green') || lower.includes('forest') || lower.includes('saproling') || lower.includes('beast')) colors.push('G');
        return colors;
    };

    const handleSave = async (token: GeneratedToken) => {
        try {
            await db.userTokens.add({
                name: token.name,
                prompt_used: token.prompt,
                stats: token.stats,
                image_base64: token.url, // Storing full data URI for simplicity in rendering
                colors: inferColors(token.prompt + " " + token.name),
                created_at: new Date()
            });
            await loadSavedTokens();
            // Optional: Remove from generated list to indicate it's filed away? 
            // setGeneratedTokens(prev => prev.filter(t => t !== token));
        } catch (e) {
            console.error("Failed to save token", e);
            alert("Could not save token to database.");
        }
    };

    const handleDelete = async (id?: number) => {
        if (!id) return;
        await db.userTokens.delete(id);
        await loadSavedTokens();
    };

    return (
        <div className="h-full flex flex-col p-6 max-w-6xl mx-auto relative">
             {/* Help Modal */}
            <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Token Forge Guide">
                <div className="space-y-4">
                    <div>
                        <h4 className="text-indigo-400 font-bold uppercase text-xs tracking-wider mb-1">Creating Tokens</h4>
                        <p>Use Gemini 3 Pro to generate high-quality custom token art for your games.</p>
                        <p><strong>Prompt:</strong> Describe the visual appearance (e.g. "A mechanical dragon breathing blue fire").</p>
                        <p><strong>Name & Stats:</strong> Enter the game text (e.g. "Construct", "4/4") to overlay it on the saved token.</p>
                    </div>
                    <div className="border-t border-zinc-800 pt-3">
                        <h4 className="text-green-400 font-bold uppercase text-xs tracking-wider mb-1">Saving & Library</h4>
                        <p>Click <strong>SAVE</strong> on any generated image to store it in your local library. These tokens are persisted offline and can be viewed anytime.</p>
                    </div>
                </div>
            </HelpModal>

            {/* Help Button */}
            <button 
                onClick={() => setShowHelp(true)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-600 transition-all flex items-center justify-center shadow-lg"
            >
                <i className="fa-solid fa-question text-xs"></i>
            </button>

            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-white mb-2 font-serif tracking-wide">Token Forge</h2>
                <p className="text-zinc-400">Create custom tokens for your battlefield using Gemini 3 Pro.</p>
            </div>

            {/* Creation Controls */}
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="md:col-span-2">
                        <label className="text-xs text-zinc-500 uppercase font-bold block mb-1 ml-1">Prompt Description</label>
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A 1/1 green Saproling with glowing spores..."
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all font-serif"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-bold block mb-1 ml-1">Token Name</label>
                        <input
                            type="text"
                            value={tokenName}
                            onChange={(e) => setTokenName(e.target.value)}
                            placeholder="e.g. Saproling"
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all font-serif"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-bold block mb-1 ml-1">Stats (P/T)</label>
                        <input
                            type="text"
                            value={tokenStats}
                            onChange={(e) => setTokenStats(e.target.value)}
                            placeholder="e.g. 1/1"
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all font-serif font-bold"
                        />
                    </div>
                </div>
                
                <button
                    onClick={handleGenerate}
                    disabled={loading || !prompt}
                    className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all font-serif uppercase tracking-widest ${
                        loading 
                        ? 'bg-zinc-700 cursor-wait' 
                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30 active:scale-[0.99]'
                    }`}
                >
                    {loading ? (
                        <span><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Forging Artifact...</span>
                    ) : (
                        <span><i className="fa-solid fa-wand-magic-sparkles mr-2"></i> Generate Token</span>
                    )}
                </button>
            </div>

            {/* Main Content: Split View */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-8">
                
                {/* 1. Freshly Generated Section */}
                {generatedTokens.length > 0 && (
                    <section>
                        <h3 className="text-indigo-400 font-bold uppercase tracking-widest text-sm mb-4 border-b border-indigo-900/50 pb-2">
                            <i className="fa-solid fa-sparkles mr-2"></i> Fresh from the Forge
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                            {generatedTokens.map((token, idx) => (
                                <div key={idx} className="bg-zinc-900 p-3 rounded-xl border border-zinc-700 shadow-xl hover:border-indigo-500 transition-all group relative">
                                    <div className="aspect-[3/4] rounded-lg overflow-hidden relative mb-2 bg-zinc-950 border border-black">
                                        <img src={token.url} alt={token.prompt} className="w-full h-full object-cover" />
                                        {/* Overlay Stats */}
                                        {token.stats && (
                                            <div className="absolute bottom-2 right-2 bg-zinc-900/90 text-white px-2 py-1 rounded border border-zinc-600 font-bold font-mono text-xs shadow-lg">
                                                {token.stats}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-white font-serif font-bold text-sm truncate">{token.name}</p>
                                            <p className="text-zinc-500 text-[10px] truncate max-w-[100px]">"{token.prompt}"</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleSave(token)}
                                        className="w-full py-1.5 bg-zinc-800 hover:bg-green-700 text-zinc-300 hover:text-white rounded text-xs font-bold uppercase transition-colors"
                                    >
                                        <i className="fa-solid fa-floppy-disk mr-1"></i> Save
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 2. Saved Library Section */}
                <section>
                    <div className="flex justify-between items-end mb-4 border-b border-zinc-800 pb-2">
                        <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-sm">
                            <i className="fa-solid fa-book-open mr-2"></i> Token Library ({savedTokens.length})
                        </h3>
                    </div>
                    
                    {savedTokens.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                            <i className="fa-regular fa-clone text-3xl mb-2"></i>
                            <p>No tokens saved yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {savedTokens.map((token) => (
                                <div key={token.id} className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-all group">
                                    <div className="aspect-[3/4] rounded overflow-hidden relative mb-2 border border-black">
                                        <img src={token.image_base64} alt={token.name} className="w-full h-full object-cover" />
                                        {token.stats && (
                                            <div className="absolute bottom-1 right-1 bg-black/80 text-white px-1.5 py-0.5 rounded border border-zinc-600 font-bold font-mono text-[10px]">
                                                {token.stats}
                                            </div>
                                        )}
                                        {/* Hover Actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                            <button 
                                                onClick={() => handleDelete(token.id)}
                                                className="w-8 h-8 rounded-full bg-red-900/80 text-red-200 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors"
                                                title="Delete"
                                            >
                                                <i className="fa-solid fa-trash text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-zinc-300 font-serif font-bold text-xs truncate">{token.name}</p>
                                        <p className="text-zinc-600 text-[9px] uppercase tracking-wider">{new Date(token.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
};