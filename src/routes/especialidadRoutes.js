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
  verificarRol("admin"),
  crearEspecialidad
);

router.get(
  "/",
  verificarToken,
  verificarRol("admin"),
  listarEspecialidades
);

router.put(
  "/:id",
  verificarToken,
  verificarRol("admin"),
  modificarEspecialidad
);

router.delete(
  "/:id",
  verificarToken,
  verificarRol("admin"),
  eliminarEspecialidad
);

export default router;