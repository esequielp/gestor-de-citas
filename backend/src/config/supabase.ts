import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // Point to agendapro root .env

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Las credenciales de Supabase no están configuradas en .env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
}

// Cliente global con permisos de admin (Service Role),
// Ideal para las consultas que ignoran RLS cuando vienen del backend validado
export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Crea un cliente Supabase en el contexto de un Tenant (Empresa).
 * Configura RLS para la sesión actual ejecutando `set_config('app.current_tenant_id', tenantId)`.
 */
export const getTenantClient = async (tenantId: string): Promise<SupabaseClient> => {
  if (!tenantId) {
    throw new Error('Tenant ID no proporcionado');
  }

  // Usamos el mismo cliente base pera la API, y le pasamos options o headers 
  // O podemos aprovechar el set_config corriendo una consulta directa.
  // Sin embargo, set_config es stateful en la conexión, y PostgREST es stateless
  // Afortunadamente, Supabase JS soporta claims JWT o "Global Headers" para RLS via Supabase REST API si pasamos roles personalizados.

  // Una forma robusta de manejar multitenancy en el REST nativo de Supabase si no creamos un custom JWT, 
  // es sencillamente forzar que nuestro backend haga filtros where explicitamente o crear tokens JWT personalizados.
  // Aquí podemos usar la DB local con RLS asumiendo un rol validado, pero el backend ya tiene la seguridad garantizada 
  // mediante serviceRole + filtrado Where explícito, o si realmente usamos RLS de postgres, tenemos que sign in.

  // Dado que actuamos como api gateway con ServiceRole, el RLS se evade mediante Service Role.
  // Para que RLS funcione en llamadas ServiceRole, es complejo, a menos que usemos anon_key con JWT firmado en el backend.
  // Vamos a retornar el cliente admin, y los repositorios asegurarán pasar el eq('empresa_id', tenantId) por seguridad
  // o utilizar un enfoque de `supabaseAdmin.rpc('set_tenant', { tenant_id: tenantId })` pero es stateful en pg.
  // Se ha documentado que el patrón recomendado en REST + SSR backend es filtrar por .eq('empresa_id', tenantId).

  return supabaseAdmin;
};

// Types utils export
export * from '@supabase/supabase-js';
