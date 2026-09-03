/**
 * File: src/pages/formBulder/FormBuilder.tsx
 * Form Builder — two-column builder matching the reference design.
 * Left: "Form Configuration" card (name, enable toggle, layout, statistics)
 *       + "Available Field Types" palette (12 types with per-type count badges).
 * Right: "Form Preview" card — empty state or the live list of field cards
 *        (drag handle to reorder, label / placeholder / Required toggle,
 *        move up/down + delete, selected ring).
 * Wired to POST /form-builder/forms/create; drag-reorder via @dnd-kit.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api/client";
import { showToast } from "@/utils/toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Settings,
  Plus,
  Eye,
  Type,
  Mail,
  Hash,
  Phone,
  Link2,
  Lock,
  FileText,
  List,
  Radio,
  CheckSquare,
  Calendar,
  Clock,
  ArrowUp,
  ArrowDown,
  Trash2,
  ChevronDown,
  GripVertical,
} from "lucide-react";

/* ── Field type catalogue ──────────────────────────────────────── */
interface FieldType {
  type: string;
  label: string;
  icon: React.ElementType;
  defaultLabel: string;
  placeholder: string;
}
const FIELD_TYPES: FieldType[] = [
  { type: "text", label: "Text Input", icon: Type, defaultLabel: "Text Field", placeholder: "Enter text" },
  { type: "email", label: "Email", icon: Mail, defaultLabel: "Email Field", placeholder: "Enter email" },
  { type: "number", label: "Number", icon: Hash, defaultLabel: "Number Field", placeholder: "Enter number" },
  { type: "phone", label: "Phone", icon: Phone, defaultLabel: "Phone Field", placeholder: "Enter phone" },
  { type: "url", label: "URL", icon: Link2, defaultLabel: "URL Field", placeholder: "Enter URL" },
  { type: "password", label: "Password", icon: Lock, defaultLabel: "Password Field", placeholder: "Enter password" },
  { type: "textarea", label: "Textarea", icon: FileText, defaultLabel: "Textarea Field", placeholder: "Enter text" },
  { type: "select", label: "Select Dropdown", icon: List, defaultLabel: "Select Field", placeholder: "Select option" },
  { type: "radio", label: "Radio Buttons", icon: Radio, defaultLabel: "Radio Field", placeholder: "" },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare, defaultLabel: "Checkbox Field", placeholder: "" },
  { type: "date", label: "Date", icon: Calendar, defaultLabel: "Date Field", placeholder: "" },
  { type: "time", label: "Time", icon: Clock, defaultLabel: "Time Field", placeholder: "" },
];
const META = Object.fromEntries(FIELD_TYPES.map((f) => [f.type, f]));

// Web field type → backend enum (only "phone" differs → "tel").
const toBackendType = (t: string) => (t === "phone" ? "tel" : t);

interface Field {
  id: number;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
}

