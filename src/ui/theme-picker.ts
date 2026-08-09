import { THEMES } from '../themes/presets';

export interface ThemePicker {
  set(id: string): void;
}

/** 在排版工具栏右侧放一个主题下拉，切换即实时预览。 */
export function initThemePicker(current: string, onSelect: (id: string) => void): ThemePicker {
  const bar = document.querySelector('#formatBar');
  if (!bar) return { set: () => {} };

  const label = document.createElement('label');
  label.className = 'tb-theme';
  label.textContent = '主题';

  const select = document.createElement('select');
  for (const t of THEMES) {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    select.appendChild(opt);
  }
  select.value = current;
  select.addEventListener('change', () => onSelect(select.value));

  label.appendChild(select);
  bar.appendChild(label);
  return {
    set(id: string) {
      select.value = THEMES.some((theme) => theme.id === id) ? id : THEMES[0]!.id;
    },
  };
}
