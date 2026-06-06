---
id: 12
title: "ConfigMaps and Secrets"
titleSv: "ConfigMaps och Secrets"
estimatedMinutes: 35
---

# Sammanfattning

Appar har två delar: kod och konfiguration. Koden är i container-imagen. Konfigurationen separeras ut via **ConfigMaps** (icke-känslig) och **Secrets** (känslig).

## Varför separera?

- Samma image kan köras i dev, staging, prod med olika config
- Configändringar kräver inte ny build
- Hemligheter (lösenord, API-nycklar) hålls utanför images
- Versionering av config separat från kod

## ConfigMaps

För icke-känslig konfiguration: feature flags, hostnames, log levels, hela config-filer.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  log-level: "debug"
  database-host: "db.example.com"
  app-config.yaml: |
    server:
      port: 8080
```

## Secrets

För känslig data: lösenord, API-nycklar, certifikat. **Base64-kodade** (inte krypterade!) by default.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  username: dXNlcg==        # base64 av "user"
  password: cGFzc3dvcmQ=    # base64 av "password"
```

För riktig kryptering: aktivera **encryption at rest** i etcd, eller använd external secret managers (Vault, AWS Secrets Manager).

## Fyra sätt att använda dem i Pods

**1. Environment variables:**
```yaml
env:
- name: LOG_LEVEL
  valueFrom:
    configMapKeyRef:
      name: app-config
      key: log-level
```

**2. Hela ConfigMap som env vars:**
```yaml
envFrom:
- configMapRef:
    name: app-config
```

**3. Mountad som filer:**
```yaml
volumeMounts:
- name: config-vol
  mountPath: /etc/config
volumes:
- name: config-vol
  configMap:
    name: app-config
```

**4. Command line args:**
```yaml
args:
- "--log-level=$(LOG_LEVEL)"
env:
- name: LOG_LEVEL
  valueFrom:
    configMapKeyRef:
      name: app-config
      key: log-level
```

## Update-beteende

**Env vars** uppdateras INTE när ConfigMap/Secret ändras — Pod måste startas om.

**Mountade volymer** uppdateras automatiskt (kan ta upp till en minut). Appen måste hantera reload.

# Giacomos tillägg

Genomgående tema från lektionen: hemligheter är inte säkra "av sig själva", det är hur du paketerar och roterar dem som avgör.

> Tentarelevant: Secrets är **base64, inte krypterade**. Vem som kan läsa secret kan köra `base64 -d`. Riktig säkerhet kommer från encryption at rest i etcd, eller external secret managers som Vault.

> Tentarelevant: Trafik **mellan poddar i klustret är cleartext**. För kryptering in transit krävs ett service mesh.

> Tentarelevant: Sealed Secrets-controllerns **public key är specifik per kluster**. En sealed secret krypterad mot lab-klustret kan inte avkrypteras i CC-klustret. Förloras klustrets private key måste alla sealed secrets roteras.

> Tentarelevant: ImagePullSecret måste finnas i **varje namespace** som ska pulla privata images. Det är inte cluster-scopat.

På Mikas fråga "varför särskilja ConfigMap och Secret om Secret inte är säker?" svarade Giacomo: "Secrets är inte säkra av sig själva men är byggblocket man bygger säkra lösningar på (service mesh, Vault, encryption at rest). ConfigMaps är för icke-känslig data där vi vill separera app från config. Skillnaden är intentionen — Secrets signalerar att datan ska skyddas."

På Thomas fråga om age svarade Giacomo: "Age har samma grundproblem — du måste lagra encryption key någonstans. Sealed Secrets, age, Vault — alla har en 'master nyckel' som måste skyddas. Det är ormen som äter sin svans."

På Alexanders fråga om en fil per resurs eller allt i en sa Giacomo: "Ingen hård regel. Min praxis: en fil per resurs i större projekt, eller logiskt grupperat (Service + Ingress ihop). Du bestämmer när du jobbar i en organisation — antingen följer du befintlig norm eller sätter den själv."

