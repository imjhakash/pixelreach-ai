import { MCPToolsClient } from "@/components/mcp-tools/mcp-tools-client";

export const metadata = {
  title: "MCP Connect — PixelReach AI",
  description: "Connect Claude, OpenRouter, Supabase, and 14 other platforms via Model Context Protocol. Browse and configure 100+ tools.",
};

export default function MCPToolsPage() {
  return <MCPToolsClient />;
}
