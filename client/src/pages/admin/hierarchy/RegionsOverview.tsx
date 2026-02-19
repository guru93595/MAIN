import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { adminService } from '../../../services/admin';
import { MapPin, Users, Building, AlertTriangle, ArrowRight } from 'lucide-react';

const RegionsOverview = () => {
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
                console.error('Failed to fetch regions data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter data based on role
    let displayCommunities = communities;
    let displayCustomers = customers;

    if (user?.role === 'distributor') {
        displayCustomers = customers.filter(c => c.distributor_id === user.id);
        const communityIds = displayCustomers.map(c => c.community_id);
        displayCommunities = communities.filter(c => communityIds.includes(c.id));
    }

    // Derive Regions dynamically
    const uniqueRegionNames = Array.from(new Set(displayCommunities.map(c => c.region)));
    const derivedRegions = uniqueRegionNames.map(name => {
        const regionComms = displayCommunities.filter(c => c.region === name);
        const regionCommIds = regionComms.map(c => c.id);
        const regionCusts = displayCustomers.filter(c => regionCommIds.includes(c.community_id));

        const activeAlerts = regionCusts.reduce((acc, c) =>
            acc + (c.devices?.filter((d: any) => d.status === 'alert').length || 0), 0);

        return {
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name: name,
            code: name.substring(0, 3).toUpperCase(),
            stats: {
                communities: regionComms.length,
                customers: regionCusts.length,
                activeAlerts: activeAlerts
            }
        };
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Operational Regions</h2>
                <p className="text-slate-500">Select a region to view communities and infrastructure.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {derivedRegions.map((region) => (
                    <div
                        key={region.id}
                        onClick={() => navigate(`/superadmin/regions/${region.name}`)}
                        className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <MapPin size={80} className="text-slate-800" />
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                                {region.code}
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">{region.name}</h3>
                        </div>

                        <div className="space-y-3 relative z-10">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-slate-500">
                                    <Building size={14} /> Communities
                                </span>
                                <span className="font-bold text-slate-800">{region.stats.communities}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-slate-500">
                                    <Users size={14} /> Customers
                                </span>
                                <span className="font-bold text-slate-800">{region.stats.customers}</span>
                            </div>

                            {region.stats.activeAlerts > 0 && (
                                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                                    <AlertTriangle size={14} />
                                    {region.stats.activeAlerts} Active Alerts
                                </div>
                            )}

                            {region.stats.activeAlerts === 0 && (
                                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    System Healthy
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-blue-600 uppercase tracking-wider group-hover:gap-2 transition-all">
                            View Details <ArrowRight size={14} />
                        </div>
                    </div>
                ))}

                {derivedRegions.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <MapPin className="mx-auto text-slate-300 mb-2" size={32} />
                        <p className="text-slate-500 text-sm font-medium">No operational regions found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegionsOverview;
