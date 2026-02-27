import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/admin';
import {
    Users, Network, Map, Settings,
    Activity, AlertTriangle, Trash2, Edit2
} from 'lucide-react';
import { useNodes } from '../../hooks/useNodes';
import api from '../../services/api';
import { useToast } from '../../components/ToastProvider';
import { ActionCard } from '../../components/admin/ActionCard';
import { Modal } from '../../components/ui/Modal';
import { AddCommunityForm } from '../../components/admin/forms/AddCommunityForm';
import { AddCustomerForm } from '../../components/admin/forms/AddCustomerForm';
import { AddDeviceForm } from '../../components/admin/forms/AddDeviceForm';
import { ConfigForm } from '../../components/admin/forms/ConfigForm';

// Stat Item Component
const StatItem = ({ label, value, trend, trendUp }: { label: string, value: string, trend?: string, trendUp?: boolean }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{label}</p>
        <div className="flex items-end gap-3">
            <span className="text-2xl font-bold text-slate-800">{value}</span>
            {trend && (
                <span className={`text-xs font-bold mb-1 ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
                    {trend}
                </span>
            )}
        </div>
    </div>
);

type ModalType = 'community' | 'customer' | 'device' | 'config' | null;

const AdminDashboard = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [communities, setCommunities] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);
    const [detailsLoading, setDetailsLoading] = useState(true);
    const [editingNode, setEditingNode] = useState<any>(null);
    const { nodes, loading: nodesLoading } = useNodes();

    // Load stats first (fast — SQL COUNT), then load heavy lists in background
    useEffect(() => {
        // Priority 1: Stats — fast SQL COUNT
        adminService.getStats()
            .then(d => setStats(d))
            .catch(e => console.error('Stats fetch failed:', e))
            .finally(() => setStatsLoading(false));

        // Priority 2: Lists & audit — load independently, don't block UI
        Promise.all([
            adminService.getCustomers(),
            adminService.getCommunities(),
            adminService.getAuditLogs(0, 10)
        ])
            .then(([custData, commData, auditData]) => {
                setCustomers(custData);
                setCommunities(commData);
                setAuditLogs(auditData);
            })
            .catch(e => console.error('Details fetch failed:', e))
            .finally(() => setDetailsLoading(false));
    }, []);

    const fetchData = async () => {
        setStatsLoading(true);
        setDetailsLoading(true);
        try {
            const [custData, commData, statsData, auditData] = await Promise.all([
                adminService.getCustomers(),
                adminService.getCommunities(),
                adminService.getStats(),
                adminService.getAuditLogs(0, 10)
            ]);
            setCustomers(custData);
            setCommunities(commData);
            setStats(statsData);
            setAuditLogs(auditData);
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setStatsLoading(false);
            setDetailsLoading(false);
        }
    };

    // Use Real-time Stats from API
    const totalNodes = stats?.total_nodes || 0;
    const activeAlerts = stats?.active_alerts || 0;
    const totalCustomers = stats?.total_customers || 0;
    const totalCommunities = stats?.total_communities || 0;
    const healthPercentage = stats?.system_health || '100';

    const handleAction = (type: ModalType) => {
        setActiveModal(type);
    };

    const handleClose = () => {
        setActiveModal(null);
        setEditingNode(null);
    };

    const handleSubmit = async (data: any) => {
        try {
            if (activeModal === 'community') {
                await adminService.createCommunity(data);
                showToast("Community created successfully!", "success");
            }
            if (activeModal === 'customer') {
                await adminService.createCustomer(data);
                showToast("Customer registered and credentials synced!", "success");
            }
            if (activeModal === 'device') {
                showToast(editingNode ? "Node updated successfully!" : "DEVICE ADDED SUCCESSFULLY", "success");
            }

            handleClose();
            // Refresh data
            setStatsLoading(true);
            await fetchData();
        } catch (error) {
            console.error('Submission failed:', error);
            showToast("Action failed. Please try again.", "error");
        }
    };


    return (
        <div className="space-y-8">
            {/* ─── HEADER ─── */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">System Overview</h2>
                <p className="text-slate-500 text-sm">
                    {user?.role === 'distributor'
                        ? `Territory management for ${user.displayName}`
                        : 'Real-time infrastructure monitoring and management.'}
                </p>
            </div>

            {/* ─── STATS ROW ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-pulse">
                            <div className="h-3 bg-slate-200 rounded w-2/3 mb-3"></div>
                            <div className="h-7 bg-slate-100 rounded w-1/2"></div>
                        </div>
                    ))
                ) : (
                    <>
                        <StatItem label="Total Nodes" value={totalNodes.toString()} trend="+2% this week" trendUp />
                        <StatItem label="Active Alerts" value={activeAlerts.toString()} trend={activeAlerts > 0 ? "Needs Attention" : "All Clear"} trendUp={activeAlerts === 0} />
                        <StatItem label="Total Customers" value={totalCustomers.toString()} trend="+1 new" trendUp />
                        <StatItem label="System Health" value={`${healthPercentage}%`} trend="Stable" trendUp />
                    </>
                )}
            </div>

            {/* ─── ACTION GRID ─── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Activity size={18} className="text-blue-600" />
                        Quick Actions
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <ActionCard
                        title="Add Community"
                        description="Create new zones or residential communities for grouping nodes."
                        icon={Map}
                        color="blue"
                        stats={`${totalCommunities} Zones`}
                        onClick={() => handleAction('community')}
                    />
                    <ActionCard
                        title="Add Customer"
                        description="Register new clients and assign them to existing communities."
                        icon={Users}
                        color="purple"
                        stats={`${totalCustomers} Active`}
                        onClick={() => handleAction('customer')}
                    />
                    <ActionCard
                        title="Add Device"
                        description="Provision new hardware nodes and link them to customers."
                        icon={Network}
                        color="green"
                        stats="PROVISION"
                        onClick={() => handleAction('device')}
                    />
                    <ActionCard
                        title="System Config"
                        description="Update firmware versions and configure global data rates."
                        icon={Settings}
                        color="amber"
                        stats="v2.1.0"
                        onClick={() => handleAction('config')}
                    />
                </div>
            </div>

            {/* ─── LIVE INSIGHTS GRID ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. System Status */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800">Field Health</h3>
                    </div>
                    <div className="p-6">
                        {activeAlerts > 0 ? (
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-red-50 border border-red-100">
                                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                                <div>
                                    <h4 className="text-sm font-bold text-red-600">Critical Alerts</h4>
                                    <p className="text-xs text-slate-600 mt-1">{activeAlerts} node(s) require diagnostic review.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-green-50 border border-green-100">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                    <Activity size={18} className="text-green-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-green-700">Healthy Network</h4>
                                    <p className="text-xs text-green-600 mt-1">All systems are currently reporting nominal values.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Audit Timeline */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800">Administrative Trail</h3>
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-mono text-slate-500">LIVE</span>
                    </div>
                    <div className="p-6">
                        {detailsLoading ? (
                            <div className="space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex gap-3 animate-pulse">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 shrink-0"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                                            <div className="h-2 bg-slate-100 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {auditLogs.length > 0 ? auditLogs.map((log, idx) => (
                                    <div key={log.id} className="relative flex gap-4 group">
                                        {idx !== auditLogs.length - 1 && (
                                            <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-slate-50 group-hover:bg-slate-100 transition-colors" />
                                        )}
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm ${log.action_type === 'PROVISION_NODE' ? 'bg-green-500 text-white' :
                                            log.action_type.includes('CUSTOMER') ? 'bg-purple-500 text-white' :
                                                'bg-blue-500 text-white'
                                            }`}>
                                            <Activity size={12} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-slate-800 truncate uppercase tracking-tight">
                                                    {log.action_type.replace(/_/g, ' ')}
                                                </p>
                                                <span className="text-[10px] font-medium text-slate-400">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                {log.resource_type}: <span className="text-slate-700 font-medium">{log.metadata?.hardware_id || log.metadata?.name || log.metadata?.email || log.resource_id}</span>
                                            </p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-4">
                                        <p className="text-xs text-slate-400 italic">No events discovered.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── ASSET REGISTRY ─── */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">Asset Registry</h3>
                </div>
                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
                            <tr>
                                <th className="px-6 py-3">Hardware ID</th>
                                <th className="px-6 py-3">Label</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {nodesLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : nodes.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No nodes provisioned yet.</td>
                                </tr>
                            ) : nodes.map((node: any) => (
                                <tr key={node.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-800">{node.hardware_id || node.node_key}</td>
                                    <td className="px-6 py-4">{node.device_label || node.label}</td>
                                    <td className="px-6 py-4 capitalize">{node.device_type || node.category}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const response = await api.get(`/nodes/${node.id}`);
                                                        setEditingNode(response.data);
                                                        setActiveModal('device');
                                                    } catch (err) {
                                                        console.error('Failed to fetch node details:', err);
                                                        setEditingNode(node);
                                                        setActiveModal('device');
                                                    }
                                                }}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit Node"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (!window.confirm(`Are you sure you want to delete ${node.device_label || node.label}?`)) return;
                                                    try {
                                                        await adminService.deleteDevice(node.id);
                                                        showToast('Device deleted successfully', 'success');
                                                    } catch (e) {
                                                        showToast('Failed to delete device', 'error');
                                                    }
                                                }}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete Node"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── MODALS ─── */}
            <Modal isOpen={activeModal === 'community'} onClose={handleClose} title="Add New Community">
                <AddCommunityForm onSubmit={handleSubmit} onCancel={handleClose} />
            </Modal>

            <Modal isOpen={activeModal === 'customer'} onClose={handleClose} title="Register New Customer">
                <AddCustomerForm onSubmit={handleSubmit} onCancel={handleClose} />
            </Modal>

            <Modal isOpen={activeModal === 'device'} onClose={handleClose} title={editingNode ? "Update Node" : "Provision New Node"}>
                <AddDeviceForm
                    onSubmit={handleSubmit}
                    onCancel={handleClose}
                    communities={communities}
                    customers={customers}
                    initialData={editingNode}
                />
            </Modal>

            <Modal isOpen={activeModal === 'config'} onClose={handleClose} title="System Configuration">
                <ConfigForm onSubmit={handleSubmit} onCancel={handleClose} />
            </Modal>
        </div>
    );
};

export default AdminDashboard;
