---
id: 4
title: "Working with Pods"
titleSv: "Arbeta med Pods"
estimatedMinutes: 45
---

# Sammanfattning

Pods är K8s **minsta deploybara enhet**. Inte en container — en Pod **innehåller** containers (oftast en, ibland flera). Förstår du Pods förstår du grunden i hur K8s kör appar.

## Vad är en Pod?

En Pod är ett wrapper runt en eller flera containers som delar:

- **Nätverks-namespace** — samma IP, samma `localhost`, samma portar
- **Storage volumes** — kan dela filer mellan containers
- **Lifecycle** — startas och stoppas tillsammans

Tänk på en Pod som en **logisk maskin** där containers är processer.

## Varför Pods och inte bara containers?

Multi-container Pods möjliggör mönster som inte funkar med ensamma containers:

**Sidecar** — hjälpcontainer bredvid huvudcontainer. T.ex. logshipper som läser loggar från huvudappen och skickar till central plats.

**Adapter** — översätter format. T.ex. tar metrics i ett format och exponerar dem i Prometheus-format.

**Ambassador** — proxy mot omvärlden. T.ex. service mesh sidecar som hanterar TLS och retries.

I 99% av fallen är en Pod = en container. Multi-container är för specifika mönster.

## Pod-livscykel

Pods är **immutabla** — när skapad kan du inte ändra image eller config. Vill du uppdatera måste du skapa ny Pod och radera gammal. Detta görs automatiskt av Deployments.

Tillstånd:
- **Pending** — schemaläggs eller väntar på image
- **Running** — körs på en nod
- **Succeeded** — alla containers exited cleanly (för Jobs)
- **Failed** — minst en container kraschade
- **Unknown** — kubelet kan inte rapportera (nod nere)

## Probes — health checks

K8s kollar löpande om containers är friska:

**Liveness probe** — körs containern? Om nej, restarta.
**Readiness probe** — är containern redo att ta emot trafik? Om nej, ta bort från Service.
**Startup probe** — har containern startat klart? Disablar liveness/readiness tills denna passerar.

Probes kan vara HTTP, TCP, eller exec-kommando.

## Pod YAML-grunderna

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hello-pod
  labels:
    app: hello
spec:
  containers:
  - name: hello-ctr
    image: nigelpoulton/k8sbook:1.0
    ports:
    - containerPort: 8080
