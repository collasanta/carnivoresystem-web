import { Paywall } from "@/components/w2a/paywall";
import { providerInfo } from "@/lib/web2app/payments";

// the active payment provider (methods, CPF) comes from env at request time
export const dynamic = "force-dynamic";

export default function OfferPage() {
  return <Paywall provider={providerInfo()} />;
}
