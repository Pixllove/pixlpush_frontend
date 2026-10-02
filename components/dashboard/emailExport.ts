/**
 * Turns the editor's block HTML into HTML that mail clients actually render.
 *
 * The editor lays blocks out with flexbox/grid and draws icons as inline SVG.
 * Gmail drops both (and Outlook more), so before an email is saved or sent:
 *   - flex and grid containers become tables,
 *   - inline SVG icons become hosted PNG images,
 *   - a cropped image is drawn once to the size and crop it is shown at,
 *   - empty placeholders and editor-only attributes are removed.
 */

/**
 * Stores a generated image and returns its public URL. `key` names the file: uploading the same key
 * again replaces that file instead of adding a new one.
 */
export type UploadImage = (blob: Blob, name: string, key: string) => Promise<string>;

// Generated images are remembered per browser so a save does not upload them again. Without the memory
// (another browser, cleared storage) the upload still lands on the same file, because its name is the key.
const remembered = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const remember = (key: string, url: string) => { try { localStorage.setItem(key, url); } catch { /* private mode */ } };
/** Two independent 32-bit hashes: short enough for a file name, wide enough that two icons never share one. */
const hash = (text: string) => {
  let a = 5381, b = 52711;
  for (let i = 0; i < text.length; i++) { const code = text.charCodeAt(i); a = ((a << 5) + a + code) | 0; b = ((b << 5) + b) ^ code; }
  return (a >>> 0).toString(36) + (b >>> 0).toString(36);
};

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = "anonymous"; // the canvas must stay readable
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("image failed to load"));
  setTimeout(() => reject(new Error("image timed out")), 15_000);
  image.src = src;
});
const toBlob = (canvas: HTMLCanvasElement, type: string) => new Promise<Blob>((resolve, reject) =>
  canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("canvas is empty"))), type, 0.9));

const inFlight = new Map<string, Promise<string>>();
/**
 * @param content  everything the picture depends on; unchanged content is never uploaded twice
 * @param file     what decides the file it is stored as. For an icon that is the content itself. For a cropped
 *                 picture it is the source image, so a new crop replaces the old file rather than adding one.
 */
function generated(content: string, file: string, name: string, upload: UploadImage, draw: () => Promise<Blob>) {
  const cacheKey = `pixlpush-email-asset:v3:${hash(content)}`;
  const known = remembered(cacheKey);
  if (known) return Promise.resolve(known);
  // the same icon appears several times in one email: draw and upload it once
  let pending = inFlight.get(cacheKey);
  if (!pending) {
    pending = (async () => {
      const stored = await upload(await draw(), name, `g${hash(file)}`);
      // the file name is reused when its content changes, so the address carries a version for mail clients' caches
      const url = file === content ? stored : `${stored}?v=${hash(content)}`;
      remember(cacheKey, url);
      if (file !== content) remember(companionKey(file), url);
      return url;
    })().finally(() => inFlight.delete(cacheKey));
    inFlight.set(cacheKey, pending);
  }
  return pending;
}
const companionKey = (source: string) => `pixlpush-email-crop:${hash(source)}`;
/** The cropped copy made from an uploaded image, if this browser made one: it goes when the image goes. */
export const croppedCopyOf = (source: string) => remembered(companionKey(source));

/** The colour actually behind an element: the nearest ancestor that paints a background, else white. */
function backgroundBehind(el: Element): string {
  for (let node: Element | null = el.parentElement; node; node = node.parentElement) {
    const colour = getComputedStyle(node).backgroundColor;
    if (colour && colour !== "transparent" && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(colour)) return colour;
  }
  return "#ffffff";
}

/**
 * Inline SVG -> hosted PNG at 4x, in the colour it has on screen and on the colour it sits on.
 * The picture is opaque on purpose: Gmail's image proxy and WebP conversion both mangle transparency.
 */
