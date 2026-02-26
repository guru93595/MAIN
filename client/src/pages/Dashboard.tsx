import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapMarkerNode } from '../components/MapMarkerNode';
import {
    Activity, ArrowUpRight, AlertTriangle,
    Server, Clock, Download, FileText
} from 'lucide-react';

import { useNodes } from '../hooks/useNodes';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import type { NodeRow } from '../types/database';
import { getSystemHealth, type SystemHealth } from '../services/dashboard';
import { getActiveAlerts, type AlertHistory } from '../services/alerts';
import api from '../services/api';
import { useTelemetry } from '../hooks/useTelemetry';
import { CompleteDashboard } from '../components/CompleteDashboard';

function SyncAccountButton({ onSync }: { onSync: () => void }) {
    const [syncing, setSyncing] = useState(false);

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.post('/auth/sync');
            onSync();
        } catch (e) {
            console.error(e);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
            {syncing ? 'Syncing...' : 'Sync Account'}
        </button>
    );
}

const ChangeView = ({ nodes }: { nodes: NodeRow[] }) => {
    const map = useMap();
    useEffect(() => {
        if (nodes.length > 0) {
            const bounds = L.latLngBounds(nodes.map(n => [n.lat || 17.44, n.lng || 78.34]));
            map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
        }
    }, [nodes, map]);
    return null;
};

// ─── MiniMap Component ────────────────────────────────────────────────────────
const MiniMap = ({ onExpand, nodes }: { onExpand: () => void, nodes: NodeRow[] }) => {
    return (
        <div
            className="relative h-full w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm group hover:shadow-md hover:ring-2 hover:ring-blue-100 transition-all duration-300"
        >
            <MapContainer
                center={[17.4456, 78.3490]}
                zoom={14}
                className="h-full w-full"
                zoomControl={true}
                dragging={true}
                doubleClickZoom={true}
                scrollWheelZoom={true}
                attributionControl={false}
            >
                <ChangeView nodes={nodes} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {nodes.map(node => (
                    <MapMarkerNode key={node.id} node={node} />
                ))}
            </MapContainer>

            <button
                onClick={onExpand}
                className="absolute inset-0 z-[400] bg-transparent hover:bg-blue-600/5 transition-colors group cursor-pointer flex items-center justify-center"
                title="Open Full Map"
            >
                <div className="bg-white/90 backdrop-blur text-blue-600 px-4 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 font-bold z-[401]">
                    <ArrowUpRight size={20} />
                    Open Full Map
                </div>
            </button>

            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-lg border border-white/50 z-[402] flex gap-3 scale-90 origin-bottom-left pointer-events-none">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-600 inline-block" /><span className="text-[10px] font-semibold text-slate-600">PH</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-600 inline-block" /><span className="text-[10px] font-semibold text-slate-600">Sump</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /><span className="text-[10px] font-semibold text-slate-600">OHT</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /><span className="text-[10px] font-semibold text-slate-600">Bore</span></div>
            </div>
        </div>
    );
};

