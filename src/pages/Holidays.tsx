import { useState } from 'react';
import { Plus, Search, MoreVertical, Edit2, Calendar, Ban } from 'lucide-react';

interface Holiday {
  id: string;
  date: string;
  name: string;
  description: string;
  scope: 'all_branches' | string;
  isActive: boolean;
}

const DUMMY_HOLIDAYS: Holiday[] = [
  { id: '1', date: '2026-10-12', name: 'Libur Klinik', description: 'Hari libur klinik seluruh cabang', scope: 'all_branches', isActive: true },
  { id: '2', date: '2026-12-25', name: 'Natal', description: 'Hari Raya Natal', scope: 'all_branches', isActive: true },
  { id: '3', date: '2026-10-20', name: 'Rapat Tahunan', description: 'Rapat tahunan Cabang Pusat', scope: 'branch_hq01', isActive: true },
];

export default function Holidays() {
  const [holidays] = useState<Holiday[]>(DUMMY_HOLIDAYS);
  const [search, setSearch] = useState('');

  const filtered = holidays.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.date.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manajemen Hari Libur</h1>
          <p className="mt-1 text-sm text-gray-500">Tetapkan hari libur per cabang atau untuk semua cabang (BR-16).</p>
        </div>
        <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Hari Libur
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama atau tanggal..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama & Keterangan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cakupan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 relative"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
                        <Calendar className="h-5 w-5 text-blue-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{new Date(h.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{h.name}</div>
                    <div className="text-sm text-gray-500">{h.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${h.scope === 'all_branches' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {h.scope === 'all_branches' ? 'Semua Cabang' : 'Cabang Tertentu'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${h.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {h.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end items-center space-x-3">
                      <button className="text-gray-400 hover:text-primary transition-colors"><Edit2 className="h-4 w-4" /></button>
                      <button className="text-gray-400 hover:text-red-600 transition-colors"><Ban className="h-4 w-4" /></button>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors"><MoreVertical className="h-4 w-4" /></button>
                    </div>
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
