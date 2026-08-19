import { Component, ElementRef, forwardRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { UploadService } from '../../core/services/api.service';

/**
 * A small formatting editor for product copy — bold, italic, headings, lists
 * and links, stored as HTML.
 *
 * Built on `contenteditable` + `document.execCommand`. execCommand is formally
 * deprecated but is the only API implemented consistently across every browser
 * for this, and the alternative is a third-party editor bundle; for a handful
 * of inline formats it is the pragmatic choice.
 *
 * Implements ControlValueAccessor, so it drops into a form as
 * `<app-rich-text [(ngModel)]="form.description" />`.
 */
@Component({
  selector: 'app-rich-text',
  standalone: true,
  imports: [CommonModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RichTextEditorComponent), multi: true },
  ],
  template: `
    <div class="rt" [class.focused]="focused">
      <div class="rt-bar" role="toolbar" aria-label="Formatting">
        @for (b of buttons; track b.cmd + b.arg) {
          <button
            type="button"
            class="rt-btn"
            [class.wide]="b.wide"
            [title]="b.title"
            [attr.aria-label]="b.title"
            (mousedown)="$event.preventDefault()"
            (click)="run(b.cmd, b.arg)"
          >{{ b.label }}</button>
        }
        <span class="rt-sep"></span>
        <button type="button" class="rt-btn wide" title="Insert link"
                (mousedown)="$event.preventDefault()" (click)="addLink()">🔗 Link</button>

        <!-- Image: uploaded or linked, inserted wherever the caret is. -->
        <label class="rt-btn wide" [class.busy]="uploading" title="Upload an image here"
               (mousedown)="rememberCaret()">
          {{ uploading ? '… Uploading' : '🖼️ Upload' }}
          <input type="file" accept="image/*" hidden [disabled]="uploading" (change)="uploadImage($event)" />
        </label>
        <button type="button" class="rt-btn wide" title="Insert an image from a link"
                (mousedown)="$event.preventDefault(); rememberCaret()" (click)="addImageByUrl()">🖼️ Link</button>

        <span class="rt-sep"></span>
        <button type="button" class="rt-btn wide" title="Remove formatting"
                (mousedown)="$event.preventDefault()" (click)="run('removeFormat')">✕ Clear</button>
      </div>
      @if (uploadError) { <div class="rt-error">{{ uploadError }}</div> }

      <div
        #area
        class="rt-area"
        contenteditable="true"
        role="textbox"
        aria-multiline="true"
        [attr.data-placeholder]="placeholder"
        (input)="onInput()"
        (blur)="onBlur()"
        (focus)="onFocus()"
        (paste)="onPaste($event)"
      ></div>
    </div>
  `,
  styles: [`
    .rt { border:2px solid var(--line); border-radius: var(--radius-sm); background:#fff; overflow:hidden; }
    .rt.focused { border-color: var(--brand); }
    .rt-bar { display:flex; align-items:center; gap:3px; flex-wrap:wrap; padding:6px;
      background: var(--cream); border-bottom:1px solid var(--line); }
    .rt-btn { min-width:32px; height:30px; padding:0 7px; border:1px solid transparent; border-radius:6px;
      background:none; cursor:pointer; font-family: var(--font-body); font-size:.85rem; color: var(--ink); line-height:1; }
    .rt-btn:hover { background:#fff; border-color: var(--line); }
    .rt-btn.wide { font-size:.78rem; }
    .rt-sep { width:1px; height:20px; background: var(--line); margin:0 4px; }

    .rt-area { min-height:150px; max-height:340px; overflow-y:auto; padding:12px 14px;
      font-family: var(--font-body); font-size:.95rem; line-height:1.6; color: var(--ink); outline:none; }
    /* :empty alone misses the case where the browser leaves a stray <br>. */
    .rt-area:empty::before { content: attr(data-placeholder); color: var(--muted); }
    .rt-area h2 { font-size:1.15rem; margin:.6em 0 .3em; }
    .rt-area h3 { font-size:1rem; margin:.6em 0 .3em; }
    /* The browser may still create <div> line-wrappers while typing; give them
       the same spacing as <p> so the editor previews the published result. */
    .rt-area p, .rt-area div { margin:0 0 .6em; }
    .rt-area ul, .rt-area ol { margin:0 0 .6em; padding-left:1.4em; }
    .rt-area a { color: var(--ink); text-decoration:underline; }
    .rt-area a:hover { color: var(--brand); }
    /* Preview at roughly the published size, capped so one photo doesn't fill
       the whole editing area. */
    .rt-area img { display:block; max-width:100%; width:auto; max-height:220px; height:auto;
      border-radius:10px; margin:.6em auto; }
    .rt-area blockquote { margin:.6em 0; padding-left:12px; border-left:3px solid var(--line); color: var(--muted); }

    .rt-btn.busy { opacity:.6; cursor:progress; }
    label.rt-btn { display:inline-grid; place-items:center; }
    .rt-error { padding:8px 12px; background:#ffeceb; color: var(--danger); font-size:.82rem; font-weight:700; }
  `],
})
export class RichTextEditorComponent implements ControlValueAccessor {
  @Input() placeholder = 'Write a description…';
  @ViewChild('area', { static: true }) area!: ElementRef<HTMLDivElement>;

