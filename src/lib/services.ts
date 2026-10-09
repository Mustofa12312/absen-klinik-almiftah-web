import { collection, getDocs, doc, updateDoc, addDoc, writeBatch, query, where, setDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, secondaryAuth } from './firebase';

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
  phone?: string;
}

export interface Shift {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  tolerance: number; // minutes
  crossesMidnight: boolean;
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

  async addBranch(branchData: Omit<Branch, 'id'>): Promise<void> {
    try {
      await addDoc(collection(db, 'branches'), branchData);
    } catch (error) {
      console.error("Gagal menambah cabang:", error);
      throw error;
    }
  },

  async updateBranch(branchId: string, data: Partial<Omit<Branch, 'id'>>): Promise<void> {
    try {
      const branchRef = doc(db, 'branches', branchId);
      await updateDoc(branchRef, data);
    } catch (error) {
      console.error("Gagal update cabang:", error);
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
      await addDoc(collection(db, 'employees'), employeeData);
    } catch (error) {
      console.error("Gagal menambah pegawai:", error);
      throw error;
    }
  },

  async addEmployeeAndAuth(employeeData: Omit<Employee, 'id'>): Promise<void> {
    try {
      const email = `${employeeData.strNumber || employeeData.phone || 'baru'}@almiftah.com`.toLowerCase();
      const password = 'Klinik123';
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = userCredential.user.uid;

      await setDoc(doc(db, 'employees', newUid), {
        ...employeeData,
        email: email
      });
    } catch (error) {
      console.error("Gagal menambah pegawai dan auth:", error);
      // Fallback to normal add if auth fails (e.g. email already exists)
      await addDoc(collection(db, 'employees'), employeeData);
    }
  },

  async updateEmployee(employeeId: string, data: Partial<Omit<Employee, 'id'>>): Promise<void> {
    try {
      const empRef = doc(db, 'employees', employeeId);
      await updateDoc(empRef, data);
    } catch (error) {
      console.error("Gagal update pegawai:", error);
      throw error;
    }
  },

  async addEmployeesBulk(employeesData: Partial<Employee>[]): Promise<void> {
    try {
      // Limit to 500 per batch as per Firestore limits
      for (let i = 0; i < employeesData.length; i += 500) {
        const chunk = employeesData.slice(i, i + 500);
        const currentBatch = writeBatch(db);
        chunk.forEach(emp => {
          if (emp.id) {
            // Update existing
            const empRef = doc(db, 'employees', emp.id);
            const { id: _id, ...dataToUpdate } = emp;
            currentBatch.set(empRef, dataToUpdate, { merge: true });
          } else {
            // Create new
            const empRef = doc(collection(db, 'employees'));
            currentBatch.set(empRef, emp);
          }
        });
        await currentBatch.commit();
      }
    } catch (error) {
      console.error("Gagal import pegawai:", error);
      throw error;
    }
  },

  async generateAuthAccounts(): Promise<{ success: number, failed: number }> {
    const snap = await getDocs(collection(db, 'employees'));
    let successCount = 0;
    let failedCount = 0;

    for (const docSnap of snap.docs) {
      const empId = docSnap.id;
      const data = docSnap.data();

      // Firestore auto-ids are 20 chars, Firebase Auth uids are 28 chars
      // If it's already 28 chars, it might already have an Auth account
      if (empId.length >= 28) continue; 

      const email = `${data.strNumber || data.phone || empId.substring(0,8)}@almiftah.com`.toLowerCase();
      const password = 'Klinik123'; // Default password

      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUid = userCredential.user.uid;
        
        // Create new doc with Auth uid
        await setDoc(doc(db, 'employees', newUid), {
          ...data,
          email: email
        });

        // Delete old doc
        await deleteDoc(doc(db, 'employees', empId));
        successCount++;
      } catch (err: any) {
        console.error(`Gagal membuat auth untuk ${data.name}:`, err);
        failedCount++;
      }
    }
    return { success: successCount, failed: failedCount };
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
  },

  // --- SHIFTS ---
  async addShift(shiftData: Omit<Shift, 'id'>): Promise<void> {
    try {
      await addDoc(collection(db, 'shifts'), shiftData);
    } catch (error) {
      console.error("Gagal menambah shift:", error);
      throw error;
    }
  },

  async addShiftsBulk(shiftsData: Partial<Shift>[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      for (const shift of shiftsData) {
        if (shift.id) {
          const shiftRef = doc(db, 'shifts', shift.id);
          const { id: _id, ...updateData } = shift;
          batch.set(shiftRef, updateData, { merge: true });
        } else {
          const newDocRef = doc(collection(db, 'shifts'));
          batch.set(newDocRef, shift);
        }
      }
      
      await batch.commit();
    } catch (error) {
      console.error("Gagal menambah shift massal:", error);
      throw error;
    }
  }
};

// --- HOLIDAYS ---
export const HolidayServices = {
  async addHoliday(data: { date: string; name: string; description: string; scope: string }): Promise<void> {
    try {
      await addDoc(collection(db, 'holidays'), { ...data, isActive: true });
    } catch (error) {
      console.error("Gagal menambah hari libur:", error);
      throw error;
    }
  },
  async updateHoliday(id: string, data: Partial<{ date: string; name: string; description: string; scope: string; isActive: boolean }>): Promise<void> {
    try {
      await updateDoc(doc(db, 'holidays', id), data);
    } catch (error) {
      console.error("Gagal update hari libur:", error);
      throw error;
    }
  },
};
