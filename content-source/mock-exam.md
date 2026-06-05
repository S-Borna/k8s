# Mock-tenta-frågor

Skriftliga svar i Giacomos stil. Fokus på VARFÖR, inte VAD.

---

## Q [easy · ch1]: Vad är Kubernetes och vilket problem löser det?

**A:** Kubernetes är en orkestrator för containers — den startar, skalar, helar och uppdaterar appar över ett kluster. Innan K8s kördes appar på dedikerade servrar: dog servern dog appen, skalning krävde manuellt jobb. K8s automatiserar via deklarativ YAML och reconciliation loops.

## Q [medium · ch2]: Förklara reconciliation loop steg för steg.

**A:** Controllern jämför hela tiden desired state (din YAML) mot actual state (vad som körs). Skiljer de sig agerar den — skapar Pod, raderar Pod, justerar. Sen väntar den och repeterar. Det är därför K8s är self-healing: dör en Pod märker controllern att det är för få och skapar en ny.

## Q [hard · ch2]: Vad händer steg för steg när en Pod dör i en Deployment?

**A:** Kubelet märker att containern dog och rapporterar till API server. ReplicaSet-controllern bevakar Pods via watch — ser att antalet ready är lägre än desired och ber API server skapa en ny. Scheduler tilldelar Podden en nod. Kubelet på den noden anropar container runtime och startar containern. Hela kedjan tar 5-30 sekunder.

## Q [easy · ch2]: Varför är etcd kritisk?

**A:** etcd lagrar ALL klusterkonfiguration — Deployments, Services, Pods, Nodes. Förlorar du etcd utan backup måste allt återskapas manuellt. Backups av etcd är obligatoriska i prod. Du pratar aldrig direkt med etcd — allt går via API server som validerar och autentiserar.

## Q [medium · ch4]: Förklara varför Pods är immutabla och varför detta är bra.

**A:** Vill du ändra image eller config: radera Podden, skapa ny. Eftersom Pods inte muteras kan K8s alltid återskapa dem från YAML. Det är grunden för rolling updates, rollbacks och self-healing. Kunde Pods ändras skulle reconciliation braka — K8s skulle aldrig kunna garantera att verkligheten matchar spec.

## Q [easy · ch4]: Vad delar containers i samma Pod?

**A:** Nätverks-namespace (samma IP, samma localhost, samma portar), volumes (kan dela filer), och lifecycle (startas och stoppas tillsammans). De är så tätt kopplade att de räknas som en logisk enhet. Det är så sidecar-mönstret funkar — huvudcontainer + logshipper delar loggar via samma volume.

## Q [medium · ch4]: Vad är skillnaden mellan liveness probe och readiness probe?

**A:** Liveness = "körs containern?" Failar den → containern restartas. Readiness = "är containern redo för trafik?" Failar den → Podden tas ur Service-rotationen, men startas inte om. Använda fel kan skapa restart-loops (readiness som triggar restart) eller ta ner egen Pod när en dependency dör (liveness som testar dependencies).

## Q [easy · ch5]: Ger Namespaces nätverksisolering?

**A:** Nej. Pods i olika namespaces kan prata fritt via FQDN (`service.namespace.svc.cluster.local`). Namespaces är logisk gruppering för resursnamn, RBAC och resource quotas — inte nätverksisolering. Vill du blockera trafik: NetworkPolicies. Vanlig missuppfattning på tentan.

## Q [medium · ch5]: Vad är skillnaden mellan namespaced och cluster-scoped objekt?

**A:** Namespaced (Pods, Services, Secrets, Deployments) tillhör ett specifikt namespace — samma namn kan finnas i olika namespaces. Cluster-scoped (Nodes, PersistentVolumes, ClusterRoles, Namespaces själva) tillhör hela klustret. En Node kan inte ligga i ett namespace — den är fysisk infrastruktur. `kubectl api-resources` har NAMESPACED-kolumnen som visar vilken som är vilken.

## Q [hard · ch5]: Två containers i samma Pod försöker binda till port 8080. Vad händer och varför?

**A:** En av dem failar med "address already in use". Containers i samma Pod delar nätverks-namespace — samma `localhost`, samma portar. Samma anledning som att två processer på en Linux-maskin inte kan binda port 80 samtidigt. Lösning: använd olika portar. Klassisk fälla när man konverterar flera-processer-appar till multi-container Pods.