async function svgToImage(svg: SVGElement, upload: UploadImage) {
  const box = svg.getBoundingClientRect();
  const width = Math.round(box.width || parseFloat(svg.getAttribute("width") || "16"));
  const height = Math.round(box.height || parseFloat(svg.getAttribute("height") || "16"));
  const copy = svg.cloneNode(true) as SVGElement;
  for (const name of ["class", "style", "data-testid", "focusable", "aria-hidden"]) copy.removeAttribute(name);
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", String(width));
  copy.setAttribute("height", String(height));
  copy.setAttribute("fill", getComputedStyle(svg).color || "#000000"); // paths with their own fill keep it
  const markup = new XMLSerializer().serializeToString(copy);
  const background = backgroundBehind(svg);
  const content = `${markup}|${background}`;
  const url = await generated(content, content, "icon.png", upload, async () => {
    const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);
    const canvas = document.createElement("canvas");
    canvas.width = width * 4;
    canvas.height = height * 4;
    const context = canvas.getContext("2d")!;
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return toBlob(canvas, "image/png");
  });
  const img = document.createElement("img");
  img.src = url;
  img.alt = "";
  img.width = width;
  img.height = height;
  img.setAttribute("style", `display:inline-block;width:${width}px;height:${height}px;border:0;vertical-align:middle;`);
  svg.replaceWith(img);
}

/** A framed picture (fill, position, zoom) -> one image already cropped to that frame. */
async function bakeFramedImage(slot: HTMLElement, upload: UploadImage) {
  const img = slot.querySelector<HTMLImageElement>("img[data-slot-image]");
  if (!img) return;
  const alt = img.getAttribute("alt") || "";
  const plain = (src: string, extra: string) => {
    slot.innerHTML = `<img src="${src}" alt="${alt.replace(/"/g, "&quot;")}" style="display:block;border:0;${extra}border-radius:${slot.style.borderRadius || "0"};" />`;
    for (const property of ["height", "overflow", "position", "background-color", "display", "align-items", "justify-content", "padding"]) slot.style.removeProperty(property);
  };
  if (img.style.objectFit === "contain") return plain(img.src, `width:auto;height:auto;max-width:100%;max-height:${slot.style.height || "320px"};margin:0 auto;`);

  const box = slot.getBoundingClientRect();
  const [x = 50, y = 50] = (img.style.objectPosition || "50% 50%").split(" ").map(part => parseFloat(part));
  const zoom = parseFloat(/scale\(([\d.]+)\)/.exec(img.style.transform)?.[1] || "1");
  const width = Math.round(box.width), height = Math.round(box.height);
  if (!width || !height) return;
  const url = await generated(`${img.src}|${x}|${y}|${zoom}|${width}x${height}`, img.src, /\.png($|\?)/i.test(img.src) ? "image.png" : "image.jpg", upload, async () => {
    const source = await loadImage(img.src);
    const canvas = document.createElement("canvas");
    const density = Math.min(2, 1600 / width);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    // object-fit: cover, positioned at x%/y%, then scaled about that same point: what the editor shows.
    const cover = Math.max(canvas.width / source.naturalWidth, canvas.height / source.naturalHeight);
    const drawnWidth = source.naturalWidth * cover, drawnHeight = source.naturalHeight * cover;
    const pivotX = canvas.width * x / 100, pivotY = canvas.height * y / 100;
    const left = pivotX + ((canvas.width - drawnWidth) * x / 100 - pivotX) * zoom;
    const top = pivotY + ((canvas.height - drawnHeight) * y / 100 - pivotY) * zoom;
    const context = canvas.getContext("2d")!;
    const png = /\.png($|\?)/i.test(img.src);
    if (!png) { context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); }
    context.drawImage(source, left, top, drawnWidth * zoom, drawnHeight * zoom);
    return toBlob(canvas, png ? "image/png" : "image/jpeg");
  });
  plain(url, "width:100%;height:auto;");
}

