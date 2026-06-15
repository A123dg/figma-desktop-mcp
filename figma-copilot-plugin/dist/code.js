/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/code.ts"
/*!*********************!*\
  !*** ./src/code.ts ***!
  \*********************/
(__unused_webpack_module, exports, __webpack_require__) {


/// <reference types="@figma/plugin-typings" />
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const index_html_1 = __importDefault(__webpack_require__(/*! ./ui/index.html */ "./src/ui/index.html"));
const serializers_1 = __webpack_require__(/*! ./utils/serializers */ "./src/utils/serializers.ts");
const figmaAPI = __importStar(__webpack_require__(/*! ./utils/figma-api */ "./src/utils/figma-api.ts"));
// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MAX_DEPTH = 8;
const MAX_NODES = 600;
const FRAMES_PER_ROW = 3;
const FRAME_GAP = 200;
const ITEM_GAP_Y = 150;
// â”€â”€ Parsing Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const isMixed = (value) => value === figma.mixed;
const round10 = (n) => Math.round(n / 10) * 10;
const parseRGB = (color) => {
    var _a, _b, _c;
    return ({
        r: (_a = color === null || color === void 0 ? void 0 : color.r) !== null && _a !== void 0 ? _a : 0,
        g: (_b = color === null || color === void 0 ? void 0 : color.g) !== null && _b !== void 0 ? _b : 0,
        b: (_c = color === null || color === void 0 ? void 0 : color.b) !== null && _c !== void 0 ? _c : 0,
    });
};
const parseFills = (node) => {
    const { fills } = node;
    if (!fills || isMixed(fills) || !Array.isArray(fills))
        return [];
    return fills.map((f) => {
        var _a, _b, _c;
        if (f.type === 'SOLID') {
            return {
                type: 'SOLID',
                color: parseRGB(f.color),
                opacity: (_a = f.opacity) !== null && _a !== void 0 ? _a : 1,
            };
        }
        if (f.type === 'LINEAR_GRADIENT' || f.type === 'RADIAL_GRADIENT') {
            return { type: f.type, opacity: (_b = f.opacity) !== null && _b !== void 0 ? _b : 1 };
        }
        if (f.type === 'IMAGE') {
            return { type: 'IMAGE', opacity: (_c = f.opacity) !== null && _c !== void 0 ? _c : 1 };
        }
        return { type: 'OTHER' };
    });
};
const parseStrokes = (node) => {
    const { strokes } = node;
    if (!strokes || isMixed(strokes) || !Array.isArray(strokes))
        return [];
    return strokes.map((s) => {
        var _a, _b, _c, _d;
        return ({
            color: parseRGB(s.color),
            opacity: (_a = s.opacity) !== null && _a !== void 0 ? _a : 1,
            weight: (_b = s.weight) !== null && _b !== void 0 ? _b : 1,
            align: (_c = s.strokeAlign) !== null && _c !== void 0 ? _c : 'INSIDE',
            type: (_d = s.type) !== null && _d !== void 0 ? _d : 'SOLID',
        });
    });
};
const parseEffects = (node) => {
    const { effects } = node;
    if (!effects || isMixed(effects) || !Array.isArray(effects))
        return [];
    return effects.map((e) => {
        var _a, _b;
        return ({
            type: e.type,
            color: e.color ? parseRGB(e.color) : undefined,
            opacity: (_b = (_a = e.color) === null || _a === void 0 ? void 0 : _a.a) !== null && _b !== void 0 ? _b : e.opacity,
            offset: e.offset ? { x: e.offset.x, y: e.offset.y } : undefined,
            radius: e.radius,
            spread: e.spread,
            visible: e.visible,
        });
    });
};
const parseBorderRadius = (node) => {
    var _a, _b, _c, _d;
    if (!('cornerRadius' in node))
        return undefined;
    const { cornerRadius } = node;
    if (isMixed(cornerRadius)) {
        try {
            return [
                (_a = node.topLeftRadius) !== null && _a !== void 0 ? _a : 0,
                (_b = node.topRightRadius) !== null && _b !== void 0 ? _b : 0,
                (_c = node.bottomRightRadius) !== null && _c !== void 0 ? _c : 0,
                (_d = node.bottomLeftRadius) !== null && _d !== void 0 ? _d : 0,
            ];
        }
        catch (_e) {
            return undefined;
        }
    }
    return typeof cornerRadius === 'number' ? cornerRadius : undefined;
};
const parseAutoLayout = (node) => {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!('layoutMode' in node) || node.layoutMode === 'NONE')
        return undefined;
    return {
        direction: node.layoutMode,
        gap: (_a = node.itemSpacing) !== null && _a !== void 0 ? _a : 0,
        paddingTop: (_b = node.paddingTop) !== null && _b !== void 0 ? _b : 0,
        paddingRight: (_c = node.paddingRight) !== null && _c !== void 0 ? _c : 0,
        paddingBottom: (_d = node.paddingBottom) !== null && _d !== void 0 ? _d : 0,
        paddingLeft: (_e = node.paddingLeft) !== null && _e !== void 0 ? _e : 0,
        alignItems: (_f = node.primaryAxisAlign) !== null && _f !== void 0 ? _f : 'MIN',
        justifyContent: (_g = node.counterAxisAlign) !== null && _g !== void 0 ? _g : 'MIN',
    };
};
// â”€â”€ Document Scanning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let nodeCount = 0;
const scanNode = (node, depth) => {
    var _a, _b, _c;
    if (nodeCount >= MAX_NODES)
        return null;
    nodeCount++;
    const base = {
        id: node.id,
        name: node.name,
        type: node.type,
        x: Math.round(node.x * 100) / 100,
        y: Math.round(node.y * 100) / 100,
        width: Math.round(node.width * 100) / 100,
        height: Math.round(node.height * 100) / 100,
        visible: node.visible,
        opacity: (_a = node.opacity) !== null && _a !== void 0 ? _a : 1,
    };
    const n = node;
    // Fills, Strokes, Effects
    const fills = parseFills(n);
    if (fills.length)
        base.fills = fills;
    const strokes = parseStrokes(n);
    if (strokes.length)
        base.strokes = strokes;
    const effects = parseEffects(n);
    if (effects.length)
        base.effects = effects;
    const br = parseBorderRadius(n);
    if (br !== undefined)
        base.borderRadius = br;
    // AutoLayout
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        const al = parseAutoLayout(n);
        if (al)
            base.autoLayout = al;
    }
    // Text properties
    if (node.type === 'TEXT') {
        base.text = n.characters;
        base.fontSize = isMixed(n.fontSize) ? undefined : n.fontSize;
        base.fontFamily = isMixed(n.fontName) ? undefined : (_b = n.fontName) === null || _b === void 0 ? void 0 : _b.family;
        base.fontWeight = isMixed(n.fontName) ? undefined : (_c = n.fontName) === null || _c === void 0 ? void 0 : _c.style;
        base.textAlign = isMixed(n.textAlignHorizontal) ? undefined : n.textAlignHorizontal;
        const tf = fills.find((f) => f.type === 'SOLID');
        if (tf === null || tf === void 0 ? void 0 : tf.color)
            base.textColor = tf.color;
    }
    // Component reference
    if (node.type === 'INSTANCE') {
        const mainComp = node.mainComponent;
        if (mainComp)
            base.componentName = mainComp.name;
    }
    // Image flag
    if (fills.some((f) => f.type === 'IMAGE')) {
        base.imageUrl = null;
    }
    // Children (recursive)
    if ('children' in node && depth < MAX_DEPTH) {
        const children = [];
        for (const child of node.children) {
            const scanned = scanNode(child, depth + 1);
            if (scanned)
                children.push(scanned);
        }
        if (children.length)
            base.children = children;
    }
    return base;
};
const scanDocument = () => {
    var _a, _b, _c, _d, _e, _f, _g;
    nodeCount = 0;
    const pages = [];
    const fontSet = new Set();
    const colorSet = new Map();
    // Scan all pages
    for (const page of figma.root.children) {
        const screens = [];
        for (const node of page.children) {
            const scanned = scanNode(node, 0);
            if (scanned)
                screens.push(scanned);
        }
        pages.push({ id: page.id, name: page.name, screens });
    }
    // Collect styles from all nodes
    const collectStyles = (nodes) => {
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
            if (n.fontFamily)
                fontSet.add(`${n.fontFamily} ${n.fontWeight || 'Regular'}`);
            if (n.children)
                collectStyles(n.children);
        }
    };
    for (const p of pages)
        collectStyles(p.screens);
    // Analyze frame sizes and backgrounds
    const sizeCount = new Map();
    const bgCount = new Map();
    for (const p of pages) {
        for (const s of p.screens) {
            if (s.type !== 'FRAME')
                continue;
            const w = round10(s.width);
            const h = round10(s.height);
            const k = `${w}x${h}`;
            sizeCount.set(k, { w, h, count: ((_b = (_a = sizeCount.get(k)) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0) + 1 });
            const solidBg = (_c = s.fills) === null || _c === void 0 ? void 0 : _c.find((f) => f.type === 'SOLID');
            if (solidBg === null || solidBg === void 0 ? void 0 : solidBg.color) {
                const r = Math.round(solidBg.color.r * 100) / 100;
                const g = Math.round(solidBg.color.g * 100) / 100;
                const b = Math.round(solidBg.color.b * 100) / 100;
                const bk = `${r},${g},${b}`;
                bgCount.set(bk, { rgb: { r, g, b }, count: ((_e = (_d = bgCount.get(bk)) === null || _d === void 0 ? void 0 : _d.count) !== null && _e !== void 0 ? _e : 0) + 1 });
            }
        }
    }
    const bestSize = (_f = [...sizeCount.values()].sort((a, b) => b.count - a.count)[0]) !== null && _f !== void 0 ? _f : { w: 1440, h: 900, count: 1 };
    const bestBg = (_g = [...bgCount.values()].sort((a, b) => b.count - a.count)[0]) === null || _g === void 0 ? void 0 : _g.rgb;
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
const ensurePage = (name) => {
    const existing = figma.root.children.find((p) => p.name === name);
    if (existing)
        return existing;
    const page = figma.createPage();
    page.name = name;
    return page;
};
const normalizeName = (s) => s.trim().toLowerCase();
const generateScreens = (names, targetPageName = 'Generated') => {
    const scan = scanDocument();
    const targetPage = ensurePage(targetPageName);
    figma.currentPage = targetPage;
    const existing = new Set();
    for (const p of scan.pages) {
        for (const s of p.screens) {
            existing.add(normalizeName(s.name));
        }
    }
    const wanted = names.map((n) => n.trim()).filter(Boolean);
    const missing = wanted.filter((n) => !existing.has(normalizeName(n)));
    const skippedExisting = wanted.filter((n) => existing.has(normalizeName(n)));
    const { width, height } = scan.styleHints.defaultSize;
    const bg = scan.styleHints.defaultBg;
    const created = [];
    missing.forEach((name, i) => {
        const frame = figma.createFrame();
        frame.name = name;
        frame.resize(width, height);
        if (bg)
            frame.fills = [{ type: 'SOLID', color: bg }];
        frame.x = (i % FRAMES_PER_ROW) * (width + FRAME_GAP);
        frame.y = Math.floor(i / FRAMES_PER_ROW) * (height + FRAME_GAP);
        targetPage.appendChild(frame);
        created.push({ id: frame.id, name: frame.name });
    });
    return { created, skippedExisting };
};
// â”€â”€ Read Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function handleReadDocumentRequest(request) {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        const { type, requestId } = request;
        if (type === 'get_document') {
            const raw = yield (0, serializers_1.serializeNode)(figma.currentPage);
            const { tree, globalVars } = (0, serializers_1.deduplicateStyles)(raw);
            return {
                type,
                requestId,
                data: globalVars ? Object.assign(Object.assign({}, tree), { globalVars }) : tree,
            };
        }
        if (type === 'get_selection') {
            const selection = yield Promise.all(figma.currentPage.selection.map((node) => (0, serializers_1.serializeNode)(node)));
            return {
                type,
                requestId,
                data: selection,
            };
        }
        if (type === 'get_node') {
            const nodeId = (_a = request.nodeIds) === null || _a === void 0 ? void 0 : _a[0];
            if (!nodeId)
                throw new Error('nodeIds is required for get_node');
            const node = yield figma.getNodeByIdAsync(nodeId);
            if (!node || node.type === 'DOCUMENT') {
                throw new Error(`Node not found: ${nodeId}`);
            }
            const serialized = yield (0, serializers_1.serializeNode)(node);
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
            const nodes = yield Promise.all(nodeIds.map((id) => figma.getNodeByIdAsync(id)));
            const data = yield Promise.all(nodes
                .filter((n) => n !== null && n.type !== 'DOCUMENT')
                .map((n) => (0, serializers_1.serializeNode)(n)));
            return {
                type,
                requestId,
                data,
            };
        }
        if (type === 'get_design_context') {
            const depth = (_c = (_b = request.params) === null || _b === void 0 ? void 0 : _b.depth) !== null && _c !== void 0 ? _c : 2;
            const detail = ((_d = request.params) === null || _d === void 0 ? void 0 : _d.detail) || 'full';
            const dedupeComponents = !!((_e = request.params) === null || _e === void 0 ? void 0 : _e.dedupeComponents);
            const serializeForDetail = (n) => __awaiter(this, void 0, void 0, function* () {
                const base = {
                    id: n.id,
                    name: n.name,
                    type: n.type,
                    bounds: (0, serializers_1.getBounds)(n),
                };
                if (detail === 'minimal')
                    return base;
                const styles = yield (0, serializers_1.serializeStyles)(n);
                const result = Object.assign({}, base);
                if (Object.keys(styles).length > 0)
                    result.styles = styles;
                if ('opacity' in n && n.opacity !== 1)
                    result.opacity = n.opacity;
                if ('visible' in n && !n.visible)
                    result.visible = false;
                if (detail === 'compact')
                    return result;
                return yield (0, serializers_1.serializeNode)(n);
            });
            const walk = (n, d) => __awaiter(this, void 0, void 0, function* () {
                if (d > depth)
                    return null;
                const node = yield serializeForDetail(n);
                if (d >= depth)
                    return node;
                if ('children' in n && Array.isArray(n.children)) {
                    const children = yield Promise.all(n.children.map((child) => walk(child, d + 1)));
                    node.children = children.filter((c) => c !== null);
                }
                return node;
            });
            const data = yield walk(figma.currentPage, 0);
            return {
                type,
                requestId,
                data,
            };
        }
        throw new Error(`Unknown read operation: ${type}`);
    });
}
// â”€â”€ Write Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function handleWriteCreateRequest(request) {
    return __awaiter(this, void 0, void 0, function* () {
        const { type, requestId, params = {} } = request;
        if (type === 'create_frame') {
            const parent = yield figmaAPI.getParentNode(params.parentId);
            const frame = figma.createFrame();
            frame.resize(params.width || 100, params.height || 100);
            frame.x = params.x != null ? params.x : 0;
            frame.y = params.y != null ? params.y : 0;
            if (params.name)
                frame.name = params.name;
            if (params.fillColor)
                frame.fills = [{ type: 'SOLID', color: figmaAPI.hexToRgb(params.fillColor) }];
            figmaAPI.applyAutoLayout(frame, params);
            parent.appendChild(frame);
            figma.commitUndo();
            return {
                type,
                requestId,
                data: {
                    id: frame.id,
                    name: frame.name,
                    type: frame.type,
                    bounds: (0, serializers_1.getBounds)(frame),
                },
            };
        }
        if (type === 'create_rectangle') {
            const parent = yield figmaAPI.getParentNode(params.parentId);
            const rect = figma.createRectangle();
            rect.resize(params.width || 100, params.height || 100);
            rect.x = params.x != null ? params.x : 0;
            rect.y = params.y != null ? params.y : 0;
            if (params.name)
                rect.name = params.name;
            if (params.fillColor)
                rect.fills = [{ type: 'SOLID', color: figmaAPI.hexToRgb(params.fillColor) }];
            if (params.cornerRadius != null)
                rect.cornerRadius = params.cornerRadius;
            parent.appendChild(rect);
            figma.commitUndo();
            return {
                type,
                requestId,
                data: {
                    id: rect.id,
                    name: rect.name,
                    type: rect.type,
                    bounds: (0, serializers_1.getBounds)(rect),
                },
            };
        }
        if (type === 'create_text') {
            const parent = yield figmaAPI.getParentNode(params.parentId);
            const fontFamily = params.fontFamily || 'Inter';
            const fontStyle = params.fontStyle || 'Regular';
            yield figma.loadFontAsync({ family: fontFamily, style: fontStyle });
            const textNode = figma.createText();
            textNode.fontName = { family: fontFamily, style: fontStyle };
            if (params.fontSize != null)
                textNode.fontSize = Number(params.fontSize);
            textNode.characters = params.text || '';
            textNode.x = params.x != null ? params.x : 0;
            textNode.y = params.y != null ? params.y : 0;
            if (params.name)
                textNode.name = params.name;
            if (params.fillColor)
                textNode.fills = [{ type: 'SOLID', color: figmaAPI.hexToRgb(params.fillColor) }];
            parent.appendChild(textNode);
            figma.commitUndo();
            return {
                type,
                requestId,
                data: {
                    id: textNode.id,
                    name: textNode.name,
                    type: textNode.type,
                    bounds: (0, serializers_1.getBounds)(textNode),
                },
            };
        }
        throw new Error(`Unknown create operation: ${type}`);
    });
}
function handleWriteModifyRequest(request) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const { type, requestId, nodeIds = [], params = {} } = request;
        if (type === 'update_node') {
            const nodeId = nodeIds[0];
            if (!nodeId)
                throw new Error('nodeId is required');
            const node = (yield figma.getNodeByIdAsync(nodeId));
            if (!node)
                throw new Error(`Node not found: ${nodeId}`);
            // TEXT updates
            if (node.type === 'TEXT') {
                if (params.fontName || params.characters || params.fontSize) {
                    const desiredFont = params.fontName || node.fontName;
                    if (desiredFont && desiredFont !== figma.mixed) {
                        yield figma.loadFontAsync(desiredFont);
                    }
                }
                if (typeof params.fontSize === 'number')
                    node.fontSize = params.fontSize;
                if (params.fontName && params.fontName.family && params.fontName.style) {
                    node.fontName = { family: params.fontName.family, style: params.fontName.style };
                }
                if (typeof params.characters === 'string')
                    node.characters = params.characters;
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
            if (typeof params.x === 'number')
                node.x = params.x;
            if (typeof params.y === 'number')
                node.y = params.y;
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
                }
                else if (typeof br === 'number') {
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
            const parent = (yield figma.getNodeByIdAsync(parentId));
            const node = (yield figma.getNodeByIdAsync(nodeId));
            if (!parent)
                throw new Error(`Parent not found: ${parentId}`);
            if (!node)
                throw new Error(`Node not found: ${nodeId}`);
            if (!('appendChild' in parent)) {
                throw new Error(`Parent cannot contain children: ${parent.type}`);
            }
            if (((_a = node.parent) === null || _a === void 0 ? void 0 : _a.id) === parent.id) {
                return {
                    type,
                    requestId,
                    data: {
                        ok: true,
                        parentId: parent.id,
                        nodeId: node.id,
                        parentType: parent.type,
                        note: 'Already attached',
                    },
                };
            }
            if (typeof params.index === 'number' && Number.isFinite(params.index)) {
                parent.insertChild(params.index, node);
            }
            else {
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
            if (!nodeId)
                throw new Error('nodeId is required');
            const node = yield figma.getNodeByIdAsync(nodeId);
            if (!node)
                throw new Error(`Node not found: ${nodeId}`);
            node.remove();
            figma.commitUndo();
            return {
                type,
                requestId,
                data: { ok: true, nodeId },
            };
        }
        throw new Error(`Unknown write operation: ${type}`);
    });
}
// â”€â”€ Legacy Document Scanning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function generateFromPrompt(prompt, targetPageName = 'From Prompt') {
    const scan = scanDocument();
    const targetPage = ensurePage(targetPageName);
    figma.currentPage = targetPage;
    const { width: defaultWidth, height: defaultHeight } = scan.styleHints.defaultSize;
    const defaultBg = scan.styleHints.defaultBg;
    const actions = [];
    const applied = [];
    const lines = prompt.split('|').map((s) => s.trim());
    let yOffset = 0;
    const itemGapY = 150;
    for (const line of lines) {
        if (!line)
            continue;
        if (line.toLowerCase().startsWith('add frame')) {
            const match = line.match(/add frame\s+['"]([^'"]+)['"]/i);
            if (match) {
                const frameName = match[1];
                const frame = figma.createFrame();
                frame.name = frameName;
                frame.resize(defaultWidth, defaultHeight);
                if (defaultBg)
                    frame.fills = [{ type: 'SOLID', color: defaultBg }];
                frame.y = yOffset;
                targetPage.appendChild(frame);
                actions.push({ type: 'add_frame', params: { name: frameName } });
                applied.push({ type: 'frame', id: frame.id, name: frameName });
                yOffset += defaultHeight + itemGapY;
            }
        }
        else if (line.toLowerCase().startsWith('add text')) {
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
        }
        else if (line.toLowerCase().match(/add\s+(rect|rectangle)/)) {
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
        }
        else if (line.toLowerCase().startsWith('fill')) {
            const nodeMatch = line.match(/fill\s+(\S+)/i);
            const colorMatch = line.match(/#([0-9A-F]{6})/i);
            if (nodeMatch && colorMatch) {
                const nodeId = nodeMatch[1];
                const hex = colorMatch[1];
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                const node = figma.getNodeById(nodeId);
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
function updateNode(params) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const node = figma.getNodeById(params.nodeId);
        if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
        const u = (_a = params.updates) !== null && _a !== void 0 ? _a : {};
        // TEXT updates
        if (node.type === 'TEXT') {
            const text = node;
            if (u.fontName || u.characters || u.fontSize) {
                const desiredFont = (_b = u.fontName) !== null && _b !== void 0 ? _b : text.fontName;
                if (desiredFont && desiredFont !== figma.mixed) {
                    yield figma.loadFontAsync(desiredFont);
                }
            }
            if (typeof u.fontSize === 'number')
                text.fontSize = u.fontSize;
            if (u.fontName && u.fontName.family && u.fontName.style) {
                text.fontName = { family: u.fontName.family, style: u.fontName.style };
            }
            if (typeof u.characters === 'string')
                text.characters = u.characters;
        }
        // Fills
        if (u.fills && 'fills' in node) {
            node.fills = u.fills;
        }
        // Effects (shadows, blurs)
        if (u.effects && 'effects' in node) {
            node.effects = u.effects;
        }
        // Opacity
        if (typeof u.opacity === 'number' && 'opacity' in node) {
            node.opacity = u.opacity;
        }
        // Position
        if (typeof u.x === 'number')
            node.x = u.x;
        if (typeof u.y === 'number')
            node.y = u.y;
        // Resize (if supported)
        if (typeof u.width === 'number' && typeof u.height === 'number' && 'resize' in node) {
            node.resize(u.width, u.height);
        }
        // Border radius
        const br = (_c = u.borderRadius) !== null && _c !== void 0 ? _c : u.cornerRadius;
        if (br !== undefined && 'cornerRadius' in node) {
            if (Array.isArray(br) && br.length === 4 && 'topLeftRadius' in node) {
                node.topLeftRadius = br[0];
                node.topRightRadius = br[1];
                node.bottomRightRadius = br[2];
                node.bottomLeftRadius = br[3];
            }
            else if (typeof br === 'number') {
                node.cornerRadius = br;
            }
        }
        return { ok: true, nodeId: node.id, type: node.type };
    });
}
/**
 * NEW: attach_node (re-parent existing node into a parent that supports children)
 * - parentId can be Frame/Group/Component/Page/etc. (any ChildrenMixin)
 * - nodeId is any SceneNode
 * - index optional: insertChild(index, node), else appendChild
 */
function attachNode(params) {
    var _a;
    const parent = figma.getNodeById(params.parentId);
    const node = figma.getNodeById(params.nodeId);
    if (!parent)
        throw new Error(`Parent not found: ${params.parentId}`);
    if (!node)
        throw new Error(`Node not found: ${params.nodeId}`);
    if (!('appendChild' in parent) || typeof parent.appendChild !== 'function') {
        throw new Error(`Parent cannot contain children: ${parent.type} (${parent.id})`);
    }
    // If node is already inside parent, no-op (still return ok)
    if (((_a = node.parent) === null || _a === void 0 ? void 0 : _a.id) === parent.id) {
        return { ok: true, parentId: parent.id, nodeId: node.id, parentType: parent.type, note: 'Already attached' };
    }
    // Move node under parent
    if (typeof params.index === 'number' && Number.isFinite(params.index)) {
        parent.insertChild(params.index, node);
    }
    else {
        parent.appendChild(node);
    }
    return { ok: true, parentId: parent.id, nodeId: node.id, parentType: parent.type };
}
figma.showUI(index_html_1.default, { width: 360, height: 140 });
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    if ((msg === null || msg === void 0 ? void 0 : msg.type) !== 'MCP_REQUEST')
        return;
    const { id, method, params } = msg;
    try {
        let result;
        // Read operations
        if (method === 'get_document' || method === 'get_selection' || method === 'get_node' || method === 'get_nodes_info' || method === 'get_design_context') {
            const request = {
                type: method,
                requestId: id,
                nodeIds: params === null || params === void 0 ? void 0 : params.nodeIds,
                params,
            };
            const response = yield handleReadDocumentRequest(request);
            figma.ui.postMessage(Object.assign(Object.assign({}, response), { type: 'MCP_RESPONSE', id }));
            return;
        }
        // Write operations
        if (method === 'create_frame' || method === 'create_rectangle' || method === 'create_text') {
            const request = {
                type: method,
                requestId: id,
                params,
            };
            const response = yield handleWriteCreateRequest(request);
            figma.ui.postMessage(Object.assign(Object.assign({}, response), { type: 'MCP_RESPONSE', id }));
            return;
        }
        if (method === 'update_node' || method === 'attach_node' || method === 'delete_node') {
            const request = {
                type: method,
                requestId: id,
                nodeIds: (params === null || params === void 0 ? void 0 : params.nodeIds) || ((params === null || params === void 0 ? void 0 : params.nodeId) ? [params.nodeId] : []),
                params,
            };
            const response = yield handleWriteModifyRequest(request);
            figma.ui.postMessage(Object.assign(Object.assign({}, response), { type: 'MCP_RESPONSE', id }));
            return;
        }
        // Legacy operations
        if (method === 'scan_document') {
            result = scanDocument();
            figma.ui.postMessage({ type: 'MCP_RESPONSE', id, ok: true, result });
        }
        else if (method === 'generate_screens') {
            result = generateScreens((_a = params === null || params === void 0 ? void 0 : params.names) !== null && _a !== void 0 ? _a : [], (_b = params === null || params === void 0 ? void 0 : params.targetPageName) !== null && _b !== void 0 ? _b : 'Generated');
            figma.ui.postMessage({ type: 'MCP_RESPONSE', id, ok: true, result });
        }
        else if (method === 'generate_from_prompt') {
            result = generateFromPrompt((_c = params === null || params === void 0 ? void 0 : params.prompt) !== null && _c !== void 0 ? _c : '', (_d = params === null || params === void 0 ? void 0 : params.targetPageName) !== null && _d !== void 0 ? _d : 'From Prompt');
            figma.ui.postMessage({ type: 'MCP_RESPONSE', id, ok: true, result });
        }
        else {
            throw new Error(`Unknown method: ${method}`);
        }
    }
    catch (e) {
        figma.ui.postMessage({ type: 'MCP_RESPONSE', id, ok: false, error: (_e = e === null || e === void 0 ? void 0 : e.message) !== null && _e !== void 0 ? _e : String(e) });
    }
});


