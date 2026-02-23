import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useStorage } from '../hooks/useStorage';

interface User {
    id: string;
    name: string;
    businessName: string;
    businessId: string;
    role: 'manager' | 'admin';
}

interface AuthContextType {
    user: User | null;
    login: (name: string, businessName: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useStorage<User | null>('shiftswap_user', null);

    const login = (name: string, businessName: string) => {
        // Mock login logic
        const id = Math.random().toString(36).substr(2, 9);
        const newUser: User = {
            id,
            name,
            businessName,
            businessId: `biz_${id}`,
            role: 'manager'
        };
        setUser(newUser);
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            isAuthenticated: !!user
        }}>
            {children}
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
