import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const { doc, getDoc, getFirestore } = await import('firebase/firestore');
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (userDoc.exists() && userDoc.data()?.role === 'super_admin') {
          setIsAdmin(true);
          setUser(currentUser);
        } else {
          // If not admin, sign them out
          await auth.signOut();
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="h-screen w-screen flex items-center justify-center">Loading...</div>;
  
  return (user && isAdmin) ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard/*" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
