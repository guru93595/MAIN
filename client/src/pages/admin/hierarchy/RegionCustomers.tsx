import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { adminService } from '../../../services/admin';
import { ChevronRight, User, MapPin, ArrowLeft, AlertCircle } from 'lucide-react';

const RegionCustomers = () => {
    const { regionId } = useParams(); // regionId is the region name
    const navigate = useNavigate();
    const { user } = useAuth();
    const [communities, setCommunities] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [commData, custData] = await Promise.all([
                    adminService.getCommunities(),
                    adminService.getCustomers()
                ]);
                setCommunities(commData);
                setCustomers(custData);
            } catch (error) {
                console.error('Failed to fetch region customers data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [regionId]);

    // Filter Logic
    const regionComms = communities.filter(c => c.region === regionId);
    const regionCommIds = regionComms.map(c => c.id);
    let regionCustomers = customers.filter(cust => regionCommIds.includes(cust.community_id));

    if (user?.role === 'distributor') {
        regionCustomers = regionCustomers.filter(c => c.distributor_id === user.id);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <span onClick={() => navigate('/superadmin/regions')} className="hover:text-blue-600 cursor-pointer">Regions</span>
                <ChevronRight size={14} />
                <span className="font-bold text-slate-800">{regionId}</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{regionId} Customers</h2>
                    <p className="text-slate-500">Managing all subscribers in the {regionId} operational area.</p>
                </div>
                <button
                    onClick={() => navigate('/superadmin/regions')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium"
                >
                    <ArrowLeft size={16} /> Back
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Customer</th>
                            <th className="px-6 py-4">Community / Zone</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Provisioned Devices</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {regionCustomers.map((customer: any) => {
                            const community = regionComms.find(c => c.id === customer.community_id);
                            const hasAlert = customer.devices?.some((d: any) => d.status === 'alert');

                            return (
                                <tr
                                    key={customer.id}
                                    onClick={() => navigate(`/superadmin/customers/${customer.id}`)}
                                    className="group hover:bg-blue-50/50 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{customer.full_name}</p>
                                                <p className="text-xs text-slate-400 font-mono tracking-tighter uppercase">{customer.id.substring(0, 8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-blue-500" />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700">{community?.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{community?.city || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {hasAlert ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[11px] font-bold border border-red-100">
                                                <AlertCircle size={12} /> CRITICAL
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-[11px] font-bold border border-green-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> STABLE
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-2">
                                                {(customer.devices || []).map((dev: any) => (
                                                    <div
                                                        key={dev.id}
                                                        className={`w-7 h-7 rounded-lg border-2 border-white flex items-center justify-center text-[10px] text-white font-bold ${dev.analytics_type === 'EvaraTank' ? 'bg-blue-500' :
                                                            dev.analytics_type === 'EvaraFlow' ? 'bg-cyan-500' : 'bg-indigo-500'
                                                            }`}
                                                        title={dev.analytics_type}
                                                    >
                                                        {dev.analytics_type?.[5] || 'D'}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-xs font-bold text-slate-400 ml-1">
                                                {customer.devices?.length || 0} Nodes
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <ChevronRight size={18} className="text-slate-200 group-hover:text-blue-500 inline-block transition-colors" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {regionCustomers.length === 0 && (
                    <div className="p-16 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <User size={32} className="text-slate-300" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-800">No Customers Found</h4>
                        <p className="text-slate-500 max-w-xs mx-auto mt-1">There are no customers registered in this region's communities yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegionCustomers;
