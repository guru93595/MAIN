import { MapContainer, TileLayer, ZoomControl, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import { Activity, LayoutDashboard, Layers } from 'lucide-react';
import clsx from 'clsx';
import { useNodes } from '../hooks/useNodes';
import { usePipelines } from '../hooks/usePipelines';
import { MapMarkerNode } from '../components/MapMarkerNode';

export const Home = () => {
    const [showStatusOverview, setShowStatusOverview] = useState(false);
    const [showSystemDashboard, setShowSystemDashboard] = useState(false);
    const [showIndex, setShowIndex] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [activePipeline, setActivePipeline] = useState<string | null>(null);


    const { nodes, loading: nodesLoading } = useNodes();
    const { pipelines, loading: pipelinesLoading } = usePipelines();

    if (nodesLoading || pipelinesLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-slate-50 gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Synchronizing Map Data...</p>
            </div>
        );
    }

    const handleFilterClick = (filter: string) => {
        setActiveFilter(prev => prev === filter ? null : filter);
    };

    const handlePipelineClick = (pipeline: string) => {
        setActivePipeline(prev => prev === pipeline ? null : pipeline);
    };

    // Derived state for filtering
    const pumpHouses = nodes.filter(n => n.category === 'PumpHouse');
    const sumps = nodes.filter(n => n.category === 'Sump');
    const ohts = nodes.filter(n => n.category === 'OHT');
    const borewells = nodes.filter(n => n.category === 'Borewell');
    const govtBorewells = nodes.filter(n => n.category === 'GovtBorewell');

    // Combine for counts
    const onlineNodes = nodes.filter(n => n.status === 'Online');
    const offlineNodes = nodes.filter(n => n.status === 'Offline' || n.status === 'Alert' || n.status === 'Maintenance');

    // Center Map on PH-01 area
    const position: [number, number] = [17.4456, 78.3490];

    return (
        <div className="relative w-full h-[calc(100vh-64px)] flex flex-col">
            {/* Map Container */}
            <div className="flex-1 relative z-0">
                <MapContainer
                    center={position}
                    zoom={17}
                    scrollWheelZoom={true}
                    zoomControl={false}
                    className="w-full h-full"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Pipelines */}
                    {pipelines.filter(pipe => {
                        if (activePipeline === null) return false;
                        if (activePipeline === 'watersupply') return !pipe.name.includes('PIPE');
                        if (activePipeline === 'borewellwater') return pipe.name.includes('PIPE');
                        return false;
                    }).map((pipe) => (
                        <Polyline
                            key={pipe.id}
                            positions={pipe.positions}
                            pathOptions={{ color: pipe.color, weight: 4, opacity: 0.8 }}
                        >
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-bold text-slate-800">{pipe.name}</h3>
                                </div>
                            </Popup>
                        </Polyline>
                    ))}

                    {/* Map Markers */}
                    {(activeFilter === null || activeFilter === 'pumphouse') && pumpHouses.map(node => (
                        <MapMarkerNode key={node.id} node={node} />
                    ))}
                    {(activeFilter === null || activeFilter === 'sump') && sumps.map(node => (
                        <MapMarkerNode key={node.id} node={node} />
                    ))}
                    {(activeFilter === null || activeFilter === 'oht') && ohts.map(node => (
                        <MapMarkerNode key={node.id} node={node} />
                    ))}
                    {(activeFilter === null || activeFilter === 'borewell') && borewells.map(node => (
                        <MapMarkerNode key={node.id} node={node} />
                    ))}
                    {(activeFilter === null || activeFilter === 'govtborewell') && govtBorewells.map(node => (
                        <MapMarkerNode key={node.id} node={node} />
                    ))}

                    <ZoomControl position="bottomright" />
                </MapContainer>
            </div>

            {/* Overlay Buttons */}
            <div className="absolute top-4 right-4 flex flex-col gap-3 z-[400]">
                <button
                    onClick={() => { setShowStatusOverview(!showStatusOverview); setShowSystemDashboard(false); }}
                    className={clsx(
                        "bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200 hover:bg-white transition-all group flex items-center gap-3",
                        showStatusOverview && "ring-2 ring-blue-400"
                    )}
                >
                    <div className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        showStatusOverview ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                    )}>
                        <Activity size={20} />
                    </div>
                    <span className="font-bold text-slate-700 pr-2">Status Overview</span>
                </button>

                <button
                    onClick={() => { setShowSystemDashboard(!showSystemDashboard); setShowStatusOverview(false); }}
                    className={clsx(
                        "bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200 hover:bg-white transition-all group flex items-center gap-3",
                        showSystemDashboard && "ring-2 ring-green-400"
                    )}
                >
                    <div className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        showSystemDashboard ? "bg-green-600 text-white" : "bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white"
                    )}>
                        <LayoutDashboard size={20} />
                    </div>
                    <span className="font-bold text-slate-700 pr-2">System Analytics</span>
                </button>
            </div>

            {/* Status Overview Panel */}
            <div className={clsx(
                "absolute top-28 right-4 z-[400] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 w-80 transition-all duration-300 origin-top-right overflow-hidden",
                showStatusOverview ? "opacity-100 scale-100 max-h-[600px]" : "opacity-0 scale-95 max-h-0 pointer-events-none"
            )}>
                <div className="p-5">
                    <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-blue-600" /> Infrastructure Status
                    </h3>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-green-50 rounded-lg p-2.5 text-center">
                            <div className="text-lg font-black text-green-600">{onlineNodes.length}</div>
                            <div className="text-[10px] font-bold text-green-700">Online</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-2.5 text-center">
                            <div className="text-lg font-black text-red-600">{offlineNodes.length}</div>
                            <div className="text-[10px] font-bold text-red-700">Down</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                            <div className="text-lg font-black text-blue-600">{nodes.length}</div>
                            <div className="text-[10px] font-bold text-blue-700">Total</div>
                        </div>
                    </div>

                    {/* Asset Breakdown */}
                    <div className="space-y-3">
                        {[
                            { name: 'Pump Houses', total: pumpHouses.length, working: pumpHouses.filter(p => p.status === 'Online').length, color: '#9333ea', bg: 'bg-purple-50' },
                            { name: 'Sumps', total: sumps.length, working: sumps.filter(s => s.status === 'Online').length, color: '#16a34a', bg: 'bg-green-50' },
                            { name: 'Overhead Tanks', total: ohts.length, working: ohts.filter(o => o.status === 'Online').length, color: '#2563eb', bg: 'bg-blue-50' },
                            { name: 'Borewells', total: borewells.length + govtBorewells.length, working: [...borewells, ...govtBorewells].filter(b => b.status === 'Online').length, color: '#eab308', bg: 'bg-yellow-50' },
                        ].map((asset, i) => (
                            <div key={i} className={clsx("rounded-xl p-3", asset.bg)}>
                                <div className="flex justify-between items-center mb-1.5 font-bold">
                                    <span className="text-xs text-slate-700">{asset.name}</span>
                                    <span className="text-xs" style={{ color: asset.color }}>{asset.working}/{asset.total}</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/50 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${asset.total > 0 ? (asset.working / asset.total) * 100 : 0}%`, background: asset.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Index Toggle */}
            <div className="absolute bottom-6 left-6 z-[1000] flex flex-col items-start gap-3">
                <button
                    onClick={() => setShowIndex(!showIndex)}
                    className="bg-white p-3 rounded-full shadow-xl border border-slate-200 text-slate-500 hover:text-blue-600 transition-all hover:scale-110 active:scale-95 pointer-events-auto"
                >
                    <Layers size={20} />
                </button>

                <div className={clsx(
                    "bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 w-64 flex flex-col transition-all duration-300 origin-bottom-left overflow-hidden pointer-events-auto",
                    showIndex ? "opacity-100 scale-100 max-h-[500px]" : "opacity-0 scale-95 max-h-0 pointer-events-none"
                )}>
                    <div className="p-4">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">MAP LAYERS</h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handlePipelineClick('watersupply')}>
                                <div className={clsx("w-8 h-1 rounded-full transition-all", activePipeline === 'watersupply' ? "bg-cyan-500 scale-x-125" : "bg-cyan-400/30 group-hover:bg-cyan-400")} />
                                <span className={clsx("text-xs font-bold transition-colors", activePipeline === 'watersupply' ? "text-cyan-600" : "text-slate-500")}>Water Supply Lines</span>
                            </div>
                            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handlePipelineClick('borewellwater')}>
                                <div className={clsx("w-8 h-1 rounded-full transition-all", activePipeline === 'borewellwater' ? "bg-indigo-500 scale-x-125" : "bg-indigo-400/30 group-hover:bg-indigo-400")} />
                                <span className={clsx("text-xs font-bold transition-colors", activePipeline === 'borewellwater' ? "text-indigo-600" : "text-slate-500")}>Borewell Lines</span>
                            </div>
                        </div>

                        <div className="my-5 border-t border-slate-100" />

                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">ASSET CLASSIFICATION</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'pumphouse', label: 'Pump House', color: 'bg-purple-100 text-purple-600' },
                                { id: 'sump', label: 'Sump', color: 'bg-green-100 text-green-600' },
                                { id: 'oht', label: 'OHT', color: 'bg-blue-100 text-blue-600' },
                                { id: 'borewell', label: 'Borewell', color: 'bg-yellow-100 text-yellow-600' },
                            ].map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => handleFilterClick(item.id)}
                                    className={clsx(
                                        "p-2 rounded-xl border transition-all cursor-pointer text-center",
                                        activeFilter === item.id ? "bg-slate-800 border-slate-800 text-white shadow-lg" : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200"
                                    )}
                                >
                                    <span className="text-[10px] font-black">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
