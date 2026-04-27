import { headers } from "next/headers";
import { Header } from "@/components/layout/header";
import { McpClient } from "@/components/mcp/mcp-client";

export default async function McpPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`;

  return (
    <div>
      <Header
        title="MCP Connect"
        subtitle="Use PixelReach AI from Claude Desktop, Cursor, and other MCP clients"
      />
      <div className="p-6 space-y-6">
        <McpClient baseUrl={baseUrl} />
      </div>
    </div>
  );
}
