import JSZip from 'jszip';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

export interface PresenterTextObject {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: string;
}

export interface PresenterSlide {
  label: string;
  dataURL: string;
  width: number;
  height: number;
  textObjects?: PresenterTextObject[];
}

// ==========================================
// UTILITY HELPERS
// ==========================================

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const rr = clamp255(r).toString(16).padStart(2, '0');
  const gg = clamp255(g).toString(16).padStart(2, '0');
  const bb = clamp255(b).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const srgb = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.7022 * srgb[2];
}

function contrastRatio(l1: number, l2: number): number {
  const L1 = Math.max(l1, l2);
  const L2 = Math.min(l1, l2);
  return (L1 + 0.05) / (L2 + 0.05);
}

function ensureContrast(fgHex: string, bgHex: string): string {
  if (!fgHex || fgHex.length < 7) return fgHex;
  if (!bgHex || bgHex.length < 7) return fgHex;

  const fgLum = luminance(fgHex);
  const bgLum = luminance(bgHex);
  const ratio = contrastRatio(fgLum, bgLum);

  if (ratio >= 3.0) return fgHex;

  const black = '#111111';
  const white = '#ffffff';
  const blackRatio = contrastRatio(luminance(black), bgLum);
  const whiteRatio = contrastRatio(luminance(white), bgLum);
  return blackRatio >= whiteRatio ? black : white;
}

// ==========================================
// PPTX PARSER & RENDERER
// ==========================================

export async function parsePptx(file: File, onProgress?: (msg: string) => void): Promise<PresenterSlide[]> {
  onProgress?.('Analizando presentación PowerPoint...');
  const zip = await JSZip.loadAsync(file);
  const themeMap = await getPptxThemeMap(zip);
  const slideOrder = await getPptxSlideOrder(zip);

  const slides: PresenterSlide[] = [];

  for (let i = 0; i < slideOrder.length; i++) {
    onProgress?.(`Procesando diapositiva ${i + 1} de ${slideOrder.length}...`);
    const slideNum = slideOrder[i];
    const slideData = await extractPptxSlide(zip, slideNum, i + 1, themeMap);
    if (slideData) {
      slides.push(slideData);
    }
  }

  if (slides.length === 0) {
    throw new Error('No se pudieron extraer diapositivas de la presentación');
  }

  return slides;
}

async function getPptxSlideOrder(zip: JSZip): Promise<number[]> {
  try {
    const relsFile = zip.file('ppt/_rels/presentation.xml.rels');
    if (!relsFile) return [];
    const relsXml = await relsFile.async('text');
    const parser = new DOMParser();
    const doc = parser.parseFromString(relsXml, 'text/xml');
    const rels = Array.from(doc.querySelectorAll('Relationship'))
      .filter(r => {
        const type = r.getAttribute('Type') || '';
        return type.includes('/slide') && !type.includes('/slideLayout') && !type.includes('/slideMaster');
      });

    const slideNums = rels.map(r => {
      const target = r.getAttribute('Target') || '';
      const match = target.match(/slide(\d+)\.xml/);
      return match ? parseInt(match[1]) : null;
    }).filter((n): n is number => n !== null).sort((a, b) => a - b);

    return slideNums.length > 0 ? slideNums : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  } catch (e) {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  }
}

async function getPptxThemeMap(zip: JSZip): Promise<Record<string, string>> {
  try {
    const themeFiles = Object.keys(zip.files)
      .filter(p => p.startsWith('ppt/theme/theme') && p.endsWith('.xml'))
      .sort();
    if (themeFiles.length === 0) return {};
    const themeXml = await zip.files[themeFiles[0]].async('text');
    const parser = new DOMParser();
    const doc = parser.parseFromString(themeXml, 'text/xml');
    const nsA = 'http://schemas.openxmlformats.org/drawingml/2006/main';
    const clrScheme = doc.getElementsByTagNameNS(nsA, 'clrScheme')[0];
    if (!clrScheme) return {};

    const keys = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
    const themeMap: Record<string, string> = {};
    for (const key of keys) {
      const node = clrScheme.getElementsByTagNameNS(nsA, key)[0];
      if (!node) continue;
      const srgb = node.getElementsByTagNameNS(nsA, 'srgbClr')[0];
      if (srgb) {
        themeMap[key] = '#' + srgb.getAttribute('val');
        continue;
      }
      const sys = node.getElementsByTagNameNS(nsA, 'sysClr')[0];
      if (sys) {
        const val = sys.getAttribute('lastClr') || sys.getAttribute('val');
        if (val) themeMap[key] = '#' + val;
      }
    }
    return themeMap;
  } catch (e) {
    return {};
  }
}

