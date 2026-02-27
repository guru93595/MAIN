import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { getDeviceDetails } from '../services/devices';
import NodeNotConfigured from '../components/NodeNotConfigured';
import './EvaraTank.css';

// ============================================================
// CONFIGURATION CONSTANTS
// ============================================================
const CHART_MAX_POINTS = 10;  // Rolling 10-value history
const POLL_INTERVAL_MS = 15000;  // 15s polling for live data
interface EvaraTankProps {
    embedded?: boolean;
    nodeId?: string;
}

interface TankConfig {
    height: number;
    length?: number;
    breadth?: number;
}

interface ChartDataPoint {
    label: string;  // Time label for X-axis
    value: number;  // Water height in cm
    timestamp: string;  // ISO timestamp
}

interface AlertState {
    state: 'green' | 'orange' | 'red';
    text: string;
}

interface TankData {
    percent: number;
    volume: number;
    fillHeight: number;
    meters: number;
    lowAlert: AlertState;
    overAlert: AlertState;
    rapidAlert: AlertState;
    sensorAlert: AlertState;
    totalCapacityLiters: number;
    hasValidData: boolean;
}

// ============================================================
// SKELETON COMPONENT - Non-blocking loading UI
// ============================================================
const TankSkeleton = () => (
    <div className="evara-tank-body">
        <div className="et-main-content" style={{ padding: '20px' }}>
            <div className="et-dashboard-grid">
                {/* Tank Level Skeleton */}
                <div className="et-card" style={{ background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '60px', height: '120px', background: '#e2e8f0', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
                        <div>
                            <div style={{ width: '80px', height: '16px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />
                            <div style={{ width: '120px', height: '32px', background: '#e2e8f0', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                        </div>
                    </div>
                </div>
                {/* KPI Skeletons */}
                {[1, 2, 3].map(i => (
                    <div key={i} className="et-card" style={{ background: '#f8fafc' }}>
                        <div style={{ width: '100px', height: '14px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }} />
                        <div style={{ width: '80px', height: '28px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />
                        <div style={{ width: '60px', height: '12px', background: '#e2e8f0', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                    </div>
                ))}
                {/* Chart Skeleton */}
                <div className="et-card et-span-3" style={{ background: '#f8fafc' }}>
                    <div style={{ width: '200px', height: '20px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '20px', animation: 'pulse 1.5s infinite' }} />
                    <div style={{ height: '200px', background: '#e2e8f0', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
                </div>
            </div>
        </div>
    </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================
const EvaraTank = ({ embedded = false, nodeId }: EvaraTankProps) => {
    // Chart Refs
    const levelChartRef = useRef<HTMLCanvasElement>(null);
    const usageChartRef = useRef<HTMLCanvasElement>(null);
    const refillChartRef = useRef<HTMLCanvasElement>(null);

    // Chart Instances
    const chartInstances = useRef<{
        level: Chart | null;
        usage: Chart | null;
        refill: Chart | null;
    }>({ level: null, usage: null, refill: null });

    // State
    const [filter, setFilter] = useState('live');
    const [configLoading, setConfigLoading] = useState(true);  // Config fetch loading
    const [deviceStatus, setDeviceStatus] = useState<string>('unknown');
    const [tankConfig, setTankConfig] = useState<TankConfig | null>(null);
    const [tsConfig, setTsConfig] = useState<{ channelId: string | null; readApiKey: string | null } | null>(null);

    // Chart data history (rolling 10 values)
    const [chartHistory, setChartHistory] = useState<ChartDataPoint[]>([]);

    const [data, setData] = useState<TankData>({
        percent: 0,
        volume: 0,
        fillHeight: 0,
        meters: 0,
        lowAlert: { state: 'green', text: 'NORMAL' },
        overAlert: { state: 'green', text: 'MINIMAL' },
        rapidAlert: { state: 'green', text: 'NORMAL' },
        sensorAlert: { state: 'green', text: 'CONNECTED' },
        totalCapacityLiters: 0,
        hasValidData: false,
    });

    // ============================================================
    // MEMOIZED CHART CONFIG - Prevents recalculation on every render
    // ============================================================
    const levelChartConfig = useMemo(() => ({
        type: 'line' as const,
        data: {
            labels: [] as string[],
            datasets: [{
                label: 'Water Level (cm)',
                data: [] as number[],
                borderColor: '#4F46E5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: '#4F46E5'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            scales: {
                x: {
                    title: { display: true, text: 'Time' },
                    ticks: { maxRotation: 45, minRotation: 0 }
                },
                y: {
                    beginAtZero: true,
                    max: 250,
                    title: { display: true, text: 'Water Level (cm)' }
                }
            },
            plugins: { legend: { display: false } }
        }
    }), []);

    // ============================================================
    // CALCULATION HELPERS
    // ============================================================
    const calculateWaterHeight = useCallback((distanceCm: number, tankHeightM: number): number => {
        const tankHeightCm = tankHeightM * 100;
        const clampedDistance = Math.min(distanceCm, tankHeightCm);
        return Math.max(0, tankHeightCm - clampedDistance);
    }, []);


    const formatTimeLabel = useCallback((isoTimestamp: string): string => {
        try {
            return new Date(isoTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    }, []);

    // ============================================================
    // 1. FETCH DATA (DEVICE CONFIG + THINGSPEAK 10 RESULTS)
    // ============================================================
    useEffect(() => {
        if (!nodeId) return;

        let isMounted = true;
        const fetchData = async () => {
            try {
                setConfigLoading(true);

                // 1. Fetch Config
                const node = await getDeviceDetails(nodeId);
                if (!isMounted) return;

                setDeviceStatus(node.status || 'unknown');

                let channelId = null;
                let readApiKey = null;

                // RULE 2: Prioritize explicit mappings from DB
                if ((node.thingspeak_mappings?.length ?? 0) > 0) {
                    const primary = node.thingspeak_mappings![0];
                    if (primary.channel_id && primary.channel_id !== '12397') {
                        channelId = primary.channel_id;
                        readApiKey = primary.read_api_key;
                    }
                }

                // Fallback to top-level if not '12397' (Public weather station)
                if (!channelId && node.thingspeak_channel_id && node.thingspeak_channel_id !== '12397') {
                    channelId = node.thingspeak_channel_id;
                    readApiKey = node.thingspeak_read_api_key ?? null;
                }

                setTsConfig({ channelId, readApiKey });

                const nodeAny = node as any;
                const tHeight = nodeAny.config_tank?.height ?? 0;
                const tLength = nodeAny.config_tank?.length ?? 0;
                const tBreadth = nodeAny.config_tank?.breadth ?? 0;
                const tankCfg = { height: tHeight, length: tLength, breadth: tBreadth };
                setTankConfig(tankCfg);
                setConfigLoading(false);

                // 2. Fetch ThingSpeak Data directly (Last 10)
                if (channelId) {
                    const tsUrl = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey || ''}&results=10`;
                    const tsRes = await fetch(tsUrl);
                    if (!tsRes.ok) throw new Error('ThingSpeak fetch failed');
                    const tsData = await tsRes.json();

                    if (!isMounted) return;

                    if (tsData.feeds && tsData.feeds.length > 0) {
                        // Chronological order explicitly
                        const feeds = tsData.feeds.sort((a: any, b: any) =>
                            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        );

                        const historicalPoints: ChartDataPoint[] = feeds.map((feed: any) => {
                            // RULE 2 & 5: STRICT Distance (field2)
                            const distanceCm = parseFloat(String(feed.field2 || 'nan'));
                            const waterHeightCm = calculateWaterHeight(distanceCm, tHeight);

                            // Debug logging for Rule 5
                            if (isNaN(distanceCm)) {
                                console.warn(`[INTEGRITY] Invalid historical distance feed_id=${feed.entry_id}`);
                            }

                            return {
                                label: formatTimeLabel(feed.created_at),
                                value: waterHeightCm,
                                timestamp: feed.created_at
                            };
                        });

                        setChartHistory(historicalPoints);

                        // Update current state with latest feed
                        const latestFeed = feeds[feeds.length - 1];
                        // RULE 2 & 5: Pass channelId directly for reliable log
                        updateTankData({ field2: latestFeed.field2 }, tankCfg, channelId);
                    } else {
                        // RULE 7: If no data, reset to 0
                        setChartHistory([]);
                        updateTankData({ field2: null }, tankCfg, channelId);
                    }
                }
            } catch (err) {
                console.error('Fetch error:', err);
                if (isMounted) {
                    setConfigLoading(false);
                }
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [nodeId, calculateWaterHeight]);

    // ============================================================
    // UPDATE TANK DATA HELPER
    // ============================================================
    const updateTankData = useCallback((feed: any, config: any, activeChannel?: string | null) => {
        // RULE 2: Strictly use field2 (Distance)
        const rawDistance = feed.field2;
        const sensorReading = parseFloat(String(rawDistance));

        const height = config.height || 0;
        const length = config.length || 0;
        const breadth = config.breadth || 0;

        // RULE 5: Console log full debug object
        const debugObj = {
            channelId: activeChannel || tsConfig?.channelId,
            distanceCm: sensorReading,
            tankHeightCm: height * 100,
            waterHeight: 0,
            percentage: 0
        };

        if (isNaN(sensorReading) || sensorReading <= 0 || height <= 0) {
            console.error('[INTEGRITY] Invalid inputs for calculation:', debugObj);
            setData(prev => ({
                ...prev,
                percent: 0,
                volume: 0,
                fillHeight: 0,
                hasValidData: false,
                sensorAlert: { state: 'red', text: height <= 0 ? 'TANK NOT CONFIGURED' : 'INVALID SENSOR DATA' }
            }));
            return;
        }

        // RULE 3: Calculation Level Correctly
        const tankHeightCm = height * 100;
        const clampedDistance = Math.min(sensorReading, tankHeightCm);
        const waterHeightCm = Math.max(0, tankHeightCm - clampedDistance);

        let percentage = (waterHeightCm / tankHeightCm) * 100;
        percentage = Math.max(0, Math.min(100, percentage));

        const totalVolumeM3 = length && breadth ? length * breadth * height : 0;
        const totalCapacityLiters = totalVolumeM3 * 1000;
        const volume = (percentage / 100) * totalCapacityLiters;

        // Finalize debug obj
        debugObj.waterHeight = waterHeightCm;
        debugObj.percentage = percentage;
        console.log('[INTEGRITY] Successful Calculation:', debugObj);

        let lowAlert: AlertState = { state: 'green', text: 'NORMAL' };
        if (percentage < 20) lowAlert = { state: 'orange', text: 'ATTENTION REQUIRED' };

        let overAlert: AlertState = { state: 'green', text: 'MINIMAL' };
        if (percentage > 90) overAlert = { state: 'red', text: 'CRITICAL' };

        setData({
            percent: percentage,
            volume,
            fillHeight: percentage,
            meters: height,
            totalCapacityLiters,
            lowAlert,
            overAlert,
            rapidAlert: { state: 'green', text: 'NORMAL' },
            sensorAlert: { state: 'green', text: 'CONNECTED' },
            hasValidData: true,
        });
    }, [tsConfig?.channelId]);

    // ============================================================
    // 2. INITIALIZE CHARTS (After config loaded)
    // ============================================================
    useEffect(() => {
        if (configLoading || (!tsConfig?.channelId && !embedded)) return;

        console.log("\ud83c\udfa8 Initializing charts...");

        // Level Chart
        if (levelChartRef.current) {
            if (chartInstances.current.level) chartInstances.current.level.destroy();
            chartInstances.current.level = new Chart(levelChartRef.current, levelChartConfig);
        }

        // Usage Chart - RULE 1: Remove mock data [95, 5]
        if (usageChartRef.current) {
            if (chartInstances.current.usage) chartInstances.current.usage.destroy();
            chartInstances.current.usage = new Chart(usageChartRef.current, {
                type: 'doughnut',
                data: { labels: ['Normal', 'Abnormal'], datasets: [{ data: [100, 0], backgroundColor: ['#4F46E5', '#EF4444'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { legend: { display: false } } } as any
            });
        }

        // Refill Chart - RULE 1: Remove mock data [2.4, 1.6]
        if (refillChartRef.current) {
            if (chartInstances.current.refill) chartInstances.current.refill.destroy();
            chartInstances.current.refill = new Chart(refillChartRef.current, {
                type: 'doughnut',
                data: { labels: ['Cycles', 'Remaining'], datasets: [{ data: [0, 100], backgroundColor: ['#3B82F6', '#F1F5F9'], borderWidth: 0, borderRadius: 20 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '85%', plugins: { legend: { display: false }, tooltip: { enabled: false } } } as any
            });
        }

        return () => {
            if (chartInstances.current.level) chartInstances.current.level.destroy();
            if (chartInstances.current.usage) chartInstances.current.usage.destroy();
            if (chartInstances.current.refill) chartInstances.current.refill.destroy();
            chartInstances.current = { level: null, usage: null, refill: null };
        };
    }, [configLoading, tsConfig?.channelId, embedded, levelChartConfig]);

    // ============================================================
    // 3. UPDATE CHART WITH HISTORICAL DATA
    // ============================================================
    useEffect(() => {
        const levelChart = chartInstances.current.level;
        if (!levelChart || chartHistory.length === 0) return;

        console.log("\ud83d\udcca Updating chart with", chartHistory.length, "historical points");

        // Update chart with historical data
        levelChart.data.labels = chartHistory.map(p => p.label);
        levelChart.data.datasets[0].data = chartHistory.map(p => p.value);
        levelChart.update('none');  // Skip animation for initial load
    }, [chartHistory]);

    // ============================================================
    // 4. LIVE DATA POLLING
    // ============================================================
    useEffect(() => {
        if (!tsConfig?.channelId || !tankConfig?.height) return;

        const fetchLiveData = async () => {
            try {
                const tsUrl = `https://api.thingspeak.com/channels/${tsConfig.channelId}/feeds/last.json?api_key=${tsConfig.readApiKey || ''}`;
                const res = await fetch(tsUrl);
                if (!res.ok) return;

                const feed = await res.json();
                if (!feed || !feed.field2) return;

                const distanceCm = parseFloat(String(feed.field2));
                const waterHeightCm = calculateWaterHeight(distanceCm, tankConfig.height);
                const timestamp = feed.created_at || new Date().toISOString();

                updateTankData({ field2: distanceCm }, tankConfig, tsConfig.channelId);

                setChartHistory(prev => {
                    const exists = prev.some(p => p.timestamp === timestamp);
                    if (exists) return prev;

                    const newPoint = {
                        label: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        value: waterHeightCm,
                        timestamp
                    };

                    const updated = [...prev, newPoint];
                    if (updated.length > CHART_MAX_POINTS) updated.shift();
                    return updated;
                });
            } catch (err) {
                console.error('Live fetch error:', err);
            }
        };

        const interval = setInterval(fetchLiveData, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [tsConfig, tankConfig, calculateWaterHeight, updateTankData]);

    // ============================================================
    // 5. SYNC CHART WITH HISTORY CHANGES
    // ============================================================
    useEffect(() => {
        const levelChart = chartInstances.current.level;
        if (!levelChart || chartHistory.length === 0) return;

        levelChart.data.labels = chartHistory.map(p => p.label);
        levelChart.data.datasets[0].data = chartHistory.map(p => p.value);
        levelChart.update();
    }, [chartHistory]);

    // ============================================================
    // ALERT CLASS HELPER
    // ============================================================
    const getAlertClass = (state: string) => {
        if (state === 'green') return { dot: 'et-alert-dot et-bg-green', text: 'et-alert-right et-status-green' };
        if (state === 'orange') return { dot: 'et-alert-dot et-bg-orange', text: 'et-alert-right et-status-orange' };
        if (state === 'red') return { dot: 'et-alert-dot et-bg-red', text: 'et-alert-right et-status-red' };
        return { dot: 'et-alert-dot', text: 'et-alert-right' };
    };

    // ============================================================
    // RENDER: Immediate Layout (Async Data)
    // ============================================================
    if (configLoading) {
        return <TankSkeleton />;
    }

    // Handle provisioning status ONLY if NO config is found
    if (deviceStatus === 'provisioning' && !tsConfig?.channelId) {
        return (
            <div className="evara-tank-body">
                <div className="provisioning-container" style={{ padding: '40px', textAlign: 'center' }}>
                    <h3>\u23f3 Device Provisioning</h3>
                    <p>This device is still being set up and configured.</p>
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', margin: '20px 0', textAlign: 'left' }}>
                        <h4>Device Details:</h4>
                        <p>Device ID: {nodeId}</p>
                        <p>Status: {deviceStatus}</p>
                        <p>ThingSpeak Config: Not Configured</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn-primary"
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--primary)', color: 'white' }}
                    >
                        Check Status
                    </button>
                </div>
            </div>
        );
    }

    // Handle missing ThingSpeak configuration
    if (!tsConfig?.channelId && !embedded) {
        return <NodeNotConfigured />;
    }

    return (
        <div className={`evara-tank-body${embedded ? ' et-embedded' : ''}`}>
            {!embedded && (
                <nav className="et-sidebar">
                    <Link to="/evaratank" style={{ textDecoration: 'none' }}>
                        <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', marginBottom: '25px' }}></div>
                    </Link>
                    <Link to="/evaradeep" style={{ textDecoration: 'none' }}>
                        <div style={{ width: '32px', height: '32px', background: '#E2E8F0', borderRadius: '10px', marginBottom: '25px' }}></div>
                    </Link>
                    <Link to="/evaraflow" style={{ textDecoration: 'none' }}>
                        <div style={{ width: '32px', height: '32px', background: '#E2E8F0', borderRadius: '10px' }}></div>
                    </Link>
                </nav>
            )}

            <main className="et-main-content">
                <header className="et-header">
                    <div className="et-header-title">
                        <h1>EvaraTank Analytics</h1>
                        <p>Real-Time Water Monitoring System</p>
                    </div>
                </header>

                <div className="et-dashboard-grid">

                    <div className="et-card">
                        <div className="et-tank-display">
                            <div className="et-tank-tube">
                                <div className="et-water-fill" style={{ height: `${data.fillHeight}%` }}></div>
                            </div>
                            <div>
                                <div className="et-kpi-label">Current Level</div>
                                <div className="et-percent-large">{data.percent.toFixed(1)}%</div>
                                <div className="et-meter-subtext">Total: {data.meters > 0 ? data.meters.toFixed(2) : '—'}m</div>
                            </div>
                        </div>
                    </div>

                    <div className="et-card">
                        <div className="et-kpi-label">Total Tank Volume</div>
                        <div className="et-kpi-value">{Math.round(data.totalCapacityLiters).toLocaleString()} L</div>
                        <div className="et-kpi-sub">Max Capacity</div>
                    </div>

                    <div className="et-card">
                        <div className="et-kpi-label">Available Volume</div>
                        <div className="et-kpi-value">{Math.round(data.volume).toLocaleString()} L</div>
                        <div className="et-kpi-sub">Calculated Real-Time</div>
                    </div>

                    <div className="et-card">
                        <div className="et-kpi-label">Est. Consumption</div>
                        <div className="et-kpi-value">0 L</div>
                        <div className="et-kpi-sub">Daily Calculation (Pending telemetry)</div>
                    </div>

                    <div className="et-card et-span-3">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px' }}>Real-Time Water Level</h3>
                            <div className="et-filter-group">
                                <button className={`et-filter-btn ${filter === 'live' ? 'active' : ''}`} onClick={() => setFilter('live')}>Live</button>
                                <button className={`et-filter-btn ${filter === '1h' ? 'active' : ''}`} onClick={() => setFilter('1h')}>1h</button>
                                <button className={`et-filter-btn ${filter === '6h' ? 'active' : ''}`} onClick={() => setFilter('6h')}>6h</button>
                                <button className={`et-filter-btn ${filter === '24h' ? 'active' : ''}`} onClick={() => setFilter('24h')}>24h</button>
                            </div>
                        </div>
                        <div className="et-chart-container">
                            <canvas ref={levelChartRef}></canvas>
                        </div>
                    </div>

                    <div className="et-card">
                        <h3 style={{ margin: '0 0 15px', fontSize: '14px' }}>Abnormal Usage</h3>
                        <div className="et-doughnut-container">
                            <canvas ref={usageChartRef}></canvas>
                        </div>
                        <div className="et-chart-legend">
                            <div className="et-legend-item"><span className="et-dot" style={{ background: '#4F46E5' }}></span> Normal</div>
                            <div className="et-legend-item"><span className="et-dot" style={{ background: '#EF4444' }}></span> Abnormal</div>
                        </div>
                    </div>

                    <div className="et-card">
                        <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Refill Cycles</h3>
                        <div className="et-ring-container">
                            <canvas ref={refillChartRef}></canvas>
                            <div className="et-ring-center-text">
                                <div className="et-kpi-value" style={{ color: 'var(--blue-accent)', margin: 0 }}>0.0</div>
                                <div className="et-sub-blue" style={{ fontSize: '11px' }}>Avg/Day</div>
                            </div>
                        </div>
                    </div>

                    <div className="et-card">
                        <h3 style={{ margin: '0 0 15px', fontSize: '14px' }}>Consumption Trends</h3>
                        <div className="et-list-container">
                            <div className="et-list-item">
                                <span className="et-list-label" style={{ color: 'var(--text-muted)' }}>Last 24 Hours</span>
                                <span className="et-list-value-bold">0 L</span>
                            </div>
                            <div className="et-list-item">
                                <span className="et-list-label" style={{ color: 'var(--text-muted)' }}>Last 3 Days</span>
                                <span className="et-list-value-bold">0 L</span>
                            </div>
                            <div className="et-list-item">
                                <span className="et-list-label" style={{ color: 'var(--text-muted)' }}>Last 7 Days</span>
                                <span className="et-list-value-bold">0 L</span>
                            </div>
                            <div className="et-list-item">
                                <span className="et-list-label" style={{ color: 'var(--text-muted)' }}>Last 30 Days</span>
                                <span className="et-list-value-bold">0 L</span>
                            </div>
                        </div>
                    </div>

                    <div className="et-card et-span-2">
                        <h3 style={{ margin: '0 0 20px', fontSize: '16px' }}>System Alerts</h3>
                        <div className="et-list-container">

                            <div className="et-list-item">
                                <div className="et-alert-left">
                                    <div className={getAlertClass(data.lowAlert.state).dot}></div>
                                    <span className="et-list-label">Low Water Level</span>
                                </div>
                                <div className={getAlertClass(data.lowAlert.state).text}>{data.lowAlert.text}</div>
                            </div>

                            <div className="et-list-item">
                                <div className="et-alert-left">
                                    <div className={getAlertClass(data.overAlert.state).dot}></div>
                                    <span className="et-list-label">Overflow Risk</span>
                                </div>
                                <div className={getAlertClass(data.overAlert.state).text}>{data.overAlert.text}</div>
                            </div>

                            <div className="et-list-item">
                                <div className="et-alert-left">
                                    <div className={getAlertClass(data.rapidAlert.state).dot}></div>
                                    <span className="et-list-label">Rapid Depletion</span>
                                </div>
                                <div className={getAlertClass(data.rapidAlert.state).text}>{data.rapidAlert.text}</div>
                            </div>

                            <div className="et-list-item">
                                <div className="et-alert-left">
                                    <div className={getAlertClass(data.sensorAlert.state).dot}></div>
                                    <span className="et-list-label">Sensor/Device Offline</span>
                                </div>
                                <div className={getAlertClass(data.sensorAlert.state).text}>{data.sensorAlert.text}</div>
                            </div>

                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default EvaraTank;