## Q [easy · ch6]: Vad är skillnaden mellan Deployment, ReplicaSet och Pod?

**A:** Deployment är det du redigerar — definierar replikor, image, update-strategi. Den skapar automatiskt en ReplicaSet som håller rätt antal Pods igång. Pods kör dina containers. Hierarki: Deployment → ReplicaSet → Pods. Editera aldrig ReplicaSets direkt — Deployment-controllern skriver över dina ändringar.

## Q [medium · ch6]: Förklara maxSurge och maxUnavailable i rolling updates.

**A:** maxSurge = hur många extra Pods K8s får skapa över desired under rollout. maxUnavailable = hur många under desired som tolereras. Exempel: 10 replicas, maxSurge=2, maxUnavailable=0 → K8s skapar 2 nya, väntar tills ready, tar ner 2 gamla, repeterar. Aldrig under 10, aldrig över 12. Tradeoff: hastighet vs resursanvändning vs nedtid.

## Q [hard · ch6]: Varför är nedskalning långsammare än uppskalning i HPA?

**A:** För att undvika "flapping" — skala upp och ner i onödan när last varierar. K8s default: 5 minuters stabilization window innan nedskalning. Uppskalning sker direkt vid behov. Asymmetrin är medveten — oönskad nedskalning kostar mer (lost kapacitet vid pik) än oönskad uppskalning (extra resurs). Konfigurerbart via HPA `behavior`-fältet.

## Q [easy · ch7]: Varför behövs Services framför Pods?

**A:** Pods är efemerala — startar om, byter IP, scalas. Klienter kan inte rikta trafik mot Pod-IP eftersom IP försvinner. Service är en stabil IP + DNS som lastbalanserar till matchande Pods via labels. Utan Service skulle varje deploy bryta integrations.

## Q [medium · ch7]: Förklara skillnaden mellan ClusterIP, NodePort och LoadBalancer Service-typer.

**A:** ClusterIP = bara intern access (default). Intern IP + DNS för intra-cluster kommunikation. NodePort = ClusterIP plus en port på varje nod (30000-32767) — klumpig extern access. LoadBalancer = NodePort plus en publik IP via molnets LB — enklaste externa access. Varje högre lager innehåller det lägre. På bare metal funkar inte LoadBalancer utan tillägg som MetalLB.

## Q [hard · ch7]: Service har 3 Pods bakom sig men trafik når bara en. Varför kan det vara?

**A:** Vanligast: session affinity satt till ClientIP (samma klient → samma Pod), eller HTTP/2-connection reuse som håller en TCP-anslutning öppen. Andra fall: bara en Pod är ready (kolla `kubectl get pods`), eller skeva iptables-regler (sällsynt). Felsökning: `kubectl get endpointslices` visar vilka Pods som faktiskt får trafik.

## Q [medium · ch7]: Vad händer när en Service har broken selector?

**A:** EndpointSlice blir tomt — selector matchar inga Pods. Trafik till Service ger connection refused eller timeout. Pods och Deployments ser fortfarande "Running" ut — felet syns bara i Service. Felsökning: `kubectl describe svc <namn>` visar Endpoints. Tomt = problem. Testa alltid att Service svarar, inte bara att Pods kör.

## Q [easy · ch8]: Varför har K8s inte inbyggd Ingress controller?

**A:** K8s definierar API:t, marknaden levererar implementationer. Olika controllers har olika styrkor: NGINX (mogen), Traefik (lätt config), HAProxy (snabb), Istio (service mesh). Du väljer det som passar. Priset: ett verktyg till att installera och hantera.

## Q [medium · ch8]: När använder man Ingress vs LoadBalancer-Service?

**A:** LoadBalancer = en publik IP per Service. Bra för en eller få tjänster, eller för icke-HTTP (TCP/UDP). Skalas dåligt — 25 Services = 25 LBs = stora moln-kostnader. Ingress = en LB, många tjänster med routing på hostname/path. Bättre för många HTTP-microservices, och kan centralisera TLS, auth, rate limiting. Tumregel: 1-2 publika tjänster = LoadBalancer. Många eller HTTP-routing = Ingress.

