"use server";

import { addPatient } from "./addPatient";
import { editPatient } from "./editPatient";
import { deletePatient } from "./deletePatient";

/* Hanya server actions (add/edit/delete). refreshPatients adalah client-side, jangan diekspor dari sini. */
export { addPatient, editPatient, deletePatient };
