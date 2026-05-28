import { memo } from 'react';
import { signOut } from '../auth.js';
import { GoogleButtonMount } from './GoogleButtonMount.jsx';

export const AuthBar = memo(function AuthBar({ user }) {
  return (
    <section className={`auth-bar ${user ? 'auth-bar-user' : 'auth-bar-guest'}`}>
      <div className="auth-copy">
        {user ? (
          <>
            {user.picture
              ? <img className="auth-avatar" src={user.picture} alt={`Avatar de ${user.name || user.email || 'Usuario'}`} referrerPolicy="no-referrer" />
              : <span className="auth-avatar auth-avatar-fallback" aria-hidden="true">{(user.name || user.email || 'U').trim().charAt(0).toUpperCase()}</span>}
            <strong className="auth-name">{user.name || user.email || 'Usuario'}</strong>
          </>
        ) : 'Inicia sesion con Google'}
      </div>
      <div className="auth-controls">
        {user ? (
          <button className="auth-logout-btn" type="button" aria-label="Cerrar sesion" title="Cerrar sesion" onClick={() => void signOut()}>
            <span className="auth-logout-glyph" aria-hidden="true">x</span>
          </button>
        ) : <GoogleButtonMount user={user} />}
      </div>
    </section>
  );
});
