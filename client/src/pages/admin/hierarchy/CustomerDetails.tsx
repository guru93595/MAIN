import { useParams, useNavigate } from 'react-router-dom';
import { COMMUNITIES, CUSTOMERS, REGIONS } from '../../../data/mockAdminStructure';
import type { Device } from '../../../data/mockAdminStructure';
import { ChevronRight, Activity, ArrowLeft, Mail, Phone, MapPin, Box } from 'lucide-react';

const CustomerDetails = () => {
    const { customerId } = useParams();
    const navigate = useNavigate();

    const customer = CUSTOMERS.find(c => c.id === customerId);
    const community = customer ? COMMUNITIES.find(c => c.id === customer.communityId) : null;
    const region = community ? REGIONS.find(r => r.id === community.regionId) : null;

    if (!customer) return <div>Customer not found</div>;

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 overflow-hidden">
                <span onClick={() => navigate('/superadmin/regions')} className="hover:text-blue-600 cursor-pointer shrink-0">Regions</span>
                <ChevronRight size={14} className="shrink-0" />
                <span onClick={() => navigate(`/superadmin/regions/${region?.id}`)} className="hover:text-blue-600 cursor-pointer truncate max-w-[100px]">{region?.name}</span>
                <ChevronRight size={14} className="shrink-0" />
                <span className="font-bold text-slate-800 truncate">{customer.name}</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{customer.name}</h2>
                    <p className="text-slate-500">Customer Profile & Device Management</p>
                </div>
                <button
                    onClick={() => navigate(`/superadmin/communities/${community?.id}`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium"
                >
                    <ArrowLeft size={16} /> Back
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Contact Details</h3>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mt-1">
                                    <Mail size={16} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">Email Address</p>
                                    <p className="text-slate-800 font-medium">{customer.email}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-green-50 text-green-600 mt-1">
                                    <Phone size={16} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">Phone Number</p>
                                    <p className="text-slate-800 font-medium">{customer.phone}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-purple-50 text-purple-600 mt-1">
                                    <MapPin size={16} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-bold uppercase">Location</p>
                                    <p className="text-slate-800 font-medium">{community?.name}</p>
                                    <p className="text-xs text-slate-400">{community?.zone}, {region?.name}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Devices List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Assigned Devices</h3>
                            <button className="text-xs font-bold text-blue-600 hover:text-blue-700">+ Add Device</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {customer.devices.map((device: Device) => (
                                <div key={device.id} className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all bg-slate-50">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${device.type === 'EvaraTank' ? 'bg-blue-100 text-blue-600' :
                                                device.type === 'EvaraFlow' ? 'bg-cyan-100 text-cyan-600' :
                                                    'bg-indigo-100 text-indigo-600'
                                                }`}>
                                                <Box size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{device.type}</h4>
                                                <p className="text-xs text-slate-500 font-mono">{device.id}</p>
                                            </div>
                                        </div>

                                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${device.status === 'online' ? 'bg-green-100 text-green-700 border-green-200' :
                                            device.status === 'offline' ? 'bg-slate-200 text-slate-600 border-slate-300' :
                                                'bg-red-100 text-red-700 border-red-200'
                                            }`}>
                                            {device.status}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-4 border-t border-slate-200/60">
                                        <span className="flex items-center gap-1">
                                            <Activity size={12} /> Last Seen
                                        </span>
                                        <span className="font-medium text-slate-700">{device.lastSeen}</span>
                                    </div>

                                    <button className="w-full mt-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">
                                        Configure Device
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerDetails;
