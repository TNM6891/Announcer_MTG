import React, { useState, useEffect, useCallback } from 'react';
import { db, syncDatabase } from '../database';
import { HelpModal } from './HelpModal';
import { useToast } from '../hooks/useToast';

// Settings interface
interface AppSettings {
    soundEnabled: boolean;
    reducedMotion: boolean;
    fontSize: 'small' | 'medium' | 'large';
    theme: 'auto' | 'dark' | 'light';
    announcerVoice: string;
    announcerStyle: string;
    pushToTalkVolume: number;
    showLifeColors: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
    soundEnabled: true,
    reducedMotion: false,
    fontSize: 'medium',
    theme: 'dark',
    announcerVoice: 'fenrir',
    announcerStyle: 'esports',
    pushToTalkVolume: 80,
    showLifeColors: true,
};

export const SettingsView: React.FC = () => {
    const { showToast } = useToast();

    const [cardCount, setCardCount] = useState<number>(0);
    const [lastUpdate, setLastUpdate] = useState<string>('Never');
    const [isSyncing, setIsSyncing] = useState(false);
    const [status, setStatus] = useState("");
    const [showHelp, setShowHelp] = useState(false);

    // API Key Management
    const [apiKey, setApiKey] = useState<string>('');
    const [showApiKey, setShowApiKey] = useState(false);

    // Permission states
    const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
    const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

    // App Settings
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

    // Load settings from localStorage
    const loadSettings = useCallback(() => {
        const saved = localStorage.getItem('mtg_app_settings');
        if (saved) {
            try {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
            } catch {
                setSettings(DEFAULT_SETTINGS);
            }
        }
    }, []);

    // Save settings to localStorage
    const saveSettings = useCallback((newSettings: AppSettings) => {
        setSettings(newSettings);
        localStorage.setItem('mtg_app_settings', JSON.stringify(newSettings));
    }, []);

    // Check actual permission status
    const checkPermissions = async () => {
        try {
            const camera = await navigator.permissions.query({ name: 'camera' as PermissionName });
            setCameraPermission(camera.state);
            camera.onchange = () => setCameraPermission(camera.state);
        } catch {
            setCameraPermission('prompt');
        }

        try {
            const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            setMicPermission(mic.state);
            mic.onchange = () => setMicPermission(mic.state);
        } catch {
            setMicPermission('prompt');
        }
    };

    useEffect(() => {
        const loadStats = async () => {
            const count = await db.cards.count();
            const meta = await db.metadata.get('oracle_cards_updated_at');
            setCardCount(count);
            setLastUpdate(meta ? new Date(meta.value).toLocaleDateString() : 'Never');
        };
        loadStats();
        loadSettings();
        checkPermissions();

        // Load saved API key
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) {
            setApiKey(savedKey);
        }
    }, [isSyncing, loadSettings]);

    const handleManualSync = () => {
        setIsSyncing(true);
        syncDatabase((msg) => {
            setStatus(msg);
            if (msg.includes("Complete") || msg.includes("up to date") || msg.includes("Error")) {
                setIsSyncing(false);
                showToast(msg.includes("Error") ? 'Sync failed' : 'Database synced!', msg.includes("Error") ? 'error' : 'success');
            }
        });
    };

    const handleSaveApiKey = () => {
        if (apiKey.trim()) {
            localStorage.setItem('gemini_api_key', apiKey.trim());
            showToast('API key saved successfully!', 'success');
        } else {
            localStorage.removeItem('gemini_api_key');
            showToast('API key removed', 'info');
        }
    };

    const handleClearData = async () => {
        if (confirm('This will delete all saved tokens and reset settings. Continue?')) {
            await db.userTokens.clear();
            localStorage.removeItem('mtg_app_settings');
            setSettings(DEFAULT_SETTINGS);
            showToast('All data cleared', 'info');
        }
    };

    const handleRequestPermission = async (type: 'camera' | 'microphone') => {
        try {
            await navigator.mediaDevices.getUserMedia(
                type === 'camera' ? { video: true } : { audio: true }
            );
            showToast(`${type === 'camera' ? 'Camera' : 'Microphone'} access granted`, 'success');
            checkPermissions();
        } catch {
            showToast(`${type === 'camera' ? 'Camera' : 'Microphone'} access denied`, 'error');
        }
    };

    const getPermissionIcon = (state: string) => {
        switch (state) {
            case 'granted': return <i className="fa-solid fa-check text-green-400" aria-hidden="true" />;
            case 'denied': return <i className="fa-solid fa-times text-red-400" aria-hidden="true" />;
            default: return <i className="fa-solid fa-question text-yellow-400" aria-hidden="true" />;
        }
    };

    const getPermissionText = (state: string) => {
        switch (state) {
            case 'granted': return 'Granted';
            case 'denied': return 'Denied';
            default: return 'Not Set';
        }
    };

    return (
        <div className="h-full overflow-y-auto p-4 md:p-8 scroll-container safe-area-padding">
            <div className="max-w-2xl mx-auto relative">
                {/* Help Modal */}
                <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="System Settings">
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-blue-400 font-bold uppercase text-xs tracking-wider mb-1">Offline Database</h4>
                            <p>The app downloads Scryfall's Oracle data to your device so you can play without internet. This ensures low latency lookups for the AI.</p>
                        </div>
                        <div className="border-t border-zinc-800 pt-3">
                            <h4 className="text-zinc-400 font-bold uppercase text-xs tracking-wider mb-1">Permissions</h4>
                            <p><strong>Camera:</strong> Required for the Announcer AI to see the table.</p>
                            <p><strong>Microphone:</strong> Required for Push-to-Talk communication.</p>
                        </div>
                    </div>
                </HelpModal>

                {/* Help Button - Consistent position */}
                <button
                    onClick={() => setShowHelp(true)}
                    className="fixed top-4 right-4 w-10 h-10 rounded-full glass-panel text-zinc-400 hover:text-white border-2 border-transparent hover:border-blue-500 transition-all flex items-center justify-center shadow-lg z-10 touch-target"
                    aria-label="Help"
                >
                    <i className="fa-solid fa-question text-sm" aria-hidden="true" />
                </button>

                <header className="mb-6 md:mb-8">
                    <h2 className="heading-lg text-white mb-2">Settings</h2>
                    <p className="text-zinc-400 body-sm">Configure your MTG Announcer experience</p>
                </header>

                <div className="space-y-4 md:space-y-6">
                    {/* API Key Configuration */}
                    <section className="settings-section">
                        <h3 className="settings-title">
                            <i className="fa-solid fa-key mr-2" aria-hidden="true" />
                            Gemini API Key
                        </h3>
                        <p className="settings-description">
                            Required for AI features like token generation and game analysis.
                        </p>

                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showApiKey ? "text" : "password"}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="AIza..."
                                        className="input-mtg w-full pr-10"
                                        aria-label="API Key"
                                    />
                                    <button
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white touch-target"
                                        aria-label={showApiKey ? "Hide API key" : "Show API key"}
                                    >
                                        <i className={`fa-solid ${showApiKey ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                                    </button>
                                </div>
                                <button
                                    onClick={handleSaveApiKey}
                                    className="btn-mtg btn-green px-4 py-3 touch-target"
                                >
                                    <i className="fa-solid fa-save mr-2" aria-hidden="true" />
                                    Save
                                </button>
                            </div>

                            <details className="text-xs text-zinc-500">
                                <summary className="cursor-pointer hover:text-zinc-300">How to get a free API key</summary>
                                <ol className="list-decimal ml-4 mt-2 space-y-1">
                                    <li>Visit <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-blue-400 underline">aistudio.google.com/apikey</a></li>
                                    <li>Sign in with your Google account</li>
                                    <li>Click "Create API Key"</li>
                                    <li>Copy the key and paste it above</li>
                                </ol>
                            </details>
                        </div>
                    </section>

                    {/* Audio & Display Settings */}
                    <section className="settings-section">
                        <h3 className="settings-title">
                            <i className="fa-solid fa-sliders mr-2" aria-hidden="true" />
                            Audio & Display
                        </h3>

                        <div className="space-y-4">
                            {/* Sound Toggle */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-white font-medium">Sound Effects</span>
                                    <p className="text-zinc-500 text-xs">Audio feedback for actions</p>
                                </div>
                                <button
                                    onClick={() => saveSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                                    className={`toggle-switch ${settings.soundEnabled ? 'active' : ''}`}
                                    role="switch"
                                    aria-checked={settings.soundEnabled}
                                    aria-label="Toggle sound effects"
                                />
                            </div>

                            {/* Reduced Motion */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-white font-medium">Reduce Motion</span>
                                    <p className="text-zinc-500 text-xs">Disable animations for accessibility</p>
                                </div>
                                <button
                                    onClick={() => saveSettings({ ...settings, reducedMotion: !settings.reducedMotion })}
                                    className={`toggle-switch ${settings.reducedMotion ? 'active' : ''}`}
                                    role="switch"
                                    aria-checked={settings.reducedMotion}
                                    aria-label="Toggle reduced motion"
                                />
                            </div>

                            {/* Life Total Colors */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-white font-medium">Life Total Colors</span>
                                    <p className="text-zinc-500 text-xs">Color code life based on health</p>
                                </div>
                                <button
                                    onClick={() => saveSettings({ ...settings, showLifeColors: !settings.showLifeColors })}
                                    className={`toggle-switch ${settings.showLifeColors ? 'active' : ''}`}
                                    role="switch"
                                    aria-checked={settings.showLifeColors}
                                    aria-label="Toggle life total colors"
                                />
                            </div>

                            {/* Font Size */}
                            <div>
                                <span className="text-white font-medium block mb-2">Text Size</span>
                                <select
                                    value={settings.fontSize}
                                    onChange={(e) => saveSettings({ ...settings, fontSize: e.target.value as 'small' | 'medium' | 'large' })}
                                    className="select-mtg"
                                    aria-label="Font size"
                                >
                                    <option value="small">Small</option>
                                    <option value="medium">Medium (Default)</option>
                                    <option value="large">Large</option>
                                </select>
                            </div>

                            {/* Push to Talk Volume */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-white font-medium">Microphone Gain</span>
                                    <span className="text-zinc-400 text-sm">{settings.pushToTalkVolume}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={settings.pushToTalkVolume}
                                    onChange={(e) => saveSettings({ ...settings, pushToTalkVolume: parseInt(e.target.value) })}
                                    className="range-slider"
                                    aria-label="Microphone gain"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Announcer Personality */}
                    <section className="settings-section">
                        <h3 className="settings-title">
                            <i className="fa-solid fa-microphone-lines mr-2" aria-hidden="true" />
                            Announcer Personality
                        </h3>
                        <p className="settings-description">
                            Choose the AI announcer's commentary style.
                        </p>

                        <div className="space-y-2">
                            {[
                                { id: 'esports', label: 'Esports Hype', desc: 'Energetic tournament commentary', available: true },
                                { id: 'judge', label: 'LGS Judge', desc: 'Calm, rules-focused commentary', available: false },
                                { id: 'innkeeper', label: 'Fantasy Innkeeper', desc: 'Immersive fantasy roleplay', available: false },
                            ].map((style) => (
                                <label
                                    key={style.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${settings.announcerStyle === style.id
                                            ? 'border-blue-500 bg-blue-500/10'
                                            : 'border-zinc-800 hover:border-zinc-700'
                                        } ${!style.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="announcer-style"
                                        value={style.id}
                                        checked={settings.announcerStyle === style.id}
                                        onChange={() => style.available && saveSettings({ ...settings, announcerStyle: style.id })}
                                        disabled={!style.available}
                                        className="mt-1"
                                    />
                                    <div>
                                        <span className="text-white font-medium">
                                            {style.label}
                                            {!style.available && <span className="text-xs text-zinc-500 ml-2">(Coming Soon)</span>}
                                        </span>
                                        <p className="text-zinc-500 text-xs">{style.desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </section>

                    {/* Offline Database */}
                    <section className="settings-section">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                            <div>
                                <h3 className="settings-title">
                                    <i className="fa-solid fa-database mr-2" aria-hidden="true" />
                                    Offline Database
                                </h3>
                                <p className="text-zinc-500 text-sm">Powered by Scryfall Oracle Data</p>
                            </div>
                            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded self-start">
                                {cardCount.toLocaleString()} Cards
                            </span>
                        </div>

                        <p className="text-zinc-400 text-sm mb-4">
                            Last Updated: <span className="text-white">{lastUpdate}</span>
                        </p>

                        {isSyncing ? (
                            <div className="bg-blue-900/20 text-blue-300 text-sm p-3 rounded-lg border border-blue-900/50 flex items-center gap-3" role="status">
                                <i className="fa-solid fa-rotate fa-spin" aria-hidden="true" />
                                {status || "Syncing..."}
                            </div>
                        ) : (
                            <button
                                onClick={handleManualSync}
                                className="btn-base bg-zinc-800 hover:bg-zinc-700 text-white touch-target"
                            >
                                <i className="fa-solid fa-rotate mr-2" aria-hidden="true" />
                                Check for Updates
                            </button>
                        )}
                    </section>

                    {/* Permissions */}
                    <section className="settings-section">
                        <h3 className="settings-title">
                            <i className="fa-solid fa-shield-halved mr-2" aria-hidden="true" />
                            Permissions
                        </h3>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <i className="fa-solid fa-camera text-zinc-400" aria-hidden="true" />
                                    <span className="text-white">Camera</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getPermissionIcon(cameraPermission)}
                                    <span className={`text-sm ${cameraPermission === 'granted' ? 'text-green-400' : cameraPermission === 'denied' ? 'text-red-400' : 'text-yellow-400'}`}>
                                        {getPermissionText(cameraPermission)}
                                    </span>
                                    {cameraPermission !== 'granted' && (
                                        <button
                                            onClick={() => handleRequestPermission('camera')}
                                            className="text-xs text-blue-400 hover:text-blue-300 ml-2"
                                        >
                                            Request
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <i className="fa-solid fa-microphone text-zinc-400" aria-hidden="true" />
                                    <span className="text-white">Microphone</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getPermissionIcon(micPermission)}
                                    <span className={`text-sm ${micPermission === 'granted' ? 'text-green-400' : micPermission === 'denied' ? 'text-red-400' : 'text-yellow-400'}`}>
                                        {getPermissionText(micPermission)}
                                    </span>
                                    {micPermission !== 'granted' && (
                                        <button
                                            onClick={() => handleRequestPermission('microphone')}
                                            className="text-xs text-blue-400 hover:text-blue-300 ml-2"
                                        >
                                            Request
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <i className="fa-solid fa-hard-drive text-zinc-400" aria-hidden="true" />
                                    <span className="text-white">Storage</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {cardCount > 0 ? (
                                        <>
                                            <i className="fa-solid fa-check text-green-400" aria-hidden="true" />
                                            <span className="text-green-400 text-sm">Active</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-minus text-yellow-400" aria-hidden="true" />
                                            <span className="text-yellow-400 text-sm">Empty</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Danger Zone */}
                    <section className="settings-section danger-zone">
                        <h3 className="settings-title text-red-400">
                            <i className="fa-solid fa-triangle-exclamation mr-2" aria-hidden="true" />
                            Danger Zone
                        </h3>
                        <p className="settings-description text-red-300/70">
                            These actions cannot be undone.
                        </p>

                        <button
                            onClick={handleClearData}
                            className="btn-danger touch-target"
                        >
                            <i className="fa-solid fa-trash mr-2" aria-hidden="true" />
                            Clear All Data
                        </button>
                    </section>

                    {/* App Info */}
                    <section className="text-center py-6 text-zinc-500 text-xs space-y-1">
                        <p>MTG Announcer v1.0.0</p>
                        <p>Built with React, Gemini AI, and Scryfall Data</p>
                        <p className="text-zinc-600">Not affiliated with Wizards of the Coast</p>
                    </section>
                </div>
            </div>
        </div>
    );
};