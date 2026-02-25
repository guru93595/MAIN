import api from './api';

export interface NodeAnalytics {
    id: string;
    node_id: string;
    period_type: string;
    period_start: string;
    consumption_liters?: number;
    avg_level_percent?: number;
    peak_flow?: number;
    analytics_metadata?: any;
    created_at: string;
}

export interface AnalyticsSummary {
    node_id: string;
    period_days: number;
    total_consumption_liters: number;
    average_level_percent: number;
    max_peak_flow: number;
    data_points: number;
}

export const getNodeAnalytics = async (
    nodeId: string,
    periodType?: string,
    limit: number = 100
): Promise<NodeAnalytics[]> => {
    const params = new URLSearchParams();
    if (periodType) params.append('period_type', periodType);
    params.append('limit', limit.toString());
    
    const response = await api.get<NodeAnalytics[]>(`/analytics/node/${nodeId}?${params}`);
    return response.data;
};

export const getRecentAnalytics = async (
    periodType?: string,
    days: number = 7,
    limit: number = 100
): Promise<NodeAnalytics[]> => {
    const params = new URLSearchParams();
    if (periodType) params.append('period_type', periodType);
    params.append('days', days.toString());
    params.append('limit', limit.toString());
    
    const response = await api.get<NodeAnalytics[]>(`/analytics/recent?${params}`);
    return response.data;
};

export const getAnalyticsSummary = async (
    nodeId: string,
    days: number = 30
): Promise<AnalyticsSummary> => {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    
    const response = await api.get<AnalyticsSummary>(`/analytics/summary/${nodeId}?${params}`);
    return response.data;
};
