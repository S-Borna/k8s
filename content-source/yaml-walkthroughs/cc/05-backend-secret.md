---
title: "Backend Secret"
source: chas-challenge
sourceLabel: "Eget projekt — Backend Secret"
chapterId: 12
filename: "05-backend-secret.yaml"
---

# Varför

Secrets är där man stoppar in det som ALDRIG får hamna i Git — DB-connection-string, JWT-nyckel, registry-token. Den här filen är en mall som Said har i repo:t för att komma ihåg strukturen — den riktiga Secreten skapas via `kubectl create secret` mot klustret, eller (bättre) som SealedSecret (12- och 13-filerna) som är krypterad och kan committas. Backend-deploymenten plockar sen värdena via `envFrom` så att .NET-appen ser dem som vanliga miljövariabler. Poängen Giacomo körde hårt: Secret base64-encodar, det är INTE kryptering — därför SealedSecret på riktigt.

# Kommentarsblocket överst — varför mallen är tom

Hela top-blocket (rad 1-16) är instruktioner till Said själv, inte K8s-konfig. Det säger rakt ut: fyll INTE i riktiga värden här. Anledningen — om filen committas med riktig connection-string eller JWT-nyckel, så ligger hemligheten för evigt i Git-historiken. Mallen visar istället kommandona som skapar Secreten direkt mot klustret med `kubectl create secret generic` (rad 5-7) och pull-secreten med `kubectl create secret docker-registry` (rad 10-13). Praktiskt — repot är safe att pusha, klustret får värdena via kubectl.

# Två separata Secrets — appens vars och registry-token

Många blandar ihop det här. `backend-secrets` (rad 5-7) är appens egna hemligheter — DB och JWT. `gitlab-registry` (rad 10-13) är en HELT annan typ: en docker-registry-Secret som klustret behöver för att överhuvudtaget kunna PULLA imagen från GitLabs privata registry. De har olika `type` — Opaque vs kubernetes.io/dockerconfigjson — och används på olika sätt i Deploymenten (envFrom vs imagePullSecrets).

# Manifest-header — kind: Secret, type: Opaque

Själva K8s-objektet börjar på rad 18. `apiVersion: v1` — Secret är core/v1, lever sen K8s början. `type: Opaque` (rad 25) är default-typen för godtyckliga key/value-hemligheter — används när det inte är en speciell sort (som docker-registry eller tls). Labels `app: foreverhome` + `component: backend` (rad 22-24) är Saids konvention så allt som hör till backend-stacken kan filtreras med `kubectl get all -l component=backend`.

# data-blocket — base64, inte kryptering

På rad 26-28 ligger själva värde-blocket. Nyckelarna har dubbla understreck — `ConnectionStrings__DefaultConnection` och `Jwt__Key` — det är .NET-konventionen för nested config (motsvarar `ConnectionStrings:DefaultConnection` i appsettings.json). Värdena under `data:` MÅSTE vara base64. Giacomo tröttnade på det: base64 är INTE kryptering, vem som helst kan köra `echo <värde> \| base64 -d` och få fram klartexten. Vill man committa Secrets safe — använd SealedSecret istället (det är exakt vad 12- och 13-filerna gör).

# Hur backend-deploymenten plockar upp värdena

Den här Secreten är värdelös utan en konsument. I `04-backend-deployment.yaml` står det `envFrom: secretRef: name: backend-secrets` — det betyder att ALLA keys i Secreten injiceras som miljövariabler i backend-containern. Så `ConnectionStrings__DefaultConnection` blir en env-var med samma namn, och .NET-runtimen plockar upp den automatiskt. `gitlab-registry`-Secreten används annorlunda — den listas under `spec.template.spec.imagePullSecrets` så kubelet kan autentisera mot registry-servern.

# På riktigt — SealedSecret istället för det här

I Saids deployen mot lab-klustret används INTE den här Opaque-Secreten direkt. Istället finns 12-gitlab-registry-sealed.yaml och 13-backend-secrets-sealed.yaml — de innehåller krypterade värden som bara klustrets sealed-secrets-controller kan dekryptera. De är safe att committa till Git. När de appliceras, genererar controllern den vanliga Opaque-Secreten i klustret — exakt det objekt som den här mallen beskriver.

# Tentapunkter

- Vad en Secret är och varför base64 inte är kryptering — bara encoding
- Skillnaden mellan en Opaque-Secret (app-vars) och en docker-registry-Secret (pull-credentials)
- Hur en Deployment konsumerar en Secret — envFrom för env-vars, imagePullSecrets för registry-auth
- Varför man inte committar Secrets med riktiga värden — och vad SealedSecret löser
- Konventionen med dubbla understreck i .NET-config-keys (`ConnectionStrings__DefaultConnection`)
