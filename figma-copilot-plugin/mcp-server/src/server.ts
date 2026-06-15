import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import http from 'http';
import fs from 'fs';
import path from 'path';

const RELAY_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8765;
const HTTP_PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : 3000;

const AUTO_SCAN_ON_CONNECT = process.env.AUTO_SCAN_ON_CONNECT === '1';

const SCAN_OUT_DIR = process.env.SCAN_OUT_DIR ?? process.cwd();
const SCAN_OUT_FILE = process.env.SCAN_OUT_FILE ?? 'figma-scan-latest.json';

let lastScanFilePath: string | null = null;

function writeJsonFileAtomic(filePath: string, data: any) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function getScanOutPath(outputFileName?: string) {
  const fileName = outputFileName?.trim() ? outputFileName.trim() : SCAN_OUT_FILE;
  return path.join(SCAN_OUT_DIR, fileName);
}

function summarizeScanForHuman(scan: any) {
  const pages = Array.isArray(scan?.pages) ? scan.pages.length : 0;
  const pageNames = Array.isArray(scan?.pages) ? scan.pages.map((p: any) => p?.name).filter(Boolean) : [];
  const totalNodes = scan?.meta?.totalNodes ?? null;
  const truncated = scan?.meta?.truncated ?? null;

  const framesPreview: Array<{ page: string; frames: string[] }> = [];
  if (Array.isArray(scan?.pages)) {
    for (const p of scan.pages) {
      const frames = Array.isArray(p?.screens)
        ? p.screens.slice(0, 15).map((s: any) => s?.name).filter(Boolean)
        : [];
      framesPreview.push({ page: p?.name ?? '', frames });
    }
  }

  return { pages, pageNames, totalNodes, truncated, framesPreview };
}

let figmaClient: WebSocket | null = null;

const pending = new Map<
  string,
  {
    resolve: (v: any) => void;
    reject: (e: any) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function assertConnected() {
  if (!figmaClient || figmaClient.readyState !== WebSocket.OPEN) {
    throw new Error(
      `Figma plugin is not connected. Run the plugin first so it connects to ws://127.0.0.1:${RELAY_PORT}.`
    );
  }
}

function sendToFigma(method: string, params: any, timeoutMs = 20000): Promise<any> {
  assertConnected();
  const id = uid();
  console.error(`[relay] -> figma ${method} (id=${id})`);
  figmaClient!.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout waiting for Figma response: ${method}`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
  });
}

async function scanAndPersistToFile(args: { timeoutMs?: number; outputFileName?: string } = {}) {
  const timeoutMs = args.timeoutMs ?? 30000;

  const scan = await sendToFigma('scan_document', {}, timeoutMs);
  const outPath = getScanOutPath(args.outputFileName);

  writeJsonFileAtomic(outPath, scan);
  lastScanFilePath = outPath;

  return { outPath, scan, summary: summarizeScanForHuman(scan) };
}

/**
 * 1-shot pipeline: scan rồi generate_from_prompt
 * Trả về { scan, generated }
 */
async function scanAndGenerateFromPrompt(args: { prompt: string; targetPageName?: string; timeoutMs?: number }) {
  const timeoutMs = args.timeoutMs ?? 30000;

  const scan = await sendToFigma('scan_document', {}, timeoutMs);

  const generated = await sendToFigma(
    'generate_from_prompt',
    { prompt: args.prompt, targetPageName: args.targetPageName ?? 'From Prompt' },
    timeoutMs
  );

  return { scan, generated };
}

const wss = new WebSocketServer({ port: RELAY_PORT });

wss.on('listening', () => {
  console.error(`[relay] WS listening: ws://127.0.0.1:${RELAY_PORT}`);
});

wss.on('error', (e) => {
  console.error('[relay] WS error:', e);
});

