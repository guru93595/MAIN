import api from './api';

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

    async createDevice(data: {
        hardware_id: string;
        device_label: string;
        device_type: string;
        analytics_type: string;
        community_id?: string;
        customer_id?: string;
        lat?: number;
        long?: number;
        thingspeak_mappings?: any[];
    }) {
        const response = await api.post('/nodes', data);
        return response.data;
    },

    async updateDevice(id: string, data: any) {
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
