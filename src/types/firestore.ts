export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export enum UserRole {
  ADMIN = 'admin',
  HR = 'hr',
  TUTOR = 'tutor',
  INTERN = 'intern',
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: any;
  status?: 'active' | 'disabled';
  directionId?: string;
}

export interface Direction {
  id?: string;
  numDire: string;
  nomDire: string;
  nomD: string;
  nomDG: string;
}

export interface Stagiaire {
  id?: string;
  userId: string;
  nom: string;
  prenom: string;
  tel: string;
  sexe: string;
  specialite: string;
  niveau: string;
  institut: string;
  pays: string;
}

export interface Stage {
  id?: string;
  idStagiaire: string;
  userId: string;
  idTutor: string;
  idDirection: string;
  dateDebut: string;
  dateFin: string;
  duree: string;
  contrat: string;
  theme: string;
  type: string;
  renouvelable: boolean;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
}

export interface Activity {
  id?: string;
  stageId: string;
  userId: string;
  title: string;
  description: string;
  date: any;
  status: 'pending' | 'validated';
}

export interface Evaluation {
  id?: string;
  stageId: string;
  tutorId: string;
  note: number;
  appreciation: string;
  createdAt: any;
}

export interface Task {
  id: string;
  stageId: string;
  tutorId: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'todo' | 'in_progress' | 'done';
  createdAt: any;
}
