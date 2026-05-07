import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, getDoc, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthProvider';
import { Stage, Activity, Stagiaire, Evaluation, Task } from '../../types/firestore';
import { Users, CheckCircle, MessageSquare, Star, TrendingUp, Search, Activity as ActivityIcon, Clock, PlusCircle, AlertCircle, FileText, Send, ListTodo, ChevronRight, X, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { handleFirestoreError } from '../../lib/firestoreUtils';
import { OperationType } from '../../types/firestore';
import { useSearchParams } from 'react-router-dom';
import { cn } from '../../lib/utils';

const TutorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const [interns, setInterns] = useState<Stagiaire[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [pendingActivities, setPendingActivities] = useState<(Activity & { internName: string })[]>([]);
  const [allActivities, setAllActivities] = useState<(Activity & { internName: string })[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [tasks, setTasks] = useState<(Task & { stageId: string })[]>([]);
  
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  
  const [evaluation, setEvaluation] = useState({ note: 10, appreciation: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: format(new Date(), 'yyyy-MM-dd') });
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  useEffect(() => {
    if (!user) return;

    const stageQuery = query(collection(db, 'internships'), where('idTutor', '==', user.uid));
    const unsubscribeStages = onSnapshot(stageQuery, async (snapshot) => {
      const activeStages = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Stage));
      setStages(activeStages);

      const internIds = Array.from(new Set(activeStages.map(s => s.idStagiaire)));
      if (internIds.length > 0) {
        try {
          const internDocs = await Promise.all(internIds.map(id => getDoc(doc(db, 'interns', id))));
          const internData = internDocs.map(d => ({ id: d.id, ...d.data() } as Stagiaire));
          setInterns(internData);

          const unsubscribes = activeStages.flatMap(stage => {
            const intern = internData.find(i => i.id === stage.idStagiaire);
            const internName = intern ? `${intern.nom} ${intern.prenom}` : 'Inconnu';

            // Activities
            const qAct = query(collection(db, `internships/${stage.id}/activities`), orderBy('date', 'desc'));
            const unsubAct = onSnapshot(qAct, (snap) => {
              const acts = snap.docs.map(d => ({ 
                id: d.id, 
                ...d.data(), 
                internName,
                stageId: stage.id
              } as Activity & { internName: string }));
              
              setAllActivities(prev => {
                const otherStagesActs = prev.filter(p => p.stageId !== stage.id);
                return [...otherStagesActs, ...acts].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
              });

              setPendingActivities(prev => {
                const pending = acts.filter(a => a.status === 'pending');
                const otherStagesPending = prev.filter(p => p.stageId !== stage.id);
                return [...otherStagesPending, ...pending].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
              });
            });

            // Evaluations
            const qEval = query(collection(db, `internships/${stage.id}/evaluations`), orderBy('createdAt', 'desc'));
            const unsubEval = onSnapshot(qEval, (snap) => {
              const evs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation));
              setEvaluations(prev => {
                const other = prev.filter(e => e.stageId !== stage.id);
                return [...other, ...evs];
              });
            });

            // Tasks
            const qTasks = query(collection(db, `internships/${stage.id}/tasks`), orderBy('createdAt', 'desc'));
            const unsubTasks = onSnapshot(qTasks, (snap) => {
              const tks = snap.docs.map(d => ({ id: d.id, ...d.data(), stageId: stage.id } as Task & { stageId: string }));
              setTasks(prev => {
                const other = prev.filter(t => t.stageId !== stage.id);
                return [...other, ...tks];
              });
            });

            return [unsubAct, unsubEval, unsubTasks];
          });

          return () => unsubscribes.forEach(unsub => unsub());
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'interns');
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'internships');
    });

    return () => unsubscribeStages();
  }, [user]);

  const validateActivity = async (stageId: string, activityId: string) => {
    try {
      await updateDoc(doc(db, `internships/${stageId}/activities`, activityId), {
        status: 'validated'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `activities/${activityId}`);
    }
  };

  const rejectActivity = async (stageId: string, activityId: string) => {
    try {
      await updateDoc(doc(db, `internships/${stageId}/activities`, activityId), {
        status: 'rejected'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `activities/${activityId}`);
    }
  };

  const submitEvaluation = async () => {
    if (!selectedStageId || !user) return;
    try {
      await addDoc(collection(db, `internships/${selectedStageId}/evaluations`), {
        stageId: selectedStageId,
        tutorId: user.uid,
        note: evaluation.note,
        appreciation: evaluation.appreciation,
        createdAt: serverTimestamp()
      });
      setIsEvaluationModalOpen(false);
      setEvaluation({ note: 10, appreciation: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'evaluations');
    }
  };

  const submitTask = async () => {
    if (!selectedStageId || !user) return;
    setIsSubmittingTask(true);
    try {
      await addDoc(collection(db, `internships/${selectedStageId}/tasks`), {
        stageId: selectedStageId,
        tutorId: user.uid,
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate,
        status: 'todo',
        createdAt: serverTimestamp()
      });
      setIsTaskModalOpen(false);
      setNewTask({ title: '', description: '', dueDate: format(new Date(), 'yyyy-MM-dd') });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {stages.length === 0 ? (
        <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Users className="text-blue-600" size={40} />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">Aucun stagiaire assigné</h3>
          <p className="text-gray-500 max-w-md mx-auto font-medium">
            Votre tableau de bord s'activera dès qu'un administrateur vous aura affecté un stagiaire ou rattaché une période de stage à votre profil d'encadreur.
          </p>
        </div>
      ) : (
        <>
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group bg-blue-600 rounded-2xl lg:rounded-[2rem] p-4 lg:p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden transition-all hover:scale-[1.02]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
              <div className="flex justify-between items-start mb-6">
                <Users size={32} className="opacity-80" />
                <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full uppercase tracking-widest">Actifs</span>
              </div>
              <p className="text-5xl font-black mb-1">{stages.length}</p>
              <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Stagiaires suivis</p>
            </div>

            <div className="group bg-white rounded-2xl lg:rounded-[2rem] p-4 lg:p-8 border border-gray-100 shadow-sm relative overflow-hidden transition-all hover:scale-[1.02]">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-emerald-50 rounded-2xl">
                  <CheckCircle size={28} className="text-emerald-500" />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Validation</span>
              </div>
              <p className="text-5xl font-black text-gray-900 mb-1">{pendingActivities.length}</p>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Activités en attente</p>
            </div>

            <div className="group bg-slate-900 rounded-2xl lg:rounded-[2rem] p-4 lg:p-8 text-white shadow-xl relative overflow-hidden transition-all hover:scale-[1.02]">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Star size={28} className="text-yellow-400" />
                </div>
                <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Éval. Complètes</span>
              </div>
              <p className="text-5xl font-black mb-1">{evaluations.length}</p>
              <p className="text-sm font-bold opacity-60 uppercase tracking-widest">Notes attribuées</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick View - Pending Activities */}
            <div className="bg-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
                  <ActivityIcon className="mr-3 text-blue-600" size={24} />
                  Derniers rapports
                </h3>
                <ChevronRight className="text-gray-300" />
              </div>
              
              <div className="space-y-4">
                {pendingActivities.slice(0, 3).map((act) => (
                  <div key={act.id} className="p-5 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">{act.internName}</span>
                      <span className="text-[10px] font-bold text-gray-400">{act.date ? format(act.date.toDate(), 'dd/MM HH:mm', { locale: fr }) : ''}</span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">{act.title}</h4>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => validateActivity(act.stageId, act.id!)}
                        className="flex-1 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-colors"
                      >
                        Valider
                      </button>
                      <button 
                        onClick={() => rejectActivity(act.stageId, act.id!)}
                        className="px-4 py-2 bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-500 hover:text-white transition-colors"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
                {pendingActivities.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle size={48} className="mx-auto text-emerald-100 mb-4" />
                    <p className="text-gray-400 font-bold">Zéro activité en attente</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick View - Interns Progress */}
            <div className="bg-slate-900 p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] text-white shadow-xl">
              <h3 className="text-2xl font-black mb-8 tracking-tight flex items-center">
                <TrendingUp className="mr-3 text-blue-400" size={24} />
                Mes Stagiaires
              </h3>
              <div className="space-y-3">
                {stages.map((stage) => {
                  const intern = interns.find(i => i.id === stage.idStagiaire);
                  const stageEval = evaluations.find(e => e.stageId === stage.id);
                  return (
                    <div key={stage.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-black">
                          {intern?.nom[0]}
                        </div>
                        <div className="ml-4">
                          <p className="font-bold text-gray-200">{intern?.nom} {intern?.prenom}</p>
                          <p className="text-[10px] opacity-40 uppercase font-black tracking-widest">{stage.theme?.slice(0, 30)}...</p>
                        </div>
                      </div>
                      {stageEval ? (
                        <div className="text-right">
                          <p className="text-lg font-black text-blue-400">{stageEval.note}/20</p>
                          <p className="text-[9px] font-black opacity-30 uppercase">Évalué</p>
                        </div>
                      ) : (
                        <div className="text-right flex flex-col items-end">
                          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse mb-1"></div>
                          <p className="text-[9px] font-black opacity-30 uppercase italic">À évaluer</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderActivities = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-black text-gray-900 tracking-tighter">Historique des Activités</h3>
        <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest">
          {allActivities.length} Rapports enregistrés
        </span>
      </div>

      <div className="space-y-4">
        {allActivities.map((act) => (
          <div key={act.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            {act.status === 'pending' && <div className="absolute left-0 top-0 bottom-0 w-2 bg-orange-400"></div>}
            {act.status === 'validated' && <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-400"></div>}
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-[10px] font-black">
                    {act.internName[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">{act.internName}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{act.date ? format(act.date.toDate(), 'PP à HH:mm', { locale: fr }) : ''}</p>
                  </div>
                </div>
                <h5 className="text-xl font-bold text-gray-900 mb-2">{act.title}</h5>
                <p className="text-gray-600 font-medium leading-relaxed">{act.description}</p>
              </div>

              <div className="shrink-0 flex items-center space-x-3">
                {act.status === 'pending' ? (
                  <>
                    <button 
                      onClick={() => validateActivity(act.stageId, act.id!)}
                      className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:scale-105 transition-all"
                    >
                      Valider
                    </button>
                    <button 
                      onClick={() => rejectActivity(act.stageId, act.id!)}
                      className="px-6 py-3 border border-gray-100 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all"
                    >
                      Rejeter
                    </button>
                  </>
                ) : (
                  <div className={cn(
                    "px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center",
                    act.status === 'validated' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                  )}>
                    {act.status === 'validated' ? (
                      <><CheckCircle size={14} className="mr-2" /> Rapport validé</>
                    ) : (
                      <><X size={14} className="mr-2" /> Rapport rejeté</>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {allActivities.length === 0 && (
          <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
            <ActivityIcon className="mx-auto text-gray-200 mb-4" size={48} />
            <p className="text-gray-400 font-bold italic">Aucune activité n'a été soumise pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderEvaluations = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-black text-gray-900 tracking-tighter">Évaluations & Observations</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stages.map((stage) => {
          const intern = interns.find(i => i.id === stage.idStagiaire);
          const stageEval = evaluations.find(e => e.stageId === stage.id);
          return (
            <div key={stage.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                  <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl">
                    {intern?.nom[0]}
                  </div>
                  <div className="ml-4">
                    <h4 className="text-xl font-bold text-gray-900">{intern?.nom} {intern?.prenom}</h4>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stage.theme?.slice(0, 40)}...</p>
                  </div>
                </div>
              </div>

              {stageEval ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-slate-900 rounded-3xl text-white">
                    <span className="text-xs font-black uppercase tracking-widest opacity-60">Note Globale</span>
                    <span className="text-4xl font-black">{stageEval.note}/20</span>
                  </div>
                  <div className="p-6 bg-blue-50 rounded-3xl">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Observations</h5>
                    <p className="text-blue-900 font-medium italic leading-relaxed">"{stageEval.appreciation}"</p>
                  </div>
                  <button 
                    onClick={() => { setSelectedStageId(stage.id!); setIsEvaluationModalOpen(true); }}
                    className="w-full py-4 border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                  >
                    Modifier l'évaluation
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                  <Star size={32} className="text-gray-200 mb-4" />
                  <p className="text-gray-400 font-bold mb-6 text-center px-6 leading-relaxed">
                    Vous n'avez pas encore évalué ce stagiaire.
                  </p>
                  <button 
                    onClick={() => { setSelectedStageId(stage.id!); setIsEvaluationModalOpen(true); }}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200"
                  >
                    Noter maintenant
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {stages.length === 0 && (
          <div className="col-span-full bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
            <Star className="mx-auto text-gray-200 mb-4" size={48} />
            <p className="text-gray-400 font-bold italic">Aucun stagiaire à évaluer.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-black text-gray-900 tracking-tighter">Assignation des Tâches</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stages.map((stage) => {
          const intern = interns.find(i => i.id === stage.idStagiaire);
          return (
            <div key={stage.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col group hover:shadow-xl transition-all">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{intern?.nom} {intern?.prenom}</h4>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Affecté au stage ID: {stage.id?.slice(0, 8)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black">
                  {intern?.nom[0]}
                </div>
              </div>
              
              <div className="flex-1 space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <button 
                  onClick={() => { setSelectedStageId(stage.id!); setIsTaskModalOpen(true); }}
                  className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:border-blue-200 hover:text-blue-600 transition-all font-bold text-xs"
                >
                  <PlusCircle size={16} className="mr-2" />
                  AJOUTER UNE MISSION
                </button>
                
                {/* List of existing tasks for this stage */}
                {tasks.filter(t => t.stageId === stage.id).map(task => (
                  <div key={task.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm group/task relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest",
                        task.status === 'done' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {task.status === 'done' ? 'Terminé' : 'En cours'}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-gray-900">{task.title}</h5>
                  </div>
                ))}
                
                {tasks.filter(t => t.stageId === stage.id).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 opacity-40">
                    <ListTodo size={32} className="mb-2" />
                    <p className="text-[10px] font-black uppercase text-center tracking-widest">Aucune tâche en cours</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Score Prog.</span>
                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500" 
                    style={{ 
                      width: `${tasks.filter(t => t.stageId === stage.id).length > 0 
                        ? (tasks.filter(t => t.stageId === stage.id && t.status === 'done').length / tasks.filter(t => t.stageId === stage.id).length) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
        {stages.length === 0 && (
          <div className="col-span-full bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
            <ListTodo className="mx-auto text-gray-200 mb-4" size={48} />
            <p className="text-gray-400 font-bold italic">Aucun stagiaire à qui assigner des tâches.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto">
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'activities' && renderActivities()}
      {activeTab === 'evaluations' && renderEvaluations()}
      {activeTab === 'tasks' && renderTasks()}

      {/* Modal Evaluation */}
      {isEvaluationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6">
            <h3 className="text-xl font-bold mb-6">Évaluation du Stagiaire</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex justify-between">
                  <span>Note Globale</span>
                  <span className="text-blue-600 font-bold text-lg">{evaluation.note}/20</span>
                </label>
                <input 
                  type="range" min="0" max="20" step="0.5" 
                  className="w-full"
                  value={evaluation.note}
                  onChange={e => setEvaluation({...evaluation, note: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Appréciation et Observations</label>
                <textarea 
                  rows={4} 
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10"
                  placeholder="Points forts, axes d'amélioration..."
                  value={evaluation.appreciation}
                  onChange={e => setEvaluation({...evaluation, appreciation: e.target.value})}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button 
                  onClick={() => setIsEvaluationModalOpen(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={submitEvaluation}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Task */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden p-8">
            <h3 className="text-2xl font-black mb-6 tracking-tight">Assigner une tâche</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Titre de la tâche</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-600/10 transition-all font-medium"
                  placeholder="Ex: Configuration du routeur Cisco"
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Description</label>
                <textarea 
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-600/10 transition-all font-medium resize-none"
                  placeholder="Détails de la mission..."
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Échéance</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-600/10 transition-all font-medium"
                  value={newTask.dueDate}
                  onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                />
              </div>
              <div className="flex space-x-3 pt-6">
                <button 
                  onClick={() => setIsTaskModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                  disabled={isSubmittingTask}
                >
                  Annuler
                </button>
                <button 
                  onClick={submitTask}
                  disabled={isSubmittingTask || !newTask.title}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmittingTask ? 'Création...' : 'Assigner'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorDashboard;
