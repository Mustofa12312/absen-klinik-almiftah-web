import { useState } from 'react';
import { Smartphone, Search, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';

interface Device {
  id: string;
  employeeId: string;
  employeeName: string;
  deviceId: string;
  manufacturer: string;
  model: string;
  androidVersion: string;
  appVersion: string;
  isActive: boolean;
  registeredAt: string;
  lastSeenAt: string;
}

const DUMMY_DEVICES: Device[] = [
  { id: '1', employeeId: 'EMP001', employeeName: 'Ahmad Fauzan',   deviceId: 'abc123def456', manufacturer: 'Samsung',  model: 'SM-A155F', androidVersion: '14', appVersion: '1.0.0', isActive: true, registeredAt: '2026-09-01T08:00:00Z', lastSeenAt: '2026-10-05T08:15:00Z' },
  { id: '2', employeeId: 'EMP002', employeeName: 'Siti Aminah',    deviceId: 'iph13pro7890', manufacturer: 'Apple',    model: 'iPhone 13', androidVersion: 'iOS 17', appVersion: '1.0.0', isActive: true, registeredAt: '2026-09-02T09:00:00Z', lastSeenAt: '2026-10-05T07:50:00Z' },
  { id: '3', employeeId: 'EMP004', employeeName: 'Diana Fitri',    deviceId: 'opporeno8xyz', manufacturer: 'Oppo',     model: 'Reno 8', androidVersion: '13', appVersion: '1.0.0', isActive: false, registeredAt: '2026-09-10T10:00:00Z', lastSeenAt: '2026-10-02T14:00:00Z' },
];

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>(DUMMY_DEVICES);
  const [search, setSearch] = useState('');

  const handleReset = (deviceId: string, empName: string) => {
    if (window.confirm(`Reset device binding untuk ${empName}? Pegawai perlu mendaftar ulang perangkat.`)) {
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isActive: false } : d));
    }
  };

  const filtered = devices.filter(d =>
    d.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    d.model.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Device Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola perangkat terdaftar pegawai. Reset jika pegawai ganti HP (PRD-37, BR-08).
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama pegawai atau model HP..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pegawai</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perangkat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Versi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terakhir Aktif</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((dev) => (
                <tr key={dev.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{dev.employeeName}</div>
                    <div className="text-xs text-gray-400">{dev.employeeId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Smartphone className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{dev.manufacturer} {dev.model}</div>
                        <div className="text-xs text-gray-400 font-mono">{dev.deviceId.slice(0, 12)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>Android {dev.androidVersion}</div>
                    <div className="text-xs text-gray-400">App v{dev.appVersion}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(dev.lastSeenAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {dev.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <ShieldCheck className="h-3.5 w-3.5" /> Terdaftar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        <ShieldAlert className="h-3.5 w-3.5" /> Direset
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {dev.isActive && (
                      <button
                        onClick={() => handleReset(dev.id, dev.employeeName)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors"
                        title="Reset Device Binding"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reset Device
                      </button>
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