const LiveFeedCard = ({ nodeId }: { nodeId?: string }) => {
    const { data: telemetry, loading, error } = useTelemetry(nodeId);

    if (!nodeId) return (
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/50 flex flex-col justify-center items-center opacity-50">
            <p className="text-xs font-bold text-slate-400 uppercase">No Active Source</p>
        </div>
    );

    const metrics = telemetry?.metrics || {};
    const metricEntries = Object.entries(metrics);

    return (
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/50 flex flex-col justify-between hover:shadow-md transition-all duration-300 overflow-hidden">
            <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Live Feed</p>
                    <div className="flex flex-wrap gap-4">
                        {loading ? (
                            <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
                        ) : error ? (
                            <h2 className="text-sm font-bold text-red-400">Check Credentials</h2>
                        ) : metricEntries.length > 0 ? (
                            metricEntries.map(([key, val]) => (
                                <div key={key} className="flex flex-col">
                                    <h2 className="text-2xl font-black text-slate-800">
                                        {typeof val === 'number' ? val.toFixed(1) : val}
                                        <span className="text-[10px] font-bold text-slate-400 ml-1 capitalize">{key}</span>
                                    </h2>
                                </div>
                            ))
                        ) : (
                            <h2 className="text-2xl font-bold text-slate-300">--</h2>
                        )}
                    </div>
                </div>
                <div className={`p-3 rounded-xl ${telemetry ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-50 text-slate-400'}`}>
                    <Activity className="w-5 h-5" />
                </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-50 w-fit px-2 py-1 rounded-lg">
                <Clock className="w-3 h-3 text-blue-400" />
                {telemetry?.timestamp ? new Date(telemetry.timestamp).toLocaleTimeString() : 'Waiting for feed...'}
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { loading } = useAuth();
    const { nodes, loading: nodesLoading, error: nodesError, refresh: refreshNodes } = useNodes();
    const navigate = useNavigate();
    const [now] = useState(() => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    const [isNavigating, setIsNavigating] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'complete'>('overview');

    const selectedNode = nodes.find(n => n.status === 'Online') || nodes[0];
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [activeAlerts, setActiveAlerts] = useState<AlertHistory[]>([]);

    useEffect(() => {
        getSystemHealth().then(setHealth).catch(console.error);
        getActiveAlerts().then(setActiveAlerts).catch(console.error);
    }, [selectedNode]);

    const tanks = nodes.filter(n => (n.analytics_type || '') === 'EvaraTank');
    const flow = nodes.filter(n => (n.analytics_type || '') === 'EvaraFlow');
    const borewells = nodes.filter(n => (n.analytics_type || '') === 'EvaraDeep');

    const localStats = {
        tanks: { active: tanks.filter(n => n.status === 'Online').length, total: tanks.length },
        flow: { active: flow.filter(n => n.status === 'Online').length, total: flow.length },
        deep: { active: borewells.filter(n => n.status === 'Online').length, total: borewells.length },
        alerts: nodes.filter(n => n.status === 'Alert' || n.status === 'Offline').length
    };

    const deviceFleet = nodes.slice(0, 5).map(n => ({
        id: n.id,
        name: n.label || n.id,
        type: n.category,
        status: n.status,
        lastComm: 'Just now',
        health: n.status === 'Online' ? 95 : 40
    }));

    if (loading || nodesLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const isSyncError = typeof nodesError === 'string' && nodesError.toLowerCase().includes('not synced');
    if (nodesError) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="max-w-md text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                    <p className="text-red-600 font-medium mb-2">Could not load dashboard data</p>
                    <p className="text-slate-600 text-sm mb-4">{nodesError}</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {isSyncError && (
                            <SyncAccountButton onSync={refreshNodes} />
                        )}
                        <button
                            type="button"
                            onClick={() => refreshNodes()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleMapClick = () => {
        setIsNavigating(true);
        setTimeout(() => {
            navigate('/home');
        }, 300);
    };

    return (
        <div className="h-screen flex flex-col p-5 bg-slate-50 font-sans overflow-hidden">
            <div className={`fixed inset-0 bg-white/40 backdrop-blur-[2px] z-[9999] pointer-events-none transition-opacity duration-500 ease-in-out ${isNavigating ? 'opacity-100' : 'opacity-0'}`} />
            <div className={`fixed top-0 left-0 right-0 h-1 bg-blue-500 z-[10000] pointer-events-none transition-all duration-700 ${isNavigating ? 'w-full opacity-100' : 'w-0 opacity-0'}`} />

            <div className="flex-none flex items-center justify-between mb-5">
                <h1 className="text-4xl font-extrabold text-blue-600 tracking-tight">System Dashboard</h1>
                <span className="text-base font-semibold text-slate-400">Last updated: <span className="text-slate-600">{now}</span></span>
            </div>

            <div className="flex-none mb-5">
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-md text-sm font-black transition-all ${activeTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('complete')}
                        className={`px-4 py-2 rounded-md text-sm font-black transition-all ${activeTab === 'complete' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Detailed View
                    </button>
                </div>
            </div>

            {activeTab === 'complete' ? (
                <div className="flex-1 overflow-auto">
                    <CompleteDashboard />
                </div>
            ) : (
                <>
                    <div className="flex-none grid grid-cols-12 gap-4 mb-4" style={{ height: '250px' }}>
                        <div className="col-span-8 flex flex-col gap-4 h-full">
                            <div className="flex-1 grid grid-cols-4 gap-4">
                                <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-white/50 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assets</p>
                                        <Activity size={18} className="text-blue-500" />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <h2 className="text-3xl font-black text-slate-800">{nodes.length}</h2>
                                        <span className="text-[10px] font-bold text-slate-400">UNITS</span>
                                    </div>
                                </div>
                                <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-white/50 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alerts</p>
                                        <AlertTriangle size={18} className="text-red-500" />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <h2 className="text-3xl font-black text-red-600">{activeAlerts.length}</h2>
                                        <span className="text-[10px] font-bold text-red-400">ACTIVE</span>
                                    </div>
                                </div>
                                <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-white/50 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Health</p>
                                        <Server size={18} className="text-green-500" />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <h2 className="text-2xl font-black text-green-600 uppercase">{health?.status || 'OK'}</h2>
                                    </div>
                                </div>
                                <LiveFeedCard nodeId={nodes.find(n => n.status === 'Online')?.id} />
                            </div>
                            <div className="flex-1 grid grid-cols-4 gap-4">
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 flex flex-col justify-center items-start gap-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">EvaraTank</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-blue-600">{localStats.tanks.active}</span>
                                        <span className="text-lg font-bold text-slate-300">/{localStats.tanks.total}</span>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 flex flex-col justify-center items-start gap-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">EvaraFlow</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-cyan-600">{localStats.flow.active}</span>
                                        <span className="text-lg font-bold text-slate-300">/{localStats.flow.total}</span>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 flex flex-col justify-center items-start gap-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">EvaraDeep</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-purple-600">{localStats.deep.active}</span>
                                        <span className="text-lg font-bold text-slate-300">/{localStats.deep.total}</span>
                                    </div>
                                </div>
                                <div className="bg-red-50 rounded-2xl border border-red-100 shadow-sm px-5 flex flex-col justify-center items-start gap-1">
                                    <span className="text-[10px] font-black text-red-400 uppercase">Down</span>
                                    <span className="text-3xl font-black text-red-600">{localStats.alerts}</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-4 h-full">
                            <MiniMap onExpand={handleMapClick} nodes={nodes} />
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <Server size={20} className="text-blue-500" /> Device Fleet
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <tbody className="divide-y divide-slate-50">
                                        {deviceFleet.map(dev => (
                                            <tr key={dev.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/node/${dev.id}`)}>
                                                <td className="px-5 py-3">
                                                    <div className="font-bold text-slate-700 text-sm">{dev.name}</div>
                                                    <div className="text-[10px] text-blue-400 font-bold uppercase">{dev.type}</div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className={`flex items-center gap-2 font-black text-[10px] ${dev.status === 'Online' ? 'text-green-600' : 'text-red-500'}`}>
                                                        {dev.status}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <AlertTriangle size={20} className="text-red-500" /> Active Alerts
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {activeAlerts.length === 0 ? (
                                    <div className="text-center text-slate-400 mt-10 text-xs font-bold uppercase tracking-widest">Clear</div>
                                ) : activeAlerts.map(a => (
                                    <div key={a.id} className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-black text-red-600">{a.rule?.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{new Date(a.triggered_at).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-500">Value {a.value_at_time} {a.rule?.condition} {a.rule?.threshold}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-50 flex-none bg-slate-50/50">
                                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <FileText size={20} className="text-purple-500" /> Analytics
                                </h2>
                            </div>
                            <div className="flex-1 p-5 flex flex-col gap-3">
                                <button 
                                    onClick={() => navigate('/analytics')}
                                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left group"
                                >
                                    <Download size={20} className="text-slate-400 group-hover:text-blue-500" />
                                    <div>
                                        <div className="text-sm font-black text-slate-700">Daily Summary</div>
                                        <div className="text-[10px] font-bold text-slate-400">PDF Report</div>
                                    </div>
                                </button>
                                <button 
                                    onClick={() => navigate('/analytics')}
                                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50 transition-all text-left group"
                                >
                                    <Download size={20} className="text-slate-400 group-hover:text-purple-500" />
                                    <div>
                                        <div className="text-sm font-black text-slate-700">Custom Export</div>
                                        <div className="text-[10px] font-bold text-slate-400">CSV/Excel</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const DashboardWithBoundary = () => (
    <ErrorBoundary>
        <Dashboard />
    </ErrorBoundary>
);

export default DashboardWithBoundary;
