import { useState, useRef } from 'react';
import { Plus, Search, Smartphone, ShieldAlert, Edit2, MoreVertical, ShieldCheck, Upload } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  role: string;
  branch: string;
  status: 'active' | 'inactive';
  deviceBound: boolean;
  deviceName?: string;
}

const DUMMY_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Ahmad Fauzan', role: 'Dokter Umum', branch: 'HQ-01', status: 'active', deviceBound: true, deviceName: 'Samsung Galaxy S23' },
  { id: '2', name: 'Siti Aminah', role: 'Perawat', branch: 'BR-02', status: 'active', deviceBound: true, deviceName: 'iPhone 13' },
  { id: '3', name: 'Budi Santoso', role: 'Apoteker', branch: 'HQ-01', status: 'active', deviceBound: false },
  { id: '4', name: 'Diana Fitri', role: 'Resepsionis', branch: 'BR-02', status: 'inactive', deviceBound: true, deviceName: 'Oppo Reno 8' },
];

export default function Employees() {
  const [employees] = useState<Employee[]>(DUMMY_EMPLOYEES);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, parse the CSV and send to server.
      // For now, just show a success message.
      alert(`Berhasil mensimulasikan import file: ${file.name}`);
      event.target.value = ''; // reset
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manajemen Pegawai</h1>
          <p className="mt-1 text-sm text-gray-500">Kelola data pegawai, status aktif, dan Device Binding.</p>
        </div>
        <div className="flex gap-2">
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
          <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
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
            <select className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-lg border">
              <option>Semua Cabang</option>
              <option>HQ-01</option>
              <option>BR-02</option>
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
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                         <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`} alt="" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                        <div className="text-sm text-gray-500">ID: {emp.id.padStart(4, '0')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{emp.role}</div>
                    <div className="text-sm text-gray-500 mt-1">Cabang: {emp.branch}</div>
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
                         <button className="text-gray-400 hover:text-orange-600 transition-colors" title="Reset Device">
                           <Smartphone className="h-4 w-4" />
                         </button>
                      )}
                      <button className="text-gray-400 hover:text-primary transition-colors" title="Edit">
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
    </div>
  );
}
