import type {
  BillingArtifact,
  BillingArtifactKind,
  BillingDocumentSnapshot,
  BillingProvider,
  BillingProviderResult,
} from "../domain/billing-provider";
import { validateBillingSnapshot } from "../domain/billing.rules";

export class MockBillingProvider implements BillingProvider {
  readonly name = "MOCK";
  readonly capabilities = {
    lookupByReference: true,
    creditNotes: false,
    artifacts: [] as BillingArtifactKind[],
  };

  private readonly documents = new Map<string, BillingProviderResult>();

  async issue(snapshot: BillingDocumentSnapshot): Promise<BillingProviderResult> {
    validateBillingSnapshot(snapshot);
    const previous = this.documents.get(snapshot.referenceCode);
    if (previous) return previous;

    const result: BillingProviderResult = {
      outcome: "PROCESSING",
      providerDocumentId: `mock:${snapshot.referenceCode}`,
      providerStatus: "SIMULATED_NOT_FISCALLY_VALID",
      message: "Simulated document. It is not an electronic invoice accepted by DIAN.",
    };
    this.documents.set(snapshot.referenceCode, result);
    return result;
  }

  async findByReference(referenceCode: string) {
    return this.documents.get(referenceCode) ?? null;
  }

  async getArtifact(_documentNumber: string, _kind: BillingArtifactKind): Promise<BillingArtifact | null> {
    return null;
  }
}
