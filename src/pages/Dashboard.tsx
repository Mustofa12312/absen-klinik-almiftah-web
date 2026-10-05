import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  Clock, 
  Calendar, 
  ShieldAlert,
  LogOut,
  Building2,
  FileCheck2,
  Menu
} from 'lucide-react';

import Branches from './Branches';
import Employees from './Employees';
import Shifts from './Shifts';
import Requests from './Requests';

export default function Dashboard() {
  const location = useLocation();

  const navItems = [
    { name: 'Ringkasan', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Manajemen Cabang', icon: Building2, path: '/dashboard/branches' },
    { name: 'Pegawai', icon: Users, path: '/dashboard/employees' },
    { name: 'Jadwal Shift', icon: Clock, path: '/dashboard/shifts' },
    { name: 'Pengajuan', icon: FileCheck2, path: '/dashboard/requests' },
    { name: 'Hari Libur', icon: Calendar, path: '/dashboard/holidays' },
    { name: 'Keamanan (Fraud)', icon: ShieldAlert, path: '/dashboard/security' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AM</span>
            </div>
            <span className="font-semibold text-gray-900">Al-Miftah Admin</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
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
          <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors">
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
            <button className="text-gray-500 hover:text-gray-700 p-2 -ml-2">
              <Menu className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Super Admin</span>
              <img
                className="h-8 w-8 rounded-full bg-gray-200"
                src="https://ui-avatars.com/api/?name=Super+Admin&background=0D8ABC&color=fff"
                alt=""
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/shifts" element={<Shifts />} />
            <Route path="/requests" element={<Requests />} />
            {/* Other routes will go here */}
          </Routes>
        </div>
      </main>
    </div>
  );
}

// Temporary Overview Component
function Overview() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Ringkasan Hari Ini</h1>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Pegawai" value="124" subtitle="3 Cabang" />
        <StatCard title="Hadir Tepat Waktu" value="98" subtitle="Hari ini" />
        <StatCard title="Pengajuan Izin/Cuti" value="5" subtitle="Menunggu persetujuan" />
        <StatCard title="Security Events" value="2" subtitle="Fake GPS terdeteksi" warning />
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, warning = false }: { title: string, value: string, subtitle: string, warning?: boolean }) {
  return (
    <div className={`bg-white overflow-hidden shadow-sm rounded-xl border ${warning ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
            <p className={`mt-1 text-3xl font-semibold ${warning ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
          </div>
        </div>
        <div className="mt-4">
          <span className={`text-sm ${warning ? 'text-red-500' : 'text-gray-500'}`}>{subtitle}</span>
        </div>
      </div>
    </div>
  );
}
