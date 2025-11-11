import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeView } from './components/EmployeeView';
import { UserRole, User, LogEntry, GeolocationData } from './types';
import { getGeolocation, getIpAddress } from './services/locationService';

// --- Login Component ---
const Login: React.FC<{ onLogin: (username: string, password: string) => Promise<void>; error: string | null; }> = ({ onLogin, error }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(username, password);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-900">
            <div className="max-w-md w-full bg-neutral-800 p-8 rounded-lg shadow-lg">
                <div className="text-center mb-8">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-brand-primary mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h1 className="text-3xl font-bold text-white mt-2">TimeGuard Login</h1>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-neutral-300">Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="mt-1 w-full p-3 bg-neutral-700 border border-neutral-600 rounded-md text-white focus:ring-brand-primary focus:border-brand-primary" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-neutral-300">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full p-3 bg-neutral-700 border border-neutral-600 rounded-md text-white focus:ring-brand-primary focus:border-brand-primary" required />
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <button type="submit" className="w-full py-3 px-4 bg-brand-primary text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition">Login</button>
                </form>
                <p className="text-center text-xs text-neutral-500 mt-6">Demo credentials: admin/admin, alice/alice123</p>
            </div>
        </div>
    );
};

// --- Main App Component ---
function App() {
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Load data from localStorage on initial render
  useEffect(() => {
    const storedUsers = localStorage.getItem('timeguard_users');
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      // First time setup: create mock data and store it
      const initialUsers: User[] = [
        { id: 'admin-1', name: 'Admin User', username: 'admin', password: 'admin', role: UserRole.Admin, status: 'Checked Out', lastCheckIn: null },
        { id: 'emp-1', name: 'Alice', username: 'alice', password: 'alice123', role: UserRole.Employee, status: 'Checked Out', lastCheckIn: null },
        { id: 'emp-2', name: 'Bob', username: 'bob', password: 'bob123', role: UserRole.Employee, status: 'Checked Out', lastCheckIn: null },
        { id: 'emp-3', name: 'Charlie', username: 'charlie', password: 'charlie123', role: UserRole.Employee, status: 'Checked Out', lastCheckIn: null },
      ];
      localStorage.setItem('timeguard_users', JSON.stringify(initialUsers));
      setUsers(initialUsers);
    }

    const storedLogs = localStorage.getItem('timeguard_logs');
    if (storedLogs) {
      const parsedLogs = JSON.parse(storedLogs).map((log: LogEntry) => ({...log, timestamp: new Date(log.timestamp)}));
      setLogs(parsedLogs);
    }
    
    const sessionUser = sessionStorage.getItem('timeguard_session');
    if(sessionUser) {
        setLoggedInUser(JSON.parse(sessionUser));
    }
  }, []);

  // Persist users to localStorage whenever they change
  useEffect(() => {
    if (users.length > 0) {
        localStorage.setItem('timeguard_users', JSON.stringify(users));
    }
  }, [users]);
  
  // Persist logs to localStorage whenever they change
  useEffect(() => {
    if (logs.length > 0) {
        localStorage.setItem('timeguard_logs', JSON.stringify(logs));
    }
  }, [logs]);

  const handleLogin = async (username: string, password: string): Promise<void> => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        setLoggedInUser(user);
        sessionStorage.setItem('timeguard_session', JSON.stringify(user));
        setLoginError(null);
    } else {
        setLoginError("Invalid username or password.");
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    sessionStorage.removeItem('timeguard_session');
  }

  const handleCheckIn = async (): Promise<{success: boolean; message: string}> => {
    if (isProcessing || !loggedInUser) {
      return { success: false, message: "Another operation is in progress or user not logged in."};
    }
    setIsProcessing(true);

    try {
      const ip = await getIpAddress();
      let location: GeolocationData | null = null;
      let locationError: string | undefined;

      try {
        location = await getGeolocation();
      } catch (error: any) {
        locationError = error.message;
      }
      
      const newStatus = loggedInUser.status === 'Checked In' ? 'Checked Out' : 'Checked In';
      const logType = newStatus === 'Checked In' ? 'in' : 'out';

      const newLog: LogEntry = {
        id: `log-${Date.now()}`,
        userId: loggedInUser.id,
        userName: loggedInUser.name,
        timestamp: new Date(),
        type: logType,
        ip: ip,
        location: location,
        locationError: locationError
      };

      // Fix: Explicitly type updatedUser to ensure it matches the User interface, preventing type widening of the 'status' property.
      const updatedUser: User = { ...loggedInUser, status: newStatus, lastCheckIn: newStatus === 'Checked In' ? new Date() : loggedInUser.lastCheckIn };

      setUsers(prevUsers => prevUsers.map(u => u.id === loggedInUser.id ? updatedUser : u));
      setLogs(prevLogs => [newLog, ...prevLogs]);
      setLoggedInUser(updatedUser); // Update logged in user state
      sessionStorage.setItem('timeguard_session', JSON.stringify(updatedUser));
      
      return { success: true, message: `Successfully Checked ${logType}!`};

    } catch (error) {
      return { success: false, message: `Check-in process failed. Please try again.` };
    } finally {
        setIsProcessing(false);
    }
  };

  // --- User Management Handlers ---
  const handleAddUser = (user: User) => {
    setUsers(prev => [...prev, user]);
  }
  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => {
        if (u.id === updatedUser.id) {
            // Keep original password if new one is not provided
            const password = updatedUser.password ? updatedUser.password : u.password;
            return { ...updatedUser, password };
        }
        return u;
    }));
  }
  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  }

  if (!loggedInUser) {
    return <Login onLogin={handleLogin} error={loginError} />;
  }

  return (
    <div className="min-h-screen bg-neutral-900 font-sans">
      <Header loggedInUser={loggedInUser} onLogout={handleLogout} />
      <main className="container mx-auto">
        {loggedInUser.role === UserRole.Admin ? (
          <AdminDashboard 
            users={users.filter(u => u.role === UserRole.Employee)} 
            logs={logs}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
          />
        ) : (
          <EmployeeView 
            currentUser={loggedInUser} 
            logs={logs} 
            onCheckIn={handleCheckIn}
          />
        )}
      </main>
       <footer className="text-center p-4 text-neutral-500 text-sm">
        <p>TimeGuard QR Attendance &copy; {new Date().getFullYear()}. A demo application.</p>
      </footer>
    </div>
  );
}

export default App;