/***/ },

/***/ "./src/ui/index.html"
/*!***************************!*\
  !*** ./src/ui/index.html ***!
  \***************************/
(module) {

module.exports = "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\" />\n    <title>MCP Bridge</title>\n    <style>\n      body { font-family: Inter, system-ui, Arial; margin: 0; }\n      .wrap { padding: 12px; }\n      .muted { color: #666; font-size: 12px; }\n      .status { font-size: 12px; margin-top: 6px; }\n    </style>\n  </head>\n  <body>\n    <div class=\"wrap\">\n      <div><b>MCP Bridge</b></div>\n      <div id=\"status\" class=\"status\">Connecting...</div>\n      <div class=\"muted\" style=\"margin-top:10px\">\n        Keep this window open. Copilot calls MCP tools → server → this plugin.\n      </div>\n    </div>\n\n    <script>\n      const RELAY_URL = 'ws://127.0.0.1:8765';\n      const el = document.getElementById('status');\n\n      function setStatus(t) { el.textContent = t; }\n\n      let ws;\n      try {\n        ws = new WebSocket(RELAY_URL);\n\n        ws.onopen = () => setStatus('Connected → ' + RELAY_URL);\n        ws.onclose = () => setStatus('Disconnected');\n        ws.onerror = () => setStatus('Error (start relay server first)');\n\n        // relay -> plugin main\n        ws.onmessage = (event) => {\n          try {\n            const msg = JSON.parse(event.data);\n            parent.postMessage({ pluginMessage: { type: 'MCP_REQUEST', ...msg } }, '*');\n          } catch {}\n        };\n\n        // plugin main -> relay\n        window.onmessage = (event) => {\n          const m = event.data && event.data.pluginMessage;\n          if (m && m.type === 'MCP_RESPONSE') {\n            ws.send(JSON.stringify({ id: m.id, ok: m.ok, result: m.result, error: m.error }));\n          }\n        };\n      } catch (e) {\n        setStatus('Failed to init WebSocket');\n      }\n    </script>\n  </body>\n</html>";

/***/ },

