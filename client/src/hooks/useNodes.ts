import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import type { NodeRow } from '../types/database';

export const useNodes = () => {
    const [nodes, setNodes] = useState<NodeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNodes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get<NodeRow[]>('/nodes/');
            console.log('🔍 Nodes API Response:', response.data);
            setNodes(response.data);
            setError(null);
        } catch (err: any) {
            const status = err.response?.status;
            const detail = err.response?.data?.detail;
            console.error('❌ Error fetching nodes:', err);
            console.error('Response status:', status);
            console.error('Response detail:', detail);
            
            if (status === 401) {
                const msg = typeof detail === "string" && detail.includes("not synchronized")
                    ? "Your account is not synced with the backend. Please log out and log in again."
                    : "Please log in again to view nodes.";
                setError(msg);
            } else {
                setError(typeof detail === "string" ? detail : "Failed to fetch nodes");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNodes();

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
                    fetchNodes();
                }
            } catch (e) {
                // Not JSON or non-standard message
            }
        };

        socket.onclose = () => console.log("WS Disconnected");
        socket.onerror = (err) => console.error("WS Error:", err);

        return () => {
            socket.close();
        };
    }, [fetchNodes]);

    return { nodes, loading, error, refresh: fetchNodes };
};
