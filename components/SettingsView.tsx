import React, { useState, useEffect } from 'react';
import { db, syncDatabase } from '../database';
import { HelpModal } from './HelpModal';

export const SettingsView: React.FC = () => {
    const [cardCount, setCardCount] = useState<number>(0);
    const [lastUpdate, setLastUpdate] = useState<string>('Never');
    const [isSyncing, setIsSyncing] = useState(false);
    const [status, setStatus] = useState("");
    const [showHelp, setShowHelp] = useState(false);

    // API Key Management
    const [apiKey, setApiKey] = useState<string>('');
    const [apiKeyStatus, setApiKeyStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            const count = await db.cards.count();
            const meta = await db.metadata.get('oracle_cards_updated_at');
            setCardCount(count);
            setLastUpdate(meta ? new Date(meta.value).toLocaleDateString() : 'Never');
        };
        loadStats();

        // Load saved API key from localStorage
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) {
            setApiKey(savedKey);
        }
    }, [isSyncing]); // Reload when sync finishes

    const handleManualSync = () => {
        setIsSyncing(true);
        syncDatabase((msg) => {
            setStatus(msg);
            if (msg.includes("Complete") || msg.includes("up to date") || msg.includes("Error")) {
                setIsSyncing(false);
            }
        });
    };

    const handleSaveApiKey = () => {
        if (apiKey.trim()) {
            localStorage.setItem('gemini_api_key', apiKey.trim());
            setApiKeyStatus({
                type: 'success',
                message: 'API key saved! Reload the app for it to take effect.'
            });
            setTimeout(() => setApiKeyStatus(null), 5000);
        } else {
            localStorage.removeItem('gemini_api_key');
            setApiKeyStatus({
                type: 'success',
                message: 'API key removed. AI features will be disabled.'
            });
            setTimeout(() => setApiKeyStatus(null), 5000);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto h-full overflow-y-auto relative">
            {/* Help Modal */}
            <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="System Settings">
                <div className="space-y-4">
                    <div>
                        <h4 className="text-indigo-400 font-bold uppercase text-xs tracking-wider mb-1">Offline Database</h4>
                        <p>The app downloads Scryfall's Oracle data (cards, rules, triggers) to your device so you can play without an internet connection later. This ensures low latency lookups for the AI.</p>
                    </div>
                    <div className="border-t border-zinc-800 pt-3">
                        <h4 className="text-zinc-400 font-bold uppercase text-xs tracking-wider mb-1">Permissions</h4>
                        <p><strong>Camera:</strong> Required for the Announcer AI to see the table and for AR view.</p>
                        <p><strong>Microphone:</strong> Required to speak to the AI and for Push-to-Talk communication.</p>
                    </div>
                </div>
            </HelpModal>

            {/* Help Button */}
            <button
                onClick={() => setShowHelp(true)}
                className="absolute top-8 right-8 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-600 transition-all flex items-center justify-center shadow-lg"
            >
                <i className="fa-solid fa-question text-xs"></i>
            </button>

            <h2 className="text-2xl font-bold mb-6 border-b border-zinc-800 pb-4">Settings</h2>

            <div className="space-y-6">
                {/* API Key Configuration */}
                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h3 className="font-bold text-lg mb-2 text-indigo-400">Gemini API Key (Optional)</h3>
                    <p className="text-sm text-zinc-400 mb-4">
                        The AI Announcer requires a free Gemini API key. The app works fine without it - you can manually track games.
                    </p>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-zinc-500 uppercase font-bold block mb-1">API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="AIza..."
                                    className="flex-1 bg-zinc-950 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-200 font-mono focus:border-indigo-500 outline-none"
                                />
                                <button
                                    onClick={handleSaveApiKey}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-save"></i> Save
                                </button>
                            </div>
                        </div>

                        {apiKeyStatus && (
                            <div className={`text-sm p-3 rounded ${apiKeyStatus.type === 'success' ? 'bg-green-900/20 text-green-300' : 'bg-red-900/20 text-red-300'}`}>
                                {apiKeyStatus.message}
                            </div>
                        )}

                        <details className="text-xs text-zinc-500">
                            <summary className="cursor-pointer hover:text-zinc-300">How to get a free Gemini API key</summary>
                            <ol className="list-decimal ml-4 mt-2 space-y-1">
                                <li>Visit <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-indigo-400 underline">aistudio.google.com/apikey</a></li>
                                <li>Sign in with your Google account</li>
                                <li>Click "Create API Key" (free tier includes generous usage)</li>
                                <li>Copy the key and paste it above</li>
                            </ol>
                        </details>
                    </div>
                </div>

                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h3 className="font-bold text-lg mb-2 text-indigo-400">Announcer Personality</h3>
                    <p className="text-sm text-zinc-400 mb-4">The current announcer model is set to <strong>Gemini 2.5 Live (Fenrir Voice)</strong>. This provides the best latency for real-time commentary.</p>

                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-zinc-300">
                            <input type="radio" name="style" defaultChecked className="text-indigo-600 focus:ring-indigo-600 bg-zinc-800 border-zinc-600" />
                            Esports Hype (Default)
                        </label>
                        <label className="flex items-center gap-2 text-zinc-300 opacity-50 cursor-not-allowed">
                            <input type="radio" name="style" disabled className="text-indigo-600 focus:ring-indigo-600 bg-zinc-800 border-zinc-600" />
                            Relaxed LGS Judge (Coming Soon)
                        </label>
                        <label className="flex items-center gap-2 text-zinc-300 opacity-50 cursor-not-allowed">
                            <input type="radio" name="style" disabled className="text-indigo-600 focus:ring-indigo-600 bg-zinc-800 border-zinc-600" />
                            Fantasy Innkeeper (Coming Soon)
                        </label>
                    </div>
                </div>

                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-indigo-400">Offline Database</h3>
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
                            {cardCount.toLocaleString()} Cards
                        </span>
                    </div>

                    <p className="text-sm text-zinc-400 mb-4">
                        Powered by Scryfall Oracle Data.
                        <br />Last Updated: <span className="text-white">{lastUpdate}</span>
                    </p>

                    {isSyncing ? (
                        <div className="bg-indigo-900/20 text-indigo-300 text-sm p-3 rounded border border-indigo-900/50 flex items-center gap-3">
                            <i className="fa-solid fa-rotate fa-spin"></i>
                            {status || "Syncing..."}
                        </div>
                    ) : (
                        <button
                            onClick={handleManualSync}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded transition-colors flex items-center gap-2"
                        >
                            <i className="fa-solid fa-rotate"></i> Check for Updates
                        </button>
                    )}
                </div>

                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                    <h3 className="font-bold text-lg mb-2 text-indigo-400">Permissions</h3>
                    <div className="text-sm text-zinc-400 flex flex-col gap-2">
                        <div className="flex justify-between">
                            <span>Camera Access</span>
                            <span className="text-green-400"><i className="fa-solid fa-check mr-1"></i> Granted</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Microphone Access</span>
                            <span className="text-green-400"><i className="fa-solid fa-check mr-1"></i> Granted</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Storage (IndexedDB)</span>
                            <span className={cardCount > 0 ? "text-green-400" : "text-yellow-500"}>
                                {cardCount > 0 ? <><i className="fa-solid fa-check mr-1"></i> Active</> : "Empty"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};