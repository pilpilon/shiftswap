import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface User {
    id: string; // Firebase UID
    name: string;
    businessName: string;
    businessId: string; // also Firebase UID for strict tenancy
    role: 'manager' | 'admin';
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    register: (email: string, pass: string, name: string, businessName: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch the extra business details from Firestore
                try {
                    const docSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUser({
                            id: firebaseUser.uid,
                            name: data.name || 'User',
                            businessName: data.businessName || 'My Business',
                            businessId: firebaseUser.uid,
                            role: data.role || 'manager'
                        });
                    } else {
                        // Fallback if doc doesn't exist yet but user is auth'd
                        setUser({
                            id: firebaseUser.uid,
                            name: firebaseUser.email || 'User',
                            businessName: 'My Business',
                            businessId: firebaseUser.uid,
                            role: 'manager'
                        });
                    }
                } catch (err) {
                    console.error("Error fetching user doc:", err);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, pass: string) => {
        await signInWithEmailAndPassword(auth, email, pass);
    };

    const register = async (email: string, pass: string, name: string, businessName: string) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const { uid } = userCredential.user;

        // Save the metadata in a Firestore tracking collection
        await setDoc(doc(db, 'users', uid), {
            name,
            businessName,
            businessId: uid, // Strict multi-tenancy master key
            role: 'manager',
            createdAt: new Date().toISOString()
        });
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            register,
            logout,
            isAuthenticated: !!user
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