/** One flex or grid container -> block (column) or table (row). Children are converted before their parents. */
function layoutAsTable(el: HTMLElement) {
  const style = el.style;
  const display = style.display;
  const children = Array.from(el.childNodes).filter(node => node.nodeType === 1 || (node.nodeType === 3 && node.textContent?.trim()));
  const gap = parseFloat(style.gap) || 0;
  const centred = style.alignItems === "center";
  const justify = style.justifyContent;
  const grid = display === "grid";
  const columnWidths = grid ? gridColumns(style.gridTemplateColumns) : null;
  const explicitHeight = style.height;
  const column = !grid && style.flexDirection === "column";
  for (const property of ["gap", "flex-direction", "align-items", "justify-content", "grid-template-columns"]) style.removeProperty(property);
  // Flex and grid turn their items into blocks, whatever the tag; a grid item also stretches to its cell.
  for (const child of children) {
    if (child instanceof HTMLElement && (!child.style.display || (grid && child.style.display === "inline-block"))) child.style.display = "block";
  }

  if (column) {
    style.display = "block";
    if (centred) style.textAlign = "center";
    if (justify === "center") el.dataset.valign = "middle"; // a text column centred beside a picture
    children.forEach((child, index) => { if (index && gap && child instanceof HTMLElement) child.style.marginTop = `${gap}px`; });
    return;
  }

  const fullWidth = grid || justify === "space-between";
  const table = el.ownerDocument.createElement("table");
  for (const [name, value] of [["role", "presentation"], ["cellpadding", "0"], ["cellspacing", "0"], ["border", "0"]]) table.setAttribute(name, value);
  table.setAttribute("style", `border-collapse:collapse;${fullWidth ? "width:100%;" : ""}${!fullWidth && justify === "center" ? "margin:0 auto;" : ""}${!fullWidth && justify === "flex-end" ? "margin-left:auto;" : ""}${explicitHeight ? `height:${explicitHeight};` : ""}`);
  if (!fullWidth && justify === "center") table.setAttribute("align", "center");
  if (!fullWidth && justify === "flex-end") table.setAttribute("align", "right");

  const perRow = columnWidths?.length || children.length;
  for (let start = 0; start < children.length; start += perRow) {
    const row = table.insertRow();
    children.slice(start, start + perRow).forEach((child, index, cells) => {
      const cell = row.insertCell();
      const middle = centred || (child instanceof HTMLElement && child.dataset.valign === "middle");
      if (child instanceof HTMLElement) delete child.dataset.valign;
      const last = index === cells.length - 1;
      cell.setAttribute("style", [
        `padding:${start ? gap : 0}px 0 0 ${index ? gap : 0}px`,
        `vertical-align:${middle ? "middle" : "top"}`,
        columnWidths ? `width:${columnWidths[index]}%` : "",
        justify === "space-between" && last && cells.length > 1 ? "text-align:right" : "",
        justify === "space-between" && cells.length > 1 ? "" : (!fullWidth && justify === "center") ? "text-align:center" : "",
      ].filter(Boolean).join(";"));
      if (justify === "space-between" && last && cells.length > 1) cell.setAttribute("align", "right");
      // a block would fill the cell and sit left; shrink it so the right alignment can act on it
      if (justify === "space-between" && last && cells.length > 1 && child instanceof HTMLElement && child.style.display === "block") child.style.display = "inline-block";
      cell.appendChild(child);
    });
  }
  style.display = display === "inline-flex" ? "inline-block" : "block";
  if (display === "inline-flex") style.verticalAlign = "middle";
  el.appendChild(table);
}

