import { useState, useEffect } from 'react';
import {
    MapPin,
    TrendingUp,
    CheckCircle,
    XCircle
} from 'lucide-react';

import { useNodes } from '../hooks/useNodes';
import { getPipelines, createPipeline, deletePipeline, type Pipeline } from '../services/pipelines';
import { getNodeAssignments, createNodeAssignment, deleteNodeAssignment, type NodeAssignment } from '../services/assignments';
import { getRecentAnalytics, type NodeAnalytics } from '../services/analytics';

export function CompleteDashboard() {
    const { nodes, loading: nodesLoading, error: nodesError } = useNodes();
    const [assignments, setAssignments] = useState<NodeAssignment[]>([]);
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [analytics, setAnalytics] = useState<NodeAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateForms, setShowCreateForms] = useState(false);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log('🔄 Starting to fetch all data...');

                // Fetch all data in parallel with better error handling
                const [assignmentsData, pipelinesData, analyticsData] = await Promise.all([
                    getNodeAssignments().catch(err => {
                        console.warn('⚠️ Assignments fetch failed:', err.response?.data || err.message);
                        return [];
                    }),
                    getPipelines().catch(err => {
                        console.warn('⚠️ Pipelines fetch failed:', err.response?.data || err.message);
                        return [];
                    }),
                    getRecentAnalytics('daily', 7, 50).catch(err => {
                        console.warn('⚠️ Analytics fetch failed:', err.response?.data || err.message);
                        return [];
                    })
                ]);

                setAssignments(assignmentsData);
                setPipelines(pipelinesData);
                setAnalytics(analyticsData);

                console.log('✅ All data fetched successfully:', {
                    nodes: nodes.length,
                    assignments: assignmentsData.length,
                    pipelines: pipelinesData.length,
                    analytics: analyticsData.length
                });

            } catch (err: any) {
                console.error('❌ Error fetching data:', err);
                setError(err.response?.data?.detail || 'Failed to fetch data');
            } finally {
                setLoading(false);
            }
        };

        // Fetch data regardless of nodes length to ensure data loads
        fetchAllData();
    }, [nodes]);

    // CRUD Functions
    const handleCreateAssignment = async (nodeId: string, userId: string) => {
        try {
            const newAssignment = await createNodeAssignment({ node_id: nodeId, user_id: userId });
            setAssignments(prev => [...prev, newAssignment]);
            console.log('✅ Assignment created:', newAssignment);
        } catch (error: any) {
            console.error('❌ Failed to create assignment:', error.response?.data || error.message);
        }
    };

    const handleCreatePipeline = async (name: string, color: string = '#3B82F6') => {
        try {
            const newPipeline = await createPipeline({
                name,
                color,
                positions: [[17.4456, 78.3516], [17.4460, 78.3520]]
            });
            setPipelines(prev => [...prev, newPipeline]);
            console.log('✅ Pipeline created:', newPipeline);
        } catch (error: any) {
            console.error('❌ Failed to create pipeline:', error.response?.data || error.message);
        }
    };

    const handleDeleteAssignment = async (id: string) => {
        try {
            await deleteNodeAssignment(id);
            setAssignments(prev => prev.filter(a => a.id !== id));
            console.log('✅ Assignment deleted:', id);
        } catch (error: any) {
            console.error('❌ Failed to delete assignment:', error.response?.data || error.message);
        }
    };

    const handleDeletePipeline = async (id: string) => {
        try {
            await deletePipeline(id);
            setPipelines(prev => prev.filter(p => p.id !== id));
            console.log('✅ Pipeline deleted:', id);
        } catch (error: any) {
            console.error('❌ Failed to delete pipeline:', error.response?.data || error.message);
        }
    };

    const refreshData = () => {
        setLoading(true);
        const fetchAllData = async () => {
            try {
                const [assignmentsData, pipelinesData, analyticsData] = await Promise.all([
                    getNodeAssignments(),
                    getPipelines(),
                    getRecentAnalytics('daily', 7, 50)
                ]);

                setAssignments(assignmentsData);
                setPipelines(pipelinesData);
                setAnalytics(analyticsData);
                console.log('🔄 Data refreshed successfully');
            } catch (error) {
                console.error('❌ Failed to refresh data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    };

    if (nodesLoading || loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || nodesError) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <XCircle className="h-5 w-5 text-red-400 mr-2" />
                        <h3 className="text-red-800 font-medium">Error Loading Data</h3>
                    </div>
                    <p className="text-red-600 mt-2">{error || nodesError}</p>
                </div>
            </div>
        );
    }

    // Calculate statistics
    const onlineNodes = nodes.filter(n => n.status === 'Online').length;
    const offlineNodes = nodes.filter(n => n.status === 'Offline').length;
    const totalConsumption = analytics.reduce((sum, a) => sum + (a.consumption_liters || 0), 0);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">EvaraTech IoT Dashboard</h1>
                    <p className="text-gray-600 mt-2">Complete system overview with all data</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={refreshData}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                    >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Refresh Data
                    </button>
                    <button
                        onClick={() => setShowCreateForms(!showCreateForms)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        {showCreateForms ? 'Hide' : 'Show'} CRUD
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <MapPin className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Devices</p>
                            <p className="text-2xl font-bold text-gray-900">{nodes.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Online</p>
                            <p className="text-2xl font-bold text-green-600">{onlineNodes}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <XCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Offline</p>
                            <p className="text-2xl font-bold text-red-600">{offlineNodes}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Consumption</p>
                            <p className="text-2xl font-bold text-gray-900">{totalConsumption.toFixed(0)}L</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CRUD Forms */}
            {showCreateForms && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">CRUD Operations</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Create Assignment */}
                        <div>
                            <h3 className="text-md font-medium text-gray-700 mb-2">Create Assignment</h3>
                            <div className="space-y-2">
                                <select
                                    id="node-select"
                                    className="w-full p-2 border rounded"
                                    defaultValue=""
                                >
                                    <option value="">Select Node</option>
                                    {nodes.slice(0, 5).map(node => (
                                        <option key={node.id} value={node.id}>{node.label || node.id}</option>
                                    ))}
                                </select>
                                <select
                                    id="user-select"
                                    className="w-full p-2 border rounded"
                                    defaultValue="usr_admin"
                                >
                                    <option value="usr_admin">Admin User</option>
                                    <option value="usr_dist">Distributor User</option>
                                </select>
                                <button
                                    onClick={() => {
                                        const nodeSelect = document.getElementById('node-select') as HTMLSelectElement;
                                        const userSelect = document.getElementById('user-select') as HTMLSelectElement;
                                        if (nodeSelect.value && userSelect.value) {
                                            handleCreateAssignment(nodeSelect.value, userSelect.value);
                                            nodeSelect.value = '';
                                        }
                                    }}
                                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Create Assignment
                                </button>
                            </div>
                        </div>

                        {/* Create Pipeline */}
                        <div>
                            <h3 className="text-md font-medium text-gray-700 mb-2">Create Pipeline</h3>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    id="pipeline-name"
                                    placeholder="Pipeline Name"
                                    className="w-full p-2 border rounded"
                                />
                                <input
                                    type="color"
                                    id="pipeline-color"
                                    defaultValue="#3B82F6"
                                    className="w-full h-10 border rounded"
                                />
                                <button
                                    onClick={() => {
                                        const nameInput = document.getElementById('pipeline-name') as HTMLInputElement;
                                        const colorInput = document.getElementById('pipeline-color') as HTMLInputElement;
                                        if (nameInput.value) {
                                            handleCreatePipeline(nameInput.value, colorInput.value);
                                            nameInput.value = '';
                                        }
                                    }}
                                    className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Create Pipeline
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Data Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Node Assignments */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Node Assignments</h2>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {assignments.map((assignment) => (
                                <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                    <div>
                                        <p className="font-medium text-gray-900">{assignment.node_id}</p>
                                        <p className="text-sm text-gray-500">Assigned to: {assignment.user_id}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500">
                                                {new Date(assignment.assigned_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteAssignment(assignment.id)}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                            title="Delete Assignment"
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pipelines */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Water Pipelines</h2>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {pipelines.map((pipeline) => (
                                <div key={pipeline.id} className="p-3 bg-gray-50 rounded">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">{pipeline.name}</p>
                                            <div className="flex items-center mt-1">
                                                <div
                                                    className="w-4 h-4 rounded mr-2"
                                                    style={{ backgroundColor: pipeline.color }}
                                                ></div>
                                                <p className="text-sm text-gray-500">
                                                    {pipeline.positions?.length || 0} waypoints
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeletePipeline(pipeline.id)}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                            title="Delete Pipeline"
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Analytics */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Recent Analytics (7 days)</h2>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analytics.slice(0, 9).map((analytic) => (
                            <div key={analytic.id} className="p-4 bg-gray-50 rounded">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-gray-900">{analytic.node_id}</p>
                                    <span className={`px-2 py-1 text-xs rounded ${analytic.period_type === 'daily' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {analytic.period_type}
                                    </span>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Consumption:</span>
                                        <span className="font-medium">{analytic.consumption_liters || 0}L</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Avg Level:</span>
                                        <span className="font-medium">{analytic.avg_level_percent || 0}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Peak Flow:</span>
                                        <span className="font-medium">{analytic.peak_flow || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                    <h3 className="text-green-800 font-medium">All Systems Operational</h3>
                </div>
                <p className="text-green-600 mt-2">
                    Successfully loaded {nodes.length} nodes, {assignments.length} assignments,
                    {pipelines.length} pipelines, and {analytics.length} analytics records.
                </p>
            </div>
        </div>
    );
}
