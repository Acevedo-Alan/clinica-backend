import { Router } from "express";

import {
  crearAgenda,
  crearAgendaRecurrente,
  listarAgenda,
  modificarAgenda,
  eliminarAgenda,
} from "../controllers/agendaController.js";

import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

// Alta/modificación/baja: solo médico (su propia agenda) u operador (cualquier agenda).
// Lectura: también paciente, que la necesita para elegir un turno disponible.

router.post("/", verificarToken, verificarRol("medico", "operador"), crearAgenda);

router.post("/recurrente", verificarToken, verificarRol("medico", "operador"), crearAgendaRecurrente);

router.get("/", verificarToken, verificarRol("medico", "operador", "paciente"), listarAgenda);

router.put("/:id", verificarToken, verificarRol("medico", "operador"), modificarAgenda);

router.delete("/:id", verificarToken, verificarRol("medico", "operador"), eliminarAgenda);

export default router;
