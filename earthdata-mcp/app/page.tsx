export default function Home() {
  return (
    <main style={{fontFamily:"system-ui",maxWidth:900,margin:"48px auto",padding:24}}>
      <h1>Lupus Cortex Earthdata Connector</h1>
      <p>Remote MCP service for NASA CMR granule discovery and authenticated Earthdata downloads.</p>
      <ul>
        <li>Boundary: W 89.24, S 22.80, E 91.31, N 24.80</li>
        <li>Time: 2025-01-01 through 2025-12-31 UTC</li>
        <li>MCP endpoint: <code>/mcp</code></li>
        <li>Credentials are read only from <code>EARTHDATA_TOKEN</code> on the server.</li>
      </ul>
    </main>
  );
}