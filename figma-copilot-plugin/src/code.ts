/// <reference types="@figma/plugin-typings" />

import uiHtml from './ui/index.html';
import {
  serializeNode,
  serializeStyles,
  deduplicateStyles,
  getBounds,
  toHex,
  serializePaints,
} from './utils/serializers';
import * as figmaAPI from './utils/figma-api';

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MAX_DEPTH = 8;
const MAX_NODES = 600;
const FRAMES_PER_ROW = 3;
const FRAME_GAP = 200;
const ITEM_GAP_Y = 150;

// â”€â”€ Type Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type SolidRGB = { r: number; g: number; b: number };

interface FillInfo {
  type: 'SOLID' | 'LINEAR_GRADIENT' | 'RADIAL_GRADIENT' | 'IMAGE' | 'OTHER';
  color?: SolidRGB;
  opacity?: number;
}

interface StrokeInfo {
  color: SolidRGB;
  opacity: number;
  weight: number;
  align: string;
  type: string;
}

interface EffectInfo {
  type: string;
  color?: SolidRGB;
  opacity?: number;
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  visible?: boolean;
}

interface AutoLayoutInfo {
  direction: string;
  gap: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  alignItems: string;
  justifyContent: string;
}

interface ScannedNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
  fills?: FillInfo[];
  strokes?: StrokeInfo[];
  effects?: EffectInfo[];
  borderRadius?: number | [number, number, number, number];
  autoLayout?: AutoLayoutInfo;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: string;
  textColor?: SolidRGB;
  componentName?: string;
  imageUrl?: null;
  children?: ScannedNode[];
}

interface PromptAction {
  type: 'add_frame' | 'add_text' | 'add_rectangle' | 'update_fill' | 'update_size' | 'rename';
  params: Record<string, any>;
}

interface BridgeRequest {
  type: string;
  requestId: string;
  nodeIds?: string[];
  params?: Record<string, any>;
}

interface BridgeResponse {
  type: string;
  requestId: string;
  data?: any;
  error?: string;
  progress?: number;
  message?: string;
}


// â”€â”€ Parsing Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const isMixed = (value: any): boolean => value === figma.mixed;

const round10 = (n: number): number => Math.round(n / 10) * 10;

const parseRGB = (color: any): SolidRGB => ({
  r: color?.r ?? 0,
  g: color?.g ?? 0,
  b: color?.b ?? 0,
});

const parseFills = (node: any): FillInfo[] => {
  const { fills } = node;
  if (!fills || isMixed(fills) || !Array.isArray(fills)) return [];

  return fills.map((f: any) => {
    if (f.type === 'SOLID') {
      return {
        type: 'SOLID' as const,
        color: parseRGB(f.color),
        opacity: f.opacity ?? 1,
      };
    }
    if (f.type === 'LINEAR_GRADIENT' || f.type === 'RADIAL_GRADIENT') {
      return { type: f.type as 'LINEAR_GRADIENT' | 'RADIAL_GRADIENT', opacity: f.opacity ?? 1 };
    }
    if (f.type === 'IMAGE') {
      return { type: 'IMAGE' as const, opacity: f.opacity ?? 1 };
    }
    return { type: 'OTHER' as const };
  });
};

const parseStrokes = (node: any): StrokeInfo[] => {
  const { strokes } = node;
  if (!strokes || isMixed(strokes) || !Array.isArray(strokes)) return [];

  return strokes.map((s: any) => ({
    color: parseRGB(s.color),
    opacity: s.opacity ?? 1,
    weight: s.weight ?? 1,
    align: s.strokeAlign ?? 'INSIDE',
    type: s.type ?? 'SOLID',
  }));
};

const parseEffects = (node: any): EffectInfo[] => {
  const { effects } = node;
  if (!effects || isMixed(effects) || !Array.isArray(effects)) return [];

  return effects.map((e: any) => ({
    type: e.type,
    color: e.color ? parseRGB(e.color) : undefined,
    opacity: e.color?.a ?? e.opacity,
    offset: e.offset ? { x: e.offset.x, y: e.offset.y } : undefined,
    radius: e.radius,
    spread: e.spread,
    visible: e.visible,
  }));
};

