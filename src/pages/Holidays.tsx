import { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Edit2, Calendar, Ban, X } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HolidayServices } from '../lib/services';

interface Holiday {
  id: string;
  date: string;
  name: string;
  description: string;
  scope: 'all_branches' | string;
  isActive: boolean;
}

export default function Holidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '', description: '', scope: 'all_branches' });

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'holidays'));
      const data: Holiday[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        data.push({
          id: doc.id,
          date: d.date || '-',
          name: d.name || 'Unknown',
          description: d.description || '-',
          scope: d.scope || 'all_branches',
          isActive: d.isActive !== false,
        });
      });
      setHolidays(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleToggleActive = async (h: Holiday) => {
    if (!window.confirm(`${h.isActive ? 'Nonaktifkan' : 'Aktifkan'} hari libur "${h.name}"?`)) return;
    try {
      await HolidayServices.updateHoliday(h.id, { isActive: !h.isActive });
      fetchHolidays();
    } catch (e) {
      alert('Gagal mengubah status hari libur.');
    }
  };

  const submitAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.date || !newHoliday.name) return;
    setIsSubmitting(true);
    try {
      await HolidayServices.addHoliday(newHoliday);
      setIsAddModalOpen(false);
      setNewHoliday({ date: '', name: '', description: '', scope: 'all_branches' });
      fetchHolidays();
    } catch (err) {
      alert('Gagal menambah hari libur');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary/90 transition-colors"
        >
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
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">Memuat hari libur...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">Tidak ada hari libur.</td></tr>
              ) : filtered.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
                        <Calendar className="h-5 w-5 text-blue-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {h.date !== '-' ? new Date(h.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                      </span>
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
                      <button className="text-gray-400 hover:text-primary transition-colors" title="Edit"><Edit2 className="h-4 w-4" /></button>
                      <button
                        onClick={() => handleToggleActive(h)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title={h.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors"><MoreVertical className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Hari Libur */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Tambah Hari Libur</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitAddHoliday} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={newHoliday.date}
                  onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Hari Libur</label>
                <input
                  type="text"
                  required
                  value={newHoliday.name}
                  onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="Contoh: Hari Raya Idul Fitri"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan (Opsional)</label>
                <input
                  type="text"
                  value={newHoliday.description}
                  onChange={e => setNewHoliday({ ...newHoliday, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="Keterangan tambahan..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cakupan</label>
                <select
                  value={newHoliday.scope}
                  onChange={e => setNewHoliday({ ...newHoliday, scope: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                >
                  <option value="all_branches">Semua Cabang</option>
                  <option value="specific">Cabang Tertentu</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newHoliday.date || !newHoliday.name}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
