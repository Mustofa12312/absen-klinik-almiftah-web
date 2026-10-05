import { useState } from 'react';
import { Filter, Download, Search } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  branchId: string;
  shiftName: string;
  workDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'present' | 'late' | 'absent' | 'permission' | 'sick' | 'leave' | 'business_trip' | 'early_checkout';
  lateMinutes?: number;
  earlyCheckoutMinutes?: number;
}

const STATUS_CONFIG: Record<AttendanceRecord['status'], { label: string; color: string }> = {
  present:       { label: 'Hadir',         color: 'bg-green-100 text-green-800' },
  late:          { label: 'Terlambat',     color: 'bg-yellow-100 text-yellow-800' },
  absent:        { label: 'Tidak Hadir',   color: 'bg-red-100 text-red-800' },
  permission:    { label: 'Izin',          color: 'bg-blue-100 text-blue-800' },
  sick:          { label: 'Sakit',         color: 'bg-purple-100 text-purple-800' },
  leave:         { label: 'Cuti',          color: 'bg-indigo-100 text-indigo-800' },
  business_trip: { label: 'Dinas',         color: 'bg-orange-100 text-orange-800' },
  early_checkout:{ label: 'Pulang Cepat',  color: 'bg-amber-100 text-amber-800' },
};

const DUMMY_ATTENDANCE: AttendanceRecord[] = [
  { id: '1', employeeName: 'Ahmad Fauzan', employeeId: 'EMP001', branchId: 'HQ-01', shiftName: 'Shift Pagi', workDate: '2026-10-05', checkInTime: '07:56', checkOutTime: '14:03', status: 'present', lateMinutes: 0 },
  { id: '2', employeeName: 'Siti Aminah',  employeeId: 'EMP002', branchId: 'BR-02', shiftName: 'Shift Pagi', workDate: '2026-10-05', checkInTime: '08:22', checkOutTime: '14:00', status: 'late', lateMinutes: 22 },
  { id: '3', employeeName: 'Budi Santoso', employeeId: 'EMP003', branchId: 'HQ-01', shiftName: 'Shift Pagi', workDate: '2026-10-05', status: 'absent' },
  { id: '4', employeeName: 'Diana Fitri',  employeeId: 'EMP004', branchId: 'BR-02', shiftName: 'Shift Siang', workDate: '2026-10-05', checkInTime: '14:05', checkOutTime: '20:30', status: 'early_checkout', earlyCheckoutMinutes: 90 },
];

export default function AttendanceMonitoring() {
  const [records] = useState<AttendanceRecord[]>(DUMMY_ATTENDANCE);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDate, setFilterDate] = useState('2026-10-05');

  const filtered = records.filter(r => {
    const matchSearch = r.employeeName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus ? r.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  const exportCSV = () => {
    const headers = ['Pegawai', 'ID Pegawai', 'Cabang', 'Shift', 'Tanggal', 'Masuk', 'Pulang', 'Status', 'Terlambat (mnt)', 'Pulang Cepat (mnt)'];
    const rows = filtered.map(r => [
      r.employeeName,
      r.employeeId,
      r.branchId,
      r.shiftName,
      r.workDate,
      r.checkInTime || '-',
      r.checkOutTime || '-',
      STATUS_CONFIG[r.status].label,
      r.lateMinutes || 0,
      r.earlyCheckoutMinutes || 0
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monitoring_absensi_${filterDate}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Monitoring Absensi</h1>
          <p className="mt-1 text-sm text-gray-500">Pantau status kehadiran pegawai per hari dan per cabang (PRD-34).</p>
        </div>
        <button 
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama pegawai..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Semua Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Filter className="h-4 w-4" /> Filter Cabang
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pegawai</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cabang & Shift</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Masuk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pulang</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Tidak ada data absensi.</td></tr>
              ) : filtered.map((rec) => {
                const statusCfg = STATUS_CONFIG[rec.status];
                return (
                  <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rec.employeeName}</div>
                      <div className="text-xs text-gray-400">{rec.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{rec.branchId}</div>
                      <div className="text-xs text-gray-400">{rec.shiftName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rec.checkInTime ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rec.checkOutTime ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {rec.lateMinutes ? `Terlambat ${rec.lateMinutes} mnt` : ''}
                      {rec.earlyCheckoutMinutes ? `Pulang Cepat ${rec.earlyCheckoutMinutes} mnt` : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
