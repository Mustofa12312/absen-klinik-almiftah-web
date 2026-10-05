import { useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';

interface AuditLog {
  id: string;
  actorUid: string;
  actorName: string;
  actorRole: 'super_admin';
  action: string;
  targetType: string;
  targetId: string;
  description: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
}

const DUMMY_LOGS: AuditLog[] = [
  { id: '1', actorUid: 'admin_uid', actorName: 'Super Admin', actorRole: 'super_admin', action: 'approve_correction', targetType: 'correction_request', targetId: 'req_001', description: 'Menyetujui koreksi absensi Ahmad Fauzan (lupa pulang)', before: { status: 'pending' }, after: { status: 'approved' }, createdAt: '2026-10-05T10:15:00Z' },
  { id: '2', actorUid: 'admin_uid', actorName: 'Super Admin', actorRole: 'super_admin', action: 'update_location_radius', targetType: 'location', targetId: 'loc_001', description: 'Mengubah radius geofence Cabang Pusat', before: { radiusMeters: 100 }, after: { radiusMeters: 150 }, createdAt: '2026-10-05T09:30:00Z' },
  { id: '3', actorUid: 'admin_uid', actorName: 'Super Admin', actorRole: 'super_admin', action: 'reset_device', targetType: 'device', targetId: 'dev_abc123', description: 'Reset device binding Ahmad Fauzan (ganti HP)', before: { isActive: true }, after: { isActive: false }, createdAt: '2026-10-04T14:00:00Z' },
  { id: '4', actorUid: 'admin_uid', actorName: 'Super Admin', actorRole: 'super_admin', action: 'deactivate_employee', targetType: 'employee', targetId: 'EMP004', description: 'Menonaktifkan pegawai Diana Fitri (resign)', before: { status: 'active' }, after: { status: 'inactive' }, createdAt: '2026-10-03T08:00:00Z' },
];

const ACTION_LABELS: Record<string, string> = {
  approve_correction: 'Setuju Koreksi',
  reject_correction: 'Tolak Koreksi',
  approve_leave: 'Setuju Pengajuan',
  reject_leave: 'Tolak Pengajuan',
  update_location_radius: 'Ubah Radius',
  reset_device: 'Reset Device',
  deactivate_employee: 'Nonaktifkan Pegawai',
  create_employee: 'Tambah Pegawai',
  create_branch: 'Tambah Cabang',
};

export default function AuditLog() {
  const [logs] = useState<AuditLog[]>(DUMMY_LOGS);
  const [search, setSearch] = useState('');

  const filtered = logs.filter(l =>
    l.description.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Audit Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          Rekaman seluruh tindakan administratif sensitif. Tidak dapat dihapus melalui UI (BR-22, PRD-39).
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan aksi atau keterangan..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelaku</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perubahan</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">Tidak ada log ditemukan.</td></tr>
              ) : filtered.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                        <ClipboardList className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.actorName}</div>
                        <div className="text-xs text-gray-400 capitalize">{log.actorRole.replace('_', ' ')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px]">{log.description}</td>
                  <td className="px-6 py-4">
                    {log.before || log.after ? (
                      <div className="text-xs font-mono space-y-1">
                        {log.before && <div className="text-red-600 bg-red-50 px-2 py-1 rounded">- {JSON.stringify(log.before)}</div>}
                        {log.after && <div className="text-green-600 bg-green-50 px-2 py-1 rounded">+ {JSON.stringify(log.after)}</div>}
                      </div>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center">🔒 Audit log bersifat immutable — tidak ada tombol hapus sesuai kebijakan keamanan sistem.</p>
    </div>
  );
}
