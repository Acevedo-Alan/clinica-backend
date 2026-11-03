import { Router } from "express";

import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  modificarUsuario,
} from "../controllers/usuarioController.js";

import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

// Gestión de usuarios: exclusiva de administrador.
// El alta de pacientes sigue por /auth/registro (autogestionada).

router.get("/", verificarToken, verificarRol("administrador"), listarUsuarios);

router.get("/:id", verificarToken, verificarRol("administrador"), obtenerUsuario);

router.post("/", verificarToken, verificarRol("administrador"), crearUsuario);

router.put("/:id", verificarToken, verificarRol("administrador"), modificarUsuario);

export default router;
