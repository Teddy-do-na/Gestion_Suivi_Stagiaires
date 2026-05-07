import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../components/auth/AuthProvider';
import { UserRole } from '../types/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Lock, 
  UserCircle, 
  ChevronRight, 
  Users, 
  FileText, 
  Star, 
  Activity, 
  LayoutDashboard,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '../lib/utils';

const LoginPage: React.FC = () => {
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    role: UserRole.INTERN,
    password: '',
    confirmPassword: ''
  });

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0f1d]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(formData.email, formData.password);
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Les mots de passe ne correspondent pas.');
        }
        if (formData.password.length < 6) {
          throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
        }
        const displayName = `${formData.prenom} ${formData.nom}`;
        await signUp(formData.email, formData.password, displayName, formData.role);
      }
    } catch (err: any) {
      let message = "Une erreur est survenue lors de l'authentification.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = "Email ou mot de passe incorrect.";
      } else if (err.code === 'auth/email-already-in-use') {
        message = "Cet email est déjà utilisé.";
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      setLoading(false);
    }
  };

  const features = [
    { icon: Users, text: "Gestion des profils stagiaires" },
    { icon: FileText, text: "Suivi des stages en temps réel" },
    { icon: Star, text: "Évaluations par les encadreurs" },
    { icon: Activity, text: "Rapports et statistiques" },
  ];

  const ActorRow = ({ role, desc }: { role: string; desc: string }) => (
    <div className="flex items-start space-x-3 group/item">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 group-hover/item:scale-150 transition-transform"></div>
      <div>
        <h4 className="text-sm font-black text-slate-200">{role}</h4>
        <p className="text-[11px] text-slate-500 font-medium">{desc}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1d] flex text-white font-sans selection:bg-blue-500/30">
      {/* Left Decoration Column */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#0a0f1d] to-[#0d1225] p-16 flex-col justify-between border-r border-white/5">
        {/* Grid Background Effect */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-[#0a0f1d]/50 to-[#0a0f1d]"></div>

        <div className="relative z-10 space-y-10">
          <div className="flex items-center space-x-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl p-2">
                <img 
                  src="/logo_enerca.png" 
                  alt="ENERCA" 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement!;
                    parent.innerHTML = `
                      <div class="flex flex-col items-center justify-center leading-none">
                        <span class="text-blue-600 font-black text-3xl">E</span>
                        <div class="h-0.5 w-8 bg-orange-500 mt-0.5"></div>
                      </div>
                    `;
                  }} 
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-4xl font-black tracking-tighter uppercase italic leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Stage<span className="text-blue-500">ENERCA</span>
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.4em] mt-2 block">Énergie Centrafricaine</span>
            </div>
          </div>

          <div className="max-w-xl">
            <h1 className="text-7xl font-black leading-[1] mb-8 tracking-tighter">
              L'énergie de <br />
              <span className="text-blue-500">demain</span> se <br />
              construit ici<span className="text-blue-500">.</span>
            </h1>
            
            <div className="grid grid-cols-1 gap-4 mb-12">
              <div className="p-1 bg-gradient-to-r from-white/10 to-transparent rounded-3xl">
                <div className="bg-[#0a0f1d] p-6 rounded-[1.4rem] border border-white/5">
                  <h3 className="text-blue-500 font-black uppercase tracking-widest text-xs mb-4">Acteurs du Système</h3>
                  <div className="space-y-4">
                    <ActorRow role="RH" desc="Enregistrement et dossiers administratifs" />
                    <ActorRow role="Encadreurs" desc="Suivi quotidien et évaluation des performances" />
                    <ActorRow role="Stagiaires" desc="Consultation et soumission des rapports" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/5 flex items-center justify-between">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">République Centrafricaine • DP • StageENERCA v1.0</p>
          <div className="flex space-x-6 text-slate-500 text-xs font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </div>

      {/* Right Form Column */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 lg:p-20 bg-[#0d1225]">
        <div className="w-full max-w-md">
          <div className="mb-12">
            <h2 className="text-3xl font-black mb-3">{isLogin ? 'Bon retour !' : 'Créer un compte'}</h2>
            <p className="text-slate-500 font-medium italic">
              Une plateforme de gestion et suivi des stagiaires
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex p-1.5 bg-[#161c33] rounded-2xl mb-8 border border-white/5 shadow-inner">
            <button 
              onClick={() => setIsLogin(true)}
              className={cn(
                "flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300",
                isLogin ? "bg-[#1e2746] text-white shadow-lg border border-white/10" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Connexion
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={cn(
                "flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300",
                !isLogin ? "bg-[#1e2746] text-white shadow-lg border border-white/10" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Inscription
            </button>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm font-bold mb-6"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div 
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nom *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        required
                        type="text"
                        placeholder="Dupont"
                        className="w-full bg-[#161c33] border border-white/5 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/10 transition-all font-medium placeholder:text-slate-700"
                        value={formData.nom}
                        onChange={e => setFormData({...formData, nom: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Prénom *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        required
                        type="text"
                        placeholder="Jean"
                        className="w-full bg-[#161c33] border border-white/5 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/10 transition-all font-medium placeholder:text-slate-700"
                        value={formData.prenom}
                        onChange={e => setFormData({...formData, prenom: e.target.value})}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Adresse Email *</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  required
                  type="email"
                  placeholder="votre@email.com"
                  className="w-full bg-[#161c33] border border-white/5 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/10 transition-all font-medium placeholder:text-slate-700"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Profil</label>
                <div className="relative">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <select 
                    className="w-full bg-[#161c33] border border-white/5 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/10 transition-all font-medium appearance-none cursor-pointer"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                  >
                    <option value={UserRole.INTERN}>🎓 Stagiaire</option>
                    <option value={UserRole.TUTOR}>👔 Maître de stage (Tuteur)</option>
                    <option value={UserRole.HR}>🏢 Responsable RH</option>
                    <option value={UserRole.ADMIN}>🛡️ Administrateur Système</option>
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Mot de passe *</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder={isLogin ? "••••••••" : "Min. 6 caractères"}
                  className="w-full bg-[#161c33] border border-white/5 rounded-xl py-4 pl-12 pr-12 outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/10 transition-all font-medium placeholder:text-slate-700"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Confirmer mot de passe *</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    required
                    type="password"
                    placeholder="Répétez le mot de passe"
                    className="w-full bg-[#161c33] border border-white/5 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/10 transition-all font-medium placeholder:text-slate-700"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              <span>{loading ? 'Traitement...' : (isLogin ? 'Se connecter' : 'Créer mon compte')}</span>
              {!loading && <ChevronRight size={18} />}
            </button>
          </form>

          {isLogin && (
            <div className="mt-8 text-center">
              <p className="text-slate-500 text-sm font-medium">
                Vous n'avez pas encore de compte ? 
                <button onClick={() => setIsLogin(false)} className="text-blue-500 ml-1 hover:underline font-bold">Inscrivez-vous</button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
