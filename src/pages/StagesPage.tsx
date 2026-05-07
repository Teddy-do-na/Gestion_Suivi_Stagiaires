import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/auth/AuthProvider';
import { Stage, Stagiaire, Direction } from '../types/firestore';
import { Plus, Search, Calendar, MapPin, User, ChevronRight, CheckCircle2, Clock, AlertCircle, Building2, FileText, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { OperationType } from '../types/firestore';

const StagesPage: React.FC = () => {
  const { profile, user } = useAuth();
  const [stages, setStages] = useState<Stage[]>([]);
  const [interns, setInterns] = useState<Stagiaire[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [tutors, setTutors] = useState<{id: string, nom: string, prenom: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState<Partial<Stage>>({ status: 'pending' });

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette affectation ?')) {
      try {
        await deleteDoc(doc(db, 'internships', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'internships');
      }
    }
  };

  useEffect(() => {
    let q;
    if (profile?.role === 'intern') {
      q = query(collection(db, 'internships'), where('userId', '==', user?.uid));
    } else {
      q = query(collection(db, 'internships'));
    }
    
    const unsubscribeStages = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stage));
      setStages(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'internships');
      setLoading(false);
    });

    // Fetch interns, directions and tutors for the form (Real-time)
    const unsubscribeInterns = onSnapshot(collection(db, 'interns'), (snapshot) => {
      setInterns(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Stagiaire)));
    });

    const unsubscribeDirections = onSnapshot(collection(db, 'directions'), (snapshot) => {
      setDirections(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Direction)));
    });

    const unsubscribeTutors = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'tutor')), 
      (snapshot) => {
        setTutors(snapshot.docs.map(d => {
          const data = d.data();
          return { 
            id: d.id, 
            nom: data.nom || data.displayName?.split(' ')[0] || 'Tuteur', 
            prenom: data.prenom || data.displayName?.split(' ').slice(1).join(' ') || '' 
          };
        }));
      }
    );

    return () => {
      unsubscribeStages();
      unsubscribeInterns();
      unsubscribeDirections();
      unsubscribeTutors();
    };
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentStage.id) {
        const { id, ...data } = currentStage;
        // Also sync userId in case it wasn't set or changed in intern dossier
        const selectedIntern = interns.find(i => i.id === currentStage.idStagiaire);
        await updateDoc(doc(db, 'internships', id), {
          ...data,
          userId: selectedIntern?.userId || data.userId || 'PENDING'
        });
      } else {
        const selectedIntern = interns.find(i => i.id === currentStage.idStagiaire);
        await addDoc(collection(db, 'internships'), {
          ...currentStage,
          userId: selectedIntern?.userId || 'PENDING',
          createdAt: new Date(),
        });
      }
      setIsModalOpen(false);
      setCurrentStage({ status: 'pending' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'internships');
    }
  };

  const statusColors = {
    pending: 'bg-orange-50 text-orange-600 border-orange-100',
    active: 'bg-blue-50 text-blue-600 border-blue-100',
    completed: 'bg-green-50 text-green-600 border-green-100',
    cancelled: 'bg-red-50 text-red-600 border-red-100',
  };

  const statusIcons = {
    pending: Clock,
    active: Calendar,
    completed: CheckCircle2,
    cancelled: AlertCircle,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Suivi des Stages</h2>
          <p className="text-gray-500">Planification, affectation et suivi des périodes de stage.</p>
        </div>
        {profile?.role !== 'intern' && (
          <button 
            onClick={() => { setCurrentStage({ status: 'pending' }); setIsModalOpen(true); }}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span>Nouvelle Affectation</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-gray-400">Chargement...</div>
        ) : stages.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400">Aucun stage enregistré.</div>
        ) : (
          stages.map((stage) => {
            const intern = interns.find(i => i.id === stage.idStagiaire);
            const direction = directions.find(d => d.id === stage.idDirection);
            const tutor = tutors.find(t => t.id === stage.idTutor);
            const StatusIcon = statusIcons[stage.status];

            return (
              <div key={stage.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold border",
                      statusColors[stage.status]
                    )}>
                      {stage.status.toUpperCase()}
                    </span>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setCurrentStage(stage); setIsModalOpen(true); }}
                        className="text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(stage.id!)}
                        className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start mb-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <User size={24} />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {intern ? `${intern.nom} ${intern.prenom}` : 'Stagiaire Inconnu'}
                      </h4>
                      <p className="text-sm text-gray-500">{intern?.specialite || 'Spécialité non définie'}</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-gray-50">
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 size={16} className="mr-3 text-gray-400" />
                      <span className="truncate">{direction?.nomDire || 'Direction non affectée'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <User size={16} className="mr-3 text-gray-400" />
                      <span className="font-medium">Encadreur: {tutor ? `${tutor.nom} ${tutor.prenom}` : 'Non assigné'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={16} className="mr-3 text-gray-400" />
                      <span>
                        {stage.dateDebut ? format(new Date(stage.dateDebut), 'dd MMM yyyy', { locale: fr }) : '?'} 
                        <span className="mx-1">→</span>
                        {stage.dateFin ? format(new Date(stage.dateFin), 'dd MMM yyyy', { locale: fr }) : '?'}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText size={16} className="mr-3 text-gray-400" />
                      <span className="truncate">{stage.theme || 'Pas de thème défini'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-6 py-3 flex items-center justify-between group-hover:bg-blue-50 transition-colors">
                  <div className="flex items-center text-xs font-medium text-gray-500">
                    <StatusIcon size={14} className="mr-1.5" />
                    <span>Progression</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {currentStage.id ? 'Modifier le stage' : 'Affecter un nouveau stage'}
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
                  <label className="text-xs font-semibold text-gray-500 uppercase">Stagiaire</label>
                  <select 
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={currentStage.idStagiaire || ''}
                    onChange={(e) => setCurrentStage({...currentStage, idStagiaire: e.target.value})}
                  >
                    <option value="">Sélectionner un stagiaire...</option>
                    {interns.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.nom.toUpperCase()} {i.prenom} — {i.institut || i.specialite || 'Dossier complet'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Direction / Service</label>
                  <select 
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={currentStage.idDirection || ''}
                    onChange={(e) => setCurrentStage({...currentStage, idDirection: e.target.value})}
                  >
                    <option value="">Sélectionner une direction...</option>
                    {directions.map(d => (
                      <option key={d.id} value={d.id}>{d.nomDire}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Encadreur / Tuteur</label>
                  <select 
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={currentStage.idTutor || ''}
                    onChange={(e) => setCurrentStage({...currentStage, idTutor: e.target.value})}
                  >
                    <option value="">Sélectionner un encadreur...</option>
                    {tutors.map(t => (
                      <option key={t.id} value={t.id}>{t.nom.toUpperCase()} {t.prenom}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Date Début</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={currentStage.dateDebut || ''}
                    onChange={(e) => setCurrentStage({...currentStage, dateDebut: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Date Fin</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={currentStage.dateFin || ''}
                    onChange={(e) => setCurrentStage({...currentStage, dateFin: e.target.value})}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Thème du stage</label>
                  <input 
                    type="text" 
                    placeholder="Sujet ou mission principale..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={currentStage.theme || ''}
                    onChange={(e) => setCurrentStage({...currentStage, theme: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Statut</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={currentStage.status}
                    onChange={(e) => setCurrentStage({...currentStage, status: e.target.value as any})}
                  >
                    <option value="pending">En attente</option>
                    <option value="active">Actif</option>
                    <option value="completed">Terminé</option>
                    <option value="cancelled">Annulé</option>
                  </select>
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
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StagesPage;
