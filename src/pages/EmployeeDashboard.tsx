import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { LogOut, User, Calendar, Clock, Fingerprint, CheckCircle2, FileText, X, MapPin } from 'lucide-react';
import { signOut } from 'firebase/auth';

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

        const empDoc = await getDoc(doc(db, 'employees', user.uid));
        if (empDoc.exists()) {
          setProfile(empDoc.data());
        }

        const q = query(
          collection(db, 'attendance'),
          where('employeeId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const att = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        att.sort((a, b) => b.checkInTime.localeCompare(a.checkInTime));
        setHistory(att.slice(0, 10));

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

  const handleLogout = () => { signOut(auth); };

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
      setHistory(prev => [newAtt, ...prev].slice(0, 10));
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
      await updateDoc(doc(db, 'attendance', todayAttendance.id), { checkOutTime: now });
      setTodayAttendance((prev: any) => ({ ...prev, checkOutTime: now }));
      setHistory(prev => prev.map((a: any) => a.id === todayAttendance.id ? { ...a, checkOutTime: now } : a));
      alert("Berhasil Absen Pulang!");
    } catch (e: any) {
      alert("Gagal absen: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setActionLoading(true);
    try {
      const { addDoc: add, collection: col } = await import('firebase/firestore');
      await add(col(db, 'leave_requests'), {
        employeeId: auth.currentUser!.uid,
        employeeName: profile.name,
        branchId: profile.branchId,
        type: requestForm.type,
        date: requestForm.startDate,
        startDate: requestForm.startDate,
        endDate: requestForm.endDate || requestForm.startDate,
        reason: requestForm.reason,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
      alert('Pengajuan berhasil dikirim!');
      setShowRequestModal(false);
      setRequestForm({ type: 'Izin', startDate: '', endDate: '', reason: '' });
    } catch (e: any) {
      alert("Gagal mengirim pengajuan: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const getStatusBadge = (item: any) => {
    const s = item.status || 'Hadir';
    if (s === 'Terlambat') return 'bg-amber-100 text-amber-700';
    if (s === 'Izin' || s === 'Sakit') return 'bg-blue-100 text-blue-700';
    return 'bg-green-100 text-green-700';
  };

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

          {!todayAttendance ? (
            /* Belum absen sama sekali */
            <button
              onClick={handleAbsenMasuk}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              <Fingerprint className="w-5 h-5" />
              {actionLoading ? 'Memproses...' : 'Absen Masuk'}
            </button>
          ) : !todayAttendance.checkOutTime ? (
            /* Sudah masuk, belum pulang */
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3 border border-green-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">Masuk: {fmtTime(todayAttendance.checkInTime)}</span>
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
                <span className="font-medium">Masuk: {fmtTime(todayAttendance.checkInTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-xl px-4 py-3 border border-blue-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">Pulang: {fmtTime(todayAttendance.checkOutTime)}</span>
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
              {history.map(item => (
                <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  {/* Kiri: tanggal & lokasi */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{fmtDate(item.checkInTime)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{item.locationName || 'Lokasi tidak diketahui'}</span>
                    </div>
                    {/* Badge status */}
                    <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(item)}`}>
                      {item.status || 'Hadir'}
                    </span>
                  </div>

                  {/* Kanan: jam masuk & pulang */}
                  <div className="flex gap-2 flex-shrink-0">
                    <div className="text-center bg-green-50 rounded-lg px-3 py-1.5 border border-green-100">
                      <div className="text-[10px] text-green-600 font-medium">Masuk</div>
                      <div className="text-xs font-bold text-green-700">{fmtTime(item.checkInTime)}</div>
                    </div>
                    <div className="text-center bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-100">
                      <div className="text-[10px] text-blue-600 font-medium">Pulang</div>
                      <div className="text-xs font-bold text-blue-700">
                        {item.checkOutTime ? fmtTime(item.checkOutTime) : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
