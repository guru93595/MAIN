import { useState } from 'react';
import { Power, Settings, RefreshCw } from 'lucide-react';
import { updateDeviceShadow } from '../services/devices';
import { motion } from 'framer-motion';

interface MotorControlProps {
    nodeId: string;
    initialStatus: boolean;
}

export const MotorControl = ({ nodeId, initialStatus }: MotorControlProps) => {
    const [isOn, setIsOn] = useState(initialStatus);
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        setLoading(true);
        try {
            const nextState = !isOn;
            await updateDeviceShadow(nodeId, { motor: nextState ? 1 : 0 });
            setIsOn(nextState);
        } catch (err) {
            console.error("Failed to toggle motor:", err);
            alert("Motor control failed. Please check device connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isOn ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                        <Settings size={20} className={isOn ? 'animate-spin-slow' : ''} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Motor Status</h3>
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest">{isOn ? 'LIVE & RUNNING' : 'SYSTEM STANDBY'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black ${isOn ? 'text-green-500' : 'text-slate-400'}`}>
                        {isOn ? 'ONLINE' : 'OFFLINE'}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${isOn ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                </div>
            </div>

            <button
                onClick={handleToggle}
                disabled={loading}
                className={`relative w-full h-16 rounded-2xl transition-all duration-500 flex items-center justify-center gap-3 group overflow-hidden ${isOn
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-200'
                    }`}
            >
                {loading ? (
                    <RefreshCw size={24} className="animate-spin" />
                ) : (
                    <>
                        <Power size={24} className="group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-black tracking-widest uppercase">
                            {isOn ? 'DEACTIVATE MOTOR' : 'ACTIVATE MOTOR'}
                        </span>
                    </>
                )}

                {/* Visual Feedback Overlay */}
                <motion.div
                    initial={false}
                    animate={{ opacity: loading ? 0.2 : 0 }}
                    className="absolute inset-0 bg-white"
                />
            </button>

            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    );
};
