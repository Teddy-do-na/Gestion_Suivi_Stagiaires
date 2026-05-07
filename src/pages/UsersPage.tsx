import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types/firestore';
import { Shield, ShieldAlert, ShieldCheck, User as UserIcon, Mail, Calendar, Power, PowerOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logActivity, LogCategory } from '../lib/activityLogger';
import { useAuth } from '../components/auth/AuthProvider';

const UsersPage: React.FC = () => {
  const { user: currentUserProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [directions, setDirections] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
      setUsers(data);
      setLoading(false);
    });

    const unsubscribeDirs = onSnapshot(collection(db, 'directions'), (snap) => {
      setDirections(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribe();
      unsubscribeDirs();
    };
  }, []);

  const updateDirection = async (user: UserProfile, directionId: string) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { directionId });
      if (currentUserProfile) {
        await logActivity(
          "Affectation direction",
          `${user.displayName} affecté à une nouvelle direction`,
          LogCategory.SYSTEM,
          currentUserProfile.uid,
          currentUserProfile.displayName || 'Admin'
        );
      }
    } catch (error) {
      console.error("Error updating direction", error);
    }
  };

  const updateRole = async (user: UserProfile, role: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { role });
      if (currentUserProfile) {
        await logActivity(
          "Mise à jour de rôle",
          `Rôle de ${user.displayName} changé en ${role}`,
          LogCategory.SECURITY,
          currentUserProfile.uid,
          currentUserProfile.displayName || 'Admin'
        );
      }
    } catch (error) {
      console.error("Error updating role", error);
    }
  };

  const toggleStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'disabled' ? 'active' : 'disabled';
    try {
      await updateDoc(doc(db, 'users', user.uid), { status: newStatus });
      if (currentUserProfile) {
        await logActivity(
          newStatus === 'disabled' ? "Désactivation compte" : "Activation compte",
          `Compte de ${user.displayName} ${newStatus === 'disabled' ? 'désactivé' : 'réactivé'}`,
          LogCategory.SECURITY,
          currentUserProfile.uid,
          currentUserProfile.displayName || 'Admin'
        );
      }
    } catch (error) {
      console.error("Error toggling status", error);
    }
  };

  const roleConfig = {
    [UserRole.ADMIN]: { icon: ShieldAlert, color: 'text-red-600 bg-red-50 border-red-100', label: 'Administrateur' },
    [UserRole.HR]: { icon: ShieldCheck, color: 'text-purple-600 bg-purple-50 border-purple-100', label: 'Ressources Humaines' },
    [UserRole.TUTOR]: { icon: Shield, color: 'text-blue-600 bg-blue-50 border-blue-100', label: 'Encadreur' },
    [UserRole.INTERN]: { icon: UserIcon, color: 'text-gray-600 bg-gray-50 border-gray-100', label: 'Stagiaire' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h2>
        <p className="text-gray-500">Contrôle des accès et attribution des rôles au sein de la plateforme.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Utilisateur</th>
                <th className="px-6 py-4 font-semibold">Rôle Actuel</th>
                <th className="px-6 py-4 font-semibold">Statut</th>
                <th className="px-6 py-4 font-semibold">Date d'inscription</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Chargement...</td></tr>
              ) : (
                users.map((user) => {
                  const config = roleConfig[user.role] || roleConfig[UserRole.INTERN];
                  const Icon = config.icon;
                  const isDisabled = user.status === 'disabled';
                  
                  return (
                    <tr key={user.uid} className={cn(
                      "hover:bg-gray-50/50 transition-colors",
                      isDisabled && "opacity-60 grayscale-[0.5] bg-gray-50/30"
                    )}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center text-gray-500 mr-3",
                            isDisabled ? "bg-gray-200" : "bg-gray-100"
                          )}>
                            <UserIcon size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{user.displayName}</p>
                            <div className="flex items-center text-xs text-gray-500 mt-0.5">
                              <Mail size={12} className="mr-1" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-2">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border w-fit",
                            config.color
                          )}>
                            <Icon size={12} className="mr-1.5" />
                            {config.label}
                          </span>
                          {(user.role === UserRole.TUTOR || user.role === UserRole.HR) && (
                            <select 
                              className="text-[10px] bg-white border border-gray-200 rounded px-2 py-1 outline-none"
                              value={user.directionId || ''}
                              onChange={(e) => updateDirection(user, e.target.value)}
                            >
                              <option value="">Aucune direction</option>
                              {directions.map(d => (
                                <option key={d.id} value={d.id}>{d.nomDire}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                          isDisabled 
                            ? "bg-red-50 text-red-600 border-red-100" 
                            : "bg-green-50 text-green-600 border-green-100"
                        )}>
                          {isDisabled ? 'Désactivé' : 'Actif'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar size={14} className="mr-2" />
                          {user.createdAt ? (
                            user.createdAt.seconds 
                              ? format(new Date(user.createdAt.seconds * 1000), 'dd/MM/yyyy', { locale: fr })
                              : format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: fr })
                          ) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <select 
                            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                            value={user.role}
                            onChange={(e) => updateRole(user, e.target.value as UserRole)}
                          >
                            <option value={UserRole.INTERN}>Stagiaire</option>
                            <option value={UserRole.TUTOR}>Encadreur</option>
                            <option value={UserRole.HR}>RH</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                          </select>
                          <button 
                            onClick={() => toggleStatus(user)}
                            className={cn(
                              "p-2 rounded-lg transition-colors border",
                              isDisabled 
                                ? "text-green-600 bg-green-50 border-green-100 hover:bg-green-100" 
                                : "text-red-600 bg-red-50 border-red-100 hover:bg-red-100"
                            )}
                            title={isDisabled ? "Activer le compte" : "Désactiver le compte"}
                          >
                            {isDisabled ? <Power size={14} /> : <PowerOff size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