På Victors fråga om GitLab CI variables kan bli Kubernetes secrets direkt svarade Giacomo: "Nej, ingen direkt integration. Men du kan måta in värden via pipeline med envsubst eller använda dem direkt som env vars i deployment."

På Alexanders fråga om när man går från Alpine till Ubuntu: "Ganska sent. Alpine använder musl libc istället för glibc — vissa C-binärer funkar inte på Alpine. Då växlar man till Ubuntu/Debian. Annars: Alpine vinner storleksmässigt (9 MB vs 100+ MB för Ubuntu)."

På Mikas suck om hur komplext K8s blir med alla resurser: "Ja, K8s exploderar abstraktioner jämfört med Docker. En port mapping i Docker = Service + Ingress + EndpointSlice i K8s. En volym = Volume + PVC + PV. Det blir lättare med vana. Helm + Kustomize hjälper i nästa kurs."

På Christians fråga om Helm för CC: "Helm för **färdiga lösningar** (Postgres, MongoDB, etc) — ja. För **dina egna apps** — skriv råa manifest. Det är pedagogiskt viktigare just nu."

> Viktigt för CC: vi får namespace **per grupp**, inte per person. 18 grupper = 18 namespaces. Flera DOE i samma grupp delar namespace — resursnamn måste vara unika per branch/MR, annars skriver ni över varandras deploys. Prefixa/suffixa med branch-info: `web-mr42` istället för `web`.

> Viktigt om htpasswd-strängar i secret-manifest: använd **enkelfnuttar**. Dollartecknen i `$apr1$...` evalueras annars av shellet och du får en trasig auth som tar tid att felsöka.

# Lektion

Lektionen handlade om att gå hela vägen: från konceptet ConfigMap/Secret till en riktig deploy av test-rest-API:t mot klustret, med Sealed Secrets, basic auth via Traefik och en CI/CD-pipeline som river upp miljöer per merge request. Mycket av det vi gjorde är sånt vi kommer behöva köra rakt av på CC-projektet.

## Konceptet, kort och tydligt

Giacomo öppnade med varför vi separerar config från kod: en image för tjugo kunder, samma binär men olika config. Annars sitter du på tjugo identiska images, en per kund. ConfigMap för det öppna, Secret för det känsliga.

Han räknade upp tre sätt att använda en ConfigMap i en Pod: som environment variables, mountad som volym (varje key blir filnamn, value blir filinnehåll), eller i command-arguments till podden (som env vars som expanderas). Vi använde flera av dem under labben.

Han var hård på en sak: Secrets är inte krypterade. De är base64. Vem som kan läsa Secret kan köra `base64 -d` och ha klartext. Trafiken i klustret är dessutom cleartext mellan poddar — vill du ha riktig kryptering in transit behöver du ett service mesh. Och vill du ha riktig hemlighantering: HashiCorp Vault.

## Test-rest till K8s — uppställningen

Vi byggde vidare på test-rest-API:t från förra kursen. Giacomo lade till en `/config`-endpoint som läser en fil vars path kommer från env-varen `APP_CONFIG_FILE`, med fallback till default-config inbakad i koden. Docker-imagen fick med curl, jq, bash och gettext (för `envsubst`).

I `kates/`-mappen lade vi en fil per resurs:

```
10-config-map.yml
20-service.yml
30-deployment.yml
40-ingress.yml
50-middleware.yml
secret.yml          # lokal, gitignorerad
secret.sealed.yml   # kommitterad
```

Giacomo: "Relaterade resurser i separata filer ger bättre överblick. Service och Ingress kan ligga ihop. Stora projekt: en mapp per tjänst med deployment, service, ingress, configmap."

## envsubst i manifesten

Tre värden behövde substitueras vid deploy-tid:

- `${APP_ENV}` i ConfigMap (testing/staging/main)
- `${APP_HOST}` i Ingress (dynamisk per branch/MR)
- `${IMAGE}` i Deployment (commit-SHA-taggad image)

