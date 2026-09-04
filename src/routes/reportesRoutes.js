import { Router } from "express";

import {
  turnosPorEspecialidad,
  turnosPorSede,
  rankingMedicos,
  tasaCancelacion,
} from "../controllers/reportesController.js";

import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

// Todos los reportes requieren rol administrador
router.get(
  "/turnos-por-especialidad",
  verificarToken,
  verificarRol("administrador"),
  turnosPorEspecialidad
);

router.get(
  "/turnos-por-sede",
  verificarToken,
  verificarRol("administrador"),
  turnosPorSede
);

router.get(
  "/ranking-medicos",
  verificarToken,
  verificarRol("administrador"),
  rankingMedicos
);

router.get(
  "/tasa-cancelacion",
  verificarToken,
  verificarRol("administrador"),
  tasaCancelacion
);

export default router;