const parseBorderRadius = (node: any): number | [number, number, number, number] | undefined => {
  if (!('cornerRadius' in node)) return undefined;

  const { cornerRadius } = node;
  if (isMixed(cornerRadius)) {
    try {
      return [
        node.topLeftRadius ?? 0,
        node.topRightRadius ?? 0,
        node.bottomRightRadius ?? 0,
        node.bottomLeftRadius ?? 0,
      ];
    } catch {
      return undefined;
    }
  }

  return typeof cornerRadius === 'number' ? cornerRadius : undefined;
};

const parseAutoLayout = (node: any): AutoLayoutInfo | undefined => {
  if (!('layoutMode' in node) || node.layoutMode === 'NONE') return undefined;

  return {
    direction: node.layoutMode,
    gap: node.itemSpacing ?? 0,
    paddingTop: node.paddingTop ?? 0,
    paddingRight: node.paddingRight ?? 0,
    paddingBottom: node.paddingBottom ?? 0,
    paddingLeft: node.paddingLeft ?? 0,
    alignItems: node.primaryAxisAlign ?? 'MIN',
    justifyContent: node.counterAxisAlign ?? 'MIN',
  };
};

// â”€â”€ Document Scanning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let nodeCount = 0;

const scanNode = (node: SceneNode, depth: number): ScannedNode | null => {
  if (nodeCount >= MAX_NODES) return null;
  nodeCount++;

  const base: ScannedNode = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: Math.round(node.x * 100) / 100,
    y: Math.round(node.y * 100) / 100,
    width: Math.round(node.width * 100) / 100,
    height: Math.round(node.height * 100) / 100,
    visible: node.visible,
    opacity: (node as any).opacity ?? 1,
  };

  const n = node as any;

  // Fills, Strokes, Effects
  const fills = parseFills(n);
  if (fills.length) base.fills = fills;

  const strokes = parseStrokes(n);
  if (strokes.length) base.strokes = strokes;

  const effects = parseEffects(n);
  if (effects.length) base.effects = effects;

  const br = parseBorderRadius(n);
  if (br !== undefined) base.borderRadius = br;

  // AutoLayout
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const al = parseAutoLayout(n);
    if (al) base.autoLayout = al;
  }

  // Text properties
  if (node.type === 'TEXT') {
    base.text = n.characters;
    base.fontSize = isMixed(n.fontSize) ? undefined : n.fontSize;
    base.fontFamily = isMixed(n.fontName) ? undefined : n.fontName?.family;
    base.fontWeight = isMixed(n.fontName) ? undefined : n.fontName?.style;
    base.textAlign = isMixed(n.textAlignHorizontal) ? undefined : n.textAlignHorizontal;
    const tf = fills.find((f) => f.type === 'SOLID');
    if (tf?.color) base.textColor = tf.color;
  }

  // Component reference
  if (node.type === 'INSTANCE') {
    const mainComp = (node as InstanceNode).mainComponent;
    if (mainComp) base.componentName = mainComp.name;
  }

  // Image flag
  if (fills.some((f) => f.type === 'IMAGE')) {
    base.imageUrl = null;
  }

  // Children (recursive)
  if ('children' in node && depth < MAX_DEPTH) {
    const children: ScannedNode[] = [];
    for (const child of (node as any).children) {
      const scanned = scanNode(child as SceneNode, depth + 1);
      if (scanned) children.push(scanned);
    }
    if (children.length) base.children = children;
  }

  return base;
};

