"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { today } from "@/services/fitness";
import { useAnchoredPopover } from "@/components/ui/use-anchored-popover";
import styles from "./agenda-panel.module.css";

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const keyOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseDay = (value: string) => new Date(`${value}T12:00:00`);
const labelOf = (date: Date) => date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

export function AgendaDatePicker({ id, label, value, disabled = false, allowClear = false, align = "end", describedBy, onChange }: { id?: string; label: string; value: string; disabled?: boolean; allowClear?: boolean; align?: "start" | "end"; describedBy?: string; onChange: (value: string) => void }) {
  const popupId = useId();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => parseDay(value || today()));
  const [focused, setFocused] = useState(value || today());
  const field = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), calendar = useRef<HTMLDivElement>(null);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useAnchoredPopover({ open: open && !disabled, trigger, panel: calendar, align, onHidden: () => setOpen(false) });
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!field.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => {
    if (open) calendar.current?.querySelector<HTMLButtonElement>(`button[data-day="${focused}"]`)?.focus({ preventScroll: true });
  }, [open, focused]);
  const year = month.getFullYear(), index = month.getMonth();
  const days = new Date(year, index + 1, 0).getDate(), offset = new Date(year, index, 1).getDay();
  const moveMonth = (amount: number) => {
    const next = new Date(year, index + amount, 1, 12);
    setMonth(next); setFocused(keyOf(next));
  };
  const pick = (day: string) => { onChange(day); close(); };
  return <div className={`${styles.datePicker} ${styles.compact}`} ref={field} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <button id={id} ref={trigger} type="button" disabled={disabled} className={styles.dateTrigger} aria-label={`${label}: ${value ? parseDay(value).toLocaleDateString("pt-BR") : "Selecione a data"}`}
      aria-describedby={describedBy} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? popupId : undefined}
      onClick={() => {
        if (!open) { const day = value || today(); setMonth(parseDay(day)); setFocused(day); }
        setOpen(previous => !previous);
      }}>
      <span>{value ? parseDay(value).toLocaleDateString("pt-BR") : "Selecione a data"}</span><CalendarDays size={15} aria-hidden="true" />
    </button>
    {open && !disabled && <div id={popupId} ref={calendar} className={styles.calendar} popover="manual" style={{ visibility: "hidden" }} data-align={align} role="dialog" aria-label={`Calendário — ${label}`}
      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }}>
      <div className={styles.calendarHeading}>
        <button type="button" aria-label="Mês anterior" onClick={() => moveMonth(-1)}><ChevronLeft size={16} aria-hidden="true" /></button>
        <span aria-live="polite">{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
        <button type="button" aria-label="Próximo mês" onClick={() => moveMonth(1)}><ChevronRight size={16} aria-hidden="true" /></button>
      </div>
      <div className={styles.weekdays} aria-hidden="true">{weekdays.map(day => <span key={day}>{day}</span>)}</div>
      <div className={styles.calendarDays} aria-label="Dias do mês">
        {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} aria-hidden="true" />)}
        {Array.from({ length: days }, (_, i) => {
          const date = new Date(year, index, i + 1, 12), day = keyOf(date);
          return <button type="button" key={day} data-day={day} tabIndex={focused === day ? 0 : -1}
            aria-label={labelOf(date)} aria-pressed={value === day} aria-current={today() === day ? "date" : undefined}
            onClick={() => pick(day)} onKeyDown={event => {
              const next = new Date(date);
              const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
              if (event.key in delta) next.setDate(next.getDate() + delta[event.key]);
              else if (event.key === "Home") next.setDate(next.getDate() - next.getDay());
              else if (event.key === "End") next.setDate(next.getDate() + 6 - next.getDay());
              else if (event.key === "PageUp" || event.key === "PageDown") {
                const step = (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1);
                next.setDate(1); next.setMonth(next.getMonth() + step);
                next.setDate(Math.min(date.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
              } else return;
              event.preventDefault(); setMonth(next); setFocused(keyOf(next));
            }}>{i + 1}</button>;
        })}
      </div>
      <div className={styles.calendarFooter}>{allowClear && <button type="button" onClick={() => pick("")}>Limpar</button>}<button type="button" onClick={() => pick(today())}>Hoje</button><button type="button" onClick={close}>Fechar</button></div>
    </div>}
  </div>;
}
