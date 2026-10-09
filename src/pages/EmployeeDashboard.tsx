import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { LogOut, User, MapPin, Calendar, Clock, Fingerprint, CheckCircle2 } from 'lucide-react';
import { signOut } from 'firebase/auth';

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
        
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayAtt = att.find((a: any) => a.date === todayStr);
        setTodayAttendance(todayAtt || null);
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

  const handleAbsenMasuk = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      let lat = 0, lng = 0;
      try {
        const pos: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {
        console.warn('Geolocation blocked or failed', e);
      }
      
      const hour = now.getHours();
      const status = hour >= 8 ? 'Terlambat' : 'Hadir';

      const data = {
        employeeId: auth.currentUser!.uid,
        employeeName: profile.name,
        branchId: profile.branchId,
        date: todayStr,
        checkInTime: now.toISOString(),
        checkOutTime: null,
        locationLat: lat,
        locationLng: lng,
        locationName: "Web Browser",
        isFakeGps: false,
        status: status,
      };

      const docRef = await addDoc(collection(db, 'attendance'), data);
      
      const newAtt = { id: docRef.id, ...data };
      setTodayAttendance(newAtt);
      setHistory(prev => [newAtt, ...prev].slice(0, 5));
      alert("Berhasil Absen Masuk!");
    } catch (e: any) {
      alert("Gagal absen: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAbsenPulang = async () => {
    if (!todayAttendance) return;
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'attendance', todayAttendance.id), {
        checkOutTime: now
      });
      setTodayAttendance((prev: any) => ({ ...prev, checkOutTime: now }));
      setHistory(prev => prev.map(a => a.id === todayAttendance.id ? { ...a, checkOutTime: now } : a));
      alert("Berhasil Absen Pulang!");
    } catch (e: any) {
      alert("Gagal absen: " + e.message);
    } finally {
      setActionLoading(false);
    }
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
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{profile?.name || 'Pegawai'}</h2>
            <p className="text-gray-500">{profile?.role || '-'} • {profile?.phone || '-'}</p>
          </div>
        </div>

        {/* Absensi Card */}
        <div className="bg-white shadow rounded-xl p-6 border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Status Kehadiran Hari Ini</h3>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex w-full sm:w-auto gap-4">
            {!todayAttendance ? (
              <button
                onClick={handleAbsenMasuk}
                disabled={actionLoading}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none transition-colors disabled:opacity-50"
              >
                <Fingerprint className="w-5 h-5 mr-2" />
                {actionLoading ? 'Memproses...' : 'Absen Masuk'}
              </button>
            ) : !todayAttendance.checkOutTime ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                <div className="flex items-center text-sm font-medium text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Masuk: {new Date(todayAttendance.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <button
                  onClick={handleAbsenPulang}
                  disabled={actionLoading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors disabled:opacity-50"
                >
                  <Clock className="w-5 h-5 mr-2" />
                  {actionLoading ? 'Memproses...' : 'Absen Pulang'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                <div className="flex items-center text-sm font-medium text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Masuk: {new Date(todayAttendance.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center text-sm font-medium text-blue-700 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Pulang: {new Date(todayAttendance.checkOutTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
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
