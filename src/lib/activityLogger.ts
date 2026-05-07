import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export enum LogCategory {
  AUTH = 'auth',
  INTERN = 'intern',
  STAGE = 'stage',
  SECURITY = 'security',
  SYSTEM = 'system'
}

export const logActivity = async (action: string, target: string, category: LogCategory, userId: string, userName: string) => {
  try {
    await addDoc(collection(db, 'system_logs'), {
      action,
      target,
      category,
      userId,
      userName,
      timestamp: serverTimestamp(),
      severity: category === LogCategory.SECURITY ? 'warning' : 'info'
    });
  } catch (error) {
    console.error("Error logging activity", error);
  }
};
