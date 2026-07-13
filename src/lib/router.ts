import { useState, useEffect, useCallback } from 'react';

export type Route = {
  path: string;
  params: Record<string, string>;
};

function parsePath(): Route {
  const path = window.location.pathname || '/';
  const queryString = window.location.search;
  const params: Record<string, string> = {};
  if (queryString) {
    new URLSearchParams(queryString).forEach((value, key) => {
      params[key] = value;
    });
  }
  return { path, params };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parsePath());

  useEffect(() => {
    const handler = () => setRoute(parsePath());
    window.addEventListener('popstate', handler);
    window.addEventListener('pushstate-navigate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      window.removeEventListener('pushstate-navigate', handler);
    };
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new Event('pushstate-navigate'));
  }, []);

  return { route, navigate };
}
