import { PageFrame } from "@/components/page-frame";
import { pageTitle } from "@/lib/ui";

export default function RegistrationNotFound() {
  return <PageFrame><section><h1 className={pageTitle}>Este evento no está disponible para registro</h1><p className="mt-4 text-[#4f5d56]">El enlace puede ser incorrecto, el evento puede no estar publicado o su fecha puede haber pasado.</p></section></PageFrame>;
}
