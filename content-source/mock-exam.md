# Mock-tenta-frågor

Skriftliga svar i Giacomos stil. Fokus på VARFÖR, inte VAD.

---

## Q [easy · ch1]: Vad är Kubernetes och vilket problem löser det?

**A:** Kubernetes är en orkestrator för containeriserade applikationer som automatiserar deployment, skalning, healing och uppdateringar över ett kluster av maskiner. Problemet det löser: innan K8s körde appar på dedikerade servrar - dog servern dog appen, skalning krävde manuellt arbete, uppdateringar var skrämmande. K8s automatiserar detta via deklarativ konfiguration och reconciliation loops.

## Q [medium · ch2]: Förklara reconciliation loop steg för steg.

**A:** En kontinuerlig process där en controller jämför desired state (vad du sade i YAML) med actual state (vad som faktiskt körs) och agerar för att stänga gapet. Steg: 1) Läs desired state från API server, 2) Observera actual state, 3) Om de skiljer sig - vidta åtgärd (skapa Pod, radera Pod, etc), 4) Vänta, 5) Repetera. Detta är **varför** K8s är self-healing - dör en Pod märker controllern att antalet körande är lägre än önskat och skapar en ny.

## Q [hard · ch2]: Vad händer steg för steg när en Pod dör i en Deployment?

**A:** 1) Kubelet på noden detekterar att containern crashar och rapporterar till API server. 2) Pod-status uppdateras i etcd. 3) ReplicaSet-controller (via watch) ser att antalet ready Pods är lägre än desired. 4) Den skickar request till API server att skapa ny Pod. 5) Scheduler tilldelar den till en nod. 6) Kubelet på den noden tar emot ordern, anropar container runtime att starta containern. 7) Pod blir Running, ReplicaSet ser att gapet är stängt. Hela kedjan tar typiskt 5-30 sekunder.

## Q [easy · ch2]: Varför är etcd kritisk?

**A:** etcd är klustrets enda källa till sanning - all state om Deployments, Services, Pods, Nodes lagras där. Förlorar du etcd utan backup måste du återskapa allt manuellt. Backups av etcd är därför obligatoriska i produktion. Detta är också varför man aldrig pratar direkt med etcd - all access går via API server som kan validera och autentisera.

## Q [medium · ch4]: Förklara varför Pods är immutabla och varför detta är bra.

**A:** Pods kan inte ändras efter att de skapats - vill du ändra image, miljövariabel, eller config måste du radera och skapa ny. Detta är inte en designdetalj utan **anledningen** till att K8s fungerar: eftersom Pods inte muteras kan systemet alltid återskapa dem från YAML. Det är basen för rolling updates, rollbacks, och self-healing. Om Pods kunde muteras skulle reconciliation bli omöjligt - K8s skulle aldrig kunna garantera att en Pod matchar sin spec.

## Q [easy · ch4]: Vad delar containers i samma Pod?

**A:** Nätverks-namespace (samma IP, samma localhost, samma portar), storage volumes (kan dela filer), och lifecycle (startas och stoppas tillsammans). Detta är **anledningen** till att de räknas som en Pod - de är så tätt kopplade att de fungerar som en logisk enhet. Det är därför sidecar-mönstret funkar: huvudcontainer + logshipper kan dela loggar via samma volume.

## Q [medium · ch4]: Vad är skillnaden mellan liveness probe och readiness probe?

**A:** Liveness = "körs containern alls?" - failar den restartas containern. Readiness = "är containern redo att ta emot trafik?" - failar den tas Podden ut ur Service-rotationen men startas inte om. Olika syften: liveness fixar trasiga containers; readiness skyddar trafik från containers som inte är redo (uppstart, överbelastad, väntar på dependency). Använda fel: en readiness probe som triggar restart kan skapa restart-loops; en liveness probe som testar dependencies tar ner egen Pod när dependency dör.

## Q [easy · ch5]: Ger Namespaces nätverksisolering?

**A:** Nej. Pods i olika namespaces kan prata med varandra fritt via FQDN (`service.namespace.svc.cluster.local`). Namespaces är logisk gruppering för resursnamn, RBAC, och resource quotas - INTE nätverksisolering. Vill du blockera trafik krävs NetworkPolicies (separat objekt). Detta är en vanlig missuppfattning som testas på tentor.

## Q [medium · ch5]: Vad är skillnaden mellan namespaced och cluster-scoped objekt?

