export interface ThingSpeakField {
    field_id: string;
    value: number;
    timestamp: string;
}

export interface ThingSpeakFeed {
    created_at: string;
    entry_id: number;
    field1?: number;
    field2?: number;
    field3?: number;
    field4?: number;
    field5?: number;
    field6?: number;
    field7?: number;
    field8?: number;
}

export interface ThingSpeakChannel {
    id: number;
    name: string;
    description: string;
    latitude?: number;
    longitude?: number;
    created_at: string;
    last_entry_id: number;
    fields: Record<string, string>;
}

export interface ThingSpeakResponse {
    channel: ThingSpeakChannel;
    feeds: ThingSpeakFeed[];
}

const THINGSPEAK_API_BASE = 'https://api.thingspeak.com';

export class ThingSpeakService {
    private apiKey: string;

    constructor(apiKey: string = '') {
        this.apiKey = apiKey;
    }

    async getChannelData(
        channelId: string,
        results: number = 100,
        days: number = 7,
        average?: string,
        round?: number
    ): Promise<ThingSpeakResponse> {
        const params = new URLSearchParams({
            results: results.toString(),
            days: days.toString(),
        });

        if (this.apiKey) {
            params.append('api_key', this.apiKey);
        }
        if (average) {
            params.append('average', average);
        }
        if (round !== undefined) {
            params.append('round', round.toString());
        }

        const response = await fetch(
            `${THINGSPEAK_API_BASE}/channels/${channelId}/feeds.json?${params}`
        );

        if (!response.ok) {
            throw new Error(`ThingSpeak API error: ${response.statusText}`);
        }

        return response.json();
    }

    async getFieldData(
        channelId: string,
        field: number,
        results: number = 100,
        days: number = 7,
        average?: string,
        round?: number
    ): Promise<ThingSpeakFeed[]> {
        const params = new URLSearchParams({
            results: results.toString(),
            days: days.toString(),
        });

        if (this.apiKey) {
            params.append('api_key', this.apiKey);
        }
        if (average) {
            params.append('average', average);
        }
        if (round !== undefined) {
            params.append('round', round.toString());
        }

        const response = await fetch(
            `${THINGSPEAK_API_BASE}/channels/${channelId}/fields/${field}.json?${params}`
        );

        if (!response.ok) {
            throw new Error(`ThingSpeak API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.feeds;
    }

    async getChannelInfo(channelId: string): Promise<ThingSpeakChannel> {
        const params = new URLSearchParams();
        if (this.apiKey) {
            params.append('api_key', this.apiKey);
        }

        const response = await fetch(
            `${THINGSPEAK_API_BASE}/channels/${channelId}.json?${params}`
        );

        if (!response.ok) {
            throw new Error(`ThingSpeak API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.channel;
    }

    async getRealtimeData(channelId: string): Promise<ThingSpeakFeed[]> {
        const params = new URLSearchParams();
        if (this.apiKey) {
            params.append('api_key', this.apiKey);
        }

        const response = await fetch(
            `${THINGSPEAK_API_BASE}/channels/${channelId}/feeds.json?${params}&results=1`
        );

        if (!response.ok) {
            throw new Error(`ThingSpeak API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.feeds;
    }

    formatFeedsForChart(feeds: ThingSpeakFeed[], field: string): Array<{ timestamp: string; value: number }> {
        return feeds
            .filter(feed => feed[field as keyof ThingSpeakFeed] !== undefined && feed[field as keyof ThingSpeakFeed] !== null)
            .map(feed => ({
                timestamp: feed.created_at,
                value: Number(feed[field as keyof ThingSpeakFeed])
            }))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    extractAllFields(feeds: ThingSpeakFeed[]): Record<string, Array<{ timestamp: string; value: number }>> {
        const fields: Record<string, Array<{ timestamp: string; value: number }>> = {};
        
        feeds.forEach(feed => {
            Object.keys(feed).forEach(key => {
                if (key.startsWith('field') && feed[key as keyof ThingSpeakFeed] !== undefined && feed[key as keyof ThingSpeakFeed] !== null) {
                    if (!fields[key]) {
                        fields[key] = [];
                    }
                    fields[key].push({
                        timestamp: feed.created_at,
                        value: Number(feed[key as keyof ThingSpeakFeed])
                    });
                }
            });
        });

        Object.keys(fields).forEach(field => {
            fields[field].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        });

        return fields;
    }
}

export const thingSpeakService = new ThingSpeakService();
