import { Router } from "express";

import { listarAuditoria } from "../controllers/auditoriaController.js";

import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

// Solo administrador puede consultar los registros de auditoría
router.get("/", verificarToken, verificarRol("administrador"), listarAuditoria);

export default router;
