import { Router } from "express";
import {
  listarCoberturas,
  crearCobertura,
  modificarCobertura,
  eliminarCobertura,
} from "../controllers/coberturaController.js";
import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

// Pública: se necesita para poder armar el formulario de registro
router.get("/", listarCoberturas);

// Protegidas: solo administrador
router.post("/", verificarToken, verificarRol("administrador"), crearCobertura);
router.put("/:id", verificarToken, verificarRol("administrador"), modificarCobertura);
router.delete("/:id", verificarToken, verificarRol("administrador"), eliminarCobertura);

export default router;
