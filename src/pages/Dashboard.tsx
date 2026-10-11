import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  LayoutDashboard, Users, MapPin, Clock, Calendar, ShieldAlert,
  LogOut, Building2, FileCheck2, Menu, Smartphone, ClipboardList,
  Activity, AlertCircle, CheckCircle2, UserX, Stethoscope, BarChart2, X
} from 'lucide-react';

import Branches from './Branches';
import Employees from './Employees';
import Shifts from './Shifts';
import Requests from './Requests';
import Holidays from './Holidays';
import SecurityEvents from './SecurityEvents';
import AuditLog from './AuditLog';
import DeviceManagement from './DeviceManagement';
import AttendanceMonitoring from './AttendanceMonitoring';
import LocationSettings from './LocationSettings';
import ReportPage from './ReportPage';

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { name: 'Ringkasan',           icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Monitoring Absensi',  icon: Activity,        path: '/dashboard/attendance' },
    { name: 'Manajemen Cabang',    icon: Building2,       path: '/dashboard/branches' },
    { name: 'Pegawai',             icon: Users,           path: '/dashboard/employees' },
    { name: 'Lokasi Absensi',      icon: MapPin,          path: '/dashboard/locations' },
    { name: 'Jadwal Shift',        icon: Clock,           path: '/dashboard/shifts' },
    { name: 'Hari Libur',          icon: Calendar,        path: '/dashboard/holidays' },
    { name: 'Pengajuan & Koreksi', icon: FileCheck2,      path: '/dashboard/requests' },
    { name: 'Rekap & Laporan',     icon: BarChart2,       path: '/dashboard/reports' },
    { name: 'Device Management',   icon: Smartphone,      path: '/dashboard/devices' },
    { name: 'Security Events',     icon: ShieldAlert,     path: '/dashboard/security' },
    { name: 'Audit Log',           icon: ClipboardList,   path: '/dashboard/audit' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col z-10">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="Logo Klinik Al-Miftah" className="h-8 w-auto object-contain" />
            <span className="font-semibold text-gray-900">Al-Miftah Admin</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-30 transition-transform duration-300 md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200 justify-between">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="Logo Klinik Al-Miftah" className="h-8 w-auto object-contain" />
            <span className="font-semibold text-gray-900">Al-Miftah Admin</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center md:hidden">
            <button 
              className="text-gray-500 hover:text-gray-700 p-2 -ml-2"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Super Admin</span>
              <img
                className="h-8 w-8 rounded-full bg-gray-200"
                src="https://ui-avatars.com/api/?name=Super+Admin&background=e06a00&color=fff"
                alt=""
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
          <Routes>
            <Route path="/"           element={<Overview />} />
            <Route path="/attendance" element={<AttendanceMonitoring />} />
            <Route path="/branches"   element={<Branches />} />
            <Route path="/employees"  element={<Employees />} />
            <Route path="/locations"  element={<LocationSettings />} />
            <Route path="/shifts"     element={<Shifts />} />
            <Route path="/holidays"   element={<Holidays />} />
            <Route path="/requests"   element={<Requests />} />
            <Route path="/reports"    element={<ReportPage />} />
            <Route path="/devices"    element={<DeviceManagement />} />
            <Route path="/security"   element={<SecurityEvents />} />
            <Route path="/audit"      element={<AuditLog />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}



// Overview dengan 11 KPI sesuai PRD Bab 61
function Overview() {
  const [data, setData] = useState({
    totalEmployees: '...',
    totalPresent: '...',
    late: '...',
    notCheckedIn: '...',
    izin: '...',
    sakit: '...',
    cuti: '...',
    dinas: '...',
    inactive: '...',
    securityEvents: '...',
    pending: '...',
  });
  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  
  const todayLabel = useMemo(() => new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), []);

  useEffect(() => {
    // Fetch branches for filter dropdown
    getDocs(collection(db, 'branches')).then(snap => {
      setBranches(snap.docs.map(d => ({ id: d.id, name: d.data().name, code: d.data().code })));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        
        // 1. Employees — filter migrated docs + deduplikasi legacy
        const empSnap = await getDocs(collection(db, 'employees'));
        const allEmpDocs = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Buang dokumen migrated
        const nonMigrated = allEmpDocs.filter((d: any) => !d.migrated);
        // Pisahkan auth UID (≥28 chars) vs legacy auto-ID (<28 chars)
        const authEmpDocs   = nonMigrated.filter((d: any) => d.id.length >= 28);
        const legacyEmpDocs = nonMigrated.filter((d: any) => d.id.length < 28);
        // Buat set key unik dari auth docs
        const authEmpKeys = new Set<string>();
        authEmpDocs.forEach((d: any) => {
          const key = `${d.strNumber || ''}|${d.phone || ''}`;
          if (key !== '|') authEmpKeys.add(key);
        });
        // Gabungkan: auth docs + legacy yg tidak punya padanan
        const uniqueEmpDocs = [
          ...authEmpDocs,
          ...legacyEmpDocs.filter((d: any) => {
            const key = `${d.strNumber || ''}|${d.phone || ''}`;
            return key === '|' || !authEmpKeys.has(key);
          })
        ];

        let totalActive = 0;
        let inactive = 0;
        const activeEmployeeIds = new Set<string>();
        uniqueEmpDocs.forEach((d: any) => {
          if (d.status === 'inactive') {
            inactive++;
          } else {
            totalActive++;
            activeEmployeeIds.add(d.id);
          }
        });

        // 2. Attendance — hanya hitung pegawai aktif
        let attQuery;
        if (selectedBranch) {
          attQuery = query(
            collection(db, 'attendance'),
            where('workDate', '==', todayStr),
            where('branchId', '==', selectedBranch)
          );
        } else {
          attQuery = query(collection(db, 'attendance'), where('workDate', '==', todayStr));
        }
        const attSnap = await getDocs(attQuery);
        let present = 0;
        let late = 0;
        const presentEmployeeIds = new Set<string>();
        attSnap.forEach(doc => {
          const d = doc.data();
          // Hanya hitung jika pegawai aktif
          if (activeEmployeeIds.has(d.employeeId)) {
            present++;
            presentEmployeeIds.add(d.employeeId);
            // Status 'late' dari Flutter (lowercase)
            if (d.lateMinutes > 0 || d.status === 'late') late++;
          }
        });

        // 3. Leave Requests — Flutter menyimpan status lowercase & type dalam bahasa Inggris
        // status: 'pending' | 'approved' | 'rejected'
        // type:   'permission' | 'sick' | 'leave' | 'business_trip'
        const leaveSnap = await getDocs(collection(db, 'leave_requests'));
        const corrSnap = await getDocs(collection(db, 'correction_requests'));
        let izin = 0, sakit = 0, cuti = 0, dinas = 0, pending = 0;
        const onLeaveEmployeeIds = new Set<string>();

        leaveSnap.forEach(doc => {
          const d = doc.data();
          const statusLower = (d.status || '').toLowerCase();
          // Filter per cabang jika dipilih
          if (selectedBranch && d.branchId !== selectedBranch) return;
          // Hitung pending: status lowercase dari Flutter
          if (statusLower === 'pending') pending++;
          // Hitung izin/sakit/cuti/dinas yang disetujui hari ini
          if (statusLower === 'approved') {
            const isToday = d.date === todayStr || d.startDate === todayStr ||
              // Range: startDate <= today <= endDate
              (d.startDate && d.endDate && d.startDate <= todayStr && d.endDate >= todayStr);
            if (isToday && activeEmployeeIds.has(d.employeeId)) {
              onLeaveEmployeeIds.add(d.employeeId);
              // type dari Flutter: 'permission'|'sick'|'leave'|'business_trip'
              // Juga support tipe lama dalam bahasa Indonesia untuk backward compat
              const t = (d.type || '').toLowerCase();
              if (t === 'permission' || t === 'izin') izin++;
              else if (t === 'sick' || t === 'sakit') sakit++;
              else if (t === 'leave' || t === 'cuti') cuti++;
              else if (t === 'business_trip' || t === 'dinas') dinas++;
            }
          }
        });

        corrSnap.forEach(doc => {
          const d = doc.data();
          const statusLower = (d.status || '').toLowerCase();
          if (selectedBranch && d.branchId !== selectedBranch) return;
          if (statusLower === 'pending') pending++;
        });

        // 4. Security Events — field 'createdAt' (Firestore Timestamp dari Flutter)
        const secSnap = await getDocs(collection(db, 'security_events'));
        let secEvents = 0;
        secSnap.forEach(doc => {
          const d = doc.data();
          if (selectedBranch && d.branchId !== selectedBranch) return;
          const tsRaw = d.createdAt || d.timestamp;
          if (tsRaw) {
            const tsDate = tsRaw.toDate ? tsRaw.toDate() : new Date(tsRaw);
            if (tsDate.toISOString().split('T')[0] === todayStr) secEvents++;
          }
        });

        // Belum absen = aktif - (sudah hadir) - (sedang cuti/izin/sakit/dinas)
        const coveredIds = new Set([...presentEmployeeIds, ...onLeaveEmployeeIds]);
        let notCheckedIn = 0;
        activeEmployeeIds.forEach(id => {
          if (!coveredIds.has(id)) notCheckedIn++;
        });

        setData({
          totalEmployees: (totalActive + inactive).toString(),
          totalPresent: present.toString(),
          late: late.toString(),
          notCheckedIn: notCheckedIn.toString(),
          izin: izin.toString(),
          sakit: sakit.toString(),
          cuti: cuti.toString(),
          dinas: dinas.toString(),
          inactive: inactive.toString(),
          securityEvents: secEvents.toString(),
          pending: pending.toString(),
        });

      } catch (e) {
        console.error('Dashboard fetch error:', e);
      }
    };
    fetchData();
  }, [selectedBranch]);

  const stats = [
    { title: 'Total Pegawai',    value: data.totalEmployees,  subtitle: 'Terdaftar',                 icon: Users,         color: 'text-blue-600',   bg: 'bg-blue-50' },
    { title: 'Hadir Hari Ini',   value: data.totalPresent,  subtitle: 'Sudah absen masuk',            icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50' },
    { title: 'Terlambat',        value: data.late,   subtitle: 'Melebihi toleransi shift',       icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { title: 'Belum Absen',      value: data.notCheckedIn,   subtitle: 'Perlu dipantau',                 icon: AlertCircle,   color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Izin',             value: data.izin,   subtitle: 'Disetujui hari ini',             icon: FileCheck2,    color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Sakit',            value: data.sakit,   subtitle: 'Dengan surat dokter',            icon: Stethoscope,   color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Cuti',             value: data.cuti,   subtitle: 'Periode berjalan',               icon: Calendar,      color: 'text-sky-600',    bg: 'bg-sky-50' },
    { title: 'Dinas',            value: data.dinas,   subtitle: 'Tugas luar klinik',              icon: MapPin,        color: 'text-teal-600',   bg: 'bg-teal-50' },
    { title: 'Pegawai Nonaktif', value: data.inactive,   subtitle: 'Tidak perlu diabsenkan',         icon: UserX,         color: 'text-gray-500',   bg: 'bg-gray-100' },
    { title: 'Security Events',  value: data.securityEvents,   subtitle: 'Fake GPS terdeteksi',            icon: ShieldAlert,   color: 'text-red-600',    bg: 'bg-red-50',   warning: true },
    { title: 'Koreksi Pending',  value: data.pending,   subtitle: 'Menunggu persetujuan admin',     icon: ClipboardList, color: 'text-amber-600',  bg: 'bg-amber-50', warning: true },
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ringkasan Hari Ini</h1>
          <p className="text-sm text-gray-500 mt-1">
            {todayLabel} — {selectedBranch ? (branches.find(b => b.id === selectedBranch)?.name ?? 'Cabang Terpilih') : 'Semua Cabang'}
          </p>
        </div>
        <select
          value={selectedBranch}
          onChange={e => setSelectedBranch(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Semua Cabang</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className={`bg-white overflow-hidden shadow-sm rounded-xl border ${stat.warning ? 'border-red-200' : 'border-gray-200'} hover:shadow-md transition-shadow`}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <span className={`text-3xl font-bold ${stat.warning ? 'text-red-600' : 'text-gray-900'}`}>{stat.value}</span>
                </div>
                <p className="text-sm font-medium text-gray-700">{stat.title}</p>
                <p className={`text-xs mt-0.5 ${stat.warning ? 'text-red-400' : 'text-gray-400'}`}>{stat.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
