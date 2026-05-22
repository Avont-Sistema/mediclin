/**
 * Minimal SSR for testing.
 */
export default {
  async fetch(request: Request) {
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <title>MediClin</title>
</head>
<body>
  <div id="app">Testing basic SSR</div>
</body>
</html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } }
    );
  },
};
