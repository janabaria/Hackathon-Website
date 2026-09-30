import { useLayoutEffect, useRef, useState } from 'react';
import { Bold, Italic, List, ListOrdered, Highlighter, Palette } from 'lucide-react';
import { cleanNoteHtml, legacyNotesHtml } from '../lib/richText';
export function NoteEditor({
  notes,
  html,
  onChange,
}: {
  notes: string;
  html?: string;
  onChange: (notes: string, html: string) => void;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const selection = useRef<Range | null>(null);
  const [error, setError] = useState('');
  useLayoutEffect(() => {
    if (editor.current) editor.current.innerHTML = cleanNoteHtml(html ?? legacyNotesHtml(notes));
  }, []);
  const remember = () => {
    const s = window.getSelection();
    if (s?.rangeCount && editor.current?.contains(s.anchorNode))
      selection.current = s.getRangeAt(0).cloneRange();
  };
  const emit = () => {
    const el = editor.current!;
    const clean = cleanNoteHtml(el.innerHTML);
    if (el.innerText.length > 12000 || clean.length > 60000) {
      setError('This page is full. Shorten your notes before saving.');
      onChange(el.innerText, clean);
      return;
    }
    setError('');
    onChange(el.innerText, clean);
    remember();
  };
  const command = (name: string, value?: string) => {
    editor.current?.focus();
    const s = window.getSelection();
    if (selection.current && s) {
      s.removeAllRanges();
      s.addRange(selection.current);
    }
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(name, false, value);
    emit();
  };
  return (
    <>
      <div className="note-format-toolbar" role="toolbar" aria-label="Text formatting">
        {[
          { name: 'bold', label: 'Bold', Icon: Bold },
          { name: 'italic', label: 'Italic', Icon: Italic },
          { name: 'insertUnorderedList', label: 'Bullet list', Icon: List },
          { name: 'insertOrderedList', label: 'Numbered list', Icon: ListOrdered },
        ].map(({ name, label, Icon }) => (
          <button
            type="button"
            className="icon-button"
            key={name}
            aria-label={label}
            title={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(name)}
          >
            <Icon size={18} />
          </button>
        ))}
        <label className="note-color-control" title="Text color">
          <Palette size={18} />
          <span>Text</span>
          <input
            type="color"
            aria-label="Text color"
            defaultValue="#6754df"
            onInput={(e) => command('foreColor', e.currentTarget.value)}
          />
        </label>
        <label className="note-color-control" title="Highlight color">
          <Highlighter size={18} />
          <span>Highlight</span>
          <input
            type="color"
            aria-label="Highlight color"
            defaultValue="#ffe58a"
            onInput={(e) => command('hiliteColor', e.currentTarget.value)}
          />
        </label>
        <button
          type="button"
          className="color-swatch"
          style={{ background: '#6754df' }}
          aria-label="Purple text"
          title="Purple text"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command('foreColor', '#6754df')}
        />
        <button
          type="button"
          className="color-swatch"
          style={{ background: '#c94e74' }}
          aria-label="Rose text"
          title="Rose text"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command('foreColor', '#c94e74')}
        />
        <button
          type="button"
          className="color-swatch"
          style={{ background: '#ffe58a' }}
          aria-label="Yellow highlight"
          title="Yellow highlight"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command('hiliteColor', '#ffe58a')}
        />
        <button
          type="button"
          className="text-button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command('removeFormat')}
        >
          Clear format
        </button>
      </div>
      <div
        ref={editor}
        className="note-writing-area rich-note-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Page notes"
        data-placeholder="Start writing your notes here…"
        onInput={emit}
        onKeyUp={remember}
        onMouseUp={remember}
        onBlur={remember}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
          emit();
        }}
      />
      {error && <p role="alert">{error}</p>}
    </>
  );
}
