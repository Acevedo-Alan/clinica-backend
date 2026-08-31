import { Router } from "express";

import {
  crearTurno,
  cancelarTurno,
  atenderTurno,
  misTurnos,
  turnosMedico,
  turnosSede,
} from "../controllers/turnoController.js";
import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

router.post("/", verificarToken, verificarRol("paciente", "operador"), crearTurno);

// Listados específicos por rol (van antes de cualquier ruta con :id)
router.get("/mios", verificarToken, verificarRol("paciente"), misTurnos);
router.get("/medico", verificarToken, verificarRol("medico"), turnosMedico);
router.get("/sede", verificarToken, verificarRol("operador"), turnosSede);

router.put(
  "/:id/cancelar",
  verificarToken,
  verificarRol("paciente", "operador", "medico"),
  cancelarTurno
);
router.put("/:id/atender", verificarToken, verificarRol("medico"), atenderTurno);

export default router;
