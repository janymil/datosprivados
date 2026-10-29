import Link from "next/link";
import type { DataBank } from "@/lib/db";
import { Field } from "@/components/ui";

const LEGAL_BASIS = [
  ["consentimiento", "Consentimiento del titular"],
  ["ejecucion_contrato", "Ejecución de contrato"],
  ["obligacion_legal", "Obligación legal"],
  ["interes_legitimo", "Interés legítimo"],
  ["interes_publico", "Interés público"],
];

const CHANNELS = [
  "Web",
  "WhatsApp",
  "Correo electrónico",
  "Presencial",
  "Teléfono",
  "Aplicación móvil",
];

export function BankForm({
  bank,
  action,
}: {
  bank?: DataBank;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="space-y-6">
      {bank && <input type="hidden" name="id" value={bank.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre del banco de datos" className="sm:col-span-2">
          <input
            name="name"
            required
            defaultValue={bank?.name}
            className="input"
            placeholder="Clientes de la tienda online"
          />
        </Field>

        <Field
          label="Finalidad"
          className="sm:col-span-2"
          hint="Para qué usas estos datos. Sé específico: «gestión de pedidos, entregas y posventa»."
        >
          <textarea
            name="purpose"
            rows={3}
            defaultValue={bank?.purpose}
            className="input resize-y"
            placeholder="Gestión de pedidos, entregas, facturación y atención posventa."
          />
        </Field>

        <Field
          label="Categorías de datos"
          className="sm:col-span-2"
          hint="Separa con comas. Incluye datos sensibles si los hubiera (salud, biometría, etc.)."
        >
          <textarea
            name="data_categories"
            rows={3}
            defaultValue={bank?.data_categories}
            className="input resize-y"
            placeholder="Nombres, DNI, dirección, correo, teléfono, historial de compras."
          />
        </Field>

        <Field label="Base legal">
          <select name="legal_basis" className="input" defaultValue={bank?.legal_basis ?? "consentimiento"}>
            {LEGAL_BASIS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Canal de recolección">
          <select name="channel" className="input" defaultValue={bank?.channel ?? "Web"}>
            {CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Plazo de conservación">
          <input
            name="retention"
            defaultValue={bank?.retention}
            className="input"
            placeholder="5 años desde la última compra"
          />
        </Field>

        <Field label="Transferencias internacionales">
          <select name="transfers" className="input" defaultValue={bank?.transfers ?? "no"}>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </Field>

        <Field
          label="Destinatarios o encargados"
          className="sm:col-span-2"
          hint="Proveedores que tratan datos por encargo: courier, pasarela de pagos, contabilidad, etc."
        >
          <input
            name="recipients"
            defaultValue={bank?.recipients}
            className="input"
            placeholder="Courier, pasarela de pagos, estudio contable"
          />
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Link href={bank ? `/app/bancos/${bank.id}` : "/app/bancos"} className="btn btn-ghost">
          Cancelar
        </Link>
        <button type="submit" className="btn btn-primary">
          {bank ? "Guardar cambios" : "Guardar borrador"}
        </button>
      </div>
    </form>
  );
}
