---
id: 17
title: "Real-world Kubernetes Security"
titleSv: "K8s-säkerhet i verkligheten"
estimatedMinutes: 50
---

# Sammanfattning

Föregående kapitel handlade om threat modeling — detta kapitel om praktiska implementationer. Hur **säkrar man faktiskt** ett K8s-kluster i prod?

## Cluster hardening

**API server:**
- Disable anonymous auth
- Require TLS för all kommunikation
- Audit logging aktiverat
- Rate limiting

**etcd:**
- Encryption at rest
- Backup regelbundet
- Access begränsad till control plane

**Kubelet:**
- Disable anonymous access
- Require certificate authentication
- Read-only port disabled

## PodSecurityStandards (PSS)

Tre nivåer av security policies, K8s-inbyggda:

**Privileged** — ingen restriktion, för system-Pods. Använd inte för apps.

**Baseline** — minimal restriktion: ingen privileged container, ingen hostNetwork/hostPID/hostIPC, etc. Default för de flesta.

**Restricted** — strikt: kör inte som root, read-only root filesystem, drop alla capabilities, etc. För känsliga workloads.

Tillämpas per namespace via labels:

```bash
kubectl label namespace my-app pod-security.kubernetes.io/enforce=baseline
```

## NetworkPolicies

Default i K8s: all traffic allowed mellan Pods. NetworkPolicy = explicit allowlist.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
spec:
  podSelector: {}
  policyTypes:
  - Ingress
```

Detta blockerar all incoming traffic till Pods i namespacet. Sedan lägger du till explicita allow-regler.

## Secrets management

**K8s Secrets** är base64, inte krypterade by default. Lös detta genom:

- **Encryption at rest** för etcd
- **External secrets operator** — sync från Vault, AWS Secrets Manager
- **Sealed Secrets** — krypterade i Git, dekrypteras i klustret
- **Aldrig commita Secrets till Git**

## Image security

- Använd minimala base images (distroless, alpine)
- Scanna images för CVE i CI/CD
- Signera images (Cosign)
- Pull från trusted registries
- Pin image versions (inte `latest`)

## Runtime security

- **Falco** — detekterar misstänkt beteende i runtime
- **Audit logs** — spara API-requests för forensik
- **Centralize logs** — viktigt för incident response

## Service mesh

För större miljöer: Istio, Linkerd, Cilium. Ger:

- mTLS mellan alla Pods
- Detaljerad observability
- Traffic policies (rate limiting, circuit breaking)
- Säkerhetspolicies

Trade-off: komplexitet. Inte alltid värt det.

## Defense in depth

Inga enskilda kontroller räcker. Lager dem:

1. **Cluster** — hardening, RBAC
2. **Network** — NetworkPolicies, mTLS
3. **Pod** — PSS, securityContext
4. **Container** — minimal images, no root
5. **Application** — sanitization, auth, encryption
6. **Runtime** — Falco, audit logs

Komprometteras ett lager finns andra som skydd.

## Incident response

Förbered:

- Audit logs aktiverat och centraliserat
- Backups av etcd och PVs
- Runbooks för vanliga incidents
- Tested recovery procedures

När det händer:

1. Isolera (NetworkPolicies, taints)
2. Bevara evidence (snapshots, logs)
3. Investigate (vad kompromiterades, hur?)
4. Remediate (rotera credentials, patcha)
5. Lär (post-mortem, förbättra)

# Giacomos tillägg

<!-- Fylls i efter lektionen -->

# Lektion

<!-- Fylls i efter lektionen -->

# Hands-on

## 1. Lägg på baseline PSS på ett namespace

```bash
kubectl create namespace secure-app
kubectl label namespace secure-app pod-security.kubernetes.io/enforce=baseline
```

## 2. Försök skapa en privileged Pod (ska blockas)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: bad-pod
  namespace: secure-app
spec:
  containers:
  - name: app
    image: nginx
    securityContext:
      privileged: true
```

Förväntat: API server avvisar med "violates PodSecurity".

## 3. Skapa default-deny NetworkPolicy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: secure-app
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

