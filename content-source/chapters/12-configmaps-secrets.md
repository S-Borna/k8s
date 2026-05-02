---
id: 12
title: "ConfigMaps and Secrets"
titleSv: "ConfigMaps och Secrets"
estimatedMinutes: 35
---

# Sammanfattning

Appar har två delar: kod och konfiguration. Koden är i container-imagen. Konfigurationen separeras ut via **ConfigMaps** (icke-känslig) och **Secrets** (känslig).

## Varför separera?

- Samma image kan köras i dev, staging, prod med olika config
- Configändringar kräver inte ny build
- Hemligheter (lösenord, API-nycklar) hålls utanför images
- Versionering av config separat från kod

## ConfigMaps

För icke-känslig konfiguration: feature flags, hostnames, log levels, hela config-filer.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  log-level: "debug"
  database-host: "db.example.com"
  app-config.yaml: |
    server:
      port: 8080
```

## Secrets

För känslig data: lösenord, API-nycklar, certifikat. **Base64-kodade** (inte krypterade!) by default.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  username: dXNlcg==        # base64 av "user"
  password: cGFzc3dvcmQ=    # base64 av "password"
```

För riktig kryptering: aktivera **encryption at rest** i etcd, eller använd external secret managers (Vault, AWS Secrets Manager).

## Fyra sätt att använda dem i Pods

**1. Environment variables:**
```yaml
env:
- name: LOG_LEVEL
  valueFrom:
    configMapKeyRef:
      name: app-config
      key: log-level
```

**2. Hela ConfigMap som env vars:**
```yaml
envFrom:
- configMapRef:
    name: app-config
```

**3. Mountad som filer:**
```yaml
volumeMounts:
- name: config-vol
  mountPath: /etc/config
volumes:
- name: config-vol
  configMap:
    name: app-config
```

**4. Command line args:**
```yaml
args:
- "--log-level=$(LOG_LEVEL)"
env:
- name: LOG_LEVEL
  valueFrom:
    configMapKeyRef:
      name: app-config
      key: log-level
```

## Update-beteende

**Env vars** uppdateras INTE när ConfigMap/Secret ändras — Pod måste startas om.

**Mountade volymer** uppdateras automatiskt (kan ta upp till en minut). Appen måste hantera reload.

# Giacomos tillägg

<!-- Fylls i efter lektionen -->

# Lektion

<!-- Fylls i efter lektionen -->

# Hands-on

## 1. Skapa ConfigMap från kommandoraden

```bash
kubectl create configmap app-config \
  --from-literal=log-level=debug \
  --from-literal=database-host=db.example.com
```

## 2. Inspektera

```bash
kubectl get configmap app-config -o yaml
```

## 3. Använd i Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: config-pod
spec:
  containers:
  - name: app
    image: busybox
    command: ["sh", "-c", "echo $LOG_LEVEL && sleep 3600"]
    env:
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: log-level
```

## 4. Skapa Secret

```bash
kubectl create secret generic db-secret \
  --from-literal=username=admin \
  --from-literal=password=supersecret
```

## 5. Verifiera (base64)

```bash
kubectl get secret db-secret -o yaml
```

Förväntat: Värden är base64-kodade. Decode med `echo "..." | base64 -d`.

# Lektion hands-on

<!-- Fylls i efter lektionen -->

# Flashcards

## Q: Vad är skillnaden mellan ConfigMap och Secret?

**A:** ConfigMap = icke-känslig konfiguration (log levels, feature flags, hostnames). Secret = känslig data (lösenord, API-nycklar, certifikat). Tekniskt nästan identiska, men Secrets är base64-kodade och behandlas mer försiktigt av K8s (visas inte i `describe`, kan krypteras at rest, kan integreras med externa secret managers).

## Q: Är Secrets krypterade?

**A:** By default: nej, bara base64-kodade. Detta är OBFUSKERING, inte säkerhet. För riktig säkerhet: aktivera encryption at rest i etcd (gör att data krypteras innan det skrivs till disk), eller använd external secret managers (Vault, AWS Secrets Manager) via CSI Secrets Store.

## Q: Vad är skillnaden mellan att använda ConfigMap som env var vs som mountad fil?

**A:** Env vars: enkelt men uppdateras INTE när ConfigMap ändras (Pod måste startas om). Mountade filer: uppdateras automatiskt (upp till 1 min fördröjning). För dynamic config använder man mountade filer + en process som watchar filsystemet eller hot-reloadar.

## Q: Varför uppdateras env vars inte automatiskt?

**A:** Env vars sätts vid Pod-start och är immutabla i den körande processen - K8s kan inte ändra dem utan att starta om Podden. Mountade filer däremot kan uppdateras live eftersom kubelet skriver om filerna i volymen. Detta är en fundamental Linux-begränsning, inte ett K8s-val.

## Q: Hur skapar man Secret från en fil?

**A:** `kubectl create secret generic my-secret --from-file=key=path/to/file`. Filens innehåll blir base64-kodat och lagras under nyckeln "key". Användbart för certifikat, SSH-nycklar. Filen ska INTE checkas in i Git - skapa Secret manuellt eller via CI/CD.

## Q: Varför ska man inte hardcoda config i container-imagen?

**A:** Samma image ska kunna köras i dev/staging/prod med olika config. Hardcodad config kräver olika images per miljö - dyrt, sårbart för misstag. Separation av config från kod är en grundprincip i 12-factor apps. K8s ConfigMaps och Secrets är K8s implementation av detta.

## Q: Vad är `envFrom`?

**A:** Mappar ALLA nycklar i en ConfigMap eller Secret till env vars i Podden, utan att lista varje nyckel manuellt. Smidigt för många config-nycklar. Risk: alla nycklar exponeras, vilket kan vara oavsiktligt om ConfigMap har känslig data.
