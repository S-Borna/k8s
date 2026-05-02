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

På lektionen visade han **multi-container Pods** med en init-container som genererade en HTML-fil och en huvudcontainer (nginx) som serverade den. Bekräftelse: containers i samma Pod delar `localhost`. **Detta är en tentafråga** — han sade det rakt ut.

Klassen gjorde också en bug-övning: en HTML-fil hade typo (`<htlm>` istället för `<html>`). Övningen handlade inte om HTML utan om felsökning — `kubectl logs`, `kubectl describe`, `kubectl exec`.

Busybox version 1.28 som boken använder funkar inte längre — använd 1.36. nslookup behöver FQDN, inte kort namn.

> 💡 Tentarelevant: Containers i samma Pod delar `localhost`. Skriv detta som test på tentan om frågan rör multi-container.

> 💡 Tentarelevant: Förklara varför Pods är immutabla. Svaret involverar reconciliation och self-healing.

# Lektion

<!-- Fylls i efter lektionen -->

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

<!-- Fylls i efter lektionen -->

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
