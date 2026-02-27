export interface Region {
    id: string;
    name: string;
    code: string;
    stats: {
        communities: number;
        customers: number;
        activeAlerts: number;
    }
}

export interface Community {
    id: string;
    regionId: string;
    name: string;
    zone: string;
    stats: {
        nodes: number;
        health: number; // percentage
    }
}

export interface Device {
    id: string;
    type: 'EvaraTank' | 'EvaraFlow' | 'EvaraDeep';
    status: 'online' | 'offline' | 'alert';
    lastSeen: string;
}

export interface Customer {
    id: string;
    communityId: string;
    name: string;
    email: string;
    phone: string;
    distributorId?: string;
    devices: Device[];
}

export const REGIONS: Region[] = [
    { id: 'hyd', name: 'Hyderabad', code: 'HYD', stats: { communities: 0, customers: 0, activeAlerts: 0 } },
    { id: 'blr', name: 'Bengaluru', code: 'BLR', stats: { communities: 0, customers: 0, activeAlerts: 0 } },
    { id: 'mum', name: 'Mumbai', code: 'MUM', stats: { communities: 0, customers: 0, activeAlerts: 0 } },
    { id: 'ngp', name: 'Nagpur', code: 'NGP', stats: { communities: 0, customers: 0, activeAlerts: 0 } },
];

export const COMMUNITIES: Community[] = [
    // Hyderabad
    { id: 'c1', regionId: 'hyd', name: 'Greenwood Heights', zone: 'Gachibowli', stats: { nodes: 0, health: 0 } },
    { id: 'c2', regionId: 'hyd', name: 'Cyber Towers', zone: 'Hitech City', stats: { nodes: 0, health: 0 } },
    { id: 'c3', regionId: 'hyd', name: 'Jubilee Enclave', zone: 'Jubilee Hills', stats: { nodes: 0, health: 0 } },
    // Bengaluru
    { id: 'c4', regionId: 'blr', name: 'Prestige Lakeside', zone: 'Whitefield', stats: { nodes: 0, health: 0 } },
    { id: 'c5', regionId: 'blr', name: 'Sobha City', zone: 'Hebbal', stats: { nodes: 0, health: 0 } },
    // Mumbai
    { id: 'c6', regionId: 'mum', name: 'Lodha World', zone: 'Lower Parel', stats: { nodes: 0, health: 0 } },
];

export const CUSTOMERS: Customer[] = [
    // Distributor 1 Clients (3 Customers)
    {
        id: 'u1', communityId: 'c1', name: 'Rajesh Kumar', email: 'rajesh@example.com', phone: '+91 9876543210',
        distributorId: 'dev-bypass-distributor',
        devices: [
            { id: 'dev1', type: 'EvaraTank', status: 'online', lastSeen: '2 mins ago' },
            { id: 'dev2', type: 'EvaraFlow', status: 'online', lastSeen: '1 min ago' }
        ]
    },
    {
        id: 'u2', communityId: 'c3', name: 'Sneha Reddy', email: 'sneha@example.com', phone: '+91 9876543211',
        distributorId: 'dev-bypass-distributor',
        devices: [
            { id: 'dev3', type: 'EvaraDeep', status: 'alert', lastSeen: '10 mins ago' }
        ]
    },
    {
        id: 'u3', communityId: 'c2', name: 'Vikram Singh', email: 'vikram@example.com', phone: '+91 9876543212',
        distributorId: 'dev-bypass-distributor',
        devices: [
            { id: 'dev4', type: 'EvaraTank', status: 'online', lastSeen: '1 hour ago' }
        ]
    },

    // Distributor 2 Clients (2 Customers)
    {
        id: 'u4', communityId: 'c4', name: 'Amit Patel', email: 'amit@example.com', phone: '+91 9876543213',
        distributorId: 'dev-bypass-distributor-2',
        devices: [
            { id: 'dev5', type: 'EvaraTank', status: 'offline', lastSeen: '5 hours ago' }
        ]
    },
    {
        id: 'u5', communityId: 'c5', name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 9876543214',
        distributorId: 'dev-bypass-distributor-2',
        devices: [
            { id: 'dev6', type: 'EvaraDeep', status: 'online', lastSeen: '30 mins ago' }
        ]
    }
];
