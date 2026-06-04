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

Giacomo öppnade med passet-och-biljetten:

> "Authentication säger vem du är. Authorization säger vad du får göra. På flygplatsen — ID:t släpper dig in i terminalen, biljetten släpper dig ombord på planet."

Om identitetsstrings i kubeconfig:

> "Har du rätt nyckel får du in, oavsett om du heter Alexander eller Axel."

På Vincents fråga om devs behörigheter svarade Giacomo:

> "Ja, ofta read-only. Se deployments, pods, events. DevOps-kultur = skifta driftansvar mot devs. Men spärra ändå max — devs vågar jobba om de inte kan ta ner prod."

Om pod-verbs (lätt missat):

> Tentarelevant: Pods har ingen `update`-verb. Du uppdaterar inte en podd — du raderar och skapar en ny. Det följer immutability-mönstret i Kubernetes.

Om Forbidden vs Unauthorized:

> Tentarelevant: Unauthorized = authN-fel (inte inloggad, token borta/fel). Forbidden = authZ-fel (inloggad, men saknar RBAC-behörighet). Blanda inte ihop dem på tentan.

Om cluster-admin:

> "Behandla cluster-admin som Linux root. Dela inte ut. Använd inte dagligen. Ha en kopia för nödfall. Ge minsta möjliga behörighet — det är både spårbarhet och säkerhet."

Om live-editering av Role:

> Tentarelevant: K8s cachar inte behörighet. Edita en Role och nästa request får ny effekt direkt — ingen ombindning, ingen restart krävs.

LIA-tipset han avslutade med:

> "Första kommandot på ny kubeconfig: `kubectl auth can-i --list`. Får du `* *` på prod är det röd flagga — gå till handledaren. RBAC stöter du på direkt när du installerar appar, de behöver service accounts."

# Lektion

Giacomo öppnade kapitlet med flygplats-analogin. Allt som pratar med Kubernetes — kubectl, controllers, Pods, operators — går mot API-servern. Innan request når etcd passerar den tre kontroller i ordning.

Först **authentication (authN)**: "är du den du påstår?" Det är passet på flygplatsen. Giacomo: "Har du rätt nyckel får du in, oavsett om du heter Alexander eller Axel." Misslyckas det — `Unauthorized`. Inte inloggad.

Sen **authorization (authZ)**: "får du göra detta?" Du har giltigt ID men behöver också rätt biljett för att sätta dig på planet. Misslyckas det — `Forbidden`. Du är inloggad, men saknar behörighet.

Sist **admission control**: körs efter authN+authZ. Mutating-controllers kan ändra requesten på vägen (t.ex. lägga till sidecar). Validating-controllers säger ja eller nej (säkerhetspolicies, Kyverno, OPA).

Giacomos egna ord: "Jag kan bevisa att jag är GG (authN), men får GG radera kube-system (authZ)?" Han knöt det direkt till `permission denied` som ni stötte på under labben — det var authZ som sa nej, inte authN.

## Forbidden vs Unauthorized

En distinktion Giacomo ville att alla ska kunna utantill:

- **Unauthorized** = authN-fel. Token borta, fel cert, inte inloggad alls.
- **Forbidden** = authZ-fel. Inloggad, men RBAC säger nej.

Får du `Forbidden` i kubectl — det är aldrig en login-fråga. Det är en behörighets-fråga.

## Ingen egen identitetsdatabas

Giacomo tryckte hårt på det här: Kubernetes har **ingen egen User-tabell**. Det finns inget `kubectl create user`. Identitet kommer alltid utifrån — client certificates, bearer tokens, eller en extern provider (AD, moln-IAM, OIDC). Allt landar i kubeconfig.

Username-fältet i kubeconfig är bara en etikett. Det är token eller cert som identifierar dig. Giacomo bytte bara token under demon (behöll username) — det funkade ändå, för API-servern bryr sig om kryptot, inte strängen.

Subjects i RBAC är tre saker: **users**, **service accounts**, **groups**.

## RBAC — default deny

RBAC är en allow-list, inte en block-list. **Default deny**: ingenting tillåts förrän det är explicit beviljat. Fördelen: du kan lista exakt vad en användare får göra.

Fyra byggstenar:

- **Role** — namespaced. subject–verb–resource. Typ "get/list på pods i doe25-gg".
- **RoleBinding** — namespaced. Kopplar en Role till user/SA/group.
- **ClusterRole** — cluster-wide. Krävs för icke-namespaced resurser som nodes och PersistentVolumes.
- **ClusterRoleBinding** — cluster-wide.

Mixning funkar: du kan binda en ClusterRole med en RoleBinding i ett specifikt namespace — då gäller cluster-rollens regler men bara i det namespace.

## Verbs = HTTP-metoderna