## Q [hard · ch10]: Förklara hur service discovery fungerar tekniskt steg för steg.

**A:** App skapar Service → K8s tilldelar ClusterIP. coredns bevakar API server och registrerar Service-namn → ClusterIP automatiskt. När Pod startas konfigureras `/etc/resolv.conf` med coredns som nameserver. App gör `curl payments` → DNS-lookup mot coredns → får ClusterIP → skickar trafik. På noden DNAT:ar kube-proxy (via iptables/IPVS) ClusterIP till en Pod-IP från EndpointSlice. Hela kedjan är osynlig för appen.

## Q [medium · ch10]: Varför funkar `curl payments` i samma namespace men inte i annat?

**A:** Beror på search domains i `/etc/resolv.conf`. När en Pod skapas konfigureras search-listan: `<pod-namespace>.svc.cluster.local svc.cluster.local cluster.local`. Korta namn appendas med search-domänerna tills resolution lyckas. Samma namespace: `payments` blir `payments.<lokalt-ns>.svc.cluster.local` och fungerar. Annat namespace: använd FQDN `payments.finance.svc.cluster.local`. Inga genvägar cross-namespace.

## Q [easy · ch11]: Vad är skillnaden mellan PV och PVC?

**A:** PV är själva storagen — en EBS-volym, NFS-share, lokal disk. PVC är användarens begäran: "jag behöver 10 GB". K8s matchar PVC mot tillgänglig PV (eller skapar dynamiskt via StorageClass). Apputvecklaren bryr sig inte om underliggande storage — bara att begäran fylls.

## Q [medium · ch11]: Vad är skillnaden mellan ReadWriteOnce och ReadWriteMany access modes?

**A:** RWO = en nod kan mounta för läs/skriv. Vanligast — block storage (EBS, Azure Disk, GCP PD) stödjer bara RWO. RWX = flera noder kan mounta samtidigt. Kräver shared filesystem (NFS, CephFS, EFS). Påverkar arkitektur: med RWO kan inte två Pods på olika noder dela storage — använd StatefulSet med en PVC per Pod. RWX ger delad state men kostar i prestanda.

## Q [easy · ch12]: Vad är skillnaden mellan ConfigMap och Secret?

**A:** ConfigMap = icke-känslig konfiguration (log levels, feature flags, hostnames). Secret = känslig data (lösenord, API-nycklar, certifikat). Tekniskt nästan identiska, men Secrets är base64-kodade och behandlas försiktigare av K8s (visas inte i `describe`). Viktigt: Secrets är INTE krypterade by default — bara base64. Riktig kryptering kräver encryption at rest eller external secret manager.

## Q [medium · ch12]: Varför uppdateras env vars från ConfigMap inte automatiskt?

**A:** Env vars sätts vid Pod-start och är immutabla i den körande processen — K8s kan inte ändra dem utan att starta om Podden. Det är en Linux-begränsning, inte ett K8s-val. Mountade volymer däremot uppdateras automatiskt eftersom kubelet skriver om filerna. För dynamic config: mounta som filer + watcha, eller acceptera Pod-restart vid config-ändring.

## Q [easy · ch13]: Varför behöver databaser StatefulSet och inte Deployment?

**A:** Databaser har state — varje instans har egen data, egen roll (master/replica), och måste startas i ordning. Med Deployment är alla Pods utbytbara med random namn — omöjligt att veta vem som är master. StatefulSet ger stabil identitet (`db-0`, `db-1`), egen PVC per Pod, och ordnad start/stopp. Utan dessa egenskaper bryts replikering och recovery.

## Q [hard · ch13]: I vilken ordning skalas en StatefulSet upp och ner och varför?

**A:** Upp: lägsta index först. `web-0` blir ready innan `web-1` startar, sen `web-2`. Ner: omvänd ordning — `web-2` först, sen `web-1`, sen `web-0`. Lägre index är ofta primary/master eller har data som måste finnas innan replicas. Skala ner i omvänd ordning ger graceful shutdown — tar bort minst kritiska först. Kritiskt för Kafka, Zookeeper, MongoDB.

## Q [easy · ch14]: Vilka tre säkerhetslager går varje API-request genom?

