import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

export interface ChartDataPoint {
    timestamp: string;
    value: number;
    [key: string]: any;
}

interface AnalyticsChartProps {
    data: ChartDataPoint[];
    title: string;
    dataKey: string;
    color?: string;
    height?: number;
    type?: 'line' | 'area';
    unit?: string;
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
    data,
    title,
    dataKey,
    color = '#3b82f6',
    height = 300,
    type = 'line',
    unit = ''
}) => {
    const formatXAxis = (tickItem: string) => {
        const date = new Date(tickItem);
        return date.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTooltip = (value: any) => {
        return [`${value}${unit}`];
    };

    const ChartComponent = type === 'area' ? AreaChart : LineChart;
    const DataComponent = type === 'area' ? Area : Line;

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <h3 className="text-lg font-black text-slate-800 mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={height}>
                <ChartComponent data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatXAxis}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis 
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        label={{ value: unit, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }}
                    />
                    <Tooltip 
                        formatter={formatTooltip}
                        contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                    />
                    <DataComponent
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        fill={type === 'area' ? color : undefined}
                        fillOpacity={type === 'area' ? 0.3 : undefined}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                </ChartComponent>
            </ResponsiveContainer>
        </div>
    );
};

interface MultiFieldChartProps {
    data: ChartDataPoint[];
    title: string;
    fields: Array<{ key: string; name: string; color: string; unit?: string }>;
    height?: number;
    type?: 'line' | 'area';
}

export const MultiFieldChart: React.FC<MultiFieldChartProps> = ({
    data,
    title,
    fields,
    height = 300,
    type = 'line'
}) => {
    const formatXAxis = (tickItem: string) => {
        const date = new Date(tickItem);
        return date.toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTooltip = (value: any) => {
        return [`${value}`];
    };

    const ChartComponent = type === 'area' ? AreaChart : LineChart;
    const DataComponent = type === 'area' ? Area : Line;

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <h3 className="text-lg font-black text-slate-800 mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={height}>
                <ChartComponent data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatXAxis}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis 
                        tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <Tooltip 
                        formatter={formatTooltip}
                        contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                    />
                    <Legend 
                        wrapperStyle={{ fontSize: '12px' }}
                    />
                    {fields.map((field) => (
                        <DataComponent
                            key={field.key}
                            type="monotone"
                            dataKey={field.key}
                            name={field.name}
                            stroke={field.color}
                            fill={type === 'area' ? field.color : undefined}
                            fillOpacity={type === 'area' ? 0.3 : undefined}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    ))}
                </ChartComponent>
            </ResponsiveContainer>
        </div>
    );
};
