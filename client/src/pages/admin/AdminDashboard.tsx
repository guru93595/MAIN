import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CUSTOMERS, COMMUNITIES } from '../../data/mockAdminStructure';
import {
    Users, Network, Map, Settings,
    Activity, AlertTriangle
} from 'lucide-react';
import { ActionCard } from '../../components/admin/ActionCard';
import { Modal } from '../../components/ui/Modal';
import { AddCommunityForm } from '../../components/admin/forms/AddCommunityForm';
import { AddCustomerForm } from '../../components/admin/forms/AddCustomerForm';
import { AddDeviceForm } from '../../components/admin/forms/AddDeviceForm';
import { ConfigForm } from '../../components/admin/forms/ConfigForm';

// Mock Stats Component
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
    const [activeModal, setActiveModal] = useState<ModalType>(null);

    // Calculate Dynamic Stats
    let displayCustomers = CUSTOMERS;
    let displayCommunities = COMMUNITIES;

    if (user?.role === 'distributor') {
        const userId = user.id;
        displayCustomers = CUSTOMERS.filter(c => c.distributorId === userId);

        const communityIds = displayCustomers.map(c => c.communityId);
        displayCommunities = COMMUNITIES.filter(c => communityIds.includes(c.id));
    }

    // Stats Calculation
    const totalNodes = displayCustomers.reduce((acc, c) => acc + c.devices.length, 0);
    const activeAlerts = displayCustomers.reduce((acc, c) => acc + c.devices.filter(d => d.status === 'alert').length, 0);
    const totalCustomers = displayCustomers.length;
    const totalCommunities = displayCommunities.length;

    // Calculate Health
    const healthyNodes = displayCustomers.reduce((acc, c) => acc + c.devices.filter(d => d.status === 'online').length, 0);
    const healthPercentage = totalNodes > 0 ? ((healthyNodes / totalNodes) * 100).toFixed(1) : '100';

    const handleAction = (type: ModalType) => {
        setActiveModal(type);
    };

    const handleClose = () => setActiveModal(null);

    const handleSubmit = (data: any) => {
        console.log('Form Submitted:', activeModal, data);
        handleClose();
        alert(`${activeModal?.toUpperCase()} Added Successfully! (Simulated)`);
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
                <StatItem label="Total Nodes" value={totalNodes.toString()} trend="+2% this week" trendUp />
                <StatItem label="Active Alerts" value={activeAlerts.toString()} trend={activeAlerts > 0 ? "Needs Attention" : "All Clear"} trendUp={activeAlerts === 0} />
                <StatItem label="Total Customers" value={totalCustomers.toString()} trend="+1 new" trendUp />
                <StatItem label="System Health" value={`${healthPercentage}%`} trend="Stable" trendUp />
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
                    {/* 1. Add Community */}
                    <ActionCard
                        title="Add Community"
                        description="Create new zones or residential communities for grouping nodes."
                        icon={Map}
                        color="blue"
                        stats={`${totalCommunities} Zones`}
                        onClick={() => handleAction('community')}
                    />

                    {/* 2. Add Customer */}
                    <ActionCard
                        title="Add Customer"
                        description="Register new clients and assign them to existing communities."
                        icon={Users}
                        color="purple"
                        stats={`${totalCustomers} Active`}
                        onClick={() => handleAction('customer')}
                    />

                    {/* 3. Add Device */}
                    <ActionCard
                        title="Add Device"
                        description="Provision new hardware nodes and link them to customers."
                        icon={Network}
                        color="green"
                        stats="PROVISION"
                        onClick={() => handleAction('device')}
                    />

                    {/* 4. System Config */}
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

            {/* ─── RECENT SYSTEM ALERTS ─── */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">System Alerts</h3>
                    <button className="text-xs text-blue-600 hover:text-blue-700">View All</button>
                </div>
                <div className="p-6">
                    {activeAlerts > 0 ? (
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-red-50 border border-red-100">
                            <AlertTriangle className="text-red-500 shrink-0" size={20} />
                            <div>
                                <h4 className="text-sm font-bold text-red-600">Critical Alert Detected</h4>
                                <p className="text-xs text-slate-600 mt-1">
                                    {activeAlerts} node(s) in your territory are reporting critical status.
                                    Check the "Regions & Zones" section for details.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-green-50 border border-green-100">
                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                <Activity size={12} className="text-white" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-green-700">All Systems Operational</h4>
                                <p className="text-xs text-green-600 mt-1">
                                    No active alerts in your assigned territory.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── MODALS ─── */}
            <Modal isOpen={activeModal === 'community'} onClose={handleClose} title="Add New Community">
                <AddCommunityForm onSubmit={handleSubmit} onCancel={handleClose} />
            </Modal>

            <Modal isOpen={activeModal === 'customer'} onClose={handleClose} title="Register New Customer">
                <AddCustomerForm onSubmit={handleSubmit} onCancel={handleClose} />
            </Modal>

            <Modal isOpen={activeModal === 'device'} onClose={handleClose} title="Provision New Node">
                <AddDeviceForm onSubmit={handleSubmit} onCancel={handleClose} />
            </Modal>

            <Modal isOpen={activeModal === 'config'} onClose={handleClose} title="System Configuration">
                <ConfigForm onSubmit={handleSubmit} onCancel={handleClose} />
            </Modal>
        </div>
    );
};

export default AdminDashboard;