Mönstret blev: läs manifestet, pipa genom `envsubst`, pipa till `kubectl apply -f -`. Inga sed-hacks, ingen template-motor utöver shellet.

```bash
envsubst < kates/30-deployment.yml | kubectl apply -f -
```

## ImagePullBackOff — incidenten

Första deployen pang: `ImagePullBackOff`. Poddarna kom inte åt vår privata GitLab-registry. `kubectl describe pod <namn>` visade i Events:

```
Failed to authorize: failed to fetch anonymous token,
status: 403 Forbidden
```

Lösningen var en Docker Registry Secret. Giacomo skapade en access-token i GitLab under User Settings → Access Tokens med scope `read_registry` och körde:

```bash
kubectl create secret docker-registry gitlab-registry-secret \
  --docker-server=registry.chas.lab.dev \
  --docker-username=gg \
  --docker-password=<token>
```

Sen kopplades den till deploymentet:

```yaml
spec:
  template:
    spec:
      imagePullSecrets:
      - name: gitlab-registry-secret
```

Han varnade för det vi annars trampar i: ImagePullSecret måste finnas i **varje namespace** som ska pulla privata images. På riktiga projekt automatiserar man det när namespaces skapas. Han berättade om en token-rotation där GitLab införde ett 1-årsmax på tokens — alla deras namespaces failade samtidigt och de fick skriva bash-script för att rotera över hela floran.

## CI/CD — kubeconfig som CI-variabel

Klassisk fälla: kubeconfig innehåller whitespace, och masked variables i GitLab tillåter inte whitespace. Giacomos lösning:

```bash
cat ~/.kube/config | base64 -w0
```

Resultatet är en lång rad utan whitespace. Den klistras in som **masked + hidden** i CI-variablerna. I pipelinen avkodar man tillbaka:

```bash
echo "$KUBECONFIG_B64" | base64 -d > /kube.config
export KUBECONFIG=/kube.config
kubectl get nodes
```

## Pipelinen — deploy och stop

`deploy`-jobbet körs i en egen `utils`-image med kubectl och envsubst förinstallerat. Variabler: `APP_HOST`, `APP_ENV`, `IMAGE`. Rules: körs på merge request eller default branch. `environment` med `on_stop` pekar på ett `stop`-jobb.

Stop-jobbet är samma kommandon fast med `kubectl delete` istället för `apply`. Triggas automatiskt när MR stängs eller mergas. Hela miljön rivs ner. Inga zombie-deploys.

## Traefik Middleware — basic auth

För att skydda endpointen lade vi en basic auth-middleware framför ingressen. Middleware sitter mellan router och service i Traefik och kan läsa, ändra eller blockera requests — basic auth, rate limiting, header injection, prefix rewrite.

Manifestet:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: testrest-basic-auth
spec:
  basicAuth:
    secret: testrest-basic-auth
```

Kopplas till Ingressen via annotation:

```yaml
annotations:
  traefik.ingress.kubernetes.io/router.middlewares: doe25-gg-testrest-basic-auth@kubernetescrd
```

Formatet är strikt: `<namespace>-<middleware-namn>@kubernetescrd`.

Användarna i secret genererades med htpasswd via en disposable Docker-container:

```bash
docker run --rm httpd htpasswd -nb devops chas123
```

Output: `devops:$apr1$...$...`

Giacomo höll upp ett varningsfinger: använd **enkelfnuttar** kring strängen i secret-manifestet. Dollar-tecken i hash:en evalueras annars av shellet och du får en trasig auth som tar tid att felsöka.

## Sealed Secrets — det här var poängen

Problemet: vanliga Secrets kan inte committas (cleartext). Manuell hantering skalar inte. ImagePullSecret, basic auth, API-tokens — alla har samma problem.

Sealed Secrets-controllern är installerad i `kube-system` och har ett private/public key-par. Public key används för att kryptera, private key används av controllern i klustret för att avkryptera och skapa den riktiga Secreten.

Workflowet vi körde live:

```bash
# 1. Skapa vanlig Secret-manifest lokalt (gitignorerad)
kubectl create secret generic testrest-basic-auth \
  --from-literal=users='devops:$apr1$...' \
  --dry-run=client -o yaml > secret.yml

