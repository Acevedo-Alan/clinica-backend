import { Router } from "express";

import {
	listarSedes,
	crearSede,
	modificarSede,
	eliminarSede,
} from "../controllers/sedeController.js";

import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

// Todos los endpoints de sedes requieren administrador.
router.get("/", verificarToken, verificarRol("administrador"), listarSedes);
router.post("/", verificarToken, verificarRol("administrador"), crearSede);
router.put("/:id", verificarToken, verificarRol("administrador"), modificarSede);
router.delete("/:id", verificarToken, verificarRol("administrador"), eliminarSede);


export default router;