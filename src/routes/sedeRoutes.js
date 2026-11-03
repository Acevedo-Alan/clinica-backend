import { Router } from "express";

import {
  crearSede,
  listarSedes,
  modificarSede,
  eliminarSede,
} from "../controllers/sedeController.js";

import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

// El listado es un selector usado por todos los roles (agenda, turnos, etc.);
// el alta/modificación/baja quedan exclusivas de administrador.

router.post("/", verificarToken, verificarRol("administrador"), crearSede);

router.get("/", verificarToken, listarSedes);

router.put("/:id", verificarToken, verificarRol("administrador"), modificarSede);

router.delete("/:id", verificarToken, verificarRol("administrador"), eliminarSede);

export default router;
