import { Router } from "express";

import {
  crearHistorial,
  listarHistorialPaciente,
} from "../controllers/historialController.js";
import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

router.post("/", verificarToken, verificarRol("medico"), crearHistorial);

router.get(
  "/paciente/:id_paciente",
  verificarToken,
  verificarRol("paciente", "medico"),
  listarHistorialPaciente
);

export default router;