```

`metadata.labels` är **kritiskt** — Services och Deployments använder dem för att hitta Pods.

## Att aldrig köra Pods direkt i prod

I produktion kör du **aldrig** ensamma Pods. Du wrappar dem alltid i Deployments som ger:
- Self-healing (dör Pod, skapas ny)
- Skalning (öka antal Pods)
- Rolling updates (byt image utan nedtid)

Standalone Pods används bara för debugging eller engångsjobb.

# Giacomos tillägg

Giacomo betonade att **Pods är immutabla**. Detta är inte en designdetalj — det är **anledningen** till att K8s fungerar. Eftersom Pods inte kan ändras kan systemet alltid återskapa dem från YAML. Det är basen för rolling updates, rollbacks, och self-healing.

> 💡 Tentarelevant: Containers i samma Pod delar `localhost`. Skriv detta som test på tentan om frågan rör multi-container.

> 💡 Tentarelevant: Förklara varför Pods är immutabla. Svaret involverar reconciliation och self-healing.

# Lektion

**Lektion 10 april — Kap 4: Working with Pods**

Den här lektionen var primärt en **live-kodning av en multi-container Pod från scratch** plus en felsökningsövning. Giacomo byggde upp komplexitet steg för steg så vi såg varför multi-container-mönstret faktiskt är användbart.

## Live-kodning: Multi-container Pod från scratch

Giacomo byggde en Pod steg för steg framför klassen:

1. **Startade enkelt:** En nginx-Pod. Browser visade default Welcome to Nginx-sidan.
2. **La till `emptyDir`-volym** och mountade den till nginx på `/usr/share/nginx/html`. Nu var nginx-katalogen tom → 403 Forbidden.
3. **La till init container** som skapade `index.html` med en heredoc i samma volym. Nu visade nginx den custom-HTML.
4. **La till writer-container (sidecar)** som var 5:e sekund skrev en `status.html` med aktuell tid till samma volym.
5. **`index.html` embeddade `status.html`** via iframe + auto-refresh. Resultat: tre containers i en Pod som delar volym — init skapar, sidecar skriver, nginx serverar.

Detta var den första riktiga "aha" — varför skulle man ha flera containers i en Pod? **För att de delar volym och localhost** och kan samarbeta som en logisk enhet.

## Felsökningsövning (pod-workshop)

Giacomo delade ett trasigt manifest med klassen. Alla deployade det. Resultat: nginx visade default-sidan istället för custom-innehåll. Vi skulle hitta felet.

**Felet:** `mountPath: /usr/share/nginx/htlm` — `htlm` istället för `html`. Nginx hittade inga filer på rätt path och föll tillbaka på default.

**Felsökningstips från Giacomo:**
- **Exec in i containers** och kolla att filer finns där du förväntar dig
- **Lägg till echo-statements** och kolla loggar med `kubectl logs`
- **Testa i incognito-fönster** — browser cache kan visa gamla svar och förvirra felsökningen

Lisa hade fixat felet men trodde fortfarande att den var trasig — det var browser cachen. Klassiskt.

## Q&A — viktiga insikter

### `localhost` delas mellan containers (TENTAFRÅGA)

Giacomo visade att writer-containern kunde curla `localhost` och få svar från nginx-containern. Det är **inte** två separata localhost — det är **en och samma nätverksstack**.

Giacomo sa rakt ut: "Det här kommer på tentan, och många svarar fel. Containers i samma Pod delar nätverks-namespace, alltså localhost, alltså portar."

### Resource requests och limits — hur bestämmer man värden?

Inte gissa. Stegen:

1. **Deploya utan limits** initialt
2. **Samla metrics** (CPU/minne) under minst ett dygn
3. **Basera requests/limits på observerad användning**
4. **Justera kontinuerligt** — laster följer mönster (dygn, vecka, månad, år)
5. För höga requests = slösar resurser. För låga limits = onödiga restarts.

### API-versioner

- **`v1`** — standard för de flesta resurser
- **`v1beta1`** — nya resurser under utveckling, kan förändras
- **`v1alpha1`** — ännu mer experimentellt, av/på via flagga
- **CRDs från tredjepartsprodukter** har egna API-versioner
- Vid klusteruppgradering kan beta-resurser ha blivit stabila → måste uppdatera manifest

### Affinity/anti-affinity — praktiska exempel

- **GPU-workloads** → affinity mot noder med GPU
- **Databaser** → affinity mot noder optimerade för storage (NVMe)
- **Taints är binära** (klarar/klarar inte). **Affinity är probabilistiskt** (mer/mindre sannolikt).

### Exec — OK för felsökning, inte för produktion

Installerar du curl via `kubectl exec` försvinner det när Podden dör. Bättre: **bygg custom image med verktyg pre-installerade** för långvariga felsökningsbehov.

### EmptyDir-volymer

`emptyDir` = **temporär volym som delar Podens livscykel**. Försvinner när Podden dör. Används för att dela data mellan containers i samma Pod. Kan mountas på olika paths i olika containers.

## Problem som uppkom under lektionen

- **Image pull errors:** Flera studenter (Victor, Lisa, Alexander) hade problem med att pulla images från Docker Hub. Kan bero på rate limiting eller Docker Desktop-bugg. Lösning: `docker pull <image>` lokalt först innan deploy.
- **Events inte synliga i labbklustret:** `kubectl describe` visar inga events i doe25-labb. Giacomo skulle kolla behörigheter.
- **LoadBalancer `<pending>`:** Inga externa IP:ar i labbmiljön eller lokalt. Använd port-forward.
- **Browser cache:** Lisa hade fixat felet men såg fortfarande nginx default — löstes med incognito-fönster.

## Kurslogistik (från lektionen)

- **Måndag:** Kapitel 5 (Namespaces) — kort kapitel, ~1 timmes lektion. Testas lokalt (bara en namespace i labbmiljön).
- **Klassmöte:** 09:30, lektion 10:00
- **Extra handledning:** Giacomo försöker få Martin att ge handledning på äldre ämnen (monitoring, Portainer, CI/CD)
- **Docker Compose:** Fortfarande relevant för Portainer. På sikt ersätts av K8s-manifest. Övergångsperiod.
- **Nästa K8s-kurs (hösten):** Fokus på att DRIFTA K8s. Grupper får lista av krav, löser själva med CI/CD.

# Hands-on

## 1. Skapa en Pod imperativt

```bash
kubectl run hello-pod --image=nigelpoulton/k8sbook:1.0
kubectl get pods
```

Förväntat: Pod `hello-pod` blir `Running` efter några sekunder.

## 2. Inspektera Podden

```bash
kubectl describe pod hello-pod
```

Förväntat: Allt om Podden — image, IP, nod, events. Events är guld vid felsökning.

## 3. Kolla loggar

```bash
kubectl logs hello-pod
```

Förväntat: Containerns stdout/stderr.

## 4. Exec in i Podden

```bash
kubectl exec -it hello-pod -- sh
```

Förväntat: Du är inne i containern. Kör `ls`, `ps`, `exit` för att gå ut.

## 5. Verifiera immutability

```bash
kubectl edit pod hello-pod
# Försök ändra image-fältet och spara
```

Förväntat: Felmeddelande att Pod är immutable. Vill du ändra image: radera Podden, skapa ny.

## 6. Skapa Pod deklarativt

Skapa fil `pod.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hello-yaml
  labels:
    app: hello
