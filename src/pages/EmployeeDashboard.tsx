import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { LogOut, User, Calendar, Clock, Fingerprint, CheckCircle2, FileText, X, MapPin } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { formatErrorMessage } from '../lib/errorUtils';

export default function EmployeeDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    type: 'Izin',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const todayLabel = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Coba ambil dari dokumen employees/{uid}
        let empData: any = null;
        const empDoc = await getDoc(doc(db, 'employees', user.uid));
        if (empDoc.exists()) {
          empData = empDoc.data();
        } else {
          // Fallback cari employee dengan userId == user.uid atau email
          const empQuery = query(collection(db, 'employees'), where('userId', '==', user.uid));
          const empSnap = await getDocs(empQuery);
          if (!empSnap.empty) {
            empData = empSnap.docs[0].data();
          } else {
            // Default profil dari auth jika tidak ditemukan dokumen khusus
            empData = {
              name: user.displayName || user.email?.split('@')[0] || 'Pegawai',
              role: 'Pegawai',
              phone: user.phoneNumber || user.email || '-',
              branchId: 'HQ-01'
            };
          }
        }
        setProfile(empData);

        const q = query(
          collection(db, 'attendance'),
          where('employeeId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const att = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // Urutkan dari yang terbaru
        att.sort((a, b) => {
          const timeA = a.checkInTime || (a.createdAt?.toDate ? a.createdAt.toDate().toISOString() : a.date || '');
          const timeB = b.checkInTime || (b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : b.date || '');
          return String(timeB).localeCompare(String(timeA));
        });
        setHistory(att.slice(0, 10));

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayAtt = att.find((a: any) => (a.date === todayStr || a.workDate === todayStr));
        setTodayAttendance(todayAtt || null);
      } catch (err) {
        console.error('Gagal memuat data pegawai:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari akun?')) {
      await signOut(auth);
    }
  };

  const handleAbsenMasuk = async () => {
    if (!profile) {
      alert("Data profil pegawai belum siap. Silakan muat ulang halaman.");
      return;
    }
    setActionLoading(true);
    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      let lat = 0, lng = 0;
      try {
        const pos: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e: any) {
        console.warn('Geolocation tidak dapat diakses atau ditolak', e);
      }

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
          distanceMeters: 0,
          deviceId: 'web-browser',
          locationName: 'Web Browser'
        },
        checkOutTime: null,
        checkOut: null,
        locationLat: lat,
        locationLng: lng,
        locationName: "Web Browser",
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
      setHistory(prev => [newAtt, ...prev].slice(0, 10));
      alert("✓ Berhasil Absen Masuk!");
    } catch (e: any) {
      alert("Gagal melakukan absen masuk:\n" + formatErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAbsenPulang = async () => {
    if (!todayAttendance) return;
    setActionLoading(true);
    try {
      const now = new Date();
      const nowIso = now.toISOString();

      let lat = 0, lng = 0;
      try {
        const pos: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {
        console.warn('Geolocation tidak dapat diakses', e);
      }

      await updateDoc(doc(db, 'attendance', todayAttendance.id), {
        checkOutTime: nowIso,
        checkOut: {
          timestamp: serverTimestamp(),
          latitude: lat,
          longitude: lng,
          accuracy: 10,
          deviceId: 'web-browser',
        },
        status: todayAttendance.status || 'Hadir',
        updatedAt: serverTimestamp(),
      });

      setTodayAttendance((prev: any) => ({ ...prev, checkOutTime: nowIso, checkOut: { timestamp: new Date() } }));
      setHistory(prev => prev.map((a: any) => a.id === todayAttendance.id ? { ...a, checkOutTime: nowIso } : a));
      alert("✓ Berhasil Absen Pulang!");
    } catch (e: any) {
      alert("Gagal melakukan absen pulang:\n" + formatErrorMessage(e));
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
    } catch (e: any) {
      alert("Gagal mengirim pengajuan:\n" + formatErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
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

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Memuat data pegawai...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header — identik dengan screenshot */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
            <span className="text-base font-bold text-gray-900">Portal Pegawai</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-medium text-red-500 active:opacity-70"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </header>

      {/* Content — padding kecil, max-width seperti mobile */}
      <main className="flex-1 w-full max-w-lg mx-auto px-3 py-4 space-y-3">

        {/* ──── Kartu Profil ──── */}
        <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-tight truncate">
              {profile?.name || 'Pegawai'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate">
              {profile?.role || '-'} • {profile?.phone || '-'}
            </p>
          </div>
        </div>

        {/* ──── Status Kehadiran ──── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800">Status Kehadiran Hari Ini</h3>
          <p className="text-xs text-gray-400 mt-0.5 mb-4">{todayLabel}</p>

          {!isCheckedIn ? (
            /* Belum absen sama sekali */
            <button
              onClick={handleAbsenMasuk}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              <Fingerprint className="w-5 h-5" />
              {actionLoading ? 'Memproses...' : 'Absen Masuk'}
            </button>
          ) : !isCheckedOut ? (
            /* Sudah masuk, belum pulang */
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3 border border-green-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">Masuk: {fmtTime(checkInDisplay)}</span>
              </div>
              <button
                onClick={handleAbsenPulang}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                <Clock className="w-5 h-5" />
                {actionLoading ? 'Memproses...' : 'Absen Pulang'}
              </button>
            </div>
          ) : (
            /* Sudah masuk & pulang */
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3 border border-green-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">Masuk: {fmtTime(checkInDisplay)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-xl px-4 py-3 border border-blue-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">Pulang: {fmtTime(checkOutDisplay)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ──── Riwayat & Pengajuan ──── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Header riwayat */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">Riwayat Absensi Terakhir</h3>
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold"
            >
              <FileText className="w-3.5 h-3.5" />
              Buat Pengajuan
            </button>
          </div>

          {/* List */}
          {history.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Belum ada riwayat absensi.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map(item => {
                const inTime = item.checkInTime || item.checkIn?.timestamp || item.createdAt;
                const outTime = item.checkOutTime || item.checkOut?.timestamp || item.updatedAt;
                const recDate = item.date || item.workDate || item.checkInTime || (item.createdAt?.toDate ? item.createdAt.toDate().toISOString() : null);

                return (
                  <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    {/* Kiri: tanggal & lokasi */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{fmtDate(recDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{item.locationName || 'Lokasi tidak diketahui'}</span>
                      </div>
                      {/* Badge status */}
                      <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(item)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </div>

                    {/* Kanan: jam masuk & pulang */}
                    <div className="flex gap-2 flex-shrink-0">
                      <div className="text-center bg-green-50 rounded-lg px-3 py-1.5 border border-green-100">
                        <div className="text-[10px] text-green-600 font-medium">Masuk</div>
                        <div className="text-xs font-bold text-green-700">{fmtTime(inTime)}</div>
                      </div>
                      <div className="text-center bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-100">
                        <div className="text-[10px] text-blue-600 font-medium">Pulang</div>
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

        {/* ──── Tombol Keluar dari Akun (Identik dengan Android) ──── */}
        <div className="pt-2 pb-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-sm shadow-md shadow-red-500/10 transition-all active:scale-[0.99]"
          >
            <LogOut className="w-5 h-5" />
            Keluar dari Akun
          </button>
        </div>

        {/* ──── Footer ──── */}
        <p className="text-center text-xs text-gray-400 py-2 px-4 leading-relaxed">
          Aplikasi Android Klinik Al-Miftah tetap disarankan untuk pengalaman penuh (Anti Fake-GPS).
        </p>
      </main>

      {/* ──── Modal Pengajuan ──── Bottom-sheet style di mobile ──── */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRequestModal(false)}
          />

          {/* Sheet */}
          <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300">
            {/* Handle bar (mobile) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Buat Pengajuan</h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitRequest} className="px-5 py-4 space-y-4">
              {/* Jenis */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jenis Pengajuan</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Izin', 'Sakit', 'Cuti', 'Dinas'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRequestForm({ ...requestForm, type: t })}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-colors border ${
                        requestForm.type === t
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50'
                      }`}
                    >
                      {t === 'Dinas' ? 'Dinas' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={requestForm.startDate}
                    onChange={e => setRequestForm({ ...requestForm, startDate: e.target.value })}
                    className="block w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tanggal Selesai</label>
                  <input
                    type="date"
                    required
                    value={requestForm.endDate}
                    onChange={e => setRequestForm({ ...requestForm, endDate: e.target.value })}
                    className="block w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50"
                  />
                </div>
              </div>

              {/* Alasan */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Alasan</label>
                <textarea
                  required
                  rows={3}
                  value={requestForm.reason}
                  onChange={e => setRequestForm({ ...requestForm, reason: e.target.value })}
                  className="block w-full border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 resize-none"
                  placeholder="Tuliskan alasan pengajuan..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 pb-safe">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Menyimpan...' : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
