/// <reference types="@figma/plugin-typings" />

import { serializeNode, serializeStyles, deduplicateStyles, getBounds, toHex, serializePaints } from './serializers';

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_FRAME_SIZE = 100;
const DEFAULT_FONT_FAMILY = 'Inter';
const DEFAULT_FONT_STYLE = 'Regular';
const FRAMES_PER_ROW = 3;
const FRAME_GAP = 200;

// ── Errors ───────────────────────────────────────────────────────────────────

class FigmaAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FigmaAPIError';
  }
}

// ── Validation ───────────────────────────────────────────────────────────────

const validateNodeId = (id: string): void => {
  if (!id || typeof id !== 'string') throw new FigmaAPIError('Invalid node ID');
};

const validateNodeIds = (ids: string[]): void => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new FigmaAPIError('nodeIds array is required and cannot be empty');
  }
};

const getNodeOrThrow = (nodeId: string): BaseNode => {
  validateNodeId(nodeId);
  const node = figma.getNodeById(nodeId);
  if (!node) throw new FigmaAPIError(`Node not found: ${nodeId}`);
  return node;
};

const getAsyncNodeOrThrow = async (nodeId: string): Promise<BaseNode> => {
  validateNodeId(nodeId);
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) throw new FigmaAPIError(`Node not found: ${nodeId}`);
  return node;
};

// ── Document Operations ──────────────────────────────────────────────────────

export const getDocument = () => {
    return figma.root;
};

export const getDocumentAsync = async () => {
    const raw = await serializeNode(figma.root);
    const { tree, globalVars } = deduplicateStyles(raw);
    return globalVars ? { ...tree, globalVars } : tree;
};

// ── Selection Operations ─────────────────────────────────────────────────────

export const getSelection = async () => {
    return Promise.all(figma.currentPage.selection.map((node) => serializeNode(node)));
};

// ── Node Operations ──────────────────────────────────────────────────────────

export const getNodeById = (id: string): BaseNode => getNodeOrThrow(id);

export const getNodeByIdAsync = async (id: string): Promise<any> => {
  const node = await getAsyncNodeOrThrow(id);
  if (node.type === "DOCUMENT") throw new FigmaAPIError(`Cannot serialize document node: ${id}`);
  return serializeNode(node);
};

export const getNodesInfo = async (nodeIds: string[]): Promise<any[]> => {
  validateNodeIds(nodeIds);
  const nodes = await Promise.all(nodeIds.map(id => figma.getNodeByIdAsync(id)));
  const validNodes = nodes.filter((n): n is BaseNode => n !== null && n.type !== "DOCUMENT");
  return Promise.all(validNodes.map(n => serializeNode(n)));
};

interface DesignContextOptions {
  depth?: number;
  detail?: 'minimal' | 'compact' | 'full';
  dedupeComponents?: boolean;
}

const serializeForDetail = async (node: any, detail: string): Promise<any> => {
  const base = { id: node.id, name: node.name, type: node.type, bounds: getBounds(node) };
  if (detail === 'minimal') return base;

  const styles = await serializeStyles(node);
  const result: any = base;
  if (Object.keys(styles).length > 0) result.styles = styles;
  if ('opacity' in node && node.opacity !== 1) result.opacity = node.opacity;
  if ('visible' in node && !node.visible) result.visible = false;

  return detail === 'compact' ? result : serializeNode(node);
};

const walkDesignTree = async (node: any, currentDepth: number, maxDepth: number, detail: string): Promise<any> => {
  if (currentDepth > maxDepth) return null;

  const serialized = await serializeForDetail(node, detail);
  if (currentDepth >= maxDepth) return serialized;

  if ('children' in node && Array.isArray(node.children)) {
    const childResults = await Promise.all(
      node.children.map((child: any) => walkDesignTree(child, currentDepth + 1, maxDepth, detail))
    );
    serialized.children = childResults.filter((c): c is any => c !== null);
  }

  return serialized;
};

export const getDesignContext = async (options?: DesignContextOptions): Promise<any> => {
  const depth = options?.depth ?? 2;
  const detail = options?.detail ?? 'full';
  return walkDesignTree(figma.currentPage, 0, depth, detail);
};

// ── Create Operations ────────────────────────────────────────────────────────

interface CreateNodeParams {
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  parentId?: string;
  fillColor?: string;
}

interface CreateTextParams extends CreateNodeParams {
  text: string;
  fontFamily?: string;
  fontSize?: number;
}

const getOrCreateParent = async (parentId?: string): Promise<BaseNode & ChildrenMixin> => {
  if (!parentId) return figma.currentPage;
  const parent = await getAsyncNodeOrThrow(parentId);
  if (!('appendChild' in parent)) throw new FigmaAPIError(`Parent node cannot contain children: ${parent.type}`);
  return parent as BaseNode & ChildrenMixin;
};

const applyBasicNodeProps = (node: any, params: CreateNodeParams): void => {
  if (params.name) node.name = params.name;
  if (params.x != null) node.x = params.x;
  if (params.y != null) node.y = params.y;
  if (params.width && params.height) node.resize(params.width, params.height);
  if (params.fillColor) node.fills = [{ type: 'SOLID', color: hexToRgb(params.fillColor) }];
};