spec:
  containers:
  - name: hello-ctr
    image: nigelpoulton/k8sbook:1.0
    ports:
    - containerPort: 8080
```

```bash
kubectl apply -f pod.yaml
kubectl get pods
```

Förväntat: Båda Pods (`hello-pod` och `hello-yaml`) körs.

## 7. Städa

```bash
kubectl delete pod hello-pod hello-yaml
```

# Lektion hands-on

Reproducera Giacomos multi-container demo:

## 1. Bygg upp multi-container Pod stegvis

Skapa `multi-pod.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi
  labels:
    app: multi
spec:
  volumes:
  - name: shared
    emptyDir: {}
  initContainers:
  - name: init
    image: busybox:1.36
    command: ["sh", "-c"]
    args:
    - |
      cat > /shared/index.html <<EOF
      <html>
        <body>
          <h1>Hello from init container</h1>
          <iframe src="status.html" style="border:0; height:50px"></iframe>
          <script>setTimeout(() => location.reload(), 5000)</script>
        </body>
      </html>
      EOF
    volumeMounts:
    - name: shared
      mountPath: /shared
  containers:
  - name: writer
    image: busybox:1.36
    command: ["sh", "-c"]
    args:
    - |
      while true; do
        echo "<p>Time: $(date)</p>" > /shared/status.html
        sleep 5
      done
    volumeMounts:
    - name: shared
      mountPath: /shared
  - name: nginx
    image: nginx
    ports:
    - containerPort: 80
    volumeMounts:
    - name: shared
      mountPath: /usr/share/nginx/html
```

```bash
kubectl apply -f multi-pod.yaml
kubectl port-forward pod/multi 8080:80
```

Öppna `http://localhost:8080` i incognito → ska visa "Hello from init container" + uppdaterande tid.

## 2. Bevisa att containers delar localhost

```bash
kubectl exec -it multi -c writer -- wget -qO- localhost
```

Förväntat: HTML-svar från nginx-containern. Båda är samma Pod — samma localhost.

## 3. Reproducera htlm-buggen

Ändra `mountPath: /usr/share/nginx/html` → `htlm` (typo). Apply om. Reload browser i incognito → nginx default-sida.

Felsökning:
```bash
kubectl exec -it multi -c nginx -- ls /usr/share/nginx/html    # tom
kubectl exec -it multi -c nginx -- ls /usr/share/nginx/htlm    # där filerna finns
```

