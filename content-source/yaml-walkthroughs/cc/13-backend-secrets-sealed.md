---
title: "Sealed Secret for backend-credentials (DB, JWT, etc.)"
source: chas-challenge
sourceLabel: "Chas Challenge — Backend Secrets (Sealed)"
chapterId: 12
filename: "13-backend-secrets-sealed.yaml"
---

# Varför

Backend-appen behover en DB-connection-string och en JWT-signeringsnyckel for att kunna prata med Postgres och utfarda tokens. Dessa far ALDRIG ligga i klartext i Git. Giacomo visade hur man wrappar dem i en SealedSecret — krypterad med kluster-controllerns publika nyckel, sa det bara ar exakt detta kluster som kan dekryptera. Samma monster som gitlab-registry-sealed, fast for app-hemligheter istallet for registry-credentials.

# API-version och kind

SealedSecret ar inte en inbyggd K8s-resurs — den kommer fran Bitnamis sealed-secrets-controller (rad 2-3). Kontrollern maste vara installerad i klustret, annars hander ingenting nar du applyar. Den lyssnar pa SealedSecret-objekt och producerar en vanlig Secret med samma namn nar dekrypteringen lyckas.

# Metadata — name + namespace lasta i kryptot

Name och namespace (rad 4-6) ar inte bara etiketter — de ar inbakade i krypteringen. Om du flyttar manifesten till en annan namespace eller doper om den sa fungerar inte dekrypteringen langre. Det ar designat sa for att ingen ska kunna kopiera filen till sin egen namespace och fa ut hemligheterna. Fallgrop: bytte du fran doe25-group-10 till nagot annat sa maste du seala om fran scratch.

# encryptedData — sjalva nyttolasten

Under encryptedData ligger tva nycklar: ConnectionStrings__DefaultConnection och Jwt__Key (rad 8-10). Dubbla underscoresen ar .NET-konvention — de mappas till nested JSON i appsettings (ConnectionStrings:DefaultConnection). Vardena ar base64-strangar krypterade med klustrets publika nyckel via kubeseal-CLI. Bara controllern, med privata nyckeln, kan oppna dem.

# Template — vad Secret-objektet far for metadata

Template-blocket (rad 11-14) styr hur den faktiska Secret-resursen ska se ut nar controllern producerar den. Name och namespace mappas en-till-en. Du kan ocksa lagga in labels och annotations har om du vill — t.ex. om en annan operator behover hitta secreten. Saknar du template far du andocka en Secret med samma namn som SealedSecret, vilket ar det vi vill ha har.

# Hur backend hamtar varderna

Backend-deployment refererar inte till individuella keys — den anvander envFrom med secretRef: backend-secrets. Det betyder att ALLA keys i secreten blir env-variabler i podden automatiskt. Lagger du till en ny key (t.ex. Stripe__ApiKey) sa maste du seala om hela filen och re-applya — men deployment-manifesten behover inte rendras. Bra for evolution, men du tappar overblicken over vilka env-vars som finns.

# Tentapunkter

- Vad en SealedSecret ar och varfor den ar saker att checka in i Git (krypterad med kluster-publik nyckel)
- Skillnad mellan SealedSecret och Secret — controllern producerar Secret av SealedSecret
- Varfor name+namespace ar bakat in i kryptot (anti-copy-paste-skydd)
- Hur dubbla underscores i .NET-keys mappar till nested config (ConnectionStrings__DefaultConnection)
- Skillnad mellan envFrom secretRef (alla keys blir env) och env med valueFrom secretKeyRef (en at gangen)
