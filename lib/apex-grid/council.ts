// ── Warstwa 3: Narada (Konsylium) ──────────────────────────────────────
// To jest INTEGRACJA z modułem Konsylium, nie jego kopia: reużywamy
// profile ekspertów (lib/consilium/experts.ts), budowę promptu per ekspert
// (lib/consilium/prompts.ts) i walidację opinii (lib/consilium/validate.ts).
// Różnice względem samodzielnego Konsylium:
//   1. Skład narady jest dobierany per produkt (products.ts), nie zawsze 10 —
//      narada jest tu jedną z pięciu warstw pipeline'u, a każdy dodatkowy
//      ekspert to jedno równoległe wywołanie AI w budżecie czasowym route'a.
//   2. Eksperci dostają w "researchu" połączony digest Sygnału (Narrative
//      Scope) i Gruntu (e-wyborcy) — czyli więcej niż w samodzielnym
//      Konsylium, które robi tylko własny research medialny.
//   3. Nie ma tu syntezy Konsylium — syntezą w Apex Grid są warstwy
//      Scenariusze i Decyzja (orchestrator.ts).

import type { AIProvider } from "@/lib/reaction-simulator/ai-provider";
import { CONSILIUM_EXPERTS, type ExpertProfile } from "@/lib/consilium/experts";
import { mockExpertOpinion } from "@/lib/consilium/mock-generators";
import { buildExpertPrompt } from "@/lib/consilium/prompts";
import type { ConsiliumInput, ExpertId, ExpertOpinion, ResearchContext } from "@/lib/consilium/types";
import { extractJson, validateExpertOpinion } from "@/lib/consilium/validate";
import { getProduct } from "./products";
import type { ApexInput, ApexProduct, CouncilContext, GroundContext, SignalContext } from "./types";

// Mapowanie produktu Apex Grid na tryb Konsylium — tryb steruje akcentem
// w promptach ekspertów (patrz lib/consilium/modes.ts), więc dobieramy
// najbliższy odpowiednik zamiast neutralnego domyślnego.
const PRODUCT_TO_MODE: Record<ApexProduct, ConsiliumInput["mode"]> = {
  sdp: "strategia",
  brief: "wypowiedz_medialna",
  kryzys: "kryzys",
};

function toConsiliumInput(input: ApexInput): ConsiliumInput {
  return {
    topic: input.topic,
    context: input.context,
    politicalGoal: input.politicalGoal,
    targetAudience: input.targetAudience,
    mode: PRODUCT_TO_MODE[input.product],
  };
}

// Eksperci Konsylium znają kontrakt ResearchContext — składamy go z dwóch
// warstw Apex Grid, żeby narada widziała i media, i twarde dane o grupach.
function toResearchContext(signal: SignalContext, ground: GroundContext): ResearchContext {
  return {
    query: signal.query,
    hasRealData: signal.hasRealData || ground.hasData,
    sources: signal.sources,
    digest: `${signal.digest}\n\n${ground.digest}`,
    totalFound: signal.totalFound,
  };
}

// Digest narady dla warstw Scenariusze/Decyzja — ta sama kondensacja co
// digestForSynthesis w lib/consilium/orchestrator.ts (funkcja nie jest
// stamtąd eksportowana; kształt utrzymujemy zgodny świadomie).
function digestOpinions(opinions: ExpertOpinion[]): string {
  return opinions
    .map((o) => {
      const lines = [
        `── ${o.expertName} (pewność: ${o.confidence}) ──`,
        `Stanowisko: ${o.headline}`,
        o.diagnosis && `Diagnoza: ${o.diagnosis}`,
        o.risks.length > 0 && `Ryzyka: ${o.risks.join("; ")}`,
        o.opportunities.length > 0 && `Szanse: ${o.opportunities.join("; ")}`,
        o.recommendations.length > 0 && `Rekomendacje: ${o.recommendations.join("; ")}`,
        o.thingsNotToSay.length > 0 && `Czego nie mówić: ${o.thingsNotToSay.join("; ")}`,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");
}

export async function runCouncil(
  input: ApexInput,
  signal: SignalContext,
  ground: GroundContext,
  provider: AIProvider,
  onProgress: (done: number, total: number) => void
): Promise<CouncilContext> {
  const product = getProduct(input.product);
  const roster = product.councilRoster;
  const experts: ExpertProfile[] = roster
    .map((id) => CONSILIUM_EXPERTS.find((e) => e.id === id))
    .filter((e): e is ExpertProfile => Boolean(e));

  const consiliumInput = toConsiliumInput(input);
  const research = toResearchContext(signal, ground);
  const usedFallback: ExpertId[] = [];
  let done = 0;

  async function runExpert(expert: ExpertProfile): Promise<ExpertOpinion> {
    const prompt = buildExpertPrompt(expert, consiliumInput, research);
    const raw = provider.isReal ? await provider.generateText(prompt, { maxTokens: 2200 }) : null;
    const parsed = extractJson(raw);
    const validated = parsed ? validateExpertOpinion(parsed, expert.id, expert.name) : null;
    done += 1;
    onProgress(done, experts.length);
    if (validated) return validated;
    usedFallback.push(expert.id);
    return mockExpertOpinion(expert, consiliumInput);
  }

  const opinions = await Promise.all(experts.map(runExpert));

  return {
    roster,
    opinions,
    usedFallback,
    digest: digestOpinions(opinions),
  };
}
