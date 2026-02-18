import { useParams, useNavigate } from 'react-router-dom';
import { REGIONS, COMMUNITIES } from '../../../data/mockAdminStructure';
import type { Community } from '../../../data/mockAdminStructure';
import { ChevronRight, Building, Wifi, ArrowLeft } from 'lucide-react';

const RegionCommunities = () => {
    const { regionId } = useParams();
    const navigate = useNavigate();

    const region = REGIONS.find(r => r.id === regionId);
    const communities = COMMUNITIES.filter(c => c.regionId === regionId);

    if (!region) return <div>Region not found</div>;

    return (
        <div className="space-y-6">
            {/* Breadcrumb-ish Header */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <span onClick={() => navigate('/superadmin/regions')} className="hover:text-blue-600 cursor-pointer">Regions</span>
                <ChevronRight size={14} />
                <span className="font-bold text-slate-800">{region.name}</span>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{region.name} Communities</h2>
                    <p className="text-slate-500">Select a community to manage customers and devices.</p>
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
                            <th className="px-6 py-4">Community Name</th>
                            <th className="px-6 py-4">Zone / Area</th>
                            <th className="px-6 py-4">Infrastructure Nodes</th>
                            <th className="px-6 py-4">System Health</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {communities.map((community: Community) => (
                            <tr
                                key={community.id}
                                onClick={() => navigate(`/superadmin/communities/${community.id}`)}
                                className="group hover:bg-blue-50/50 transition-colors cursor-pointer"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Building size={16} />
                                        </div>
                                        <span className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                            {community.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                    {community.zone}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Wifi size={14} className="text-slate-400" />
                                        {community.stats.nodes} Nodes
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${community.stats.health > 90 ? 'bg-green-500' : 'bg-amber-500'}`}
                                                style={{ width: `${community.stats.health}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-bold ${community.stats.health > 90 ? 'text-green-600' : 'text-amber-600'}`}>
                                            {community.stats.health}%
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 inline-block" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {communities.length === 0 && (
                    <div className="p-12 text-center text-slate-500">
                        No communities found in this region.
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegionCommunities;
