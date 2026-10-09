import { useState, useEffect } from 'react';
import { Filter, Download, Search } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

export default function AttendanceMonitoring() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  const [filterDate, setFilterDate] = useState(defaultDate);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all employees to map IDs to Names
        const empSnap = await getDocs(collection(db, 'employees'));
        const empMap: Record<string, any> = {};
        empSnap.forEach(doc => {
          empMap[doc.id] = doc.data();
        });

        // Fetch attendance for selected date
        const attQuery = query(collection(db, 'attendance'), where('workDate', '==', filterDate));
        const attSnap = await getDocs(attQuery);
        
        const data: AttendanceRecord[] = [];
        attSnap.forEach(doc => {
          const d = doc.data();
          const emp = empMap[d.employeeId] || {};
          
          let checkInStr = undefined;
          if (d.checkIn && d.checkIn.timestamp) {
            const date = d.checkIn.timestamp.toDate ? d.checkIn.timestamp.toDate() : new Date(d.checkIn.timestamp);
            checkInStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          }
          
          let checkOutStr = undefined;
          if (d.checkOut && d.checkOut.timestamp) {
            const date = d.checkOut.timestamp.toDate ? d.checkOut.timestamp.toDate() : new Date(d.checkOut.timestamp);
            checkOutStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          }

          let status = d.status || 'present';
          // Hanya override ke 'late' jika record ini adalah attendance biasa (bukan leave)
          if (status === 'present' && (d.lateMinutes > 0)) status = 'late';
          
          data.push({
            id: doc.id,
            employeeName: emp.name || d.employeeName || 'Unknown Employee',
            employeeId: emp.employeeId || d.employeeId || '-',
            branchId: d.branchId || '-',
            shiftName: d.shiftId || 'Shift Default',
            workDate: d.workDate,
            checkInTime: checkInStr,
            checkOutTime: checkOutStr,
            status: status,
            lateMinutes: d.lateMinutes || 0,
            earlyCheckoutMinutes: d.earlyCheckoutMinutes || 0,
          });
        });

        // Also fetch leave requests approved for this date that are NOT in attendance
        const leaveSnap = await getDocs(collection(db, 'leave_requests'));
        leaveSnap.forEach(doc => {
          const d = doc.data();
          if (d.status === 'APPROVED' && (d.date === filterDate || d.startDate === filterDate)) {
             // check if not already in attendance
             if (!data.find(a => a.employeeId === d.employeeId)) {
                const emp = empMap[d.employeeId] || {};
                let status = 'permission';
                if (d.type === 'Sakit') status = 'sick';
                else if (d.type === 'Cuti') status = 'leave';
                else if (d.type === 'Dinas') status = 'business_trip';
                
                data.push({
                  id: doc.id,
                  employeeName: d.employeeName || emp.name || 'Unknown Employee',
                  employeeId: d.employeeId || emp.employeeId || '-',
                  branchId: emp.branchId || '-',
                  shiftName: '-',
                  workDate: filterDate,
                  status: status as any,
                });
             }
          }
        });

        setRecords(data);
      } catch (e) {
        console.error("Error fetching monitoring data:", e);
      } finally {
        setLoading(false);
      }
    };
    
    if (filterDate) fetchData();
  }, [filterDate]);

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
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Memuat data absensi...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Tidak ada data absensi untuk tanggal ini.</td></tr>
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
