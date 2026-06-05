---
title: "Backend Deployment"
source: chas-challenge
sourceLabel: "Eget projekt — Backend Deployment"
chapterId: 6
filename: "02-backend-deployment.yaml"
---

# Varför

ASP.NET Core-backenden för appen — den som driver API:t som frontend pratar med. Den här manifesten visar varför Deployment-strategin INTE alltid kan vara RollingUpdate: backenden mountar en RWO-PVC för uppladdade bilder, och två Pods kan inte hålla i samma volym på olika noder samtidigt. Giacomo har dragit det här flera gånger — det är klassisk fallgrop för G-nivå-frågor om strategi vs. storage.

# Deployment-skelettet

Standard Deployment (rad 1-8) med labels `app: foreverhome` och `component: backend`. Labels är inte kosmetika — de är limmet som Service och selector använder för att hitta rätt Pods. Om labels och selector inte matchar startar inget alls. `replicas: 1` (rad 9) — bara en Pod, vilket hänger ihop direkt med Recreate-strategin nedan.

# Recreate-strategin (viktigast i hela filen)

`strategy.type: Recreate` (rad 10-11) betyder: döda gamla Poden FÖRST, starta ny sen. Default i K8s är RollingUpdate som kör ny och gammal parallellt en stund — men det går INTE här eftersom uploads-volymen är RWO (ReadWriteOnce). Två Pods kan inte mounta samma PVC samtidigt på olika noder. Recreate accepterar lite downtime i utbyte mot att deployen inte kraschar med 'Multi-Attach error'. Tentafråga: 'Varför Recreate?' → svar: RWO-volym + single-writer.

# Pod-spec: säkerhet och image-pull

`fsGroup: 1000` (rad 22-23) sätter GID på filer i volymen så ASP.NET-processen får skriva till `/app/wwwroot/uploads`. Utan det får containern permission denied när den försöker spara en bild. `imagePullSecrets: gitlab-registry` (rad 24-25) — imagen ligger i Chas privata GitLab-registry, så Kubernetes behöver en docker-config-secret för att ens få hämta den. Glömmer man secreten fastnar Poden i `ImagePullBackOff`.

# Env vars: hårda + secret-paket

Två sätt att skicka in env (rad 31-44). Hårda värden (`ASPNETCORE_URLS`, JWT-issuer osv) ligger direkt i manifesten — okej eftersom de inte är hemliga. `envFrom.secretRef: backend-secrets` (rad 42-44) hämtar HELA secreten som env vars i ett svep — DB-connection-string, JWT-key, allt. Smidigare än att lista varje key för sig. Fallgrop: ändrar du secreten startar inte Poden om automatiskt — du måste rolla en restart manuellt.

# Probes: TCP-socket på 5158

Både liveness och readiness kollar `tcpSocket: 5158` (rad 45-55) — alltså 'svarar porten på TCP-handshake?'. Inte HTTP-probe eftersom ASP.NET Core inte har en dedikerad /health-endpoint här. Liveness: 30s delay, kör var 30:e sek, 3 fails = restart. Readiness: 10s delay, var 10:e — snabbare så Service slutar skicka trafik direkt om backenden hänger sig. Skillnaden: liveness dödar Poden, readiness tar bara bort den ur Service-rotationen.

# Resources: requests vs limits

Requests (rad 57-59): 128Mi RAM + 100m CPU — det scheduler garanterar och bokar in noden för. Limits (rad 60-62): 512Mi + 500m — taket. Går Poden över RAM-limit dödas den (OOMKilled). Går den över CPU-limit blir den throttlad, inte dödad. För en G-svar: requests = vad man behöver, limits = vad man får max.

# Volym-mountning för uploads

`volumeMounts: /app/wwwroot/uploads` (rad 63-65) — exakt där ASP.NET Core sparar wwwroot-statiska filer. Volymen själv (rad 66-69) är en `persistentVolumeClaim` med claimName `uploads` som matchar PVC:n definierad i en annan manifest. Hela poängen: bilderna överlever Pod-restarts. Utan PVC försvinner uploads så fort Poden dör. Det är exakt därför Recreate-strategin är ett måste — PVC:n kan bara hängas på en Pod åt gången.

# Tentapunkter

- Förklara varför strategy.type är Recreate och inte RollingUpdate — RWO-PVC kan bara mountas av en Pod åt gången
- Skillnad mellan liveness- och readiness-probe: liveness dödar Poden, readiness tar bort den ur Service-rotationen
- envFrom secretRef vs enskilda env-värden — när man väljer vilket
- Resources requests vs limits: requests = garanterat + schemaläggs, limits = tak (RAM-överskott = OOMKilled, CPU = throttling)
- Varför imagePullSecrets behövs — privat GitLab-registry går inte att hämta utan docker-config-secret
