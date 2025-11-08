'use client';
import { useEffect, useState } from 'react';

export function useRecaptcha(action = 'contact_us') {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const scriptId = 'recaptcha-enterprise';

    if (document.getElementById(scriptId)) {
      if (window.grecaptcha && window.grecaptcha.enterprise) {
        window.grecaptcha.enterprise.ready(() => {
          setReady(true);
        });
      } else {
        window.onload = () => setReady(true); // fallback
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.grecaptcha && window.grecaptcha.enterprise) {
        window.grecaptcha.enterprise.ready(() => {
          setReady(true);
        });
      }
    };
    document.body.appendChild(script);
  }, []);

  const execute = async () => {
    if (!window.grecaptcha || !ready) return null;

    return await window.grecaptcha.enterprise.execute(
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
      { action }
    );
  };

  return { ready, execute };
}