# 2. Försegla mot klustrets public key
cat secret.yml | kubeseal --format yaml > secret.sealed.yml

# 3. Committa secret.sealed.yml till Git
# 4. Pipeline applicerar sealed secret → controller skapar vanlig Secret
```

Giacomo var tydlig med begränsningarna: **public key är specifik per kluster**. En sealed secret krypterad mot lab-klustret funkar inte i CC-klustret. Och **förlorar du klustrets private key måste alla sealed secrets roteras** — backup av nyckeln är kritisk. Han kör Vault i prod, men Sealed Secrets för enklare fall (deras egen ArgoCD-setup till exempel).

## CC-klustret — heads-up

Vi får namespace **per grupp**, inte per person. 18 grupper, 18 namespaces, 18 konton. Samma behörigheter och uppsättning som labbet, men mer resurser.

Konsekvensen: flera DOE i samma grupp = samma namespace. Resursnamn måste vara unika per branch/MR, annars skriver gruppmedlemmar över varandras deploys. Prefixa eller suffixa med branch eller MR-ID. Ingress-namnet blir `web-mr42` istället för bara `web`.

# Hands-on

## 1. Skapa ConfigMap från kommandoraden

```bash
kubectl create configmap app-config \
  --from-literal=log-level=debug \
  --from-literal=database-host=db.example.com
```

## 2. Inspektera

```bash
kubectl get configmap app-config -o yaml
```

## 3. Använd i Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: config-pod
spec:
  containers:
  - name: app
    image: busybox
    command: ["sh", "-c", "echo $LOG_LEVEL && sleep 3600"]
    env:
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: log-level
```

## 4. Skapa Secret

```bash
kubectl create secret generic db-secret \
  --from-literal=username=admin \
  --from-literal=password=supersecret
```

## 5. Verifiera (base64)

```bash
kubectl get secret db-secret -o yaml
```

Förväntat: Värden är base64-kodade. Decode med `echo "..." | base64 -d`.

# Lektion hands-on

## 1. Skapa Docker Registry Secret för GitLab

Skapa en access-token i GitLab (User Settings → Access Tokens, scope `read_registry`) och sätt den som en imagePullSecret i ditt namespace:

```bash
kubectl create secret docker-registry gitlab-registry-secret \
  --docker-server=registry.chas.lab.dev \
  --docker-username=gg \
  --docker-password=<token>
```

Koppla in den i deploymentet:

```yaml
spec:
  template:
    spec:
      imagePullSecrets:
      - name: gitlab-registry-secret
```

Förväntat: nästa deploy slipper `ImagePullBackOff`. Verifiera med `kubectl describe pod <namn>` — sektionen Events ska inte längre nämna 403 Forbidden.

## 2. envsubst på manifesten

Lägg `${APP_ENV}`, `${APP_HOST}` och `${IMAGE}` i dina manifest och rendera dem vid deploy:

```bash
export APP_ENV=testing
export APP_HOST=mr42.k8s.lab.dev
export IMAGE=registry.chas.lab.dev/gg/testrest:$CI_COMMIT_SHA

envsubst < kates/10-config-map.yml | kubectl apply -f -
envsubst < kates/30-deployment.yml | kubectl apply -f -
envsubst < kates/40-ingress.yml    | kubectl apply -f -
```

Förväntat: resurserna skapas med substituerade värden. `kubectl get configmap -o yaml` visar `APP_ENV: testing`.

## 3. Kubeconfig som base64 i CI

Encoda din kubeconfig till en singel-rad utan whitespace:

```bash
cat ~/.kube/config | base64 -w0
```

Klistra in resultatet som **masked + hidden** CI-variabel (t.ex. `KUBECONFIG_B64`). I pipelinen:

