import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Octokit } from "@octokit/rest";

const execAsync = promisify(exec);

// Initialize Github
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const server = new McpServer({
  name: "Forge MCP Server",
  version: "1.0.0",
});

// Tool: read_excalidraw
server.tool(
  "read_excalidraw",
  "Reads an Excalidraw file and extracts the text elements to understand the diagrams content",
  {
    filePath: z.string().describe("The absolute path to the .excalidraw file"),
  },
  async ({ filePath }) => {
    try {
      const data = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(data);
      if (!parsed.elements || !Array.isArray(parsed.elements)) {
        return {
          content: [
            { type: "text", text: "Invalid excalidraw file format: no elements found." },
          ]
        };
      }
      
      const textElements = parsed.elements
        .filter((el: any) => el.type === "text")
        .map((el: any) => el.text);
      
      if (textElements.length === 0) {
        return { content: [{ type: "text", text: "No text found in excalidraw diagram." }] };
      }
      
      return {
        content: [
          { type: "text", text: `Diagram Text Content:\n\n${textElements.join("\n")}` },
        ]
      };
    } catch (e: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error reading excalidraw file: ${e.message}` }]
      };
    }
  }
);

// Tool: list_directory
server.tool(
  "list_directory",
  "List files and directories in a given path",
  {
    dirPath: z.string().describe("The directory path to list"),
  },
  async ({ dirPath }) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files = entries.filter((e) => e.isFile()).map((e) => e.name);
      const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
      
      return {
        content: [
          { type: "text", text: `Directories:\n${dirs.join("\n")}\n\nFiles:\n${files.join("\n")}` },
        ]
      };
    } catch (e: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error listing directory: ${e.message}` }]
      };
    }
  }
);

// Tool: read_file
server.tool(
  "read_file",
  "Read the content of a file",
  {
    filePath: z.string().describe("The absolute file path"),
  },
  async ({ filePath }) => {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return {
        content: [
          { type: "text", text: content },
        ]
      };
    } catch (e: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error reading file: ${e.message}` }]
      };
    }
  }
);

// Tool: search_codebase
server.tool(
  "search_codebase",
  "Search for a pattern in the codebase using grep",
  {
    pattern: z.string().describe("The regex pattern to search for"),
    dirPath: z.string().describe("The directory to search inside"),
  },
  async ({ pattern, dirPath }) => {
    try {
      const command = `grep -rnE "${pattern.replace(/"/g, '\\"')}" ${dirPath} | head -n 50`;
      const { stdout } = await execAsync(command);
      return {
        content: [
          { type: "text", text: stdout || "No matches found." },
        ]
      };
    } catch (e: any) {
      if (e.stdout) {
         return {
           content: [{ type: "text", text: e.stdout }]
         };
      }
      return {
        content: [{ type: "text", text: "No matches found or search failed." }]
      };
    }
  }
);

// Tool: github_dispatch_action
server.tool(
  "github_dispatch_action",
  "Trigger a GitHub Actions workflow manually via workflow dispatch",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    workflow_id: z.string().describe("The ID of the workflow or the workflow filename (e.g., 'main.yml')"),
    ref: z.string().describe("The git reference (branch or tag)"),
    inputs: z.record(z.string(), z.string()).optional().describe("Optional workflow inputs"),
  },
  async ({ owner, repo, workflow_id, ref, inputs }) => {
    try {
      await octokit.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id,
        ref,
        inputs,
      });
      return {
        content: [{ type: "text", text: `Workflow dispatched successfully for ${owner}/${repo}` }]
      };
    } catch (e: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error triggering workflow: ${e.message}` }]
      };
    }
  }
);

// Tool: github_create_issue
server.tool(
  "github_create_issue",
  "Create an issue on GitHub",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    title: z.string().describe("Title of the issue"),
    body: z.string().describe("Body text of the issue"),
  },
  async ({ owner, repo, title, body }) => {
    try {
      const response = await octokit.issues.create({
        owner,
        repo,
        title,
        body,
      });
      return {
        content: [{ type: "text", text: `Issue created successfully: ${response.data.html_url}` }]
      };
    } catch (e: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error creating issue: ${e.message}` }]
      };
    }
  }
);

// Tool: github_add_comment
server.tool(
  "github_add_comment",
  "Add a comment to a GitHub issue or pull request",
  {
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    issue_number: z.number().describe("The issue or PR number"),
    body: z.string().describe("Body text of the comment"),
  },
  async ({ owner, repo, issue_number, body }) => {
    try {
      const response = await octokit.issues.createComment({
        owner,
        repo,
        issue_number,
        body,
      });
      return {
        content: [{ type: "text", text: `Comment added successfully: ${response.data.html_url}` }]
      };
    } catch (e: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error adding comment: ${e.message}` }]
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Forge MCP Server is running securely via stdout/stdin");
}

main().catch((err) => {
  console.error("Fatal Error running the MCP Server", err);
  process.exit(1);
});
