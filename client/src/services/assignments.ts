import api from './api';

export interface NodeAssignment {
    id: string;
    node_id: string;
    user_id: string;
    assigned_by?: string;
    assigned_at: string;
    created_at: string;
}

export const getNodeAssignments = async (): Promise<NodeAssignment[]> => {
    const response = await api.get<NodeAssignment[]>('/assignments/');
    return response.data;
};

export const createNodeAssignment = async (assignment: {
    node_id: string;
    user_id: string;
}): Promise<NodeAssignment> => {
    const response = await api.post<NodeAssignment>('/assignments/', assignment);
    return response.data;
};

export const deleteNodeAssignment = async (id: string): Promise<void> => {
    await api.delete(`/assignments/${id}`);
};
