import type { Metadata } from "next";
import ComingSoon from "@/components/hub/ComingSoon";

export const metadata: Metadata = { title: "Pulse Field — Political Dark Matter" };

export default function PulseFieldPage() {
  return (
    <ComingSoon
      name="Pulse Field"
      tagline="Emisja"
      logo="/modules/pulse-field.png"
      description="Własne medium jako centrum pola i silnik dystrybucji AI do świata zewnętrznego. Efekt każdej emisji wraca do ekosystemu jako nowy sygnał — pętla się zamyka."
      startsAround="Tydzień 3–4 harmonogramu wdrożenia"
      accent="bg-fuchsia-600"
    />
  );
}
