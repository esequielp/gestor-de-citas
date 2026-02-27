/**
 * AgendaPro - Backend Logger
 * 
 * Módulo centralizado de logging para el servidor Express.
 * Escribe los logs a archivos en disco y a la consola.
 * 
 * Archivos generados:
 *   - logs/error.log     → Solo errores
 *   - logs/combined.log  → Todos los niveles
 * 
 * Uso:
 *   import { backendLogger } from '../utils/logger.js';
 *   backendLogger.error('AppointmentService', 'Error fetching slots', { branchId, err });
 *   backendLogger.warn('Tenant', 'Invalid tenant slug attempted', { slug });
 *   backendLogger.info('Server', 'Server started on port 3000');
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta de logs relativa a la raíz del proyecto
const LOG_DIR = path.resolve(__dirname, '../../logs');

// Crear carpeta si no existe
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const ERROR_LOG = path.join(LOG_DIR, 'error.log');
const COMBINED_LOG = path.join(LOG_DIR, 'combined.log');

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function formatEntry(level: LogLevel, module: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let line = `[${timestamp}] [${level}] [${module}] ${message}`;
    if (data) {
        try {
            const serialized = JSON.stringify(data, (key, value) => {
                if (value instanceof Error) {
                    return { message: value.message, stack: value.stack, name: value.name };
                }
                return value;
            }, 2);
            line += `\n  DATA: ${serialized}`;
        } catch {
            line += `\n  DATA: ${String(data)}`;
        }
    }
    return line + '\n';
}

function appendToFile(filePath: string, content: string) {
    try {
        fs.appendFileSync(filePath, content, 'utf-8');
    } catch (err) {
        console.error('Error writing to log file:', err);
    }
}

export const backendLogger = {

    info(module: string, message: string, data?: any) {
        const entry = formatEntry('INFO', module, message, data);
        const icon = 'ℹ️';
        console.log(`${icon} [INFO] [${module}] ${message}`, data || '');
        appendToFile(COMBINED_LOG, entry);
    },

    warn(module: string, message: string, data?: any) {
        const entry = formatEntry('WARN', module, message, data);
        const icon = '⚠️';
        console.warn(`${icon} [WARN] [${module}] ${message}`, data || '');
        appendToFile(COMBINED_LOG, entry);
    },

    error(module: string, message: string, data?: any) {
        const entry = formatEntry('ERROR', module, message, data);
        const icon = '❌';
        console.error(`${icon} [ERROR] [${module}] ${message}`, data || '');
        appendToFile(ERROR_LOG, entry);
        appendToFile(COMBINED_LOG, entry);
    },
};
