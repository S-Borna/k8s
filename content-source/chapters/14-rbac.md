---
id: 14
title: "API Security and RBAC"
titleSv: "API-säkerhet och RBAC"
estimatedMinutes: 50
---

# Sammanfattning

K8s är **API-centrerat** — allt går genom API server. Säkerhet handlar om att kontrollera vem som får göra vad. Tre lager: **autentisering** (vem är du?), **auktorisering** (vad får du göra?), **admission control** (extra valideringar).

## Tre säkerhetslager

Varje request går genom:

**1. Autentisering** — Vem är du? Verifierar identitet via certifikat, tokens, eller external providers (OIDC). Misslyckas detta: 401 Unauthorized.

**2. Auktorisering** — Får du göra detta? Vanligast: RBAC. Misslyckas: 403 Forbidden.

**3. Admission control** — Extra valideringar. Mutating (modifierar request) och validating (godkänner/avvisar). Här kör tools som OPA, Kyverno.

## Autentisering

K8s autentiserar inte människor direkt — det gör externa system. Två kategorier av användare:

**Service accounts** — för Pods och processer i klustret. Skapas av K8s, hanteras via API.

**Users** — för människor och externa system. K8s har ingen User-objekt - identitet kommer från certifikat eller token.

Vanliga metoder:
- **Client certificates** — kubectl använder ofta detta
- **Bearer tokens** — för service accounts och external integrations
- **OIDC** — för enterprise SSO (Google, Okta)

## RBAC — Role-Based Access Control

Default auktorisering i K8s. Fyra objekt:

**Role** — vilka actions som tillåts på vilka resurser, **inom ett namespace**.
**RoleBinding** — kopplar Role till users/service accounts/groups, inom ett namespace.
**ClusterRole** — som Role men cluster-wide.
**ClusterRoleBinding** — som RoleBinding men cluster-wide.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: default
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: User
  name: alice
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

## Verbs

Standard verbs: `get`, `list`, `watch`, `create`, `update`, `patch`, `delete`, `deletecollection`. Vissa resurser har subresurser (t.ex. `pods/exec`, `pods/log`).

## Service Accounts

Varje Pod har en service account (default: `default`). Detta avgör vad Podden får göra mot API server.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
---
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  serviceAccountName: my-app
  containers:
  - name: app
    image: my-image
```

## Aggregated ClusterRoles

K8s har default ClusterRoles: `cluster-admin`, `admin`, `edit`, `view`. Använd dessa när möjligt istället för custom — färre fel, lättare audit.

## Best practices

- **Least privilege** — ge bara minsta möjliga rättigheter
- **Egna service accounts per Pod** — inte den default
- **Audit logs** — logga API-requests för spårbarhet
- **Rotate credentials** — speciellt service account tokens
- **Använd RBAC inte ABAC** — ABAC är deprecated

# Giacomos tillägg

<!-- Fylls i efter lektionen -->

# Lektion

<!-- Fylls i efter lektionen -->

# Hands-on

## 1. Visa din egen identitet

```bash
kubectl auth whoami
```

Förväntat: Visar vilken användare/grupper kubectl autentiserar som.

## 2. Testa permissions

```bash
kubectl auth can-i create deployments
kubectl auth can-i delete nodes
kubectl auth can-i get pods --namespace kube-system
```

Förväntat: `yes` eller `no` baserat på dina RBAC-rättigheter.

## 3. Skapa Service Account

```bash
kubectl create serviceaccount limited-sa
```

## 4. Skapa Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
```

```bash
kubectl apply -f role.yaml
```

## 5. Bind Role till Service Account

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods-binding
  namespace: default
subjects:
- kind: ServiceAccount
  name: limited-sa
  namespace: default
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

## 6. Testa permissions för Service Account

```bash
kubectl auth can-i list pods --as=system:serviceaccount:default:limited-sa
kubectl auth can-i delete pods --as=system:serviceaccount:default:limited-sa
```

Förväntat: `yes` för list, `no` för delete.

# Lektion hands-on

<!-- Fylls i efter lektionen -->

# Flashcards

## Q: Vilka tre säkerhetslager går varje API-request genom?

**A:** 1) Autentisering - vem är du? (certifikat, token, OIDC). 2) Auktorisering - vad får du göra? (vanligast RBAC). 3) Admission control - extra valideringar (mutating och validating webhooks). Misslyckas något av dessa avvisas requesten innan den når etcd.

## Q: Vad är skillnaden mellan Role och ClusterRole?

**A:** Role definierar permissions inom ETT namespace. ClusterRole definierar permissions cluster-wide eller på cluster-scoped resurser (Nodes, PersistentVolumes). Båda har samma syntax - skillnaden är scope. Använd Role när möjligt (least privilege).

## Q: Vad är en RoleBinding?

**A:** Kopplar en Role (eller ClusterRole) till ett subject (User, Group, eller ServiceAccount). Utan binding gör Role ingenting - det är bara en definition. Bindingen säger "denna user/SA får dessa permissions". Inom ett namespace för Role; cluster-wide för ClusterRoleBinding.

## Q: Vad är en Service Account?

**A:** En identitet för Pods (eller andra workloads) att autentisera mot API server. K8s skapar en default per namespace. För granular permissions: skapa egna Service Accounts per Pod. Service Accounts får automatiskt en bearer token monterad i Podden.

## Q: Vad är skillnaden mellan User och ServiceAccount?

**A:** User = för människor och externa system (kubectl-användare, CI/CD). Inte ett K8s-objekt - identitet kommer från cert/token. ServiceAccount = för Pods och processer inom klustret. Är ett K8s-objekt, kan skapas/raderas/listas. Båda kan bindas till Roles.

## Q: Vad gör admission controllers?

**A:** Modifierar eller validerar requests EFTER autentisering/auktorisering men FÖRE persistens till etcd. Mutating: ändrar requests (lägga till sidecar, sätta defaults). Validating: godkänner eller avvisar (säkerhetsregler, policies). Vanliga: Kyverno, OPA Gatekeeper, K8s inbyggda (PodSecurity).

## Q: Varför undviker man `cluster-admin` ClusterRole?

**A:** Ger fullständiga rättigheter över allt - violation av least privilege. Komprometterad token = hela klustret komprometterat. I prod: använd specifika roles per användning. `cluster-admin` reserveras för riktig admin-uppgifter.

## Q: Vad gör `kubectl auth can-i`?

**A:** Frågar API server om du (eller specifierad subject) får göra en viss action. Användbar för att verifiera RBAC-config utan att faktiskt göra requesten. `kubectl auth can-i delete pods --as=user@example.com` testar permissions för annan användare.

## Q: Vad är "least privilege"-principen?

**A:** Ge bara minsta möjliga permissions för att uppgiften ska fungera. CI/CD-pipeline behöver kanske bara skapa Deployments i ett namespace - inte cluster-admin. Default-mindset i K8s. Reducerar blast radius vid security incidents.

## Q: Vad händer om en Pod inte specifierar serviceAccountName?

**A:** Använder default service account i namespace. Default har minimala permissions - ofta bara basic discovery. Om Podden behöver mer (t.ex. lista Pods, skapa resurser) krävs egen Service Account med specifika RBAC-rules. Default är säker fallback.