/***/ "./src/utils/figma-api.ts"
/*!********************************!*\
  !*** ./src/utils/figma-api.ts ***!
  \********************************/
(__unused_webpack_module, exports, __webpack_require__) {


/// <reference types="@figma/plugin-typings" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.applyAutoLayout = exports.base64ToBytes = exports.getParentNode = exports.hexToRgb = exports.deleteNodes = exports.deleteNode = exports.updateNodeText = exports.updateNodeStyle = exports.updateNodeProperties = exports.createText = exports.createFrame = exports.createRectangle = exports.getDesignContext = exports.getNodesInfo = exports.getNodeByIdAsync = exports.getNodeById = exports.getSelection = exports.getDocumentAsync = exports.getDocument = void 0;
const serializers_1 = __webpack_require__(/*! ./serializers */ "./src/utils/serializers.ts");
// ── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_FRAME_SIZE = 100;
const DEFAULT_FONT_FAMILY = 'Inter';
const DEFAULT_FONT_STYLE = 'Regular';
const FRAMES_PER_ROW = 3;
const FRAME_GAP = 200;
// ── Errors ───────────────────────────────────────────────────────────────────
class FigmaAPIError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FigmaAPIError';
    }
}
// ── Validation ───────────────────────────────────────────────────────────────
const validateNodeId = (id) => {
    if (!id || typeof id !== 'string')
        throw new FigmaAPIError('Invalid node ID');
};
const validateNodeIds = (ids) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new FigmaAPIError('nodeIds array is required and cannot be empty');
    }
};
const getNodeOrThrow = (nodeId) => {
    validateNodeId(nodeId);
    const node = figma.getNodeById(nodeId);
    if (!node)
        throw new FigmaAPIError(`Node not found: ${nodeId}`);
    return node;
};
const getAsyncNodeOrThrow = (nodeId) => __awaiter(void 0, void 0, void 0, function* () {
    validateNodeId(nodeId);
    const node = yield figma.getNodeByIdAsync(nodeId);
    if (!node)
        throw new FigmaAPIError(`Node not found: ${nodeId}`);
    return node;
});
// ── Document Operations ──────────────────────────────────────────────────────
const getDocument = () => {
    return figma.root;
};
exports.getDocument = getDocument;
const getDocumentAsync = () => __awaiter(void 0, void 0, void 0, function* () {
    const raw = yield (0, serializers_1.serializeNode)(figma.root);
    const { tree, globalVars } = (0, serializers_1.deduplicateStyles)(raw);
    return globalVars ? Object.assign(Object.assign({}, tree), { globalVars }) : tree;
});
exports.getDocumentAsync = getDocumentAsync;
// ── Selection Operations ─────────────────────────────────────────────────────
const getSelection = () => __awaiter(void 0, void 0, void 0, function* () {
    return Promise.all(figma.currentPage.selection.map((node) => (0, serializers_1.serializeNode)(node)));
});
exports.getSelection = getSelection;
// ── Node Operations ──────────────────────────────────────────────────────────
const getNodeById = (id) => getNodeOrThrow(id);
exports.getNodeById = getNodeById;
const getNodeByIdAsync = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const node = yield getAsyncNodeOrThrow(id);
    if (node.type === "DOCUMENT")
        throw new FigmaAPIError(`Cannot serialize document node: ${id}`);
    return (0, serializers_1.serializeNode)(node);
});
exports.getNodeByIdAsync = getNodeByIdAsync;
const getNodesInfo = (nodeIds) => __awaiter(void 0, void 0, void 0, function* () {
    validateNodeIds(nodeIds);
    const nodes = yield Promise.all(nodeIds.map(id => figma.getNodeByIdAsync(id)));
    const validNodes = nodes.filter((n) => n !== null && n.type !== "DOCUMENT");
    return Promise.all(validNodes.map(n => (0, serializers_1.serializeNode)(n)));
});
exports.getNodesInfo = getNodesInfo;
const serializeForDetail = (node, detail) => __awaiter(void 0, void 0, void 0, function* () {
    const base = { id: node.id, name: node.name, type: node.type, bounds: (0, serializers_1.getBounds)(node) };
    if (detail === 'minimal')
        return base;
    const styles = yield (0, serializers_1.serializeStyles)(node);
    const result = base;
    if (Object.keys(styles).length > 0)
        result.styles = styles;
    if ('opacity' in node && node.opacity !== 1)
        result.opacity = node.opacity;
    if ('visible' in node && !node.visible)
        result.visible = false;
    return detail === 'compact' ? result : (0, serializers_1.serializeNode)(node);
});
const walkDesignTree = (node, currentDepth, maxDepth, detail) => __awaiter(void 0, void 0, void 0, function* () {
    if (currentDepth > maxDepth)
        return null;
    const serialized = yield serializeForDetail(node, detail);
    if (currentDepth >= maxDepth)
        return serialized;
    if ('children' in node && Array.isArray(node.children)) {
        const childResults = yield Promise.all(node.children.map((child) => walkDesignTree(child, currentDepth + 1, maxDepth, detail)));
        serialized.children = childResults.filter((c) => c !== null);
    }
    return serialized;
});
const getDesignContext = (options) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const depth = (_a = options === null || options === void 0 ? void 0 : options.depth) !== null && _a !== void 0 ? _a : 2;
    const detail = (_b = options === null || options === void 0 ? void 0 : options.detail) !== null && _b !== void 0 ? _b : 'full';
    return walkDesignTree(figma.currentPage, 0, depth, detail);
});
exports.getDesignContext = getDesignContext;
const getOrCreateParent = (parentId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!parentId)
        return figma.currentPage;
    const parent = yield getAsyncNodeOrThrow(parentId);
    if (!('appendChild' in parent))
        throw new FigmaAPIError(`Parent node cannot contain children: ${parent.type}`);
    return parent;
});
const applyBasicNodeProps = (node, params) => {
    if (params.name)
        node.name = params.name;
    if (params.x != null)
        node.x = params.x;
    if (params.y != null)
        node.y = params.y;
    if (params.width && params.height)
        node.resize(params.width, params.height);
    if (params.fillColor)
        node.fills = [{ type: 'SOLID', color: (0, exports.hexToRgb)(params.fillColor) }];
};
const createRectangle = (x, y, width, height) => {
    const rect = figma.createRectangle();
    rect.x = x;
    rect.y = y;
    rect.resize(width, height);
    figma.currentPage.appendChild(rect);
    figma.commitUndo();
    return rect;
};
exports.createRectangle = createRectangle;
const createFrame = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const parent = yield getOrCreateParent(params.parentId);
    const frame = figma.createFrame();
    applyBasicNodeProps(frame, params);
    frame.name = params.name || 'Frame';
    if (!params.width)
        frame.resize(params.width || DEFAULT_FRAME_SIZE, params.height || DEFAULT_FRAME_SIZE);
    parent.appendChild(frame);
    figma.commitUndo();
    return frame;
});
exports.createFrame = createFrame;
const createText = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const parent = yield getOrCreateParent(params.parentId);
    const fontFamily = params.fontFamily || DEFAULT_FONT_FAMILY;
    const fontStyle = params.fontSize ? 'Regular' : DEFAULT_FONT_STYLE;
    yield figma.loadFontAsync({ family: fontFamily, style: fontStyle });
    const textNode = figma.createText();
    textNode.fontName = { family: fontFamily, style: fontStyle };
    textNode.characters = params.text;
    applyBasicNodeProps(textNode, params);
    textNode.name = params.name || 'Text';
    if (params.fontSize)
        textNode.fontSize = params.fontSize;
    parent.appendChild(textNode);
    figma.commitUndo();
    return textNode;
});
exports.createText = createText;
const applyStyleProperties = (node, style) => {
    if (style.fillColor && 'fills' in node) {
        node.fills = [{ type: 'SOLID', color: (0, exports.hexToRgb)(style.fillColor) }];
    }
    if (style.strokeColor && 'strokes' in node) {
        node.strokes = [{ type: 'SOLID', color: (0, exports.hexToRgb)(style.strokeColor), strokeWeight: style.strokeWeight || 1 }];
    }
    if (style.cornerRadius && 'cornerRadius' in node) {
        node.cornerRadius = style.cornerRadius;
    }
};
const updateNodeProperties = (id, properties) => {
    const node = getNodeOrThrow(id);
    Object.assign(node, properties);
    figma.commitUndo();
    return node;
};
exports.updateNodeProperties = updateNodeProperties;
const updateNodeStyle = (id, style) => {
    const node = getNodeOrThrow(id);
    applyStyleProperties(node, style);
    figma.commitUndo();
    return node;
};
exports.updateNodeStyle = updateNodeStyle;
const updateNodeText = (id, text, options) => __awaiter(void 0, void 0, void 0, function* () {
    const node = getNodeOrThrow(id);
    if (node.type !== 'TEXT')
        throw new FigmaAPIError(`Node is not a text node: ${id}`);
    if ((options === null || options === void 0 ? void 0 : options.fontFamily) && (options === null || options === void 0 ? void 0 : options.fontStyle)) {
        yield figma.loadFontAsync({ family: options.fontFamily, style: options.fontStyle });
        node.fontName = { family: options.fontFamily, style: options.fontStyle };
    }
    if (options === null || options === void 0 ? void 0 : options.fontSize)
        node.fontSize = options.fontSize;
    node.characters = text;
    figma.commitUndo();
    return node;
});
exports.updateNodeText = updateNodeText;
// ── Delete Operations ────────────────────────────────────────────────────────
const deleteNode = (id) => {
    const node = getNodeOrThrow(id);
    node.remove();
    figma.commitUndo();
};
exports.deleteNode = deleteNode;
const deleteNodes = (ids) => {
    validateNodeIds(ids);
    ids.forEach(id => (0, exports.deleteNode)(id));
};
exports.deleteNodes = deleteNodes;
// ── Utility Functions ────────────────────────────────────────────────────────
const hexToRgb = (hex) => {
    const clean = hex.replace('#', '').toUpperCase();
    if (!/^[0-9A-F]{6}$/.test(clean))
        throw new FigmaAPIError(`Invalid hex color: ${hex}`);
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return { r, g, b };
};
exports.hexToRgb = hexToRgb;
const getParentNode = (parentId) => __awaiter(void 0, void 0, void 0, function* () {
    return getOrCreateParent(parentId);
});
exports.getParentNode = getParentNode;
const base64ToBytes = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};
exports.base64ToBytes = base64ToBytes;
const applyAutoLayout = (frame, layout) => {
    if (!layout)
        return;
    const node = frame;
    if (layout.direction)
        node.layoutMode = layout.direction;
    if (layout.gap != null)
        node.itemSpacing = layout.gap;
    if (layout.paddingTop != null)
        node.paddingTop = layout.paddingTop;
    if (layout.paddingRight != null)
        node.paddingRight = layout.paddingRight;
    if (layout.paddingBottom != null)
        node.paddingBottom = layout.paddingBottom;
    if (layout.paddingLeft != null)
        node.paddingLeft = layout.paddingLeft;
    if (layout.alignItems)
        node.primaryAxisAlign = layout.alignItems;
    if (layout.justifyContent)
        node.counterAxisAlign = layout.justifyContent;
};
exports.applyAutoLayout = applyAutoLayout;


