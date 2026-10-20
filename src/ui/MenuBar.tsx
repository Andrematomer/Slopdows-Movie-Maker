import { useEffect, useRef, useState } from 'preact/hooks';

export type MenuItem =
  | 'sep'
  | { label: string; onClick: () => void; checked?: boolean; disabled?: boolean };

export interface Menu {
  label: string;
  items: MenuItem[];
}

export function MenuBar({ menus }: { menus: Menu[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div class="menubar" ref={ref}>
      {menus.map((menu, i) => (
        <div class="menu" key={menu.label}>
          <button
            class={`menu-title ${open === i ? 'open' : ''}`}
            onClick={() => setOpen(open === i ? null : i)}
            onMouseEnter={() => open !== null && setOpen(i)}
          >
            {menu.label}
          </button>
          {open === i && (
            <div class="menu-drop">
              {menu.items.map((item, j) =>
                item === 'sep' ? (
                  <hr key={j} />
                ) : (
                  <button
                    key={item.label}
                    class="menu-item"
                    disabled={item.disabled}
                    onClick={() => {
                      setOpen(null);
                      item.onClick();
                    }}
                  >
                    <span class="check">{item.checked ? '✓' : ''}</span>
                    {item.label}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
