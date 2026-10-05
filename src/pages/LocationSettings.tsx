import { useState } from 'react';
import { MapPin, Search, Edit2, Plus, MoreVertical } from 'lucide-react';

interface Location {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxAccuracyMeters: number;
  isActive: boolean;
}

const DUMMY_LOCATIONS: Location[] = [
  { id: '1', branchId: 'HQ-01', branchName: 'Klinik Al-Miftah Pusat',   name: 'Gedung Pusat',       latitude: -6.2088, longitude: 106.8456, radiusMeters: 100, maxAccuracyMeters: 50, isActive: true },
  { id: '2', branchId: 'BR-02', branchName: 'Klinik Al-Miftah Selatan', name: 'Gedung Cabang Selatan', latitude: -6.2901, longitude: 106.7695, radiusMeters: 50,  maxAccuracyMeters: 30, isActive: true },
  { id: '3', branchId: 'BR-03', branchName: 'Klinik Al-Miftah Timur',  name: 'Gedung Cabang Timur',  latitude: -6.2175, longitude: 106.9023, radiusMeters: 150, maxAccuracyMeters: 50, isActive: false },
];

export default function LocationSettings() {
  const [locations] = useState<Location[]>(DUMMY_LOCATIONS);
  const [search, setSearch] = useState('');

  const filtered = locations.filter(l =>
    l.branchName.toLowerCase().includes(search.toLowerCase()) ||
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Lokasi Absensi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Konfigurasi koordinat GPS, radius geofence, dan batas akurasi per cabang (PRD-30, BR-03).
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Tambah Lokasi
        </button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>ℹ️ Catatan Keamanan:</strong> Radius tidak boleh dikodekan permanen di aplikasi Android.
        Nilai ini dibaca langsung dari Firestore setiap kali pegawai membuka aplikasi (BR-03). Perubahan berlaku instan.
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama cabang atau lokasi..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cabang & Titik Lokasi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Koordinat GPS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Radius</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Maks. Akurasi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 relative"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((loc) => (
                <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{loc.branchName}</div>
                        <div className="text-xs text-gray-400">{loc.name} · {loc.branchId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-mono text-gray-700 bg-gray-50 rounded px-2 py-1 border">
                      <div>Lat: {loc.latitude.toFixed(4)}</div>
                      <div>Lng: {loc.longitude.toFixed(4)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                      {loc.radiusMeters} m
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {loc.maxAccuracyMeters} m
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${loc.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {loc.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end items-center space-x-3">
                      <button className="text-gray-400 hover:text-primary transition-colors" title="Edit Koordinat & Radius">
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