wss.on('connection', (ws) => {
  figmaClient = ws;
  console.error('[relay] Figma plugin connected');

  // ping/pong keepalive
  ws.on('pong', () => {});
  const pingTimer = setInterval(() => {
    try {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    } catch {}
  }, 15000);

  ws.on('message', (raw) => {
    const text = raw.toString();
    console.error('[relay] <- figma', text);

    let msg: any;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }

    const p = pending.get(msg?.id);
    if (!p) return;

    clearTimeout(p.timer);
    pending.delete(msg.id);

    if (msg.ok) p.resolve(msg.result);
    else p.reject(new Error(msg.error ?? 'Unknown error from Figma'));
  });

  ws.on('close', () => {
    clearInterval(pingTimer);
    console.error('[relay] Figma plugin disconnected');
    if (figmaClient === ws) figmaClient = null;
  });

  // AUTO_SCAN on connect
  if (AUTO_SCAN_ON_CONNECT) {
    (async () => {
      try {
        const { scan, outPath } = await scanAndPersistToFile({ timeoutMs: 30000 });
        console.error('[relay] AUTO_SCAN saved:', outPath);
        console.error('[relay] AUTO_SCAN result (summary):', {
          pages: scan?.pages?.length,
          totalNodes: scan?.meta?.totalNodes,
          truncated: scan?.meta?.truncated,
          defaultSize: scan?.styleHints?.defaultSize,
        });
      } catch (e: any) {
        console.error('[relay] AUTO_SCAN failed:', e?.message ?? String(e));
      }
    })();
  }
});

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://127.0.0.1:${HTTP_PORT}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  try {
    let result: any;

    if (url.pathname === '/scan' && req.method === 'POST') {
      result = await sendToFigma('scan_document', {});
    } else if (url.pathname === '/generate' && req.method === 'POST') {
      const body = await parseBody(req);
      result = await sendToFigma('generate_screens', body);
    } else if (url.pathname === '/prompt' && req.method === 'POST') {
      const body = await parseBody(req);
      result = await sendToFigma('generate_from_prompt', body);
    } else if (url.pathname === '/scan-and-prompt' && req.method === 'POST') {
      const body = await parseBody(req);
      const schema = z.object({
        prompt: z.string().min(1),
        targetPageName: z.string().optional(),
        timeoutMs: z.number().optional(),
      });
      const parsed = schema.parse(body ?? {});
      result = await scanAndGenerateFromPrompt(parsed);
    } else if (url.pathname === '/scan-to-file' && req.method === 'POST') {
      const body = await parseBody(req);
      const schema = z.object({
        timeoutMs: z.number().optional(),
        outputFileName: z.string().optional(),
      });
      const parsed = schema.parse(body ?? {});
      const { outPath, summary } = await scanAndPersistToFile(parsed);
      result = { ok: true, filePath: outPath, summary };
    } else if (url.pathname === '/update-node' && req.method === 'POST') {
      const body = await parseBody(req);
      const schema = z.object({
        nodeId: z.string().min(1),
        updates: z.record(z.any()),
        timeoutMs: z.number().optional(),
      });
      const parsed = schema.parse(body ?? {});
      // Forward updates flattened so plugin receives fields at top-level
      result = await sendToFigma(
        'update_node',
        Object.assign({ nodeId: parsed.nodeId }, parsed.updates ?? {}),
        parsed.timeoutMs ?? 30000
      );
    } else if (url.pathname === '/attach-node' && req.method === 'POST') {
      const body = await parseBody(req);
      const schema = z.object({
        parentId: z.string().min(1),
        nodeId: z.string().min(1),
        index: z.number().optional(),
        timeoutMs: z.number().optional(),
      });
      const parsed = schema.parse(body ?? {});
      result = await sendToFigma(
        'attach_node',
        { parentId: parsed.parentId, nodeId: parsed.nodeId, index: parsed.index },
        parsed.timeoutMs ?? 30000
      );
    } else if (url.pathname === '/delete-node' && req.method === 'POST') {
      const body = await parseBody(req);
      const schema = z.object({
        nodeId: z.string().min(1),
        timeoutMs: z.number().optional(),
      });
      const parsed = schema.parse(body ?? {});
      result = await sendToFigma(
        'delete_node',
        { nodeId: parsed.nodeId },
        parsed.timeoutMs ?? 30000
      );
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error:
            'Not found. Use POST /scan | /generate | /prompt | /scan-and-prompt | /scan-to-file | /update-node | /attach-node | /delete-node',
        })
      );
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (e: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e?.message ?? String(e) }));
  }
});

httpServer.on('error', (e) => {
  console.error('[relay] HTTP error:', e);
});

httpServer.listen(HTTP_PORT, () => {
  console.error(`[relay] HTTP listening: http://127.0.0.1:${HTTP_PORT}`);
});

