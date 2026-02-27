import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { AnalyticsChart, MultiFieldChart } from '../components/charts/AnalyticsChart';
import { thingSpeakService, type ThingSpeakFeed, type ThingSpeakChannel } from '../services/thingspeak';
import { useNodes } from '../hooks/useNodes';
import type { NodeRow } from '../types/database';

import EvaraTank from './EvaraTank';
import EvaraDeep from './EvaraDeep';
import EvaraFlow from './EvaraFlow';

interface AnalyticsData {
    channelId: string;
    channelInfo: ThingSpeakChannel | null;
    feeds: ThingSpeakFeed[];
    loading: boolean;
    error: string | null;
}

const Analytics = () => {
    const navigate = useNavigate();
    const { nodes } = useNodes();
    const [selectedNode, setSelectedNode] = useState<NodeRow | null>(null);
    const [analyticsData, setAnalyticsData] = useState<Record<string, AnalyticsData>>({});
    const [timeRange, setTimeRange] = useState<'7' | '14' | '30'>('7');
    const [isLoading, setIsLoading] = useState(false);

    const nodeChannelMap: Record<string, string> = {};

    useEffect(() => {
        if (nodes.length > 0 && !selectedNode) {
            setSelectedNode(nodes[0]);
        }
    }, [nodes, selectedNode]);

    useEffect(() => {
        if (selectedNode) {
            loadAnalyticsData(selectedNode);
        }
    }, [selectedNode, timeRange]);

    const loadAnalyticsData = async (node: NodeRow) => {
        const channelId = nodeChannelMap[node.analytics_type || ''] || node.id;

        setIsLoading(true);
        setAnalyticsData(prev => ({
            ...prev,
            [node.id]: {
                ...prev[node.id],
                loading: true,
                error: null
            }
        }));

        try {
            const [channelInfo, feeds] = await Promise.all([
                thingSpeakService.getChannelInfo(channelId),
                thingSpeakService.getChannelData(channelId, 100, parseInt(timeRange))
            ]);

            setAnalyticsData(prev => ({
                ...prev,
                [node.id]: {
                    channelId,
                    channelInfo,
                    feeds: feeds.feeds,
                    loading: false,
                    error: null
                }
            }));
        } catch (error) {
            console.error('Error loading analytics data:', error);
            setAnalyticsData(prev => ({
                ...prev,
                [node.id]: {
                    channelId,
                    channelInfo: null,
                    feeds: [],
                    loading: false,
                    error: error instanceof Error ? error.message : 'Failed to load data'
                }
            }));
        } finally {
            setIsLoading(false);
        }
    };

    const refreshData = () => {
        if (selectedNode) {
            loadAnalyticsData(selectedNode);
        }
    };

    const exportData = () => {
        if (!selectedNode || !analyticsData[selectedNode.id]?.feeds.length) return;

        const feeds = analyticsData[selectedNode.id].feeds;
        const csv = [
            'Timestamp,Field1,Field2,Field3,Field4,Field5,Field6,Field7,Field8',
            ...feeds.map(feed =>
                `${feed.created_at},${feed.field1 || ''},${feed.field2 || ''},${feed.field3 || ''},${feed.field4 || ''},${feed.field5 || ''},${feed.field6 || ''},${feed.field7 || ''},${feed.field8 || ''}`
            )
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${selectedNode.id}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const currentData = selectedNode ? analyticsData[selectedNode.id] : null;
    const allFields = currentData?.feeds ? thingSpeakService.extractAllFields(currentData.feeds) : {};

    return (
        <div className="h-screen flex flex-col bg-slate-50 font-sans">
            <div className="flex-none flex items-center justify-between p-5 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <h1 className="text-2xl font-black text-slate-800">Analytics Dashboard</h1>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedNode?.id || ''}
                        onChange={(e) => {
                            const node = nodes.find(n => n.id === e.target.value);
                            if (node) setSelectedNode(node);
                        }}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {nodes.map(node => (
                            <option key={node.id} value={node.id}>
                                {node.label || node.id} ({node.analytics_type})
                            </option>
                        ))}
                    </select>

                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as '7' | '14' | '30')}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="7">Last 7 days</option>
                        <option value="14">Last 14 days</option>
                        <option value="30">Last 30 days</option>
                    </select>

                    <button
                        onClick={refreshData}
                        disabled={isLoading}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={exportData}
                        disabled={!currentData?.feeds.length}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                    >
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-5">
                {currentData?.loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : currentData?.error ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-black text-slate-800 mb-2">Error Loading Data</h3>
                            <p className="text-slate-600 mb-4">{currentData.error}</p>
                            <button
                                onClick={refreshData}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : currentData?.channelInfo ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity size={20} className="text-blue-500" />
                                    <h3 className="text-sm font-black text-slate-600">Channel</h3>
                                </div>
                                <p className="text-xl font-black text-slate-800">{currentData.channelInfo.name}</p>
                                <p className="text-xs font-bold text-slate-400">ID: {currentData.channelId}</p>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp size={20} className="text-green-500" />
                                    <h3 className="text-sm font-black text-slate-600">Data Points</h3>
                                </div>
                                <p className="text-xl font-black text-slate-800">{currentData.feeds.length}</p>
                                <p className="text-xs font-bold text-slate-400">Last {timeRange} days</p>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity size={20} className="text-purple-500" />
                                    <h3 className="text-sm font-black text-slate-600">Last Update</h3>
                                </div>
                                <p className="text-xl font-black text-slate-800">
                                    {currentData.feeds.length > 0
                                        ? new Date(currentData.feeds[0].created_at).toLocaleTimeString()
                                        : 'No data'
                                    }
                                </p>
                                <p className="text-xs font-bold text-slate-400">
                                    {currentData.feeds.length > 0
                                        ? new Date(currentData.feeds[0].created_at).toLocaleDateString()
                                        : ''
                                    }
                                </p>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity size={20} className="text-orange-500" />
                                    <h3 className="text-sm font-black text-slate-600">Status</h3>
                                </div>
                                <p className="text-xl font-black text-green-600">Active</p>
                                <p className="text-xs font-bold text-slate-400">ThingSpeak Connected</p>
                            </div>
                        </div>

                        {/* Domain-specific Analytics Display */}
                        {selectedNode?.analytics_type === 'EvaraTank' && <EvaraTank embedded nodeId={selectedNode.id} />}
                        {selectedNode?.analytics_type === 'EvaraDeep' && <EvaraDeep embedded nodeId={selectedNode.id} />}
                        {selectedNode?.analytics_type === 'EvaraFlow' && <EvaraFlow embedded nodeId={selectedNode.id} />}

                        <div className="grid grid-cols-2 gap-6">
                            {Object.entries(allFields).map(([field, data]) => (
                                <AnalyticsChart
                                    key={field}
                                    data={data}
                                    title={`${field} - ${currentData.channelInfo?.fields[field] || field}`}
                                    dataKey="value"
                                    color="#3b82f6"
                                    height={300}
                                    type="line"
                                />
                            ))}
                        </div>

                        {Object.keys(allFields).length > 1 && (
                            <MultiFieldChart
                                data={Object.values(allFields)[0].map((point, index) => {
                                    const combined: any = { timestamp: point.timestamp };
                                    Object.keys(allFields).forEach(field => {
                                        combined[field] = allFields[field][index]?.value || 0;
                                    });
                                    return combined;
                                })}
                                title="All Fields Combined"
                                fields={Object.keys(allFields).map((field, index) => ({
                                    key: field,
                                    name: currentData.channelInfo?.fields[field] || field,
                                    color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'][index % 8]
                                }))}
                                height={400}
                                type="line"
                            />
                        )}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <Activity size={48} className="text-slate-400 mx-auto mb-4" />
                            <h3 className="text-lg font-black text-slate-800 mb-2">No Data Available</h3>
                            <p className="text-slate-600">Select a device to view its analytics data</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Analytics;