**A:** Namespaced objekt (Pods, Services, Secrets, ConfigMaps, Deployments) tillhör ett specifikt namespace - samma namn kan finnas i olika namespaces. Cluster-scoped objekt (Nodes, PersistentVolumes, Namespaces själva, ClusterRoles) tillhör hela klustret. Du kan inte sätta en Node i ett namespace - den är fysisk infrastruktur, inte en logisk gruppering. `kubectl api-resources` visar vilka som är vad i NAMESPACED-kolumnen.

## Q [hard · ch5]: Två containers i samma Pod försöker binda till port 8080. Vad händer och varför?

**A:** En av dem failar med "address already in use". Containers i samma Pod delar nätverks-namespace - de ser samma `localhost` och samma portar. Det är samma anledning till att två processer på samma Linux-maskin inte kan binda till port 80 samtidigt. Lösning: använd olika portar. Detta är ett klassiskt fel när man konverterar appar med multiple processer till multi-container Pods.

## Q [easy · ch6]: Vad är skillnaden mellan Deployment, ReplicaSet och Pod?

**A:** Deployment är det du interagerar med - definierar replikor, image, update-strategi. ReplicaSet skapas automatiskt av Deployment och hanterar self-healing/skalning. Pod är slutprodukten - skapas av ReplicaSet och kör dina containers. Hierarki: Deployment → ReplicaSet → Pods. Editera ReplicaSets aldrig direkt - ändringar skrivs över när Deployment-controllern reconcilierar.

## Q [medium · ch6]: Förklara maxSurge och maxUnavailable i rolling updates.

**A:** Vid rolling update: maxSurge = max antal Pods OVER desired replicas. maxUnavailable = max antal Pods UNDER desired. Tillsammans styr de hastighet vs säkerhet. Exempel: 10 replicas, maxSurge=2, maxUnavailable=0 = K8s skapar 2 nya, väntar tills ready, tar ner 2 gamla, repeterar - aldrig under 10, aldrig över 12. maxSurge=5, maxUnavailable=0 = snabbare. maxUnavailable>0 = kortare downtime tolereras för snabbare rollout. Tradeoff: hastighet vs resursanvändning vs nedtid.

## Q [hard · ch6]: Varför är nedskalning långsammare än uppskalning i HPA?

**A:** För att undvika "flapping" - skala upp/ner i onödan när last varierar. Om HPA skalar ner direkt vid lågt CPU och sedan upp direkt vid pik skapas instabilitet. K8s default: 5 minuters stabilization window innan nedskalning. Uppskalning sker direkt vid behov. Asymmetrin är medveten - oönskad skalning ner kostar mer (lost capacity vid pik) än oönskad skalning upp (extra resurs). Konfigurerbart via HPA `behavior`-fältet.

## Q [easy · ch7]: Varför behövs Services framför Pods?

**A:** Pods är efemerala - startar om, byter IP, scalas upp/ned. Klienter kan inte rikta trafik mot Pod-IP eftersom IP försvinner. En Service är en stabil abstraktion med fast ClusterIP + DNS-namn som load-balancerar till matchande Pods via labels. Utan Service ingen meningsfull kommunikation mellan komponenter - varje deploy skulle bryta integrations.

## Q [medium · ch7]: Förklara skillnaden mellan ClusterIP, NodePort och LoadBalancer Service-typer.

**A:** Bygger på varandra. ClusterIP = bara intern access (default), intern IP + DNS, för intra-cluster kommunikation. NodePort = ClusterIP + port på varje nod (30000-32767), extern access via nod-IP:port - klumpig och kräver att klient kan nå noder. LoadBalancer = NodePort + extern moln-LB med publik IP, enklast extern access. Du får alltid lägre lager när du väljer ett högre. På bare metal: LoadBalancer fungerar inte utan tillägg som MetalLB.

## Q [hard · ch7]: Service har 3 Pods bakom sig men trafik når bara en. Varför kan det vara?

**A:** Flera möjliga orsaker. 1) Session affinity satt till ClientIP - alla requests från samma klient hamnar på samma Pod. 2) Connection reuse - HTTP/2 håller en TCP-anslutning och alla requests inom den går till samma Pod. 3) Endast en Pod är ready (kolla `kubectl get pods` - de andra kanske failar readiness). 4) iptables-reglerna är skeva (sällsynt). Felsöka: `kubectl get endpointslices` visar vilka Pods som faktiskt får trafik.

## Q [medium · ch7]: Vad händer när en Service har broken selector?