async function extractPptxSlide(zip: JSZip, slideNum: number, displayNum: number, themeMap: Record<string, string>): Promise<PresenterSlide | null> {
  const slideFile = zip.file(`ppt/slides/slide${slideNum}.xml`);
  if (!slideFile) return null;

  const slideXml = await slideFile.async('text');
  const slideRelsFile = zip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`);
  const imageMap: Record<string, string> = {};

  if (slideRelsFile) {
    const relsXml = await slideRelsFile.async('text');
    const parser = new DOMParser();
    const relsDoc = parser.parseFromString(relsXml, 'text/xml');
    const imgRels = Array.from(relsDoc.querySelectorAll('Relationship'))
      .filter(r => (r.getAttribute('Type') || '').includes('image'));

    for (const rel of imgRels) {
      const rid = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (rid && target) {
        const cleanTarget = target.replace('../', 'ppt/');
        const imgFile = zip.file(cleanTarget);
        if (imgFile) {
          try {
            const blob = await imgFile.async('blob');
            const dataURL = await blobToDataURL(blob);
            imageMap[rid] = dataURL;
          } catch (e) { /* skip */ }
        }
      }
    }
  }

  const SLIDE_W = 1280;
  const SLIDE_H = 720;

  const offCanvas = document.createElement('canvas');
  offCanvas.width = SLIDE_W;
  offCanvas.height = SLIDE_H;
  const offCtx = offCanvas.getContext('2d');
  if (!offCtx) return null;

  offCtx.fillStyle = '#ffffff';
  offCtx.fillRect(0, 0, SLIDE_W, SLIDE_H);

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(slideXml, 'text/xml');

  const emuToPixW = SLIDE_W / 9144000;
  const emuToPixH = SLIDE_H / 5143500;

  const textObjects: PresenterTextObject[] = [];
  await renderPptxXmlToCanvas(xmlDoc, offCtx, SLIDE_W, SLIDE_H, emuToPixW, emuToPixH, imageMap, themeMap, textObjects);

  const dataURL = offCanvas.toDataURL('image/png');
  return {
    label: `Slide ${displayNum}`,
    dataURL,
    width: SLIDE_W,
    height: SLIDE_H,
    textObjects
  };
}

async function renderPptxXmlToCanvas(
  xmlDoc: Document,
  ctx: CanvasRenderingContext2D & { _bgColor?: string },
  W: number,
  H: number,
  emuX: number,
  emuY: number,
  imageMap: Record<string, string>,
  themeMap: Record<string, string>,
  textObjects?: PresenterTextObject[]
) {
  const ns = {
    a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
    p: 'http://schemas.openxmlformats.org/presentationml/2006/main',
    r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  };

  const bgFill = xmlDoc.getElementsByTagNameNS(ns.p, 'bg')[0];
  let bgColor = '#ffffff';
  if (bgFill) {
    const solidFill = bgFill.getElementsByTagNameNS(ns.a, 'solidFill')[0];
    if (solidFill) {
      const fillColor = getColorFromSolidFill(solidFill, ns, themeMap);
      if (fillColor) bgColor = fillColor;
    }
  }
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);
  ctx._bgColor = bgColor;

  const spTree = xmlDoc.getElementsByTagNameNS(ns.p, 'spTree')[0];
  if (!spTree) return;

  const children = Array.from(spTree.childNodes);

  let shapeIdx = 0;
  for (const child of children) {
    const node = child as Element;
    const localName = node.localName;

    if (localName === 'sp') {
      await renderPptxShape(node, ctx, emuX, emuY, ns, themeMap, shapeIdx++, textObjects);
    } else if (localName === 'pic') {
      await renderPptxPicture(node, ctx, emuX, emuY, ns, imageMap);
    } else if (localName === 'graphicFrame') {
      await renderPptxGraphicFrame(node, ctx, emuX, emuY, ns);
    } else if (localName === 'grpSp') {
      const innerChildren = Array.from(node.childNodes);
      for (const inner of innerChildren) {
        const innerNode = inner as Element;
        if (innerNode.localName === 'sp') {
          await renderPptxShape(innerNode, ctx, emuX, emuY, ns, themeMap, shapeIdx++, textObjects);
        } else if (innerNode.localName === 'pic') {
          await renderPptxPicture(innerNode, ctx, emuX, emuY, ns, imageMap);
        }
      }
    }
  }
}

function getSpGeom(sp: Element, ns: Record<string, string>, shapeIdx: number = 0) {
  const xfrm = sp.getElementsByTagNameNS(ns.p, 'spPr')[0]?.getElementsByTagNameNS(ns.a, 'xfrm')[0]
    || sp.getElementsByTagNameNS(ns.a, 'xfrm')[0]
    || sp.getElementsByTagNameNS(ns.p, 'txBody')[0]?.previousElementSibling;
  
  const off = xfrm?.getElementsByTagNameNS(ns.a, 'off')[0];
  const ext = xfrm?.getElementsByTagNameNS(ns.a, 'ext')[0];

  if (off && ext && off.getAttribute('x') && ext.getAttribute('cx')) {
    return {
      x: parseInt(off.getAttribute('x') || '0'),
      y: parseInt(off.getAttribute('y') || '0'),
      cx: parseInt(ext.getAttribute('cx') || '0'),
      cy: parseInt(ext.getAttribute('cy') || '0')
    };
  }

  // Detect placeholder type
  const ph = sp.getElementsByTagNameNS(ns.p, 'nvSpPr')[0]
    ?.getElementsByTagNameNS(ns.p, 'nvPr')[0]
    ?.getElementsByTagNameNS(ns.p, 'ph')[0];
  
  const phType = ph?.getAttribute('type') || '';

  // Default dimensions in EMUs (1 inch = 914400 EMUs)
  const defaultX = 457200; // ~50px
  let defaultY = 457200 + (shapeIdx * 1097280); // ~50px + (shapeIdx * 120px) to prevent overlapping
  const defaultCX = 10058400; // ~1100px
  const defaultCY = 1097280; // ~120px

  if (phType === 'title' || phType === 'ctrTitle') {
    defaultY = 411480; // ~45px
  } else if (phType === 'subTitle') {
    defaultY = 1463040; // ~160px
  } else if (phType === 'body') {
    defaultY = 1828800 + (shapeIdx * 365760); // ~200px
  }

  return {
    x: parseInt(off?.getAttribute('x') || `${defaultX}`),
    y: parseInt(off?.getAttribute('y') || `${defaultY}`),
    cx: parseInt(ext?.getAttribute('cx') || `${defaultCX}`),
    cy: parseInt(ext?.getAttribute('cy') || `${defaultCY}`)
  };
}

function getColorFromSolidFill(solidFill: Element, ns: Record<string, string>, themeMap: Record<string, string>): string | null {
  const srgb = solidFill.getElementsByTagNameNS(ns.a, 'srgbClr')[0];
  if (srgb) return '#' + srgb.getAttribute('val');

  const scheme = solidFill.getElementsByTagNameNS(ns.a, 'schemeClr')[0];
  if (scheme) {
    const key = scheme.getAttribute('val');
    if (key) {
      const base = themeMap?.[key];
      if (base) return applyColorTransforms(base, scheme, ns);
    }
  }

  const sys = solidFill.getElementsByTagNameNS(ns.a, 'sysClr')[0];
  if (sys) {
    const val = sys.getAttribute('lastClr') || sys.getAttribute('val');
    if (val) return '#' + val;
  }

  return null;
}

function applyColorTransforms(hex: string, schemeNode: Element, ns: Record<string, string>): string {
  let { r, g, b } = hexToRgb(hex);

  const tintNode = schemeNode.getElementsByTagNameNS(ns.a, 'tint')[0];
  if (tintNode) {
    const t = clamp01(parseInt(tintNode.getAttribute('val') || '0') / 100000);
    r = r + (255 - r) * t;
    g = g + (255 - g) * t;
    b = b + (255 - b) * t;
  }

  const shadeNode = schemeNode.getElementsByTagNameNS(ns.a, 'shade')[0];
  if (shadeNode) {
    const s = clamp01(parseInt(shadeNode.getAttribute('val') || '100000') / 100000);
    r = r * s;
    g = g * s;
    b = b * s;
  }

  const lumModNode = schemeNode.getElementsByTagNameNS(ns.a, 'lumMod')[0];
  if (lumModNode) {
    const m = clamp01(parseInt(lumModNode.getAttribute('val') || '100000') / 100000);
    r = r * m;
    g = g * m;
    b = b * m;
  }

  const lumOffNode = schemeNode.getElementsByTagNameNS(ns.a, 'lumOff')[0];
  if (lumOffNode) {
    const o = clamp01(parseInt(lumOffNode.getAttribute('val') || '0') / 100000);
    r = r + 255 * o;
    g = g + 255 * o;
    b = b + 255 * o;
  }

  return rgbToHex(r, g, b);
}

function wrapAndRenderText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  algn: string
): number {
  const words = text.split(/\s+/);
  let currentLine = '';
  let currentY = startY;
  const maxW = Math.max(120, maxWidth);

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxW && i > 0) {
      renderSingleLine(ctx, currentLine, x, currentY, maxW, algn);
      currentLine = words[i];
      currentY += lineHeight;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    renderSingleLine(ctx, currentLine, x, currentY, maxW, algn);
    currentY += lineHeight;
  }

  return currentY;
}

function renderSingleLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  w: number,
  algn: string
) {
  if (algn === 'ctr') {
    ctx.textAlign = 'center';
    ctx.fillText(line, x + w / 2, y);
  } else if (algn === 'r') {
    ctx.textAlign = 'right';
    ctx.fillText(line, x + w, y);
  } else {
    ctx.textAlign = 'left';
    ctx.fillText(line, x + 4, y);
  }
}

async function renderPptxShape(
  sp: Element,
  ctx: CanvasRenderingContext2D & { _bgColor?: string },
  emuX: number,
  emuY: number,
  ns: Record<string, string>,
  themeMap: Record<string, string>,
  shapeIdx: number = 0,
  textObjects?: PresenterTextObject[]
) {
  const geom = getSpGeom(sp, ns, shapeIdx);
  if (!geom) return;

  const x = geom.x * emuX;
  const y = geom.y * emuY;
  const w = geom.cx * emuX;
  const h = geom.cy * emuY;

  const spPr = sp.getElementsByTagNameNS(ns.p, 'spPr')[0];
  let shapeFillColor: string | null = null;
  if (spPr) {
    const noFill = spPr.getElementsByTagNameNS(ns.a, 'noFill')[0];
    const solidFill = spPr.getElementsByTagNameNS(ns.a, 'solidFill')[0];
    if (!noFill && solidFill) {
      const fillColor = getColorFromSolidFill(solidFill, ns, themeMap);
      if (fillColor) {
        shapeFillColor = fillColor;
        ctx.fillStyle = fillColor;
        const prstGeom = spPr.getElementsByTagNameNS(ns.a, 'prstGeom')[0];
        const prst = prstGeom ? prstGeom.getAttribute('prst') : 'rect';
        ctx.beginPath();
        if (prst === 'ellipse') {
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        } else {
          ctx.roundRect ? ctx.roundRect(x, y, w, h, 4) : ctx.rect(x, y, w, h);
        }
        ctx.fill();
      }
    }

    const ln = spPr.getElementsByTagNameNS(ns.a, 'ln')[0];
    if (ln) {
      const lnFill = ln.getElementsByTagNameNS(ns.a, 'solidFill')[0];
      if (lnFill) {
        const lnColor = getColorFromSolidFill(lnFill, ns, themeMap);
        if (lnColor) {
          ctx.strokeStyle = lnColor;
          const w_emu = parseInt(ln.getAttribute('w') || '12700');
          ctx.lineWidth = Math.max(0.5, w_emu * emuX / 12700);
          ctx.stroke();
        }
      }
    }
  }

  const txBody = sp.getElementsByTagNameNS(ns.p, 'txBody')[0];
  if (txBody) {
    const paras = txBody.getElementsByTagNameNS(ns.a, 'p');
    let textY = y + 10;

    for (let pIdx = 0; pIdx < paras.length; pIdx++) {
      const para = paras[pIdx];
      const runs = para.getElementsByTagNameNS(ns.a, 'r');
      const pPr = para.getElementsByTagNameNS(ns.a, 'pPr')[0];
      const algn = pPr?.getAttribute('algn') || 'l';

      let lineText = '';
      let fontSize = 18;
      let bold = false;
      let italic = false;
      let color = '#000000';

      for (let rIdx = 0; rIdx < runs.length; rIdx++) {
        const run = runs[rIdx];
        const rPr = run.getElementsByTagNameNS(ns.a, 'rPr')[0];
        if (rPr) {
          const sz = rPr.getAttribute('sz');
          if (sz) fontSize = parseInt(sz) / 100;
          bold = rPr.getAttribute('b') === '1';
          italic = rPr.getAttribute('i') === '1';
          const rFill = rPr.getElementsByTagNameNS(ns.a, 'solidFill')[0];
          if (rFill) {
            const rColor = getColorFromSolidFill(rFill, ns, themeMap);
            if (rColor) color = rColor;
          }
        }
        const t = run.getElementsByTagNameNS(ns.a, 't')[0];
        if (t) lineText += t.textContent;
      }

      // Si no hay nodos 'r', extraer cualquier 't' directamente del párrafo
      if (runs.length === 0) {
        const textNodes = para.getElementsByTagNameNS(ns.a, 't');
        for (let tIdx = 0; tIdx < textNodes.length; tIdx++) {
          lineText += textNodes[tIdx].textContent || '';
        }
      }

      if (lineText.trim()) {
        const scaledSize = Math.max(14, Math.min(96, Math.round(fontSize * 1.333)));
        ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${scaledSize}px Inter, Arial, sans-serif`;
        let textColor = color || '#111111';
        const bgForText = shapeFillColor || ctx._bgColor || '#ffffff';
        textColor = ensureContrast(textColor, bgForText);
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'top';

        if (textObjects) {
          textObjects.push({
            text: lineText.trim(),
            x: Math.round(x),
            y: Math.round(textY),
            w: Math.max(200, Math.round(w)),
            h: Math.round(scaledSize * 1.5),
            fontSize: scaledSize,
            color: textColor,
            bold,
            italic,
            align: algn
          });
        }

        const lineHeight = scaledSize * 1.3;
        textY = wrapAndRenderText(ctx, lineText.trim(), x, textY, w - 8, lineHeight, algn);
      } else {
        textY += 8;
      }
    }
  }
}

