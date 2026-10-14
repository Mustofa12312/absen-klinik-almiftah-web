import { useState, useEffect } from 'react';
import { Download, BarChart2, Filter, FileText, FileSpreadsheet, Search } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ReportRow {
  name: string;
  branchId: string;
  branchName: string;
  shift: string;
  totalPresent: number;
  onTime: number;
  late: number;
  lateMinutes: number;
  earlyCheckout: number;
  permission: number;
  sick: number;
  leave: number;
  businessTrip: number;
}

export default function ReportPage() {
  const [report, setReport] = useState<ReportRow[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [branchFilter, setBranchFilter] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const [year, month] = period.split('-');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        // 1. Ambil data cabang untuk pemetaan nama cabang asli
        const branchSnap = await getDocs(collection(db, 'branches'));
        const branchList: { id: string; name: string }[] = [];
        const branchMap: Record<string, string> = {};
        branchSnap.forEach(doc => {
          const d = doc.data();
          const name = d.name || d.code || doc.id;
          branchList.push({ id: doc.id, name });
          branchMap[doc.id] = name;
        });
        setBranches(branchList);

        // 2. Ambil data shift untuk pemetaan nama shift asli
        const shiftSnap = await getDocs(collection(db, 'shifts'));
        const shiftMap: Record<string, string> = {};
        shiftSnap.forEach(doc => {
          const d = doc.data();
          shiftMap[doc.id] = d.name || `Shift ${doc.id}`;
        });

        // 3. Ambil data semua pegawai
        const empSnap = await getDocs(collection(db, 'employees'));
        const employees: any[] = [];
        empSnap.forEach(doc => {
          employees.push({ id: doc.id, ...doc.data() });
        });

        // 4. Query data absensi dalam rentang bulan yang dipilih
        const attQuery = query(
          collection(db, 'attendance'),
          where('workDate', '>=', startDate),
          where('workDate', '<=', endDate)
        );
        const attSnap = await getDocs(attQuery);
        const atts: any[] = [];
        attSnap.forEach(doc => atts.push(doc.data()));

        // 5. Query permohonan izin/sakit/cuti/dinas
        const leaveSnap = await getDocs(collection(db, 'leave_requests'));
        const leaveRequests: any[] = [];
        leaveSnap.forEach(doc => {
          const d = doc.data();
          const reqDate = d.startDate || d.date || '';
          if (reqDate >= startDate && reqDate <= endDate) {
            leaveRequests.push({ id: doc.id, ...d });
          }
        });

        const normalizeType = (t: string = '') => {
          const low = t.toLowerCase().trim();
          if (low === 'permission' || low === 'izin') return 'izin';
          if (low === 'sick' || low === 'sakit') return 'sakit';
          if (low === 'leave' || low === 'cuti') return 'cuti';
          if (low === 'business_trip' || low === 'dinas' || low === 'dinas_luar') return 'dinas';
          return low;
        };

        const isApproved = (status: string = '') => status.toUpperCase() === 'APPROVED';

        const validEmployees = employees.filter(emp => !emp.migrated);

        const data: ReportRow[] = validEmployees.map(emp => {
          const empAtts = atts.filter(a => a.employeeId === emp.id);
          const empLeaves = leaveRequests.filter(r => r.employeeId === emp.id && isApproved(r.status));

          let onTime = 0;
          let late = 0;
          let lateMinutes = 0;
          let earlyCheckout = 0;

          empAtts.forEach(a => {
            const rawStatus = (a.status || '').toString().toLowerCase();
            const isLate = rawStatus === 'late' || rawStatus === 'terlambat' || (a.lateMinutes && a.lateMinutes > 0);
            const isEarly = rawStatus === 'early_checkout' || rawStatus === 'pulang_cepat' || (a.earlyCheckoutMinutes && a.earlyCheckoutMinutes > 0);

            if (isLate) {
              late++;
              lateMinutes += (Number(a.lateMinutes) || 0);
            } else {
              onTime++;
            }

            if (isEarly) {
              earlyCheckout++;
            }
          });

          const totalPresent = onTime + late;

          let permission = 0;
          let sick = 0;
          let leave = 0;
          let businessTrip = 0;

          empLeaves.forEach(r => {
            const t = normalizeType(r.type);
            if (t === 'izin') permission++;
            else if (t === 'sakit') sick++;
            else if (t === 'cuti') leave++;
            else if (t === 'dinas') businessTrip++;
          });

          const branchName = branchMap[emp.branchId] || emp.branchId || '-';
          const shiftName = shiftMap[emp.currentShiftId || emp.shiftId] || emp.shiftName || emp.shiftId || 'Default';

          return {
            name: emp.name || 'Tanpa Nama',
            branchId: emp.branchId || '-',
            branchName,
            shift: shiftName,
            totalPresent,
            onTime,
            late,
            lateMinutes,
            earlyCheckout,
            permission,
            sick,
            leave,
            businessTrip,
          };
        });

        // Urutkan pegawai berdasarkan nama secara alfabetis
        data.sort((a, b) => a.name.localeCompare(b.name, 'id-ID'));
        setReport(data);
      } catch (e) {
        console.error('Failed to fetch report', e);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [period]);

  const filtered = report.filter(r => {
    const matchesBranch = !branchFilter || r.branchId === branchFilter;
    const matchesSearch = !search || r.name.toLowerCase().includes(search.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const exportCSV = () => {
    const headers = ['Nama Pegawai', 'Cabang', 'Shift', 'Total Masuk', 'Tepat Waktu', 'Terlambat', 'Total Terlambat (Menit)', 'Pulang Cepat', 'Izin', 'Sakit', 'Cuti', 'Dinas'];
    const rows = filtered.map(r => [
      r.name,
      r.branchName,
      r.shift,
      r.totalPresent,
      r.onTime,
      r.late,
      r.lateMinutes,
      r.earlyCheckout,
      r.permission,
      r.sick,
      r.leave,
      r.businessTrip,
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rekap_kehadiran_${period}.csv`;
    link.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');

    // Header text
    doc.setFontSize(16);
    doc.text(`Laporan Rekap Kehadiran Klinik Al-Miftah`, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    const currentBranchLabel = branches.find(b => b.id === branchFilter)?.name || 'Semua Cabang';
    doc.text(`Periode: ${period} | Cabang: ${currentBranchLabel}`, 14, 22);

    const headers = [['Pegawai', 'Cabang', 'Shift', 'Total Masuk', 'Tepat Waktu', 'Terlambat', 'Menit Tlt', 'Plg Cepat', 'Izin', 'Sakit', 'Cuti', 'Dinas']];
    const rows = filtered.map(r => [
      r.name,
      r.branchName,
      r.shift,
      `${r.totalPresent}x`,
      `${r.onTime}x`,
      `${r.late}x`,
      r.lateMinutes > 0 ? `${r.lateMinutes}m` : '-',
      `${r.earlyCheckout}x`,
      `${r.permission}x`,
      `${r.sick}x`,
      `${r.leave}x`,
      `${r.businessTrip}x`,
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [224, 106, 0] }, // Warna brand oranye Klinik Al-Miftah
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    doc.save(`rekap_kehadiran_${period}.pdf`);
  };

  const exportExcel = () => {
    const headers = ['Nama Pegawai', 'Cabang', 'Shift', 'Total Masuk', 'Tepat Waktu', 'Terlambat', 'Total Terlambat (Menit)', 'Pulang Cepat', 'Izin', 'Sakit', 'Cuti', 'Dinas'];
    const rows = filtered.map(r => [
      r.name,
      r.branchName,
      r.shift,
      r.totalPresent,
      r.onTime,
      r.late,
      r.lateMinutes,
      r.earlyCheckout,
      r.permission,
      r.sick,
      r.leave,
      r.businessTrip,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap ${period}`);
    XLSX.writeFile(workbook, `rekap_kehadiran_${period}.xlsx`);
  };

  // Aggregate stats
  const totalPresentAll = filtered.reduce((a, r) => a + r.totalPresent, 0);
  const totalOnTimeAll = filtered.reduce((a, r) => a + r.onTime, 0);
  const totalLateAll = filtered.reduce((a, r) => a + r.late, 0);
  const totalLateMinutesAll = filtered.reduce((a, r) => a + r.lateMinutes, 0);
  const totalLeaveAll = filtered.reduce((a, r) => a + r.permission + r.sick + r.leave + r.businessTrip, 0);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rekap & Laporan Kehadiran</h1>
          <p className="mt-1 text-sm text-gray-500">
            Akumulasi kehadiran riil per pegawai berdasarkan jadwal kerja shift klinik (tanpa batasan hari kerja kalender).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg shadow-sm text-white bg-orange-600 hover:bg-orange-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
            <Filter className="h-4 w-4 text-gray-400" />
            <span>Periode:</span>
          </div>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="">Semua Cabang</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Pencarian nama pegawai */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama pegawai..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-green-200 bg-green-50/70 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-green-700">{totalPresentAll}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-200 text-green-800">Kali</span>
          </div>
          <p className="text-xs font-medium text-green-900 mt-1">Total Kehadiran (Masuk)</p>
        </div>

        <div className="border border-emerald-200 bg-emerald-50/70 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-emerald-700">{totalOnTimeAll}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">Kali</span>
          </div>
          <p className="text-xs font-medium text-emerald-900 mt-1">Tepat Waktu</p>
        </div>

        <div className="border border-yellow-200 bg-yellow-50/70 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-yellow-700">{totalLateAll}</p>
            {totalLateMinutesAll > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800">
                {totalLateMinutesAll} mnt
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-yellow-900 mt-1">Terlambat Masuk</p>
        </div>

        <div className="border border-blue-200 bg-blue-50/70 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-blue-700">{totalLeaveAll}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-200 text-blue-800">Permohonan</span>
          </div>
          <p className="text-xs font-medium text-blue-900 mt-1">Izin / Sakit / Cuti / Dinas</p>
        </div>
      </div>

      {/* Detail table */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-orange-600" />
            <span className="font-semibold text-gray-800">
              Rekap Kehadiran — {new Date(period + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </span>
            <span className="text-xs text-gray-500 font-normal bg-gray-100 px-2.5 py-0.5 rounded-full">
              {filtered.length} Pegawai
            </span>
          </div>
          <p className="text-xs text-gray-400">
            * Menampilkan total akumulasi frekuensi riil perorangan
          </p>
        </div>

        <div className="overflow-auto max-h-[600px] border-t border-gray-100">
          <table className="min-w-full divide-y divide-gray-200 text-sm border-separate border-spacing-0">
            <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-gray-50 z-30 shadow-[1px_0_0_0_#e5e7eb]">Pegawai</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap bg-gray-50">Cabang</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap bg-gray-50">Shift</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold text-green-800 uppercase tracking-wider whitespace-nowrap bg-green-50/80">Total Masuk</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-emerald-700 uppercase tracking-wider whitespace-nowrap bg-gray-50">Tepat Waktu</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-yellow-700 uppercase tracking-wider whitespace-nowrap bg-gray-50">Terlambat</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap bg-gray-50">Menit Tlt</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-amber-700 uppercase tracking-wider whitespace-nowrap bg-gray-50">Plg Cepat</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-blue-700 uppercase tracking-wider whitespace-nowrap bg-gray-50">Izin</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-purple-700 uppercase tracking-wider whitespace-nowrap bg-gray-50">Sakit</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-indigo-700 uppercase tracking-wider whitespace-nowrap bg-gray-50">Cuti</th>
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-orange-700 uppercase tracking-wider whitespace-nowrap bg-gray-50">Dinas</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-sm text-gray-400">
                    Memuat data rekap kehadiran...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-sm text-gray-400">
                    Tidak ada data pegawai yang sesuai dengan filter.
                  </td>
                </tr>
              ) : filtered.map((row) => (
                <tr key={row.name} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[1px_0_0_0_#e5e7eb]">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {row.branchName}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {row.shift}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center bg-green-50/30 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center font-bold text-xs px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                      {row.totalPresent}x
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-emerald-600 font-medium whitespace-nowrap">
                    {row.onTime}x
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {row.late > 0 ? (
                      <span className="inline-flex items-center justify-center font-bold text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                        {row.late}x
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                    {row.lateMinutes > 0 ? (
                      <span className="font-semibold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded">
                        {row.lateMinutes} m
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                    {row.earlyCheckout > 0 ? (
                      <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {row.earlyCheckout}x
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {row.permission > 0 ? (
                      <span className="inline-flex items-center justify-center font-bold text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {row.permission}x
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {row.sick > 0 ? (
                      <span className="inline-flex items-center justify-center font-bold text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        {row.sick}x
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {row.leave > 0 ? (
                      <span className="inline-flex items-center justify-center font-bold text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        {row.leave}x
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {row.businessTrip > 0 ? (
                      <span className="inline-flex items-center justify-center font-bold text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                        {row.businessTrip}x
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