**A:** Autentisering — "vem är du?" via certifikat, token, eller OIDC. 401 om misslyckas. Auktorisering — "vad får du göra?" via RBAC. 403 om misslyckas. Admission control — extra valideringar via mutating och validating webhooks (Kyverno, OPA). Misslyckas något lager avvisas requesten innan den når etcd.

## Q [medium · ch14]: Förklara skillnaden mellan Role och ClusterRole + deras Bindings.

**A:** Role = permissions inom ETT namespace. RoleBinding = kopplar Role till user/SA i samma namespace. ClusterRole = permissions cluster-wide eller på cluster-scoped resurser (Nodes, PVs). ClusterRoleBinding = kopplar ClusterRole cluster-wide. Edge case: ClusterRole + RoleBinding = ger ClusterRole-permissions men begränsat till ett namespace. Användbart för "view"-access utan att skapa egen Role per namespace.

## Q [hard · ch14]: Varför är default service account problematiskt?

**A:** Default SA finns i varje namespace och används om Pod inte specifierar serviceAccountName. Historiskt har den haft för många permissions, och token har monterats automatiskt. En komprometterad Pod = komprometterad default SA = access till K8s API. Best practice: ge default SA inga permissions (default i nyare K8s), skapa specifik SA per workload, och sätt `automountServiceAccountToken: false` när Pod inte behöver API-access.

## Q [easy · ch15]: Vad är K8s API server?

**A:** Central komponent i control plane. Tar emot HTTP-requests, validerar, autentiserar, persisterar till etcd. ALLT går genom den — kubectl, controllers, kubelet. K8s "front door". Går den ner kan klustret inte ändras, men befintliga Pods fortsätter köra (kubelet och kube-proxy har lokal cache).

## Q [medium · ch15]: Vad är en CRD och varför finns det?

**A:** Custom Resource Definition. Du utökar K8s API med egna resurstyper — definiera CRD så finns t.ex. `kubectl get backups`. Eftersom K8s redan reconciliera deklarativa resurser kan vem som helst definiera egna. CRDs är grunden för operators som hanterar databaser, certifikat, message queues som K8s-objekt. Drift-logik flyttar in i K8s deklarativa modell.

## Q [hard · cross]: Du deployar en ny version av en app via rolling update men trafiken börjar faila omedelbart. Hur felsöker du?

**A:** Börja med `kubectl rollout status deployment/<namn>` — har rollouten stannat? Sen `kubectl get pods` — fastnar nya Pods i ImagePullBackOff? Då är det image-problem. Annars `kubectl describe pod <ny-pod>` för events och `kubectl logs <ny-pod>` för app-fel. Kolla readiness probe — kanske är den för strikt. Kolla Service: tom EndpointSlice = selector matchar inga Pods (labels kanske ändrade). Quick fix medan du felsöker: `kubectl rollout undo deployment/<namn>` för att rolla tillbaka.

## Q [hard · cross]: Förklara hela kedjan från `kubectl apply -f deploy.yaml` till att en Pod kör på en nod.

**A:** kubectl skickar din YAML till API server via HTTP. API server autentiserar, auktoriserar, kör admission controllers, validerar mot schema, skriver till etcd. Deployment-controllern bevakar via watch och skapar en ReplicaSet. ReplicaSet-controllern skapar Pods (utan nod-tilldelning). Scheduler ser obundna Pods och väljer nod baserat på resources och affinity. Kubelet på vald nod anropar container runtime, som pullar image och startar containern. Kubelet rapporterar status tillbaka. Allt syns i `kubectl get events`.

## Q [medium · cross]: Vad är skillnaden mellan deklarativ och imperativ approach och varför är deklarativ bättre i K8s?

**A:** Deklarativ = beskriv önskat tillstånd i YAML (`apply -f deploy.yaml`). K8s konvergerar dit via reconciliation. Imperativ = säg exakt vad som ska göras (`kubectl run nginx`). Deklarativ vinner i K8s: YAML i Git är källa till sanning (GitOps), K8s återställer drift automatiskt, samma YAML ger samma resultat, ändringar går via PR-process. Imperativa kommandon skapar drift mellan kluster och Git. Använd imperativ bara för debugging och tester.