const scanDocument = () => {
  nodeCount = 0;

  const pages: { id: string; name: string; screens: ScannedNode[] }[] = [];
  const fontSet = new Set<string>();
  const colorSet = new Map<string, SolidRGB>();

  // Scan all pages
  for (const page of figma.root.children) {
    const screens: ScannedNode[] = [];
    for (const node of page.children) {
      const scanned = scanNode(node, 0);
      if (scanned) screens.push(scanned);
    }
    pages.push({ id: page.id, name: page.name, screens });
  }

  // Collect styles from all nodes
  const collectStyles = (nodes: ScannedNode[]) => {
    for (const n of nodes) {
      if (n.fills) {
        for (const f of n.fills) {
          if (f.type === 'SOLID' && f.color) {
            const key = `${f.color.r},${f.color.g},${f.color.b}`;
            colorSet.set(key, f.color);
          }
        }
      }
      if (n.textColor) {
        const key = `${n.textColor.r},${n.textColor.g},${n.textColor.b}`;
        colorSet.set(key, n.textColor);
      }
      if (n.fontFamily) fontSet.add(`${n.fontFamily} ${n.fontWeight || 'Regular'}`);
      if (n.children) collectStyles(n.children);
    }
  };
  for (const p of pages) collectStyles(p.screens);

  // Analyze frame sizes and backgrounds
  const sizeCount = new Map<string, { w: number; h: number; count: number }>();
  const bgCount = new Map<string, { rgb: SolidRGB; count: number }>();

  for (const p of pages) {
    for (const s of p.screens) {
      if (s.type !== 'FRAME') continue;

      const w = round10(s.width);
      const h = round10(s.height);
      const k = `${w}x${h}`;
      sizeCount.set(k, { w, h, count: (sizeCount.get(k)?.count ?? 0) + 1 });

      const solidBg = s.fills?.find((f) => f.type === 'SOLID');
      if (solidBg?.color) {
        const r = Math.round(solidBg.color.r * 100) / 100;
        const g = Math.round(solidBg.color.g * 100) / 100;
        const b = Math.round(solidBg.color.b * 100) / 100;
        const bk = `${r},${g},${b}`;
        bgCount.set(bk, { rgb: { r, g, b }, count: (bgCount.get(bk)?.count ?? 0) + 1 });
      }
    }
  }

  const bestSize = [...sizeCount.values()].sort((a, b) => b.count - a.count)[0] ?? { w: 1440, h: 900, count: 1 };
  const bestBg = [...bgCount.values()].sort((a, b) => b.count - a.count)[0]?.rgb;

  return {
    pages,
    styleHints: {
      defaultSize: { width: bestSize.w, height: bestSize.h },
      defaultBg: bestBg,
      allColors: [...colorSet.values()],
      allFonts: [...fontSet],
    },
    meta: {
      totalNodes: nodeCount,
      maxDepth: MAX_DEPTH,
      maxNodes: MAX_NODES,
      truncated: nodeCount >= MAX_NODES,
    },
  };
};


// â”€â”€ Utility Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ensurePage = (name: string): PageNode => {
  const existing = figma.root.children.find((p) => p.name === name);
  if (existing) return existing;
  const page = figma.createPage();
  page.name = name;
  return page;
};

const normalizeName = (s: string): string => s.trim().toLowerCase();

const generateScreens = (names: string[], targetPageName = 'Generated'): { created: { id: string; name: string }[]; skippedExisting: string[] } => {
  const scan = scanDocument();
  const targetPage = ensurePage(targetPageName);
  figma.currentPage = targetPage;

  const existing = new Set<string>();
  for (const p of scan.pages) {
    for (const s of p.screens) {
      existing.add(normalizeName(s.name));
    }
  }

  const wanted = names.map((n) => n.trim()).filter(Boolean);
  const missing = wanted.filter((n) => !existing.has(normalizeName(n)));
  const skippedExisting = wanted.filter((n) => existing.has(normalizeName(n)));

  const { width, height } = scan.styleHints.defaultSize;
  const bg: SolidRGB | undefined = scan.styleHints.defaultBg;

  const created: { id: string; name: string }[] = [];

  missing.forEach((name, i) => {
    const frame = figma.createFrame();
    frame.name = name;
    frame.resize(width, height);
    if (bg) frame.fills = [{ type: 'SOLID', color: bg }];

    frame.x = (i % FRAMES_PER_ROW) * (width + FRAME_GAP);
    frame.y = Math.floor(i / FRAMES_PER_ROW) * (height + FRAME_GAP);

    targetPage.appendChild(frame);
    created.push({ id: frame.id, name: frame.name });
  });

  return { created, skippedExisting };
};