**A:** EndpointSlice blir tomt - selector matchar inga Pods. Trafiken till Service ger connection refused eller timeout. Pods och Deployments ser fortfarande "Running" och "Healthy" ut - felet syns bara i Service eller om man testar endpoint. Detta är en klassisk fälla: deploys som ser framgångsrika ut men service är trasig. Felsökning: `kubectl describe svc <namn>` visar Endpoints - tomt = problem. Alltid testa att Service SVARAR, inte bara att Pods är Running.

## Q [easy · ch8]: Varför har K8s inte inbyggd Ingress controller?

**A:** Designprincip: K8s definierar API:t, marknaden levererar implementationer. Olika controllers har olika styrkor: NGINX (mogen, mest använd), Traefik (lätt config, autodiscovery), HAProxy (snabb), Istio (service mesh). Genom pluggability kan användare välja det som passar. Trade-off: ytterligare ett verktyg att installera och hantera.

## Q [medium · ch8]: När använder man Ingress vs LoadBalancer-Service?

**A:** LoadBalancer = en publik IP per Service. Bra för en eller få tjänster, eller icke-HTTP (TCP/UDP). Skalas dåligt - 25 Services = 25 LBs = stora moln-kostnader. Ingress = en LB, många tjänster med routing baserat på hostname/path. Bättre för många HTTP-microservices. Ingress kan dessutom centralisera TLS termination, authentication, rate limiting. Tumregel: 1-2 publika tjänster = LoadBalancer. Många tjänster eller HTTP-routing-behov = Ingress.

## Q [hard · ch10]: Förklara hur service discovery fungerar tekniskt steg för steg.

**A:** 1) App skapas med Service - K8s tilldelar ClusterIP. 2) coredns (DNS-Pod i kube-system) bevakar API server, registrerar Service-namn → ClusterIP automatiskt. 3) Pod skapas - K8s konfigurerar `/etc/resolv.conf` med coredns ClusterIP som nameserver och search domains. 4) App gör `curl payments` - DNS-lookup mot coredns. 5) coredns svarar med ClusterIP. 6) App skickar trafik mot ClusterIP. 7) På noden: kube-proxy har konfigurerat iptables/IPVS-regler som DNAT:ar ClusterIP till en Pod-IP från EndpointSlice. 8) Trafiken når Pod. Hela kedjan är transparent för appen.

## Q [medium · ch10]: Varför funkar `curl payments` i samma namespace men inte i annat?

**A:** På grund av search domains i `/etc/resolv.conf`. När en Pod skapas konfigureras search-listan: `<pod-namespace>.svc.cluster.local svc.cluster.local cluster.local`. Korta namn (`payments`) appendas med varje search domain tills resolution lyckas. I samma namespace: `payments.<lokalt-namespace>.svc.cluster.local` resolverar. I annat namespace: namnet hittas inte med lokala search domains - måste använda FQDN `payments.finance.svc.cluster.local`. Inga genvägar cross-namespace.

## Q [easy · ch11]: Vad är skillnaden mellan PV och PVC?

**A:** PV (PersistentVolume) är faktisk storage i klustret - en EBS-volym, NFS-share, etc, ofta provisioned dynamiskt. PVC (PersistentVolumeClaim) är en användares begäran om storage ("jag behöver 10 GB"). K8s matchar PVC mot tillgänglig PV. Loose coupling - apputvecklare bryr sig inte om underliggande storage, ops definierar StorageClasses som styr vilken typ som provisioneras.

## Q [medium · ch11]: Vad är skillnaden mellan ReadWriteOnce och ReadWriteMany access modes?

**A:** RWO = en nod kan mounta för läs/skriv. Vanligast - block storage (EBS, Azure Disk, GCP PD) stödjer bara detta. RWX = flera noder kan mounta samtidigt. Kräver shared filesystem (NFS, CephFS, EFS). Påverkar arkitektur: med RWO kan inte två Pods på olika noder dela storage - använd StatefulSet med en PVC per Pod. RWX möjliggör delad state men har performance trade-offs.

## Q [easy · ch12]: Vad är skillnaden mellan ConfigMap och Secret?

**A:** ConfigMap för icke-känslig konfiguration (log levels, feature flags, hostnames). Secret för känslig data (lösenord, API-nycklar, certifikat). Tekniskt nästan identiska - men Secrets är base64-kodade, behandlas mer försiktigt av K8s (visas inte i `describe`, kan krypteras at rest, kan integreras med externa secret managers). Viktigt: Secrets är INTE krypterade by default - bara base64. Riktig kryptering kräver encryption at rest eller external secret manager.

