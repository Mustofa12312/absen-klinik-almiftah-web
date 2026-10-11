import { useState, useRef, useEffect } from 'react';
import { Plus, Search, Smartphone, ShieldAlert, Edit2, MoreVertical, ShieldCheck, Upload, Download, FileText, X } from 'lucide-react';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AdminServices } from '../lib/services';
import type { Employee, Branch } from '../lib/services';

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState({ name: '', role: 'Staff', branchId: '', strNumber: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAuth, setIsGeneratingAuth] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Ambil data bersih (sudah di-dedup)
      const data = await AdminServices.getEmployeesByBranch();
      setEmployees(data);

      // Hitung duplikat dari raw Firestore (sebelum dedup)
      const rawSnap = await getDocs(collection(db, 'employees'));
      const rawDocs = rawSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const nonMigrated = rawDocs.filter((e: any) => !e.migrated);
      const authIds = new Set(nonMigrated.filter((e: any) => e.id.length >= 28).map((e: any) => `${e.strNumber || ''}|${e.phone || ''}`))
      const legacyDups = nonMigrated.filter((e: any) => {
        if (e.id.length >= 28) return false;
        const key = `${e.strNumber || ''}|${e.phone || ''}`;
        return key !== '|' && authIds.has(key);
      });
      setDuplicateCount(legacyDups.length);
    } catch (_e) {
      console.error(_e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const b = await AdminServices.getBranches();
      setBranches(b);
      if (b.length > 0) {
        setEmployeeForm(prev => ({ ...prev, branchId: b[0].id || '' }));
      }
    } catch (_e) {
      console.error(_e);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchEmployees();
    fetchBranches();
  }, []);

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          if (!text) return;
          
          const lines = text.split('\n').filter(line => line.trim() !== '');
          if (lines.length < 2) {
            alert('File CSV kosong atau tidak valid. Pastikan ada baris header.');
            return;
          }
          
          // Detect delimiter
          const delimiter = lines[0].includes(';') ? ';' : ',';
          
          // Parse header
          const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
          const idIndex = headers.findIndex(h => h === 'id' || h.includes('id pegawai') || h.includes('id ('));
          const nameIndex = headers.findIndex(h => h.includes('nama') || h === 'name');
          const roleIndex = headers.findIndex(h => h.includes('role') || h === 'posisi');
          const branchIdIndex = headers.findIndex(h => h.includes('branch') || h.includes('cabang'));
          const strIndex = headers.findIndex(h => h.includes('str'));
          const phoneIndex = headers.findIndex(h => h.includes('telepon') || h.includes('telp') || h.includes('phone'));
          
          if (nameIndex === -1 || roleIndex === -1 || branchIdIndex === -1) {
            alert('Format CSV tidak valid. Pastikan kolom Nama, Role/Posisi, dan Branch ID/Cabang ada. (Gunakan pemisah koma atau titik koma)');
            return;
          }

          const parseCSVRow = (rowText: string) => {
            const re = delimiter === ';' ? /;(?=(?:(?:[^"]*"){2})*[^"]*$)/ : /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
            return rowText.split(re).map(v => v.replace(/^"|"$/g, '').trim());
          };

          const newEmployees: Partial<Employee>[] = [];
          for (let i = 1; i < lines.length; i++) {
            const row = parseCSVRow(lines[i]);
            if (row.length === 0 || !row[nameIndex]) continue;
            
            const branchIdValue = row[branchIdIndex] || branches[0]?.id || '';
            const matchingBranch = branches.find(b => b.id === branchIdValue || b.code === branchIdValue || b.name === branchIdValue);
            
            const empData: Partial<Employee> = {
              name: row[nameIndex] || 'Unnamed',
              role: row[roleIndex] || 'Staff',
              branchId: matchingBranch ? matchingBranch.id! : branches[0]?.id || '',
              status: 'active',
              deviceBound: false,
            };
            
            if (strIndex !== -1 && row[strIndex]) {
              empData.strNumber = row[strIndex];
            }
            if (phoneIndex !== -1 && row[phoneIndex]) {
              empData.phone = row[phoneIndex];
            }

            // If ID exists and isn't just empty or placeholder
            if (idIndex !== -1 && row[idIndex] && row[idIndex].trim() !== '') {
              empData.id = row[idIndex].trim();
            }

            newEmployees.push(empData);
          }
          
          if (newEmployees.length === 0) {
            alert('Tidak ada data pegawai valid untuk diimport.');
            return;
          }

          setIsSubmitting(true);
          await AdminServices.addEmployeesBulk(newEmployees);
          alert(`Berhasil import ${newEmployees.length} pegawai!`);
          fetchEmployees();
        } catch (error) {
          console.error(error);
          alert('Terjadi kesalahan saat import CSV');
        } finally {
          setIsSubmitting(false);
          if (fileInputRef.current) fileInputRef.current.value = ''; // reset
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExportCSV = () => {
    if (employees.length === 0) {
      alert('Tidak ada data untuk diexport');
      return;
    }
    const headers = ['ID Pegawai', 'Nama', 'Posisi', 'Status', 'Cabang', 'No STR', 'No Telepon', 'Device Binding'];
    const rows = employees.map(emp => [
      emp.id || '',
      emp.name,
      emp.role,
      emp.status,
      emp.branchId,
      emp.strNumber || '',
      emp.phone || '',
      emp.deviceBound ? 'Terikat' : 'Belum Terikat'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'data_pegawai.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const headers = ['ID Pegawai (Kosongkan jika baru)', 'Nama', 'Posisi', 'Cabang', 'No STR', 'No Telepon'];
    const sampleData = [
      ['', 'Budi Santoso', 'Staff', branches[0]?.code || 'HQ-01', '12345678', '081234567890'],
      ['', 'Siti Aminah', 'Dokter', branches[0]?.code || 'HQ-01', '87654321', '089876543210']
    ];
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_import_pegawai.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const handleAddEmployee = () => {
    setEditingId(null);
    setEmployeeForm({ name: '', role: 'Staff', branchId: branches[0]?.id || '', strNumber: '', phone: '' });
    setIsModalOpen(true);
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingId(emp.id || null);
    setEmployeeForm({
      name: emp.name,
      role: emp.role,
      branchId: emp.branchId,
      strNumber: emp.strNumber || '',
      phone: emp.phone || ''
    });
    setIsModalOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.name || !employeeForm.branchId) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        await AdminServices.updateEmployee(editingId, employeeForm);
      } else {
        await AdminServices.addEmployeeAndAuth({
          name: employeeForm.name,
          role: employeeForm.role,
          branchId: employeeForm.branchId,
          status: 'active',
          deviceBound: false,
          strNumber: employeeForm.strNumber || "",
          phone: employeeForm.phone || "",
        });
      }
      setIsModalOpen(false);
      setEmployeeForm({ name: '', role: 'Staff', branchId: branches[0]?.id || '', strNumber: '', phone: '' });
      fetchEmployees();
    } catch {
      alert('Gagal menyimpan pegawai');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDevice = async (id: string) => {
    if (window.confirm('Reset perangkat untuk pegawai ini?')) {
      try {
        await AdminServices.resetDeviceBinding(id);
        fetchEmployees();
      } catch {
        alert('Gagal mereset perangkat');
      }
    }
  };

  const handleGenerateAuth = async () => {
    if (!window.confirm('Buat email & password default (Klinik123) untuk semua pegawai yang belum punya akun? (Pegawai lama di Firestore akan di-migrate ke ID Auth yang baru).')) return;
    
    setIsGeneratingAuth(true);
    try {
      const result = await AdminServices.generateAuthAccounts();
      alert(`Berhasil: ${result.success} akun dibuat.\nGagal: ${result.failed} akun.`);
      fetchEmployees();
    } catch {
      alert('Terjadi kesalahan saat membuat akun');
    } finally {
      setIsGeneratingAuth(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!window.confirm(`Hapus ${duplicateCount} dokumen pegawai lama (duplikat) dari Firestore? Data pegawai baru yang sudah memiliki akun Auth tetap aman.`)) return;
    setIsCleaningUp(true);
    try {
      const result = await AdminServices.cleanupDuplicateEmployees();
      alert(`Selesai!\nDihapus: ${result.deleted}\nDitandai migrated: ${result.marked}\nGagal: ${result.errors}`);
      fetchEmployees();
    } catch {
      alert('Gagal membersihkan duplikat');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const branchMap = Object.fromEntries(branches.map(b => [b.id, b.name]));

  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchBranch = filterBranch ? e.branchId === filterBranch : true;
    return matchSearch && matchBranch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manajemen Pegawai</h1>
          <p className="mt-1 text-sm text-gray-500">Kelola data pegawai, status aktif, dan Device Binding.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto mt-4 sm:mt-0">
          <input 
            type="file" 
            accept=".csv, .xlsx" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
          />
          <button 
            onClick={handleDownloadTemplate}
            className="inline-flex items-center justify-center px-2 sm:px-4 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
          >
            <FileText className="w-4 h-4 mr-2" />
            Template CSV
          </button>
          <button 
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center px-2 sm:px-4 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center px-2 sm:px-4 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors"
            disabled={isSubmitting || isGeneratingAuth}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Importing...' : 'Import CSV'}
          </button>
          
          {employees.some(e => !e.id || e.id.length < 28) && (
            <button 
              onClick={handleGenerateAuth}
              disabled={isSubmitting || isGeneratingAuth || isCleaningUp}
              className="inline-flex items-center justify-center px-2 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-lg shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none transition-colors disabled:opacity-50 col-span-2 sm:col-span-1"
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              {isGeneratingAuth ? 'Memproses...' : 'Buat Akun Login'}
            </button>
          )}

          {duplicateCount > 0 && (
            <button
              onClick={handleCleanupDuplicates}
              disabled={isSubmitting || isGeneratingAuth || isCleaningUp}
              className="inline-flex items-center justify-center px-2 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none transition-colors disabled:opacity-50 col-span-2 sm:col-span-1"
            >
              <X className="w-4 h-4 mr-2" />
              {isCleaningUp ? 'Membersihkan...' : `Hapus ${duplicateCount} Duplikat`}
            </button>
          )}

          <button 
            onClick={handleAddEmployee}
            className="inline-flex items-center justify-center px-2 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors col-span-2 sm:col-span-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pegawai
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="relative w-full max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nama pegawai..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-lg border"
            >
              <option value="">Semua Cabang</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pegawai</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posisi & Cabang</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Binding</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Belum ada data pegawai</td></tr>
              ) : filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                         <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`} alt="" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                        <div className="text-sm text-gray-500">ID: {(emp.id ?? '').padStart(4, '0')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{emp.role}</div>
                    {emp.strNumber && <div className="text-xs text-gray-500 mt-1">STR: {emp.strNumber}</div>}
                    {emp.phone && <div className="text-xs text-gray-500 mt-1">Telp: {emp.phone}</div>}
                    <div className="text-sm text-gray-500 mt-1">Cabang: {branchMap[emp.branchId] || emp.branchId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {emp.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {emp.deviceBound ? (
                      <div className="flex items-center text-sm text-green-700 bg-green-50 px-3 py-1 rounded-full w-fit border border-green-200">
                        <ShieldCheck className="w-4 h-4 mr-1.5" />
                        <span className="font-medium truncate max-w-[120px]" title={emp.deviceName}>{emp.deviceName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded-full w-fit border border-amber-200">
                        <ShieldAlert className="w-4 h-4 mr-1.5" />
                        <span className="font-medium">Belum Terikat</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end items-center space-x-3">
                      {emp.deviceBound && (
                         <button onClick={() => handleResetDevice(emp.id!)} className="text-gray-400 hover:text-orange-600 transition-colors" title="Reset Device">
                           <Smartphone className="h-4 w-4" />
                         </button>
                      )}
                      <button onClick={() => handleEditEmployee(emp)} className="text-gray-400 hover:text-primary transition-colors" title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}</h2>
              <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={submitForm} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pegawai</label>
                <input
                  type="text"
                  required
                  value={employeeForm.name}
                  onChange={e => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="Contoh: Budi Santoso"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Posisi / Role</label>
                <input
                  type="text"
                  required
                  value={employeeForm.role}
                  onChange={e => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="Staff"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor STR (Opsional)</label>
                <input
                  type="text"
                  value={employeeForm.strNumber}
                  onChange={e => setEmployeeForm({ ...employeeForm, strNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="Contoh: 1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon (Opsional)</label>
                <input
                  type="tel"
                  value={employeeForm.phone}
                  onChange={e => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="Contoh: 081234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Penempatan Cabang</label>
                <select
                  required
                  value={employeeForm.branchId}
                  onChange={e => setEmployeeForm({ ...employeeForm, branchId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-white"
                >
                  <option value="" disabled>Pilih cabang</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !employeeForm.name || !employeeForm.branchId}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Simpan Pegawai')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
