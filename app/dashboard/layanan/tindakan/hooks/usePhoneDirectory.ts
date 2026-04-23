"use client";

import { usePhoneDirectoryContext } from "../contexts/PhoneDirectoryContext";

export function usePhoneDirectory() {
  return usePhoneDirectoryContext();
}
