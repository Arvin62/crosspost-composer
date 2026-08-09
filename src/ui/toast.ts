const el = document.querySelector<HTMLElement>('#toast');
let timer: number | undefined;

/** 底部气泡提示。dur 为 0 表示常驻（需后续调用覆盖）。 */
export function toast(msg: string, dur = 2600): void {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  window.clearTimeout(timer);
  if (dur) timer = window.setTimeout(() => el.classList.remove('show'), dur);
}
