import { useState } from 'react';
import { adminService } from '../../../services/admin';
import { Loader2 } from 'lucide-react';

export const ConfigForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
    const [rate, setRate] = useState('60');
    const [firmware, setFirmware] = useState('v2.1.0');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await adminService.updateSystemConfig({ rate: parseInt(rate), firmware });
            onSubmit(result);
        } catch (err) {
            setError('Failed to update system config.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all placeholder:text-slate-400";
    const labelCls = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg">
                    {error}
                </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                <p className="text-xs text-amber-800">
                    <strong>Warning:</strong> Changes here will affect all connected devices immediately.
                </p>
            </div>

            <div>
                <label className={labelCls}>Global Data Sampling Rate (Seconds)</label>
                <input
                    type="number"
                    value={rate}
                    onChange={e => setRate(e.target.value)}
                    className={inputCls}
                    disabled={loading}
                />
            </div>
            <div>
                <label className={labelCls}>Target Firmware Version</label>
                <select
                    value={firmware}
                    onChange={e => setFirmware(e.target.value)}
                    className={inputCls}
                    disabled={loading}
                >
                    <option value="v2.1.0">v2.1.0 (Stable)</option>
                    <option value="v2.2.0-beta">v2.2.0-beta</option>
                    <option value="v1.9.8-LTS">v1.9.8-LTS</option>
                </select>
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
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 transition-colors"
                >
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    {loading ? 'Applying...' : 'Apply Config'}
                </button>
            </div>
        </form>
    );
};
