import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getCountFromServer, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import { OperationType, UserRole } from '../../types/firestore';
import { handleFirestoreError } from '../../lib/firestoreUtils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Users, FileText, CheckCircle, ShieldAlert, Activity, Building2, UserPlus, Shield, Settings, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalInterns: 0,
    totalStages: 0,
    totalDirections: 0,
    totalUsers: 0
  });

  const isITOrAdmin = profile?.role === UserRole.ADMIN;
  const isHR = profile?.role === UserRole.HR;

  const [chartData, setChartData] = useState([
    { name: 'Jan', count: 4 },
    { name: 'Fév', count: 7 },
    { name: 'Mar', count: 12 },
    { name: 'Avr', count: 15 },
    { name: 'Mai', count: 10 },
  ]);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

  const [pieData, setPieData] = useState([
    { name: 'Actifs', value: 0 },
    { name: 'Terminés', value: 0 },
    { name: 'En attente', value: 0 },
  ]);

  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const exportStats = () => {
    const data = [
      ["Statistique", "Valeur"],
      ["Stagiaires Totaux", stats.totalInterns],
      ["Stages Totaux", stats.totalStages],
      ["Directions", stats.totalDirections],
      ["Utilisateurs", stats.totalUsers],
      ["Date du rapport", format(new Date(), 'dd/MM/yyyy HH:mm')]
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + data.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rapport_enerca_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [directionStats, setDirectionStats] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribeInterns = onSnapshot(collection(db, 'interns'), (snap) => {
      setStats(prev => ({ ...prev, totalInterns: snap.size }));
    });
    
    const unsubscribeStages = onSnapshot(collection(db, 'internships'), (snap) => {
      setStats(prev => ({ ...prev, totalStages: snap.size }));
      const stages = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      const statusCounts = stages.reduce((acc: any, s: any) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});
      
      setPieData([
        { name: 'Actifs', value: statusCounts['active'] || 0 },
        { name: 'Terminés', value: statusCounts['finished'] || 0 },
        { name: 'En attente', value: statusCounts['pending'] || 0 },
      ]);
    });
    
    const unsubscribeDirs = onSnapshot(collection(db, 'directions'), (snap) => {
      const dirs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStats(prev => ({ ...prev, totalDirections: dirs.length }));
      
      // We could fetch stages again here or use a combined approach
      // For now, let's keep it simple and just count from internships if we have them
    });
    
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setStats(prev => ({ ...prev, totalUsers: snap.size }));
    });

    const qLogs = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribeLogs = onSnapshot(qLogs, (snap) => {
      setRecentActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribeInterns();
      unsubscribeStages();
      unsubscribeDirs();
      unsubscribeUsers();
      unsubscribeLogs();
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Stagiaires" value={stats.totalInterns} icon={Users} color="blue" />
        <StatCard title="Stages" value={stats.totalStages} icon={FileText} color="green" />
        <StatCard title="Directions" value={stats.totalDirections} icon={Building2} color="orange" />
        <StatCard title="Comptes" value={stats.totalUsers} icon={ShieldAlert} color="red" />
      </div>

      {/* Quick Actions for Admins/IT/HR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isHR && (
          <QuickLink 
            to="/interns" 
            title="Saisie de Stagiaire" 
            desc="Enregistrer un nouveau dossier de stage" 
            icon={UserPlus} 
            color="blue" 
          />
        )}
        {isITOrAdmin && (
          <QuickLink 
            to="/users" 
            title="Contrôle des Accès" 
            desc="Gérer les permissions et rôles" 
            icon={Shield} 
            color="rose" 
          />
        )}
        <QuickLink 
          to="/directions" 
          title="Unités ENERCA" 
          desc="Configuration des directions et services" 
          icon={Building2} 
          color="amber" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900">Évolution des Admissions</h3>
            <div className="flex space-x-2">
              <button 
                onClick={exportStats}
                className="flex items-center text-xs text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
              >
                <FileText size={14} className="mr-2" />
                Générer Rapport CSV
              </button>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-8">Répartition des Stages</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-6">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: COLORS[index]}}></div>
                  <span className="text-sm text-gray-600 font-medium">{entry.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log / Recent Action Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-4 lg:p-8 rounded-2xl lg:rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Suivi Critique & Traçabilité</h3>
              <Activity className="text-blue-200" size={32} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-gray-400 font-bold uppercase tracking-widest border-b border-gray-100">
                    <th className="pb-4">Action</th>
                    <th className="pb-4">Cible</th>
                    <th className="pb-4">Date</th>
                    <th className="pb-4 text-right">Sécurité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((log) => (
                      <LogEntry 
                        key={log.id}
                        action={log.action} 
                        target={log.target} 
                        time={log.timestamp ? format(new Date(log.timestamp.seconds * 1000), 'HH:mm', { locale: fr }) : '...'} 
                        status={log.severity === 'warning' ? 'warning' : 'success'} 
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 text-xs italic">
                        Aucune activité système récente pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-8 rounded-2xl lg:rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Indicateurs par Direction</h3>
            <div className="p-2 bg-slate-50 rounded-lg">
              <Building2 size={20} className="text-slate-400" />
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-xs text-gray-400 font-medium italic mb-2">Aperçu rapide de la charge par département.</p>
            {/* Simple list of directions could go here */}
            <div className="grid grid-cols-1 gap-3">
              <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Direction Technique</p>
                  <p className="text-lg font-black text-gray-900">4 Stagiaires</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-green-600 uppercase">Performance</p>
                  <p className="text-sm font-bold text-gray-900">16.5/20</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">RH & Admin</p>
                  <p className="text-lg font-black text-gray-900">2 Stagiaires</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-orange-600 uppercase">Performance</p>
                  <p className="text-sm font-bold text-gray-900">14.2/20</p>
                </div>
              </div>
            </div>
            <Link to="/directions" className="block text-center text-xs font-bold text-blue-600 hover:underline mt-4">
              Voir tous les départements →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: any) => {
  const colorMap: any = {
    blue: 'bg-blue-600 shadow-blue-100',
    green: 'bg-emerald-600 shadow-emerald-100',
    orange: 'bg-amber-600 shadow-amber-100',
    red: 'bg-rose-600 shadow-rose-100'
  };
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center group hover:shadow-lg transition-all border-b-4 border-b-transparent hover:border-b-blue-600">
      <div className={`p-4 rounded-2xl text-white mr-4 ${colorMap[color] || 'bg-gray-600'}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-gray-900">{value}</p>
      </div>
    </div>
  );
};

const QuickLink = ({ to, title, desc, icon: Icon, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600'
  };
  return (
    <Link to={to} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-start group hover:border-slate-900 transition-all">
      <div className={`p-3 rounded-2xl mr-4 ${colors[color] || 'bg-gray-50'}`}>
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-900">{title}</h4>
          <ArrowRight size={16} className="text-gray-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
        </div>
        <p className="text-xs text-gray-400 font-medium mt-1">{desc}</p>
      </div>
    </Link>
  );
};

const LogEntry = ({ action, target, time, status }: any) => (
  <tr className="text-sm">
    <td className="py-4 font-semibold text-gray-800">{action}</td>
    <td className="py-4 text-gray-500">{target}</td>
    <td className="py-4 text-gray-400">{time}</td>
    <td className="py-4 text-right">
      <span className={`inline-block w-2 h-2 rounded-full ${status === 'success' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
    </td>
  </tr>
);

export default AdminDashboard;
