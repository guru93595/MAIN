import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../../../services/admin';
import { ChevronRight, User, Smartphone, AlertCircle, ArrowLeft } from 'lucide-react';

const CommunityCustomers = () => {
    const { communityId } = useParams();
    const navigate = useNavigate();
    const [community, setCommunity] = useState<any>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [commData, custData] = await Promise.all([
                    adminService.getCommunities(),
                    adminService.getCustomers()
                ]);
                const currentComm = commData.find((c: any) => c.id === communityId);
                const commCusts = custData.filter((c: any) => c.community_id === communityId);

                setCommunity(currentComm);
                setCustomers(commCusts);
            } catch (error) {
                console.error('Failed to fetch community customers:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [communityId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!community) return <div className="p-8 text-center text-slate-500">Community not found</div>;

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <span onClick={() => navigate('/superadmin/regions')} className="hover:text-blue-600 cursor-pointer">Regions</span>
                <ChevronRight size={14} />
                <span onClick={() => navigate(`/superadmin/regions/${community.region}`)} className="hover:text-blue-600 cursor-pointer truncate max-w-[100px]">{community.region}</span>
                <ChevronRight size={14} />
                <span className="font-bold text-slate-800">{community.name}</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{community.name}</h2>
                    <p className="text-slate-500">Manage residents and their assigned devices.</p>
                </div>
                <button
                    onClick={() => navigate(`/superadmin/regions/${community.region}`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium"
                >
                    <ArrowLeft size={16} /> Back
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Customer Name</th>
                            <th className="px-6 py-4">Contact Info</th>
                            <th className="px-6 py-4">Devices</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {customers.map((customer: any) => (
                            <tr
                                key={customer.id}
                                onClick={() => navigate(`/superadmin/customers/${customer.id}`)}
                                className="group hover:bg-blue-50/50 transition-colors cursor-pointer"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                                            <User size={16} />
                                        </div>
                                        <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                            {customer.full_name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm">
                                        <p className="text-slate-800 font-medium">{customer.email}</p>
                                        <p className="text-slate-400 text-xs">{customer.contact_number || 'No Phone'}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Smartphone size={14} className="text-slate-400" />
                                        {customer.devices?.length || 0} Devices
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {customer.devices?.some((d: any) => d.status === 'alert') ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                                            <AlertCircle size={12} /> Alert
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold border border-green-100">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">View Profile</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {customers.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                        No customers found in this community.
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunityCustomers;
