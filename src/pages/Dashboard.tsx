import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  LayoutDashboard, Users, MapPin, Clock, Calendar, ShieldAlert,
  LogOut, Building2, FileCheck2, Menu, Smartphone, ClipboardList,
  Activity, AlertCircle, CheckCircle2, UserX, Stethoscope, BarChart2
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
            <UserX className="h-5 w-5" />
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
  const [totalEmployees, setTotalEmployees] = useState('...');
  const [totalPresent, setTotalPresent] = useState('...');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const empSnap = await getDocs(collection(db, 'employees'));
        setTotalEmployees(empSnap.size.toString());
        
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        
        const attQuery = query(collection(db, 'attendance'), where('workDate', '==', todayStr));
        const attSnap = await getDocs(attQuery);
        setTotalPresent(attSnap.size.toString());
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { title: 'Total Pegawai',    value: totalEmployees,  subtitle: 'Terdaftar',                 icon: Users,         color: 'text-blue-600',   bg: 'bg-blue-50' },
    { title: 'Hadir Hari Ini',   value: totalPresent,  subtitle: 'Sudah absen masuk',            icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50' },
    { title: 'Terlambat',        value: '8',   subtitle: 'Melebihi toleransi shift',       icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { title: 'Belum Absen',      value: '7',   subtitle: 'Perlu dipantau',                 icon: AlertCircle,   color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Izin',             value: '2',   subtitle: 'Disetujui hari ini',             icon: FileCheck2,    color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Sakit',            value: '1',   subtitle: 'Dengan surat dokter',            icon: Stethoscope,   color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Cuti',             value: '3',   subtitle: 'Periode berjalan',               icon: Calendar,      color: 'text-sky-600',    bg: 'bg-sky-50' },
    { title: 'Dinas',            value: '1',   subtitle: 'Tugas luar klinik',              icon: MapPin,        color: 'text-teal-600',   bg: 'bg-teal-50' },
    { title: 'Pegawai Nonaktif', value: '2',   subtitle: 'Tidak perlu diabsenkan',         icon: UserX,         color: 'text-gray-500',   bg: 'bg-gray-100' },
    { title: 'Security Events',  value: '2',   subtitle: 'Fake GPS terdeteksi',            icon: ShieldAlert,   color: 'text-red-600',    bg: 'bg-red-50',   warning: true },
    { title: 'Koreksi Pending',  value: '4',   subtitle: 'Menunggu persetujuan admin',     icon: ClipboardList, color: 'text-amber-600',  bg: 'bg-amber-50', warning: true },
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ringkasan Hari Ini</h1>
          <p className="text-sm text-gray-500 mt-1">Senin, 05 Oktober 2026 — Semua Cabang</p>
        </div>
        <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
          <option>Semua Cabang</option>
          <option>HQ-01 Pusat</option>
          <option>BR-02 Selatan</option>
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