## Q [medium · ch12]: Varför uppdateras env vars från ConfigMap inte automatiskt?

**A:** Env vars sätts vid Pod-start och är immutabla i den körande processen - K8s kan inte ändra dem utan att starta om Podden. Detta är en fundamental Linux-begränsning, inte ett K8s-val. Mountade volymer däremot uppdateras automatiskt eftersom kubelet skriver om filerna i volymen. För dynamic config: använd mountade filer + en process som watchar filsystemet, eller acceptera Pod-restart vid config-ändring.

## Q [easy · ch13]: Varför behöver databaser StatefulSet och inte Deployment?

**A:** Databaser har state - varje instans har egen data, egen roll (master/replica), och måste startas i specifik ordning. Med Deployment är alla Pods utbytbara med random namn - omöjligt att veta vilken är master. StatefulSet ger stabil identitet (namn `db-0`, `db-1`), egen PVC per Pod, och ordnad start/stopp. Utan dessa egenskaper bryts replikering och recovery. Deployments är för stateless - StatefulSets för stateful.

## Q [hard · ch13]: I vilken ordning skalas en StatefulSet upp och ner och varför?

**A:** Upp: lägsta index först. `web-0` blir ready innan `web-1` startar, sedan `web-2`. Ner: omvänd ordning - `web-2` tas ner först, sedan `web-1`, sedan `web-0`. Anledning: distribuerade system har ofta hierarki - lägre index är primary/master eller har data som måste finnas innan replicas. Skala ner i omvänd ordning säkerställer graceful shutdown - tar bort minst kritiska först. För Kafka/Zookeeper/MongoDB är denna ordning kritisk för dataintegritet.

## Q [easy · ch14]: Vilka tre säkerhetslager går varje API-request genom?

**A:** 1) Autentisering - "vem är du?" via certifikat, token, eller OIDC. 401 om misslyckas. 2) Auktorisering - "vad får du göra?" via RBAC (vanligast). 403 om misslyckas. 3) Admission control - extra valideringar via mutating och validating webhooks. Här kör tools som Kyverno, OPA. Misslyckas något lager avvisas requesten innan den når etcd. Ordning är viktig - ingen mening att auktorisera om autentisering misslyckas.

## Q [medium · ch14]: Förklara skillnaden mellan Role och ClusterRole + deras Bindings.

**A:** Role definierar permissions inom ETT namespace. RoleBinding kopplar Role till user/SA inom samma namespace. ClusterRole definierar permissions cluster-wide eller på cluster-scoped resurser (Nodes, PVs). ClusterRoleBinding kopplar ClusterRole till user/SA cluster-wide. Edge case: ClusterRole + RoleBinding = ger ClusterRole-permissions men begränsat till ett namespace - användbart för att ge "view"-access till ett namespace utan att skapa egen Role.

## Q [hard · ch14]: Varför är default service account problematiskt?

**A:** Default SA finns i varje namespace och används om Pod inte specifierar serviceAccountName. Historiskt har den haft för många permissions - många GA-versioner monterade automatiskt token. En kompromettering av Pod = kompromettering av default SA = möjligt access till K8s API med dess permissions. Best practice: ge default SA inga permissions (default i nyare K8s), skapa specifika SA per workload med minimala rättigheter. Stoppa automatisk token-mounting med `automountServiceAccountToken: false`.

## Q [easy · ch15]: Vad är K8s API server?

**A:** Central komponent i control plane som tar emot HTTP-requests, validerar, autentiserar, persisterar till etcd. ALLT går genom API server - kubectl, controllers, kubelet, andra control plane-komponenter. Är K8s "front door". Kommer den ner är klustret oansvarbart - inga ändringar kan göras, men befintliga Pods fortsätter köra (kubelet/kube-proxy har lokal cache).

## Q [medium · ch15]: Vad är en CRD och varför finns det?

**A:** Custom Resource Definition. Tillåter dig att utöka K8s API med egna resurstyper. Definiera en CRD och nu finns t.ex. `kubectl get backups`. Anledning: K8s arkitektur är baserat på reconciliation av deklarativa resurser - varför inte låta användare definiera egna? CRDs är basen för operators som hanterar komplexa system (databaser, certifikat, message queues) som K8s-objekt. Förflyttar drift-logik in i K8s deklarativa modell.

## Q [easy · ch16]: Vad är STRIDE?

