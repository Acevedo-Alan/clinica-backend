import { Router } from "express";
import { listarCoberturas } from "../controllers/coberturaController.js";

const router = Router();

// Pública: se necesita para poder armar el formulario de registro
router.get("/", listarCoberturas);

export default router;
