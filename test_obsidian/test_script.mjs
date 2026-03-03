import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function run() {
  console.log("Starting MCP Client...");
  
  const transport = new StdioClientTransport({
    command: "node",
    args: ["/Users/medow/Documents/forge/mcp-server/build/index.js"],
    // Pass the environment so the server can spawn tasks if needed
    env: process.env
  });

  const client = new Client({
    name: "test-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  console.log("Connected to MCP Server.");

  console.log("\n-> Saving Idea 1: Machine Learning with MCP");
  const res1 = await client.callTool({
    name: "save_idea",
    arguments: {
      title: "Machine Learning with MCP",
      content: "Using the Model Context Protocol to bridge the gap between AI ideation and codebase interactions.",
      tags: ["AI", "architecture"],
      links: []
    }
  });
  console.log("Response:", res1.content[0].text);

  console.log("\n-> Saving Idea 2: Extending Forge to Obsidian");
  const res2 = await client.callTool({
    name: "save_idea",
    arguments: {
      title: "Extending Forge to Obsidian",
      content: "Creating an Obsidian-like interface directly inside the AI IDE.",
      tags: ["AI", "UI"],
      links: ["Machine Learning with MCP"]
    }
  });
  console.log("Response:", res2.content[0].text);

  console.log("\n-> Generating Ideas Graph");
  const result = await client.callTool({
    name: "get_ideas_graph",
    arguments: {}
  });

  if (result.isError) {
    console.error("Error:", result.content[0].text);
  } else {
    console.log(result.content[0].text);
  }
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
