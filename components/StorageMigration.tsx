"use client";

import { useEffect } from "react";
import { migrateStoicSipsToVigil } from "@/lib/storage-migration";

/** Runs one-time localStorage migration from stoicsips_* to vigil_* on app load. */
export function StorageMigration() {
  useEffect(() => {
    migrateStoicSipsToVigil();
  }, []);
  return null;
}
