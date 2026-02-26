import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Cpu } from 'lucide-react';
import EvaraTank from './EvaraTank';
import EvaraDeep from './EvaraDeep';
import EvaraFlow from './EvaraFlow';
import type { NodeRow, NodeCategory, AnalyticsType } from '../types/database';
import clsx from 'clsx';
import { MotorControl } from '../components/MotorControl';

// ─── Category label helpers ───────────────────────────────────────────────────

const CAT_LABEL: Record<NodeCategory, string> = {
    OHT: 'Overhead Tank',
    Sump: 'Sump',
    Borewell: 'Borewell (IIIT)',
    GovtBorewell: 'Borewell (Govt)',
    PumpHouse: 'Pump House',
    FlowMeter: 'Flow Meter',
};

const CAT_STYLES: Record<NodeCategory, { badge: string; accentBg: string; accentText: string }> = {
    OHT: { badge: 'bg-blue-100 text-blue-700', accentBg: 'from-blue-50 to-indigo-50', accentText: 'text-blue-700' },
    Sump: { badge: 'bg-emerald-100 text-emerald-700', accentBg: 'from-emerald-50 to-teal-50', accentText: 'text-emerald-700' },
    Borewell: { badge: 'bg-amber-100 text-amber-700', accentBg: 'from-amber-50 to-yellow-50', accentText: 'text-amber-700' },
    GovtBorewell: { badge: 'bg-slate-200 text-slate-700', accentBg: 'from-slate-50 to-gray-100', accentText: 'text-slate-600' },
    PumpHouse: { badge: 'bg-purple-100 text-purple-700', accentBg: 'from-purple-50 to-violet-50', accentText: 'text-purple-700' },
    FlowMeter: { badge: 'bg-cyan-100 text-cyan-700', accentBg: 'from-cyan-50 to-sky-50', accentText: 'text-cyan-700' },
};

const ANALYTICS_LABEL: Record<AnalyticsType, { label: string; badge: string }> = {
    EvaraTank: { label: 'EvaraTank', badge: 'bg-indigo-100 text-indigo-700' },
    EvaraDeep: { label: 'EvaraDeep', badge: 'bg-sky-100 text-sky-700' },
    EvaraFlow: { label: 'EvaraFlow', badge: 'bg-cyan-100 text-cyan-700' },
};

// ─── NodeDetails (smart router) ───────────────────────────────────────────────

import api from '../services/api';

const NodeDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Demo mode - bypass authentication for development
    const isDemoMode = import.meta.env.DEV && false; // Set to false to require real data

    const [node, setNode] = useState<NodeRow | null>(null);
    const [nodeLoading, setNodeLoading] = useState(true);
    const [nodeError, setNodeError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchNodeDetails = async () => {
            setNodeLoading(true);
            try {
                console.log("🔍 Fetching node details for ID:", id);
                const response = await api.get<NodeRow>(`/nodes/${id}`);
                console.log("� Node response received:", response.data);
                setNode(response.data);
                setNodeError(null);
            } catch (err: any) {
                console.error("❌ Error fetching node details:", err);
                setNodeError(err.response?.data?.detail || "Failed to load node");
            } finally {
                setNodeLoading(false);
            }
        };

        fetchNodeDetails();
    }, [id]);

    // Unknown node — show graceful 404
    if (nodeLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-32 text-center bg-slate-50">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Loading node...</p>
            </div>
        );
    }

    if (nodeError || !node) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-32 text-center bg-slate-50">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                    <Cpu size={28} className="text-slate-300" />
                </div>
                <h2 className="text-lg font-bold text-slate-600 mb-1">Node not found</h2>
                <p className="text-sm text-slate-400 mb-6">ID: <span className="font-mono">{id}</span></p>
                {nodeError && <p className="text-sm text-red-600 mb-6">{nodeError}</p>}
                <button
                    onClick={() => navigate('/nodes')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                    <ArrowLeft size={15} /> Back to All Nodes
                </button>
            </div>
        );
    }

    const fallbackCatStyle = { badge: 'bg-slate-100 text-slate-700', accentBg: 'from-slate-50 to-slate-100', accentText: 'text-slate-700' };
    const fallbackAnalLabel = { label: node.analytics_type || 'Unknown', badge: 'bg-slate-100 text-slate-700' };

    const catStyles = CAT_STYLES[node.category as NodeCategory] || fallbackCatStyle;
    const analLabel = ANALYTICS_LABEL[node.analytics_type as AnalyticsType] || fallbackAnalLabel;
    const isOnline = node.status === 'Online';

    return (
        <div className="flex flex-col min-h-full bg-slate-50">
            {/* Demo Mode Banner */}
            {isDemoMode && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-600 font-bold text-sm">🔓 Demo Mode</span>
                            <span className="text-yellow-700 text-xs">Analytics are shown with sample data</span>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="text-xs text-yellow-600 hover:text-yellow-700 font-semibold underline"
                        >
                            Login for Real Data
                        </button>
                    </div>
                </div>
            )}

            {/* ── Context header bar ── */}
            <div className={clsx('bg-gradient-to-r border-b border-slate-200 shadow-sm', catStyles.accentBg)}>
                <div className="max-w-screen-2xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">

                    {/* Back button */}
                    <button
                        onClick={() => navigate('/nodes')}
                        className="flex items-center gap-2 px-3 py-2 bg-white/80 hover:bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 transition-all shadow-sm self-start sm:self-auto flex-shrink-0"
                    >
                        <ArrowLeft size={15} /> All Nodes
                    </button>

                    {/* Node info */}
                    <div className="flex-1 flex flex-wrap items-center gap-3 min-w-0">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg font-extrabold text-slate-800 leading-tight">{node.label}</h1>
                                <span className="font-mono text-xs text-slate-400 bg-white/70 px-2 py-0.5 rounded-md border border-slate-200">{node.node_key}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                <MapPin size={11} />
                                <span className="font-medium">{node.location_name}</span>
                                <span className="text-slate-300">·</span>
                                <span>{node.capacity}</span>
                            </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={clsx('text-[11px] font-bold px-2.5 py-1 rounded-lg', catStyles.badge)}>
                                {CAT_LABEL[node.category as NodeCategory]}
                            </span>
                            <span className={clsx('text-[11px] font-bold px-2.5 py-1 rounded-lg', analLabel.badge)}>
                                {analLabel.label}
                            </span>
                            <span className={clsx(
                                'flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg',
                                isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                            )}>
                                <span className={clsx('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-400')} />
                                {node.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Analytics page — rendered inline, no sidebar ── */}
            <div className="flex-1 max-w-screen-2xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    {node.analytics_type === 'EvaraTank' && <EvaraTank embedded nodeId={node.id} />}
                    {node.analytics_type === 'EvaraDeep' && <EvaraDeep embedded nodeId={node.id} />}
                    {node.analytics_type === 'EvaraFlow' && <EvaraFlow embedded nodeId={node.id} />}
                </div>

                <div className="lg:col-span-1 space-y-6">
                    {/* Only show Motor Control for certain categories/analytics types */}
                    {(node.category === 'PumpHouse' || node.analytics_type === 'EvaraDeep') && (
                        <MotorControl
                            nodeId={node.id}
                            initialStatus={node.status === 'Online'}
                        />
                    )}

                    {/* Additional Metadata / Node Info Card */}
                    <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Device Metadata</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400">Installation Date</p>
                                <p className="text-sm font-bold text-slate-700">Oct 12, 2023</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400">Firmware Version</p>
                                <p className="text-sm font-bold text-slate-700 font-mono text-blue-600">v2.4.1-stable</p>
                            </div>
                            <div className="pt-2 border-t border-slate-50">
                                <button className="w-full py-2 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors">
                                    Refresh Device Diagnostics
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NodeDetails;
