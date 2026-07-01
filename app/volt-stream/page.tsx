import type { Metadata } from "next";
import ComingSoon from "@/components/hub/ComingSoon";

export const metadata: Metadata = { title: "Volt Stream — Political Dark Matter" };

export default function VoltStreamPage() {
  return (
    <ComingSoon
      name="Volt Stream"
      tagline="Przekaz"
      logo="/modules/volt-stream.png"
      description="Warstwa emisji ekosystemu. Zamienia strategię w komunikację skalibrowaną pod konkretny głos, elektorat i przeciwników — talking pointy, odpowiedzi na ataki, gotowe materiały."
      startsAround="Tydzień 2–3 harmonogramu wdrożenia"
      accent="bg-blue-600"
    />
  );
}
