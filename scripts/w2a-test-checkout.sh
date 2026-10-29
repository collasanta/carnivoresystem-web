#!/usr/bin/env bash
# Real-money smoke test of the web2app checkout (production Asaas key) on a Vercel deployment.
# Asks for the CPF on screen (not saved, not in shell history), creates a lead, then a Pix charge
# (prints copia-e-cola) and a card charge (prints the Asaas invoice link).
# Usage: bash scripts/w2a-test-checkout.sh https://leodiet.com (or a https://<deployment>.vercel.app preview) [plan: quarterly|annual|lifetime]
set -uo pipefail
cd "$(dirname "$0")/.."
U=${1:?deployment URL}; PLAN=${2:-quarterly}
read -rsp "CPF do pagador: " CPF; echo
call() { # vercel curl gets past the Vercel auth of preview deployments; the public domain needs plain curl
  if [[ $U == *.vercel.app* ]]; then vercel curl "$1" --deployment "$U" -- -s -X POST -H 'content-type: application/json' -d "$2" 2>/dev/null
  else curl -s -X POST "$U$1" -H 'content-type: application/json' -d "$2"; fi; }
call /api/w2a/lead '{}' >/dev/null # first call only sets the Vercel auth bypass cookie
LEAD=$(call /api/w2a/lead '{"email":"w2a-teste@leodiet.com","name":"Teste W2A","quizVersion":"pt-v2"}' |
  python3 -c 'import sys,json;print(json.load(sys.stdin).get("leadId",""))')
[ -n "$LEAD" ] || { echo "falhou ao criar o lead"; exit 1; }
for m in pix card; do
  echo "== $m ($PLAN)"
  call /api/w2a/checkout "{\"plan\":\"$PLAN\",\"leadId\":\"$LEAD\",\"method\":\"$m\",\"cpf\":\"$CPF\"}" | python3 -c '
import sys,json
d=json.load(sys.stdin); a=d.get("action") or {}
if "error" in d: print("erro:", d["error"]); sys.exit()
print("purchaseId:", d["purchaseId"], "| asaas:", a.get("providerRef"), "| test:", d.get("test"))
print("pix copia-e-cola:", a["copyPaste"]) if a.get("kind")=="pix" else print("link do cartão:", a.get("url"))'
done
