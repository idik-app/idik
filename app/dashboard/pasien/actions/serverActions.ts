"use server";

import { addPatient } from "./addPatient";
import { editPatient } from "./editPatient";
import { deletePatient } from "./deletePatient";
import { refreshPatients } from "./refreshPatients";

/* Semua server action diekspor dari sini */
export { addPatient, editPatient, deletePatient, refreshPatients };
