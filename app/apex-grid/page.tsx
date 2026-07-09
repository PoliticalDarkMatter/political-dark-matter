import type { Metadata } from "next";
import { ApexGridClient } from "@/components/apex-grid/ApexGridClient";

export const metadata: Metadata = { title: "Apex Grid — Political Dark Matter" };

// Apex Grid — moduł analizy strategicznej (warstwa druga ekosystemu).
// Server component tylko dla metadata; cała logika w ApexGridClient.
export default function ApexGridPage() {
  return <ApexGridClient />;
}
