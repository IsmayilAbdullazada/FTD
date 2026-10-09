import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, MapPin, Clock, Trash2, CheckCircle2 } from 'lucide-react';
import { CurrentUser, CalendarEvent, EventType } from '../types';
import { api } from '../services/api';

const TYPE_META: Record<EventType, { label: string; chip: string; dot: string }> = {
  CARE_PARTNER_CONFERENCE: {
    label: 'Care Partner Conference',
    chip: 'bg-blue-50 dark:bg-blue-950/60 text-[#002D72] dark:text-blue-300 border-blue-100 dark:border-blue-900/60',
    dot: 'bg-[#002D72] dark:bg-blue-400',
  },
  SUPPORT_GROUP: {
    label: 'Support Group Conference',
    chip: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/60',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
  },
  SOCIAL: {
    label: 'Social Get-Together',
    chip: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-100 dark:border-amber-900/60',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const emptyForm = (date = ''): {
  title: string; type: EventType; startsAt: string; location: string; description: string;
} => ({
  title: '',
  type: 'SUPPORT_GROUP',
  startsAt: date ? `${date}T10:00` : '',
  location: '',
  description: '',
});

export const CalendarPage: React.FC<{ currentUser: CurrentUser }> = ({ currentUser }) => {
  const canEdit = currentUser.role === 'CLINICIAN_MODERATOR' || currentUser.role === 'SYSTEM_ADMIN';

  const today = new Date();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    api.getEvents().then(setEvents);
  }, []);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const key = e.startsAt.slice(0, 10);
      (map[key] ||= []).push(e);
    }
    Object.values(map).forEach((list) => list.sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewDate]);

  const monthPrefix = `${viewDate.getFullYear()}-${pad(viewDate.getMonth() + 1)}`;
  const monthEvents = events
    .filter((e) => e.startsAt.startsWith(monthPrefix))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const listEvents = selectedKey ? eventsByDay[selectedKey] || [] : monthEvents;

  const changeMonth = (delta: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
    setSelectedKey(null);
  };

  const goToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(toKey(today));
  };

  const openAdd = (dateKey = '') => {
    setForm(emptyForm(dateKey));
    setShowModal(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startsAt || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const created = await api.createEvent(
        {
          title: form.title.trim(),
          type: form.type,
          startsAt: form.startsAt,
          location: form.location.trim(),
          description: form.description.trim() || undefined,
        },
        currentUser.id
      );
      setEvents((prev) => [...prev, created]);
      setShowModal(false);
      setToast(`"${created.title}" added to the calendar.`);
      setTimeout(() => setToast(null), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (ev: CalendarEvent) => {
    await api.deleteEvent(ev.id, currentUser.id);
    setEvents((prev) => prev.filter((x) => x.id !== ev.id));
    setPendingDelete(null);
    setToast(`"${ev.title}" removed from the calendar.`);
    setTimeout(() => setToast(null), 3500);
  };

  const inputCls =
    'w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500';
  const todayKey = toKey(today);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">Events Calendar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
            Care partner conferences, support group conferences, and social get-togethers.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => openAdd(selectedKey || '')}
            className="px-4 py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition shrink-0 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        )}
      </div>

      {toast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-sm px-4 py-2.5 rounded-xl flex items-center justify-between animate-in fade-in">
          <span>{toast}</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>
      )}

      {/* Month grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
            {viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-1.5">
            <button onClick={goToday} className="px-3 py-1.5 text-xs font-semibold text-[#002D72] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition cursor-pointer">
              Today
            </button>
            <button onClick={() => changeMonth(-1)} aria-label="Previous month" className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => changeMonth(1)} aria-label="Next month" className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const key = toKey(d);
            const inMonth = d.getMonth() === viewDate.getMonth();
            const dayEvents = eventsByDay[key] || [];
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            return (
              <button
                key={i}
                onClick={() => setSelectedKey(isSelected ? null : key)}
                className={`min-h-14 sm:min-h-24 p-1 sm:p-1.5 border-b border-r border-slate-100 dark:border-slate-800/80 text-left flex flex-col gap-1 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${
                  inMonth ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-950/40'
                } ${isSelected ? 'ring-2 ring-inset ring-[#002D72] dark:ring-blue-500' : ''}`}
              >
                <span
                  className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-[#002D72] dark:bg-blue-600 text-white' : inMonth ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {d.getDate()}
                </span>

                {/* Desktop: labeled chips */}
                <div className="hidden sm:flex flex-col gap-0.5">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <span key={ev.id} className={`truncate text-[11px] font-medium px-1.5 py-0.5 rounded border ${TYPE_META[ev.type].chip}`}>
                      {ev.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium px-1">+{dayEvents.length - 2} more</span>
                  )}
                </div>

                {/* Mobile: colored dots */}
                <div className="flex sm:hidden gap-0.5 flex-wrap px-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${TYPE_META[ev.type].dot}`} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
        {Object.entries(TYPE_META).map(([key, m]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${m.dot}`} />
            {m.label}
          </span>
        ))}
      </div>

      {/* Event list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-slate-900 dark:text-white">
            {selectedKey
              ? new Date(selectedKey + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              : `Events in ${viewDate.toLocaleString('en-US', { month: 'long' })}`}
          </h3>
          {selectedKey && (
            <div className="flex items-center gap-3 text-xs font-semibold">
              {canEdit && (
                <button onClick={() => openAdd(selectedKey)} className="text-[#002D72] dark:text-blue-400 hover:underline cursor-pointer">
                  + Add on this day
                </button>
              )}
              <button onClick={() => setSelectedKey(null)} className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer">
                Show whole month
              </button>
            </div>
          )}
        </div>

        {listEvents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No events {selectedKey ? 'on this day' : 'this month'}.
          </div>
        ) : (
          listEvents.map((ev) => {
            const d = new Date(ev.startsAt);
            const meta = TYPE_META[ev.type];
            return (
              <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex gap-4">
                <div className="text-center w-12 shrink-0">
                  <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase">{d.toLocaleString('en-US', { month: 'short' })}</div>
                  <div className="text-2xl font-bold text-[#002D72] dark:text-blue-400 leading-none mt-0.5">{d.getDate()}</div>
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md border ${meta.chip}`}>{meta.label}</span>
                  <h4 className="font-serif font-semibold text-base sm:text-lg text-slate-900 dark:text-white leading-snug">{ev.title}</h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {ev.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {ev.location}
                      </span>
                    )}
                  </div>
                  {ev.description && <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{ev.description}</p>}
                </div>
                {canEdit && (
                  <button
                    onClick={() => setPendingDelete(ev)}
                    aria-label="Delete event"
                    className="self-start p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add event modal */}
      {canEdit && showModal && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Add Calendar Event</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Visible to all care partners once added.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Event Title</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Type</label>
                  <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}>
                    {Object.entries(TYPE_META).map(([key, m]) => (
                      <option key={key} value={key}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    className={inputCls}
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Location or Zoom Link</label>
                <input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description (optional)</label>
                <textarea rows={3} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg font-semibold transition"
                >
                  {isSubmitting ? 'Adding...' : 'Add to Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {canEdit && pendingDelete && (
        <div
            onClick={() => setPendingDelete(null)}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-[60] flex items-center justify-center p-4 cursor-pointer"
        >
            <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 cursor-default"
            >
            <div className="space-y-1.5">
                <h3 className="font-semibold text-slate-900 dark:text-white">Delete this event?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                "{pendingDelete.title}" on{' '}
                {new Date(pendingDelete.startsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} will be
                removed for all care partners. This can't be undone.
                </p>
            </div>
            <div className="flex items-center justify-end gap-2">
                <button
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition"
                >
                Cancel
                </button>
                <button
                onClick={() => handleDelete(pendingDelete)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition"
                >
                Delete
                </button>
            </div>
            </div>
        </div>
        )}
    </div>
  );
};