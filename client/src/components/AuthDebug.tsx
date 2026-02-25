import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export function AuthDebug() {
    const { user, isAuthenticated } = useAuth();
    const [apiTest, setApiTest] = useState<any>(null);

    useEffect(() => {
        const testAPI = async () => {
            try {
                console.log('🔍 Testing API with current auth...');
                const response = await api.get('/nodes/');
                setApiTest({
                    success: true,
                    data: response.data,
                    count: response.data.length
                });
            } catch (error: any) {
                console.error('❌ API test failed:', error);
                setApiTest({
                    success: false,
                    error: error.response?.data?.detail || error.message,
                    status: error.response?.status
                });
            }
        };

        if (isAuthenticated) {
            testAPI();
        }
    }, [isAuthenticated]);

    return (
        <div className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">Authentication Debug</h2>
            
            <div className="bg-white p-4 rounded shadow">
                <h3 className="font-semibold mb-2">Auth Status</h3>
                <p>Is Authenticated: {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
                {user && (
                    <div className="mt-2 text-sm">
                        <p>User ID: {user.id}</p>
                        <p>Email: {user.email}</p>
                        <p>Role: {user.role}</p>
                    </div>
                )}
            </div>

            <div className="bg-white p-4 rounded shadow">
                <h3 className="font-semibold mb-2">API Test</h3>
                {apiTest ? (
                    <div className="text-sm">
                        <p>Success: {apiTest.success ? '✅' : '❌'}</p>
                        {apiTest.success ? (
                            <p>Nodes fetched: {apiTest.count}</p>
                        ) : (
                            <div>
                                <p className="text-red-600">Error: {apiTest.error}</p>
                                <p>Status: {apiTest.status}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p>Testing...</p>
                )}
            </div>

            <div className="bg-white p-4 rounded shadow">
                <h3 className="font-semibold mb-2">LocalStorage</h3>
                <div className="text-sm">
                    {Object.keys(localStorage).map(key => (
                        <div key={key} className="mb-1">
                            <strong>{key}:</strong> {localStorage.getItem(key)?.slice(0, 50)}...
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
