import { Router } from "express";

import {
  crearEspecialidad,
  listarEspecialidades,
  modificarEspecialidad,
  eliminarEspecialidad,
} from "../controllers/especialidadController.js";

import {
  verificarToken,
  verificarRol,
} from "../middlewares/auth.js";

const router = Router();

// El listado es un selector usado por todos los roles (agenda, turnos, etc.);
// el alta/modificación/baja quedan exclusivas de administrador.

router.post(
  "/",
  verificarToken,
  verificarRol("administrador"),
  crearEspecialidad
);

router.get("/", verificarToken, listarEspecialidades);

router.put(
  "/:id",
  verificarToken,
  verificarRol("administrador"),
  modificarEspecialidad
);

router.delete(
  "/:id",
  verificarToken,
  verificarRol("administrador"),
  eliminarEspecialidad
);

export default router;