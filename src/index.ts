#!/usr/bin/env node
/** ani-mcp - AniList MCP Server */

import { FastMCP } from "fastmcp";
import { registerSearchTools } from "./tools/search.js";
import { registerListTools } from "./tools/lists.js";

const server = new FastMCP({
  name: "ani-mcp",
  version: "0.1.0",
});

registerSearchTools(server);
registerListTools(server);

server.start({ transportType: "stdio" });
