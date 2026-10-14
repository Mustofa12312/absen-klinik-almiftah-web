import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Calendar, Ban, X, Trash2, CheckCircle2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HolidayServices } from '../lib/services';
import { formatErrorMessage } from '../lib/errorUtils';

interface Holiday {
  id: string;
  date: string;
  name: string;
  description: string;
  scope: 'all_branches' | 'specific' | string;
  branchId?: string;
  isActive: boolean;
}

export default function Holidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    description: '',
    scope: 'all_branches',
    branchId: '',
  });

  const fetchBranches = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'branches'));
      const list: { id: string; name: string }[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        list.push({ id: doc.id, name: d.name || d.code || doc.id });
      });
      setBranches(list);
      setHolidayForm(prev => prev.branchId ? prev : { ...prev, branchId: list[0]?.id || '' });
    } catch (e) {
      console.error('Gagal mengambil cabang:', e);
    }
  }, []);

  const fetchHolidays = useCallback(async () => {
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
          scope: d.scope || (d.branchId && d.branchId !== 'ALL' ? 'specific' : 'all_branches'),
          branchId: d.branchId || '',
          isActive: d.isActive !== false,
        });
      });
      // Sort by date descending
      data.sort((a, b) => b.date.localeCompare(a.date));
      setHolidays(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
    fetchHolidays();
  }, [fetchBranches, fetchHolidays]);

  const openAddModal = () => {
    setEditingHoliday(null);
    setHolidayForm({
      date: '',
      name: '',
      description: '',
      scope: 'all_branches',
      branchId: branches[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (h: Holiday) => {
    setEditingHoliday(h);
    setHolidayForm({
      date: h.date === '-' ? '' : h.date,
      name: h.name,
      description: h.description === '-' ? '' : h.description,
      scope: h.scope === 'specific' ? 'specific' : 'all_branches',
      branchId: h.branchId || branches[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (h: Holiday) => {
    const actionLabel = h.isActive ? 'Nonaktifkan' : 'Aktifkan';
    if (!window.confirm(`${actionLabel} hari libur "${h.name}"?`)) return;
    try {
      await HolidayServices.updateHoliday(h.id, { isActive: !h.isActive });
      fetchHolidays();
    } catch (e) {
      alert('Gagal mengubah status hari libur: ' + formatErrorMessage(e));
    }
  };

  const handleDeleteHoliday = async (h: Holiday) => {
    if (!window.confirm(`Hapus permanen hari libur "${h.name}"?`)) return;
    try {
      await HolidayServices.deleteHoliday(h.id);
      fetchHolidays();
    } catch (e) {
      alert('Gagal menghapus hari libur: ' + formatErrorMessage(e));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.date || !holidayForm.name) return;
    setIsSubmitting(true);
    try {
      const payload = {
        date: holidayForm.date,
        name: holidayForm.name,
        description: holidayForm.description,
        scope: holidayForm.scope,
        branchId: holidayForm.scope === 'specific' ? holidayForm.branchId : 'ALL',
      };

      if (editingHoliday) {
        await HolidayServices.updateHoliday(editingHoliday.id, payload);
      } else {
        await HolidayServices.addHoliday(payload);
      }

      setIsModalOpen(false);
      setEditingHoliday(null);
      fetchHolidays();
    } catch (err) {
      alert('Gagal menyimpan hari libur: ' + formatErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const branchMap: Record<string, string> = {};
  branches.forEach(b => {
    branchMap[b.id] = b.name;
  });

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
          onClick={openAddModal}
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
        <div className="overflow-auto max-h-[600px] border-t border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama & Keterangan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cakupan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">Memuat hari libur...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">Tidak ada hari libur.</td></tr>
              ) : filtered.map((h) => {
                const branchName = h.branchId ? (branchMap[h.branchId] || h.branchId) : 'Cabang Tertentu';
                return (
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
                        {h.scope === 'all_branches' ? 'Semua Cabang' : branchName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${h.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {h.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end items-center space-x-2">
                        <button
                          onClick={() => openEditModal(h)}
                          className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded-lg hover:bg-gray-100"
                          title="Edit Hari Libur"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(h)}
                          className={`p-1.5 transition-colors rounded-lg ${h.isActive ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                          title={h.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {h.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(h)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                          title="Hapus Hari Libur"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Hari Libur */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingHoliday ? 'Edit Hari Libur' : 'Tambah Hari Libur'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={holidayForm.date}
                  onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Hari Libur</label>
                <input
                  type="text"
                  required
                  value={holidayForm.name}
                  onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="Contoh: Hari Raya Idul Fitri"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan (Opsional)</label>
                <input
                  type="text"
                  value={holidayForm.description}
                  onChange={e => setHolidayForm({ ...holidayForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="Keterangan tambahan..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cakupan Cabang</label>
                <select
                  value={holidayForm.scope}
                  onChange={e => setHolidayForm({ ...holidayForm, scope: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                >
                  <option value="all_branches">Semua Cabang (Nasional / Seluruh Klinik)</option>
                  <option value="specific">Cabang Tertentu</option>
                </select>
              </div>
              {holidayForm.scope === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Cabang</label>
                  <select
                    value={holidayForm.branchId}
                    onChange={e => setHolidayForm({ ...holidayForm, branchId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !holidayForm.date || !holidayForm.name}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Menyimpan...' : (editingHoliday ? 'Simpan Perubahan' : 'Tambah Libur')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
