---
title: "Registry Secret"
source: chas-challenge
sourceLabel: "Eget projekt — Registry Secret"
chapterId: 12
filename: "12-gitlab-registry-sealed.yaml"
---

# Varför

GitLab Container Registry är privat — backend-podden kan inte pulla imagen utan inloggning. Lösningen är en Secret av typen `dockerconfigjson` som Kubelet använder vid `imagePullSecrets`. Men en ren Secret är bara base64 — committar du den till Git läcker du credentials. Därför sealed: krypterad mot lab-klustrets publika nyckel, controllern i `kube-system` dekrypterar och spottar ut en riktig Secret med samma namn. deployen kan ligga öppet i Git utan att någon kan läsa dockerlösenordet.

# Varför en SealedSecret istället för en Secret

`kind: SealedSecret` (rad 3) är inte en native K8s-resurs — det är en CRD från Bitnami som installerats på lab-klustret. Skillnaden mot vanlig `Secret`: en Secret är base64, alltså klartext för alla med Git-access. En SealedSecret är RSA-krypterad mot klustrets publika nyckel, så bara controllern i kube-system kan läsa den. Det är därför filen kan ligga i repot bredvid deployment.yaml utan att doxxa GitLab-tokenet.

# Namespace-låsningen

`namespace: doe25-group-10` finns på TVÅ ställen — på själva SealedSecret (rad 6) och inne i template (rad 13). Det är inte slarv, det är säkerhet: en SealedSecret är krypterad mot exakt det namespace + det namnet. Flyttar du filen till ett annat namespace fungerar dekrypteringen inte. Fallgrop: byter du grupp-namespace mellan terminer måste du seala om hela paketet, du kan inte bara `sed`-ändra raden.

# Den krypterade nyttolasten

`encryptedData.dockerconfigjson` (rad 8-9) är den långa base64-strängen. Det dekrypterade innehållet är en `~/.docker/config.json` med `auths` mot `registry.gitlab.com` + Saids deploy-token. Sealas med `kubeseal --cert <pubkey> < secret.yaml > sealed.yaml` — privatnyckeln lämnar aldrig klustret. Det är därför Said inte kan dekryptera sin egen fil lokalt — bara klustret kan.

# Template-blocket — vad controllern bygger

`spec.template` (rad 10-14) beskriver Secret:en som controllern ska skapa efter dekryptering. `type: kubernetes.io/dockerconfigjson` (rad 14) är den specifika Secret-typen Kubelet känner igen för image-pulls — inte `Opaque`, inte `generic`. Namnet `gitlab-registry` (rad 12) är det som backend-deployment refererar via `imagePullSecrets: - name: gitlab-registry`. Matchar namnet inte, får du `ImagePullBackOff`.

# Hur det flyter ihop med backend-deployen

Steg 1: `kubectl apply` på sealed-filen → SealedSecret-objektet hamnar i etcd, fortfarande krypterat. Steg 2: controllern i kube-system upptäcker den, dekrypterar, skapar en vanlig `Secret/gitlab-registry` i samma namespace. Steg 3: backend-Pod startar, Kubelet ser `imagePullSecrets`, hämtar dockerconfigjson från Secret:en, loggar in på GitLab Registry, pullar imagen. Hela kedjan = GitOps utan läckta credentials.

# Tentapunkter

- Vad skillnaden är mellan Secret och SealedSecret — och varför base64 inte är kryptering
- Varför `type: kubernetes.io/dockerconfigjson` krävs istället för Opaque — det är Secret-typen Kubelet plockar för image-pulls
- Hur SealedSecret-controllern (i kube-system) tar krypterad CRD och producerar en vanlig Secret med samma namn
- Varför namespace + name är låsta i krypteringen — du kan inte flytta filen mellan namespaces
- Hur backend-deployen kopplar in Secret:en via `imagePullSecrets` så Kubelet kan pulla privata GitLab-images
