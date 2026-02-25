import { useAuth } from '../context/AuthContext';

export function DevLogin() {
    const { login } = useAuth();

    const handleDevLogin = async () => {
        const result = await login('admin@evara.com', 'evaratech@1010');
        if (result.success) {
            console.log('✅ Dev login successful');
            window.location.reload();
        } else {
            console.error('❌ Dev login failed:', result.error);
        }
    };

    return (
        <div className="p-6">
            <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-bold mb-4">Dev Login</h2>
                <button
                    onClick={handleDevLogin}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Login as Admin (dev-bypass)
                </button>
                <p className="text-sm text-gray-600 mt-2">
                    Uses admin@evara.com / evaratech@1010
                </p>
            </div>
        </div>
    );
}
