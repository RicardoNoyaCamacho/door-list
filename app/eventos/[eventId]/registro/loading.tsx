import { PageFrame } from "@/components/page-frame";

export default function LoadingRegistration() {
  return <PageFrame><p role="status" aria-busy="true" className="py-12 text-[#4f5d56]">Cargando el evento y las entradas disponibles…</p></PageFrame>;
}