/***/ },

/***/ "./src/utils/serializers.ts"
/*!**********************************!*\
  !*** ./src/utils/serializers.ts ***!
  \**********************************/
(__unused_webpack_module, exports) {


/// <reference types="@figma/plugin-typings" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deduplicateStyles = exports.serializeNode = exports.serializeText = exports.serializeLetterSpacing = exports.serializeLineHeight = exports.serializeStyles = exports.getBounds = exports.serializePaints = exports.toHex = exports.isMixed = void 0;
// ── Helper Functions ────────────────────────────────────────────────────────
const isMixed = (value) => typeof value === "symbol";
exports.isMixed = isMixed;
const pixelRound = (v) => Math.round(v * 100) / 100;
const clampRGB = (v) => Math.min(255, Math.max(0, Math.round(v * 255)));
const toHexByte = (n) => n.toString(16).padStart(2, "0");
const toHex = (color) => {
    if (!color)
        return "#000000";
    return `#${toHexByte(clampRGB(color.r))}${toHexByte(clampRGB(color.g))}${toHexByte(clampRGB(color.b))}`;
};
exports.toHex = toHex;
const opacityToHex = (opacity) => Math.round(opacity * 255).toString(16).padStart(2, "0");
const serializePaints = (paints) => {
    if ((0, exports.isMixed)(paints))
        return "mixed";
    if (!paints || !Array.isArray(paints))
        return undefined;
    const result = paints
        .filter((paint) => paint.type === "SOLID" && "color" in paint)
        .map((paint) => {
        var _a;
        const hex = (0, exports.toHex)(paint.color);
        const opacity = (_a = paint.opacity) !== null && _a !== void 0 ? _a : 1;
        return opacity !== 1 ? hex + opacityToHex(opacity) : hex;
    });
    return result.length > 0 ? result : undefined;
};
exports.serializePaints = serializePaints;
const hasBounds = (node) => "x" in node && "y" in node && "width" in node && "height" in node;
const getBounds = (node) => {
    if (!hasBounds(node))
        return undefined;
    return {
        x: pixelRound(node.x),
        y: pixelRound(node.y),
        width: pixelRound(node.width),
        height: pixelRound(node.height),
    };
};
exports.getBounds = getBounds;
const tryGetStyleName = (styleId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!styleId || typeof styleId !== "string")
        return undefined;
    try {
        const style = yield figma.getStyleByIdAsync(styleId);
        return style === null || style === void 0 ? void 0 : style.name;
    }
    catch (_a) {
        return undefined;
    }
});
const serializeStyles = (node) => __awaiter(void 0, void 0, void 0, function* () {
    const styles = {};
    if ("fills" in node) {
        const fillStyle = yield tryGetStyleName(node.fillStyleId);
        if (fillStyle)
            styles.fillStyle = fillStyle;
        const fills = (0, exports.serializePaints)(node.fills);
        if (fills !== undefined)
            styles.fills = fills;
    }
    if ("strokes" in node) {
        const strokeStyle = yield tryGetStyleName(node.strokeStyleId);
        if (strokeStyle)
            styles.strokeStyle = strokeStyle;
        const strokes = (0, exports.serializePaints)(node.strokes);
        if (strokes !== undefined)
            styles.strokes = strokes;
    }
    if ("cornerRadius" in node) {
        const cr = (0, exports.isMixed)(node.cornerRadius) ? "mixed" : node.cornerRadius;
        if (cr !== 0)
            styles.cornerRadius = cr;
    }
    if ("paddingLeft" in node) {
        styles.padding = {
            top: node.paddingTop,
            right: node.paddingRight,
            bottom: node.paddingBottom,
            left: node.paddingLeft,
        };
    }
    if ("strokeWeight" in node) {
        const sw = (0, exports.isMixed)(node.strokeWeight) ? "mixed" : node.strokeWeight;
        if (sw && sw !== 0)
            styles.strokeWeight = sw;
    }
    if ("strokeAlign" in node) {
        const sa = (0, exports.isMixed)(node.strokeAlign) ? "mixed" : node.strokeAlign;
        if (sa && sa !== "INSIDE")
            styles.strokeAlign = sa;
    }
    return styles;
});
exports.serializeStyles = serializeStyles;
const serializeLineHeight = (lineHeight) => {
    if ((0, exports.isMixed)(lineHeight))
        return "mixed";
    if (!lineHeight || lineHeight.unit === "AUTO")
        return undefined;
    return { value: lineHeight.value, unit: lineHeight.unit };
};
exports.serializeLineHeight = serializeLineHeight;
const serializeLetterSpacing = (letterSpacing) => {
    if ((0, exports.isMixed)(letterSpacing))
        return "mixed";
    if (!letterSpacing || letterSpacing.value === 0)
        return undefined;
    return { value: letterSpacing.value, unit: letterSpacing.unit };
};
exports.serializeLetterSpacing = serializeLetterSpacing;
const extractFontInfo = (fontName) => {
    if ((0, exports.isMixed)(fontName))
        return { family: "mixed", style: "mixed" };
    if (fontName)
        return { family: fontName.family, style: fontName.style };
    return {};
};
const getTextStyleName = (textStyleId) => {
    if (!textStyleId || typeof textStyleId !== "string")
        return undefined;
    try {
        const style = figma.getStyleById(textStyleId);
        return style === null || style === void 0 ? void 0 : style.name;
    }
    catch (_a) {
        return undefined;
    }
};
const serializeText = (node, base) => __awaiter(void 0, void 0, void 0, function* () {
    const { family: fontFamily, style: fontStyle } = extractFontInfo(node.fontName);
    const textStyleName = getTextStyleName(node.textStyleId);
    return Object.assign(Object.assign({}, base), { characters: node.characters, styles: Object.assign(Object.assign(Object.assign({}, base.styles), (textStyleName && { textStyle: textStyleName })), { fontSize: (0, exports.isMixed)(node.fontSize) ? "mixed" : node.fontSize, fontFamily,
            fontStyle, fontWeight: (0, exports.isMixed)(node.fontWeight) ? "mixed" : node.fontWeight, textDecoration: node.textDecoration && node.textDecoration !== "NONE"
                ? ((0, exports.isMixed)(node.textDecoration) ? "mixed" : node.textDecoration)
                : undefined, lineHeight: (0, exports.serializeLineHeight)(node.lineHeight), letterSpacing: (0, exports.serializeLetterSpacing)(node.letterSpacing), textAlignHorizontal: (0, exports.isMixed)(node.textAlignHorizontal) ? "mixed" : node.textAlignHorizontal, textAlignVertical: (0, exports.isMixed)(node.textAlignVertical) ? "mixed" : node.textAlignVertical }) });
});
exports.serializeText = serializeText;
const createBaseNode = (node, styles) => {
    const base = {
        id: node.id,
        name: node.name,
        type: node.type,
        bounds: (0, exports.getBounds)(node),
        styles,
    };
    if ("opacity" in node && node.opacity !== 1)
        base.opacity = node.opacity;
    if ("visible" in node && !node.visible)
        base.visible = false;
    return base;
};
const serializeNode = (node) => __awaiter(void 0, void 0, void 0, function* () {
    const styles = yield (0, exports.serializeStyles)(node);
    const base = createBaseNode(node, styles);
    if (node.type === "TEXT")
        return (0, exports.serializeText)(node, base);
    if ("children" in node) {
        const children = yield Promise.all(node.children.map((child) => (0, exports.serializeNode)(child)));
        return Object.assign(Object.assign({}, base), { children });
    }
    return base;
});
exports.serializeNode = serializeNode;
const countStyleOccurrences = (tree, counts) => {
    const walk = (node) => {
        var _a, _b;
        if (!node || typeof node !== "object")
            return;
        const styles = node.styles;
        if (styles) {
            if (Array.isArray(styles.fills)) {
                const key = JSON.stringify(styles.fills);
                counts.set(key, ((_a = counts.get(key)) !== null && _a !== void 0 ? _a : 0) + 1);
            }
            if (Array.isArray(styles.strokes)) {
                const key = JSON.stringify(styles.strokes);
                counts.set(key, ((_b = counts.get(key)) !== null && _b !== void 0 ? _b : 0) + 1);
            }
        }
        if (Array.isArray(node.children))
            node.children.forEach(walk);
    };
    walk(tree);
};
const buildRefMap = (counts) => {
    const keyToRef = new Map();
    const refs = {};
    let counter = 0;
    for (const [key, count] of counts) {
        if (count > 1) {
            const ref = `s${++counter}`;
            keyToRef.set(key, ref);
            refs[ref] = JSON.parse(key);
        }
    }
    return { keyToRef, refs };
};
const replaceStyleRefs = (node, keyToRef) => {
    if (!node || typeof node !== "object")
        return node;
    let result = node;
    const styles = node.styles;
    if (styles) {
        const updatedStyles = Object.assign({}, styles);
        let changed = false;
        if (Array.isArray(styles.fills)) {
            const ref = keyToRef.get(JSON.stringify(styles.fills));
            if (ref) {
                updatedStyles.fillsRef = ref;
                delete updatedStyles.fills;
                changed = true;
            }
        }
        if (Array.isArray(styles.strokes)) {
            const ref = keyToRef.get(JSON.stringify(styles.strokes));
            if (ref) {
                updatedStyles.strokesRef = ref;
                delete updatedStyles.strokes;
                changed = true;
            }
        }
        if (changed)
            result = Object.assign(Object.assign({}, result), { styles: updatedStyles });
    }
    if (Array.isArray(node.children)) {
        result = Object.assign(Object.assign({}, result), { children: node.children.map((c) => replaceStyleRefs(c, keyToRef)) });
    }
    return result;
};
const deduplicateStyles = (tree) => {
    const counts = new Map();
    countStyleOccurrences(tree, counts);
    const { keyToRef, refs } = buildRefMap(counts);
    if (keyToRef.size === 0)
        return { tree, globalVars: undefined };
    const newTree = replaceStyleRefs(tree, keyToRef);
    const globalVars = Object.keys(refs).length > 0 ? { styles: refs } : undefined;
    return { tree: newTree, globalVars };
};
exports.deduplicateStyles = deduplicateStyles;


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/code.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=code.js.map