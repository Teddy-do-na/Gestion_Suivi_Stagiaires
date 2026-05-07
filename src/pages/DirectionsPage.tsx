import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Direction } from '../types/firestore';
import { Plus, Building2, User, Trash2, Edit, Save, X } from 'lucide-react';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { OperationType } from '../types/firestore';

const DirectionsPage: React.FC = () => {
  const [directions, setDirections] = useState<Direction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Direction>>({});

  useEffect(() => {
    const q = query(collection(db, 'directions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Direction));
      setDirections(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'directions');
    });

    return unsubscribe;
  }, []);

  const handleSave = async (id?: string) => {
    try {
      if (id) {
        await updateDoc(doc(db, 'directions', id), formData);
        setIsEditing(null);
      } else {
        await addDoc(collection(db, 'directions'), formData);
        setFormData({});
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'directions');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Supprimer cette direction ?')) {
      try {
        await deleteDoc(doc(db, 'directions', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `directions/${id}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Directions & Services</h2>
        <p className="text-gray-500">Organisation structurelle d'ENERCA pour l'accueil des stagiaires.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form to add new */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
          <h3 className="text-lg font-semibold mb-6">Ajouter une Direction</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Code/N° Direction</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                value={isEditing ? '' : (formData.numDire || '')}
                onChange={(e) => setFormData({...formData, numDire: e.target.value})}
                disabled={!!isEditing}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Nom de la Direction</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                value={isEditing ? '' : (formData.nomDire || '')}
                onChange={(e) => setFormData({...formData, nomDire: e.target.value})}
                disabled={!!isEditing}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Nom du Directeur</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                value={isEditing ? '' : (formData.nomD || '')}
                onChange={(e) => setFormData({...formData, nomD: e.target.value})}
                disabled={!!isEditing}
              />
            </div>
            <button 
              onClick={() => handleSave()}
              disabled={!!isEditing || !formData.nomDire}
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Enregistrer
            </button>
          </div>
        </div>

        {/* List of directions */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Chargement...</div>
          ) : directions.length === 0 ? (
            <div className="bg-white p-12 text-center text-gray-400 rounded-2xl border border-dashed border-gray-200">
              Aucune direction enregistrée.
            </div>
          ) : (
            directions.map((dir) => (
              <div key={dir.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group">
                <div className="flex items-center flex-1">
                  <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 mr-4 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <Building2 size={24} />
                  </div>
                  {isEditing === dir.id ? (
                    <div className="flex-1 grid grid-cols-2 gap-2 mr-4">
                      <input 
                        type="text" 
                        className="px-3 py-1 border border-blue-200 rounded-md outline-none"
                        value={formData.nomDire || ''}
                        onChange={(e) => setFormData({...formData, nomDire: e.target.value})}
                      />
                      <input 
                        type="text" 
                        className="px-3 py-1 border border-blue-200 rounded-md outline-none"
                        value={formData.nomD || ''}
                        onChange={(e) => setFormData({...formData, nomD: e.target.value})}
                      />
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-bold text-gray-900 uppercase">
                        [{dir.numDire}] {dir.nomDire}
                      </h4>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <User size={14} className="mr-1.5" />
                        <span>Directeur: {dir.nomD}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {isEditing === dir.id ? (
                    <>
                      <button 
                        onClick={() => handleSave(dir.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Save size={20} />
                      </button>
                      <button 
                        onClick={() => setIsEditing(null)}
                        className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => { setIsEditing(dir.id!); setFormData(dir); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(dir.id!)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DirectionsPage;
