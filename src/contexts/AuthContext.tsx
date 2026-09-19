import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/src/config/firebase';

type AuthContextType = {
  user: User | null;
  role: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // loading until firebase gives initial state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Listen to the signed-in user's role document. onSnapshot means a role
  // changed in the Firebase console applies live, without re-login.
  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        // No doc or no role = read-only. A user with no profile can never
        // gain permissions.
        setRole(snap.exists() ? ((snap.data().role as string) ?? null) : null);
      },
      (error) => {
        // Fail safe: if the read is denied, treat it as "no role" instead
        // of crashing the app.
        console.log('Role listener error (treating as no role):', error.message);
        setRole(null);
      }
    );
    return unsubscribe;
  }, [user]);

  const login = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password);

  // Register the account AND create the users/{uid} profile document.
  // The security rules only allow creating this doc with role 'student',
  // so nobody can sign themselves up as a teacher.
  const register = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      role: 'student',
      createdAt: serverTimestamp(),
    });
    return cred;
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext); // who is logged in and their info
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}