// â”€â”€ Read Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function handleReadDocumentRequest(request: BridgeRequest): Promise<BridgeResponse> {
  const { type, requestId } = request;

  if (type === 'get_document') {
    const raw = await serializeNode(figma.currentPage);
    const { tree, globalVars } = deduplicateStyles(raw);
    return {
      type,
      requestId,
      data: globalVars ? { ...tree, globalVars } : tree,
    };
  }

  if (type === 'get_selection') {
    const selection = await Promise.all(
      figma.currentPage.selection.map((node) => serializeNode(node))
    );
    return {
      type,
      requestId,
      data: selection,
    };
  }

  if (type === 'get_node') {
    const nodeId = request.nodeIds?.[0];
    if (!nodeId) throw new Error('nodeIds is required for get_node');

    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node || node.type === 'DOCUMENT') {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const serialized = await serializeNode(node);
    return {
      type,
      requestId,
      data: serialized,
    };
  }

  if (type === 'get_nodes_info') {
    const { nodeIds } = request;
    if (!nodeIds || nodeIds.length === 0) {
      throw new Error('nodeIds is required for get_nodes_info');
    }

    const nodes = await Promise.all(
      nodeIds.map((id: string) => figma.getNodeByIdAsync(id))
    );

    const data = await Promise.all(
      nodes
        .filter((n) => n !== null && n.type !== 'DOCUMENT')
        .map((n) => serializeNode(n))
    );

    return {
      type,
      requestId,
      data,
    };
  }

  if (type === 'get_design_context') {
    const depth = request.params?.depth ?? 2;
    const detail = request.params?.detail || 'full';
    const dedupeComponents = !!request.params?.dedupeComponents;

    const serializeForDetail = async (n: any) => {
      const base = {
        id: n.id,
        name: n.name,
        type: n.type,
        bounds: getBounds(n),
      };

      if (detail === 'minimal') return base;

      const styles = await serializeStyles(n);
      const result: any = Object.assign({}, base);
      if (Object.keys(styles).length > 0) result.styles = styles;
      if ('opacity' in n && n.opacity !== 1) result.opacity = n.opacity;
      if ('visible' in n && !n.visible) result.visible = false;

      if (detail === 'compact') return result;

      return await serializeNode(n);
    };

    const walk = async (n: any, d: number): Promise<any> => {
      if (d > depth) return null;

      const node = await serializeForDetail(n);
      if (d >= depth) return node;

      if ('children' in n && Array.isArray(n.children)) {
        const children = await Promise.all(
          n.children.map((child: any) => walk(child, d + 1))
        );
        node.children = children.filter((c) => c !== null);
      }

      return node;
    };

    const data = await walk(figma.currentPage, 0);
    return {
      type,
      requestId,
      data,
    };
  }

  throw new Error(`Unknown read operation: ${type}`);
}

