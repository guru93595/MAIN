import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chart, { type ChartConfiguration } from 'chart.js/auto';
import { useThingSpeak } from '../hooks/useThingSpeak';
import { getDeviceDetails } from '../services/devices';
import './EvaraFlow.css';

interface EvaraFlowProps {
    embedded?: boolean;
    nodeId?: string;
}

const EvaraFlow = ({ embedded = false, nodeId }: EvaraFlowProps) => {
    // Add logging to debug potential rendering issues
    console.log("EvaraFlow component rendering...");

    const flowTrendChartRef = useRef<HTMLCanvasElement>(null);
    const usageDoughnutRef = useRef<HTMLCanvasElement>(null);
    const liveFlowBarRef = useRef<HTMLCanvasElement>(null);

    const chartInstances = useRef<{
        trend: Chart | null;
        usage: Chart | null;
        live: Chart | null;
    }>({ trend: null, usage: null, live: null });

    const [filter] = useState('live');
    const [tsConfig, setTsConfig] = useState<{
        channelId: string | null;
        readApiKey: string | null;
    } | null>(null);

    // Get ThingSpeak data
    const { feeds, loading, error, noConfig } = useThingSpeak({
        channelId: tsConfig?.channelId ?? null,
        readApiKey: tsConfig?.readApiKey ?? null,
        filter
    });

    // Show loading state
    if (loading) {
        return (
            <div className={`evara-flow-body${embedded ? ' ef-embedded' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                    <div>Loading ThingSpeak data...</div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error || noConfig) {
        return (
            <div className={`evara-flow-body${embedded ? ' ef-embedded' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                    <div>{error || 'ThingSpeak not configured'}</div>
                </div>
            </div>
        );
    }

    // Fetch ThingSpeak config from Backend
    useEffect(() => {
        if (!nodeId) {
            setTsConfig({ channelId: null, readApiKey: null });
            return;
        }

        const fetchConfig = async () => {
            try {
                const node = await getDeviceDetails(nodeId);
                setTsConfig({
                    channelId: node.thingspeak_channel_id ?? null,
                    readApiKey: node.thingspeak_read_api_key ?? null,
                });
            } catch (err) {
                console.error("Failed to fetch node config:", err);
                setTsConfig({ channelId: null, readApiKey: null });
            }
        };

        fetchConfig();
    }, [nodeId]);

    // Animation State
    const [flowFillHeight, setFlowFillHeight] = useState(0);

    useEffect(() => {
        // Trigger animation after mount
        const timer = setTimeout(() => {
            setFlowFillHeight(60); // Target height from CSS/Mock
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Process real ThingSpeak data
    const processFlowData = () => {
        if (!feeds.length) return {
            trendData: [0, 0, 0, 0, 0, 0],
            liveData: [0, 0, 0, 0, 0, 0],
            instantFlow: 0,
            cumulativeUsage: 0,
            peakFlow: 0,
            efficiency: 0,
            usageBreakdown: [0, 0]
        };

        // Extract flow values from field1 (assuming field1 is flow rate)
        const flowValues = feeds.map(feed => parseFloat(feed.field1 || '0')).filter(val => !isNaN(val));
        
        if (flowValues.length === 0) return {
            trendData: [0, 0, 0, 0, 0, 0],
            liveData: [0, 0, 0, 0, 0, 0],
            instantFlow: 0,
            cumulativeUsage: 0,
            peakFlow: 0,
            efficiency: 0,
            usageBreakdown: [0, 0]
        };

        // Get recent data for charts
        const recentValues = flowValues.slice(-6);
        const liveValues = flowValues.slice(-6);
        
        // Calculate metrics
        const instantFlow = flowValues[flowValues.length - 1] || 0;
        const cumulativeUsage = flowValues.reduce((sum, val) => sum + val, 0);
        const peakFlow = Math.max(...flowValues);
        const avgFlow = flowValues.reduce((sum, val) => sum + val, 0) / flowValues.length;
        const efficiency = avgFlow > 0 ? Math.min(100, (avgFlow / peakFlow) * 100) : 0;
        
        // Calculate usage breakdown (peak vs standard)
        const threshold = peakFlow * 0.8;
        const peakCount = flowValues.filter(val => val > threshold).length;
        const standardCount = flowValues.length - peakCount;
        
        return {
            trendData: recentValues,
            liveData: liveValues,
            instantFlow,
            cumulativeUsage,
            peakFlow,
            efficiency,
            usageBreakdown: [peakCount, standardCount]
        };
    };

    const flowData = processFlowData();

    useEffect(() => {
        // 1. Flow Trend Chart (Line)
        if (flowTrendChartRef.current) {
            if (chartInstances.current.trend) chartInstances.current.trend.destroy();

            // Use real ThingSpeak data
            const config: ChartConfiguration = {
                type: 'line',
                data: {
                    labels: ['-5h', '-4h', '-3h', '-2h', '-1h', 'Now'],
                    datasets: [{
                        label: 'Flow Rate',
                        data: flowData.trendData,
                        borderColor: '#0EA5E9',
                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            };
            chartInstances.current.trend = new Chart(flowTrendChartRef.current, config);
        }

        // 2. Usage Doughnut Chart
        if (usageDoughnutRef.current) {
            if (chartInstances.current.usage) chartInstances.current.usage.destroy();

            // Use real ThingSpeak data
            const config: ChartConfiguration = {
                type: 'doughnut',
                data: {
                    labels: ['Peak', 'Standard'],
                    datasets: [{
                        label: 'Usage',
                        data: flowData.usageBreakdown,
                        backgroundColor: ['#0EA5E9', '#E2E8F0'],
                        borderWidth: 0
                    }]
                },
                options: {
                    cutout: '80%',
                    plugins: { legend: { display: false } }
                } as any
            };
            chartInstances.current.usage = new Chart(usageDoughnutRef.current, config);
        }

        // 3. Live Flow Bar Chart
        if (liveFlowBarRef.current) {
            if (chartInstances.current.live) chartInstances.current.live.destroy();

            // Use real ThingSpeak data
            const config: ChartConfiguration = {
                type: 'bar',
                data: {
                    labels: ['-5m', '-4m', '-3m', '-2m', '-1m', 'Now'],
                    datasets: [{
                        label: 'Flow',
                        data: flowData.liveData,
                        backgroundColor: '#7DD3FC',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                }
            };
            chartInstances.current.live = new Chart(liveFlowBarRef.current, config);
        }
    }, [flowData]); // Re-render charts when data changes

    // Cleanup charts on unmount
    useEffect(() => {
        return () => {
            Object.values(chartInstances.current).forEach(chart => chart?.destroy());
        };
    }, []);

    // if (noConfig) return <NodeNotConfigured />;

    return (
        <div className={`evara-flow-body${embedded ? ' ef-embedded' : ''}`}>
            {!embedded && (
                <nav className="ef-sidebar">
                    <Link to="/evaratank" style={{ textDecoration: 'none' }}>
                        <div style={{ width: '24px', height: '24px', background: '#E2E8F0', borderRadius: '6px', marginBottom: '25px', cursor: 'pointer' }}></div>
                    </Link>
                    <Link to="/evaradeep" style={{ textDecoration: 'none' }}>
                        <div style={{ width: '24px', height: '24px', background: '#E2E8F0', borderRadius: '6px', marginBottom: '25px', cursor: 'pointer' }}></div>
                    </Link>
                    <Link to="/evaraflow" style={{ textDecoration: 'none' }}>
                        <div style={{ width: '40px', height: '40px', background: '#0EA5E9', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)', cursor: 'pointer' }}></div>
                    </Link>
                </nav>
            )}

            <main className="ef-main-content">
                <header className="ef-header">
                    <h1>EvaraFlow Analytics</h1>
                    <p>Water Flow Rate & Consumption Monitoring</p>
                </header>

                <div className="ef-dashboard-grid">
                    <div className="ef-card" style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <div className="ef-flow-visual">
                            <div className="ef-flow-fill" style={{ height: `${flowFillHeight}%` }}></div>
                        </div>
                        <div>
                            <div className="ef-kpi-label">Instant Flow</div>
                            <div className="ef-kpi-value">{flowData.instantFlow.toFixed(1)}</div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ef-primary)' }}>L/Min</div>
                        </div>
                    </div>

                    <div className="ef-card">
                        <div className="ef-kpi-label">Cumulative Usage</div>
                        <div className="ef-kpi-value">{flowData.cumulativeUsage.toFixed(0)} L</div>
                        <div className="ef-kpi-sub" style={{ color: 'var(--ef-text-muted)' }}>Today</div>
                    </div>

                    <div className="ef-card">
                        <div className="ef-kpi-label">Peak Flow</div>
                        <div className="ef-kpi-value">{flowData.peakFlow.toFixed(1)} L</div>
                        <div className="ef-kpi-sub" style={{ color: 'var(--ef-warning)' }}>Last 24h</div>
                    </div>

                    <div className="ef-card">
                        <div className="ef-kpi-label">Efficiency</div>
                        <div className="ef-kpi-value">{flowData.efficiency.toFixed(0)}%</div>
                        <div className="ef-kpi-sub" style={{ color: 'var(--ef-success)' }}>Optimal Range</div>
                    </div>

                    <div className="ef-card ef-span-3">
                        <div className="ef-chart-header">
                            <h3 style={{ margin: 0, fontSize: '18px' }}>Consumption Trends</h3>
                            <div className="ef-nav-group">
                                <button className="ef-nav-btn active">Last 24h</button>
                                <button className="ef-nav-btn">Last 3d</button>
                                <button className="ef-nav-btn">Last 7d</button>
                                <button className="ef-nav-btn">Last 30d</button>
                            </div>
                        </div>
                        <div className="ef-chart-container">
                            <canvas ref={flowTrendChartRef}></canvas>
                        </div>
                    </div>

                    <div className="ef-card">
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Usage by Period</h3>
                        <div className="ef-chart-container" style={{ height: '180px' }}>
                            <canvas ref={usageDoughnutRef}></canvas>
                        </div>
                        <div style={{ marginTop: '16px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Peak Usage</span><span style={{ fontWeight: 700 }}>
                                    {flowData.usageBreakdown[0] > 0 ? 
                                        `${((flowData.usageBreakdown[0] / (flowData.usageBreakdown[0] + flowData.usageBreakdown[1])) * 100).toFixed(0)}%` : 
                                        '0%'
                                    }
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Standard Usage</span><span style={{ fontWeight: 700 }}>
                                    {flowData.usageBreakdown[1] > 0 ? 
                                        `${((flowData.usageBreakdown[1] / (flowData.usageBreakdown[0] + flowData.usageBreakdown[1])) * 100).toFixed(0)}%` : 
                                        '0%'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="ef-card ef-span-2">
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Instantaneous Flow Indicator</h3>
                        <div className="ef-chart-container" style={{ height: '160px' }}>
                            <canvas ref={liveFlowBarRef}></canvas>
                        </div>
                    </div>

                    <div className="ef-card ef-span-2">
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Flow Integrity Alerts</h3>
                        <div className="ef-alert-row">
                            <span><span className="ef-status-dot" style={{ background: 'var(--ef-success)' }}></span>Continuous Flow (Leak)</span>
                            <span style={{ fontWeight: 700, color: 'var(--ef-success)', fontSize: '12px' }}>SECURE</span>
                        </div>
                        <div className="ef-alert-row">
                            <span><span className="ef-status-dot" style={{ background: 'var(--ef-danger)' }}></span>Unusual Flow Spike</span>
                            <span style={{ fontWeight: 700, color: 'var(--ef-danger)', fontSize: '12px' }}>ALERT: 11:20 AM</span>
                        </div>
                        <div className="ef-alert-row">
                            <span><span className="ef-status-dot" style={{ background: 'var(--ef-warning)' }}></span>No-Flow Condition</span>
                            <span style={{ fontWeight: 700, color: 'var(--ef-warning)', fontSize: '12px' }}>VERIFYING...</span>
                        </div>
                        <div className="ef-alert-row">
                            <span><span className="ef-status-dot" style={{ background: 'var(--ef-success)' }}></span>Flow Direction Status</span>
                            <span style={{ fontWeight: 700, color: 'var(--ef-success)', fontSize: '12px' }}>NORMAL</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EvaraFlow;
