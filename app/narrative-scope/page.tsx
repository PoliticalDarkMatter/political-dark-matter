import type { Metadata } from "next";
import NarrativeScopeHub from "@/components/hub/NarrativeScopeHub";

export const metadata: Metadata = {
  title: "Narrative Scope — Political Dark Matter",
  description: "Analiza post factum, symulator reakcji na słowa, symulator reakcji na obraz.",
};

export default function NarrativeScopeHubPage() {
  return <NarrativeScopeHub />;
}
