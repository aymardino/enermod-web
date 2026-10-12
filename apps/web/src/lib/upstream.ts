/** Where the web app's /api proxy forwards requests.
 *  API_URL may be a full URL or a bare host[:port] such as Render's `hostport` property.
 *  The default targets 127.0.0.1 rather than localhost: Node resolves localhost to ::1 first,
 *  and a uvicorn bound to 127.0.0.1 would then answer ECONNREFUSED (empty figures in the UI). */
export function upstreamUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim().replace(/\/+$/, "") || "http://127.0.0.1:8000";
  if (/^https?:\/\//i.test(value)) return value;
  const [host, port] = value.split(":");
  const tls = port === "443" || (!port && /\.(onrender\.com|fly\.dev|railway\.app)$/i.test(host));
  return `${tls ? "https" : "http"}://${value}`;
}
