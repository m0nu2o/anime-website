# Cloudflare Worker Edge Proxy Setup (2 Minutes, $0 Cost)

This worker proxies stream API requests from Cloudflare’s edge, bypassing datacenter IP blocking.

### Steps:
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) (create free account if needed).
2. Go to **Workers & Pages** -> **Create application** -> **Create Worker**.
3. Name it `nextgen-anime-proxy` and click **Deploy**.
4. Click **Edit code** and paste the code from `cloudflare-worker/worker.js`.
5. Click **Deploy**.
6. Copy your worker URL (e.g., `https://nextgen-anime-proxy.<your-subdomain>.workers.dev`).
7. In your [Vercel Dashboard](https://vercel.com/m0nu2o/nextgen-anime/settings/environment-variables):
   - Add environment variable:
     - **Key**: `CLOUDFLARE_WORKER_URL`
     - **Value**: `https://nextgen-anime-proxy.<your-subdomain>.workers.dev`
8. Redeploy or save.
