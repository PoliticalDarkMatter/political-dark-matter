import type { Metadata } from "next";
import OrbitHub from "@/components/hub/OrbitHub";

export const metadata: Metadata = {
  title: "IMPACT CENTER",
  description: "Cztery autonomiczne moduły. Jeden ekosystem.",
};

export default function Home() {
  return <OrbitHub />;
}
