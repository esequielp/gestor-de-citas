/**
 * AgendaPro - Debug Logger
 * 
 * Módulo centralizado de logging para capturar errores del frontend y del backend.
 * Los logs se escriben a la consola y se almacenan en memoria para poder
 * revisarlos desde la consola del navegador o enviarlos al backend.
 * 
 * Uso:
 *   import { logger } from '../utils/logger';
 *   logger.error('BookingWizard', 'Error fetching slots', { branchId, err });
 *   logger.warn('ChatWidget', 'No employees found');
 *   logger.info('App', 'View changed to BOOKING');
 * 
 *   // Para ver todos los logs acumulados en la consola del navegador:
 *   window.__AGENDAPRO_LOGS
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    module: string;
    message: string;
    data?: any;
}

const MAX_LOG_ENTRIES = 500;

class Logger {
    private logs: LogEntry[] = [];

    constructor() {
        // Exponer logs en window para inspección desde DevTools
        if (typeof window !== 'undefined') {
            (window as any).__AGENDAPRO_LOGS = this.logs;
            (window as any).__AGENDAPRO_DUMP_LOGS = () => this.dumpLogs();
        }

        // Capturar errores no manejados de React y JS general
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.error('GLOBAL', `Unhandled Error: ${event.message}`, {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                this.error('GLOBAL', `Unhandled Promise Rejection: ${event.reason}`, {
                    reason: String(event.reason),
                });
            });
        }
    }

    private addEntry(level: LogLevel, module: string, message: string, data?: any) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            module,
            message,
            data: data ? this.sanitize(data) : undefined,
        };

        this.logs.push(entry);

        // Evitar crecimiento infinito
        if (this.logs.length > MAX_LOG_ENTRIES) {
            this.logs.splice(0, this.logs.length - MAX_LOG_ENTRIES);
        }

        // Imprimir en consola con color
        const color = level === 'ERROR' ? '#e74c3c' : level === 'WARN' ? '#f39c12' : '#3498db';
        const icon = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : 'ℹ️';
        console.log(
            `%c${icon} [${level}] [${module}] ${message}`,
            `color: ${color}; font-weight: bold;`,
            data || ''
        );
    }

    private sanitize(data: any): any {
        try {
            // Evitar objetos circulares
            return JSON.parse(JSON.stringify(data, (key, value) => {
                if (value instanceof Error) {
                    return { message: value.message, stack: value.stack, name: value.name };
                }
                return value;
            }));
        } catch {
            return String(data);
        }
    }

    info(module: string, message: string, data?: any) {
        this.addEntry('INFO', module, message, data);
    }

    warn(module: string, message: string, data?: any) {
        this.addEntry('WARN', module, message, data);
    }

    error(module: string, message: string, data?: any) {
        this.addEntry('ERROR', module, message, data);
    }

    /** Retorna todos los logs acumulados */
    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    /** Retorna solo errores */
    getErrors(): LogEntry[] {
        return this.logs.filter(l => l.level === 'ERROR');
    }

    /** Imprime un volcado completo en la consola */
    dumpLogs() {
        console.group('📋 AgendaPro - Log Dump');
        this.logs.forEach(entry => {
            const color = entry.level === 'ERROR' ? 'red' : entry.level === 'WARN' ? 'orange' : 'blue';
            console.log(
                `%c[${entry.timestamp}] [${entry.level}] [${entry.module}]`,
                `color: ${color}`,
                entry.message,
                entry.data || ''
            );
        });
        console.groupEnd();
        return `${this.logs.length} entradas totales, ${this.getErrors().length} errores`;
    }
}

export const logger = new Logger();
