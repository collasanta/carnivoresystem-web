import { Suspense } from "react";
import { Success } from "@/components/w2a/success";
import { providerInfo } from "@/lib/web2app/payments";

// the guide's success page carries the app upsell checkout: the active payment provider comes from env at request time
export const dynamic = "force-dynamic";

export default function SuccessPage() {
  return (
    <Suspense>
      <Success provider={providerInfo()} />
    </Suspense>
  );
}
