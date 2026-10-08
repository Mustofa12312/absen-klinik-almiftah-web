import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';

// Interfaces
export interface Branch {
  id?: string;
  name: string;
  code: string;
  address: string;
  radius: number;
  latitude?: number;
  longitude?: number;
  maxAccuracyMeters?: number;
  status: 'active' | 'inactive';
}

export interface Employee {
  id?: string;
  name: string;
  role: string;
  branchId: string;
  status: 'active' | 'inactive';
  deviceBound: boolean;
  deviceId?: string;
  deviceName?: string;
  strNumber?: string;
}

export const AdminServices = {
  // --- BRANCHES ---
  async getBranches(): Promise<Branch[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'branches'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
    } catch (error) {
      console.error("Gagal mengambil data cabang:", error);
      throw error;
    }
  },

  async updateBranchRadius(branchId: string, newRadius: number): Promise<void> {
    try {
      const branchRef = doc(db, 'branches', branchId);
      await updateDoc(branchRef, { radius: newRadius });
    } catch (error) {
      console.error("Gagal update radius cabang:", error);
      throw error;
    }
  },

  async updateBranchLocation(branchId: string, data: { latitude: number, longitude: number, radius: number, maxAccuracyMeters: number }): Promise<void> {
    try {
      const branchRef = doc(db, 'branches', branchId);
      await updateDoc(branchRef, data);
    } catch (error) {
      console.error("Gagal update lokasi cabang:", error);
      throw error;
    }
  },

  async addEmployee(employeeData: Omit<Employee, 'id'>): Promise<void> {
    try {
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'employees'), employeeData);
    } catch (error) {
      console.error("Gagal menambah pegawai:", error);
      throw error;
    }
  },

  // --- EMPLOYEES ---
  async getEmployeesByBranch(branchId?: string): Promise<Employee[]> {
    try {
      let q = collection(db, 'employees');
      if (branchId) {
        // @ts-ignore
        q = query(q, where("branchId", "==", branchId));
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    } catch (error) {
      console.error("Gagal mengambil data pegawai:", error);
      throw error;
    }
  },

  async resetDeviceBinding(employeeId: string): Promise<void> {
    try {
      const empRef = doc(db, 'employees', employeeId);
      await updateDoc(empRef, {
        deviceBound: false,
        deviceId: null,
        deviceName: null
      });
    } catch (error) {
      console.error("Gagal mereset perangkat:", error);
      throw error;
    }
  },

  // --- REQUESTS ---
  async updateRequestStatus(requestId: string, status: 'APPROVED' | 'REJECTED', type: string): Promise<void> {
    try {
      const collectionName = type === 'Koreksi' ? 'correction_requests' : 'leave_requests';
      const reqRef = doc(db, collectionName, requestId);
      await updateDoc(reqRef, { status });
    } catch (error) {
      console.error("Gagal update status pengajuan:", error);
      throw error;
    }
  }
};
