---
title: "Backend Secret (lokal mall - sealed-versionen anvands i CC-deploy)"
source: chas-challenge
sourceLabel: "Chas Challenge — Backend Secret (placeholder)"
chapterId: 12
filename: "05-backend-secret.yaml"
---

# Varför

Secrets ar dar man stoppar in det som ALDRIG far hamna i Git — DB-connection-string, JWT-nyckel, registry-token. Den har filen ar en mall som Said har i repo:t for att komma ihag strukturen — den riktiga Secreten skapas via `kubectl create secret` mot klustret, eller (battre) som SealedSecret (12- och 13-filerna) som ar krypterad och kan committas. Backend-deploymenten plockar sen vardena via `envFrom` sa att .NET-appen ser dem som vanliga miljovariabler. Poangen Giacomo korde hart: Secret base64-encodar, det ar INTE kryptering — darfor SealedSecret pa riktigt.

# Kommentarsblocket overst — varfor mallen ar tom

Hela top-blocket (rad 1-16) ar instruktioner till Said sjalv, inte K8s-konfig. Det sager rakt ut: fyll INTE i riktiga varden har. Anledningen — om filen committas med riktig connection-string eller JWT-nyckel, sa ligger hemligheten for evigt i Git-historiken. Mallen visar istallet kommandona som skapar Secreten direkt mot klustret med `kubectl create secret generic` (rad 5-7) och pull-secreten med `kubectl create secret docker-registry` (rad 10-13). Praktiskt — repot ar safe att pusha, klustret far vardena via kubectl.

# Tva separata Secrets — appens vars och registry-token

Manga blandar ihop det har. `backend-secrets` (rad 5-7) ar appens egna hemligheter — DB och JWT. `gitlab-registry` (rad 10-13) ar en HELT annan typ: en docker-registry-Secret som klustret behover for att overhuvudtaget kunna PULLA imagen fran GitLabs privata registry. De har olika `type` — Opaque vs kubernetes.io/dockerconfigjson — och anvands pa olika satt i Deploymenten (envFrom vs imagePullSecrets).

# Manifest-header — kind: Secret, type: Opaque

Sjalva K8s-objektet borjar pa rad 18. `apiVersion: v1` — Secret ar core/v1, lever sen K8s borjan. `type: Opaque` (rad 25) ar default-typen for godtyckliga key/value-hemligheter — anvands nar det inte ar en speciell sort (som docker-registry eller tls). Labels `app: foreverhome` + `component: backend` (rad 22-24) ar Saids konvention sa allt som hor till backend-stacken kan filtreras med `kubectl get all -l component=backend`.

# data-blocket — base64, inte kryptering

Pa rad 26-28 ligger sjalva varde-blocket. Nyckelarna har dubbla understreck — `ConnectionStrings__DefaultConnection` och `Jwt__Key` — det ar .NET-konventionen for nested config (motsvarar `ConnectionStrings:DefaultConnection` i appsettings.json). Vardena under `data:` MASTE vara base64. Giacomo trotnade pa det: base64 ar INTE kryptering, vem som helst kan kora `echo <varde> \| base64 -d` och fa fram klartexten. Vill man committa Secrets safe — anvand SealedSecret istallet (det ar exakt vad 12- och 13-filerna gor).

# Hur backend-deploymenten plockar upp vardena

Den har Secreten ar vardelos utan en konsument. I `04-backend-deployment.yaml` star det `envFrom: secretRef: name: backend-secrets` — det betyder att ALLA keys i Secreten injiceras som miljovariabler i backend-containern. Sa `ConnectionStrings__DefaultConnection` blir en env-var med samma namn, och .NET-runtimen plockar upp den automatiskt. `gitlab-registry`-Secreten anvands annorlunda — den listas under `spec.template.spec.imagePullSecrets` sa kubelet kan autentisera mot registry-servern.

# Pa riktigt — SealedSecret istallet for det har

I Saids ForeverHome-deploy mot CC-klustret anvands INTE den har Opaque-Secreten direkt. Istallet finns 12-gitlab-registry-sealed.yaml och 13-backend-secrets-sealed.yaml — de innehaller krypterade varden som bara klustrets sealed-secrets-controller kan dekryptera. De ar safe att committa till Git. Nar de appliceras, genererar controllern den vanliga Opaque-Secreten i klustret — exakt det objekt som den har mallen beskriver.

# Tentapunkter

- Vad en Secret ar och varfor base64 inte ar kryptering — bara encoding
- Skillnaden mellan en Opaque-Secret (app-vars) och en docker-registry-Secret (pull-credentials)
- Hur en Deployment konsumerar en Secret — envFrom for env-vars, imagePullSecrets for registry-auth
- Varfor man inte committar Secrets med riktiga varden — och vad SealedSecret loser
- Konventionen med dubbla understreck i .NET-config-keys (`ConnectionStrings__DefaultConnection`)
