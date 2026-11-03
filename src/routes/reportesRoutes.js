import { Router } from "express";

import { obtenerReportes } from "../controllers/reportesController.js";
import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

router.get("/", verificarToken, verificarRol("administrador"), obtenerReportes);

export default router;
