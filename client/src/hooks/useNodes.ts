import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../services/api';
import type { NodeRow } from '../types/database';

// ─── Module-level cache (30s TTL) ───────────────────────────────────────────
let _cachedNodes: NodeRow[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

export const useNodes = () => {
    const [nodes, setNodes] = useState<NodeRow[]>(_cachedNodes ?? []);
    const [loading, setLoading] = useState(!_cachedNodes);
    const [error, setError] = useState<string | null>(null);
    const isMounted = useRef(true);

    const fetchNodes = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const response = await api.get<NodeRow[]>('/nodes/?limit=100');
            console.log('🔍 Nodes API Response:', response.data);
            _cachedNodes = response.data;
            _cacheTimestamp = Date.now();
            if (isMounted.current) {
                setNodes(response.data);
                setError(null);
            }
        } catch (err: any) {
            const status = err.response?.status;
            const detail = err.response?.data?.detail;
            console.error('❌ Error fetching nodes:', err);
            console.error('Response status:', status);
            console.error('Response detail:', detail);

            if (isMounted.current) {
                if (status === 401) {
                    const msg = typeof detail === "string" && detail.includes("not synchronized")
                        ? "Your account is not synced with the backend. Please log out and log in again."
                        : "Please log in again to view nodes.";
                    setError(msg);
                } else {
                    setError(typeof detail === "string" ? detail : "Failed to fetch nodes");
                }
            }
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        isMounted.current = true;

        const now = Date.now();
        const cacheStale = now - _cacheTimestamp > CACHE_TTL_MS;

        if (_cachedNodes && !cacheStale) {
            // Serve from cache immediately, then silently refresh in background
            setNodes(_cachedNodes);
            setLoading(false);
            fetchNodes(true); // background refresh
        } else {
            fetchNodes(false);
        }

        // ─── WebSocket Reactive Listener ───
        const wsBase = import.meta.env.VITE_API_URL
            ? import.meta.env.VITE_API_URL.replace('http', 'ws')
            : 'ws://localhost:8000/api/v1';

        const wsUrl = `${wsBase}/ws/ws`;
        console.log("Connecting to WebSocket:", wsUrl);

        const socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event === "NODE_PROVISIONED" || data.event === "STATUS_UPDATE") {
                    console.log(`🚀 ${data.event} signal received! Refreshing fleet...`);
                    fetchNodes(true);
                }
            } catch (e) {
                // Not JSON or non-standard message
            }
        };

        socket.onclose = () => console.log("WS Disconnected");
        socket.onerror = (err) => console.error("WS Error:", err);

        return () => {
            isMounted.current = false;
            socket.close();
        };
    }, [fetchNodes]);

    return { nodes, loading, error, refresh: () => fetchNodes(false) };
};
