import { Router } from "express";

import { listarAuditoria } from "../controllers/auditoriaController.js";
import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

// Pantalla de solo lectura: exclusiva de administrador.
router.get("/", verificarToken, verificarRol("administrador"), listarAuditoria);

export default router;
