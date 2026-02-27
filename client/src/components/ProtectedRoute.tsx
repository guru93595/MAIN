import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type UserRole, type UserPlan } from '../context/AuthContext';

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
    allowedPlans?: UserPlan[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, allowedPlans }) => {
    const { user, loading, isAuthenticated } = useAuth();

    console.log('ProtectedRoute check:', { user, loading, isAuthenticated, allowedRoles, allowedPlans });

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        console.log('Not authenticated, redirecting to login');
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.log('User role not allowed:', user.role, 'allowed:', allowedRoles, 'redirecting to dashboard');
        return <Navigate to="/dashboard" replace />;
    }

    if (allowedPlans && !allowedPlans.includes(user.plan)) {
        console.log('User plan not allowed:', user.plan, 'allowed:', allowedPlans, 'redirecting to dashboard');
        return <Navigate to="/dashboard" replace />;
    }

    console.log('Access granted, rendering protected content');
    return <Outlet />;
};

export default ProtectedRoute;
