import { Router } from "express";

import { datosLanding } from "../controllers/publicoController.js";

const router = Router();

// Sin verificarToken a propósito: es la información de la portada pública.
router.get("/landing", datosLanding);

export default router;
