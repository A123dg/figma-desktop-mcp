/// <reference types="@figma/plugin-typings" />

// Type definitions
interface RGB { r: number; g: number; b: number; }
interface Bounds { x: number; y: number; width: number; height: number; }

// ── Helper Functions ────────────────────────────────────────────────────────

export const isMixed = (value: any): boolean => typeof value === "symbol";

const pixelRound = (v: number): number => Math.round(v * 100) / 100;
const clampRGB = (v: number): number => Math.min(255, Math.max(0, Math.round(v * 255)));
const toHexByte = (n: number): string => n.toString(16).padStart(2, "0");

export const toHex = (color: RGB | any): string => {
  if (!color) return "#000000";
  return `#${toHexByte(clampRGB(color.r))}${toHexByte(clampRGB(color.g))}${toHexByte(clampRGB(color.b))}`;
};

const opacityToHex = (opacity: number): string => Math.round(opacity * 255).toString(16).padStart(2, "0");

export const serializePaints = (paints: any): string | string[] | undefined => {
  if (isMixed(paints)) return "mixed";
  if (!paints || !Array.isArray(paints)) return undefined;

  const result = paints
    .filter((paint: any) => paint.type === "SOLID" && "color" in paint)
    .map((paint: any) => {
      const hex = toHex(paint.color);
      const opacity = paint.opacity ?? 1;
      return opacity !== 1 ? hex + opacityToHex(opacity) : hex;
    });

  return result.length > 0 ? result : undefined;
};

const hasBounds = (node: any): boolean => "x" in node && "y" in node && "width" in node && "height" in node;

export const getBounds = (node: any): Bounds | undefined => {
  if (!hasBounds(node)) return undefined;
  return {
    x: pixelRound(node.x),
    y: pixelRound(node.y),
    width: pixelRound(node.width),
    height: pixelRound(node.height),
  };
};

const tryGetStyleName = async (styleId: string | null | undefined): Promise<string | undefined> => {
  if (!styleId || typeof styleId !== "string") return undefined;
  try {
    const style = await figma.getStyleByIdAsync(styleId);
    return style?.name;
  } catch {
    return undefined;
  }
};

export const serializeStyles = async (node: any): Promise<Record<string, any>> => {
  const styles: Record<string, any> = {};

  if ("fills" in node) {
    const fillStyle = await tryGetStyleName(node.fillStyleId);
    if (fillStyle) styles.fillStyle = fillStyle;
    const fills = serializePaints(node.fills);
    if (fills !== undefined) styles.fills = fills;
  }

  if ("strokes" in node) {
    const strokeStyle = await tryGetStyleName(node.strokeStyleId);
    if (strokeStyle) styles.strokeStyle = strokeStyle;
    const strokes = serializePaints(node.strokes);
    if (strokes !== undefined) styles.strokes = strokes;
  }

  if ("cornerRadius" in node) {
    const cr = isMixed(node.cornerRadius) ? "mixed" : node.cornerRadius;
    if (cr !== 0) styles.cornerRadius = cr;
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
    const sw = isMixed(node.strokeWeight) ? "mixed" : node.strokeWeight;
    if (sw && sw !== 0) styles.strokeWeight = sw;
  }

  if ("strokeAlign" in node) {
    const sa = isMixed(node.strokeAlign) ? "mixed" : node.strokeAlign;
    if (sa && sa !== "INSIDE") styles.strokeAlign = sa;
  }

  return styles;
};

export const serializeLineHeight = (lineHeight: any): { value: number; unit: string } | string | undefined => {
  if (isMixed(lineHeight)) return "mixed";
  if (!lineHeight || lineHeight.unit === "AUTO") return undefined;
  return { value: lineHeight.value, unit: lineHeight.unit };
};

export const serializeLetterSpacing = (letterSpacing: any): { value: number; unit: string } | string | undefined => {
  if (isMixed(letterSpacing)) return "mixed";
  if (!letterSpacing || letterSpacing.value === 0) return undefined;
  return { value: letterSpacing.value, unit: letterSpacing.unit };
};

