import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { 
  LogOut, User, Calendar, Fingerprint, CheckCircle2, FileText, X, 
  MapPin, AlertTriangle, Navigation, Home, Clock, Building2, 
  Phone, Award, ChevronRight, Plus, AlertCircle
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { formatErrorMessage } from '../lib/errorUtils';

/** Hitung jarak (meter) antara dua koordinat menggunakan formula Haversine */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // radius bumi dalam meter
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface BranchLocation {
  latitude: number;
  longitude: number;
  radius: number; // meter
  name?: string;
}

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(() => Boolean(auth.currentUser));
  const [actionLoading, setActionLoading] = useState(false);
  const [branchLocation, setBranchLocation] = useState<BranchLocation | null>(null);
  const [shiftInfo, setShiftInfo] = useState<any>(null);
  const [locationError, setLocationError] = useState<{ message: string; distance?: number } | null>(null);

  // Bottom Navigation Tab State: 'home' | 'history' | 'requests' | 'profile'
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'requests' | 'profile'>('home');

  // Request State
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    type: 'Izin',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [todayLabel] = useState(() => new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }));

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Ambil Profil Pegawai — dengan retry otomatis
    const fetchProfile = async (attempt = 1): Promise<void> => {
      setProfileLoading(true);
      try {
        let empData: any = null;
        const empDoc = await getDoc(doc(db, 'employees', user.uid));
        if (empDoc.exists()) {
          empData = empDoc.data();
        } else {
          const empQuery = query(collection(db, 'employees'), where('userId', '==', user.uid));
          const empSnap = await getDocs(empQuery);
          if (!empSnap.empty) {
            empData = empSnap.docs[0].data();
          } else {
            empData = {
              name: user.displayName || user.email?.split('@')[0] || 'Pegawai',
              role: 'Pegawai',
              phone: user.phoneNumber || user.email || '-',
              branchId: 'HQ-01'
            };
          }
        }
        setProfile(empData);

        // Ambil data lokasi cabang dari Firestore
        const bId = empData.branchId;
        if (bId) {
          try {
            const branchDoc = await getDoc(doc(db, 'branches', bId));
            if (branchDoc.exists()) {
              const bd = branchDoc.data();
              if (bd.latitude != null && bd.longitude != null && bd.radius != null) {
                setBranchLocation({
                  latitude: bd.latitude,
                  longitude: bd.longitude,
                  radius: bd.radius,
                  name: bd.name,
                });
              }
            }
          } catch (branchErr) {
            console.warn('Gagal memuat data lokasi cabang:', branchErr);
          }
        }

        // Ambil data shift pegawai
        const sId = empData.currentShiftId || empData.shiftId;
        if (sId) {
          try {
            const shiftDoc = await getDoc(doc(db, 'shifts', sId));
            if (shiftDoc.exists()) {
              setShiftInfo(shiftDoc.data());
            }
          } catch (shiftErr) {
            console.warn('Gagal memuat shift pegawai:', shiftErr);
          }
        }
      } catch (err) {
        console.error(`Gagal memuat profil pegawai (percobaan ${attempt}):`, err);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, attempt * 1000));
          return fetchProfile(attempt + 1);
        }
        setProfile({
          name: user.displayName || user.email?.split('@')[0] || 'Pegawai',
          role: 'Pegawai',
          phone: user.phoneNumber || user.email || '-',
          branchId: 'HQ-01'
        });
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();

    // 2. Realtime Listener untuk Riwayat Absensi
    const q = query(
      collection(db, 'attendance'),
      where('employeeId', '==', user.uid)
    );

    const unsubAttendance = onSnapshot(q, (snap) => {
      const att = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const getTimeVal = (item: any): string => {
        if (item.checkInTime) return String(item.checkInTime);
        if (item.createdAt?.toDate) return item.createdAt.toDate().toISOString();
        if (item.checkIn?.timestamp?.toDate) return item.checkIn.timestamp.toDate().toISOString();
        if (item.date) return String(item.date);
        if (item.workDate) return String(item.workDate);
        return '';
      };

      att.sort((a, b) => getTimeVal(b).localeCompare(getTimeVal(a)));
      setHistory(att);

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayAtt = att.find((a: any) => (a.date === todayStr || a.workDate === todayStr));
      setTodayAttendance(todayAtt || null);
      setLoading(false);
    }, (err) => {
      console.error('Gagal memuat riwayat absensi:', err);
      setLoading(false);
    });

    // 3. Realtime Listener untuk Pengajuan Pegawai
    const reqQ = query(
      collection(db, 'leave_requests'),
      where('employeeId', '==', user.uid)
    );

    const unsubRequests = onSnapshot(reqQ, (snap) => {
      const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      reqs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().toISOString() : (a.startDate || '');
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : (b.startDate || '');
        return timeB.localeCompare(timeA);
      });
      setMyRequests(reqs);
    }, (err) => {
      console.warn('Gagal memuat daftar permohonan:', err);
    });

    return () => {
      unsubAttendance();
      unsubRequests();
    };
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari akun?')) {
      await signOut(auth);
    }
  };

  /** Ambil GPS saat ini — wajib berhasil, error jika tidak bisa */
  const getCurrentPosition = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 15000,
        enableHighAccuracy: true,
        maximumAge: 0,
      })
    );

  /** Validasi apakah pengguna berada di dalam radius cabang */
  const validateLocation = async (): Promise<{ lat: number; lng: number; distanceMeters: number }> => {
    setLocationError(null);

    if (!branchLocation) {
      console.warn('Data lokasi cabang tidak tersedia — validasi dilewati');
      return { lat: 0, lng: 0, distanceMeters: 0 };
    }

    let pos: GeolocationPosition;
    try {
      pos = await getCurrentPosition();
    } catch (e: any) {
      const msg = e.code === 1
        ? 'Izin lokasi ditolak. Aktifkan izin lokasi di browser Anda.'
        : e.code === 2
        ? 'GPS tidak tersedia. Pastikan GPS aktif dan coba lagi.'
        : 'Gagal mendapatkan lokasi. Pastikan GPS aktif.';
      throw new Error(msg);
    }

    const { latitude: lat, longitude: lng } = pos.coords;
    const distance = haversineDistance(lat, lng, branchLocation.latitude, branchLocation.longitude);

    if (distance > branchLocation.radius) {
      const distanceText = distance >= 1000
        ? `${(distance / 1000).toFixed(1)} km`
        : `${Math.round(distance)} m`;
      const error = {
        message: `Anda berada di luar area klinik (${distanceText} dari lokasi). Pastikan Anda sudah berada di tempat kerja.`,
        distance: Math.round(distance),
      };
      setLocationError(error);
      const locErr: any = new Error(error.message);
      locErr.isLocationError = true;
      throw locErr;
    }

    return { lat, lng, distanceMeters: Math.round(distance) };
  };

  const handleAbsenMasuk = async () => {
    if (!profile) {
      alert("Data profil pegawai belum siap. Silakan muat ulang halaman.");
      return;
    }
    setActionLoading(true);
    setLocationError(null);
    try {
      const { lat, lng, distanceMeters } = await validateLocation();

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const hour = now.getHours();
      const status = hour >= 8 ? 'Terlambat' : 'Hadir';

      const data = {
        employeeId: auth.currentUser!.uid,
        employeeName: profile.name || 'Pegawai',
        branchId: profile.branchId || 'HQ-01',
        shiftId: profile.currentShiftId || 'default',
        date: todayStr,
        workDate: todayStr,
        checkInTime: now.toISOString(),
        checkIn: {
          timestamp: serverTimestamp(),
          latitude: lat,
          longitude: lng,
          accuracy: 10,
          distanceMeters,
          deviceId: 'web-browser',
          locationName: branchLocation?.name || 'Web Browser',
        },
        checkOutTime: null,
        checkOut: null,
        locationLat: lat,
        locationLng: lng,
        locationName: branchLocation?.name || 'Web Browser',
        isFakeGps: false,
        status: status,
        lateMinutes: hour >= 8 ? (hour - 8) * 60 + now.getMinutes() : 0,
        earlyCheckoutMinutes: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'attendance'), data);
      const newAtt = { id: docRef.id, ...data };
      setTodayAttendance(newAtt);
      setHistory(prev => [newAtt, ...prev]);
      alert("✓ Berhasil Absen Masuk!");
    } catch (e: any) {
      if (!e?.isLocationError) {
        alert("Gagal melakukan absen masuk:\n" + formatErrorMessage(e));
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleAbsenKeluar = async () => {
    setActionLoading(true);
    setLocationError(null);
    try {
      const { lat, lng, distanceMeters } = await validateLocation();

      const now = new Date();
      const nowIso = now.toISOString();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      if (todayAttendance) {
        await updateDoc(doc(db, 'attendance', todayAttendance.id), {
          checkOutTime: nowIso,
          checkOut: {
            timestamp: serverTimestamp(),
            latitude: lat,
            longitude: lng,
            accuracy: 10,
            distanceMeters,
            deviceId: 'web-browser',
          },
          status: todayAttendance.status || 'Hadir',
          updatedAt: serverTimestamp(),
        });

        const updated = {
          ...todayAttendance,
          checkOutTime: nowIso,
          checkOut: {
            latitude: lat,
            longitude: lng,
            accuracy: 10,
            distanceMeters,
            deviceId: 'web-browser',
          }
        };
        setTodayAttendance(updated);
        setHistory(prev => prev.map(a => a.id === updated.id ? updated : a));
      } else {
        const data = {
          employeeId: auth.currentUser!.uid,
          employeeName: profile?.name || 'Pegawai',
          branchId: profile?.branchId || 'HQ-01',
          shiftId: profile?.currentShiftId || 'default',
          date: todayStr,
          workDate: todayStr,
          checkInTime: null,
          checkIn: null,
          checkOutTime: nowIso,
          checkOut: {
            timestamp: serverTimestamp(),
            latitude: lat,
            longitude: lng,
            accuracy: 10,
            distanceMeters,
            deviceId: 'web-browser',
          },
          locationLat: lat,
          locationLng: lng,
          locationName: branchLocation?.name || 'Web Browser',
          isFakeGps: false,
          status: 'Hadir',
          lateMinutes: 0,
          earlyCheckoutMinutes: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'attendance'), data);
        const newAtt = { id: docRef.id, ...data };
        setTodayAttendance(newAtt);
        setHistory(prev => [newAtt, ...prev]);
      }

      alert("✓ Berhasil Absen Keluar!");
    } catch (e: any) {
      if (!e?.isLocationError) {
        alert("Gagal melakukan absen keluar:\n" + formatErrorMessage(e));
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      alert("Data profil pegawai belum siap.");
      return;
    }
    setActionLoading(true);
    try {
      await addDoc(collection(db, 'leave_requests'), {
        employeeId: auth.currentUser!.uid,
        employeeName: profile.name,
        branchId: profile.branchId || 'HQ-01',
        type: requestForm.type,
        date: requestForm.startDate,
        startDate: requestForm.startDate,
        endDate: requestForm.endDate || requestForm.startDate,
        reason: requestForm.reason,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      alert('✓ Pengajuan berhasil dikirim! Menunggu persetujuan admin.');
      setShowRequestModal(false);
      setRequestForm({ type: 'Izin', startDate: '', endDate: '', reason: '' });
      setActiveTab('requests');
    } catch (e: any) {
      alert("Gagal mengirim pengajuan:\n" + formatErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  const openNewRequestModal = (initialType = 'Izin') => {
    const today = new Date().toISOString().split('T')[0];
    setRequestForm({
      type: initialType,
      startDate: today,
      endDate: today,
      reason: ''
    });
    setShowRequestModal(true);
  };

  const fmtTime = (val: any) => {
    if (!val) return '--:--';
    if (typeof val === 'string') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    if (val && typeof val.toDate === 'function') {
      return val.toDate().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    if (val && val.seconds) {
      return new Date(val.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return '--:--';
  };

  const fmtDate = (val: any) => {
    if (!val) return '-';
    if (typeof val === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [y, m, d] = val.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
      const d = new Date(val);
      return isNaN(d.getTime()) ? val : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (val && typeof val.toDate === 'function') {
      return val.toDate().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    return '-';
  };

  const getStatusText = (status: string) => {
    const s = (status || 'Hadir').toLowerCase();
    if (s === 'late' || s === 'terlambat') return 'Terlambat';
    if (s === 'permission' || s === 'izin') return 'Izin';
    if (s === 'sick' || s === 'sakit') return 'Sakit';
    if (s === 'leave' || s === 'cuti') return 'Cuti';
    if (s === 'business_trip' || s === 'dinas') return 'Dinas';
    if (s === 'early_checkout') return 'Pulang Cepat';
    if (s === 'present' || s === 'hadir') return 'Hadir';
    return status || 'Hadir';
  };

  const getStatusBadge = (item: any) => {
    const s = getStatusText(item.status);
    if (s === 'Terlambat' || s === 'Pulang Cepat') return 'bg-amber-100 text-amber-700';
    if (s === 'Izin' || s === 'Sakit' || s === 'Cuti' || s === 'Dinas') return 'bg-blue-100 text-blue-700';
    return 'bg-green-100 text-green-700';
  };

  const isCheckedIn = !!todayAttendance;
  const isCheckedOut = !!(todayAttendance?.checkOutTime || todayAttendance?.checkOut);
  const checkInDisplay = todayAttendance ? (todayAttendance.checkInTime || todayAttendance.checkIn?.timestamp) : null;
  const checkOutDisplay = todayAttendance ? (todayAttendance.checkOutTime || todayAttendance.checkOut?.timestamp) : null;

  const isReady = !loading && !profileLoading;

  if (!isReady) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Memuat portal pegawai...</p>
      </div>
    </div>
  );

  const pendingRequestsCount = myRequests.filter(r => (r.status || '').toUpperCase() === 'PENDING').length;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-between">
      {/* ──── Top Header ──── */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
            <div>
              <span className="text-base font-bold text-gray-900 leading-none">Portal Pegawai</span>
              <span className="block text-[10px] text-gray-400 mt-0.5">Klinik Al-Miftah</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
      </header>

      {/* ──── Content Area (Scrollable with Bottom Bar Padding) ──── */}
      <main className="flex-1 w-full max-w-lg mx-auto px-3 py-4 space-y-3 pb-24">

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: BERANDA (Home / Kehadiran Hari Ini)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Kartu Profil Singkat */}
            <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-gray-100">
              <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-gray-900 leading-tight truncate">
                  {profile?.name || 'Pegawai'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5 truncate">
                  {profile?.role || 'Staff'} • {profile?.phone || '-'}
                </p>
                {branchLocation && (
                  <p className="text-xs text-orange-600 font-medium flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{branchLocation.name || 'Cabang Terdaftar'}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Status Kehadiran Hari Ini */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Status Kehadiran Hari Ini</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{todayLabel}</p>
                </div>
                {isCheckedOut && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Selesai Kerja ✓
                  </span>
                )}
              </div>

              {/* Kartu Jam Absensi */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className={`p-3 rounded-xl border ${checkInDisplay ? 'bg-green-50/70 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-500">Masuk</span>
                    {checkInDisplay && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                  </div>
                  <div className={`text-base font-bold mt-1 ${checkInDisplay ? 'text-green-700' : 'text-gray-400'}`}>
                    {fmtTime(checkInDisplay)}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${checkOutDisplay ? 'bg-blue-50/70 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-500">Keluar</span>
                    {checkOutDisplay && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div className={`text-base font-bold mt-1 ${checkOutDisplay ? 'text-blue-700' : 'text-gray-400'}`}>
                    {fmtTime(checkOutDisplay)}
                  </div>
                </div>
              </div>

              {/* Tombol Absen: Absen Masuk & Absen Keluar */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={handleAbsenMasuk}
                  disabled={actionLoading || isCheckedIn || !profile}
                  className={`flex items-center justify-center gap-2 py-3.5 px-3 rounded-xl font-bold text-sm transition-all ${
                    isCheckedIn
                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-75'
                      : !profile
                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-75'
                      : 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-sm active:scale-[0.98]'
                  }`}
                >
                  <Fingerprint className="w-5 h-5 flex-shrink-0" />
                  <span>{isCheckedIn ? 'Sudah Masuk' : 'Absen Masuk'}</span>
                </button>

                <button
                  onClick={handleAbsenKeluar}
                  disabled={actionLoading || isCheckedOut || (!isCheckedIn && !profile)}
                  className={`flex items-center justify-center gap-2 py-3.5 px-3 rounded-xl font-bold text-sm transition-all ${
                    isCheckedOut
                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-75'
                      : isCheckedIn
                      ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-500/20 active:scale-[0.98]'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm active:scale-[0.98]'
                  }`}
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <span>{isCheckedOut ? 'Sudah Keluar' : 'Absen Keluar'}</span>
                </button>
              </div>
            </div>

            {/* Error Lokasi */}
            {locationError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-red-700">Absensi Ditolak — Di Luar Area</p>
                  <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{locationError.message}</p>
                  {branchLocation && locationError.distance != null && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500">
                      <Navigation className="h-3.5 w-3.5" />
                      <span>
                        Jarak Anda: <strong>{locationError.distance >= 1000 ? `${(locationError.distance / 1000).toFixed(1)} km` : `${locationError.distance} m`}</strong>
                        {' '}· Radius diizinkan: <strong>{branchLocation.radius} m</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Riwayat Terakhir & Tombol Lihat Semua */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-800">Riwayat Terakhir</h3>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs font-semibold text-primary hover:text-orange-700 flex items-center gap-0.5"
                >
                  Lihat Semua
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {history.slice(0, 3).length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  Belum ada catatan kehadiran.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {history.slice(0, 3).map(item => {
                    const inTime = item.checkInTime || item.checkIn?.timestamp || item.createdAt;
                    const outTime = item.checkOutTime || item.checkOut?.timestamp || item.updatedAt;
                    const recDate = item.date || item.workDate || item.checkInTime || (item.createdAt?.toDate ? item.createdAt.toDate().toISOString() : null);

                    return (
                      <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                            <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{fmtDate(recDate)}</span>
                          </div>
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(item)}`}>
                            {getStatusText(item.status)}
                          </span>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <div className="text-center bg-green-50 rounded-lg px-2.5 py-1 border border-green-100">
                            <div className="text-[9px] text-green-600 font-medium">Masuk</div>
                            <div className="text-xs font-bold text-green-700">{fmtTime(inTime)}</div>
                          </div>
                          <div className="text-center bg-blue-50 rounded-lg px-2.5 py-1 border border-blue-100">
                            <div className="text-[9px] text-blue-600 font-medium">Keluar</div>
                            <div className="text-xs font-bold text-blue-700">
                              {outTime && (item.checkOutTime || item.checkOut) ? fmtTime(outTime) : '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Card Buat Pengajuan */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-sm font-bold text-orange-900">Perlu Izin atau Cuti?</p>
                <p className="text-xs text-orange-700 mt-0.5">Kirim permohonan resmi langsung ke pimpinan.</p>
              </div>
              <button
                onClick={() => openNewRequestModal('Izin')}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                Ajukan
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: RIWAYAT (History Lengkap)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Riwayat Kehadiran</h2>
              <p className="text-xs text-gray-500 mt-0.5">Daftar lengkap catatan absensi masuk dan keluar Anda.</p>

              {/* Stat Ringkas */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
                <div className="bg-green-50 p-2.5 rounded-xl border border-green-100">
                  <p className="text-xs text-green-700 font-medium">Total Absensi</p>
                  <p className="text-lg font-bold text-green-800">{history.length} Hari</p>
                </div>
                <div className="bg-yellow-50 p-2.5 rounded-xl border border-yellow-100">
                  <p className="text-xs text-yellow-700 font-medium">Terlambat</p>
                  <p className="text-lg font-bold text-yellow-800">
                    {history.filter(h => getStatusText(h.status) === 'Terlambat').length} Kali
                  </p>
                </div>
              </div>
            </div>

            {/* List Riwayat */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {history.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  Belum ada catatan riwayat absensi.
                </div>
              ) : (
                history.map(item => {
                  const inTime = item.checkInTime || item.checkIn?.timestamp || item.createdAt;
                  const outTime = item.checkOutTime || item.checkOut?.timestamp || item.updatedAt;
                  const recDate = item.date || item.workDate || item.checkInTime || (item.createdAt?.toDate ? item.createdAt.toDate().toISOString() : null);

                  return (
                    <div key={item.id} className="p-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 mb-1">
                          <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                          <span>{fmtDate(recDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{item.locationName || branchLocation?.name || 'Klinik Al-Miftah'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${getStatusBadge(item)}`}>
                            {getStatusText(item.status)}
                          </span>
                          {item.lateMinutes > 0 && (
                            <span className="text-[10px] text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full font-medium">
                              Terlambat {item.lateMinutes} menit
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <div className="text-center bg-green-50 rounded-xl px-3 py-2 border border-green-100">
                          <div className="text-[10px] text-green-600 font-semibold">Masuk</div>
                          <div className="text-xs font-bold text-green-700">{fmtTime(inTime)}</div>
                        </div>
                        <div className="text-center bg-blue-50 rounded-xl px-3 py-2 border border-blue-100">
                          <div className="text-[10px] text-blue-600 font-semibold">Keluar</div>
                          <div className="text-xs font-bold text-blue-700">
                            {outTime && (item.checkOutTime || item.checkOut) ? fmtTime(outTime) : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: PENGAJUAN (Requests / Permohonan Izin & Cuti)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'requests' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Pengajuan & Izin</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Kirim dan pantau status permohonan Anda.</p>
                </div>
                <button
                  onClick={() => openNewRequestModal('Izin')}
                  className="px-3.5 py-2 bg-primary hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Buat Baru
                </button>
              </div>

              {/* Quick Action Grid */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-gray-100">
                {[
                  { type: 'Izin', label: 'Izin', icon: Clock, color: 'text-blue-600 bg-blue-50' },
                  { type: 'Sakit', label: 'Sakit', icon: AlertCircle, color: 'text-red-600 bg-red-50' },
                  { type: 'Cuti', label: 'Cuti', icon: Calendar, color: 'text-emerald-600 bg-emerald-50' },
                  { type: 'Dinas', label: 'Dinas', icon: Award, color: 'text-purple-600 bg-purple-50' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => openNewRequestModal(item.type)}
                      className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all text-center"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1 ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-700">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Riwayat Permohonan */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">Riwayat Pengajuan Anda</h3>
                <span className="text-xs text-gray-400 font-medium">{myRequests.length} Data</span>
              </div>

              {myRequests.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  Belum ada permohonan yang diajukan.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {myRequests.map((req) => {
                    const status = (req.status || 'PENDING').toUpperCase();
                    const isPending = status === 'PENDING';
                    const isApproved = status === 'APPROVED';

                    return (
                      <div key={req.id} className="p-4 space-y-2 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-gray-900">
                            Pengajuan {req.type}
                          </span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : isApproved
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {isPending ? 'Menunggu Review' : isApproved ? 'Disetujui ✓' : 'Ditolak ✕'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {req.startDate === req.endDate || !req.endDate
                              ? fmtDate(req.startDate)
                              : `${fmtDate(req.startDate)} s/d ${fmtDate(req.endDate)}`}
                          </span>
                        </div>

                        {req.reason && (
                          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 leading-relaxed">
                            {req.reason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: PROFIL (Profil Lengkap & Pengaturan Akun)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Kartu Profil Besar */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{profile?.name || 'Pegawai'}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{profile?.role || 'Staff Pegawai'}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Akun Aktif
              </div>
            </div>

            {/* Informasi Detail */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informasi Pegawai</h3>
              </div>
              <div className="divide-y divide-gray-100 text-sm">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" /> No. Telepon
                  </span>
                  <span className="font-semibold text-gray-900">{profile?.phone || '-'}</span>
                </div>

                {profile?.strNumber && (
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Award className="w-4 h-4 text-gray-400" /> No. STR
                    </span>
                    <span className="font-semibold text-gray-900">{profile.strNumber}</span>
                  </div>
                )}

                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" /> Cabang Penempatan
                  </span>
                  <span className="font-semibold text-gray-900">{branchLocation?.name || profile?.branchId || '-'}</span>
                </div>

                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" /> Jadwal Shift
                  </span>
                  <span className="font-semibold text-gray-900">
                    {shiftInfo ? `${shiftInfo.name} (${shiftInfo.startTime} - ${shiftInfo.endTime})` : 'Default'}
                  </span>
                </div>
              </div>
            </div>

            {/* Informasi Sistem & Perangkat */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sistem & Keamanan</h3>
              </div>
              <div className="divide-y divide-gray-100 text-sm">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-500">Platform Absensi</span>
                  <span className="font-semibold text-gray-900">Web Browser Portal</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-500">Validasi Geofence</span>
                  <span className="font-semibold text-green-600">Aktif ({branchLocation?.radius || 50} meter)</span>
                </div>
              </div>
            </div>

            {/* Tombol Keluar Akun */}
            <button
              onClick={handleLogout}
              className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
            >
              <LogOut className="w-4 h-4" />
              Keluar dari Akun
            </button>
          </div>
        )}

        {/* ──── Footer Catatan ──── */}
        <p className="text-center text-[11px] text-gray-400 py-3 px-4 leading-relaxed">
          Sistem Absensi Pegawai Klinik Al-Miftah • Versi Web Mobile
        </p>
      </main>

      {/* ══════════════════════════════════════════════════════════════
          BOTTOM NAVIGATION BAR (Fixed at the bottom of the screen)
         ══════════════════════════════════════════════════════════════ */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 max-w-lg mx-auto shadow-lg">
        <div className="grid grid-cols-4 h-16">
          {/* Tab 1: Beranda */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
              activeTab === 'home' ? 'text-primary font-bold' : 'text-gray-400 hover:text-gray-600 font-medium'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[11px]">Beranda</span>
            {activeTab === 'home' && (
              <span className="absolute top-0 inset-x-4 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          {/* Tab 2: Riwayat */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
              activeTab === 'history' ? 'text-primary font-bold' : 'text-gray-400 hover:text-gray-600 font-medium'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[11px]">Riwayat</span>
            {activeTab === 'history' && (
              <span className="absolute top-0 inset-x-4 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          {/* Tab 3: Pengajuan */}
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
              activeTab === 'requests' ? 'text-primary font-bold' : 'text-gray-400 hover:text-gray-600 font-medium'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[11px]">Pengajuan</span>
            {pendingRequestsCount > 0 && (
              <span className="absolute top-2 right-6 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            )}
            {activeTab === 'requests' && (
              <span className="absolute top-0 inset-x-4 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          {/* Tab 4: Profil */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
              activeTab === 'profile' ? 'text-primary font-bold' : 'text-gray-400 hover:text-gray-600 font-medium'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[11px]">Profil</span>
            {activeTab === 'profile' && (
              <span className="absolute top-0 inset-x-4 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════
          MODAL / BOTTOM SHEET PENGAJUAN
         ══════════════════════════════════════════════════════════════ */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRequestModal(false)}
          />

          <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 animate-in slide-in-from-bottom-4 duration-300">
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Buat Pengajuan</h3>
                <p className="text-xs text-gray-400 mt-0.5">Izin, sakit, cuti, atau dinas luar</p>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  Jenis Pengajuan
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['Izin', 'Sakit', 'Cuti', 'Dinas'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRequestForm(p => ({ ...p, type: t }))}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        requestForm.type === t
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={requestForm.startDate}
                    onChange={e => setRequestForm(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={requestForm.endDate}
                    onChange={e => setRequestForm(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                  Alasan / Keterangan
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Tuliskan alasan pengajuan Anda secara jelas..."
                  value={requestForm.reason}
                  onChange={e => setRequestForm(p => ({ ...p, reason: e.target.value }))}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-3 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 text-xs font-bold text-white bg-primary hover:bg-orange-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
