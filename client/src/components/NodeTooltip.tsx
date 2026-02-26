import { Tooltip } from 'react-leaflet';
import { useTelemetry } from '../hooks/useTelemetry';
import { Activity, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NodeTooltipProps {
    nodeId: string;
    label: string;
    category: string;
}

export const NodeTooltip = ({ nodeId, label, category }: NodeTooltipProps) => {
    const { data: telemetry, loading, error } = useTelemetry(nodeId, 15000); // 15s polling for tooltip

    const metrics = telemetry?.metrics || {};
    const metricEntries = Object.entries(metrics);

    return (
        <Tooltip sticky direction="top" offset={[0, -20]} className="custom-tooltip">
            <div className="p-3 min-w-[180px] bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-slate-100">
                <div className="flex justify-between items-start mb-2 border-b border-slate-50 pb-2">
                    <div>
                        <h3 className="text-sm font-black text-slate-800 leading-tight">{label}</h3>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{category}</p>
                    </div>
                    <div className={`p-1.5 rounded-lg ${telemetry ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                        <Activity size={14} className={telemetry ? 'animate-pulse' : ''} />
                    </div>
                </div>

                <div className="space-y-2">
                    <AnimatePresence mode="wait">
                        {loading && !telemetry ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-1"
                            >
                                <div className="h-4 w-full bg-slate-100 animate-pulse rounded" />
                                <div className="h-4 w-2/3 bg-slate-100 animate-pulse rounded" />
                            </motion.div>
                        ) : error ? (
                            <p className="text-[10px] font-bold text-red-500 bg-red-50 p-1 rounded">Connection Error</p>
                        ) : metricEntries.length > 0 ? (
                            metricEntries.map(([key, val]) => (
                                <motion.div
                                    key={key}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex justify-between items-center"
                                >
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{key}</span>
                                    <span className="text-xs font-black text-slate-700">
                                        {typeof val === 'number' ? val.toFixed(1) : val}
                                    </span>
                                </motion.div>
                            ))
                        ) : (
                            <p className="text-[10px] font-bold text-slate-400 italic">No live data</p>
                        )}
                    </AnimatePresence>
                </div>

                {telemetry?.timestamp && (
                    <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                        <Clock size={10} />
                        {new Date(telemetry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
            </div>
            <style>{`
                .leaflet-tooltip.custom-tooltip {
                    background: transparent;
                    border: none;
                    box-shadow: none;
                    padding: 0;
                }
                .leaflet-tooltip-top.custom-tooltip:before {
                    border-top-color: rgba(255, 255, 255, 0.95);
                    bottom: -11px;
                }
            `}</style>
        </Tooltip>
    );
};