export const createRectangle = (x: number, y: number, width: number, height: number): RectangleNode => {
  const rect = figma.createRectangle();
  rect.x = x;
  rect.y = y;
  rect.resize(width, height);
  figma.currentPage.appendChild(rect);
  figma.commitUndo();
  return rect;
};

export const createFrame = async (params: CreateNodeParams): Promise<FrameNode> => {
  const parent = await getOrCreateParent(params.parentId);
  const frame = figma.createFrame();

  applyBasicNodeProps(frame, params);
  frame.name = params.name || 'Frame';
  if (!params.width) frame.resize(params.width || DEFAULT_FRAME_SIZE, params.height || DEFAULT_FRAME_SIZE);

  parent.appendChild(frame);
  figma.commitUndo();
  return frame;
};

export const createText = async (params: CreateTextParams): Promise<TextNode> => {
  const parent = await getOrCreateParent(params.parentId);
  const fontFamily = params.fontFamily || DEFAULT_FONT_FAMILY;
  const fontStyle = params.fontSize ? 'Regular' : DEFAULT_FONT_STYLE;

  await figma.loadFontAsync({ family: fontFamily, style: fontStyle });

  const textNode = figma.createText();
  textNode.fontName = { family: fontFamily, style: fontStyle };
  textNode.characters = params.text;

  applyBasicNodeProps(textNode, params);
  textNode.name = params.name || 'Text';
  if (params.fontSize) textNode.fontSize = params.fontSize;

  parent.appendChild(textNode);
  figma.commitUndo();
  return textNode;
};

// ── Update Operations ────────────────────────────────────────────────────────

interface NodeStyleUpdate {
  fillColor?: string;
  strokeColor?: string;
  strokeWeight?: number;
  cornerRadius?: number;
}

const applyStyleProperties = (node: any, style: NodeStyleUpdate): void => {
  if (style.fillColor && 'fills' in node) {
    node.fills = [{ type: 'SOLID', color: hexToRgb(style.fillColor) }];
  }
  if (style.strokeColor && 'strokes' in node) {
    node.strokes = [{ type: 'SOLID', color: hexToRgb(style.strokeColor), strokeWeight: style.strokeWeight || 1 }];
  }
  if (style.cornerRadius && 'cornerRadius' in node) {
    node.cornerRadius = style.cornerRadius;
  }
};

export const updateNodeProperties = (id: string, properties: Partial<SceneNode>): BaseNode => {
  const node = getNodeOrThrow(id) as SceneNode;
  Object.assign(node, properties);
  figma.commitUndo();
  return node;
};

export const updateNodeStyle = (id: string, style: NodeStyleUpdate): BaseNode => {
  const node = getNodeOrThrow(id) as SceneNode;
  applyStyleProperties(node, style);
  figma.commitUndo();
  return node;
};

export const updateNodeText = async (id: string, text: string, options?: { fontSize?: number; fontFamily?: string; fontStyle?: string }): Promise<TextNode> => {
  const node = getNodeOrThrow(id) as TextNode;
  if (node.type !== 'TEXT') throw new FigmaAPIError(`Node is not a text node: ${id}`);

  if (options?.fontFamily && options?.fontStyle) {
    await figma.loadFontAsync({ family: options.fontFamily, style: options.fontStyle });
    node.fontName = { family: options.fontFamily, style: options.fontStyle };
  }

  if (options?.fontSize) node.fontSize = options.fontSize;
  node.characters = text;

  figma.commitUndo();
  return node;
};

// ── Delete Operations ────────────────────────────────────────────────────────

export const deleteNode = (id: string): void => {
  const node = getNodeOrThrow(id);
  node.remove();
  figma.commitUndo();
};

export const deleteNodes = (ids: string[]): void => {
  validateNodeIds(ids);
  ids.forEach(id => deleteNode(id));
};

// ── Utility Functions ────────────────────────────────────────────────────────

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const clean = hex.replace('#', '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(clean)) throw new FigmaAPIError(`Invalid hex color: ${hex}`);

  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  return { r, g, b };
};

export const getParentNode = async (parentId?: string): Promise<BaseNode & ChildrenMixin> => {
  return getOrCreateParent(parentId);
};

export const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

interface LayoutConfig {
  direction?: string;
  gap?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  alignItems?: string;
  justifyContent?: string;
}

export const applyAutoLayout = (frame: FrameNode | ComponentNode | InstanceNode, layout?: LayoutConfig): void => {
  if (!layout) return;

  const node = frame as any;
  if (layout.direction) node.layoutMode = layout.direction;
  if (layout.gap != null) node.itemSpacing = layout.gap;
  if (layout.paddingTop != null) node.paddingTop = layout.paddingTop;
  if (layout.paddingRight != null) node.paddingRight = layout.paddingRight;
  if (layout.paddingBottom != null) node.paddingBottom = layout.paddingBottom;
  if (layout.paddingLeft != null) node.paddingLeft = layout.paddingLeft;
  if (layout.alignItems) node.primaryAxisAlign = layout.alignItems;
  if (layout.justifyContent) node.counterAxisAlign = layout.justifyContent;
};