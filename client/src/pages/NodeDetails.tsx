import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Cpu, Edit3, Save, X, Loader2 } from 'lucide-react';
import EvaraTank from './EvaraTank';
import EvaraDeep from './EvaraDeep';
import EvaraFlow from './EvaraFlow';
import type { NodeCategory, AnalyticsType } from '../types/database';
import clsx from 'clsx';
import { MotorControl } from '../components/MotorControl';
import api from '../services/api';
import { adminService } from '../services/admin';

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

const NodeDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [node, setNode] = useState<any | null>(null);
    const [nodeLoading, setNodeLoading] = useState(true);
    const [nodeError, setNodeError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editData, setEditData] = useState<any>({});

    const fetchNodeDetails = async () => {
        if (!id) return;
        setNodeLoading(true);
        try {
            const response = await api.get(`/nodes/${id}`);
            setNode(response.data);
            setNodeError(null);
        } catch (err: any) {
            setNodeError(err.response?.data?.detail || "Failed to load node");
        } finally {
            setNodeLoading(false);
        }
    };

    useEffect(() => {
        fetchNodeDetails();
    }, [id]);

    // Initialize edit data when entering edit mode
    const startEditing = () => {
        const tsMapping = node?.thingspeak_mappings?.[0];
        const tc = node?.config_tank;
        setEditData({
            thingspeak_channel_id: tsMapping?.channel_id || node?.thingspeak_channel_id || '',
            thingspeak_read_api_key: tsMapping?.read_api_key || node?.thingspeak_read_api_key || '',
            tank_shape: tc?.tank_shape || 'cylinder',
            dimension_unit: tc?.dimension_unit || 'm',
            radius: tc?.radius?.toString() || '',
            height: tc?.height?.toString() || '',
            length: tc?.length?.toString() || '',
            breadth: tc?.breadth?.toString() || '',
            lat: node?.lat?.toString() || '',
            lng: (node?.lng || node?.long)?.toString() || '',
        });
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditData({});
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Build update payload
            const payload: any = {
                node_key: node.node_key,
                label: node.label,
                category: node.category,
                analytics_type: node.analytics_type,
                lat: editData.lat ? parseFloat(editData.lat) : null,
                lng: editData.lng ? parseFloat(editData.lng) : null,
            };

            // ThingSpeak mappings
            if (editData.thingspeak_channel_id) {
                payload.thingspeak_mappings = [{
                    channel_id: editData.thingspeak_channel_id,
                    read_api_key: editData.thingspeak_read_api_key,
                }];
            }

            // Tank config
            if (node.analytics_type === 'EvaraTank') {
                const tankConfig: any = {
                    tank_shape: editData.tank_shape,
                    dimension_unit: editData.dimension_unit,
                    height: parseFloat(editData.height) || null,
                };
                if (editData.tank_shape === 'cylinder') {
                    tankConfig.radius = parseFloat(editData.radius) || null;
                } else {
                    tankConfig.length = parseFloat(editData.length) || null;
                    tankConfig.breadth = parseFloat(editData.breadth) || null;
                }
                payload.config_tank = tankConfig;
            }

            await adminService.updateDevice(node.id, payload);
            await fetchNodeDetails(); // Refresh data
            setIsEditing(false);
        } catch (err: any) {
            console.error('Save failed:', err);
            alert(err.response?.data?.detail || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

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

    // Derive display values from node
    const tsMapping = node.thingspeak_mappings?.[0];
    const channelId = tsMapping?.channel_id || node.thingspeak_channel_id || '—';
    const readApiKey = tsMapping?.read_api_key || node.thingspeak_read_api_key || '—';
    const tc = node.config_tank;

    const inputCls = "w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all";
    const metaLabel = "text-[10px] font-bold text-slate-400 uppercase tracking-wider";
    const metaValue = "text-sm font-semibold text-slate-700 mt-0.5";

    return (
        <div className="flex flex-col min-h-full bg-slate-50">
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
                                <span className="font-medium">{node.location_name || 'No location'}</span>
                                <span className="text-slate-300">·</span>
                                <span>{node.capacity || node.analytics_type}</span>
                            </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={clsx('text-[11px] font-bold px-2.5 py-1 rounded-lg', catStyles.badge)}>
                                {CAT_LABEL[node.category as NodeCategory] || node.category}
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

                    {/* ── DEVICE METADATA — Expanded with real data ── */}
                    <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Device Details</h3>
                            {!isEditing ? (
                                <button
                                    onClick={startEditing}
                                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors uppercase tracking-wider"
                                >
                                    <Edit3 size={11} /> Edit
                                </button>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={cancelEditing}
                                        disabled={saving}
                                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:bg-slate-50 rounded-lg transition-colors uppercase tracking-wider"
                                    >
                                        <X size={11} /> Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors uppercase tracking-wider disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3.5">
                            {/* Node Key */}
                            <div>
                                <p className={metaLabel}>Hardware ID</p>
                                <p className={`${metaValue} font-mono`}>{node.node_key}</p>
                            </div>

                            {/* Status */}
                            <div>
                                <p className={metaLabel}>Status</p>
                                <p className={metaValue}>
                                    <span className={clsx('inline-flex items-center gap-1.5', isOnline ? 'text-green-600' : 'text-red-500')}>
                                        <span className={clsx('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-green-500' : 'bg-red-400')} />
                                        {node.status}
                                    </span>
                                </p>
                            </div>

                            {/* Created At */}
                            <div>
                                <p className={metaLabel}>Created At</p>
                                <p className={metaValue}>{node.created_at ? new Date(node.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</p>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-100 pt-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">ThingSpeak</p>
                            </div>

                            {/* ThingSpeak */}
                            {isEditing ? (
                                <>
                                    <div>
                                        <p className={metaLabel}>Channel ID</p>
                                        <input
                                            value={editData.thingspeak_channel_id}
                                            onChange={e => setEditData({ ...editData, thingspeak_channel_id: e.target.value })}
                                            className={inputCls}
                                            placeholder="e.g. 2489123"
                                        />
                                    </div>
                                    <div>
                                        <p className={metaLabel}>Read API Key</p>
                                        <input
                                            value={editData.thingspeak_read_api_key}
                                            onChange={e => setEditData({ ...editData, thingspeak_read_api_key: e.target.value })}
                                            className={inputCls}
                                            placeholder="e.g. ABCD1234EFGH5678"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <p className={metaLabel}>Channel ID</p>
                                        <p className={`${metaValue} font-mono text-blue-600`}>{channelId}</p>
                                    </div>
                                    <div>
                                        <p className={metaLabel}>Read API Key</p>
                                        <p className={`${metaValue} font-mono text-xs`} style={{ wordBreak: 'break-all' }}>{readApiKey !== '—' ? '••••••••' + readApiKey.slice(-4) : '—'}</p>
                                    </div>
                                </>
                            )}

                            {/* Tank Config — only for EvaraTank */}
                            {node.analytics_type === 'EvaraTank' && (
                                <>
                                    <div className="border-t border-slate-100 pt-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tank Specifications</p>
                                    </div>

                                    {isEditing ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <p className={metaLabel}>Shape</p>
                                                    <select
                                                        className={inputCls}
                                                        value={editData.tank_shape}
                                                        onChange={e => setEditData({ ...editData, tank_shape: e.target.value, radius: '', length: '', breadth: '' })}
                                                    >
                                                        <option value="cylinder">Cylinder</option>
                                                        <option value="rectangular">Rectangular</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <p className={metaLabel}>Unit</p>
                                                    <select
                                                        className={inputCls}
                                                        value={editData.dimension_unit}
                                                        onChange={e => setEditData({ ...editData, dimension_unit: e.target.value })}
                                                    >
                                                        <option value="m">Meters</option>
                                                        <option value="cm">cm</option>
                                                        <option value="feet">Feet</option>
                                                        <option value="inches">Inches</option>
                                                    </select>
                                                </div>
                                            </div>
                                            {editData.tank_shape === 'cylinder' ? (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className={metaLabel}>Radius</p>
                                                        <input type="number" step="0.01" value={editData.radius} onChange={e => setEditData({ ...editData, radius: e.target.value })} className={inputCls} placeholder="e.g. 1.5" />
                                                    </div>
                                                    <div>
                                                        <p className={metaLabel}>Height</p>
                                                        <input type="number" step="0.01" value={editData.height} onChange={e => setEditData({ ...editData, height: e.target.value })} className={inputCls} placeholder="e.g. 2.0" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <p className={metaLabel}>Length</p>
                                                        <input type="number" step="0.01" value={editData.length} onChange={e => setEditData({ ...editData, length: e.target.value })} className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <p className={metaLabel}>Breadth</p>
                                                        <input type="number" step="0.01" value={editData.breadth} onChange={e => setEditData({ ...editData, breadth: e.target.value })} className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <p className={metaLabel}>Height</p>
                                                        <input type="number" step="0.01" value={editData.height} onChange={e => setEditData({ ...editData, height: e.target.value })} className={inputCls} />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className={metaLabel}>Shape</p>
                                                    <p className={`${metaValue} capitalize`}>{tc?.tank_shape || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className={metaLabel}>Unit</p>
                                                    <p className={metaValue}>{tc?.dimension_unit || '—'}</p>
                                                </div>
                                            </div>
                                            {tc?.tank_shape === 'cylinder' ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className={metaLabel}>Radius</p>
                                                        <p className={metaValue}>{tc?.radius ?? '—'} {tc?.dimension_unit || ''}</p>
                                                    </div>
                                                    <div>
                                                        <p className={metaLabel}>Height</p>
                                                        <p className={metaValue}>{tc?.height ?? '—'} {tc?.dimension_unit || ''}</p>
                                                    </div>
                                                </div>
                                            ) : tc?.tank_shape === 'rectangular' ? (
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div>
                                                        <p className={metaLabel}>Length</p>
                                                        <p className={metaValue}>{tc?.length ?? '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className={metaLabel}>Breadth</p>
                                                        <p className={metaValue}>{tc?.breadth ?? '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className={metaLabel}>Height</p>
                                                        <p className={metaValue}>{tc?.height ?? '—'}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">No tank config set</p>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            {/* Location */}
                            <div className="border-t border-slate-100 pt-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Location</p>
                            </div>
                            {isEditing ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className={metaLabel}>Latitude</p>
                                        <input type="number" step="0.000001" value={editData.lat} onChange={e => setEditData({ ...editData, lat: e.target.value })} className={inputCls} placeholder="17.448" />
                                    </div>
                                    <div>
                                        <p className={metaLabel}>Longitude</p>
                                        <input type="number" step="0.000001" value={editData.lng} onChange={e => setEditData({ ...editData, lng: e.target.value })} className={inputCls} placeholder="78.384" />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className={metaLabel}>Latitude</p>
                                        <p className={`${metaValue} font-mono text-xs`}>{node.lat || '—'}</p>
                                    </div>
                                    <div>
                                        <p className={metaLabel}>Longitude</p>
                                        <p className={`${metaValue} font-mono text-xs`}>{node.lng || node.long || '—'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NodeDetails;