// â”€â”€ Write Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function handleWriteCreateRequest(request: BridgeRequest): Promise<BridgeResponse> {
  const { type, requestId, params = {} } = request;

  if (type === 'create_frame') {
    const parent = await figmaAPI.getParentNode(params.parentId);
    const frame = figma.createFrame();
    frame.resize(params.width || 100, params.height || 100);
    frame.x = params.x != null ? params.x : 0;
    frame.y = params.y != null ? params.y : 0;
    if (params.name) frame.name = params.name;
    if (params.fillColor) frame.fills = [{ type: 'SOLID', color: figmaAPI.hexToRgb(params.fillColor) }];
    figmaAPI.applyAutoLayout(frame, params);
    (parent as any).appendChild(frame);
    figma.commitUndo();

    return {
      type,
      requestId,
      data: {
        id: frame.id,
        name: frame.name,
        type: frame.type,
        bounds: getBounds(frame),
      },
    };
  }

  if (type === 'create_rectangle') {
    const parent = await figmaAPI.getParentNode(params.parentId);
    const rect = figma.createRectangle();
    rect.resize(params.width || 100, params.height || 100);
    rect.x = params.x != null ? params.x : 0;
    rect.y = params.y != null ? params.y : 0;
    if (params.name) rect.name = params.name;
    if (params.fillColor) rect.fills = [{ type: 'SOLID', color: figmaAPI.hexToRgb(params.fillColor) }];
    if (params.cornerRadius != null) rect.cornerRadius = params.cornerRadius;
    (parent as any).appendChild(rect);
    figma.commitUndo();

    return {
      type,
      requestId,
      data: {
        id: rect.id,
        name: rect.name,
        type: rect.type,
        bounds: getBounds(rect),
      },
    };
  }

  if (type === 'create_text') {
    const parent = await figmaAPI.getParentNode(params.parentId);
    const fontFamily = params.fontFamily || 'Inter';
    const fontStyle = params.fontStyle || 'Regular';
    await figma.loadFontAsync({ family: fontFamily, style: fontStyle });

    const textNode = figma.createText();
    textNode.fontName = { family: fontFamily, style: fontStyle };
    if (params.fontSize != null) textNode.fontSize = Number(params.fontSize);
    textNode.characters = params.text || '';
    textNode.x = params.x != null ? params.x : 0;
    textNode.y = params.y != null ? params.y : 0;
    if (params.name) textNode.name = params.name;
    if (params.fillColor) textNode.fills = [{ type: 'SOLID', color: figmaAPI.hexToRgb(params.fillColor) }];
    (parent as any).appendChild(textNode);
    figma.commitUndo();

    return {
      type,
      requestId,
      data: {
        id: textNode.id,
        name: textNode.name,
        type: textNode.type,
        bounds: getBounds(textNode),
      },
    };
  }

  throw new Error(`Unknown create operation: ${type}`);
}

