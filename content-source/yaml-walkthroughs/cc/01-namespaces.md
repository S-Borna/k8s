---
title: "Saids team-namespaces"
source: chas-challenge
sourceLabel: "Chas Challenge — Namespaces"
chapterId: 5
filename: "01-namespaces.yaml"
---

# Varför

Namespaces ar Saids rotpunkt i lab-klustret — varje student/team far ett eget namespace av Giacomo, och allt annat (deployments, services, secrets) hamnar dar. Manifesten visar hur ForeverHome-projektet ar isolerat fran resten av kursen pa `doe25-said-ebadi`. Pedagogiken: en enkel resurs, men det ar referenspunkten alla andra manifests i CC-mappen pekar mot via `-n`-flaggan eller kustomize.

# Kommentarsblocket — varfor finns ingen Namespace egentligen?

Forsta raderna (rad 1-11) ar inte YAML, det ar Saids egna anteckningar. Klusteradmin (Giacomo) skapar namespaces — studenter saknar rattigheter att skapa egna. Manifesten under `---` ar darfor mer en *referens* till vad som redan finns i klustret an en resurs man faktiskt applicerar. I praktiken kor Said `kubectl -n doe25-said-ebadi apply -f ...` mot sitt tilldelade namespace.

# apiVersion och kind

Rad 13-14 deklarerar att detta ar en `Namespace`-resurs i core-API:t (`v1`). Namespace ligger i core-gruppen, darfor bara `v1` — inte `apps/v1` eller liknande. Fallgrop: blandar man ihop `apiVersion` med fel kind far man `no matches for kind`-fel direkt.

# metadata.name — sjalva identifieraren

Rad 15-16 ger namespacet namnet `doe25-said-ebadi`. Det ar detta namn som hamnar i `-n`-flaggan overallt i CC-mappen. Konventionen i kursen: `doe25-<student-eller-team>` — kurskod, sen agare. Andrar man namnet har maste man andra det i *varenda* annan manifest som refererar till namespacet.

# Labels — for organisation och filtrering

Rad 17-19 satter tva labels: `app: foreverhome` knyter namespacet till Saids projekt, `managed-by: chas-academy` markerar att det ar skolan som ager det. Labels anvands av `kubectl get ns -l app=foreverhome` for att filtrera. Inte tvingande for K8s — men gor det enklare for Giacomo att se vilka namespaces som tillhor vilket projekt.

# Varfor namespace overhuvudtaget?

I lab-klustret kor alla studenter mot samma fysiska maskiner. Namespaces ger logisk separation — Saids `foreverhome-api` krockar inte med en annan students `foreverhome-api` for de ligger i olika namespaces. Resource quotas, network policies och RBAC haftas pa namespace-nivan. Utan namespaces hade hela kursen varit en enda rorig hog.

# Tentapunkter

- Vad ar ett namespace och varfor anvands det i ett delat kluster (isolation, RBAC, quotas).
- Skillnaden mellan att *deklarera* ett namespace och att *referera* till ett existerande via `-n`-flaggan.
- Varfor `apiVersion: v1` (inte `apps/v1`) for Namespace — det ligger i core-API:t.
- Hur labels pa namespace-nivan anvands for filtrering med `kubectl get ns -l`.
- Varfor studenter i kursen inte skapar egna namespaces — admin (Giacomo) tilldelar dem.
