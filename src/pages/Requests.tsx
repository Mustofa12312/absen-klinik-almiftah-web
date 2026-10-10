import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AdminServices } from '../lib/services';

interface Request {
  id: string;
  employeeName: string;
  type: string;
  date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export default function Requests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const empSnap = await getDocs(collection(db, 'employees'));
      const empMap: Record<string, string> = {};
      empSnap.docs.forEach(doc => {
        empMap[doc.id] = doc.data().name || 'Unknown';
      });

      const leaveSnap = await getDocs(collection(db, 'leave_requests'));
      const corrSnap = await getDocs(collection(db, 'correction_requests'));
      
      const all: Request[] = [];
      
      leaveSnap.docs.forEach(doc => {
        const d = doc.data();
        all.push({
          id: doc.id,
          employeeName: d.employeeName || empMap[d.employeeId] || 'Unknown',
          type: d.type || 'Izin',
          date: d.date || d.startDate || '-',
          reason: d.reason || '-',
          status: (d.status || 'PENDING').toUpperCase() as any
        });
      });
      
      corrSnap.docs.forEach(doc => {
        const d = doc.data();
        all.push({
          id: doc.id,
          employeeName: d.employeeName || empMap[d.employeeId] || 'Unknown',
          type: 'Koreksi',
          date: d.date || '-',
          reason: d.reason || '-',
          status: (d.status || 'PENDING').toUpperCase() as any
        });
      });

      // Sort by date descending
      all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRequests(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id: string, type: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await AdminServices.updateRequestStatus(id, status, type);
      fetchRequests();
    } catch (e) {
      alert('Gagal update status');
    }
  };

  const filtered = requests.filter(r => {
    const matchSearch = r.employeeName.toLowerCase().includes(search.toLowerCase()) || 
      r.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus ? r.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pengajuan & Koreksi</h1>
          <p className="mt-1 text-sm text-gray-500">Review dan berikan persetujuan untuk pengajuan pegawai.</p>
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
              placeholder="Cari nama atau jenis pengajuan..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-lg border"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Menunggu</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pengajuan</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal & Alasan</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Belum ada pengajuan</td></tr>
              ) : filtered.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{req.employeeName}</div>
                        <div className="text-sm font-semibold text-blue-600">{req.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 flex items-center">
                      <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                      {req.date}
                    </div>
                    <div className="text-sm text-gray-500 mt-1 line-clamp-2">{req.reason}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 
                      req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {req.status === 'PENDING' && (
                      <div className="flex justify-end items-center space-x-2">
                        <button 
                          onClick={() => handleUpdateStatus(req.id, req.type, 'APPROVED')}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(req.id, req.type, 'REJECTED')}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </button>
                      </div>
                    )}
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
