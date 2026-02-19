import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/admin';
import { User, Search, MapPin, Filter } from 'lucide-react';

const AdminCustomers = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [customers, setCustomers] = useState<any[]>([]);
    const [communities, setCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custData, commData] = await Promise.all([
                    adminService.getCustomers(),
                    adminService.getCommunities()
                ]);
                setCustomers(custData);
                setCommunities(commData);
            } catch (error) {
                console.error('Failed to fetch admin customers:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter by Distributor Role
    let displayCustomers = customers;
    if (user?.role === 'distributor') {
        displayCustomers = customers.filter(c => c.distributor_id === user.id);
    }

    const filteredCustomers = displayCustomers.filter(c =>
        (c.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Customer Management</h2>
                    <p className="text-slate-500">Global list of registered customers across all regions.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 outline-none w-64 shadow-sm"
                        />
                    </div>
                    <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Customer</th>
                            <th className="px-6 py-4">Location Context</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4">Devices</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredCustomers.map((customer: any) => {
                            const community = communities.find(com => com.id === customer.community_id);

                            return (
                                <tr
                                    key={customer.id}
                                    onClick={() => navigate(`/superadmin/customers/${customer.id}`)}
                                    className="group hover:bg-blue-50/50 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{customer.full_name}</p>
                                                <p className="text-[11px] text-slate-400 font-mono tracking-tighter uppercase">{customer.id.substring(0, 8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin size={14} className="text-slate-400" />
                                            <div>
                                                <span className="text-slate-700 font-medium">{community?.name || 'Unknown Community'}</span>
                                                <span className="text-slate-400 mx-1">/</span>
                                                <span className="text-slate-500 text-xs">{community?.region || 'No Region'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-slate-600">
                                            <p className="font-medium">{customer.email}</p>
                                            <p className="text-slate-400">{customer.contact_number || 'N/A'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                                            {customer.devices?.length || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-xs font-bold text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                            Manage Profile
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredCustomers.length === 0 && (
                    <div className="p-12 text-center">
                        <User className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-500 font-medium">No customers match your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminCustomers;
