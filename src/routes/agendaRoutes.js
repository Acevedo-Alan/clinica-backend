import { Router } from "express";
import {
  crearAgenda,
  listarAgenda,
  modificarAgenda,
  eliminarAgenda,
} from "../controllers/agendaController.js";
import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

// Todos los endpoints de agenda requieren estar autenticado como médico u operador
// (paciente y cualquier otro rol reciben 403 vía verificarRol)
router.post("/", verificarToken, verificarRol("medico", "operador"), crearAgenda);
router.get("/", verificarToken, verificarRol("medico", "operador"), listarAgenda);
router.put("/:id", verificarToken, verificarRol("medico", "operador"), modificarAgenda);
router.delete("/:id", verificarToken, verificarRol("medico", "operador"), eliminarAgenda);

export default router;
