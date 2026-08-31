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

// Todos los endpoints de especialidades requieren administrador

router.post(
  "/",
  verificarToken,
  verificarRol("administrador"),
  crearEspecialidad
);

router.get(
  "/",
  verificarToken,
  verificarRol("administrador"),
  listarEspecialidades
);

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