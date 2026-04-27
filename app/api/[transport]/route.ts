import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { registerTools } from "@/lib/mcp/tools";
import { verifyMcpToken } from "@/lib/mcp/auth";

const handler = createMcpHandler(
  (server) => registerTools(server),
  {
    serverInfo: {
      name: "pixelreach-ai",
      version: "1.0.0",
    },
  },
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: false,
  }
);

const verifyToken = async (
  _req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  const ctx = await verifyMcpToken(bearerToken);
  if (!ctx) return undefined;
  return {
    token: bearerToken!,
    scopes: ["pixelreach:full"],
    clientId: ctx.userId,
    extra: { userId: ctx.userId, tokenId: ctx.tokenId },
  };
};

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: ["pixelreach:full"],
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
