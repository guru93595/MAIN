import { Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, ExternalLink } from 'lucide-react';

interface NodePopupProps {
    nodeId: string;
    nodeKey: string;
    label: string;
    category: string;
    status: string;
}

export const NodePopup = ({ nodeId, nodeKey, label, category, status }: NodePopupProps) => {
    // Use nodeKey for navigation as it's the unique identifier used in routes
    const navigationId = nodeKey || nodeId;
    return (
        <Popup className="custom-popup">
            <div className="p-4 w-[220px] bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-white/50">
                <div className="flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === 'Online' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                            <Activity size={20} className={status === 'Online' ? 'animate-pulse' : ''} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-black text-slate-800 truncate">{label}</h3>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${status === 'Online' ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                                    {status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="bg-slate-50/80 rounded-xl p-3 flex flex-col gap-2 border border-slate-100/50">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-400">CATEGORY</span>
                            <span className="text-blue-500 uppercase">{category}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                            <span>IDENTIFIER</span>
                            <span className="font-mono">{nodeKey.slice(-8)}</span>
                        </div>
                    </div>

                    {/* Action Link */}
                    <Link
                        to={`/node/${navigationId}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 !text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 group"
                        style={{ color: 'white' }}
                    >
                        <span>VIEW FULL ANALYTICS</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>

                    {/* External Control Link (Optional/Mock) */}
                    <button className="flex items-center justify-center gap-2 w-full py-2 border border-slate-200 text-slate-500 text-[10px] font-bold rounded-xl hover:bg-slate-50 transition-all opacity-80">
                        <ExternalLink size={12} />
                        QUICK COMMANDS
                    </button>
                </div>
            </div>
            <style>{`
                .leaflet-popup-content-wrapper.custom-popup {
                    background: transparent;
                    border: none;
                    box-shadow: none;
                    padding: 0;
                }
                .leaflet-popup-content {
                    margin: 0;
                    width: auto !important;
                }
                .leaflet-popup.custom-popup .leaflet-popup-tip-container {
                    display: none;
                }
            `}</style>
        </Popup>
    );
};
