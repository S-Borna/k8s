---
title: "Saids team-namespaces"
source: chas-challenge
sourceLabel: "Chas Challenge — Namespaces"
chapterId: 5
filename: "01-namespaces.yaml"
---

# Varför

Namespaces är Saids rotpunkt i lab-klustret — varje student/team får ett eget namespace av Giacomo, och allt annat (deployments, services, secrets) hamnar där. Manifesten visar hur ForeverHome-projektet är isolerat från resten av kursen på `doe25-said-ebadi`. Pedagogiken: en enkel resurs, men det är referenspunkten alla andra manifests i CC-mappen pekar mot via `-n`-flaggan eller kustomize.

# Kommentarsblocket — varför finns ingen Namespace egentligen?

Första raderna (rad 1-11) är inte YAML, det är Saids egna anteckningar. Klusteradmin (Giacomo) skapar namespaces — studenter saknar rättigheter att skapa egna. Manifesten under `---` är därför mer en *referens* till vad som redan finns i klustret än en resurs man faktiskt applicerar. I praktiken kör Said `kubectl -n doe25-said-ebadi apply -f ...` mot sitt tilldelade namespace.

# apiVersion och kind

Rad 13-14 deklarerar att detta är en `Namespace`-resurs i core-API:t (`v1`). Namespace ligger i core-gruppen, därför bara `v1` — inte `apps/v1` eller liknande. Fallgrop: blandar man ihop `apiVersion` med fel kind får man `no matches for kind`-fel direkt.

# metadata.name — själva identifieraren

Rad 15-16 ger namespacet namnet `doe25-said-ebadi`. Det är detta namn som hamnar i `-n`-flaggan överallt i CC-mappen. Konventionen i kursen: `doe25-<student-eller-team>` — kurskod, sen ägare. Ändrar man namnet här måste man ändra det i *varenda* annan manifest som refererar till namespacet.

# Labels — för organisation och filtrering

Rad 17-19 sätter två labels: `app: foreverhome` knyter namespacet till Saids projekt, `managed-by: chas-academy` markerar att det är skolan som äger det. Labels används av `kubectl get ns -l app=foreverhome` för att filtrera. Inte tvingande för K8s — men gör det enklare för Giacomo att se vilka namespaces som tillhör vilket projekt.

# Varför namespace överhuvudtaget?

I lab-klustret kör alla studenter mot samma fysiska maskiner. Namespaces ger logisk separation — Saids `foreverhome-api` krockar inte med en annan students `foreverhome-api` för de ligger i olika namespaces. Resource quotas, network policies och RBAC häftas på namespace-nivån. Utan namespaces hade hela kursen varit en enda rörig hög.

# Tentapunkter

- Vad är ett namespace och varför används det i ett delat kluster (isolation, RBAC, quotas).
- Skillnaden mellan att *deklarera* ett namespace och att *referera* till ett existerande via `-n`-flaggan.
- Varför `apiVersion: v1` (inte `apps/v1`) för Namespace — det ligger i core-API:t.
- Hur labels på namespace-nivån används för filtrering med `kubectl get ns -l`.
- Varför studenter i kursen inte skapar egna namespaces — admin (Giacomo) tilldelar dem.
