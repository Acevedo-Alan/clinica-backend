import { Router } from "express";
import { registro, login, perfil } from "../controllers/authController.js";
import { verificarToken } from "../middlewares/auth.js";

const router = Router();

// Públicas
router.post("/registro", registro);
router.post("/login", login);

// Protegida solo por verificarToken (cualquier rol autenticado)
router.get("/perfil", verificarToken, perfil);

export default router;
