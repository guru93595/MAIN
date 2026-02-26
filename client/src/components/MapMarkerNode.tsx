import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { NodeTooltip } from './NodeTooltip';
import { NodePopup } from './NodePopup';
import type { NodeRow } from '../types/database';

// Custom Icons Configuration
const createIcon = (color: string) => L.divIcon({
    className: `custom-marker-${color}`,
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin drop-shadow-lg"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
});

const icons = {
    purple: createIcon('#9333ea'), // PumpHouse
    green: createIcon('#16a34a'),  // Sump
    blue: createIcon('#2563eb'),   // OHT
    yellow: createIcon('#eab308'), // Borewell
    black: createIcon('#1e293b'),  // GovtBorewell
    red: createIcon('#ef4444'),    // Offline/Alert
};

interface MapMarkerNodeProps {
    node: NodeRow;
}

export const MapMarkerNode = ({ node }: MapMarkerNodeProps) => {
    // Determine Icon based on category and status
    let icon = icons.blue;
    if (node.status === 'Offline' || node.status === 'Alert' || node.status === 'Maintenance') {
        icon = icons.red;
    } else {
        switch (node.category) {
            case 'PumpHouse': icon = icons.purple; break;
            case 'Sump': icon = icons.green; break;
            case 'OHT': icon = icons.blue; break;
            case 'Borewell': 
            case 'GovtBorewell': icon = icons.yellow; break;
            case 'FlowMeter': icon = icons.blue; break; // Added FlowMeter support
            default: icon = icons.blue;
        }
    }

    return (
        <Marker
            position={[node.lat || 17.44, node.lng || 78.34]}
            icon={icon}
        >
            {/* Real-time Tooltip (Hover) */}
            <NodeTooltip
                nodeId={node.id}
                label={node.label || node.id}
                category={node.category}
            />

            {/* Click Popup (Details/Link) */}
            <NodePopup
                nodeId={node.id}
                nodeKey={node.node_key}
                label={node.label || node.id}
                category={node.category}
                status={node.status}
            />
        </Marker>
    );
};