async function handleWriteModifyRequest(request: BridgeRequest): Promise<BridgeResponse> {
  const { type, requestId, nodeIds = [], params = {} } = request;

  if (type === 'update_node') {
    const nodeId = nodeIds[0];
    if (!nodeId) throw new Error('nodeId is required');

    const node = (await figma.getNodeByIdAsync(nodeId)) as any;
    if (!node) throw new Error(`Node not found: ${nodeId}`);

    // TEXT updates
    if (node.type === 'TEXT') {
      if (params.fontName || params.characters || params.fontSize) {
        const desiredFont = params.fontName || node.fontName;
        if (desiredFont && desiredFont !== figma.mixed) {
          await figma.loadFontAsync(desiredFont);
        }
      }

      if (typeof params.fontSize === 'number') node.fontSize = params.fontSize;
      if (params.fontName && params.fontName.family && params.fontName.style) {
        node.fontName = { family: params.fontName.family, style: params.fontName.style };
      }
      if (typeof params.characters === 'string') node.characters = params.characters;
    }

    // Fills
    if (params.fills && 'fills' in node) {
      node.fills = params.fills;
    }

    // Effects
    if (params.effects && 'effects' in node) {
      node.effects = params.effects;
    }

    // Opacity
    if (typeof params.opacity === 'number' && 'opacity' in node) {
      node.opacity = params.opacity;
    }

    // Position
    if (typeof params.x === 'number') node.x = params.x;
    if (typeof params.y === 'number') node.y = params.y;

    // Resize
    if (typeof params.width === 'number' && typeof params.height === 'number' && 'resize' in node) {
      node.resize(params.width, params.height);
    }

    // Border radius
    const br = params.borderRadius || params.cornerRadius;
    if (br !== undefined && 'cornerRadius' in node) {
      if (Array.isArray(br) && br.length === 4 && 'topLeftRadius' in node) {
        node.topLeftRadius = br[0];
        node.topRightRadius = br[1];
        node.bottomRightRadius = br[2];
        node.bottomLeftRadius = br[3];
      } else if (typeof br === 'number') {
        node.cornerRadius = br;
      }
    }

    figma.commitUndo();

    return {
      type,
      requestId,
      data: { ok: true, nodeId: node.id, type: node.type },
    };
  }

  if (type === 'attach_node') {
    const parentId = params.parentId;
    const nodeId = nodeIds[0];
    if (!parentId || !nodeId) {
      throw new Error('parentId and nodeId are required');
    }

    const parent = (await figma.getNodeByIdAsync(parentId)) as BaseNode & ChildrenMixin;
    const node = (await figma.getNodeByIdAsync(nodeId)) as SceneNode;

    if (!parent) throw new Error(`Parent not found: ${parentId}`);
    if (!node) throw new Error(`Node not found: ${nodeId}`);

    if (!('appendChild' in parent)) {
      throw new Error(`Parent cannot contain children: ${(parent as any).type}`);
    }

    if ((node as any).parent?.id === parent.id) {
      return {
        type,
        requestId,
        data: {
          ok: true,
          parentId: parent.id,
          nodeId: node.id,
          parentType: (parent as any).type,
          note: 'Already attached',
        },
      };
    }

    if (typeof params.index === 'number' && Number.isFinite(params.index)) {
      parent.insertChild(params.index, node);
    } else {
      parent.appendChild(node);
    }

    figma.commitUndo();

    return {
      type,
      requestId,
      data: {
        ok: true,
        parentId: parent.id,
        nodeId: node.id,
        parentType: parent.type,
      },
    };
  }

  if (type === 'delete_node') {
    const nodeId = nodeIds[0];
    if (!nodeId) throw new Error('nodeId is required');

    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);

    node.remove();
    figma.commitUndo();

    return {
      type,
      requestId,
      data: { ok: true, nodeId },
    };
  }

  throw new Error(`Unknown write operation: ${type}`);
}

