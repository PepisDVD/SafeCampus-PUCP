import { createBrowserRouter } from 'react-router';
import Login from './pages/Login';
import PWALayout from './pages/pwa/PWALayout';
import PWAHome from './pages/pwa/PWAHome';
import PWAReportar from './pages/pwa/PWAReportar';
import PWAMisCasos from './pages/pwa/PWAMisCasos';
import PWALostFound from './pages/pwa/PWALostFound';
import PWAAcompanamiento from './pages/pwa/PWAAcompanamiento';
import PWAPerfil from './pages/pwa/PWAPerfil';
import WebLayout from './pages/web/WebLayout';
import WebDashboard from './pages/web/WebDashboard';
import WebCasos from './pages/web/WebCasos';
import WebKPIs from './pages/web/WebKPIs';
import WebAdmin from './pages/web/WebAdmin';
import WebWhatsApp from './pages/web/WebWhatsApp';
import OperadorLayout from './pages/operador/OperadorLayout';
import OperadorDashboard from './pages/operador/OperadorDashboard';
import OperadorIncidentes from './pages/operador/OperadorIncidentes';
import OperadorMapa from './pages/operador/OperadorMapa';
import OperadorPerfil from './pages/operador/OperadorPerfil';
import ComponentShowcase from './pages/docs/ComponentShowcase';

export const router = createBrowserRouter([
  { path: '/', Component: Login },
  { path: '/docs/components', Component: ComponentShowcase },
  {
    path: '/pwa',
    Component: PWALayout,
    children: [
      { index: true, Component: PWAHome },
      { path: 'reportar', Component: PWAReportar },
      { path: 'mis-casos', Component: PWAMisCasos },
      { path: 'lost-found', Component: PWALostFound },
      { path: 'acompanamiento', Component: PWAAcompanamiento },
      { path: 'perfil', Component: PWAPerfil },
    ],
  },
  {
    path: '/web',
    Component: WebLayout,
    children: [
      { index: true, Component: WebDashboard },
      { path: 'casos', Component: WebCasos },
      { path: 'kpis', Component: WebKPIs },
      { path: 'whatsapp', Component: WebWhatsApp },
      { path: 'admin', Component: WebAdmin },
    ],
  },
  {
    path: '/operador',
    Component: OperadorLayout,
    children: [
      { index: true, Component: OperadorDashboard },
      { path: 'incidentes', Component: OperadorIncidentes },
      { path: 'mapa', Component: OperadorMapa },
      { path: 'perfil', Component: OperadorPerfil },
    ],
  },
]);
