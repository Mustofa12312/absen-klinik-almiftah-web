import { useState } from 'react';
import { ShieldAlert, Search, AlertTriangle, MapPin, Cpu, Fingerprint, RefreshCw } from 'lucide-react';

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

const DUMMY_EVENTS: SecurityEvent[] = [
  { id: '1', employeeId: 'EMP001', employeeName: 'Ahmad Fauzan', branchId: 'HQ-01', type: 'mock_location', deviceId: 'dev_abc123', metadata: { latitude: -6.2090, longitude: 106.8460 }, createdAt: '2026-10-05T08:12:00Z' },
  { id: '2', employeeId: 'EMP003', employeeName: 'Budi Santoso', branchId: 'HQ-01', type: 'outside_geofence', deviceId: 'dev_xyz456', metadata: { distance: 350, radius: 100 }, createdAt: '2026-10-05T07:55:00Z' },
  { id: '3', employeeId: 'EMP002', employeeName: 'Siti Aminah',  branchId: 'BR-02', type: 'duplicate_attendance', createdAt: '2026-10-04T14:30:00Z' },
];

export default function SecurityEvents() {
  const [events] = useState<SecurityEvent[]>(DUMMY_EVENTS);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');

  const filtered = events.filter(e => {
    const matchSearch = e.employeeName.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType ? e.type === filterType : true;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Security Events</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pantau percobaan pelanggaran: Fake GPS, Emulator, Device ilegal, dan lainnya (BR-06, BR-07, BR-22).
        </p>
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
              {filtered.length === 0 ? (
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
