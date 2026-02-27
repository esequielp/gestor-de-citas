import { supabaseAdmin } from '../config/supabase.js';

async function runMigration() {
    console.log('Creating employee_exceptions table...');

    const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql_text: `
      CREATE TABLE IF NOT EXISTS employee_exceptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
        fecha DATE NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'NO_LABORABLE',
        ranges JSONB DEFAULT '[]'::jsonb,
        motivo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        UNIQUE(empleado_id, fecha)
      );
    `
    });

    if (error) {
        console.log('RPC not available, trying direct query via REST...');
        // Fallback: create table via raw SQL through supabase-js
        const { data, error: err2 } = await supabaseAdmin.from('employee_exceptions').select('id').limit(1);
        if (err2 && err2.code === '42P01') {
            console.log('Table does not exist. Please create it via the Supabase SQL editor.');
            console.log(`
CREATE TABLE IF NOT EXISTS employee_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'NO_LABORABLE',
    ranges JSONB DEFAULT '[]'::jsonb,
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(empleado_id, fecha)
);
      `);
        } else {
            console.log('Table employee_exceptions already exists or accessible.');
        }
    } else {
        console.log('Migration completed successfully.');
    }

    process.exit(0);
}

runMigration();
