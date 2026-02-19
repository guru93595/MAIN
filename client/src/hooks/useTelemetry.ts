import { useState, useEffect, useCallback } from 'react';
import { getLiveTelemetry, type LiveTelemetry } from '../services/devices';

export const useTelemetry = (nodeId: string | undefined, intervalMs: number = 30000) => {
    const [data, setData] = useState<LiveTelemetry | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTelemetry = useCallback(async () => {
        if (!nodeId) return;
        setLoading(true);
        try {
            const telemetry = await getLiveTelemetry(nodeId);
            setData(telemetry);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to fetch telemetry");
            console.error(`Telemetry Error for ${nodeId}:`, err);
        } finally {
            setLoading(false);
        }
    }, [nodeId]);

    useEffect(() => {
        if (!nodeId) return;

        // Initial fetch
        fetchTelemetry();

        // Polling loop
        const interval = setInterval(fetchTelemetry, intervalMs);

        return () => clearInterval(interval);
    }, [nodeId, fetchTelemetry, intervalMs]);

    return { data, loading, error, refresh: fetchTelemetry };
};