```bash
echo "$KUBECONFIG_B64" | base64 -d > /kube.config
export KUBECONFIG=/kube.config
kubectl get nodes
```

Förväntat: `kubectl get nodes` listar klustrets noder från pipelinen.

## 4. Traefik basic auth-middleware

Generera ett htpasswd-par i en disposable container:

```bash
docker run --rm httpd htpasswd -nb devops chas123
```

Lägg outputen i en Secret (notera **enkelfnuttar** runt strängen — annars expanderar shellet `$apr1`):

```bash
kubectl create secret generic testrest-basic-auth \
  --from-literal=users='devops:$apr1$....$....' \
  --dry-run=client -o yaml > secret.yml
```

Skapa middleware-resursen:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: testrest-basic-auth
spec:
  basicAuth:
    secret: testrest-basic-auth
```

Aktivera den på ingressen via annotation:

```yaml
annotations:
  traefik.ingress.kubernetes.io/router.middlewares: doe25-gg-testrest-basic-auth@kubernetescrd
```

Förväntat: `curl https://<host>/` returnerar 401. `curl -u devops:chas123 https://<host>/` returnerar 200.

## 5. Sealed Secrets — försegla och committa

Skapa en vanlig Secret som dry-run, försegla den, committa den sealed:

```bash
# 1. Vanlig Secret (gitignorerad)
kubectl create secret generic testrest-basic-auth \
  --from-literal=users='devops:$apr1$....$....' \
  --dry-run=client -o yaml > secret.yml

# 2. Försegla mot klustrets public key
cat secret.yml | kubeseal --format yaml > secret.sealed.yml

# 3. Committa secret.sealed.yml
git add secret.sealed.yml
git commit -m "sealed basic auth secret"
```

Pipelinen applicerar `secret.sealed.yml`. Sealed Secrets-controllern i `kube-system` avkrypterar och skapar den riktiga Secreten i ditt namespace.

Förväntat: `kubectl get sealedsecret testrest-basic-auth` finns. `kubectl get secret testrest-basic-auth` finns också (skapad av controllern). Den ursprungliga `secret.yml` ligger kvar lokalt och gitignorerad.

## 6. on_stop-jobb för automatisk teardown

I `.gitlab-ci.yml`:

```yaml
deploy:
  stage: deploy
  image: registry.chas.lab.dev/gg/utils
  script:
    - envsubst < kates/*.yml | kubectl apply -f -
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    url: https://$APP_HOST
    on_stop: stop

stop:
  stage: deploy
  image: registry.chas.lab.dev/gg/utils
  script:
    - envsubst < kates/*.yml | kubectl delete -f -
  when: manual
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    action: stop
```

Förväntat: när MR stängs/mergas körs stop-jobbet och hela miljön rivs ner. Inga zombie-deploys.

# Flashcards

## Q [config, security]: Vad är skillnaden mellan ConfigMap och Secret?

**A:** ConfigMap = icke-känslig konfiguration (log levels, feature flags, hostnames). Secret = känslig data (lösenord, API-nycklar, certifikat). Tekniskt nästan identiska, men Secrets är base64-kodade och behandlas mer försiktigt av K8s (visas inte i `describe`, kan krypteras at rest, kan integreras med externa secret managers).

## Q [config, security]: Är Secrets krypterade?

**A:** Nej — bara base64-kodade. Vem som kan läsa Secret kan köra `base64 -d` och få klartext. För riktig säkerhet: aktivera encryption at rest i etcd, eller använd Vault/AWS Secrets Manager.

## Q [config, security]: Vad är skillnaden mellan att använda ConfigMap som env var vs som mountad fil?

**A:** Env vars: enkelt, men uppdateras inte när ConfigMap ändras — Pod måste startas om. Mountade filer: uppdateras automatiskt (upp till 1 min fördröjning), men appen måste själv läsa om filen.

## Q [config, security]: Varför uppdateras env vars inte automatiskt?