## 4. Cleanup

```bash
kubectl delete pod multi
```

# Flashcards

## Q: Vad är en Pod och varför finns den?

**A:** Pod är K8s minsta deploybara enhet, ett wrapper runt en eller flera containers som delar nätverk och volumes. Anledningen: möjliggör multi-container-mönster (sidecar, adapter, ambassador) och ger ett konsekvent abstraktionslager för K8s att hantera. Containers själva är för låga; Pods är rätt nivå.

## Q: Vad delar containers i samma Pod?

**A:** Nätverks-namespace (samma IP, samma localhost, samma portar), storage volumes (kan dela filer), och lifecycle (startas och stoppas tillsammans). Detta är **anledningen** till att de räknas som en Pod - de är så tätt kopplade att de fungerar som en logisk enhet.

## Q: Varför är Pods immutabla?

**A:** Eftersom Pods inte kan ändras kan systemet alltid återskapa dem från YAML. Detta är basen för rolling updates, rollbacks, och self-healing. Om Pods kunde muteras skulle K8s aldrig kunna garantera att en Pod matchar sin specifikation - reconciliation skulle bli omöjligt.

## Q: Vad är skillnaden mellan liveness och readiness probe?

**A:** Liveness = "körs containern?" - failar den, restartas containern. Readiness = "är containern redo för trafik?" - failar den, tas Podden ut ur Service-rotationen men startas inte om. Liveness fixar trasiga containers; readiness skyddar trafik från containers som inte är redo (t.ex. startar upp eller är överbelastade).

## Q: När kör man Pods direkt utan Deployment?

**A:** Bara för debugging eller engångsjobb. I produktion alltid via Deployment (eller Job/CronJob för engångsuppgifter). Standalone Pods saknar self-healing - dör Podden är den borta för alltid.

## Q: Vad är ett sidecar-mönster?

**A:** En hjälpcontainer i samma Pod som huvudcontainern. Vanligast: logshipper som läser huvudappens loggar och skickar dem till central plats. Andra exempel: service mesh proxy (Istio), config-reloader. Funkar för att containers i samma Pod kan dela volumes och prata via localhost.

## Q: Vad gör `kubectl exec`?

**A:** Kör ett kommando inuti en körande container, ofta `sh` eller `bash` för interaktiv shell. Användbart för felsökning - du kan kolla filer, processer, nätverk inifrån containern. `-it` för interactive + tty.

## Q: Vilka tillstånd kan en Pod vara i?

**A:** Pending (schemaläggs eller väntar på image), Running (körs), Succeeded (alla containers exited cleanly - för Jobs), Failed (minst en container kraschade), Unknown (kubelet kan inte rapportera, oftast nod nere). Pending som fastnar är vanligaste felet - kolla events med `kubectl describe`.

## Q: Vad är en init-container?

**A:** Container som körs **innan** huvudcontainerna i en Pod. Måste exitera framgångsrikt innan main containers startar. Användbart för setup: vänta på databas, migrera schema, ladda ner config. Init-containers körs sekventiellt, main-containers parallellt.

## Q: Varför är labels på Pods kritiska?

**A:** Services och Deployments hittar Pods via labels (selectors). Utan rätt labels på Pods skulle Service inte hitta dem och trafik skulle inte routas. Labels är limmet som binder ihop K8s-objekt - de gör loose coupling mellan Pods och konsumenter möjligt.

## Q: Hur bestämmer man rätt resource requests och limits?

**A:** Inte gissa - mät. Deploya utan limits initialt, samla metrics under minst ett dygn, basera requests/limits på observerad användning, justera kontinuerligt eftersom laster följer mönster (dygn/vecka/månad/år). För höga requests slösar resurser. För låga limits ger onödiga OOM-killar.

## Q: Vad är emptyDir och när används det?

**A:** Temporär volym som delar Podens livscykel - skapas när Pod skapas, försvinner när Pod dör. Används för att dela data mellan containers i samma Pod (cache, scratch space, shared files). Inte för persistent data - då behövs PersistentVolume.
