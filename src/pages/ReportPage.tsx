import { useState, useEffect } from 'react';
import { Download, BarChart2, Filter, FileText, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

export default function ReportPage() {
  const [report, setReport] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
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
        // Last day of the month
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        // Calculate actual work days (Mon-Fri) for the month
        let workDays = 0;
        const d = new Date(parseInt(year), parseInt(month) - 1, 1);
        while (d.getMonth() === parseInt(month) - 1) {
          const day = d.getDay();
          if (day !== 0 && day !== 6) workDays++;
          d.setDate(d.getDate() + 1);
        }

        const empSnap = await getDocs(collection(db, 'employees'));
        const employees: any[] = [];
        empSnap.forEach(doc => {
          employees.push({ id: doc.id, ...doc.data() });
        });

        // Query attendance menggunakan workDate (field string) bukan checkInTime (Timestamp)
        const attQuery = query(
          collection(db, 'attendance'),
          where('workDate', '>=', startDate),
          where('workDate', '<=', endDate)
        );
        const attSnap = await getDocs(attQuery);
        
        const atts: any[] = [];
        attSnap.forEach(doc => atts.push(doc.data()));

        // Query leave_requests dan correction_requests, bukan 'requests'
        const leaveQuery = query(
          collection(db, 'leave_requests'),
          where('startDate', '>=', startDate),
          where('startDate', '<=', endDate)
        );
        const leaveSnap = await getDocs(leaveQuery);
        const leaveRequests: any[] = [];
        leaveSnap.forEach(doc => leaveRequests.push({ id: doc.id, ...doc.data() }));

        const data: ReportRow[] = employees.map(emp => {
          const empAtts = atts.filter(a => a.employeeId === emp.id);
          // Status UPPERCASE sesuai dengan yang disimpan di Firestore
          const empLeaves = leaveRequests.filter(r => r.employeeId === emp.id && r.status === 'APPROVED');

          const present = empAtts.filter(a => a.status === 'present').length;
          const late = empAtts.filter(a => a.status === 'late').length;
          const earlyCheckout = empAtts.filter(a => a.status === 'early_checkout').length;
          // Tipe Title Case sesuai yang disimpan di Flutter app
          const permission = empLeaves.filter(r => r.type === 'Izin').length;
          const sick = empLeaves.filter(r => r.type === 'Sakit').length;
          const leave = empLeaves.filter(r => r.type === 'Cuti').length;
          const businessTrip = empLeaves.filter(r => r.type === 'Dinas').length;

          return {
            name: emp.name,
            branchId: emp.branchId || '-',
            shift: emp.shiftId || 'Default',
            workDays,
            present,
            late,
            permission,
            sick,
            leave,
            businessTrip,
            earlyCheckout,
            absent: Math.max(0, workDays - (present + late + permission + sick + leave + businessTrip))
          };
        });

        setReport(data);
      } catch (e) {
        console.error('Failed to fetch report', e);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [period]);

  const filtered = branchFilter
    ? report.filter(r => r.branchId === branchFilter)
    : report;

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

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Header text
    doc.setFontSize(16);
    doc.text(`Laporan Rekap Absensi Klinik Al-Miftah`, 14, 15);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Periode: ${period} | Cabang: ${branchFilter || 'Semua Cabang'}`, 14, 22);

    const headers = [['Pegawai', 'Cabang', 'Shift', 'HK', 'Hadir', 'Tlt', 'Alfa', 'Izin', 'Skt', 'Cuti', 'Dinas', 'Plg Cepat']];
    const rows = filtered.map(r => [
      r.name, r.branchId, r.shift, 
      r.workDays, r.present, r.late, r.absent, 
      r.permission, r.sick, r.leave, r.businessTrip, r.earlyCheckout
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 28,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [63, 81, 181] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`rekap_absensi_${period}.pdf`);
  };

  const exportExcel = () => {
    const headers = ['Nama', 'Cabang', 'Shift', 'Hari Kerja', 'Hadir', 'Terlambat', 'Tidak Hadir', 'Izin', 'Sakit', 'Cuti', 'Dinas', 'Pulang Cepat'];
    const rows = filtered.map(r => [r.name, r.branchId, r.shift, r.workDays, r.present, r.late, r.absent, r.permission, r.sick, r.leave, r.businessTrip, r.earlyCheckout]);
    
    // Gabungkan header dan baris
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap ${period}`);
    XLSX.writeFile(workbook, `rekap_absensi_${period}.xlsx`);
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
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
              {loading ? (
                <tr><td colSpan={12} className="px-6 py-12 text-center text-sm text-gray-400">Memuat laporan...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="px-6 py-12 text-center text-sm text-gray-400">Tidak ada data untuk periode ini.</td></tr>
              ) : filtered.map((row) => (
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
