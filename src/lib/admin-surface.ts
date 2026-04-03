const ADMIN_BASE_PATH = '/painel-interno-cacambaja';

function normalizePath(path: string) {
  const trimmed = path.trim();
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, '') || '/';
}

export const ADMIN_LOGIN_PATH = normalizePath(ADMIN_BASE_PATH);
export const ADMIN_DASHBOARD_PATH = `${ADMIN_LOGIN_PATH}/dashboard`;
export const ADMIN_PEDIDOS_PATH = `${ADMIN_LOGIN_PATH}/pedidos`;
export const ADMIN_CATALOGO_PATH = `${ADMIN_LOGIN_PATH}/catalogo`;
export const ADMIN_WHATSAPP_PATH = `${ADMIN_LOGIN_PATH}/whatsapp`;
export const ADMIN_CONFIGURACOES_PATH = `${ADMIN_LOGIN_PATH}/configuracoes`;

export function isAdminSurfacePath(pathname: string) {
  return pathname === ADMIN_LOGIN_PATH || pathname.startsWith(`${ADMIN_LOGIN_PATH}/`);
}

