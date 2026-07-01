import type { Metadata } from "next";
import ComingSoon from "@/components/hub/ComingSoon";

export const metadata: Metadata = { title: "Apex Grid — Political Dark Matter" };

export default function ApexGridPage() {
  return (
    <ComingSoon
      name="Apex Grid"
      tagline="Analiza"
      logo="/modules/apex-grid.png"
      description="Warstwa myślenia ekosystemu. Przetwarza sygnały z Narrative Scope w scenariusze, ocenę ryzyka i jednoznaczną rekomendację strategiczną."
      startsAround="Tydzień 2 harmonogramu wdrożenia"
      accent="bg-indigo-600"
    />
  );
}
