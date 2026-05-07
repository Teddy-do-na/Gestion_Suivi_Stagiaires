import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import { OperationType, Stage, Activity, Evaluation, Task } from '../../types/firestore';
import { FileText, Send, CheckCircle, Clock, AlertCircle, Download, User as UserIcon, MessageSquare, Activity as LucideActivity, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { handleFirestoreError } from '../../lib/firestoreUtils';
import { cn } from '../../lib/utils';
import { jsPDF } from 'jspdf';
import { useSearchParams } from 'react-router-dom';

const InternDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'activities' | 'tasks' | 'profile' | 'documents' | 'messages') || 'activities';
  
  const [stage, setStage] = useState<Stage | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [newActivity, setNewActivity] = useState({ title: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileData, setProfileData] = useState({ phone: '', address: '', university: '' });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    setProfileData({
      phone: profile.phone || '',
      address: profile.address || '',
      university: profile.university || ''
    });

    const stageQuery = query(
      collection(db, 'internships'),
      where('userId', '==', user.uid)
    );

    const unsubscribeStage = onSnapshot(stageQuery, (snapshot) => {
      if (!snapshot.empty) {
        const stageData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Stage;
        setStage(stageData);

        const actQuery = query(
          collection(db, `internships/${stageData.id}/activities`),
          orderBy('date', 'desc')
        );
        const unsubscribeActivities = onSnapshot(actQuery, (actSnap) => {
          setActivities(actSnap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `internships/${stageData.id}/activities`);
        });

        const taskQuery = query(
          collection(db, `internships/${stageData.id}/tasks`),
          orderBy('createdAt', 'desc')
        );
        const unsubscribeTasks = onSnapshot(taskQuery, (taskSnap) => {
          setTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `internships/${stageData.id}/tasks`);
        });

        const evalQuery = query(collection(db, `internships/${stageData.id}/evaluations`));
        const unsubscribeEvaluations = onSnapshot(evalQuery, (evalSnap) => {
          setEvaluations(evalSnap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation)));
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `internships/${stageData.id}/evaluations`);
        });

        return () => {
          unsubscribeActivities();
          unsubscribeTasks();
          unsubscribeEvaluations();
        };
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'internships');
    });

    return () => unsubscribeStage();
  }, [user, profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...profileData
      });
      alert("Profil mis à jour avec succès !");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    if (!stage) return;
    try {
      await updateDoc(doc(db, `internships/${stage.id}/tasks`, taskId), {
        status: newStatus
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `internships/${stage.id}/tasks/${taskId}`);
    }
  };

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stage || !user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `internships/${stage.id}/activities`), {
        stageId: stage.id,
        userId: user.uid,
        title: newActivity.title,
        description: newActivity.description,
        date: serverTimestamp(),
        status: 'pending'
      });
      setNewActivity({ title: '', description: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `internships/${stage.id}/activities`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text("Attestation de Stage - ENERCA", 105, 30, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Énergie Centrafricaine", 105, 40, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);

    doc.setFontSize(12);
    doc.text(`Ceci certifie que M. / Mme ${profile?.displayName}`, 20, 60);
    doc.text(`A effectué un stage au sein de l'ENERCA durant la période du`, 20, 70);
    doc.text(`${stage?.dateDebut} au ${stage?.dateFin}.`, 20, 80);
    doc.text(`Thème de stage : ${stage?.theme}`, 20, 95);
    
    doc.text(`Fait à Bangui, le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, 20, 130);
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Document généré automatiquement via la plateforme StageENERCA", 105, 280, { align: 'center' });
    
    doc.save(`Attestation_ENERCA_${profile?.displayName}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {activeTab === 'activities' && (
            <div className="space-y-6">
              {!stage ? (
                <NoStageCard />
              ) : (
                <>
                  {/* Submission Form */}
                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center tracking-tight">
                      <div className="p-2 bg-blue-50 rounded-lg mr-3">
                        <Send size={20} className="text-blue-600" />
                      </div>
                      Soumettre un rapport journalier
                    </h3>
                    <form onSubmit={handleSubmitActivity} className="space-y-4">
                      <input 
                        required
                        placeholder="Titre de la tâche (ex: Maintenance serveurs)"
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600/30 outline-none transition-all font-medium"
                        value={newActivity.title}
                        onChange={e => setNewActivity({...newActivity, title: e.target.value})}
                      />
                      <textarea 
                        required
                        rows={4}
                        placeholder="Qu'avez-vous accompli aujourd'hui ? Détaillez vos actions..."
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600/30 outline-none transition-all font-medium resize-none"
                        value={newActivity.description}
                        onChange={e => setNewActivity({...newActivity, description: e.target.value})}
                      />
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 active:scale-[0.98]"
                      >
                        {isSubmitting ? 'Envoi en cours...' : 'Enregistrer le rapport'}
                      </button>
                    </form>
                  </div>

                  {/* Activities History */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900 tracking-tight">Journal de Bord</h3>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{activities.length} entrées</span>
                    </div>
                    {activities.length > 0 ? (
                      activities.map((act) => (
                        <div key={act.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-bold text-gray-900 text-lg">{act.title}</h4>
                            <span className={cn(
                              "text-[10px] uppercase font-black px-3 py-1 rounded-full border tracking-widest",
                              act.status === 'validated' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-orange-50 text-orange-600 border-orange-100"
                            )}>
                              {act.status === 'validated' ? 'Validé' : 'En attente'}
                            </span>
                          </div>
                          <p className="text-gray-600 leading-relaxed font-medium mb-4">{act.description}</p>
                          <div className="flex items-center text-[11px] text-gray-400 font-bold uppercase tracking-widest bg-gray-50/50 w-fit px-3 py-1 rounded-lg">
                            <Clock size={12} className="mr-1" />
                            {act.date ? format(act.date.toDate(), 'PP à HH:mm', { locale: fr }) : 'Envoi...'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                        <LucideActivity size={32} className="text-gray-300 mb-4" />
                        <p className="text-gray-400 font-bold">Aucune activité enregistrée</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6">
              {!stage ? (
                <NoStageCard />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Tâches à accomplir</h3>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{tasks.length} assignées</span>
                  </div>
                  
                  {tasks.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {tasks.map((task) => (
                        <div key={task.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-xl font-bold text-gray-900 mb-1">{task.title}</h4>
                              <div className="flex items-center text-xs text-rose-500 font-bold uppercase tracking-wider">
                                <Clock size={14} className="mr-1" />
                                Échéance: {task.dueDate}
                              </div>
                            </div>
                            <select 
                              value={task.status}
                              onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                              className={cn(
                                "text-[10px] font-black uppercase px-4 py-2 rounded-xl border outline-none transition-all",
                                task.status === 'done' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                task.status === 'in_progress' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                "bg-slate-50 text-slate-600 border-slate-100"
                              )}
                            >
                              <option value="todo">À faire</option>
                              <option value="in_progress">En cours</option>
                              <option value="done">Terminé</option>
                            </select>
                          </div>
                          <p className="text-gray-600 font-medium leading-relaxed mb-6">{task.description}</p>
                          <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                            <div className="flex items-center text-xs text-gray-400 font-bold">
                              <UserIcon size={14} className="mr-2" />
                              Assigné par votre Tuteur
                            </div>
                            {task.status === 'done' && (
                              <div className="flex items-center text-emerald-600 text-xs font-black uppercase tracking-widest">
                                <CheckCircle size={16} className="mr-1" />
                                Complété
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-20 rounded-[2.5rem] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <ListTodo size={32} className="text-gray-300" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mb-2">Aucune tâche en attente</h4>
                      <p className="text-gray-400 font-medium max-w-xs">
                        Votre tuteur n'a pas encore assigné de tâches spécifiques pour cette période.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Mon Dossier Stagiaire</h3>
              
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <ProfileItem label="Nom Complet" value={profile?.displayName} readOnly />
                  <ProfileItem label="Email de connexion" value={profile?.email} readOnly />
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Téléphone</label>
                    <input 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-600/10"
                      value={profileData.phone}
                      onChange={e => setProfileData({...profileData, phone: e.target.value})}
                      placeholder="+236 ..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Université / École</label>
                    <input 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-600/10"
                      value={profileData.university}
                      onChange={e => setProfileData({...profileData, university: e.target.value})}
                      placeholder="Université de Bangui..."
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Adresse de résidence</label>
                    <input 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-600/10"
                      value={profileData.address}
                      onChange={e => setProfileData({...profileData, address: e.target.value})}
                      placeholder="Quartier, Avenue..."
                    />
                  </div>
                </div>

                {stage && (
                  <div className="pt-6 border-t border-gray-50 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <ProfileItem label="Thème du Stage" value={stage.theme} readOnly />
                    <ProfileItem label="Date de Début" value={stage.dateDebut} readOnly />
                  </div>
                )}

                {!stage && (
                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center text-orange-700 text-xs font-bold">
                    <AlertCircle size={16} className="mr-2" />
                    Les détails d'affectation seront visibles après validation RH.
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50"
                >
                  {isUpdatingProfile ? 'Mise à jour...' : 'Enregistrer les modifications'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight flex items-center">
                <MessageSquare size={24} className="mr-3 text-blue-600" />
                Remarques du Tuteur
              </h3>
              <p className="text-gray-500 mb-8 font-medium">Consultez les feedbacks et messages de votre encadreur.</p>
              
              {!stage ? (
                <NoStageCard />
              ) : (
                <div className="space-y-4">
                  {evaluations.length > 0 ? (
                    evaluations.map((ev) => (
                      <div key={ev.id} className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Note de session</span>
                          <span className="text-xs font-bold text-gray-400">{ev.createdAt ? format(ev.createdAt.toDate(), 'dd/MM/yyyy', { locale: fr }) : ''}</span>
                        </div>
                        <p className="text-gray-700 font-medium italic leading-relaxed">"{ev.appreciation}"</p>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center text-xs font-bold text-gray-500">
                            <UserIcon size={14} className="mr-2" />
                            Encadreur ENERCA
                          </div>
                          <span className="text-lg font-black text-blue-700">{ev.note}/20</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                      <MessageSquare size={48} className="mx-auto text-gray-200 mb-4" />
                      <p className="text-gray-400 font-bold">Aucun message pour le moment.</p>
                      <p className="text-xs text-gray-400 mt-1">Votre encadreur n'a pas encore laissé de remarques spécifiques.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Espace Documents</h3>
              <p className="text-gray-500 mb-8 font-medium">Téléchargez vos attestations et rapports validés.</p>
              
              {!stage ? (
                <NoStageCard />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocumentCard 
                    title="Attestation de Stage" 
                    description="Document officiel certifiant la réalisation de votre stage."
                    onDownload={generateReport}
                    ready={evaluations.length > 0}
                  />
                  <DocumentCard 
                    title="Rapport d'Activité" 
                    description="Compilation synthétique de toutes vos tâches validées."
                    onDownload={() => alert("Génération du rapport en cours...")}
                    ready={activities.length > 0}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-700 to-indigo-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
            <h3 className="text-xl font-bold mb-6 tracking-tight flex items-center">
              <CheckCircle size={20} className="mr-2 text-blue-300" />
              État d'avancement
            </h3>
            {!stage ? (
              <div className="text-center py-10">
                <Clock size={40} className="mx-auto opacity-30 mb-4" />
                <p className="text-xs font-bold uppercase opacity-60">Affectation en attente</p>
              </div>
            ) : (
              evaluations.length > 0 ? (
                evaluations.map((ev) => (
                  <div key={ev.id} className="space-y-4">
                    <div className="flex items-center justify-between bg-white/10 p-4 rounded-2xl border border-white/10">
                      <span className="text-sm font-bold opacity-80 uppercase tracking-widest">Note Globale</span>
                      <span className="text-4xl font-black">{ev.note}/20</span>
                    </div>
                    <div className="p-6 bg-white/10 rounded-2xl italic text-sm leading-relaxed font-medium border border-white/10">
                      "{ev.appreciation}"
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Clock size={32} className="opacity-50" />
                  </div>
                  <p className="text-sm font-bold opacity-70 leading-relaxed px-4 text-center">
                    Votre encadreur n'a pas encore saisi l'évaluation finale.
                  </p>
                </div>
              )
            )}
          </div>
          
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
            <h3 className="text-lg font-bold mb-4 tracking-tight">Support Technique</h3>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Besoin d'aide ?</p>
                <p className="font-bold text-xs">Contactez la Direction de l'Informatique</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NoStageCard = () => (
  <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-6">
      <AlertCircle size={32} className="text-orange-500" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">Affectation non trouvée</h3>
    <p className="text-gray-400 font-medium max-w-xs mb-6">
      Cette section sera active dès que vous serez officiellement rattaché à un service.
    </p>
    <div className="px-4 py-2 bg-slate-50 rounded-full text-[10px] font-black uppercase text-slate-400 tracking-widest">
      En attente de validation RH
    </div>
  </div>
);

const ProfileItem = ({ label, value, readOnly }: any) => (
  <div className="space-y-1">
    <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">{label}</label>
    <div className={cn(
      "text-lg font-bold border-b border-gray-50 pb-2 transition-colors",
      readOnly ? "text-gray-500" : "text-gray-900"
    )}>{value || 'Non renseigné'}</div>
  </div>
);

const DocumentCard = ({ title, description, onDownload, ready }: any) => (
  <div className={cn(
    "p-6 rounded-3xl border transition-all flex flex-col justify-between",
    ready ? "bg-white border-gray-100 hover:border-blue-600/30" : "bg-gray-50 border-transparent opacity-60"
  )}>
    <div>
      <h4 className="font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-500 font-medium mb-6">{description}</p>
    </div>
    <button 
      onClick={onDownload}
      disabled={!ready}
      className={cn(
        "w-full py-3 rounded-xl flex items-center justify-center space-x-2 font-black text-sm active:scale-[0.98] transition-all",
        ready ? "bg-slate-900 text-white hover:bg-black" : "bg-gray-200 text-gray-400 cursor-not-allowed"
      )}
    >
      <Download size={18} />
      <span>Télécharger</span>
    </button>
  </div>
);

export default InternDashboard;
