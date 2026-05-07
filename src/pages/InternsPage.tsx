import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/auth/AuthProvider';
import { Stagiaire } from '../types/firestore';
import { Plus, Search, MoreHorizontal, User, Mail, Phone, Trash2, Edit } from 'lucide-react';
import { cn } from '../lib/utils';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { OperationType } from '../types/firestore';

const InternsPage: React.FC = () => {
  const [interns, setInterns] = useState<Stagiaire[]>([]);
  const [users, setUsers] = useState<{id: string, nom: string, prenom: string, email: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentIntern, setCurrentIntern] = useState<Partial<Stagiaire>>({});

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'interns'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stagiaire));
      setInterns(data);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error(err);
      setError("Erreur d'accès aux données. Vérifiez vos permissions.");
      setLoading(false);
    });

    // Fetch users with role 'intern'
    const qUsers = query(collection(db, 'users'), where('role', '==', 'intern'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ 
        id: d.id, 
        nom: d.data().nom || d.data().displayName?.split(' ')[0] || '', 
        prenom: d.data().prenom || d.data().displayName?.split(' ').slice(1).join(' ') || '',
        email: d.data().email || ''
      })));
    });

    return () => {
      unsubscribe();
      unsubscribeUsers();
    };
  }, []);

  const filteredInterns = interns.filter(i => 
    (i.nom?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (i.prenom?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (i.specialite?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentIntern.id) {
        const { id, ...data } = currentIntern;
        await updateDoc(doc(db, 'interns', id), data);
      } else {
        await addDoc(collection(db, 'interns'), {
          ...currentIntern,
          userId: currentIntern.userId || 'PENDING',
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setCurrentIntern({});
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'interns');
    }
  };

  const deleteIntern = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce stagiaire ?')) {
      try {
        await deleteDoc(doc(db, 'interns', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `interns/${id}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center animate-in fade-in slide-in-from-top-2">
          <Trash2 size={18} className="mr-2" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Stagiaires</h2>
          <p className="text-gray-500">Liste exhaustive et suivi des dossiers des stagiaires.</p>
        </div>
        <button 
          onClick={() => { setCurrentIntern({}); setIsModalOpen(true); }}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Ajouter un Stagiaire</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher par nom, prénom ou spécialité..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Stagiaire</th>
                <th className="px-6 py-4 font-semibold">Spécialité & Niveau</th>
                <th className="px-6 py-4 font-semibold">Institut</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Chargement des données...
                  </td>
                </tr>
              ) : filteredInterns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Aucun stagiaire trouvé.
                  </td>
                </tr>
              ) : (
                filteredInterns.map((intern) => (
                  <tr key={intern.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mr-3 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 uppercase">{intern.nom} {intern.prenom}</p>
                          <p className="text-xs text-gray-500">{intern.sexe}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>
                        {intern.specialite}
                        <br />
                        <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                          {intern.niveau}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {intern.institut}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Phone size={12} className="mr-1 mt-0.5 text-gray-400" />
                          {intern.tel}
                        </div>
                        <div className="flex items-center">
                          <Mail size={12} className="mr-1 mt-0.5 text-gray-400" />
                          Email non renseigné
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => { setCurrentIntern(intern); setIsModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => deleteIntern(intern.id!)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Simplified for demo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {currentIntern.id ? 'Modifier le stagiaire' : 'Nouveau Stagiaire'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Nom</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={currentIntern.nom || ''}
                    onChange={(e) => setCurrentIntern({...currentIntern, nom: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Prénom</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={currentIntern.prenom || ''}
                    onChange={(e) => setCurrentIntern({...currentIntern, prenom: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Spécialité</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={currentIntern.specialite || ''}
                    onChange={(e) => setCurrentIntern({...currentIntern, specialite: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Niveau d'études</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={currentIntern.niveau || ''}
                    onChange={(e) => setCurrentIntern({...currentIntern, niveau: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Téléphone</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={currentIntern.tel || ''}
                    onChange={(e) => setCurrentIntern({...currentIntern, tel: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Institut</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={currentIntern.institut || ''}
                    onChange={(e) => setCurrentIntern({...currentIntern, institut: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Compte Utilisateur (Optionnel)</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    value={currentIntern.userId || ''}
                    onChange={(e) => setCurrentIntern({...currentIntern, userId: e.target.value})}
                  >
                    <option value="">Non lié (En attente)</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.nom.toUpperCase()} {u.prenom} ({u.email})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 italic">Liez le dossier au compte d'un stagiaire pour activer son dashboard.</p>
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternsPage;
