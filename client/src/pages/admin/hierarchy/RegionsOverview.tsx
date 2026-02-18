import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { REGIONS, CUSTOMERS, COMMUNITIES } from '../../../data/mockAdminStructure';
import type { Region } from '../../../data/mockAdminStructure';
import { MapPin, Users, Building, AlertTriangle, ArrowRight } from 'lucide-react';

const RegionsOverview = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Filter Regions if User is Distributor
    let displayRegions = REGIONS;
    let filteredCustomers = CUSTOMERS;

    if (user?.role === 'distributor') {
        const userId = user.id; // stable reference
        // 1. Get Distributor's Customers
        filteredCustomers = CUSTOMERS.filter(c => c.distributorId === userId);

        // 2. Identify Communities containing these customers
        const distributorCommunityIds = filteredCustomers.map(c => c.communityId);

        // 3. Identify Regions containing these communities
        const distributorRegionIds = COMMUNITIES
            .filter(c => distributorCommunityIds.includes(c.id))
            .map(c => c.regionId);

        // 4. Filter the main Regions list
        displayRegions = REGIONS.filter(r => distributorRegionIds.includes(r.id));
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Operational Regions</h2>
                <p className="text-slate-500">Select a region to view communities and infrastructure.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {displayRegions.map((region: Region) => {
                    // Calculate stats specifically for this user context
                    let regionStats = region.stats;

                    if (user?.role === 'distributor') {
                        // Recalculate stats based ONLY on visible customers
                        const regionCusts = filteredCustomers.filter(c => {
                            const comm = COMMUNITIES.find(cm => cm.id === c.communityId);
                            return comm?.regionId === region.id;
                        });

                        const uniqueCommunities = new Set(regionCusts.map(c => c.communityId)).size;
                        const activeAlerts = regionCusts.reduce((acc, c) => acc + c.devices.filter(d => d.status === 'alert').length, 0);

                        regionStats = {
                            communities: uniqueCommunities,
                            customers: regionCusts.length,
                            activeAlerts: activeAlerts
                        };
                    }

                    return (
                        <div
                            key={region.id}
                            onClick={() => navigate(`/superadmin/regions/${region.id}`)}
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
                                    <span className="font-bold text-slate-800">{regionStats.communities}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-slate-500">
                                        <Users size={14} /> Customers
                                    </span>
                                    <span className="font-bold text-slate-800">{regionStats.customers}</span>
                                </div>

                                {regionStats.activeAlerts > 0 && (
                                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                                        <AlertTriangle size={14} />
                                        {regionStats.activeAlerts} Active Alerts
                                    </div>
                                )}

                                {regionStats.activeAlerts === 0 && (
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
                    );
                })}
            </div>
        </div>
    );
};

export default RegionsOverview;
