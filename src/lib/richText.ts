/** Allow formatting only; never render scripts, links, event handlers or remote content. */
export function cleanNoteHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const output = document.createElement('div');
  const allowed = new Set([
    'P',
    'DIV',
    'BR',
    'B',
    'STRONG',
    'I',
    'EM',
    'U',
    'S',
    'UL',
    'OL',
    'LI',
    'SPAN',
    'FONT',
  ]);
  const copy = (node: Node, parent: HTMLElement) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.append(document.createTextNode(node.textContent || ''));
      return;
    }
    if (
      !(node instanceof Element) ||
      ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'].includes(node.tagName)
    )
      return;
    if (!allowed.has(node.tagName)) {
      for (const child of node.childNodes) copy(child, parent);
      return;
    }
    const el = document.createElement(
      node.tagName === 'FONT' ? 'span' : node.tagName.toLowerCase(),
    );
    const style = (node as HTMLElement).style;
    for (const prop of ['color', 'background-color'] as const) {
      const value =
        style?.getPropertyValue(prop) || (prop === 'color' ? node.getAttribute('color') : '');
      if (value && /^(#[0-9a-f]{3,8}|rgba?\([\d.,%\s]+\)|[a-z]+)$/i.test(value))
        el.style.setProperty(prop, value);
    }
    parent.append(el);
    for (const child of node.childNodes) copy(child, el);
  };
  for (const node of doc.body.childNodes) copy(node, output);
  return output.innerHTML;
}
export function legacyNotesHtml(text: string) {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .split('\n')
    .map((line) => {
      const formatted = escape(line.replace(/^- /, ''))
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return line.startsWith('- ')
        ? `<ul><li>${formatted}</li></ul>`
        : `<div>${formatted || '<br>'}</div>`;
    })
    .join('');
}
