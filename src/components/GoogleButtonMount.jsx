import { useEffect, useRef } from 'react';
import { mountGoogleAuthButton } from '../auth.js';

export function GoogleButtonMount({ user, label = 'Iniciar con Google' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || user) return;
    mountGoogleAuthButton(ref.current, label);
  }, [label, user]);

  return <div ref={ref} />;
}
