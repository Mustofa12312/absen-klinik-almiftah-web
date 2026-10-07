const fs = require('fs');

const code = `import { useState, useEffect } from 'react';
import { MapPin, Search, Edit2, Plus, MoreVertical, X } from 'lucide-react';
import { AdminServices, Branch } from '../lib/services';

export default function LocationSettings() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form states
  const [editLat, setEditLat] = useState<string>('');
  const [editLng, setEditLng] = useState<string>('');
  const [editRadius, setEditRadius] = useState<string>('');
  const [editMaxAcc, setEditMaxAcc] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await AdminServices.getBranches();
      setBranches(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleEditClick = (branch: Branch) => {
    setEditingBranch(branch);
    setEditLat(branch.latitude?.toString() || '');
    setEditLng(branch.longitude?.toString() || '');
    setEditRadius(branch.radius?.toString() || '100');
    setEditMaxAcc(branch.maxAccuracyMeters?.toString() || '50');
  };

  const handleSave = async () => {
    if (!editingBranch || !editingBranch.id) return;
    setIsSaving(true);
    try {
      await AdminServices.updateBranchLocation(editingBranch.id, {
        latitude: parseFloat(editLat) || 0,
        longitude: parseFloat(editLng) || 0,
        radius: parseInt(editRadius, 10) || 100,
        maxAccuracyMeters: parseInt(editMaxAcc, 10) || 50,
      });
      await fetchBranches();
      setEditingBranch(null);
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan lokasi');
    } finally {
      setIsSaving(false);
    }
  };

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
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat data...</div>
        ) : (
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
                          <div className="text-sm font-medium text-gray-900">{loc.name}</div>
                          <div className="text-xs text-gray-400">{loc.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-mono text-gray-700 bg-gray-50 rounded px-2 py-1 border">
                        <div>Lat: {loc.latitude ? loc.latitude.toFixed(6) : "Belum diset"}</div>
                        <div>Lng: {loc.longitude ? loc.longitude.toFixed(6) : "Belum diset"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                        {loc.radius || 0} m
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {loc.maxAccuracyMeters || 50} m
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${loc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}\`}>
                        {loc.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end items-center space-x-3">
                        <button onClick={() => handleEditClick(loc)} className="text-gray-400 hover:text-primary transition-colors" title="Edit Koordinat & Radius">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Tidak ada data lokasi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Edit Lokasi Cabang</h3>
              <button onClick={() => setEditingBranch(null)} className="text-gray-400 hover:text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nama Cabang</label>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 text-gray-700">{editingBranch.name} ({editingBranch.code})</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Latitude</label>
                  <input type="number" step="any" value={editLat} onChange={(e) => setEditLat(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="-6.2088" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Longitude</label>
                  <input type="number" step="any" value={editLng} onChange={(e) => setEditLng(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="106.8456" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Radius (Meter)</label>
                  <input type="number" value={editRadius} onChange={(e) => setEditRadius(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="100" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Maks. Akurasi (Meter)</label>
                  <input type="number" value={editMaxAcc} onChange={(e) => setEditMaxAcc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="50" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditingBranch(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
              <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;
fs.writeFileSync('src/pages/LocationSettings.tsx', code);