**A:** Threat modeling-modell med sex kategorier av hot: Spoofing (utger sig för annan), Tampering (modifierar data), Repudiation (förnekar handling), Information disclosure (läcker data), Denial of service (otillgänglig), Elevation of privilege (får högre rättigheter). Används systematiskt för att identifiera hot mot ett system. Varje komponent i K8s har potentiella hot inom dessa kategorier - förstå dem för att designa säkerhetskontroller.

## Q [medium · ch16]: Varför är "lateral movement" särskilt farligt i K8s?

**A:** K8s default tillåter all-to-all trafik mellan Pods - perfekt förutsättning för lateral movement. En komprometterad webb-Pod kan scanna interna nätverket, attackera databas, eskalera privilegier, exfiltrera data - allt utan att lämna klustret. Mitigation: NetworkPolicies (default deny + explicit allow) för att begränsa trafik. Service mesh (Istio, Linkerd) för mTLS och fina-granulära policies. Princip: behandla varje Pod som potentiellt komprometterad.

## Q [easy · ch17]: Vad är PodSecurityStandards?

**A:** K8s-inbyggda security policies i tre nivåer: Privileged (ingen restriktion, system-Pods), Baseline (minimal - ingen privileged container, ingen host*), Restricted (strikt - non-root, no capabilities, read-only root fs). Tillämpas per namespace via labels (`pod-security.kubernetes.io/enforce=baseline`). Ersatte gamla PodSecurityPolicies (deprecated). Pods som bryter mot policy avvisas vid skapande.

## Q [medium · ch17]: Vad är "defense in depth" och hur tillämpas det i K8s?

**A:** Säkerhetsprincip: använd flera lager av kontroller så att ingen enskild kompromettering räcker. K8s implementation: cluster hardening (API server, etcd) + RBAC (auktorisering) + NetworkPolicies (nätverksisolering) + PodSecurityStandards (container restrictions) + image scanning (CVE-detection) + image signing (supply chain) + runtime monitoring (Falco) + audit logs (forensik). Komprometteras ett lager skyddar de andra. Inget enskilt lager räcker.

## Q [hard · cross]: Du deployar en ny version av en app via rolling update men trafiken börjar faila omedelbart. Hur felsöker du?

**A:** 1) `kubectl rollout status deployment/<namn>` - har rollouten stannat? 2) `kubectl get pods` - är nya Pods Running och Ready? Om de fastnar i ImagePullBackOff = image-problem. 3) `kubectl describe pod <ny-pod>` - events visar varför. 4) `kubectl logs <ny-pod>` - app-fel? 5) Kolla readiness probe - kanske är den för strikt. 6) Kolla Service: `kubectl describe svc <namn>` - finns Endpoints? Tom EndpointSlice = selector matchar inga Pods (kanske labels ändrade i nya version). 7) Quick fix: `kubectl rollout undo deployment/<namn>` för att rolla tillbaka medan du felsöker.

## Q [hard · cross]: Förklara hela kedjan från `kubectl apply -f deploy.yaml` till att en Pod kör på en nod.

**A:** 1) kubectl läser YAML, validerar lokalt, skickar HTTP POST till API server med din credentials. 2) API server autentiserar (cert/token), auktoriserar (RBAC), kör admission controllers. 3) API server validerar mot schema, skriver till etcd. 4) Deployment-controller (via watch) ser ny Deployment, skapar ReplicaSet via API server. 5) ReplicaSet-controller ser ny RS, skapar Pods via API server (utan node assignment). 6) Scheduler (via watch) ser obundna Pods, väljer nod baserat på resources/affinity, uppdaterar Pod med nodeName. 7) Kubelet på vald nod (via watch) ser Pod tilldelad sig själv, anropar container runtime. 8) Container runtime pullar image, skapar container, startar processen. 9) Kubelet rapporterar Pod-status tillbaka till API server. 10) Allt är observable via `kubectl get events`.

## Q [medium · cross]: Vad är skillnaden mellan deklarativ och imperativ approach och varför är deklarativ bättre i K8s?

**A:** Deklarativ = beskriv ÖNSKAT TILLSTÅND (`apply -f deploy.yaml`), K8s konvergerar dit via reconciliation. Imperativ = säg EXAKT VAD som ska göras (`kubectl run nginx`). Varför deklarativ vinner: 1) GitOps - YAML i Git är källa till sanning, audit och rollback genom Git history. 2) Reconciliation - K8s återställer drift automatiskt. 3) Reproducerbarhet - samma YAML ger samma resultat. 4) Code review - ändringar går genom PR-process. Imperativa kommandon skapar drift mellan klustret och Git. Använd imperativ bara för debugging och tester, aldrig för persistent state.
