import api from './api';

// TypeScript interfaces for device operations
export interface ThingSpeakMapping {
    channel_id: string;
    read_api_key?: string;
    write_api_key?: string;
    field_mapping?: Record<string, string>;
}

export interface TankConfig {
    tank_shape?: 'cylinder' | 'rectangular';
    dimension_unit?: 'm' | 'cm' | 'feet' | 'inches';
    radius?: number | null;
    height?: number | null;
    length?: number | null;
    breadth?: number | null;
}

export interface DeepConfig {
    static_depth?: number;
    dynamic_depth?: number;
    recharge_threshold?: number;
}

export interface FlowConfig {
    pipe_diameter?: number;
    max_flow_rate?: number;
    abnormal_threshold?: number;
}

export interface CreateDevicePayload {
    node_key: string;
    label: string;
    category: 'OHT' | 'Sump' | 'Borewell' | 'GovtBorewell' | 'PumpHouse' | 'FlowMeter';
    analytics_type: 'EvaraTank' | 'EvaraDeep' | 'EvaraFlow';
    community_id?: string | null;
    customer_id?: string | null;
    lat?: number | null;
    lng?: number | null;
    thingspeak_mappings?: ThingSpeakMapping[] | null;
    config_tank?: TankConfig;
    config_deep?: DeepConfig;
    config_flow?: FlowConfig;
}

export interface UpdateDevicePayload extends CreateDevicePayload {
    id?: string;
}

export const adminService = {
    async getCommunities() {
        const response = await api.get('/communities');
        return response.data;
    },

    async getCustomers() {
        const response = await api.get('/customers');
        return response.data;
    },

    async getDistributors() {
        const response = await api.get('/distributors');
        return response.data;
    },

    async createCommunity(data: { name: string; region: string }) {
        const response = await api.post('/communities', data);
        return response.data;
    },

    async createCustomer(data: {
        full_name: string;
        email: string;
        community_id: string;
        password?: string;
        contact_number?: string;
        city?: string;
        company_name?: string;
    }) {
        const response = await api.post('/customers/onboard', data);
        return response.data;
    },

    async createDevice(data: CreateDevicePayload) {
        const response = await api.post('/nodes', data);
        return response.data;
    },

    async updateDevice(id: string, data: CreateDevicePayload) {
        const response = await api.put(`/nodes/${id}`, data);
        return response.data;
    },

    async deleteDevice(id: string) {
        const response = await api.delete(`/nodes/${id}`);
        return response.data;
    },

    async updateSystemConfig(data: { rate: number; firmware: string }) {
        const response = await api.put('/system/config', data);
        return response.data;
    },

    async getStats() {
        const response = await api.get('/stats');
        return response.data;
    },

    async getAuditLogs(skip = 0, limit = 50) {
        const response = await api.get(`/audit?skip=${skip}&limit=${limit}`);
        return response.data;
    }
};
