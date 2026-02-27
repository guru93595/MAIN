import EvaraTank from '../pages/EvaraTank';
import { useNodes } from '../hooks/useNodes';

const EvaraTankWrapper = () => {
    const { nodes, loading } = useNodes();
    
    // Find the first tank node
    const tankNode = nodes?.find((node: any) => 
        (node.analytics_type || '') === 'EvaraTank' && node.status === 'Online'
    ) || nodes?.find((node: any) => 
        (node.analytics_type || '') === 'EvaraTank'
    );

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!tankNode) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-600 mb-2">No Tank Node Available</h2>
                    <p className="text-slate-400">Please configure a tank node to view analytics.</p>
                </div>
            </div>
        );
    }

    return <EvaraTank nodeId={tankNode.id} />;
};

export default EvaraTankWrapper;
