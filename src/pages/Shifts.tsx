import { useState, useRef } from 'react';
import { Plus, Clock, Edit2, AlertCircle, Upload } from 'lucide-react';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  tolerance: number; // minutes
  crossesMidnight: boolean;
}

const DUMMY_SHIFTS: Shift[] = [
  { id: '1', name: 'Shift Pagi', startTime: '08:00', endTime: '14:00', tolerance: 15, crossesMidnight: false },
  { id: '2', name: 'Shift Siang', startTime: '14:00', endTime: '22:00', tolerance: 15, crossesMidnight: false },
  { id: '3', name: 'Shift Malam', startTime: '22:00', endTime: '08:00', tolerance: 15, crossesMidnight: true },
];

export default function Shifts() {
  const [shifts] = useState<Shift[]>(DUMMY_SHIFTS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      alert(`Berhasil mensimulasikan import file: ${file.name}`);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manajemen Shift</h1>
          <p className="mt-1 text-sm text-gray-500">Kelola jadwal shift kerja dan batas toleransi absensi.</p>
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
            Tambah Shift
          </button>
        </div>
      </div>

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
                <button className="text-gray-400 hover:text-primary transition-colors">
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
    </div>
  );
}
