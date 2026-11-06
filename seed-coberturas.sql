-- Coberturas y obras sociales adicionales para el registro de pacientes.
-- Re-ejecutable: INSERT IGNORE respeta el UNIQUE de `nombre`, así que no duplica.
USE `clinica`;
SET NAMES utf8mb4;

INSERT IGNORE INTO `cobertura` (`nombre`) VALUES
('OSDE'),
('Swiss Medical'),
('Galeno'),
('Medifé'),
('Omint'),
('Medicus'),
('Accord Salud'),
('Sancor Salud'),
('OSECAC'),
('OSPE'),
('OSDEPYM'),
('UP (Unión Personal)'),
('PAMI'),
('Particular (sin cobertura)');
