type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs: Record<string, string> = {}, ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v; else el.setAttribute(k, v);
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export const clear = (el: Element) => { while (el.firstChild) el.removeChild(el.firstChild); };

export function confidenceBadge(level: string): HTMLElement {
  return h('span', { class: `t-badge t-badge-${level.toLowerCase()}` }, level.toUpperCase());
}

export function simulatedBadge(): HTMLElement {
  return h('span', { class: 't-badge t-badge-simulated' }, 'SIMULATED');
}

export function download(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