const extractFontInfo = (fontName: any): { family?: string; style?: string } => {
  if (isMixed(fontName)) return { family: "mixed", style: "mixed" };
  if (fontName) return { family: fontName.family, style: fontName.style };
  return {};
};

const getTextStyleName = (textStyleId: any): string | undefined => {
  if (!textStyleId || typeof textStyleId !== "string") return undefined;
  try {
    const style = figma.getStyleById(textStyleId);
    return style?.name;
  } catch {
    return undefined;
  }
};

export const serializeText = async (node: any, base: any): Promise<any> => {
  const { family: fontFamily, style: fontStyle } = extractFontInfo(node.fontName);
  const textStyleName = getTextStyleName(node.textStyleId);

  return {
    ...base,
    characters: node.characters,
    styles: {
      ...base.styles,
      ...(textStyleName && { textStyle: textStyleName }),
      fontSize: isMixed(node.fontSize) ? "mixed" : node.fontSize,
      fontFamily,
      fontStyle,
      fontWeight: isMixed(node.fontWeight) ? "mixed" : node.fontWeight,
      textDecoration: node.textDecoration && node.textDecoration !== "NONE" 
        ? (isMixed(node.textDecoration) ? "mixed" : node.textDecoration)
        : undefined,
      lineHeight: serializeLineHeight(node.lineHeight),
      letterSpacing: serializeLetterSpacing(node.letterSpacing),
      textAlignHorizontal: isMixed(node.textAlignHorizontal) ? "mixed" : node.textAlignHorizontal,
      textAlignVertical: isMixed(node.textAlignVertical) ? "mixed" : node.textAlignVertical,
    },
  };
};

const createBaseNode = (node: any, styles: Record<string, any>): any => {
  const base: any = {
    id: node.id,
    name: node.name,
    type: node.type,
    bounds: getBounds(node),
    styles,
  };

  if ("opacity" in node && node.opacity !== 1) base.opacity = node.opacity;
  if ("visible" in node && !node.visible) base.visible = false;

  return base;
};

export const serializeNode = async (node: any): Promise<any> => {
  const styles = await serializeStyles(node);
  const base = createBaseNode(node, styles);

  if (node.type === "TEXT") return serializeText(node, base);

  if ("children" in node) {
    const children = await Promise.all(node.children.map((child: any) => serializeNode(child)));
    return { ...base, children };
  }

  return base;
};

interface DeduplicateResult { tree: any; globalVars: Record<string, any> | undefined; }

const countStyleOccurrences = (tree: any, counts: Map<string, number>): void => {
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    const styles = node.styles;
    if (styles) {
      if (Array.isArray(styles.fills)) {
        const key = JSON.stringify(styles.fills);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      if (Array.isArray(styles.strokes)) {
        const key = JSON.stringify(styles.strokes);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
  };
  walk(tree);
};

const buildRefMap = (counts: Map<string, number>): { keyToRef: Map<string, string>; refs: Record<string, any> } => {
  const keyToRef = new Map<string, string>();
  const refs: Record<string, any> = {};
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

const replaceStyleRefs = (node: any, keyToRef: Map<string, string>): any => {
  if (!node || typeof node !== "object") return node;

  let result = node;
  const styles = node.styles;

  if (styles) {
    const updatedStyles = { ...styles };
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

    if (changed) result = { ...result, styles: updatedStyles };
  }

  if (Array.isArray(node.children)) {
    result = { ...result, children: node.children.map((c: any) => replaceStyleRefs(c, keyToRef)) };
  }

  return result;
};

export const deduplicateStyles = (tree: any): DeduplicateResult => {
  const counts = new Map<string, number>();
  countStyleOccurrences(tree, counts);

  const { keyToRef, refs } = buildRefMap(counts);
  if (keyToRef.size === 0) return { tree, globalVars: undefined };

  const newTree = replaceStyleRefs(tree, keyToRef);
  const globalVars = Object.keys(refs).length > 0 ? { styles: refs } : undefined;

  return { tree: newTree, globalVars };
};