// â”€â”€ Legacy Document Scanning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function generateFromPrompt(prompt: string, targetPageName = 'From Prompt'): { actions: PromptAction[]; applied: any[] } {
  const scan = scanDocument();
  const targetPage = ensurePage(targetPageName);
  figma.currentPage = targetPage;

  const { width: defaultWidth, height: defaultHeight } = scan.styleHints.defaultSize;
  const defaultBg = scan.styleHints.defaultBg;

  const actions: PromptAction[] = [];
  const applied: any[] = [];

  const lines = prompt.split('|').map((s) => s.trim());

  let yOffset = 0;
  const itemGapY = 150;

  for (const line of lines) {
    if (!line) continue;

    if (line.toLowerCase().startsWith('add frame')) {
      const match = line.match(/add frame\s+['"]([^'"]+)['"]/i);
      if (match) {
        const frameName = match[1];
        const frame = figma.createFrame();
        frame.name = frameName;
        frame.resize(defaultWidth, defaultHeight);
        if (defaultBg) frame.fills = [{ type: 'SOLID', color: defaultBg }];

        frame.y = yOffset;
        targetPage.appendChild(frame);

        actions.push({ type: 'add_frame', params: { name: frameName } });
        applied.push({ type: 'frame', id: frame.id, name: frameName });
        yOffset += defaultHeight + itemGapY;
      }
    } else if (line.toLowerCase().startsWith('add text')) {
      const textMatch = line.match(/add text\s+['"]([^'"]+)['"]/i);
      const posMatch = line.match(/at\s+(\d+),(\d+)/i);
      const sizeMatch = line.match(/size\s+(\d+)/i);

      if (textMatch) {
        const textContent = textMatch[1];
        const x = posMatch ? parseInt(posMatch[1]) : 100;
        const y = posMatch ? parseInt(posMatch[2]) : yOffset;
        const fontSize = sizeMatch ? parseInt(sizeMatch[1]) : 16;

        figma.loadFontAsync({ family: 'Roboto', style: 'Regular' }).then(() => {
          const text = figma.createText();
          text.characters = textContent;
          text.fontSize = fontSize;
          text.x = x;
          text.y = y;
          targetPage.appendChild(text);
        });

        actions.push({ type: 'add_text', params: { content: textContent, x, y, fontSize } });
        applied.push({ type: 'text', content: textContent, x, y });
      }
    } else if (line.toLowerCase().match(/add\s+(rect|rectangle)/)) {
      const sizeMatch = line.match(/(\d+)x(\d+)/i);
      const colorMatch = line.match(/#([0-9A-F]{6})/i);

      if (sizeMatch) {
        const width = parseInt(sizeMatch[1]);
        const height = parseInt(sizeMatch[2]);
        const rect = figma.createRectangle();
        rect.resize(width, height);
        rect.x = 100;
        rect.y = yOffset;

        if (colorMatch) {
          const hex = colorMatch[1];
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;
          rect.fills = [{ type: 'SOLID', color: { r, g, b } }];
        }

        targetPage.appendChild(rect);
        actions.push({ type: 'add_rectangle', params: { width, height, x: 100, y: yOffset } });
        applied.push({ type: 'rectangle', width, height, x: 100, y: yOffset });
        yOffset += height + itemGapY;
      }
    } else if (line.toLowerCase().startsWith('fill')) {
      const nodeMatch = line.match(/fill\s+(\S+)/i);
      const colorMatch = line.match(/#([0-9A-F]{6})/i);

      if (nodeMatch && colorMatch) {
        const nodeId = nodeMatch[1];
        const hex = colorMatch[1];
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        const node = figma.getNodeById(nodeId) as any;
        if (node && 'fills' in node) {
          node.fills = [{ type: 'SOLID', color: { r, g, b } }];
          actions.push({ type: 'update_fill', params: { nodeId, r, g, b } });
          applied.push({ type: 'color_update', nodeId, color: { r, g, b } });
        }
      }
    }
  }

  return { actions, applied };
}

async function updateNode(params: { nodeId: string; updates: Record<string, any> }) {
  const node = figma.getNodeById(params.nodeId) as SceneNode | null;
  if (!node) throw new Error(`Node not found: ${params.nodeId}`);

  const u = params.updates ?? {};

  // TEXT updates
  if (node.type === 'TEXT') {
    const text = node as TextNode;

    if (u.fontName || u.characters || u.fontSize) {
      const desiredFont = u.fontName ?? text.fontName;
      if (desiredFont && desiredFont !== figma.mixed) {
        await figma.loadFontAsync(desiredFont);
      }
    }

    if (typeof u.fontSize === 'number') text.fontSize = u.fontSize;

    if (u.fontName && u.fontName.family && u.fontName.style) {
      text.fontName = { family: u.fontName.family, style: u.fontName.style };
    }

    if (typeof u.characters === 'string') text.characters = u.characters;
  }

  // Fills
  if (u.fills && 'fills' in (node as any)) {
    (node as any).fills = u.fills;
  }

  // Effects (shadows, blurs)
  if (u.effects && 'effects' in (node as any)) {
    (node as any).effects = u.effects;
  }

  // Opacity
  if (typeof u.opacity === 'number' && 'opacity' in (node as any)) {
    (node as any).opacity = u.opacity;
  }

  // Position
  if (typeof u.x === 'number') (node as any).x = u.x;
  if (typeof u.y === 'number') (node as any).y = u.y;

  // Resize (if supported)
  if (typeof u.width === 'number' && typeof u.height === 'number' && 'resize' in (node as any)) {
    (node as any).resize(u.width, u.height);
  }

  // Border radius
  const br = u.borderRadius ?? u.cornerRadius;
  if (br !== undefined && 'cornerRadius' in (node as any)) {
    if (Array.isArray(br) && br.length === 4 && 'topLeftRadius' in (node as any)) {
      (node as any).topLeftRadius = br[0];
      (node as any).topRightRadius = br[1];
      (node as any).bottomRightRadius = br[2];
      (node as any).bottomLeftRadius = br[3];
    } else if (typeof br === 'number') {
      (node as any).cornerRadius = br;
    }
  }

  return { ok: true, nodeId: node.id, type: node.type };
}

/**
 * NEW: attach_node (re-parent existing node into a parent that supports children)
 * - parentId can be Frame/Group/Component/Page/etc. (any ChildrenMixin)
 * - nodeId is any SceneNode
 * - index optional: insertChild(index, node), else appendChild
 */
function attachNode(params: { parentId: string; nodeId: string; index?: number }) {
  const parent = figma.getNodeById(params.parentId) as (BaseNode & ChildrenMixin) | null;
  const node = figma.getNodeById(params.nodeId) as SceneNode | null;

  if (!parent) throw new Error(`Parent not found: ${params.parentId}`);
  if (!node) throw new Error(`Node not found: ${params.nodeId}`);

  if (!('appendChild' in parent) || typeof (parent as any).appendChild !== 'function') {
    throw new Error(`Parent cannot contain children: ${parent.type} (${parent.id})`);
  }

  // If node is already inside parent, no-op (still return ok)
  if ((node as any).parent?.id === parent.id) {
    return { ok: true, parentId: parent.id, nodeId: node.id, parentType: parent.type, note: 'Already attached' };
  }

  // Move node under parent
  if (typeof params.index === 'number' && Number.isFinite(params.index)) {
    parent.insertChild(params.index, node);
  } else {
    parent.appendChild(node);
  }

  return { ok: true, parentId: parent.id, nodeId: node.id, parentType: parent.type };
}

figma.showUI(uiHtml, { width: 360, height: 140 });

figma.ui.onmessage = async (msg: any) => {
  if (msg?.type !== 'MCP_REQUEST') return;

  const { id, method, params } = msg;

  try {
    let result: any;

    // Read operations
    if (method === 'get_document' || method === 'get_selection' || method === 'get_node' || method === 'get_nodes_info' || method === 'get_design_context') {
      const request: BridgeRequest = {
        type: method,
        requestId: id,
        nodeIds: params?.nodeIds,
        params,
      };
      const response = await handleReadDocumentRequest(request);
      figma.ui.postMessage({ ...response, type: 'MCP_RESPONSE', id });
      return;
    }

    // Write operations
    if (method === 'create_frame' || method === 'create_rectangle' || method === 'create_text') {
      const request: BridgeRequest = {
        type: method,
        requestId: id,
        params,
      };
      const response = await handleWriteCreateRequest(request);
      figma.ui.postMessage({ ...response, type: 'MCP_RESPONSE', id });
      return;
    }

    if (method === 'update_node' || method === 'attach_node' || method === 'delete_node') {
      const request: BridgeRequest = {
        type: method,
        requestId: id,
        nodeIds: params?.nodeIds || (params?.nodeId ? [params.nodeId] : []),
        params,
      };
      const response = await handleWriteModifyRequest(request);
      figma.ui.postMessage({ ...response, type: 'MCP_RESPONSE', id });
      return;
    }

    // Legacy operations
    if (method === 'scan_document') {
      result = scanDocument();
      figma.ui.postMessage({ type: 'MCP_RESPONSE', id, ok: true, result });
    } else if (method === 'generate_screens') {
      result = generateScreens(params?.names ?? [], params?.targetPageName ?? 'Generated');
      figma.ui.postMessage({ type: 'MCP_RESPONSE', id, ok: true, result });
    } else if (method === 'generate_from_prompt') {
      result = generateFromPrompt(params?.prompt ?? '', params?.targetPageName ?? 'From Prompt');
      figma.ui.postMessage({ type: 'MCP_RESPONSE', id, ok: true, result });
    } else {
      throw new Error(`Unknown method: ${method}`);
    }
  } catch (e: any) {
    figma.ui.postMessage({ type: 'MCP_RESPONSE', id, ok: false, error: e?.message ?? String(e) });
  }
};

