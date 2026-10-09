import { useState, useEffect } from 'react';
import { ShieldAlert, Search, AlertTriangle, MapPin, Cpu, Fingerprint, RefreshCw, Download } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface SecurityEvent {
  id: string;
  employeeId: string;
  employeeName: string;
  branchId: string;
  type: 'mock_location' | 'emulator_detected' | 'invalid_device' | 'poor_gps_accuracy' | 'outside_geofence' | 'duplicate_attendance' | 'unauthorized_access';
  deviceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const TYPE_CONFIG: Record<SecurityEvent['type'], { label: string; color: string; icon: React.ElementType }> = {
  mock_location:        { label: 'Fake GPS',          color: 'text-red-700 bg-red-50 border-red-200',      icon: MapPin },
  emulator_detected:    { label: 'Emulator',          color: 'text-orange-700 bg-orange-50 border-orange-200', icon: Cpu },
  invalid_device:       { label: 'Device Tidak Sah',  color: 'text-red-700 bg-red-50 border-red-200',      icon: Fingerprint },
  poor_gps_accuracy:    { label: 'GPS Tidak Akurat',  color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: AlertTriangle },
  outside_geofence:     { label: 'Di Luar Area',      color: 'text-orange-700 bg-orange-50 border-orange-200', icon: MapPin },
  duplicate_attendance: { label: 'Duplikat Absensi',  color: 'text-purple-700 bg-purple-50 border-purple-200', icon: RefreshCw },
  unauthorized_access:  { label: 'Akses Tidak Sah',   color: 'text-red-700 bg-red-50 border-red-200',      icon: ShieldAlert },
};

export default function SecurityEvents() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const empSnap = await getDocs(collection(db, 'employees'));
        const empMap: Record<string, any> = {};
        empSnap.forEach(doc => {
          empMap[doc.id] = doc.data();
        });

        const snap = await getDocs(query(collection(db, 'security_events'), orderBy('timestamp', 'desc')));
        const data: SecurityEvent[] = [];
        snap.forEach(doc => {
          const d = doc.data();
          let empId = d.employeeId;
          let branchId = d.branchId || '-';
          let empName = d.employeeName;
          
          if (d.deviceId) {
            // we could try to look up device to find employee, but let's assume it's logged with employeeId
          }
          
          const emp = empMap[empId] || {};
          
          const tsRaw = d.createdAt || d.timestamp;
          let createdAt = new Date().toISOString();
          if (tsRaw) {
            createdAt = (tsRaw.toDate ? tsRaw.toDate() : new Date(tsRaw)).toISOString();
          }

          data.push({
            id: doc.id,
            employeeId: empId || '-',
            employeeName: empName || emp.name || 'Unknown',
            branchId: branchId,
            type: d.type || 'unauthorized_access',
            deviceId: d.deviceId,
            metadata: d.metadata || {},
            createdAt,
          });
        });
        setEvents(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const filtered = events.filter(e => {
    const matchSearch = e.employeeName.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType ? e.type === filterType : true;
    return matchSearch && matchType;
  });

  const exportCSV = () => {
    const headers = ['ID', 'Waktu', 'Pegawai', 'ID Pegawai', 'Cabang', 'Jenis Pelanggaran', 'Metadata'];
    const rows = filtered.map(ev => [
      ev.id,
      new Date(ev.createdAt).toLocaleString('id-ID'),
      ev.employeeName,
      ev.employeeId,
      ev.branchId,
      TYPE_CONFIG[ev.type].label,
      JSON.stringify(ev.metadata || {}).replace(/"/g, '""')
    ]);
    
    const csvContent = [headers, ...rows].map(row => `"${row.join('","')}"`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `security_events_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Security Events</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pantau percobaan pelanggaran: Fake GPS, Emulator, Device ilegal, dan lainnya (BR-06, BR-07, BR-22).
          </p>
        </div>
        <button 
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(TYPE_CONFIG).slice(0, 4).map(([type, cfg]) => {
          const count = events.filter(e => e.type === type).length;
          const Icon = cfg.icon;
          return (
            <div key={type} className={`border rounded-xl p-4 ${cfg.color}`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-5 w-5" />
                <span className="text-2xl font-bold">{count}</span>
              </div>
              <p className="text-xs font-medium">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama pegawai..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Semua Jenis</option>
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
              <option key={type} value={type}>{cfg.label}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pegawai</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis Pelanggaran</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metadata</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">Memuat log keamanan...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">Tidak ada security event ditemukan.</td></tr>
              ) : filtered.map((ev) => {
                const cfg = TYPE_CONFIG[ev.type];
                const Icon = cfg.icon;
                return (
                  <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ev.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{ev.employeeName}</div>
                      <div className="text-xs text-gray-400">{ev.employeeId} · {ev.branchId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px]">
                      {ev.metadata ? (
                        <pre className="whitespace-pre-wrap font-mono text-xs bg-gray-50 rounded p-1">{JSON.stringify(ev.metadata, null, 2)}</pre>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center">⚠️ Data security events bersifat permanen dan tidak dapat dihapus melalui UI (BR-22).</p>
    </div>
  );
}