**A:** Env vars sätts när Pod startar och kan inte ändras i den körande processen. Mountade filer kan däremot skrivas om live av kubelet. Det är en Linux-begränsning, inte ett K8s-val.

## Q [config, security]: Hur skapar man Secret från en fil?

**A:** `kubectl create secret generic my-secret --from-file=key=path/to/file`. Filens innehåll blir base64-kodat och lagras under nyckeln "key". Användbart för certifikat, SSH-nycklar. Filen ska INTE checkas in i Git - skapa Secret manuellt eller via CI/CD.

## Q [config, security]: Varför ska man inte hardcoda config i container-imagen?

**A:** Samma image ska kunna köras i dev, staging och prod med olika config. Hardcodad config kräver en image per miljö — dyrt och lätt att klanta till. Giacomos exempel: en image för 20 kunder istället för 20 olika images.

## Q [config, security]: Vad är `envFrom`?

**A:** Mappar ALLA nycklar i en ConfigMap eller Secret till env vars i Podden, utan att lista varje nyckel manuellt. Smidigt för många config-nycklar. Risk: alla nycklar exponeras, vilket kan vara oavsiktligt om ConfigMap har känslig data.

# YAML-quiz

## 1. Fyll i: Anvand ConfigMap-nyckel som env var

Du vill att containern far env-varen `LOG_LEVEL` med vardet fran ConfigMappen `app-config` (nyckel `log-level`). Fyll i de tre `???`.

```yaml
env:
- name: LOG_LEVEL
  valueFrom:
    ???:
      name: ???
      key: ???
```

**Svar:** `configMapKeyRef`, `app-config`, `log-level`

**Förklaring:** `configMapKeyRef` pekar pa en ConfigMap, `name` ar ConfigMappens namn och `key` ar nyckeln inne i dess `data`-block. For en Secret skulle du anvant `secretKeyRef` istallet.

## 2. Hitta felet: Secret med klartextvarden

Den har Secret-manifestfilen funkar inte som forvantat. Vad ar fel?

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  username: user
  password: password
```

**Svar:** Värdena under `data:` måste vara base64-kodade. Skriv `echo -n 'user' | base64` → `dXNlcg==` och `echo -n 'password' | base64` → `cGFzc3dvcmQ=`. Alternativt använd fälten under `stringData:` där K8s base64-kodar åt dig.

**Förklaring:** Fälten under `data:` kräver base64. Apply går igenom men appen får skräp-värden när de avkodas. `stringData:` är bekvämare när du skriver manifest för hand.

## 3. Fyll i: Mounta ConfigMap som filer

Du vill mounta ConfigMappen `app-config` som filer under `/etc/config` i containern. Fyll i de tre `???`.

```yaml
volumeMounts:
- name: config-vol
  mountPath: ???
volumes:
- name: config-vol
  ???:
    name: ???
```

**Svar:** `/etc/config`, `configMap`, `app-config`

**Förklaring:** Volume-typen `configMap` skapar en fil per nyckel i ConfigMappen — nyckelnamnet blir filnamnet, vardet blir filinnehallet. Mountas filerna sa uppdateras de automatiskt nar ConfigMappen andras (kan ta upp till en minut), till skillnad fran env vars.

# Scenarios

## 1. ImagePullBackOff efter forsta deploy

**Situation:** Du har precis appliccerat ditt deployment-manifest i ditt nya namespace. Podden startar inte och `kubectl get pods` visar status `ImagePullBackOff`. Du kor `kubectl describe pod <namn>` och ser i Events-sektionen:

```
Failed to authorize: failed to fetch anonymous token, status: 403 Forbidden
```

Imagen ligger i `registry.chas.lab.dev/gg/testrest`.

**Frågor:**
- Vad ar troligaste orsaken?
- Hur fixar du det?
- Vad maste du komma ihag om du senare deployar i ett annat namespace?

**Modellsvar:** **Orsak:** Klustret kan inte autentisera mot er privata GitLab-registry. 403 betyder att den forsoker pulla anonymt och nekas. Du saknar en imagePullSecret i namespacet.

**Diagnos:** `kubectl describe pod <namn>` (du har redan kort den) bekraftar att felet ar auth mot registryt, inte natverk eller fel image-tag.

**Fix:** Skapa en docker-registry-secret med en GitLab access-token som har scope `read_registry`:

```bash
kubectl create secret docker-registry gitlab-registry-secret \
  --docker-server=registry.chas.lab.dev \
  --docker-username=gg \
  --docker-password=<token>
