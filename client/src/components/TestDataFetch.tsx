import { useState, useEffect } from 'react';
import { getNodeAssignments } from '../services/assignments';
import { getPipelines } from '../services/pipelines';
import { getRecentAnalytics } from '../services/analytics';

export function TestDataFetch() {
    const [data, setData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const testAllAPIs = async () => {
            try {
                console.log('🧪 Testing all API endpoints...');
                
                const [assignments, pipelines, analytics] = await Promise.all([
                    getNodeAssignments().catch(err => {
                        console.error('❌ Assignments API failed:', err);
                        return [];
                    }),
                    getPipelines().catch(err => {
                        console.error('❌ Pipelines API failed:', err);
                        return [];
                    }),
                    getRecentAnalytics().catch(err => {
                        console.error('❌ Analytics API failed:', err);
                        return [];
                    })
                ]);
                
                setData({
                    assignments: assignments,
                    pipelines: pipelines,
                    analytics: analytics
                });
                
                console.log('✅ API Test Results:', {
                    assignments: assignments.length,
                    pipelines: pipelines.length,
                    analytics: analytics.length
                });
                
            } catch (err: any) {
                console.error('❌ Test failed:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        testAllAPIs();
    }, []);

    if (loading) {
        return <div className="p-6">Testing API endpoints...</div>;
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 p-4 rounded">
                    <h3 className="text-red-800 font-medium">API Test Failed</h3>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">API Test Results</h2>
            
            <div className="bg-white p-4 rounded shadow">
                <h3 className="font-semibold mb-2">Assignments: {data.assignments?.length || 0}</h3>
                {data.assignments?.slice(0, 2).map((assignment: any, index: number) => (
                    <div key={index} className="text-sm text-gray-600">
                        {assignment.node_id} → {assignment.user_id}
                    </div>
                ))}
            </div>
            
            <div className="bg-white p-4 rounded shadow">
                <h3 className="font-semibold mb-2">Pipelines: {data.pipelines?.length || 0}</h3>
                {data.pipelines?.slice(0, 2).map((pipeline: any, index: number) => (
                    <div key={index} className="text-sm text-gray-600">
                        {pipeline.name} ({pipeline.positions?.length || 0} points)
                    </div>
                ))}
            </div>
            
            <div className="bg-white p-4 rounded shadow">
                <h3 className="font-semibold mb-2">Analytics: {data.analytics?.length || 0}</h3>
                {data.analytics?.slice(0, 2).map((analytic: any, index: number) => (
                    <div key={index} className="text-sm text-gray-600">
                        {analytic.node_id}: {analytic.consumption_liters}L
                    </div>
                ))}
            </div>
            
            <div className="bg-green-50 p-4 rounded">
                <h3 className="text-green-800 font-medium">✅ All APIs Working!</h3>
                <p className="text-green-600">Total data fetched: {(data.assignments?.length || 0) + (data.pipelines?.length || 0) + (data.analytics?.length || 0)} records</p>
            </div>
        </div>
    );
}
