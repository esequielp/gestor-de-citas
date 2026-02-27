-- 1. Create tables and relationships

-- EMPRESAS (Tenants)
CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SUCURSALES
CREATE TABLE IF NOT EXISTS sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    service_ids JSONB DEFAULT '[]'::jsonb,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SERVICIOS
CREATE TABLE IF NOT EXISTS servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    duracion_minutos INTEGER NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- EMPLEADOS
CREATE TABLE IF NOT EXISTS empleados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
    nombre TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    role TEXT DEFAULT 'Staff',
    avatar_url TEXT,
    service_ids JSONB DEFAULT '[]'::jsonb,
    weekly_schedule JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CITAS
CREATE TABLE IF NOT EXISTS citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
    empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    servicio_id UUID NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    estado TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, CONFIRMADA, CANCELADA, COMPLETADA
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SESIONES/TRATAMIENTOS
CREATE TABLE IF NOT EXISTS sesiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cita_id UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
    numero_sesion INTEGER NOT NULL DEFAULT 1,
    estado TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, COMPLETADA, CANCELADA
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CONFIGURACIONES
CREATE TABLE IF NOT EXISTS configuraciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
    branding_logo_url TEXT,
    branding_color_primario TEXT,
    recordatorios_whatsapp BOOLEAN DEFAULT false,
    recordatorios_email BOOLEAN DEFAULT false,
    dias_anticipacion_recordatorio INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RECORDATORIOS
CREATE TABLE IF NOT EXISTS recordatorios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    cita_id UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- WHATSAPP, EMAIL
    estado TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, ENVIADO, FALLIDO
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Row Level Security (RLS) policies

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordatorios ENABLE ROW LEVEL SECURITY;

-- Creating a function to identify the current tenant
-- To use this: SET app.current_tenant_id = 'xxxx-xxxx-xxxx-xxxx';
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true)::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS for empresas (Allow read/write if they are the current tenant)
CREATE POLICY tenant_isolation_empresas ON empresas
    FOR ALL USING (id = current_tenant_id());

CREATE POLICY tenant_isolation_sucursales ON sucursales
    FOR ALL USING (empresa_id = current_tenant_id());

CREATE POLICY tenant_isolation_servicios ON servicios
    FOR ALL USING (empresa_id = current_tenant_id());

CREATE POLICY tenant_isolation_empleados ON empleados
    FOR ALL USING (empresa_id = current_tenant_id());

CREATE POLICY tenant_isolation_clientes ON clientes
    FOR ALL USING (empresa_id = current_tenant_id());

CREATE POLICY tenant_isolation_citas ON citas
    FOR ALL USING (empresa_id = current_tenant_id());

CREATE POLICY tenant_isolation_sesiones ON sesiones
    FOR ALL USING (
        cita_id IN (SELECT id FROM citas WHERE empresa_id = current_tenant_id())
    );

CREATE POLICY tenant_isolation_configuraciones ON configuraciones
    FOR ALL USING (empresa_id = current_tenant_id());

CREATE POLICY tenant_isolation_recordatorios ON recordatorios
    FOR ALL USING (empresa_id = current_tenant_id());

-- CREATE BUCKETS FOR STORAGE
INSERT INTO storage.buckets (id, name, public) VALUES ('imagenes_servicios', 'imagenes_servicios', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('logos_empresa', 'logos_empresa', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos_sucursales', 'fotos_sucursales', true) ON CONFLICT DO NOTHING;

-- Policies for public reading of storage
CREATE POLICY public_read_imagenes ON storage.objects FOR SELECT 
    USING (bucket_id = 'imagenes_servicios' OR bucket_id = 'logos_empresa' OR bucket_id = 'fotos_sucursales');

-- (For inserting objects from backend using service role, we bypass RLS, so no inserts policy needed here for authenticated users unless frontend uploads directly)
