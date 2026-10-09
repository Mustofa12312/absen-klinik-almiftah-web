import { useState, useEffect } from 'react';
import { Smartphone, Search, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true);
      try {
        const empSnap = await getDocs(collection(db, 'employees'));
        const empMap: Record<string, any> = {};
        empSnap.forEach(doc => {
          empMap[doc.id] = doc.data();
        });

        const snap = await getDocs(collection(db, 'devices'));
        const data: Device[] = [];
        snap.forEach(doc => {
          const d = doc.data();
          const emp = empMap[d.employeeId] || {};
          let lastSeen = d.lastSeenAt;
          if (d.lastSeenAt && d.lastSeenAt.toDate) {
            lastSeen = d.lastSeenAt.toDate().toISOString();
          }
          let registered = d.registeredAt;
          if (d.registeredAt && d.registeredAt.toDate) {
            registered = d.registeredAt.toDate().toISOString();
          }

          data.push({
            id: doc.id,
            employeeId: d.employeeId || '-',
            employeeName: emp.name || 'Unknown',
            deviceId: d.deviceId || doc.id,
            manufacturer: d.manufacturer || 'Unknown',
            model: d.model || 'Unknown',
            androidVersion: d.androidVersion || 'Unknown',
            appVersion: d.appVersion || 'Unknown',
            isActive: d.isActive !== false,
            registeredAt: registered || new Date().toISOString(),
            lastSeenAt: lastSeen || new Date().toISOString(),
          });
        });
        setDevices(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDevices();
  }, []);

  const handleReset = async (empName: string, id: string) => {
    if (window.confirm(`Reset device binding untuk ${empName}? Pegawai perlu mendaftar ulang perangkat.`)) {
      try {
        await updateDoc(doc(db, 'devices', id), { isActive: false });
        setDevices(prev => prev.map(d => d.id === id ? { ...d, isActive: false } : d));
      } catch (e) {
        console.error('Failed to reset device', e);
        alert('Gagal mereset perangkat');
      }
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
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Memuat data perangkat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Tidak ada perangkat ditemukan.</td></tr>
              ) : filtered.map((dev) => (
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
                        onClick={() => handleReset(dev.employeeName, dev.id)}
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
