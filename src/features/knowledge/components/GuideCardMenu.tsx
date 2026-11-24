import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import type { ClinicalResource } from '@/types';
interface Props {
  resource: ClinicalResource;
  disabled?: boolean;
  onEdit: () => void;
  onApprove: () => void;
  onToggle: () => void;
  onDelete: () => void;
}
function menuPosition(rect: DOMRect, itemCount: number) {
  const height = itemCount * 44 + 28;
  return {
    left: Math.max(8, Math.min(rect.right - 192, innerWidth - 200)),
    top:
      rect.bottom + height + 8 <= innerHeight
        ? rect.bottom + 6
        : Math.max(
            8,
            Math.min(innerHeight - height - 8, rect.top - height - 6),
          ),
  };
}
export function GuideCardMenu({
  resource,
  disabled,
  onEdit,
  onApprove,
  onToggle,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const trigger = useRef<HTMLButtonElement>(null),
    menu = useRef<HTMLDivElement>(null);
  const firstIndex = useRef(0);
  const id = useId();
  const items = [
    { label: 'Edit', action: onEdit },
    ...(resource.source === 'guide'
      ? resource.status === 'DRAFT'
        ? [{ label: 'Approve', action: onApprove }]
        : [
            {
              label: resource.isActive === false ? 'Publish' : 'Unpublish',
              action: onToggle,
            },
          ]
      : []),
    { label: 'Delete', action: onDelete },
  ];
  function close(restore = false) {
    setOpen(false);
    if (restore) trigger.current?.focus({ preventScroll: true });
  }
  useLayoutEffect(() => {
    if (!open) return;
    setPosition(
      menuPosition(trigger.current!.getBoundingClientRect(), items.length),
    );
    const buttons =
      menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    buttons?.item(firstIndex.current)?.focus({ preventScroll: true });
  }, [open, items.length]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        !menu.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const reposition = () => {
      if (trigger.current)
        setPosition(
          menuPosition(trigger.current.getBoundingClientRect(), items.length),
        );
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, items.length]);
  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={`Actions for ${resource.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
        onClick={(event) => {
          event.stopPropagation();
          firstIndex.current = 0;
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            firstIndex.current = event.key === 'ArrowUp' ? items.length - 1 : 0;
            setOpen(true);
          }
        }}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-labelledby={id}
            style={{ left: position.left, top: position.top }}
            className="fixed z-[70] max-h-[calc(100dvh-16px)] w-48 max-w-[calc(100vw-16px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              const buttons = [
                ...menu.current!.querySelectorAll<HTMLButtonElement>(
                  '[role="menuitem"]',
                ),
              ];
              const index = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                event.stopPropagation();
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? buttons.length - 1
                      : (index +
                          (event.key === 'ArrowDown' ? 1 : -1) +
                          buttons.length) %
                        buttons.length;
                buttons[next]?.focus({ preventScroll: true });
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                close(true);
              }
              if (event.key === 'Tab') close(true);
            }}
          >
            {items.map((item, index) => (
              <div
                key={item.label}
                className={
                  item.label === 'Delete'
                    ? 'mt-1 border-t border-slate-200 pt-1 dark:border-slate-700'
                    : ''
                }
              >
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={index === 0 ? 0 : -1}
                  className={`flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${item.label === 'Delete' ? 'text-rose-700 hover:bg-rose-50 focus:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/50 dark:focus:bg-rose-950/50' : 'text-slate-700 hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800'}`}
                  onClick={() => {
                    close(true);
                    item.action();
                  }}
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