async function renderPptxPicture(
  pic: Element,
  ctx: CanvasRenderingContext2D,
  emuX: number,
  emuY: number,
  ns: Record<string, string>,
  imageMap: Record<string, string>
) {
  const geom = getSpGeom(pic, ns);
  if (!geom) return;

  const x = geom.x * emuX;
  const y = geom.y * emuY;
  const w = geom.cx * emuX;
  const h = geom.cy * emuY;

  const blipFill = pic.getElementsByTagNameNS(ns.p, 'blipFill')[0]
    || pic.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/picture', 'blipFill')[0];
  if (!blipFill) return;

  const blip = blipFill.getElementsByTagNameNS(ns.a, 'blip')[0];
  if (!blip) return;

  const rEmbed = blip.getAttributeNS(ns.r, 'embed') || blip.getAttribute('r:embed');
  if (!rEmbed) return;

  const dataURL = imageMap[rEmbed];
  if (!dataURL) return;

  try {
    const img = await loadImg(dataURL);
    ctx.drawImage(img, x, y, w, h);
  } catch (e) {
    console.error('Error drawing PPTX picture:', e);
  }
}

async function renderPptxGraphicFrame(frame: Element, ctx: CanvasRenderingContext2D, emuX: number, emuY: number, ns: Record<string, string>) {
  const ns_a = ns.a;
  const xfrm = frame.getElementsByTagNameNS(ns_a, 'xfrm')[0];
  if (!xfrm) return;
  const off = xfrm.getElementsByTagNameNS(ns_a, 'off')[0];
  const ext = xfrm.getElementsByTagNameNS(ns_a, 'ext')[0];
  if (!off || !ext) return;

  const x = parseInt(off.getAttribute('x') || '0') * emuX;
  const y = parseInt(off.getAttribute('y') || '0') * emuY;
  const w = parseInt(ext.getAttribute('cx') || '0') * emuX;
  const h = parseInt(ext.getAttribute('cy') || '0') * emuY;

  const tbl = frame.getElementsByTagNameNS(ns_a, 'tbl')[0];
  if (!tbl) return;

  const rows = tbl.getElementsByTagNameNS(ns_a, 'tr');
  if (rows.length === 0) return;

  const rowH = h / rows.length;

  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.font = '11px Inter, Arial, sans-serif';
  ctx.fillStyle = '#111';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r].getElementsByTagNameNS(ns_a, 'tc');
    const colW = w / cells.length;

    for (let c = 0; c < cells.length; c++) {
      const cx = x + c * colW;
      const cy = y + r * rowH;

      if (r === 0) {
        ctx.fillStyle = '#e8eaf6';
        ctx.fillRect(cx, cy, colW, rowH);
        ctx.fillStyle = '#111';
      }

      ctx.strokeRect(cx, cy, colW, rowH);

      const t = cells[c].getElementsByTagNameNS(ns_a, 't');
      let cellText = '';
      for (let tIdx = 0; tIdx < t.length; tIdx++) cellText += t[tIdx].textContent;

      if (cellText) {
        ctx.fillText(cellText.substring(0, 30), cx + 4, cy + rowH / 2, colW - 8);
      }
    }
  }
}

