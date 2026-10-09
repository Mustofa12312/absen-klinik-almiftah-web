import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { LogOut, User, MapPin, Calendar } from 'lucide-react';
import { signOut } from 'firebase/auth';

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch Profile
        const empDoc = await getDoc(doc(db, 'employees', user.uid));
        if (empDoc.exists()) {
          setProfile(empDoc.data());
        }

        // Fetch Recent Attendance
        const q = query(
          collection(db, 'attendance'),
          where('employeeId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const att = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        // Sort by time descending manually since index might not exist
        att.sort((a, b) => b.checkInTime.localeCompare(a.checkInTime));
        setHistory(att.slice(0, 5)); // Last 5
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Memuat data pegawai...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <img src="/logo.png" alt="Logo" className="h-8 w-auto mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Portal Pegawai</h1>
            </div>
            <div className="flex items-center">
              <button onClick={handleLogout} className="flex items-center text-red-600 hover:text-red-700">
                <LogOut className="h-5 w-5 mr-1" />
                Keluar
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white shadow rounded-xl p-6 flex items-center space-x-4 border border-gray-100">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{profile?.name || 'Pegawai'}</h2>
            <p className="text-gray-500">{profile?.role || '-'} • {profile?.phone || '-'}</p>
          </div>
        </div>

        <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Riwayat Absensi Terakhir</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {history.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Belum ada riwayat absensi.</div>
            ) : (
              history.map(item => (
                <div key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center text-sm font-medium text-gray-900 mb-1">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {new Date(item.checkInTime).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      {item.locationName || 'Lokasi tidak diketahui'}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center bg-green-50 rounded-lg px-4 py-2 border border-green-100">
                      <div className="text-xs text-green-600 font-medium mb-1">Masuk</div>
                      <div className="text-sm font-bold text-green-700">{new Date(item.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div className="text-center bg-blue-50 rounded-lg px-4 py-2 border border-blue-100">
                      <div className="text-xs text-blue-600 font-medium mb-1">Pulang</div>
                      <div className="text-sm font-bold text-blue-700">{item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="text-center mt-8 text-sm text-gray-400">
          Untuk melakukan absensi dan pengajuan cuti, silakan gunakan Aplikasi Android Klinik Al-Miftah.
        </div>
      </main>
    </div>
  );
}
