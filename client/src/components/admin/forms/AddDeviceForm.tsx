import { useState } from 'react';
import { adminService } from '../../../services/admin';
import { Loader2 } from 'lucide-react';

export const AddDeviceForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
    const [nodeId, setNodeId] = useState('');
    const [type, setType] = useState('EvaraTank');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await adminService.createDevice({ hardware_id: nodeId, type });
            onSubmit(result);
        } catch (err) {
            setError('Failed to provision device.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all placeholder:text-slate-400";
    const labelCls = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg">
                    {error}
                </div>
            )}

            <div>
                <label className={labelCls}>Node Hardware ID / Key</label>
                <input
                    value={nodeId}
                    onChange={e => setNodeId(e.target.value)}
                    placeholder="e.g. EV-OHT-001"
                    className={inputCls}
                    disabled={loading}
                />
            </div>
            <div>
                <label className={labelCls}>Device Type</label>
                <div className="grid grid-cols-3 gap-2">
                    {['EvaraTank', 'EvaraDeep', 'EvaraFlow'].map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            disabled={loading}
                            className={`px-2 py-3 rounded-lg text-xs font-bold border transition-all ${type === t
                                ? 'bg-green-50 border-green-500 text-green-700'
                                : 'border-slate-300 text-slate-500 hover:border-slate-400'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!nodeId || loading}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    {loading ? 'Provisioning...' : 'Provision Device'}
                </button>
            </div>
        </form>
    );
};
