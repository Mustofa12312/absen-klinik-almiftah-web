import { useState } from 'react';
import { Download, BarChart2, Filter } from 'lucide-react';

interface ReportRow {
  name: string;
  branchId: string;
  shift: string;
  workDays: number;
  present: number;
  late: number;
  absent: number;
  permission: number;
  sick: number;
  leave: number;
  businessTrip: number;
  earlyCheckout: number;
}

const DUMMY_REPORT: ReportRow[] = [
  { name: 'Ahmad Fauzan', branchId: 'HQ-01', shift: 'Pagi', workDays: 22, present: 18, late: 2, absent: 1, permission: 0, sick: 1, leave: 0, businessTrip: 0, earlyCheckout: 1 },
  { name: 'Siti Aminah',  branchId: 'BR-02', shift: 'Pagi', workDays: 22, present: 17, late: 3, absent: 0, permission: 1, sick: 0, leave: 1, businessTrip: 0, earlyCheckout: 0 },
  { name: 'Budi Santoso', branchId: 'HQ-01', shift: 'Siang', workDays: 22, present: 20, late: 1, absent: 0, permission: 0, sick: 1, leave: 0, businessTrip: 0, earlyCheckout: 0 },
];

export default function ReportPage() {
  const [period, setPeriod] = useState('2026-10');
  const [branchFilter, setBranchFilter] = useState('');

  const filtered = branchFilter
    ? DUMMY_REPORT.filter(r => r.branchId === branchFilter)
    : DUMMY_REPORT;

  const exportCSV = () => {
    const headers = ['Nama', 'Cabang', 'Shift', 'Hari Kerja', 'Hadir', 'Terlambat', 'Tidak Hadir', 'Izin', 'Sakit', 'Cuti', 'Dinas', 'Pulang Cepat'];
    const rows = filtered.map(r => [r.name, r.branchId, r.shift, r.workDays, r.present, r.late, r.absent, r.permission, r.sick, r.leave, r.businessTrip, r.earlyCheckout]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rekap_absensi_${period}.csv`;
    link.click();
  };

  // Aggregate stats
  const totalPresent = filtered.reduce((a, r) => a + r.present, 0);
  const totalLate = filtered.reduce((a, r) => a + r.late, 0);
  const totalAbsent = filtered.reduce((a, r) => a + r.absent, 0);
  const totalLeave = filtered.reduce((a, r) => a + r.permission + r.sick + r.leave + r.businessTrip, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Rekap & Laporan</h1>
          <p className="mt-1 text-sm text-gray-500">Ringkasan kehadiran bulanan per pegawai. Ekspor ke CSV/Excel (PRD-40, PRD-60).</p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filter:</span>
        </div>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Semua Cabang</option>
          <option value="HQ-01">HQ-01 Pusat</option>
          <option value="BR-02">BR-02 Selatan</option>
        </select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Hadir', value: totalPresent, color: 'text-green-600 bg-green-50 border-green-200' },
          { label: 'Terlambat', value: totalLate, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
          { label: 'Tidak Hadir', value: totalAbsent, color: 'text-red-600 bg-red-50 border-red-200' },
          { label: 'Izin/Sakit/Cuti', value: totalLeave, color: 'text-blue-600 bg-blue-50 border-blue-200' },
        ].map(stat => (
          <div key={stat.label} className={`border rounded-xl p-4 ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs font-medium mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Detail table */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          <span className="font-semibold text-gray-800">
            Rekap Bulanan — {new Date(period + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Pegawai', 'Cabang', 'Shift', 'Hari Kerja', 'Hadir', 'Terlambat', 'Tdk Hadir', 'Izin', 'Sakit', 'Cuti', 'Dinas', 'Plg Cepat'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((row) => (
                <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{row.name}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.branchId}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.shift}</td>
                  <td className="px-4 py-3 text-center font-medium">{row.workDays}</td>
                  <td className="px-4 py-3 text-center text-green-700 font-semibold">{row.present}</td>
                  <td className="px-4 py-3 text-center text-yellow-600">{row.late}</td>
                  <td className="px-4 py-3 text-center text-red-600">{row.absent}</td>
                  <td className="px-4 py-3 text-center text-blue-600">{row.permission}</td>
                  <td className="px-4 py-3 text-center text-purple-600">{row.sick}</td>
                  <td className="px-4 py-3 text-center text-indigo-600">{row.leave}</td>
                  <td className="px-4 py-3 text-center text-orange-600">{row.businessTrip}</td>
                  <td className="px-4 py-3 text-center text-amber-600">{row.earlyCheckout}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
