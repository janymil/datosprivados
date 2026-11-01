import { LegalPage, legalMetadata } from "@/components/legal-page";

export const metadata = legalMetadata("cookies");

export default function Page() {
  return <LegalPage document="cookies" />;
}
