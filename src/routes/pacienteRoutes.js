import { Router } from "express";

import { buscarPacientes } from "../controllers/pacienteController.js";
import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

router.get("/", verificarToken, verificarRol("operador", "medico", "administrador"), buscarPacientes);

export default router;