/** "repeat(2, minmax(0, 1fr))" or "0.9fr 1.1fr" -> column widths in percent. */
function gridColumns(template: string): number[] {
  const repeat = /repeat\((\d+)/.exec(template);
  if (repeat) return Array.from({ length: Number(repeat[1]) }, () => Math.round(1000 / Number(repeat[1])) / 10);
  const parts = template.split(/\s+/).map(part => parseFloat(part)).filter(value => value > 0);
  const total = parts.reduce((sum, value) => sum + value, 0) || 1;
  return parts.length ? parts.map(value => Math.round(value / total * 1000) / 10) : [100];
}

/**
 * @param html   the sections, with their colours and sizes already resolved to real values
 * @param width  the email's content width, so pictures are measured at the size they are shown
 */
export async function compileEmailHtml(html: string, width: number, upload: UploadImage): Promise<string> {
  // Attached but off-screen: sizes and colours are only known for elements in the document.
  const stage = document.createElement("div");
  stage.setAttribute("style", `position:fixed;left:-10000px;top:0;width:${width}px;visibility:hidden;pointer-events:none;`);
  stage.innerHTML = html;
  document.body.appendChild(stage);
  try {
    // 1. Wrapper spans that only exist for React keys.
    stage.querySelectorAll<HTMLElement>("span").forEach(span => { if (span.style.display === "contents") span.replaceWith(...Array.from(span.childNodes)); });
    stage.querySelectorAll("[data-image-handle],[data-image-tools],[data-image-size]").forEach(node => node.remove());

    // 2. Placeholders nobody filled in: an empty picture frame has no place in a sent email.
    stage.querySelectorAll('svg[data-testid="ImageOutlinedIcon"]').forEach(icon => {
      const frame = icon.parentElement;
      icon.remove();
      if (frame && !frame.textContent?.trim() && !frame.querySelector("img")) frame.remove();
    });

    // 3. Pictures and icons. One that fails stays as it is rather than failing the whole email.
    const settle = (work: Promise<void>[]) => Promise.all(work.map(task => task.catch(() => undefined)));
    await settle(Array.from(stage.querySelectorAll<HTMLElement>("[data-image-slot]")).map(slot => bakeFramedImage(slot, upload)));
    await settle(Array.from(stage.querySelectorAll<SVGElement>("svg")).map(svg => svgToImage(svg, upload)));

    // 4. A social icon is a round link with its picture centred: no flexbox needed.
    stage.querySelectorAll<HTMLElement>("a[data-social]").forEach(link => {
      const size = link.style.width || "24px";
      for (const property of ["align-items", "justify-content", "flex-shrink"]) link.style.removeProperty(property);
      link.style.display = "inline-block";
      link.style.textAlign = "center";
      link.style.lineHeight = size;
      link.style.fontSize = "0";
    });

    // 5. Layout: deepest containers first, so a parent wraps children that are already tables.
    Array.from(stage.querySelectorAll<HTMLElement>("*"))
      .filter(el => ["flex", "inline-flex", "grid"].includes(el.style.display))
      .reverse()
      .forEach(layoutAsTable);

    // 6. Editor-only attributes.
    stage.querySelectorAll<HTMLElement>("*").forEach(el => {
      for (const name of ["class", "contenteditable", "data-testid", "focusable", "aria-hidden", "data-base-style", "data-image-slot", "data-slot-image", "draggable", "data-valign"]) el.removeAttribute(name);
      // custom properties mean nothing to a mail client; their values are already written into the styles
      for (const property of Array.from(el.style ?? [])) if (property.startsWith("--") || property === "flex-shrink") el.style.removeProperty(property);
    });
    // 7. Gmail lays a "download" button over any sizeable picture that is not a link, and it drops <style>
    //    blocks sent inside the body, so the button cannot be hidden with CSS. A picture that is a link gets
    //    no button, so each unlinked one is made a link to itself.
    stage.querySelectorAll<HTMLImageElement>("img").forEach(img => {
      if ((img.width || parseFloat(img.style.width) || 999) < 100 || img.closest("a") || !/^https?:/.test(img.src)) return;
      const link = document.createElement("a");
      link.href = img.src;
      link.target = "_blank";
      link.setAttribute("style", `display:${img.style.display === "block" ? "block" : "inline-block"};text-decoration:none;cursor:default;`);
      img.replaceWith(link);
      link.appendChild(img);
    });
    return stage.innerHTML;
  } finally {
    stage.remove();
  }
}
