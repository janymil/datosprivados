"use client";

import { useState } from "react";
import { respondArcoAction } from "@/app/actions/arco";

const TEMPLATES: Record<string, (name: string, company: string) => string> = {
  acceso: (name, company) =>
    `Estimado(a) ${name}:\n\nEn atención a su solicitud de acceso, le informamos que ${company} trata los siguientes datos personales suyos: [detallar categorías], con la finalidad de [finalidad], conservados por [plazo].\n\nPuede solicitar la copia de sus datos respondiendo a este correo. Atenderemos su pedido dentro del plazo legal.\n\nAtentamente,\n${company}`,
  rectificacion: (name, company) =>
    `Estimado(a) ${name}:\n\nHemos recibido su solicitud de rectificación. Tras verificar la información, procedimos a corregir [dato corregido] en nuestros registros con fecha [fecha].\n\nSi la información no corresponde a lo solicitado, le pediremos la documentación de sustento dentro del plazo legal.\n\nAtentamente,\n${company}`,
  cancelacion: (name, company) =>
    `Estimado(a) ${name}:\n\nEn atención a su solicitud de cancelación, le informamos que hemos eliminado sus datos personales de [banco de datos], salvo aquellos que debemos conservar por obligación legal o contractual por el plazo de [plazo].\n\nPuede solicitar mayor detalle respondiendo a este correo.\n\nAtentamente,\n${company}`,
  oposicion: (name, company) =>
    `Estimado(a) ${name}:\n\nHemos atendido su solicitud de oposición. Sus datos ya no serán tratados para [finalidad objetada] a partir de la fecha. Los tratamientos necesarios para la ejecución del contrato o por obligación legal se mantienen vigentes.\n\nAtentamente,\n${company}`,
};

export function ArcoResponseForm({
  id,
  companyName,
  requesterName,
  type,
  response,
  status,
}: {
  id: string;
  companyName: string;
  requesterName: string;
  type: string;
  response: string | null;
  status: string;
}) {
  const [text, setText] = useState(response ?? "");
  const template = TEMPLATES[type]?.(requesterName, companyName) ?? "";

  return (
    <form action={respondArcoAction} className="space-y-4">
      <input type="hidden" name="id" value={id} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setText(template)}
          className="btn btn-ghost btn-sm"
        >
          Usar plantilla de respuesta
        </button>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
          {text.length} caracteres
        </span>
      </div>

      <textarea
        name="response"
        rows={10}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="input resize-y font-sans leading-relaxed"
        placeholder="Escribe aquí la respuesta que se enviará al titular. Quedará archivada como evidencia."
      />

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[42ch] text-[11px] leading-snug text-ink-soft">
          Al marcar como respondida, se registra la fecha de cierre. Envía la respuesta por el mismo
          canal en que recibiste la solicitud.
        </p>
        <div className="flex gap-2">
          <button
            type="submit"
            name="status"
            value="en_proceso"
            className="btn btn-ghost btn-sm"
            disabled={!text.trim()}
          >
            Guardar borrador
          </button>
          <button
            type="submit"
            name="status"
            value="respondido"
            className="btn btn-primary btn-sm"
            disabled={!text.trim()}
          >
            {status === "respondido" ? "Actualizar respuesta" : "Marcar como respondida"}
          </button>
        </div>
      </div>
    </form>
  );
}
