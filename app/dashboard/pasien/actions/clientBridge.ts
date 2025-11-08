"use client";

import {
  addPatient,
  editPatient,
  deletePatient,
  refreshPatients,
} from "./serverActions";

/* Bridge murni client → memanggil fungsi server */
export async function addPatientAction(data: any) {
  return await addPatient(data);
}

export async function editPatientAction(id: string, data: any) {
  return await editPatient(id, data);
}

export async function deletePatientAction(id: string) {
  return await deletePatient(id);
}

export async function refreshPatientsAction() {
  return await refreshPatients();
}
