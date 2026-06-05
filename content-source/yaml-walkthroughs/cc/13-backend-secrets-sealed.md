---
title: "Backend Secrets (sealed)"
source: chas-challenge
sourceLabel: "Chas Challenge — Backend Secrets (Sealed)"
chapterId: 12
filename: "13-backend-secrets-sealed.yaml"
---

# Varför

Backend-appen behöver en DB-connection-string och en JWT-signeringsnyckel för att kunna prata med Postgres och utfärda tokens. Dessa får ALDRIG ligga i klartext i Git. Giacomo visade hur man wrappar dem i en SealedSecret — krypterad med kluster-controllerns publika nyckel, så det bara är exakt detta kluster som kan dekryptera. Samma mönster som gitlab-registry-sealed, fast för app-hemligheter istället för registry-credentials.

# API-version och kind

SealedSecret är inte en inbyggd K8s-resurs — den kommer från Bitnamis sealed-secrets-controller (rad 2-3). Kontrollern måste vara installerad i klustret, annars händer ingenting när du applyar. Den lyssnar på SealedSecret-objekt och producerar en vanlig Secret med samma namn när dekrypteringen lyckas.

# Metadata — name + namespace låsta i kryptot

Name och namespace (rad 4-6) är inte bara etiketter — de är inbakade i krypteringen. Om du flyttar manifesten till en annan namespace eller döper om den så fungerar inte dekrypteringen längre. Det är designat så för att ingen ska kunna kopiera filen till sin egen namespace och få ut hemligheterna. Fallgrop: bytte du från doe25-group-10 till något annat så måste du seala om från scratch.

# encryptedData — själva nyttolasten

Under encryptedData ligger två nycklar: ConnectionStrings__DefaultConnection och Jwt__Key (rad 8-10). Dubbla underscoresen är .NET-konvention — de mappas till nested JSON i appsettings (ConnectionStrings:DefaultConnection). Värdena är base64-strängar krypterade med klustrets publika nyckel via kubeseal-CLI. Bara controllern, med privata nyckeln, kan öppna dem.

# Template — vad Secret-objektet får för metadata

Template-blocket (rad 11-14) styr hur den faktiska Secret-resursen ska se ut när controllern producerar den. Name och namespace mappas en-till-en. Du kan också lägga in labels och annotations här om du vill — t.ex. om en annan operator behöver hitta secreten. Saknar du template får du ändå en Secret med samma namn som SealedSecret, vilket är det vi vill ha här.

# Hur backend hämtar värderna

Backend-deployment refererar inte till individuella keys — den använder envFrom med secretRef: backend-secrets. Det betyder att ALLA keys i secreten blir env-variabler i podden automatiskt. Lägger du till en ny key (t.ex. Stripe__ApiKey) så måste du seala om hela filen och re-applya — men deployment-manifesten behöver inte rendras. Bra för evolution, men du tappar överblicken över vilka env-vars som finns.

# Tentapunkter

- Vad en SealedSecret är och varför den är säker att checka in i Git (krypterad med kluster-publik nyckel)
- Skillnad mellan SealedSecret och Secret — controllern producerar Secret av SealedSecret
- Varför name+namespace är bakat in i kryptot (anti-copy-paste-skydd)
- Hur dubbla underscores i .NET-keys mappar till nested config (ConnectionStrings__DefaultConnection)
- Skillnad mellan envFrom secretRef (alla keys blir env) och env med valueFrom secretKeyRef (en åt gången)