## 4. Audit RBAC

```bash
kubectl get clusterrolebindings -o json | jq -r '.items[] | "\(.metadata.name): \(.roleRef.name)"'
```

Förväntat: Lista över alla cluster-wide bindings. `cluster-admin` bör vara minimal.

## 5. Kolla efter latest-tag images

```bash
kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[*].image}{"\n"}{end}' | grep -E ':latest|^[^:]+$'
```

# Lektion hands-on

<!-- Fylls i efter lektionen -->

# Flashcards

## Q: Vad är PodSecurityStandards (PSS)?

**A:** K8s-inbyggda security policies i tre nivåer: Privileged (ingen restriktion), Baseline (minimal - ingen privileged, ingen host*), Restricted (strikt - non-root, no capabilities). Tillämpas per namespace via labels. Ersatte gamla PodSecurityPolicies.

## Q: Vad är skillnaden mellan baseline och restricted PSS?

**A:** Baseline = minimum-restriktion för att förhindra kända container-escapes. Stoppar privileged, hostNetwork, hostPID. Bra för de flesta workloads. Restricted = strikt - kör inte som root, read-only root fs, drop alla capabilities. För känsliga apps. Restricted bryter många apps utan anpassning.

## Q: Varför är NetworkPolicies kritiska?

**A:** Default: all-to-all traffic mellan Pods - perfekt för lateral movement vid kompromettering. NetworkPolicy = "default deny + explicit allow". Begränsar blast radius. Kräver CNI som stödjer det (Calico, Cilium - INTE Flannel default).

## Q: Vad är skillnaden mellan ingress och egress i NetworkPolicy?

**A:** Ingress = inkommande trafik TILL Pods (vilka kan nå dig). Egress = utgående trafik FRÅN Pods (vart får du gå). Båda riktningar bör begränsas i strikt setup. Ingress ofta enklare; egress kräver att man tänker på vad apps faktiskt behöver nå (DNS, externa API).

## Q: Vad är "encryption at rest" för etcd?

**A:** K8s-feature som krypterar alla resurser (speciellt Secrets) innan de skrivs till etcd. Utan det: Secrets är base64 i etcd, läsbara om någon når disken. Med det: behövs nyckel för att läsa. Kombinera med disk encryption på OS-nivå för fullständigt skydd.

## Q: Vad är Sealed Secrets?

**A:** Verktyg som krypterar K8s Secrets så de kan checkas in i Git säkert. SealedSecret kan bara dekrypteras av controllern i klustret - även med fil i Git kan ingen utomstående läsa innehållet. Lösning på "hur lägger jag Secrets i Git?".

## Q: Vad är Falco?

**A:** Runtime security tool som monitorerar syscalls och container-beteende i realtid. Detekterar misstänkt aktivitet: shell spawnat i container, läsning av sensitive files, network anomalies. Skickar alerts. CNCF-projekt, vanligt i prod.

## Q: Vad är "defense in depth"?

**A:** Säkerhetsprincip: använd flera lager av kontroller så att ingen enskild kompromettering räcker. K8s exempel: cluster hardening + RBAC + NetworkPolicies + PSS + image scanning + runtime monitoring + audit logs. Komprometteras ett lager finns andra som skyddar.

## Q: Varför ska man pin image versions istället för :latest?

**A:** `:latest` är icke-deterministiskt - kan ändras mellan deployments. Skapar drift mellan miljöer (dev kör annan version än prod). Förhindrar reproducerbar deployments. Allvarlig säkerhetsrisk: en attackerare som komprometterar en image-tag kan oavsiktligt deployas. Pin med semantic version eller bättre: digest (`@sha256:...`).

## Q: Vad är ett service mesh och vad ger det säkerhetsmässigt?

**A:** Infrastruktur-lager för service-to-service kommunikation (Istio, Linkerd, Cilium). Säkerhet: automatisk mTLS mellan alla Pods, fina-granulära auth policies, observability. Trade-off: komplexitet, performance overhead, learning curve. Bra för stora microservice-miljöer; overkill för små appar.
