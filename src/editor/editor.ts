import { blockOf } from '../core/position';
import { exportHTML } from '../core/serialize';

/**
 * 可视化编辑区的封装：追踪光标选区、提供段落定位、内容读写。
 * 保持框架无关——只依赖 DOM 与 core/ 里的纯函数。
 */
export class Editor {
  readonly el: HTMLElement;
  private savedRange: Range | null = null;
  /** 内容发生改动时的回调（外部装配自动保存 / 统计）。 */
  onChange: () => void = () => {};

  constructor(el: HTMLElement) {
    this.el = el;
    document.addEventListener('selectionchange', () => this.track());
    el.addEventListener('beforeinput', () => this.prepareForEditing());
    el.addEventListener('input', () => this.onChange());
  }

  private track(): void {
    const s = getSelection();
    if (s && s.rangeCount && this.el.contains(s.anchorNode)) {
      this.savedRange = s.getRangeAt(0).cloneRange();
    }
  }

  /** 光标所在的插图参照块（段落级元素）。 */
  currentBlock(): HTMLElement | null {
    return blockOf(this.el, this.savedRange ? this.savedRange.startContainer : null);
  }

  /** 由任意节点解析出参照块（拖拽落点定位用）。 */
  blockFromNode(node: Node | null): HTMLElement | null {
    return blockOf(this.el, node);
  }

  setHTML(html: string): void {
    this.el.innerHTML = html;
    this.savedRange = null;
  }

  exportHTML(): string {
    return exportHTML(this.el);
  }

  get hasWelcome(): boolean {
    return !!this.el.querySelector('[data-welcome]');
  }

  get isEmpty(): boolean {
    return !this.el.innerText.trim() && !this.el.querySelector('img,video,audio,table');
  }

  /** 首次直接输入或插图时清掉只读意义上的欢迎内容，并把光标放到空段落。 */
  prepareForEditing(): void {
    if (!this.hasWelcome) return;
    this.setHTML('<p><br></p>');
    const paragraph = this.el.firstElementChild;
    if (!paragraph) return;
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    range.collapse(true);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  focus(): void {
    window.focus();
    this.el.focus({ preventScroll: true });
  }
}
