import { Router } from "express";

import { listarMedicos } from "../controllers/medicoController.js";
import { verificarToken } from "../middlewares/auth.js";

const router = Router();

// Cualquier rol autenticado: lo usan operador, médico y paciente.
router.get("/", verificarToken, listarMedicos);

export default router;