// ==========================================
// DOCX PARSER
// ==========================================

export async function parseDocx(file: File, onProgress?: (msg: string) => void): Promise<PresenterSlide[]> {
  onProgress?.('Analizando documento Word...');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  const sections = splitDocxSections(html);

  if (sections.length === 0) throw new Error('El documento está vacío');

  const slides: PresenterSlide[] = [];
  const DOCX_W = 900;
  const DOCX_H = 1200;

  for (let i = 0; i < sections.length; i++) {
    onProgress?.(`Renderizando sección ${i + 1} de ${sections.length}...`);
    const dataURL = await htmlSectionToDataURL(sections[i], i + 1, sections.length, DOCX_W, DOCX_H);
    slides.push({
      label: extractSectionTitle(sections[i], i + 1),
      dataURL,
      width: DOCX_W,
      height: DOCX_H
    });
  }

  return slides;
}

function splitDocxSections(html: string): string[] {
  const div = document.createElement('div');
  div.innerHTML = html;

  const children = Array.from(div.children);
  if (children.length === 0) return [html];

  const sections: string[] = [];
  let currentSection: Element[] = [];
  let wordCount = 0;
  const MAX_WORDS_PER_SECTION = 150;

  for (const child of children) {
    const tag = child.tagName.toLowerCase();
    const isHeading = ['h1', 'h2', 'h3'].includes(tag);
    const text = child.textContent || '';
    const words = text.trim().split(/\s+/).filter(w => w).length;

    if (isHeading && tag !== 'h3' && currentSection.length > 0) {
      sections.push(currentSection.map(el => el.outerHTML).join(''));
      currentSection = [];
      wordCount = 0;
    } else if (wordCount + words > MAX_WORDS_PER_SECTION && currentSection.length > 0) {
      sections.push(currentSection.map(el => el.outerHTML).join(''));
      currentSection = [];
      wordCount = 0;
    }

    currentSection.push(child);
    wordCount += words;
  }

  if (currentSection.length > 0) {
    sections.push(currentSection.map(el => el.outerHTML).join(''));
  }

  return sections.length > 0 ? sections : [html];
}

