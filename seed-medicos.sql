-- Médicos de prueba adicionales (varias especialidades).
-- Se importa una sola vez sobre la base `clinica` ya existente (después de clinica.sql).
-- Si se repite, falla en `usuario` por los UNIQUE de dni/email.
-- Contraseña de todos: 123456 (mismo hash bcrypt que los usuarios de clinica.sql).
USE `clinica`;

INSERT IGNORE INTO `especialidad` (`descripcion`) VALUES
('Cardiología'), ('Pediatría'), ('Ginecología'), ('Dermatología'), ('Oftalmología'), ('Clínica médica');

SET @pw = '$2b$10$yci4gkDRlTp37AikhF9y2OmwtyHmjmEL9ThOLgqvaI7ZIGo9UcAOC';

INSERT INTO `usuario` (`apellido`, `nombre`, `fecha_nacimiento`, `password`, `rol`, `email`, `telefono`, `dni`, `id_sede`, `id_cobertura`) VALUES
('Mendez',  'Laura',    '1983-02-17', @pw, 'medico', 'lmendez@clinica.com',  '3424300101', '21300101', 1, NULL),
('Rios',    'Martin',   '1978-09-05', @pw, 'medico', 'mrios@clinica.com',    '3424300102', '21300102', 1, NULL),
('Souza',   'Andres',   '1985-11-23', @pw, 'medico', 'asouza@clinica.com',   '3424300103', '21300103', 2, NULL),
('Costa',   'Valeria',  '1988-04-12', @pw, 'medico', 'vcosta@clinica.com',   '3424300104', '21300104', 2, NULL),
('Gimenez', 'Mario',    '1981-07-30', @pw, 'medico', 'mgimenez@clinica.com', '3424300105', '21300105', 1, NULL),
('Navarro', 'Diego',    '1979-01-19', @pw, 'medico', 'dnavarro@clinica.com', '3424300106', '21300106', 2, NULL),
('Ibarra',  'Camila',   '1990-06-08', @pw, 'medico', 'cibarra@clinica.com',  '3424300107', '21300107', 1, NULL);

-- Especialidad de cada médico
INSERT INTO `medico_especialidad` (`id_medico`, `id_especialidad`)
SELECT u.id, e.id FROM (
  SELECT '21300101' AS dni, 'Clínica médica' AS esp UNION ALL
  SELECT '21300102', 'Cardiología'  UNION ALL
  SELECT '21300103', 'Traumatología' UNION ALL
  SELECT '21300104', 'Pediatría'    UNION ALL
  SELECT '21300105', 'Ginecología'  UNION ALL
  SELECT '21300106', 'Dermatología' UNION ALL
  SELECT '21300107', 'Oftalmología'
) m
JOIN `usuario` u ON u.dni = m.dni
JOIN `especialidad` e ON e.descripcion = m.esp;

-- Una agenda futura por médico (semana del 9 al 13 de noviembre de 2026), en su sede
INSERT INTO `agenda` (`hora_entrada`, `hora_salida`, `fecha`, `id_medico`, `id_especialidad`, `id_sede`)
SELECT a.entrada, a.salida, a.fecha, u.id, me.id_especialidad, u.id_sede
FROM (
  SELECT '21300101' AS dni, '08:00' AS entrada, '12:00' AS salida, '2026-11-09' AS fecha UNION ALL
  SELECT '21300102', '09:00', '13:00', '2026-11-10' UNION ALL
  SELECT '21300103', '14:00', '18:00', '2026-11-09' UNION ALL
  SELECT '21300104', '08:00', '12:00', '2026-11-11' UNION ALL
  SELECT '21300105', '15:00', '19:00', '2026-11-12' UNION ALL
  SELECT '21300106', '10:00', '14:00', '2026-11-12' UNION ALL
  SELECT '21300107', '09:00', '13:00', '2026-11-13'
) a
JOIN `usuario` u ON u.dni = a.dni
JOIN `medico_especialidad` me ON me.id_medico = u.id;
