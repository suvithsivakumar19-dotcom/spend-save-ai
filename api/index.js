import server from '../dist/server/server.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    return await server.fetch(request);
  } catch (error) {
    console.error('Edge handler error:', error);
    return new Response(
      `<!doctype html>
      <html>
        <head>
          <title>Application Error</title>
          <style>
            body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #fafafa; }
            div { max-width: 24rem; text-align: center; }
            h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div>
            <h1>Application Error</h1>
            <p>Something went wrong while executing the Edge function. Please try refreshing.</p>
          </div>
        </body>
      </html>`,
      {
        status: 500,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      }
    );
  }
}
