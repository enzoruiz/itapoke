export function normalizePathname(pathname = window.location.pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) || '/' : pathname;
}

export function buildRelativeUrl(path, query) {
  const pathname = normalizePathname(path);
  const search = query ? new URLSearchParams(query).toString() : '';
  return search ? `${pathname}?${search}` : pathname;
}

export function routeScreen(pathname = window.location.pathname) {
  const normalizedPathname = normalizePathname(pathname);
  if (normalizedPathname === '/') return 'landing';
  if (normalizedPathname === '/explorer' || normalizedPathname.startsWith('/explorer/')) return 'explorer';
  if (normalizedPathname === '/library' || normalizedPathname.startsWith('/library/')) return 'library';
  if (normalizedPathname.startsWith('/expansion/')) return 'expansion';
  if (normalizedPathname === '/mis-colecciones' || normalizedPathname.startsWith('/mis-colecciones/')) return 'collections';
  return 'not-found';
}

export function routeCollectionId(pathname = window.location.pathname) {
  const normalizedPathname = normalizePathname(pathname);
  if (!normalizedPathname.startsWith('/mis-colecciones/')) return '';
  try {
    return decodeURIComponent(normalizedPathname.slice('/mis-colecciones/'.length));
  } catch {
    return '';
  }
}

export function routeSetId(pathname = window.location.pathname) {
  const normalizedPathname = normalizePathname(pathname);
  if (!normalizedPathname.startsWith('/expansion/')) return '';
  try {
    const parts = normalizedPathname.slice('/expansion/'.length).split('/').filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || '');
  } catch {
    return '';
  }
}

function slugify(value) {
  return String(value || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function expansionPath(set) {
  return `/expansion/${slugify(set.series)}/${slugify(set.displayName)}/${encodeURIComponent(set.id)}`;
}

export function collectionPath(collectionId) {
  return `/mis-colecciones/${encodeURIComponent(collectionId)}`;
}
