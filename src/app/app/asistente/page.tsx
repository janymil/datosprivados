import { requireSession } from "@/lib/auth";
import { listBanks, listDocuments, listIncidents, listRequests } from "@/lib/data";
import { computeCompliance } from "@/lib/compliance";
import { AiChatAssistant } from "@/components/ai-chat-assistant";
import { aiMode } from "@/lib/ai";
import { PageHeader, StatusPill } from "@/components/ui";
import { Term } from "@/components/help";

export const metadata = { title: "Asistente Legal" };

export default async function AiAssistantPage() {
  const { company } = await requireSession();
  const banks = listBanks(company.id);
  const requests = listRequests(company.id);
  const incidents = listIncidents(company.id);
  const documents = listDocuments(company.id);
  const compliance = computeCompliance({ company, banks, requests, incidents, documents });

  const isPro = company.plan === "pro";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Asistente Legal"
        description={
          <>
            Pregunta cualquier duda sobre la <Term k="ley29733">Ley 29733</Term> y el reglamento{" "}
            <Term k="ds016">DS 016-2024-JUS</Term>, o pídele que redacte cartas, respuestas{" "}
            <Term k="arco">ARCO</Term>, correos y cláusulas para <strong>{company.name}</strong>.
          </>
        }
        actions={
          <StatusPill tone="ok">
            Plan {isPro ? "Pro" : "Básico"}
          </StatusPill>
        }
      />

      {/* Main Embedded Chat Assistant (Available in BOTH Básico and Pro) */}
      <section aria-label="Chat Asistente Legal">
        <AiChatAssistant
          companyName={company.name}
          companyRuc={company.ruc}
          companyPlan={company.plan}
          complianceScore={compliance.score}
          mode={aiMode()}
          embedded
        />
      </section>
    </div>
  );
}
