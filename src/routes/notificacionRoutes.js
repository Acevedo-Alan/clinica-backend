import { Router } from "express";

import { listarNotificaciones, marcarLeida } from "../controllers/notificacionController.js";
import { verificarToken } from "../middlewares/auth.js";

const router = Router();

// Cualquier usuario autenticado ve y marca solo sus propias notificaciones
router.get("/", verificarToken, listarNotificaciones);
router.put("/:id/leida", verificarToken, marcarLeida);

export default router;
