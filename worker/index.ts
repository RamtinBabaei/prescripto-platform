import { api } from './api';
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com",
};
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = new URL(request.url).pathname.startsWith('/api/')
      ? await api(request, env)
      : await env.ASSETS.fetch(request);
    const secured = new Response(response.body, response);
    for (const [key, value] of Object.entries(securityHeaders)) secured.headers.set(key, value);
    if (new URL(request.url).protocol === 'https:')
      secured.headers.set('Strict-Transport-Security', 'max-age=31536000');
    return secured;
  },
} satisfies ExportedHandler<Env>;
