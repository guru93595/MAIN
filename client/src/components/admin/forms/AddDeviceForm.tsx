import { useState } from 'react';
import { adminService } from '../../../services/admin';
import { Loader2, Database, Wifi, MapPin, Settings2, User, ChevronRight, Download } from 'lucide-react';
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
    const [fetchingFields, setFetchingFields] = useState(false);
    const [thingspeakFields, setThingspeakFields] = useState<Record<string, string>>({});
    const [error, setError] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        hardware_id: initialData?.hardware_id || initialData?.node_key || '',
        device_label: initialData?.device_label || initialData?.label || '',
        device_type: initialData?.device_type || initialData?.category || 'tank',
        analytics_type: initialData?.analytics_type || 'EvaraTank',
        community_id: initialData?.community_id || '',
        customer_id: initialData?.customer_id || '',
        lat: initialData?.lat?.toString() || '',
        long: (initialData?.lng || initialData?.long || '').toString(),
        thingspeak: {
            channel_id: initialData?.thingspeak_mapping?.channel_id || '',
            read_api_key: initialData?.thingspeak_mapping?.read_api_key || '',
            field_mapping: initialData?.thingspeak_mapping?.field_mapping || {
                level: 'field1',
                battery: 'field2',
                signal: 'field3'
            }
        },
        config: {
            capacity: initialData?.config_tank?.capacity?.toString() || '',
            max_depth: initialData?.config_tank?.max_depth?.toString() || '',
            static_depth: initialData?.config_deep?.static_depth?.toString() || '',
            dynamic_depth: initialData?.config_deep?.dynamic_depth?.toString() || '',
            recharge_threshold: initialData?.config_deep?.recharge_threshold?.toString() || '',
            pipe_diameter: initialData?.config_flow?.pipe_diameter?.toString() || '',
            max_flow_rate: initialData?.config_flow?.max_flow_rate?.toString() || ''
        }
    });

    const filteredCustomers = customers.filter(c => !formData.community_id || c.community_id === formData.community_id);

    const handleFetchThingSpeak = async () => {
        if (!formData.thingspeak.channel_id || !formData.thingspeak.read_api_key) {
            setError('Channel ID and Read API Key are required to fetch fields.');
            return;
        }
        setFetchingFields(true);
        setError('');
        try {
            const url = `https://api.thingspeak.com/channels/${formData.thingspeak.channel_id}/feeds.json?results=1&api_key=${formData.thingspeak.read_api_key}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch from ThingSpeak. Check keys.');
            const data = await res.json();
            const channel = data.channel;
            const fields: Record<string, string> = {};
            for (let i = 1; i <= 8; i++) {
                if (channel[`field${i}`]) fields[`field${i}`] = channel[`field${i}`];
            }
            if (Object.keys(fields).length === 0) throw new Error('No fields configured in this channel.');
            setThingspeakFields(fields);
        } catch (err: any) {
            setError(err.message || 'Error fetching fields');
        } finally {
            setFetchingFields(false);
        }
    };

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
            // Prepare payload with all required fields
            const payload: any = {
                hardware_id: formData.hardware_id,
                device_label: formData.device_label,
                device_type: formData.device_type,
                analytics_type: formData.analytics_type,
                community_id: formData.community_id || null,
                customer_id: formData.customer_id || null,
                lat: formData.lat ? parseFloat(formData.lat) : null,
                long: formData.long ? parseFloat(formData.long) : null, // Backend expects 'long'
                thingspeak_mappings: formData.thingspeak.channel_id ? [{
                    channel_id: formData.thingspeak.channel_id,
                    read_api_key: formData.thingspeak.read_api_key,
                    field_mapping: formData.thingspeak.field_mapping
                }] : null
            };

            // Add specialized config
            const cfg = formData.config;
            if (formData.analytics_type === 'EvaraTank') {
                payload.config_tank = {
                    capacity: parseInt(cfg.capacity) || 0,
                    max_depth: parseFloat(cfg.max_depth) || 0
                };
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
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="col-span-2">
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
                                    <div className="col-span-2">
                                        <label className={labelCls}>Read API Key</label>
                                        <div className="flex flex-row gap-3">
                                            <input
                                                value={formData.thingspeak.read_api_key}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    thingspeak: { ...formData.thingspeak, read_api_key: e.target.value }
                                                })}
                                                placeholder="Read API Key"
                                                className={`${inputCls} flex-1`}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleFetchThingSpeak}
                                                disabled={fetchingFields}
                                                className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-xl border border-blue-200 transition-colors whitespace-nowrap"
                                            >
                                                {fetchingFields ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                                {fetchingFields ? 'Fetching...' : 'Fetch Fields'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <p className={labelCls} style={{ marginBottom: '8px' }}>Field Parameter Mapping</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(formData.thingspeak.field_mapping).map(([param, mapped]) => (
                                            <div key={param}>
                                                <label className="text-[9px] font-bold text-blue-600 block mb-1 uppercase pl-1">{param}</label>
                                                <select
                                                    className="w-full text-xs p-1.5 border border-blue-200 rounded-lg outline-none bg-white"
                                                    value={mapped as string}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        thingspeak: {
                                                            ...formData.thingspeak,
                                                            field_mapping: { ...formData.thingspeak.field_mapping, [param]: e.target.value }
                                                        }
                                                    })}
                                                >
                                                    {Object.keys(thingspeakFields).length > 0
                                                        ? Object.entries(thingspeakFields).map(([fKey, fName]) => (
                                                            <option key={fKey} value={fKey}>{fKey}: {fName}</option>
                                                        ))
                                                        : [1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={`field${n}`}>Field {n}</option>)
                                                    }
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Physical Specs */}
                        <div>
                            <h3 className={sectionTitleCls}><Settings2 size={14} /> Physical Specifications</h3>
                            <div className="p-5 bg-green-50/30 rounded-2xl border border-green-100">
                                {formData.analytics_type === 'EvaraTank' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelCls}>Capacity (Liters)</label>
                                            <input
                                                type="number"
                                                value={formData.config.capacity}
                                                onChange={e => setFormData({ ...formData, config: { ...formData.config, capacity: e.target.value } })}
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Max Depth (Meters)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={formData.config.max_depth}
                                                onChange={e => setFormData({ ...formData, config: { ...formData.config, max_depth: e.target.value } })}
                                                className={inputCls}
                                            />
                                        </div>
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
