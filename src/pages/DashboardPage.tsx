import React from 'react';
import { useAuth } from '../components/auth/AuthProvider';
import { UserRole } from '../types/firestore';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import TutorDashboard from '../components/dashboard/TutorDashboard';
import InternDashboard from '../components/dashboard/InternDashboard';

const DashboardPage: React.FC = () => {
  const { profile } = useAuth();

  if (!profile) return null;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Bonjour, {profile.displayName} 👋</h2>
          <p className="text-gray-500 font-medium">Voici le point sur la gestion des stages à l'ENERCA.</p>
        </div>
        <div className="px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
          <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">{profile.role}</span>
        </div>
      </div>

      {(profile.role === UserRole.ADMIN || profile.role === UserRole.HR) && <AdminDashboard />}
      {profile.role === UserRole.TUTOR && <TutorDashboard />}
      {profile.role === UserRole.INTERN && <InternDashboard />}
    </div>
  );
};

export default DashboardPage;
