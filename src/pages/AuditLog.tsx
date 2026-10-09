import { useState, useEffect } from 'react';
import { ClipboardList, Search, Download } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(100)));
        const data: AuditLog[] = [];
        snap.forEach(doc => {
          const d = doc.data();
          const tsRaw = d.createdAt || d.timestamp;
          let createdAt = new Date().toISOString();
          if (tsRaw) {
            createdAt = (tsRaw.toDate ? tsRaw.toDate() : new Date(tsRaw)).toISOString();
          }

          data.push({
            id: doc.id,
            actorUid: d.actorUid || '-',
            actorName: d.actorName || 'Sistem / Super Admin',
            actorRole: d.actorRole || 'super_admin',
            action: d.action || 'unknown',
            targetType: d.targetType || 'unknown',
            targetId: d.targetId || '-',
            description: d.description || '-',
            before: d.before,
            after: d.after,
            createdAt,
          });
        });
        setLogs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

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

  const filtered = logs.filter(l =>
    l.description.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ['ID', 'Waktu', 'Aksi', 'Pelaku', 'Role', 'Target Type', 'Target ID', 'Keterangan', 'Perubahan (Before)', 'Perubahan (After)'];
    const rows = filtered.map(l => [
      l.id,
      new Date(l.createdAt).toLocaleString('id-ID'),
      ACTION_LABELS[l.action] ?? l.action,
      l.actorName,
      l.actorRole,
      l.targetType,
      l.targetId,
      l.description,
      l.before ? JSON.stringify(l.before).replace(/"/g, '""') : '-',
      l.after ? JSON.stringify(l.after).replace(/"/g, '""') : '-'
    ]);
    
    const csvContent = [headers, ...rows].map(row => `"${row.join('","')}"`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audit Log</h1>
          <p className="mt-1 text-sm text-gray-500">
            Rekaman seluruh tindakan administratif sensitif. Tidak dapat dihapus melalui UI (BR-22, PRD-39).
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
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">Memuat log aktivitas...</td></tr>
              ) : filtered.length === 0 ? (
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
