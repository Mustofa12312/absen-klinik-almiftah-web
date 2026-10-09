import { useState, useEffect } from 'react';
import { MapPin, Search, Edit2, Plus, MoreVertical, X, Crosshair, ClipboardPaste } from 'lucide-react';
import { AdminServices } from '../lib/services';
import type { Branch } from '../lib/services';

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: '', code: '', latitude: '', longitude: '', radius: 100, maxAcc: 50 });

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

  const getCurrentLocation = (isEdit: boolean) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (isEdit) {
            setEditLat(position.coords.latitude.toString());
            setEditLng(position.coords.longitude.toString());
          } else {
            setNewLocation(prev => ({
              ...prev,
              latitude: position.coords.latitude.toString(),
              longitude: position.coords.longitude.toString()
            }));
          }
        },
        (error) => {
          alert('Gagal mengambil lokasi: ' + error.message);
        }
      );
    } else {
      alert('Browser Anda tidak mendukung fitur ini.');
    }
  };

  const handlePasteCoordinates = (text: string, isEdit: boolean) => {
    // Regex for latitude, longitude e.g. "-6.2088, 106.8456" or from maps url
    const coordMatch = text.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (coordMatch) {
      if (isEdit) {
        setEditLat(coordMatch[1]);
        setEditLng(coordMatch[2]);
      } else {
        setNewLocation(prev => ({
          ...prev,
          latitude: coordMatch[1],
          longitude: coordMatch[2]
        }));
      }
    }
  };

  const submitAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.name || !newLocation.code) return;
    setIsSaving(true);
    try {
      await AdminServices.addBranch({
        name: newLocation.name,
        code: newLocation.code,
        address: '-',
        radius: Number(newLocation.radius),
        latitude: parseFloat(newLocation.latitude) || 0,
        longitude: parseFloat(newLocation.longitude) || 0,
        maxAccuracyMeters: Number(newLocation.maxAcc),
        status: 'active'
      });
      setIsAddModalOpen(false);
      setNewLocation({ name: '', code: '', latitude: '', longitude: '', radius: 100, maxAcc: 50 });
      fetchBranches();
    } catch (err: any) {
      console.error(err);
      alert('Gagal menambah lokasi: ' + (err.message || 'Kesalahan tidak diketahui'));
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
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm text-white bg-primary hover:bg-primary/90 transition-colors"
        >
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${loc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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
              <div className="pt-2">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Koordinat Lokasi</label>
                <div className="flex gap-2 mb-3">
                  <button 
                    type="button" 
                    onClick={() => getCurrentLocation(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Crosshair className="w-4 h-4 text-blue-600" />
                    Lokasi Saat Ini
                  </button>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ClipboardPaste className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Paste Koordinat Google Maps..." 
                      onChange={(e) => {
                        handlePasteCoordinates(e.target.value, true);
                        e.target.value = ''; // clear after paste
                      }}
                      className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Latitude</label>
                    <input type="number" step="any" value={editLat} onChange={(e) => setEditLat(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="-6.2088" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Longitude</label>
                    <input type="number" step="any" value={editLng} onChange={(e) => setEditLng(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="106.8456" />
                  </div>
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

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Tambah Lokasi Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitAddLocation} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Nama Lokasi</label>
                  <input type="text" required value={newLocation.name} onChange={(e) => setNewLocation({...newLocation, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="Klinik Pusat" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Kode Lokasi</label>
                  <input type="text" required value={newLocation.code} onChange={(e) => setNewLocation({...newLocation, code: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="HQ-01" />
                </div>
              </div>

              <div className="pt-2">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Koordinat Lokasi</label>
                <div className="flex gap-2 mb-3">
                  <button 
                    type="button" 
                    onClick={() => getCurrentLocation(false)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Crosshair className="w-4 h-4 text-blue-600" />
                    Ambil Lokasi Saat Ini
                  </button>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ClipboardPaste className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Atau Paste Koordinat / Link Maps..." 
                      onChange={(e) => {
                        handlePasteCoordinates(e.target.value, false);
                        e.target.value = ''; // clear after paste
                      }}
                      className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Latitude</label>
                    <input type="number" step="any" required value={newLocation.latitude} onChange={(e) => setNewLocation({...newLocation, latitude: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="-6.2088" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Longitude</label>
                    <input type="number" step="any" required value={newLocation.longitude} onChange={(e) => setNewLocation({...newLocation, longitude: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="106.8456" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Radius (Meter)</label>
                  <input type="number" required value={newLocation.radius} onChange={(e) => setNewLocation({...newLocation, radius: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="100" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Maks. Akurasi (Meter)</label>
                  <input type="number" required value={newLocation.maxAcc} onChange={(e) => setNewLocation({...newLocation, maxAcc: Number(e.target.value)})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" placeholder="50" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {isSaving ? 'Menyimpan...' : 'Simpan Lokasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
