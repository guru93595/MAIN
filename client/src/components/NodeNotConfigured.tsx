// Placeholder shown by analytics pages when a node has no ThingSpeak config yet

const NodeNotConfigured = () => (
    <div className="flex flex-col items-center justify-center h-64 text-center p-8">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
            </svg>
        </div>
        <h3 className="text-slate-600 font-bold text-lg mb-2">
            ThingSpeak Not Configured
        </h3>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed mb-4">
            This node doesn't have ThingSpeak channel ID and read API key configured.
        </p>
        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg max-w-xs">
            <p className="font-semibold mb-1">To fix this:</p>
            <ol className="text-left space-y-1">
                <li>1. Go to Admin → Add Device</li>
                <li>2. Enter ThingSpeak Channel ID</li>
                <li>3. Enter Read API Key</li>
                <li>4. Save the device configuration</li>
            </ol>
        </div>
    </div>
);

export default NodeNotConfigured;
