# Deployment issue: SSH connection timeout to Scaleway instances

**Document purpose:** Support ticket / handover for troubleshooting.  
**Date:** February 2025  
**Product:** SafePsy application deployment on Scaleway (frontend, backend, API).

**Note (March 2025):** Production has been moved to new instances: **scw-focused-dubinsky** (app, 51.159.176.62) and **scw-nostalgic-cannon** (chatbot, 51.159.119.91). The details below refer to the previous instance set.

---

## Solution (from Scaleway documentation)

Scaleway’s official troubleshooting states that **SSH connection timeout is expected** when:

- The Instance is attached to a **Private Network** that has a **Public Gateway** attached, and  
- The Public Gateway is **advertising the default route** (true by default), and  
- The Private Network has **DHCP enabled**.

In that case, traffic to the instance (including SSH to its public IP) is routed via the Public Gateway, which can cause timeouts when connecting directly to the instance’s public IP.

**Recommended fix:** Use **SSH bastion** so that SSH goes through the Public Gateway correctly.

- **SSH bastion (recommended):** [Use SSH bastion | Scaleway](https://www.scaleway.com/en/docs/public-gateways/how-to/use-ssh-bastion/)
- **Timeout cause (Private Network + Public Gateway):** [Can't connect to Instance with PN Gateway | Scaleway](https://www.scaleway.com/en/docs/public-gateways/troubleshooting/cant-connect-to-instance-with-pn-gateway/)
- **General SSH troubleshooting:** [Troubleshooting SSH connection issues to Instances | Scaleway](https://www.scaleway.com/en/docs/instances/troubleshooting/cant-connect-ssh/)

**If you add a new SSH key to the Project after the Instance was created:** Connect with an existing key (or via Serial Console / bastion), then on the instance run:  
`scw-fetch-ssh-keys --upgrade`  
so the new key is pulled from the console. Do not edit `~/.ssh/authorized_keys` manually; it is overwritten at boot.  
([Source](https://www.scaleway.com/en/docs/instances/troubleshooting/cant-connect-ssh/) – “Check that the correct public key is installed on your Instance”.)

**If you don’t have a Public Gateway:** That scenario does not apply. Then the timeout is likely due to: (1) the security group on the instance not allowing inbound TCP 22, (2) the instance not having a direct public/flexible IP, or (3) your network blocking outbound port 22 (try another network, e.g. phone hotspot).

**Update (our case):** We have **no Public Gateway** in our Scaleway project/console. So the “Private Network + Public Gateway” scenario above does **not** apply. The SSH timeout must have another cause (e.g. security group not allowing port 22, instance not having a direct public IP, or our network blocking outbound 22). See section 6 below for what we need support to confirm.

---

## 1. Summary

We cannot establish SSH connections to our Scaleway instances from a Mac client. All attempts to connect on TCP port 22 result in **connection timeout** before any authentication. The same happens when running deployment scripts and when testing with `nc`. We have confirmed that both instances are running, have the expected public IPs, and (per our configuration) inbound TCP 22 is allowed (0.0.0.0/0 or our IP). We need your help to determine whether the block is on the Scaleway side (security group, network, or instance configuration) or to confirm what we should check on our side.

---

## 2. Environment and instance details

### 2.1 Instances (Scaleway)

| Instance name              | Role                    | Public IP      | Type      | Image / OS        | Zone  |
|----------------------------|-------------------------|----------------|-----------|-------------------|------|
| **safepsy-dev-ai-service-1** (old) | Frontend + Backend + Caddy | **51.159.163.28** | DEV1-S    | Ubuntu 22.04 Jammy | PAR 2 |
| **scw-friendly-psy** (old)        | API (AI chatbot)          | **51.159.179.75** | PRO2-XXS  | Ubuntu 24.04 Noble | PAR 2 |

**Current production (March 2025):** App: **scw-focused-dubinsky** (51.159.176.62, DEV1-S). Chatbot: **scw-nostalgic-cannon** (51.159.119.91, POP2-2C-8G).

- **Instance IDs (old, for reference):**
  - safepsy-dev-ai-service-1: `3a233e6a-d343-41a8-9c9d-69b7c40a8db1`
  - scw-friendly-psy: `71aa2bd2-eefe-4965-9039-326ca582f0b1`

- **Public DNS (Scaleway):**
  - safepsy-dev-ai-service-1: `3a233e6a-d343-41a8-9c9d-69b7c40a8db1.pub.instances.scw.cloud`
  - scw-friendly-psy: `71aa2bd2-eefe-4965-9039-326ca582f0b1.pub.instances.scw.cloud`

- **SSH target:** `root@<public_ip>` (e.g. `ssh root@51.159.163.28`).

### 2.2 Client (where we run commands)

- **Machine:** Mac (MacBook), user `thibauttenenbaum`.
- **SSH client:** OpenSSH (e.g. 10.0p2, LibreSSL 3.3.6).
- **SSH key:** Ed25519; private key `~/.ssh/id_ed25519`, public key fingerprint / content (for authorized_keys):  
  `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEMrktarf+fn6NrmRlGXLETwLWa2cVHPfNy5edqCktJr` (comment: "login").
- **Network:** Standard home/office Wi‑Fi (no VPN in the tests described). We have **not** yet tested from another network (e.g. phone hotspot) at the time of writing.

### 2.3 Our understanding of Scaleway configuration

- Both instances are **running** and show **correct public IPs** in the console.
- We intend **inbound TCP port 22** to be allowed from **0.0.0.0/0** (or from our IP) for both instances. We are not sure whether the security group(s) actually attached to these instances have this rule and are correctly applied (see “What we need from you” below).

---

## 3. Symptoms (exact errors)

### 3.1 SSH

- **Command:** `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -i ~/.ssh/id_ed25519 root@51.159.163.28 "echo OK"`
- **Result:** Connection never established; after the timeout period:
  - `ssh: connect to host 51.159.163.28 port 22: Operation timed out`
- **Verbose SSH output (relevant part):**
  - `Connecting to 51.159.163.28 [51.159.163.28] port 22.`
  - `connect to address 51.159.163.28 port 22: Operation timed out`

So the TCP handshake to port 22 never completes; we never reach SSH authentication (no “Permission denied” or key prompts).

### 3.2 Port connectivity test (netcat)

- **Command (from the same Mac):**  
  `nc -vz -w 10 51.159.163.28 22`
- **Result:**  
  `nc: connectx to 51.159.163.28 port 22 (tcp) failed: Operation timed out`

Same behaviour: no TCP response on port 22 from our client’s perspective.

### 3.3 Deployment scripts

We run two scripts from the same Mac (project root of the app repo):

1. **Frontend/backend deploy:**  
   `SSH_SERVER_IP=51.159.163.28 bash deployment/update-production-with-cleanup.sh`
2. **Chatbot deploy:**  
   `SSH_SERVER_IP=51.159.179.75 bash deployment/update-production.sh`

Both scripts:

- Use SSH to run commands on the server (and one of them uses `rsync` over SSH).
- Are configured to use the same SSH key (`~/.ssh/id_ed25519` by default).

**Result:** Scripts fail at the “Checking server access” step with the same kind of error (cannot connect to server / connection timed out). We do **not** see “Permission denied (publickey)”, which suggests the failure is at the TCP/network level, not at SSH auth.

### 3.4 Health checks (HTTP)

We also run a verification script that checks HTTP endpoints:

- `http://51.159.163.28/healthz`, `http://51.159.163.28/`, `http://51.159.163.28/chat`
- `http://51.159.179.75:8000/healthz`

**Result:** All checks report failure with HTTP code `000` (connection failed / timeout). This is consistent with us not being able to reach the instances at all from our current network, though we have not isolated whether the issue is only SSH or all traffic.

---

## 4. What we did to try to solve the issue

1. **SSH key configuration**
   - Ensured deployment scripts use the correct private key (`~/.ssh/id_ed25519`) corresponding to the public key above.
   - Scripts explicitly set `SSH_OPTS` with `-i` when the key file exists. Same timeout occurs.

2. **Running from “our own machine”**
   - Ran all commands (SSH, `nc`, deploy scripts) from the same Mac where the key lives, to rule out Cursor/IDE or remote runners using a different IP or network. Timeout persists.

3. **Confirming instance and firewall intent**
   - Confirmed in Scaleway Console that both instances are running and have the expected public IPs (51.159.163.28 and 51.159.179.75).
   - Our intention is that inbound TCP 22 is allowed (0.0.0.0/0 or our IP). We have not yet had a way to independently verify from your side that the security group attached to each instance actually has an inbound rule for port 22 and that it is applied correctly.

4. **Documentation and troubleshooting**
   - Added internal troubleshooting steps in our deployment guide (e.g. `nc` tests, trying another network, checking security group and public IP). Next step on our side is to test from another network (e.g. phone hotspot) and, if possible, test port 80 to see if any traffic reaches the instances.

---

## 5. Technical details useful for support

- **Port we need:** TCP **22** (SSH).
- **Source:** Our client IP (or 0.0.0.0/0 for testing). We can provide our current public IP if needed.
- **Target:** Both instance public IPs above, port 22.
- **Expected behaviour:** TCP connection to port 22 established so that SSH authentication can proceed (we use key-based auth with the Ed25519 key above).
- **Observed behaviour:** TCP connection to port 22 never establishes; connection attempt times out from the client side.
- **Terraform:** We have Terraform that can create security groups with SSH (port 22) and other rules. The two instances above may or may not have been created/managed by that Terraform; one of them (scw-friendly-psy) may have been created manually. So the actual security group and rules attached in the console are what matter.

---

## 6. What we need from you (support team)

1. **Confirm security group and port 22**
   - For each instance (**safepsy-dev-ai-service-1**, **scw-friendly-psy**), can you confirm:
     - Which **security group** is attached?
     - Whether that group has an **inbound** rule for **TCP port 22**, and from which source (e.g. 0.0.0.0/0 or a specific IP)?
   - If there is no such rule, we need the steps (or a recommendation) to add it or attach a group that allows SSH.

2. **Confirm public IP and reachability**
   - Can you confirm that 51.159.163.28 and 51.159.179.75 are the correct, active public IPs for these instances and that traffic from the internet to these IPs on port 22 is expected to reach the instance (no extra gateway or firewall in between that could block 22)?

3. **Any known blocks on port 22**
   - Is there any Scaleway-side or region-specific (e.g. PAR 2) restriction or known issue that could cause TCP 22 to be dropped or not routed to these instances?

4. **Suggested next checks**
   - Any recommended checks we can do from our side (e.g. specific `nc`/`curl` tests, or providing our public IP for you to verify against security group rules)?
   - If the issue is likely on our network (outbound 22 blocked), do you have a recommended way to deploy (e.g. Serial Console, or a specific VPN/endpoint) that we could use as a workaround?

---

## 7. Contact and references

- **Project/repo:** SafePsy (SPappv1.1).
- **Deployment docs (internal):** `documentation/infra/terraform/SAFEPSY_APP_DEPLOYMENT.md` (includes the same instance IPs, two-server setup, and SSH troubleshooting).
- **Scripts:** `deployment/update-production-with-cleanup.sh`, `deployment/update-production.sh`, `deployment/verify-live.sh`.

If you need our current public IP, instance IDs, or more verbose logs (e.g. full `ssh -v` or `nc` output), we can provide them.

Thank you for your help.