function extractSectionTitle(htmlSection: string, num: number): string {
  const div = document.createElement('div');
  div.innerHTML = htmlSection;
  const heading = div.querySelector('h1, h2, h3');
  if (heading && heading.textContent?.trim()) {
    return heading.textContent.trim().substring(0, 40);
  }
  const text = div.textContent?.trim() || '';
  return text.substring(0, 30) || `Sección ${num}`;
}

async function htmlSectionToDataURL(htmlContent: string, pageNum: number, total: number, W = 900, H = 1200): Promise<string> {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0px;
    width: ${W}px;
    height: ${H}px;
    background: #ffffff;
    color: #111111;
    font-family: 'Inter', Georgia, sans-serif;
    font-size: 18px;
    line-height: 1.6;
    padding: 50px 60px;
    box-sizing: border-box;
    overflow: hidden;
    z-index: -1;
    color-scheme: light;
  `;
  container.innerHTML = `
    <style>
      h1 { font-size: 32px; font-weight: 700; margin-bottom: 18px; color: #1a1a2e; border-bottom: 3px solid #6366f1; padding-bottom: 10px; }
      h2 { font-size: 26px; font-weight: 600; margin-bottom: 14px; color: #2a2a4e; }
      h3 { font-size: 20px; font-weight: 600; margin-bottom: 10px; color: #3a3a6e; }
      p { margin-bottom: 12px; }
      ul, ol { padding-left: 24px; margin-bottom: 12px; }
      li { margin-bottom: 4px; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
      td, th { border: 1px solid #ccc; padding: 6px 10px; }
      th { background: #e8eaf6; font-weight: 600; }
      strong { font-weight: 700; }
      em { font-style: italic; }
      img { max-width: 100%; height: auto; display: block; margin: 10px auto; }
    </style>
    ${htmlContent}
    <div style="position:absolute;bottom:16px;right:24px;font-size:13px;color:#999;">
      Página ${pageNum} de ${total}
    </div>
  `;
  document.body.appendChild(container);

  try {
    const canvasEl = await html2canvas(container, {
      width: W,
      height: H,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false
    });
    const dataURL = canvasEl.toDataURL('image/png');
    document.body.removeChild(container);
    return dataURL;
  } catch (e) {
    document.body.removeChild(container);
    return renderTextToCanvas(htmlContent, pageNum, total, W, H);
  }
}

function renderTextToCanvas(htmlContent: string, pageNum: number, total: number, W: number, H: number): string {
  const div = document.createElement('div');
  div.innerHTML = htmlContent;
  const text = div.textContent || '';

  const offCanvas = document.createElement('canvas');
  offCanvas.width = W;
  offCanvas.height = H;
  const ctx = offCanvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const lines = text.split('\n').filter(l => l.trim());
  ctx.font = '18px Inter, Arial, sans-serif';
  ctx.fillStyle = '#111';
  ctx.textBaseline = 'top';

  let y = 60;
  for (const line of lines) {
    if (y > H - 80) break;
    ctx.fillText(line.substring(0, 80), 60, y, W - 120);
    y += 28;
  }

  ctx.font = '13px Inter, Arial, sans-serif';
  ctx.fillStyle = '#999';
  ctx.textAlign = 'right';
  ctx.fillText(`Página ${pageNum} de ${total}`, W - 24, H - 24);

  return offCanvas.toDataURL('image/png');
}

// ==========================================
// XLSX PARSER
// ==========================================

export async function parseXlsx(file: File, onProgress?: (msg: string) => void): Promise<PresenterSlide[]> {
  onProgress?.('Analizando hoja de cálculo Excel...');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const slides: PresenterSlide[] = [];
  const sheetNames = workbook.SheetNames;

  for (let i = 0; i < sheetNames.length; i++) {
    onProgress?.(`Procesando hoja ${i + 1} de ${sheetNames.length}: ${sheetNames[i]}...`);
    const sheetName = sheetNames[i];
    const worksheet = workbook.Sheets[sheetName];
    const htmlTable = XLSX.utils.sheet_to_html(worksheet, { header: '' });
    const dataURL = await htmlSectionToDataURL(
      `<h2>${sheetName}</h2>${htmlTable}`,
      i + 1,
      sheetNames.length,
      1360,
      900
    );
    slides.push({
      label: sheetName,
      dataURL,
      width: 1360,
      height: 900
    });
  }

  if (slides.length === 0) throw new Error('El archivo no contiene hojas válidas');

  return slides;
}