```

Lagg sen `imagePullSecrets` i deploymentet:

```yaml
spec:
  template:
    spec:
      imagePullSecrets:
      - name: gitlab-registry-secret
```

**Heads-up:** ImagePullSecret ar namespace-scopat, inte cluster-scopat. Varje nytt namespace som ska pulla privata images behover sin egen kopia av secreten.

## 2. Andring i ConfigMap visas inte i appen

**Situation:** Du har uppdaterat `log-level` fran `info` till `debug` i din ConfigMap och kort `kubectl apply -f config-map.yml`. `kubectl get configmap app-config -o yaml` visar `log-level: debug`. Men i app-loggarna fortsatter du se bara info-niva. Appen laser `LOG_LEVEL` som env var fran ConfigMappen.

**Frågor:**
- Varfor ser appen fortfarande gamla vardet?
- Hur fixar du det snabbast?
- Hur skulle du designat for att slippa det har problemet?

**Modellsvar:** **Orsak:** Env vars satts en gang nar Podden startar. De uppdateras INTE nar ConfigMappen andras — det ar en Linux-begransning, inte ett K8s-val. Din uppdaterade ConfigMap finns i klustret, men den korande processen sitter kvar med gamla vardet.

**Diagnos:** `kubectl exec <pod> -- env | grep LOG_LEVEL` visar fortfarande `info`. Bekraftar att Podden inte sett uppdateringen.

**Fix:** Starta om Podden — enklast med `kubectl rollout restart deployment <namn>`. Den skapar nya Pods som plockar upp nya ConfigMap-vardet.

**Battre design:** Mounta ConfigMappen som volym istallet. Mountade filer uppdateras automatiskt (kan ta upp till en minut). Men appen maste sjalv lasa om filen — env vars vs filer ar en avvagning mellan enkelhet och live-reload.

## 3. Basic auth fungerar inte efter apply

**Situation:** Du har skapat en Secret med htpasswd-output for Traefik basic auth och appliccerat den. Nar du kor `curl -u devops:chas123 https://<host>/` far du fortfarande 401 Unauthorized, fastan losenordet stammer. Du kor `kubectl get secret testrest-basic-auth -o yaml` och avkodar `users`-vardet med `base64 -d` — det ser konstigt ut, hash-strangen ar avhuggen och saknar delar som skulle borjat med `$apr1$`.

**Frågor:**
- Vad ar troligaste orsaken?
- Hur fixar du det?

**Modellsvar:** **Orsak:** Du skapade secreten utan enkelfnuttar runt htpasswd-strangen. Shellet evaluerade `$apr1`, `$....` osv som variabler — de var tomma — och du fick en trasig hash sparad i secreten.

**Diagnos:** Du har redan sett att den avkodade strangen ar avhuggen. Det bekraftar shell-expansion. Kor om kommandot i ditt eget shell utan apply for att se vad shellet faktiskt expanderar till.

**Fix:** Anvand enkelfnuttar runt hela strangen sa shellet later dollar-tecknen vara:

```bash
kubectl create secret generic testrest-basic-auth \
  --from-literal=users='devops:$apr1$....$....' \
  --dry-run=client -o yaml > secret.yml
kubectl apply -f secret.yml
```

Verifiera efterat med `kubectl get secret testrest-basic-auth -o jsonpath='{.data.users}' | base64 -d` — hela strangen ska finnas dar.
