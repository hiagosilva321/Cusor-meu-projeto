import { useEffect } from 'react';

function upsertMeta(name: string, content: string) {
  let element = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }

  const previous = element.getAttribute('content');
  element.setAttribute('content', content);

  return () => {
    if (previous === null) {
      element?.remove();
      return;
    }

    element?.setAttribute('content', previous);
  };
}

export function useAdminSurfaceMeta() {
  useEffect(() => {
    const cleanups = [
      upsertMeta('robots', 'noindex,nofollow,noarchive'),
      upsertMeta('referrer', 'no-referrer'),
    ];

    return () => {
      cleanups.reverse().forEach((cleanup) => cleanup());
    };
  }, []);
}

