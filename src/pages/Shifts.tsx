import { useState, useRef, useEffect } from 'react';
import { Plus, Clock, Edit2, AlertCircle, Upload, Download, FileText, X } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AdminServices } from '../lib/services';
import type { Shift } from '../lib/services';

export default function Shifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'shifts'));
      const data: Shift[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        data.push({
          id: doc.id,
          name: d.name || 'Unknown',
          startTime: d.startTime || '00:00',
          endTime: d.endTime || '00:00',
          tolerance: d.tolerance || 0,
          crossesMidnight: d.crossesMidnight || false,
        });
      });
      setShifts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [newShift, setNewShift] = useState({ name: '', startTime: '', endTime: '', tolerance: 15, crossesMidnight: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.name || !newShift.startTime || !newShift.endTime) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: newShift.name,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
        tolerance: Number(newShift.tolerance),
        crossesMidnight: newShift.crossesMidnight,
      };

      if (editingShift && editingShift.id) {
        await AdminServices.addShiftsBulk([{ id: editingShift.id, ...payload }]);
      } else {
        await AdminServices.addShift(payload);
      }
      
      setIsModalOpen(false);
      setEditingShift(null);
      setNewShift({ name: '', startTime: '', endTime: '', tolerance: 15, crossesMidnight: false });
      fetchShifts();
    } catch (err: any) {
      alert('Gagal menyimpan shift: ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (shift: Shift) => {
    setEditingShift(shift);
    setNewShift({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      tolerance: shift.tolerance,
      crossesMidnight: shift.crossesMidnight
    });
    setIsModalOpen(true);
  };

  const handleDownloadTemplate = () => {
    const headers = ['ID Shift', 'Nama Shift', 'Jam Masuk', 'Jam Pulang', 'Toleransi Menit', 'Lintas Hari (YA/TIDAK)'];
    const rows = [
      ['', 'Shift Pagi', '07:00', '15:00', '15', 'TIDAK'],
      ['', 'Shift Malam', '22:00', '06:00', '15', 'YA']
    ];
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_shift.csv';
    link.click();
  };

  const handleExportCSV = () => {
    const headers = ['ID Shift', 'Nama Shift', 'Jam Masuk', 'Jam Pulang', 'Toleransi Menit', 'Lintas Hari (YA/TIDAK)'];
    const rows = shifts.map(s => [
      s.id,
      s.name,
      s.startTime,
      s.endTime,
      s.tolerance.toString(),
      s.crossesMidnight ? 'YA' : 'TIDAK'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'data_shift.csv';
    link.click();
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      
      const delimiter = text.includes(';') ? ';' : ',';
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) {
        alert('File CSV kosong atau format tidak valid.');
        return;
      }

      const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      
      const idIdx = headers.findIndex(h => h.includes('id'));
      const nameIdx = headers.findIndex(h => h.includes('nama'));
      const startIdx = headers.findIndex(h => h.includes('masuk'));
      const endIdx = headers.findIndex(h => h.includes('pulang'));
      const tolIdx = headers.findIndex(h => h.includes('toleransi'));
      const crossIdx = headers.findIndex(h => h.includes('lintas') || h.includes('hari'));

      if (nameIdx === -1 || startIdx === -1 || endIdx === -1) {
        alert('Format CSV tidak valid. Pastikan ada kolom Nama Shift, Jam Masuk, dan Jam Pulang.');
        return;
      }

      const parsedShifts: Partial<Shift>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(delimiter).map(col => col.trim().replace(/^"|"$/g, ''));
        
        if (columns.length < 3) continue;

        const name = columns[nameIdx];
        const startTime = columns[startIdx];
        const endTime = columns[endIdx];
        
        if (!name || !startTime || !endTime) continue;

        const tolerance = tolIdx !== -1 ? parseInt(columns[tolIdx], 10) || 15 : 15;
        const crossStr = crossIdx !== -1 ? columns[crossIdx].toUpperCase() : '';
        const crossesMidnight = crossStr === 'YA' || crossStr === 'TRUE' || crossStr === 'Y';

        const sData: Partial<Shift> = { name, startTime, endTime, tolerance, crossesMidnight };
        if (idIdx !== -1 && columns[idIdx]) {
          sData.id = columns[idIdx];
        }

        parsedShifts.push(sData);
      }

      if (parsedShifts.length > 0) {
        setLoading(true);
        try {
          await AdminServices.addShiftsBulk(parsedShifts);
          alert(`Berhasil mengimpor/mengupdate ${parsedShifts.length} shift.`);
          fetchShifts();
        } catch (error: any) {
          console.error(error);
          alert('Gagal mengimpor shift: ' + (error.message || ''));
        } finally {
          setLoading(false);
        }
      } else {
        alert('Tidak ada data yang valid untuk diimpor.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manajemen Shift</h1>
          <p className="mt-1 text-sm text-gray-500">Kelola jadwal shift kerja dan batas toleransi absensi.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleDownloadTemplate}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
          >
            <FileText className="w-4 h-4 mr-2" />
            Template CSV
          </button>
          <input 
            type="file" 
            accept=".csv, .xlsx" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </button>
          <button 
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button 
            onClick={() => {
              setEditingShift(null);
              setNewShift({ name: '', startTime: '', endTime: '', tolerance: 15, crossesMidnight: false });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Shift
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Memuat data shift...</div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Tidak ada data shift.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shifts.map((shift) => (
          <div key={shift.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-all hover:shadow-md">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary mr-3">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{shift.name}</h3>
                </div>
                <button onClick={() => openEditModal(shift)} className="text-gray-400 hover:text-primary transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Jam Masuk</span>
                  <span className="font-medium text-gray-900">{shift.startTime} WIB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Jam Pulang</span>
                  <span className="font-medium text-gray-900">{shift.endTime} WIB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Toleransi</span>
                  <span className="font-medium text-gray-900">{shift.tolerance} Menit</span>
                </div>
              </div>

              {shift.crossesMidnight && (
                <div className="mt-auto bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg flex items-start border border-amber-100">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <p>Shift ini melewati tengah malam (Lintas Hari) dan dihitung sebagai 1 sesi absensi.</p>
                </div>
              )}
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">Aktif</span>
              <button className="text-sm font-medium text-red-600 hover:text-red-700">Nonaktifkan</button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Modal Tambah/Edit Shift */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">{editingShift ? 'Edit Shift' : 'Tambah Shift Baru'}</h3>
              <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nama Shift</label>
                <input 
                  type="text" 
                  required 
                  value={newShift.name} 
                  onChange={(e) => setNewShift({...newShift, name: e.target.value})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" 
                  placeholder="Contoh: Shift Pagi" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Jam Masuk</label>
                  <input 
                    type="time" 
                    required 
                    value={newShift.startTime} 
                    onChange={(e) => setNewShift({...newShift, startTime: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Jam Pulang</label>
                  <input 
                    type="time" 
                    required 
                    value={newShift.endTime} 
                    onChange={(e) => setNewShift({...newShift, endTime: e.target.value})} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Batas Toleransi Keterlambatan (Menit)</label>
                <input 
                  type="number" 
                  required 
                  min="0"
                  value={newShift.tolerance} 
                  onChange={(e) => setNewShift({...newShift, tolerance: Number(e.target.value)})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" 
                  placeholder="15" 
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="crossesMidnight" 
                  checked={newShift.crossesMidnight}
                  onChange={(e) => setNewShift({...newShift, crossesMidnight: e.target.checked})}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="crossesMidnight" className="text-sm text-gray-700">
                  Shift melintasi tengah malam (Lintas Hari)
                </label>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