Verbs är `get`, `list`, `watch`, `create`, `update`, `patch`, `delete`. Giacomo släppte en detalj som lätt blir tentafråga: "Pods har ingen `update` — du uppdaterar inte en podd, du raderar och skapar ny." Det är immutability-mönstret i Kubernetes — pods byts ut, ändras inte.

## Cluster-admin = root

Den som skapar klustret får cluster-admin kubeconfig — `*` på `*`. Giacomo jämförde rakt av med Linux root:

- Dela inte ut.
- Använd inte dagligen.
- Ha en kopia i kassaskåp för nödfall.
- Ge alltid minsta möjliga behörighet till andra.

Två skäl: spårbarhet (vem gjorde vad) och säkerhet (komprometterad token = hela klustret komprometterat).

Hans labb-setup illustrerade det: per-student har vi en egen SA + Role + RoleBinding + en ClusterRole (för att kunna lista nodes/storage classes och skapa PVs). Giacomo: "Ni ska kunna labba utan att sabba — annars vågar ni inte experimentera."

## Live-demo: RBAC-användare från scratch

Giacomo körde hela kedjan på storduken. Först kubeconfig-inspektion:

```bash
kubectl config view
```

Han var tydlig: **aldrig `cat` på filen**. Token blir då synlig i terminalen. `config view` redactar känsliga fält. Strukturen i kubeconfig är tre listor + ett current-context:

- `clusters` — endpoint + CA-cert
- `users` — token eller client cert
- `contexts` — kombo av user + cluster + namespace
- `current-context` — vilken som är aktiv

Sen identitet och behörighet:

```bash
kubectl auth whoami
kubectl auth can-i create pods
kubectl auth can-i --list
kubectl auth can-i '*' '*'        # cluster-admin?
```

`--list` dumpar allt du får göra. `'*' '*'` är cluster-admin-checken. GG-kontot fick `no` på `* *`. När Giacomo switchade till admin-kubeconfig (client cert) fick samma kommando `yes`.

Sen genererade han en token mot SA:n:

```bash
kubectl create token pod-reader -n doe25-gg --duration=30m
```

Han bytte bara token-fältet i kubeconfig — username rörde han inte. Det funkade direkt, för token identifierar.

## Live-editera roll — ingen cachning

Det här var ögonblicket som satte sig. Giacomo gjorde:

```bash
kubectl edit role read-pods
```

Lade till `services` i `resources`. Direkt därefter kunde pod-reader lista services — utan att binda om något, utan att starta om något. K8s cachar inte behörighet. När han sen tog bort `pods` från samma roll fick samma SA `forbidden` på pods omedelbart.

Det är hela poängen med att separera identitet (SA) från behörighet (Role) via en Binding: du ändrar bara rollen, allt annat lever vidare.

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

## 1. Inspektera kubeconfig utan att läcka token

```bash
kubectl config view
```

Förväntat: clusters, users, contexts och current-context listas. Token/cert-fält är redactade. Använd ALDRIG `cat ~/.kube/config` — då hamnar token i klartext i terminalen.

## 2. Vem är jag just nu?

```bash
kubectl auth whoami
```

Förväntat: visar din identitet (user + groups) som API-servern ser dig.

## 3. Får jag göra X?

```bash
kubectl auth can-i create pods
kubectl auth can-i delete nodes
kubectl auth can-i get secrets -n kube-system
```

Förväntat: `yes` eller `no` per kommando, baserat på din RBAC.

## 4. Lista allt jag får göra

```bash
kubectl auth can-i --list
```

Förväntat: full dump av varje resurs + verb du har access till. Bra första kommando på ny kubeconfig.

## 5. Är jag cluster-admin?

```bash
kubectl auth can-i '*' '*'
```

Förväntat: `no` för vanlig SA. `yes` bara om kubeconfig är admin-cert. Får du `yes` på prod — röd flagga.

## 6. Generera kortlivad token mot service account

```bash
kubectl create token pod-reader -n doe25-gg --duration=30m
```

Förväntat: en JWT skrivs ut. Klistra in den i `users:` i kubeconfig. Username spelar ingen roll — token identifierar.

## 7. Editera en Role live och se effekten direkt

```bash
kubectl edit role read-pods -n doe25-gg
# lägg till "services" i resources, spara
kubectl auth can-i list services -n doe25-gg --as=system:serviceaccount:doe25-gg:pod-reader
```

Förväntat: `yes` direkt efter save. Ingen ombindning, ingen restart. K8s cachar inte behörighet.

## 8. Ta bort en resurs från Role och bekräfta blockering

```bash
kubectl edit role read-pods -n doe25-gg
# ta bort "pods" från resources
kubectl auth can-i list pods -n doe25-gg --as=system:serviceaccount:doe25-gg:pod-reader
```

Förväntat: `no` omedelbart. Forbidden vid riktiga anrop.

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