/* ── Toggle ────────────────────────────────────────────────────── */
const Toggle: React.FC<{ on: boolean; onClick: () => void }> = ({ on, onClick }) => (
  <button onClick={onClick} className={`w-11 h-6 rounded-full p-0.5 transition-colors flex-shrink-0 ${on ? "bg-emerald-500" : "bg-gray-300"}`}>
    <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : ""}`} />
  </button>
);

/* ── Sortable field card ───────────────────────────────────────── */
interface CardProps {
  field: Field;
  index: number;
  count: number;
  selected: boolean;
  onSelect: (id: number) => void;
  onMove: (id: number, dir: -1 | 1) => void;
  onRemove: (id: number) => void;
  onUpdate: (id: number, patch: Partial<Field>) => void;
}
const SortableFieldCard: React.FC<CardProps> = ({ field: f, index: i, count, selected, onSelect, onMove, onRemove, onUpdate }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: f.id });
  const m = META[f.type];
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(f.id)}
      className={`rounded-xl border p-5 cursor-pointer transition-colors bg-white ${selected ? "border-emerald-400 ring-1 ring-emerald-400" : "border-gray-200 hover:border-gray-300"}`}
    >
      {/* card header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="w-6 h-9 flex items-center justify-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><m.icon className="w-4 h-4" /></span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">Field {i + 1}</span>
              {f.required && <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-semibold">Required</span>}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
          </div>
        </div>
        {selected && (
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onMove(f.id, -1); }} disabled={i === 0} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onMove(f.id, 1); }} disabled={i === count - 1} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onRemove(f.id); }} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {/* card body */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end mt-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Field Label</label>
          <input value={f.label} onClick={(e) => e.stopPropagation()} onChange={(e) => onUpdate(f.id, { label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder Text</label>
          <input value={f.placeholder} onClick={(e) => e.stopPropagation()} onChange={(e) => onUpdate(f.id, { placeholder: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <span className="text-sm text-gray-600">Required</span>
          <Toggle on={f.required} onClick={() => onUpdate(f.id, { required: !f.required })} />
        </div>
      </div>
    </div>
  );
};

/* ── Component ──────────────────────────────────────────────────── */
const FormBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [formName, setFormName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [layout, setLayout] = useState("Single Column");
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nextId, setNextId] = useState(1);
  const [saving, setSaving] = useState(false);

  const requiredCount = fields.filter((f) => f.required).length;
  const typeCount = (type: string) => fields.filter((f) => f.type === type).length;

  const addField = (type: string) => {
    const m = META[type];
    const id = nextId;
    setFields((f) => [...f, { id, type, label: m.defaultLabel, placeholder: m.placeholder, required: false }]);
    setNextId((n) => n + 1);
    setSelectedId(id);
  };
  const update = (id: number, patch: Partial<Field>) => setFields((f) => f.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id: number) => { setFields((f) => f.filter((x) => x.id !== id)); if (selectedId === id) setSelectedId(null); };
  const move = (id: number, dir: -1 | 1) => setFields((f) => {
    const i = f.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= f.length) return f;
    const copy = [...f];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setFields((f) => {
        const oldI = f.findIndex((x) => x.id === active.id);
        const newI = f.findIndex((x) => x.id === over.id);
        return oldI < 0 || newI < 0 ? f : arrayMove(f, oldI, newI);
      });
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) { showToast("Please enter a form name", "info"); return; }
    if (fields.length === 0) { showToast("Add at least one field to the form", "info"); return; }
    setSaving(true);
    try {
      await api.post("/form-builder/forms/create", {
        name: formName.trim(),
        is_active: enabled,
        default_layout: layout === "Two Columns" ? "two-column" : "single",
        fields: fields.map((f, i) => ({
          label: f.label,
          type: toBackendType(f.type),
          required: f.required,
          placeholder: f.placeholder,
          options: [],
          order: i,
        })),
      });
      showToast("Form saved successfully!", "success");
      setFields([]);
      setFormName("");
      setSelectedId(null);
    } catch {
      showToast("Could not save the form", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[#FAFBFC]">
      {/* header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div>
          <div className="text-xs text-gray-400">Dashboard <span className="mx-1">›</span> Form Builder <span className="mx-1">›</span> <span className="text-gray-700 font-medium">Create</span></div>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">Form Builder</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="px-5 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>

      {/* body */}
      <div className="px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 items-start">
        {/* ════════ LEFT COLUMN ════════ */}
        <div className="space-y-6">
          {/* Form Configuration */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Settings className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Form Configuration</h2>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1.5">Form Name <span className="text-red-500">*</span></label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Enter form name"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-5" />

            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-medium text-gray-700">Enable Form</span>
              <Toggle on={enabled} onClick={() => setEnabled((v) => !v)} />
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Layout</label>
            <div className="relative">
              <select value={layout} onChange={(e) => setLayout(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 appearance-none focus:outline-none focus:ring-1 focus:ring-emerald-500">
                <option>Single Column</option>
                <option>Two Columns</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="mt-5 pt-5 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Form Statistics</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                  <div className="text-xl font-bold text-blue-700">{fields.length}</div>
                  <div className="text-xs text-blue-600">Fields</div>
                </div>
                <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
                  <div className="text-xl font-bold text-green-700">{requiredCount}</div>
                  <div className="text-xs text-green-600">Required</div>
                </div>
              </div>
            </div>
          </div>

          {/* Available Field Types */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Available Field Types</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {FIELD_TYPES.map((ft) => {
                const count = typeCount(ft.type);
                return (
                  <button key={ft.type} onClick={() => addField(ft.type)}
                    className="relative flex flex-col items-center justify-center gap-2 py-4 border border-gray-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors">
                    {count > 0 && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-semibold flex items-center justify-center">{count}</span>
                    )}
                    <ft.icon className="w-5 h-5 text-gray-500" />
                    <span className="text-xs font-medium text-gray-700 text-center">{ft.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════════ RIGHT COLUMN — Form Preview ════════ */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">Form Preview</h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600">{fields.length} fields</span>
          </div>

          {fields.length === 0 ? (
            /* empty state */
            <div className="border-2 border-dashed border-gray-300 rounded-xl py-16 flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center"><Plus className="w-7 h-7 text-gray-400" /></div>
              <h3 className="mt-5 text-lg font-bold text-gray-900">Start Building Your Form</h3>
              <p className="mt-1.5 text-sm text-gray-500">Click on any field type from the sidebar to add it to your form</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Easy Setup</span>
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Click to Add</span>
              </div>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {fields.map((f, i) => (
                    <SortableFieldCard
                      key={f.id}
                      field={f}
                      index={i}
                      count={fields.length}
                      selected={selectedId === f.id}
                      onSelect={setSelectedId}
                      onMove={move}
                      onRemove={remove}
                      onUpdate={update}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;
