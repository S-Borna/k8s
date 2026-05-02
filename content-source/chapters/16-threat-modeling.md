---
id: 16
title: "Threat modeling Kubernetes"
titleSv: "Hotmodellering av Kubernetes"
estimatedMinutes: 35
---

# Sammanfattning

Innan du säkrar något måste du förstå **vad du säkrar mot**. Threat modeling är processen att systematiskt identifiera hot mot ett system. Boken använder **STRIDE** — en etablerad modell.

## STRIDE

Sex kategorier av hot:

**S**poofing — utger sig för att vara någon annan
**T**ampering — modifierar data utan tillåtelse
**R**epudiation — förnekar att man gjort något
**I**nformation disclosure — läcker känslig data
**D**enial of service — gör systemet otillgängligt
**E**levation of privilege — får högre rättigheter än man ska

Varje komponent i K8s har potentiella hot inom dessa kategorier.

## Hot mot API server

**Spoofing:** Stulna service account tokens, komprometterade certifikat. Mitigation: rotate credentials, OIDC + MFA, audit.

**Tampering:** Direktedits till etcd, ändrade admission webhooks. Mitigation: encrypt etcd at rest, immutable infrastructure.

**Information disclosure:** Secrets visade i logs, exponerad metrics endpoint. Mitigation: noggrann RBAC, ingen Secret-data i logs.

**DoS:** Flooding API server med requests. Mitigation: rate limiting, request quotas.

**Elevation of privilege:** Bristfällig RBAC, default service accounts med för mycket access. Mitigation: least privilege, audit RBAC regelbundet.

## Hot mot Pods och containers

**Container escape:** Kod i container kommer ut till host. Mitigation: PodSecurityStandards (begränsa privileged, hostPath, etc).

**Image tampering:** Modifierade images i registry. Mitigation: image signing (Cosign), trusted registries, scanning.

**Run-time attacks:** Container kompromitteras under körning. Mitigation: runtime security (Falco), nätverksisolering (NetworkPolicies).

## Hot mot nätverket

**Lateral movement:** Komprometterad Pod attackerar andra Pods. Mitigation: NetworkPolicies (default deny + explicit allow).

**Man in the middle:** Avlyssning mellan komponenter. Mitigation: mTLS överallt (service mesh kan hjälpa).

**Exposed services:** Service oavsiktligt publik. Mitigation: regelbunden audit, default deny ingress.

## Hot mot supply chain

**Komprometterad dependency:** Bibliotek i container är komprometterad. Mitigation: SBOM (Software Bill of Materials), regular scanning, dependency pinning.

**Komprometterad CI/CD:** Pipeline kompromitteras, deployar trojaner. Mitigation: signera builds, audit pipelines, hardening.

## Threat modeling-process

1. **Diagrammera systemet** — vad finns, hur kommunicerar det?
2. **Identifiera trust boundaries** — var byter trust?
3. **Lista hot per komponent** — använd STRIDE
4. **Prioritera** — hur sannolikt? Hur stor impact?
5. **Mitigera** — vad kan vi göra?

# Giacomos tillägg

<!-- Fylls i efter lektionen -->

# Lektion

<!-- Fylls i efter lektionen -->

# Hands-on

## 1. Audit RBAC

```bash
kubectl auth can-i --list
```

Förväntat: Lista över allt du kan göra. Bra att veta för ditt eget konto.

## 2. Hitta Pods som kör som root

```bash
kubectl get pods --all-namespaces -o jsonpath='{range .items[?(@.spec.securityContext.runAsUser==0)]}{.metadata.name}{"\n"}{end}'
```

## 3. Hitta service accounts som har cluster-admin

```bash
kubectl get clusterrolebindings -o json | jq -r '.items[] | select(.roleRef.name=="cluster-admin") | "\(.metadata.name): \(.subjects)"'
```

## 4. Skanna för exposed services

```bash
kubectl get svc --all-namespaces --field-selector spec.type=LoadBalancer
```

Förväntat: Lista över alla LoadBalancer Services. Bör vara exakt det du förväntar dig - inget mer.

## 5. Kolla privileged Pods

```bash
kubectl get pods --all-namespaces -o jsonpath='{range .items[?(@.spec.containers[*].securityContext.privileged==true)]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'
```

# Lektion hands-on

<!-- Fylls i efter lektionen -->

# Flashcards

## Q: Vad är STRIDE?

**A:** Threat modeling-modell med sex kategorier av hot: Spoofing (utger sig för annan), Tampering (modifierar data), Repudiation (förnekar handling), Information disclosure (läcker data), Denial of service (otillgänglig), Elevation of privilege (får högre rättigheter). Används systematiskt för att identifiera hot mot ett system.

## Q: Varför är supply chain-hot kritiska för K8s?

**A:** En K8s-app består av många lager: bas-image, dependencies, app-kod, helm charts, tooling i pipeline. Komprometteras något lager påverkas slutprodukten. Recent attacks (SolarWinds, log4j) visade detta. Mitigation: SBOM, signering, dependency scanning, trusted registries.

## Q: Vad är "container escape"?

**A:** När kod inuti en container lyckas bryta sig ut till värdsystemet (noden). Allvarligt - en komprometterad container kan då attackera andra Pods, läsa filer på noden, eller eskalera privilegier. Mitigation: kör inte som root, använd PodSecurityStandards, runtime security som Falco.

## Q: Vad är NetworkPolicies bra för?

**A:** Begränsar nätverkstrafik mellan Pods. Default i K8s: alla Pods kan prata med alla. NetworkPolicy = "default deny + explicit allow". Förhindrar lateral movement - om en Pod komprometteras kan attackeraren inte fritt scanna och attackera andra Pods. Kräver CNI som stödjer det (Calico, Cilium).

## Q: Vad är "lateral movement"?

**A:** När en attackerare har komprometterat en del av systemet och rör sig vidare till andra delar. T.ex. komprometterad webb-Pod scannar internt nätverk och attackerar databas. K8s default: Pods kan prata fritt - perfekt för lateral movement. NetworkPolicies + zero trust mitigerar.

## Q: Vad är ett "trust boundary"?

**A:** Gräns där tillit byter - t.ex. mellan internet och kluster, mellan namespace, mellan workload och infrastruktur. Vid trust boundaries behövs autentisering och auktorisering. Identifiera dem är första steget i threat modeling.

## Q: Varför är default service account farligt?

**A:** Default SA finns i varje namespace och används om Pod inte specifierar serviceAccountName. Ofta har den för många permissions historiskt. Best practice: ge default SA inga permissions, skapa specifika SA per workload med minimala rättigheter (least privilege).

## Q: Vad är "image scanning" och varför viktigt?

**A:** Skanning av container images för kända sårbarheter (CVE) i base image, OS-paket, app-dependencies. Verktyg: Trivy, Snyk, Grype. Görs i CI/CD och regelbundet i registry. Hittar problem innan de når prod. Compliment: image signing för att säkerställa att image inte modifierats efter scanning.

## Q: Vad är "image signing"?

**A:** Kryptografisk signatur på container image som bevisar att den kommer från betrodd källa och inte modifierats. Verktyg: Cosign (Sigstore). K8s admission controllers kan kräva signerade images - oksignerade avvisas. Försvårar supply chain-attacker.

## Q: Hur prioriterar man hot vid threat modeling?

**A:** Två dimensioner: sannolikhet (hur troligt att det händer?) × impact (hur illa är det om det händer?). Hög sannolikhet + hög impact = top priority. Modeller som DREAD (Damage, Reproducibility, Exploitability, Affected users, Discoverability) ger mer struktur. Mål: addera mest värde med begränsade resurser.