  focused = false;
  uploading = false;
  uploadError = '';

  /** Caret position captured before a dialog steals focus. */
  private savedRange: Range | null = null;

  constructor(private uploads: UploadService) {}

  readonly buttons = [
    { label: 'B', cmd: 'bold', arg: '', title: 'Bold', wide: false },
    { label: 'I', cmd: 'italic', arg: '', title: 'Italic', wide: false },
    { label: 'U', cmd: 'underline', arg: '', title: 'Underline', wide: false },
    { label: 'H2', cmd: 'formatBlock', arg: 'h2', title: 'Heading', wide: false },
    { label: 'H3', cmd: 'formatBlock', arg: 'h3', title: 'Sub-heading', wide: false },
    { label: '¶', cmd: 'formatBlock', arg: 'p', title: 'Paragraph', wide: false },
    { label: '• List', cmd: 'insertUnorderedList', arg: '', title: 'Bullet list', wide: true },
    { label: '1. List', cmd: 'insertOrderedList', arg: '', title: 'Numbered list', wide: true },
  ];

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  // --- ControlValueAccessor -------------------------------------------------
  writeValue(value: string | null) {
    const el = this.area.nativeElement;
    const html = value ?? '';
    // Only write when it differs, or typing would reset the caret to the start.
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  registerOnChange(fn: (v: string) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
  setDisabledState(disabled: boolean) {
    this.area.nativeElement.contentEditable = disabled ? 'false' : 'true';
  }

  // --- editing --------------------------------------------------------------
  run(cmd: string, arg = '') {
    this.area.nativeElement.focus();
    document.execCommand(cmd, false, arg);
    this.onInput();
  }

  addLink() {
    const url = prompt('Link address (https://…)');
    if (!url) return;
    // Only http(s) — a javascript: URL here would be stored and later rendered.
    if (!/^https?:\/\//i.test(url)) {
      alert('Please enter a link starting with http:// or https://');
      return;
    }
    this.run('createLink', url);
  }

  // --- images ---------------------------------------------------------------

  /**
   * Opening a file dialog or a prompt blurs the editor and throws away the
   * selection, so the caret position is captured before that happens and put
   * back before inserting. Without this every image lands at the end.
   */
  rememberCaret() {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (this.area.nativeElement.contains(range.commonAncestorContainer)) {
      this.savedRange = range.cloneRange();
    }
  }

  private restoreCaret() {
    const el = this.area.nativeElement;
    el.focus();
    if (!this.savedRange) return;
    const sel = document.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(this.savedRange);
  }

  private insertImage(url: string, alt = '') {
    this.restoreCaret();
    const safeAlt = alt.replace(/"/g, '&quot;');
    // A trailing paragraph gives you somewhere to keep typing after the image.
    document.execCommand('insertHTML', false, `<img src="${url}" alt="${safeAlt}"><p><br></p>`);
    this.savedRange = null;
    this.onInput();
  }

  addImageByUrl() {
    const url = prompt('Image address (https://…)');
    if (!url) return;
    if (!/^https?:\/\//i.test(url.trim())) {
      alert('Please enter an image link starting with http:// or https://');
      return;
    }
    this.insertImage(url.trim());
  }

  uploadImage(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading = true;
    this.uploadError = '';
    this.uploads.image(file).subscribe({
      next: (r) => {
        this.uploading = false;
        input.value = '';
        this.insertImage(r.url, file.name.replace(/\.[^.]+$/, ''));
      },
      error: (err) => {
        this.uploading = false;
        input.value = '';
        this.uploadError = err.error?.message || 'Could not upload that image.';
      },
    });
  }

  onInput() {
    const el = this.area.nativeElement;

    // Deleting all the text does NOT leave the box empty — the browser keeps
    // the block scaffolding behind, e.g. "<h2><ul><li><br></li></ul></h2>".
    // Left alone that gets saved as the description and permanently hides the
    // placeholder, so an editor with no visible text is reset to truly empty.
    if (!el.textContent?.trim()) {
      if (el.innerHTML !== '') el.innerHTML = '';
      this.onChange('');
      return;
    }

    // Normalise a detached copy, never the live DOM: rewriting nodes the user
    // is typing into moves the caret out from under them.
    const clone = el.cloneNode(true) as HTMLElement;
    this.normalise(clone);
    this.onChange(clone.innerHTML.trim());
  }

  /**
   * execCommand happily nests blocks that HTML does not allow — applying a
   * heading and then a list to the same selection yields "<h2><ul>…</ul></h2>",
   * which renders as a heading-sized list. Lift any list out of a heading.
   *
   * Also converts the bare <div>s the browser uses for new lines into <p>, so
   * paragraphs actually get spacing when published.
   */
  private normalise(root: HTMLElement) {
    root.querySelectorAll('h2 > ul, h2 > ol, h3 > ul, h3 > ol').forEach((list) => {
      list.parentElement?.replaceWith(list);
    });

    const BLOCKS = 'div, p, ul, ol, h2, h3, figure, blockquote';

    // Browsers wrap new lines in <div>, which has no margin — published copy
    // would run together with no gap between paragraphs.
    let div = root.querySelector('div');
    while (div) {
      if (div.querySelector(BLOCKS)) {
        div.replaceWith(...Array.from(div.childNodes)); // unwrap, keep children
      } else {
        const p = document.createElement('p');
        p.innerHTML = div.innerHTML;
        div.replaceWith(p);
      }
      div = root.querySelector('div');
    }

    // The very first line is usually a bare text node with no wrapper at all,
    // so it would butt against the paragraph beneath it. Wrap loose runs.
    let run: ChildNode[] = [];
    const flush = () => {
      if (!run.length) return;
      const hasText = run.some((n) => (n.textContent || '').trim() || n.nodeName === 'IMG');
      if (hasText) {
        const p = document.createElement('p');
        run[0].before(p);
        run.forEach((n) => p.appendChild(n));
      }
      run = [];
    };
    Array.from(root.childNodes).forEach((node) => {
      const isBlock = node.nodeType === 1 && (node as Element).matches(BLOCKS);
      if (isBlock) flush();
      else run.push(node);
    });
    flush();
  }

  onFocus() {
    this.focused = true;
    // Make Enter produce <p> rather than <div>. Document-level and cheap, so
    // it is (re)applied whenever this editor takes focus.
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* not supported */ }
  }

  /**
   * Paste arrives full of the source's markup — Word classes, font tags, inline
   * styles. Those are stripped by the API on save, so leaving them here would
   * mean the editor showed something different from what got published. Clean
   * on the way in instead.
   */
  onPaste(ev: ClipboardEvent) {
    const data = ev.clipboardData;
    if (!data) return;
    ev.preventDefault();

    const html = data.getData('text/html');
    if (!html) {
      // Plain text still needs escaping — it can contain angle brackets.
      document.execCommand('insertText', false, data.getData('text/plain'));
      this.onInput();
      return;
    }
    document.execCommand('insertHTML', false, this.cleanPastedHtml(html));
    this.onInput();
  }

  /** Mirrors the server's allow-list so the editor shows what will be saved. */
  private cleanPastedHtml(html: string): string {
    const allowed = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H2', 'H3', 'UL', 'OL', 'LI', 'A', 'IMG', 'BLOCKQUOTE']);
    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.body.querySelectorAll('script, style, meta, link, title').forEach((n) => n.remove());

    const walk = (node: Element) => {
      Array.from(node.children).forEach(walk);
      if (!allowed.has(node.tagName)) {
        // Keep the words, drop the wrapper.
        node.replaceWith(...Array.from(node.childNodes));
        return;
      }
      const keep = node.tagName === 'A' ? ['href'] : node.tagName === 'IMG' ? ['src', 'alt'] : [];
      Array.from(node.attributes).forEach((a) => {
        if (!keep.includes(a.name.toLowerCase())) node.removeAttribute(a.name);
      });
      const url = node.getAttribute('href') ?? node.getAttribute('src');
      if (url && !/^(https?:\/\/|mailto:|\/)/i.test(url.trim())) {
        if (node.tagName === 'IMG') node.remove();
        else node.removeAttribute('href');
      }
    };
    Array.from(doc.body.children).forEach(walk);
    return doc.body.innerHTML;
  }

  onBlur() {
    this.focused = false;
    this.onTouched();
  }
}
