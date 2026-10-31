"use client";

import { useMemo, useState } from "react";
import { COUNTRIES, TOOL_CATEGORIES, categoriesFor, isAbroad, type ToolCategory } from "@/lib/provider-catalog";
import type { LegalFamily } from "@/lib/sector-legal";
import { CheckIcon } from "@/components/icons";

export type PickedTool = { category: string; name: string; country: string; custom: boolean };

const keyOf = (category: string, name: string) => `${category}::${name.trim().toLowerCase()}`;

/**
 * Selector de herramientas por categoría. Cada categoría muestra las
 * herramientas más comunes como casillas; el dueño marca las que usa, corrige el
 * país donde se guardan sus datos y, si la suya no está, la escribe.
 * Envía la lista como JSON en el campo oculto `name`.
 */
export function ToolsPicker({
  family,
  initial,
  initialWeb,
  name = "tools",
}: {
  family: LegalFamily;
  initial: PickedTool[];
  initialWeb: boolean;
  name?: string;
}) {
  const [hasWeb, setHasWeb] = useState(initialWeb || initial.some((tool) => isWebCategory(tool.category)));
  const [picked, setPicked] = useState<Map<string, PickedTool>>(
    () => new Map(initial.map((tool) => [keyOf(tool.category, tool.name), tool]))
  );

  const groups = useMemo(() => categoriesFor(family, hasWeb), [family, hasWeb]);

  function toggle(category: ToolCategory, toolName: string, country: string) {
    setPicked((current) => {
      const next = new Map(current);
      const key = keyOf(category.id, toolName);
      if (next.has(key)) next.delete(key);
      else next.set(key, { category: category.id, name: toolName, country, custom: false });
      return next;
    });
  }

  function setCountry(key: string, country: string) {
    setPicked((current) => {
      const next = new Map(current);
      const item = next.get(key);
      if (item) next.set(key, { ...item, country });
      return next;
    });
  }

  function addCustom(categoryId: string, toolName: string, country: string) {
    const clean = toolName.trim();
    if (!clean) return;
    setPicked((current) => {
      const next = new Map(current);
      next.set(keyOf(categoryId, clean), { category: categoryId, name: clean, country, custom: true });
      return next;
    });
  }

  function remove(key: string) {
    setPicked((current) => {
      const next = new Map(current);
      next.delete(key);
      return next;
    });
  }

  const list = Array.from(picked.values());
  const abroad = list.filter((tool) => isAbroad(tool.country));

  return (
    <div className="space-y-6">
      <input type="hidden" name={name} value={JSON.stringify(list)} />

      <label className="flex cursor-pointer items-start gap-3 border border-line bg-paper px-4 py-3.5">
        <input
          type="checkbox"
          checked={hasWeb}
          onChange={(event) => setHasWeb(event.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span className="text-[15.5px]">
          <strong>Tengo sitio web, tienda online o app.</strong>
          <span className="block text-sm text-ink-soft">Así te mostramos también hosting, login, analítica y publicidad.</span>
        </span>
      </label>

      {groups.forYou.length > 0 && (
        <Section title="Para tu tipo de negocio" categories={groups.forYou} {...{ picked, toggle, setCountry, addCustom, remove }} />
      )}
      <Section title="Lo que usa casi todo negocio" categories={groups.general} {...{ picked, toggle, setCountry, addCustom, remove }} />
      {groups.web.length > 0 && (
        <Section title="Tu web o app" categories={groups.web} {...{ picked, toggle, setCountry, addCustom, remove }} />
      )}
      {groups.more.length > 0 && (
        <details className="border border-line bg-paper-2">
          <summary className="cursor-pointer px-4 py-3 text-[15.5px] font-medium">
            Más categorías ({groups.more.length})
          </summary>
          <div className="px-4 pb-4">
            <Section title="" categories={groups.more} {...{ picked, toggle, setCountry, addCustom, remove }} />
          </div>
        </details>
      )}

      <div className="border-l-3 border-sage bg-sage/[0.08] px-4 py-3 text-[15px] leading-relaxed">
        {list.length === 0 ? (
          <>No marcaste ninguna herramienta. Si de verdad no usas ninguna fuera de tu local, puedes continuar.</>
        ) : (
          <>
            Marcaste <strong>{list.length}</strong> {list.length === 1 ? "herramienta" : "herramientas"}.{" "}
            {abroad.length > 0 ? (
              <>
                <strong>{abroad.length}</strong> {abroad.length === 1 ? "guarda" : "guardan"} datos fuera del Perú o en un
                país por verificar: eso es una <strong>transferencia internacional</strong> y se informa en tu política y a
                la ANPD. Te guiamos después.
              </>
            ) : (
              <>Todas guardan los datos en el Perú.</>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function isWebCategory(id: string) {
  return Boolean(TOOL_CATEGORIES.find((category) => category.id === id)?.web);
}

type SectionProps = {
  title: string;
  categories: ToolCategory[];
  picked: Map<string, PickedTool>;
  toggle: (category: ToolCategory, name: string, country: string) => void;
  setCountry: (key: string, country: string) => void;
  addCustom: (categoryId: string, name: string, country: string) => void;
  remove: (key: string) => void;
};

function Section({ title, categories, picked, toggle, setCountry, addCustom, remove }: SectionProps) {
  return (
    <section className="space-y-5">
      {title && <p className="label-mono">{title}</p>}
      {categories.map((category) => (
        <CategoryBlock key={category.id} {...{ category, picked, toggle, setCountry, addCustom, remove }} />
      ))}
    </section>
  );
}

function CategoryBlock({
  category,
  picked,
  toggle,
  setCountry,
  addCustom,
  remove,
}: Omit<SectionProps, "title" | "categories"> & { category: ToolCategory }) {
  const [customName, setCustomName] = useState("");
  const [customCountry, setCustomCountry] = useState("No sé");
  const catalogNames = new Set(category.tools.map((tool) => tool.name.toLowerCase()));
  const customs = Array.from(picked.values()).filter(
    (tool) => tool.category === category.id && !catalogNames.has(tool.name.toLowerCase())
  );
  const selectedHere = Array.from(picked.entries()).filter(([, tool]) => tool.category === category.id);

  return (
    <div className="border border-line bg-paper p-4">
      <p className="text-base font-medium">{category.question}</p>
      {category.hint && <p className="mt-0.5 text-sm text-ink-soft">{category.hint}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {category.tools.map((tool) => {
          const key = keyOf(category.id, tool.name);
          const on = picked.has(key);
          return (
            <button
              key={tool.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(category, tool.name, tool.country)}
              className={`flex items-center gap-2 border px-3 py-2 text-left text-[15px] transition-colors ${
                on ? "border-ink bg-ink text-paper" : "border-line-strong bg-paper hover:border-ink"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                  on ? "border-paper" : "border-line-strong"
                }`}
                aria-hidden="true"
              >
                {on && <CheckIcon className="h-3 w-3" />}
              </span>
              {tool.name}
            </button>
          );
        })}
      </div>

      {selectedHere.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {selectedHere.map(([key, tool]) => {
            const out = isAbroad(tool.country);
            return (
              <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 text-[15px]">
                <span className="min-w-0 flex-1 font-medium">
                  {tool.name}
                  {tool.custom && <span className="ml-2 text-xs font-normal text-ink-soft">(escrita por ti)</span>}
                </span>
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  Datos guardados en
                  <select
                    value={tool.country}
                    onChange={(event) => setCountry(key, event.target.value)}
                    className="input !h-9 !py-1 text-[14.5px]"
                    aria-label={`País de ${tool.name}`}
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </label>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    out ? "bg-ochre/15 text-ink" : "bg-sage/15 text-ink"
                  }`}
                >
                  {out ? "Sale del Perú" : "En el Perú"}
                </span>
                {tool.custom && (
                  <button type="button" onClick={() => remove(key)} className="text-sm text-ink-soft underline">
                    Quitar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
        <label className="min-w-[200px] flex-1 text-sm text-ink-soft">
          ¿Usas otra que no está en la lista? Escríbela
          <input
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustom(category.id, customName, customCountry);
                setCustomName("");
              }
            }}
            className="input mt-1"
            placeholder="Nombre de la herramienta"
            maxLength={80}
          />
        </label>
        <label className="text-sm text-ink-soft">
          País
          <select value={customCountry} onChange={(event) => setCustomCountry(event.target.value)} className="input mt-1">
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={!customName.trim()}
          onClick={() => {
            addCustom(category.id, customName, customCountry);
            setCustomName("");
          }}
        >
          Agregar
        </button>
      </div>
      {customs.length === 0 && selectedHere.length === 0 && (
        <p className="mt-2 text-xs text-ink-soft">Si no usas nada de esto, déjalo sin marcar.</p>
      )}
    </div>
  );
}
