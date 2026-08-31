import { Router } from "express";

import {
  crearAgenda,
  listarAgenda,
  modificarAgenda,
  eliminarAgenda,
} from "../controllers/agendaController.js";

import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

// Solo médico (su propia agenda) u operador (cualquier agenda). Paciente y
// cualquier otro rol quedan afuera con 403 por verificarRol.

router.post("/", verificarToken, verificarRol("medico", "operador"), crearAgenda);

router.get("/", verificarToken, verificarRol("medico", "operador"), listarAgenda);

router.put("/:id", verificarToken, verificarRol("medico", "operador"), modificarAgenda);

router.delete("/:id", verificarToken, verificarRol("medico", "operador"), eliminarAgenda);

export default router;
