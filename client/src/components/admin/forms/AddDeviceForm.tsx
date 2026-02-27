import { useState } from 'react';
import { adminService } from '../../../services/admin';
import { Loader2, Database, Wifi, MapPin, Settings2, User, ChevronRight } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';

const LocationMarker = ({ lat, lng, onChange }: { lat: string, lng: string, onChange: (lat: string, lng: string) => void }) => {
    const map = useMap();
    useMapEvents({
        click(e) {
            onChange(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
        },
    });

    // Automatically fly to new coordinates if they change significantly
    if (lat && lng) {
        map.flyTo([parseFloat(lat), parseFloat(lng)], map.getZoom(), {
            animate: true,
            duration: 1
        });
    }

    const pos: [number, number] = (lat && lng) ? [parseFloat(lat), parseFloat(lng)] : [17.4455, 78.3510];
    return (lat && lng) ? <Marker position={pos} /> : null;
};

interface AddDeviceFormProps {
    onSubmit: (data: any) => void;
    onCancel: () => void;
    communities: any[];
    customers: any[];
    initialData?: any;
}

export const AddDeviceForm = ({ onSubmit, onCancel, communities, customers, initialData }: AddDeviceFormProps) => {
    const [step, setStep] = useState(1); // 1 = Identity, 2 = Config
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [formData, setFormData] = useState(() => {
        // Extract ThingSpeak data from either flat fields or nested mappings
        const tsMapping = initialData?.thingspeak_mappings?.[0];
        const channelId = tsMapping?.channel_id || initialData?.thingspeak?.channel_id || initialData?.thingspeak_channel_id || '';
        const readApiKey = tsMapping?.read_api_key || initialData?.thingspeak?.read_api_key || initialData?.thingspeak_read_api_key || '';

        // Extract tank config from nested config_tank object
        const tc = initialData?.config_tank;

        return {
            hardware_id: initialData?.hardware_id || initialData?.node_key || '',
            device_label: initialData?.device_label || initialData?.label || '',
            device_type: initialData?.device_type || initialData?.category || 'tank',
            analytics_type: initialData?.analytics_type || 'EvaraTank',
            community_id: initialData?.community_id || '',
            customer_id: initialData?.customer_id || '',
            lat: initialData?.lat?.toString() || '',
            long: (initialData?.lng || initialData?.long || '').toString(),
            thingspeak: {
                channel_id: channelId,
                read_api_key: readApiKey,
            },
            config: {
                // EvaraTank - Tank Shape Details
                tank_shape: tc?.tank_shape || initialData?.config?.tank_shape || 'cylinder',
                dimension_unit: tc?.dimension_unit || initialData?.config?.dimension_unit || 'm',
                radius: (tc?.radius || initialData?.config?.radius || '').toString(),
                height: (tc?.height || initialData?.config?.height || '').toString(),
                length: (tc?.length || initialData?.config?.length || '').toString(),
                breadth: (tc?.breadth || initialData?.config?.breadth || '').toString(),
                // EvaraDeep
                static_depth: initialData?.config_deep?.static_depth?.toString() || initialData?.config?.static_depth?.toString() || '',
                dynamic_depth: initialData?.config_deep?.dynamic_depth?.toString() || initialData?.config?.dynamic_depth?.toString() || '',
                recharge_threshold: initialData?.config_deep?.recharge_threshold?.toString() || initialData?.config?.recharge_threshold?.toString() || '',
                // EvaraFlow
                pipe_diameter: initialData?.config_flow?.pipe_diameter?.toString() || initialData?.config?.pipe_diameter?.toString() || '',
                max_flow_rate: initialData?.config_flow?.max_flow_rate?.toString() || initialData?.config?.max_flow_rate?.toString() || ''
            }
        };
    });

    const filteredCustomers = customers.filter(c => !formData.community_id || c.community_id === formData.community_id);

    const handleLocateMe = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        lat: position.coords.latitude.toFixed(6),
                        long: position.coords.longitude.toFixed(6)
                    }));
                },
                (err) => {
                    setError('Unable to retrieve your location. Check permissions.');
                    console.error(err);
                },
                { enableHighAccuracy: true }
            );
        } else {
            setError('Geolocation is not supported by your browser.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Prepare payload with correct backend field names
            const payload: any = {
                node_key: formData.hardware_id,
                label: formData.device_label,
                category: formData.device_type === 'tank' ? 'OHT' : 
                         formData.device_type === 'deep' ? 'Borewell' :
                         formData.device_type === 'flow' ? 'PumpHouse' : 'OHT',
                analytics_type: formData.analytics_type,
                community_id: formData.community_id || null,
                customer_id: formData.customer_id || null,
                lat: formData.lat ? parseFloat(formData.lat) : null,
                lng: formData.long ? parseFloat(formData.long) : null,
                thingspeak_mappings: formData.thingspeak.channel_id ? [{
                    channel_id: formData.thingspeak.channel_id,
                    read_api_key: formData.thingspeak.read_api_key,
                }] : null
            };

            // Add specialized config
            const cfg = formData.config;
            if (formData.analytics_type === 'EvaraTank') {
                const tankConfig: any = {
                    tank_shape: cfg.tank_shape,
                    dimension_unit: cfg.dimension_unit,
                    height: parseFloat(cfg.height) || null,
                };
                if (cfg.tank_shape === 'cylinder') {
                    tankConfig.radius = parseFloat(cfg.radius) || null;
                } else {
                    tankConfig.length = parseFloat(cfg.length) || null;
                    tankConfig.breadth = parseFloat(cfg.breadth) || null;
                }
                payload.config_tank = tankConfig;
            } else if (formData.analytics_type === 'EvaraDeep') {
                payload.config_deep = {
                    static_depth: parseFloat(cfg.static_depth) || 0,
                    dynamic_depth: parseFloat(cfg.dynamic_depth) || 0,
                    recharge_threshold: parseFloat(cfg.recharge_threshold) || 0
                };
            } else if (formData.analytics_type === 'EvaraFlow') {
                payload.config_flow = {
                    pipe_diameter: parseFloat(cfg.pipe_diameter) || 0,
                    max_flow_rate: parseFloat(cfg.max_flow_rate) || 0
                };
            }

            let result;
            if (initialData?.id) {
                result = await adminService.updateDevice(initialData.id, payload);
            } else {
                result = await adminService.createDevice(payload);
            }
            onSubmit(result);
        } catch (err: any) {
            setError(err.response?.data?.detail || `Failed to ${initialData ? 'update' : 'provision'} device.`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all";
    const labelCls = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";
    const sectionTitleCls = "flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-l-4 border-green-500 pl-3";

    const StepIndicator = ({ current }: { current: number }) => (
        <div className="flex items-center justify-center gap-4 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${current >= 1 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
            <div className={`w-16 h-1 rounded-full transition-all ${current >= 2 ? 'bg-green-600' : 'bg-slate-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${current >= 2 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
        </div>
    );

    const unitLabel = formData.config.dimension_unit === 'm' ? 'Meters' :
        formData.config.dimension_unit === 'cm' ? 'cm' :
            formData.config.dimension_unit === 'feet' ? 'Feet' : 'Inches';

    return (
        <div className="flex flex-col h-[75vh]">
            <StepIndicator current={step} />

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-center gap-3 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-1 pr-3 scrollbar-hide">

                {/* STEP 1: IDENTITY & CONTEXT */}
                {step === 1 && (
                    <div className="space-y-8 animate-fadeIn">
                        {/* 1. Basic Identity */}
                        <div>
                            <h3 className={sectionTitleCls}><Database size={14} /> Basic Identity</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Hardware ID</label>
                                    <input
                                        required
                                        value={formData.hardware_id}
                                        onChange={e => setFormData({ ...formData, hardware_id: e.target.value })}
                                        placeholder="EV-TNK-001"
                                        className={inputCls}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Device Label</label>
                                    <input
                                        required
                                        value={formData.device_label}
                                        onChange={e => setFormData({ ...formData, device_label: e.target.value })}
                                        placeholder="Main Sump"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Physical Category</label>
                                    <select
                                        className={inputCls}
                                        value={formData.device_type}
                                        onChange={e => setFormData({ ...formData, device_type: e.target.value })}
                                    >
                                        <option value="tank">Tank / Container</option>
                                        <option value="deep">Deep Well / Borewell</option>
                                        <option value="flow">Pipeline / Meter</option>
                                        <option value="custom">Custom Sensor</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Analytics Template</label>
                                    <select
                                        className={inputCls}
                                        value={formData.analytics_type}
                                        onChange={e => setFormData({ ...formData, analytics_type: e.target.value })}
                                    >
                                        <option value="EvaraTank">EvaraTank (Level/Vol)</option>
                                        <option value="EvaraDeep">EvaraDeep (Drawdown)</option>
                                        <option value="EvaraFlow">EvaraFlow (Consumption)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 2. Hierarchy & Ownership */}
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <h3 className={sectionTitleCls}><User size={14} /> Assignment</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Community</label>
                                    <select
                                        className={inputCls}
                                        value={formData.community_id}
                                        onChange={e => setFormData({ ...formData, community_id: e.target.value, customer_id: '' })}
                                    >
                                        <option value="">Select Community</option>
                                        {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Customer Account</label>
                                    <select
                                        className={inputCls}
                                        value={formData.customer_id}
                                        onChange={e => setFormData({ ...formData, customer_id: e.target.value })}
                                    >
                                        <option value="">Select Customer</option>
                                        {filteredCustomers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: TELEMETRY & CONFIG */}
                {step === 2 && (
                    <div className="space-y-8 animate-fadeIn">
                        {/* 3. Telemetry (ThingSpeak) */}
                        <div>
                            <h3 className={sectionTitleCls}><Wifi size={14} /> Telemetry Handshake</h3>
                            <div className="bg-white p-5 rounded-2xl border border-slate-200">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className={labelCls}>ThingSpeak Channel ID</label>
                                        <input
                                            required
                                            value={formData.thingspeak.channel_id}
                                            onChange={e => setFormData({
                                                ...formData,
                                                thingspeak: { ...formData.thingspeak, channel_id: e.target.value }
                                            })}
                                            placeholder="e.g. 2489123"
                                            className={inputCls}
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Read API Key</label>
                                        <input
                                            value={formData.thingspeak.read_api_key}
                                            onChange={e => setFormData({
                                                ...formData,
                                                thingspeak: { ...formData.thingspeak, read_api_key: e.target.value }
                                            })}
                                            placeholder="e.g. ABCD1234EFGH5678"
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Physical Specs */}
                        <div>
                            <h3 className={sectionTitleCls}><Settings2 size={14} /> Physical Specifications</h3>
                            <div className="p-5 bg-green-50/30 rounded-2xl border border-green-100">
                                {formData.analytics_type === 'EvaraTank' && (
                                    <div className="space-y-4">
                                        {/* Tank Shape & Unit Row */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelCls}>Tank Shape</label>
                                                <select
                                                    className={inputCls}
                                                    value={formData.config.tank_shape}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        config: { ...formData.config, tank_shape: e.target.value, radius: '', length: '', breadth: '' }
                                                    })}
                                                >
                                                    <option value="cylinder">Cylinder</option>
                                                    <option value="rectangular">Rectangular / Square</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelCls}>Dimension Unit</label>
                                                <select
                                                    className={inputCls}
                                                    value={formData.config.dimension_unit}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        config: { ...formData.config, dimension_unit: e.target.value }
                                                    })}
                                                >
                                                    <option value="m">Meters (m)</option>
                                                    <option value="cm">Centimeters (cm)</option>
                                                    <option value="feet">Feet (ft)</option>
                                                    <option value="inches">Inches (in)</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Dimension inputs based on shape */}
                                        {formData.config.tank_shape === 'cylinder' ? (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className={labelCls}>Radius ({unitLabel})</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.config.radius}
                                                        onChange={e => setFormData({ ...formData, config: { ...formData.config, radius: e.target.value } })}
                                                        placeholder="e.g. 1.5"
                                                        className={inputCls}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Height ({unitLabel})</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.config.height}
                                                        onChange={e => setFormData({ ...formData, config: { ...formData.config, height: e.target.value } })}
                                                        placeholder="e.g. 2.0"
                                                        className={inputCls}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className={labelCls}>Length ({unitLabel})</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.config.length}
                                                        onChange={e => setFormData({ ...formData, config: { ...formData.config, length: e.target.value } })}
                                                        placeholder="e.g. 3.0"
                                                        className={inputCls}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Breadth ({unitLabel})</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.config.breadth}
                                                        onChange={e => setFormData({ ...formData, config: { ...formData.config, breadth: e.target.value } })}
                                                        placeholder="e.g. 2.0"
                                                        className={inputCls}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Height ({unitLabel})</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.config.height}
                                                        onChange={e => setFormData({ ...formData, config: { ...formData.config, height: e.target.value } })}
                                                        placeholder="e.g. 2.5"
                                                        className={inputCls}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {formData.analytics_type === 'EvaraDeep' && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className={labelCls}>Static Level (m)</label>
                                            <input
                                                type="number"
                                                value={formData.config.static_depth}
                                                onChange={e => setFormData({ ...formData, config: { ...formData.config, static_depth: e.target.value } })}
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Dynamic Level (m)</label>
                                            <input
                                                type="number"
                                                value={formData.config.dynamic_depth}
                                                onChange={e => setFormData({ ...formData, config: { ...formData.config, dynamic_depth: e.target.value } })}
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Recharge Thres.</label>
                                            <input
                                                type="number"
                                                value={formData.config.recharge_threshold}
                                                onChange={e => setFormData({ ...formData, config: { ...formData.config, recharge_threshold: e.target.value } })}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                )}
                                {formData.analytics_type === 'EvaraFlow' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelCls}>Pipe Diameter (mm)</label>
                                            <input
                                                type="number"
                                                value={formData.config.pipe_diameter}
                                                onChange={e => setFormData({ ...formData, config: { ...formData.config, pipe_diameter: e.target.value } })}
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Max Flow (m³/h)</label>
                                            <input
                                                type="number"
                                                value={formData.config.max_flow_rate}
                                                onChange={e => setFormData({ ...formData, config: { ...formData.config, max_flow_rate: e.target.value } })}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 5. Geography */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`${sectionTitleCls} mb-0`}><MapPin size={14} /> Geographic Placement (Click map to set)</h3>
                                <button
                                    type="button"
                                    onClick={handleLocateMe}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors"
                                >
                                    <MapPin size={12} /> Use My Location
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className={labelCls}>Latitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={formData.lat}
                                        onChange={e => setFormData({ ...formData, lat: e.target.value })}
                                        placeholder="e.g. 17.448"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Longitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={formData.long}
                                        onChange={e => setFormData({ ...formData, long: e.target.value })}
                                        placeholder="e.g. 78.384"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                            <div className="h-48 w-full rounded-2xl overflow-hidden border border-slate-200 z-10 relative">
                                <MapContainer
                                    center={[17.4455, 78.3510]}
                                    zoom={10}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    <LocationMarker
                                        lat={formData.lat}
                                        lng={formData.long}
                                        onChange={(lat, lng) => setFormData({ ...formData, lat, long: lng })}
                                    />
                                </MapContainer>
                            </div>
                        </div>
                    </div>
                )}
            </form>

            {/* ACTION BAR */}
            <div className="shrink-0 mt-4 pt-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                <button
                    type="button"
                    onClick={step === 1 ? onCancel : () => setStep(1)}
                    disabled={loading}
                    className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                    {step === 1 ? 'Discard' : 'Back'}
                </button>

                {step === 1 ? (
                    <button
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={!formData.hardware_id || !formData.device_label}
                        className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                    >
                        Next Step <ChevronRight size={16} />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-3 px-8 py-2.5 bg-green-600 text-white text-sm font-bold rounded-2xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all disabled:opacity-50"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {loading ? (initialData ? 'Updating...' : 'Commissioning...') : (initialData ? 'Update Node' : 'Commission Node')}
                    </button>
                )}
            </div>
        </div>
    );
};
