const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const adminService = {
    async createCommunity(data: { name: string; region: string }) {
        const response = await fetch(`${API_URL}/communities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create community');
        return response.json();
    },

    async createCustomer(data: { name: string; email: string; community_id: string }) {
        const response = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create customer');
        return response.json();
    },

    async createDevice(data: { hardware_id: string; type: string }) {
        const response = await fetch(`${API_URL}/devices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to provision device');
        return response.json();
    },

    async updateSystemConfig(data: { rate: number; firmware: string }) {
        const response = await fetch(`${API_URL}/system/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update config');
        return response.json();
    }
};
