"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, SlidersHorizontal } from "lucide-react";

const options = [
  { value: "featured", label: "Nossa seleção" },
  { value: "new", label: "Novidades" },
  { value: "price-low", label: "Menor preço" },
  { value: "price-high", label: "Maior preço" },
] as const;

type CustomSortProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function CustomSort({ value, onChange }: CustomSortProps) {
  const id = useId();
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const tabCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelTabClose() {
    if (tabCloseRef.current !== null) {
      clearTimeout(tabCloseRef.current);
      tabCloseRef.current = null;
    }
  }

  function openMenu() {
    cancelTabClose();
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function closeAndFocusTrigger() {
    cancelTabClose();
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }

  function selectOption(index: number) {
    closeAndFocusTrigger();
    onChange(options[index].value);
  }

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus({ preventScroll: true });
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;
    function handleOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer, true);
  }, [open]);

  useEffect(() => () => {
    if (tabCloseRef.current !== null) clearTimeout(tabCloseRef.current);
  }, []);

  function handleOptionKeyDown(event: KeyboardEvent<HTMLLIElement>, index: number) {
    let nextIndex: number | undefined;
    switch (event.key) {
      case "ArrowDown": nextIndex = (index + 1) % options.length; break;
      case "ArrowUp": nextIndex = (index - 1 + options.length) % options.length; break;
      case "Home": nextIndex = 0; break;
      case "End": nextIndex = options.length - 1; break;
      case "Enter":
      case " ":
        event.preventDefault();
        selectOption(index);
        return;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        closeAndFocusTrigger();
        return;
      case "Tab":
        // Keep the focused option mounted until the browser moves focus naturally.
        cancelTabClose();
        tabCloseRef.current = setTimeout(() => {
          tabCloseRef.current = null;
          setOpen(false);
        }, 0);
        return;
      default: return;
    }
    event.preventDefault();
    setActiveIndex(nextIndex);
  }

  return (
    <div
      className="sort-dropdown"
      ref={rootRef}
      data-open={open || undefined}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <span id={`${id}-label`} className="sr-only">Ordenar peças</span>
      <button
        ref={triggerRef}
        type="button"
        className="sort-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={event => {
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
            event.preventDefault();
            openMenu();
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            closeAndFocusTrigger();
          }
        }}
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        <span id={`${id}-value`}>{options[selectedIndex].label}</span>
      </button>
      {open && (
        <ul id={`${id}-menu`} className="sort-menu" role="listbox" aria-labelledby={`${id}-label`}>
          {options.map((option, index) => (
            <li
              key={option.value}
              ref={element => { optionRefs.current[index] = element; }}
              className="sort-option"
              role="option"
              aria-selected={index === selectedIndex}
              tabIndex={index === activeIndex ? 0 : -1}
              onFocus={() => setActiveIndex(index)}
              onClick={() => selectOption(index)}
              onKeyDown={event => handleOptionKeyDown(event, index)}
            >
              <span>{option.label}</span>
              {index === selectedIndex && <Check size={16} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
