import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

// Endpoint público para el widget embebible (sin auth de admin, solo tenantId)
// Devuelve servicios y sucursales básicos

router.get('/init', async (req: Request, res: Response) => {
    try {
        const tenantId = req.query.tenantId as string;

        if (!tenantId) {
            return res.status(400).json({ error: 'Falta tenantId' });
        }

        const [empresaRes, sucursalesRes, serviciosRes] = await Promise.all([
            supabaseAdmin.from('empresas').select('nombre, email, telefono, descripcion, direccion, website, logo_url, slogan, instagram, facebook, tiktok, twitter, youtube, whatsapp_display, horario_atencion').eq('id', tenantId).single(),
            supabaseAdmin.from('sucursales').select('id, nombre, direccion').eq('empresa_id', tenantId),
            supabaseAdmin.from('servicios').select('id, nombre, descripcion, precio, duracion_minutos, image_url').eq('empresa_id', tenantId).eq('is_active', true)
        ]);

        const configuracionRes = await supabaseAdmin.from('configuraciones')
            .select('branding_color_primario, branding_logo_url')
            .eq('empresa_id', tenantId)
            .single();

        const empresa = empresaRes.data;

        res.json({
            empresa: {
                nombre: empresa?.nombre,
                email: empresa?.email,
                telefono: empresa?.telefono,
                descripcion: empresa?.descripcion || '',
                direccion: empresa?.direccion || '',
                website: empresa?.website || '',
                logoUrl: empresa?.logo_url || configuracionRes.data?.branding_logo_url || '',
                slogan: empresa?.slogan || '',
                instagram: empresa?.instagram || '',
                facebook: empresa?.facebook || '',
                tiktok: empresa?.tiktok || '',
                twitter: empresa?.twitter || '',
                youtube: empresa?.youtube || '',
                whatsappDisplay: empresa?.whatsapp_display || '',
                horarioAtencion: empresa?.horario_atencion || '',
            },
            configuracion: configuracionRes.data || { branding_color_primario: '#000', branding_logo_url: null },
            sucursales: sucursalesRes.data || [],
            servicios: serviciosRes.data || []
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error inicializando widget' });
    }
});

// Endpoint to serve the embeddable Javascript snippet
router.get('/js', (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) {
        return res.status(400).send('console.error("AgendaPro Widget: Falta tenantId en la url del script");');
    }

    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const iframeUrl = `${hostUrl}/?view=widget&tenantId=${tenantId}`;

    // The vanilla JS snippet that runs on the client's website
    const scriptContent = `
(function() {
    console.log("🚀 AgendaPro Widget Loaded automatically");
    
    // Create container
    var container = document.createElement('div');
    container.id = 'agendapro-widget-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '999999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'flex-end';
    document.body.appendChild(container);

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.src = '${iframeUrl}';
    iframe.style.width = '350px';
    iframe.style.height = '600px';
    iframe.style.maxHeight = '80vh';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '16px';
    iframe.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
    iframe.style.display = 'none';
    iframe.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    iframe.style.opacity = '0';
    iframe.style.transform = 'translateY(20px)';
    iframe.style.backgroundColor = 'white';
    iframe.style.marginBottom = '16px';

    // Responsiveness
    if (window.innerWidth < 400) {
        iframe.style.width = 'calc(100vw - 40px)';
    }

    container.appendChild(iframe);

    // Create toggle button
    var button = document.createElement('button');
    button.style.width = '60px';
    button.style.height = '60px';
    button.style.backgroundColor = '#4F46E5';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '50%';
    button.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)';
    button.style.cursor = 'pointer';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.transition = 'transform 0.2s ease, background-color 0.2s ease';
    
    // SVG Icons
    var iconChat = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    var iconClose = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    
    button.innerHTML = iconChat;
    
    // Hover effects
    button.onmouseover = function() { button.style.transform = 'scale(1.05)'; };
    button.onmouseout = function() { button.style.transform = 'scale(1)'; };

    var isOpen = false;
    button.onclick = function() {
        isOpen = !isOpen;
        if (isOpen) {
            iframe.style.display = 'block';
            setTimeout(function() {
                iframe.style.opacity = '1';
                iframe.style.transform = 'translateY(0)';
            }, 10);
            button.innerHTML = iconClose;
            button.style.backgroundColor = '#1F2937';
        } else {
            iframe.style.opacity = '0';
            iframe.style.transform = 'translateY(20px)';
            setTimeout(function() {
                iframe.style.display = 'none';
            }, 300);
            button.innerHTML = iconChat;
            button.style.backgroundColor = '#4F46E5';
        }
    };

    container.appendChild(button);
})();
    `;

    res.setHeader('Content-Type', 'application/javascript');
    res.send(scriptContent);
});

export default router;
