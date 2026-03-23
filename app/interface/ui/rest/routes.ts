// routes.ts
import express from "express";
import { TindakanService } from "@/modules/tindakan/services/tindakanService";
const router = express.Router();

router.get("/tindakan", (_, res) => {
  res.json(TindakanService.daftarTindakan());
});

export default router;
