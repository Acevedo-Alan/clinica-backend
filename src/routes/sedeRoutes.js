import { Router } from "express";

import { crearSede } from "../controllers/sedeController.js";

import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

// Solo administrador

router.post("/", verificarToken, verificarRol("admin"), crearSede);

export default router;