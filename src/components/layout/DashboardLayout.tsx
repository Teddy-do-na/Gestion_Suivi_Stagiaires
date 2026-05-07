import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Building2, 
  Settings, 
  LogOut,
  Menu,
  X,
  UserCircle,
  Activity,
  ListTodo,
  User as UserIcon,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { cn } from '../../lib/utils';
import { UserRole } from '../../types/firestore';
import { useLocation } from 'react-router-dom';

const DashboardLayout: React.FC = () => {
  const { profile, logout } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Tableau de Bord', icon: LayoutDashboard, path: '/dashboard', roles: [UserRole.ADMIN, UserRole.HR, UserRole.TUTOR, UserRole.INTERN] },
    { name: 'Suivi Activités', icon: Activity, path: '/dashboard?tab=activities', roles: [UserRole.TUTOR] },
    { name: 'Évaluations & Notes', icon: FileText, path: '/dashboard?tab=evaluations', roles: [UserRole.TUTOR] },
    { name: 'Assigner des Tâches', icon: ListTodo, path: '/dashboard?tab=tasks', roles: [UserRole.TUTOR] },
    { name: 'Mes Activités', icon: Activity, path: '/dashboard?tab=activities', roles: [UserRole.INTERN] },
    { name: 'Tâches Assignées', icon: ListTodo, path: '/dashboard?tab=tasks', roles: [UserRole.INTERN] },
    { name: 'Mon Profil', icon: UserIcon, path: '/dashboard?tab=profile', roles: [UserRole.INTERN] },
    { name: 'Messages', icon: MessageSquare, path: '/dashboard?tab=messages', roles: [UserRole.INTERN] },
    { name: 'Documents', icon: FileText, path: '/dashboard?tab=documents', roles: [UserRole.INTERN] },
    { name: 'Stagiaires', icon: Users, path: '/interns', roles: [UserRole.ADMIN, UserRole.HR, UserRole.TUTOR] },
    { name: 'Stages', icon: FileText, path: '/stages', roles: [UserRole.ADMIN, UserRole.HR, UserRole.TUTOR, UserRole.INTERN] },
    { name: 'Directions', icon: Building2, path: '/directions', roles: [UserRole.ADMIN, UserRole.HR] },
    { name: 'Utilisateurs', icon: Settings, path: '/users', roles: [UserRole.ADMIN] },
  ];

  const filteredNavItems = navItems.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  const getCurrentPageName = () => {
    const currentPath = location.pathname + location.search;
    const item = filteredNavItems.find(item => 
      item.path === currentPath || (item.path !== '/dashboard' && currentPath.includes(item.path))
    );
    if (!item && location.pathname === '/dashboard') return 'Tableau de Bord';
    return item?.name || 'StageENERCA';
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 lg:relative bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-40 flex flex-col shadow-xl lg:shadow-none",
          isSidebarOpen ? "w-64" : "w-20",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen ? (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm p-1">
                <img 
                  src="/logo_enerca.png" 
                  alt="E" 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<span class="text-blue-600 font-bold">E</span>';
                  }} 
                />
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Stage<span className="text-blue-600">ENERCA</span></span>
            </div>
          ) : (
            <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center shadow-sm overflow-hidden p-1">
              <img 
                src="/logo_enerca.png" 
                alt="E" 
                className="w-full h-full object-contain" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<span class="text-blue-600 font-bold uppercase">E</span>';
                }}
              />
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hidden lg:block"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500 lg:hidden"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => {
                const isItemActive = isActive && (item.path.includes('tab') ? location.search === item.path.split('?')[1] : location.search === '');
                return cn(
                  "flex items-center px-4 py-3 rounded-lg transition-colors group",
                  isItemActive 
                    ? "bg-blue-50 text-blue-700 font-medium" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                );
              }}
            >
              <item.icon className={cn("shrink-0", isSidebarOpen ? "mr-3" : "mx-auto")} size={22} />
              {isSidebarOpen && <span>{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center p-2 rounded-lg bg-gray-50 mb-4 overflow-hidden">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              <UserCircle size={24} />
            </div>
            {isSidebarOpen && (
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{profile?.displayName}</p>
                <p className="text-xs text-gray-500 truncate uppercase">{profile?.role}</p>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className={cn(
              "flex items-center px-4 py-3 w-full rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut className={cn(isSidebarOpen ? "mr-3" : "")} size={22} />
            {isSidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-8 justify-between z-10 shrink-0">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-md hover:bg-gray-100 text-gray-500 lg:hidden"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg lg:text-xl font-bold text-slate-900 truncate">
              {getCurrentPageName()}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs lg:text-sm text-gray-500 hidden sm:block">{new Date().toLocaleDateString('fr-FR')}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
