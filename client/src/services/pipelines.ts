import api from './api';

export interface Pipeline {
    id: string;
    name: string;
    color: string;
    positions: number[][];
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export const getPipelines = async (): Promise<Pipeline[]> => {
    const response = await api.get<Pipeline[]>('/pipelines/');
    return response.data;
};

export const createPipeline = async (pipeline: {
    name: string;
    color?: string;
    positions?: number[][];
}): Promise<Pipeline> => {
    const response = await api.post<Pipeline>('/pipelines/', pipeline);
    return response.data;
};

export const deletePipeline = async (id: string): Promise<void> => {
    await api.delete(`/pipelines/${id}`);
};