// ─── MCP server ─────────────────────────────────────────────────────────────
const server = new Server({ name: 'figma-mcp-relay', version: '0.4.1' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'figma_scan_document',
        description: 'Scan the open Figma document (pages + top-level frames).',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      },
      {
        name: 'figma_generate_screens',
        description: 'Generate missing screens (frames) by name into a target page.',
        inputSchema: {
          type: 'object',
          properties: {
            names: { type: 'array', items: { type: 'string' } },
            targetPageName: { type: 'string' },
          },
          required: ['names'],
          additionalProperties: false,
        },
      },
      {
        name: 'figma_generate_from_prompt',
        description:
          'Generate Figma design from a prompt. Supports: add frame "Name" | add text "Content" at X,Y size 24 | add rect WxH with color #HEX | fill nodeId with color #HEX',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
            targetPageName: { type: 'string' },
          },
          required: ['prompt'],
          additionalProperties: false,
        },
      },
      {
        name: 'figma_scan_and_generate_from_prompt',
        description: 'One-shot: scan_document first, then generate_from_prompt. Returns { scan, generated }.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
            targetPageName: { type: 'string' },
            timeoutMs: { type: 'number' },
          },
          required: ['prompt'],
          additionalProperties: false,
        },
      },
      {
        name: 'figma_scan_document_to_file',
        description:
          'Scan the open Figma document and write full JSON to a workspace file. Supports { timeoutMs?, outputFileName? }. Returns { filePath, summary }.',
        inputSchema: {
          type: 'object',
          properties: {
            timeoutMs: { type: 'number' },
            outputFileName: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'figma_get_last_scan_file',
        description: 'Return the path to the last saved Figma scan JSON file (if available).',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      },
      {
        name: 'figma_update_node',
        description: 'Update an existing node in Figma by nodeId (requires plugin support for method update_node).',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string' },
            updates: { type: 'object' },
          },
          required: ['nodeId', 'updates'],
          additionalProperties: false,
        },
      },
      {
        name: 'figma_attach_node',
        description: 'Attach (re-parent) an existing node into a parent (FRAME/GROUP/PAGE/etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            parentId: { type: 'string' },
            nodeId: { type: 'string' },
            index: { type: 'number' },
          },
          required: ['parentId', 'nodeId'],
          additionalProperties: false,
        },
      },
      {
        name: 'figma_delete_node',
        description: 'Delete a node from Figma by nodeId.',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string' },
          },
          required: ['nodeId'],
          additionalProperties: false,
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === 'figma_scan_document') {
    const result = await sendToFigma('scan_document', {});
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  if (name === 'figma_generate_screens') {
    const schema = z.object({
      names: z.array(z.string()).min(1),
      targetPageName: z.string().optional(),
    });
    const parsed = schema.parse(args ?? {});
    const result = await sendToFigma('generate_screens', parsed);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  if (name === 'figma_generate_from_prompt') {
    const schema = z.object({
      prompt: z.string(),
      targetPageName: z.string().optional(),
    });
    const parsed = schema.parse(args ?? {});
    const result = await sendToFigma('generate_from_prompt', parsed);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  if (name === 'figma_scan_and_generate_from_prompt') {
    const schema = z.object({
      prompt: z.string().min(1),
      targetPageName: z.string().optional(),
      timeoutMs: z.number().optional(),
    });
    const parsed = schema.parse(args ?? {});
    const result = await scanAndGenerateFromPrompt(parsed);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  if (name === 'figma_scan_document_to_file') {
    const schema = z.object({
      timeoutMs: z.number().optional(),
      outputFileName: z.string().optional(),
    });
    const parsed = schema.parse(args ?? {});
    const { outPath, summary } = await scanAndPersistToFile(parsed);

    const payload = {
      ok: true,
      filePath: outPath,
      summary,
      note: 'The full scan JSON is saved to filePath.',
    };

    return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
  }

  if (name === 'figma_get_last_scan_file') {
    const filePath = lastScanFilePath ?? getScanOutPath();
    const payload = {
      ok: true,
      filePath,
      exists: filePath ? fs.existsSync(filePath) : false,
      note: 'If exists=false, run figma_scan_document_to_file first.',
    };
    return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
  }

  if (name === 'figma_update_node') {
    const schema = z.object({
      nodeId: z.string().min(1),
      updates: z.record(z.any()),
    });
    const parsed = schema.parse(args ?? {});
    const result = await sendToFigma('update_node', parsed);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  if (name === 'figma_attach_node') {
    const schema = z.object({
      parentId: z.string().min(1),
      nodeId: z.string().min(1),
      index: z.number().optional(),
    });
    const parsed = schema.parse(args ?? {});
    const result = await sendToFigma('attach_node', parsed);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  if (name === 'figma_delete_node') {
    const schema = z.object({
      nodeId: z.string().min(1),
    });
    const parsed = schema.parse(args ?? {});
    const result = await sendToFigma('delete_node', parsed);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[relay] MCP connected (stdio)');
}

main().catch((e) => {
  console.error('[relay] fatal:', e);
  process.exit(1);
});
