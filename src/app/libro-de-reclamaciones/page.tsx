import { redirect } from "next/navigation";
import { PLATFORM_COMPLAINTS_URL } from "@/lib/platform-legal";

/** El Libro de Reclamaciones oficial está en LibroDigital.pe; esta ruta solo redirige. */
export default function ComplaintsBookRedirect() {
  redirect(PLATFORM_COMPLAINTS_URL);
}
