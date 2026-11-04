import { Router } from "express";

import { fechasDisponibles, horariosDisponibles } from "../controllers/disponibilidadController.js";
import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

router.get("/fechas", verificarToken, verificarRol("paciente", "operador"), fechasDisponibles);
router.get("/horarios", verificarToken, verificarRol("paciente", "operador"), horariosDisponibles);

export default router;
