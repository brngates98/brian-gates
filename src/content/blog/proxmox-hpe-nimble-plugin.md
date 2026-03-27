---
title: "From zero to fully protected Nimble storage on Proxmox"
description: "Use Nimble snapshotting and replication with Proxmox with less CLI and less busywork — same setup path as the fully protected storage guide."
pubDate: 2026-03-26
unlisted: true
---

This walkthrough uses the [pve-nimble-plugin](https://github.com/brngates98/pve-nimble-plugin) to put **HPE Nimble** behind **Proxmox VE** in a normal way: you create and resize VM disks in Proxmox, take **snapshots** and **rollback** from there, and keep **replication** and protection policies where they already live—the Nimble side.

The goal is simply fewer manual steps and less repeated CLI on each node than you’d need if you were mapping LUNs and iSCSI yourself for every disk.

---

## What you’re building

When you’re done, you should be able to:

- Create VM disks that are **individual Nimble volumes**, not slices of one big LUN—so array snapshot and replication semantics map cleanly to real workloads.
- Use **Proxmox VM snapshots** (backed by the array) and **rollback** when something goes wrong, without a separate ritual per host.
- **Grow disks** from Proxmox and extend inside the guest.
- Optionally run **multipath** so dual fabrics or dual NICs collapse to one device per LUN.
- Run it all in a **cluster**: storage config syncs; the plugin still has to exist **on every node**.

If that matches what you want, the rest is execution.

---

## Prerequisites (sanity check)

You’ll want Proxmox VE **8.2+** (single node or cluster), a Nimble with **REST API** reachable on port **5392**, and at least one **iSCSI subnet** with a **discovery IP** your nodes can reach. Your API user needs to be allowed to create volumes, **initiator groups**, and **access control records**. Sudo on each node goes without saying.

---

## Plan the network (two kinds of “reachable”)

Think in two lanes:

- **Management** — Proxmox needs to hit the Nimble at something like `https://<mgmt_ip>:5392` for the API.
- **iSCSI** — Each node needs a path to whatever **discovery IPs** the Nimble advertises for iSCSI. That might be one VLAN or two; if you have **two paths** (e.g. 10.0.1.x and 10.0.2.x), you’re also setting yourself up for multipath later.

*[Screenshot: Simple network sketch — Proxmox nodes → management IP for API; separate lines to iSCSI discovery subnets]*

---

## Prep the Nimble array

In the Nimble UI or your runbook: confirm **REST API** is enabled on the management interface, and that you have at least one **iSCSI-enabled subnet** (type **data** or **mgmt,data**) with a **discovery IP**. The plugin’s default **`auto_iscsi_discovery`** uses those when storage **activates** on each node (you can turn it off with **`no`** / **`0`** if you prefer full manual discovery).

Quick proof from any Proxmox node that the API path is real:

```bash
curl -sk -X POST "https://<NIMBLE_MGMT_IP>:5392/v1/tokens" \
  -H "Content-Type: application/json" \
  -d '{"data":{"username":"<user>","password":"<password>"}}'
```

You want JSON with **`data.session_token`**. If that’s there, the control plane is ready.

*[Screenshot: Nimble UI — network / subnet showing iSCSI and discovery IP (blur sensitive bits)]*

---

## Install Plugin

The **same script** can install the plugin on a **single node** or on a **whole cluster**: run it locally on one host, or pass **`--all-nodes`** so it installs on every cluster member over SSH. Use the single-node commands below for one machine, or the **`--all-nodes`** block when you want the whole cluster covered.

In a cluster, **each** node that will use Nimble storage still needs the package on that host; **storage** definitions sync via corosync, but the **plugin** does not.

This guide assumes you use the **install script** from the repo. In short, it: **checks** you’re on a real Proxmox VE host; **adds** the project APT repo (or you can pass **`--version`** to pull a specific `.deb` from GitHub instead); **runs** `apt update` and installs **`open-iscsi`** plus **`libpve-storage-nimble-perl`** (iSCSI stack + initiator IQN on the box, plus the storage plugin); then **restarts** the usual PVE daemons (`pvedaemon`, `pveproxy`, `pvestatd`, scheduler, HA if present) so the new backend is picked up.

```bash
# Single node
curl -fsSL https://raw.githubusercontent.com/brngates98/pve-nimble-plugin/main/scripts/install-pve-nimble-plugin.sh | sudo bash

# Whole cluster — dry-run first, then go
curl -fsSL https://raw.githubusercontent.com/brngates98/pve-nimble-plugin/main/scripts/install-pve-nimble-plugin.sh | sudo bash -s -- --all-nodes --dry-run
curl -fsSL https://raw.githubusercontent.com/brngates98/pve-nimble-plugin/main/scripts/install-pve-nimble-plugin.sh | sudo bash -s -- --all-nodes
```

Use **`--yes`** if you want non-interactive confirmation, **`--version X.Y.Z`** to pin a release. Confirm the package landed with:

```bash
dpkg -l | grep libpve-storage-nimble-perl
```

*[Screenshot: Installer finishing with “installation complete” (or equivalent) on one node]*

---

## Multipath (optional but the guide’s “recommended” once you have dual paths)

If you only have one path to the array, you can skip this. If you have **two paths** (or more), install multipath tools and **blacklist everything** except Nimble so you don’t multipath local disks by accident.

```bash
sudo apt install multipath-tools
sudo systemctl enable multipathd
sudo systemctl start multipathd
```

Then put something like this in **`/etc/multipath.conf`** — **Nimble-only**: blacklist everything by default, then allow Nimble devices and tune them for ALUA (same example as the [plugin README](https://github.com/brngates98/pve-nimble-plugin/blob/main/README.md#multipath-optional)):

```text
defaults {
    user_friendly_names yes
    find_multipaths     no
}
blacklist {
    devnode "^(ram|raw|loop|fd|md|dm-|sr|scd|st)[0-9]*"
    devnode "^hd[a-z]"
    device { vendor ".*" product ".*" }
}
blacklist_exceptions {
    device { vendor "Nimble" product "Server" }
}
devices {
    device {
        vendor               "Nimble"
        product              "Server"
        path_grouping_policy group_by_prio
        prio                 "alua"
        hardware_handler     "1 alua"
        path_selector        "service-time 0"
        path_checker         tur
        no_path_retry        30
        failback             immediate
        fast_io_fail_tmo     5
        dev_loss_tmo         infinity
    }
}
```

```bash
sudo multipathd reconfigure
sudo multipath -ll
```

**Other Proxmox nodes in the cluster:** set up **`multipath-tools`** on each node the same way (`apt install`, enable `multipathd`). After you’re happy with **`/etc/multipath.conf`** on one host, copy it to the others and reload multipath there (replace hostnames or IPs with your nodes):

```bash
scp /etc/multipath.conf root@<pve2-hostname-or-ip>:/etc/multipath.conf
scp /etc/multipath.conf root@<pve3-hostname-or-ip>:/etc/multipath.conf
```

```bash
ssh root@<pve2-hostname-or-ip> 'multipathd reconfigure && multipath -ll'
ssh root@<pve3-hostname-or-ip> 'multipathd reconfigure && multipath -ll'
```

You need **root SSH** to the other nodes (normal on Proxmox) or copy to your admin user and **`sudo`** move into place. Repeat for every node that will use Nimble with multipath.

*[Screenshot: `multipath -ll` output showing a Nimble LUN with multiple paths]*

---

## Add Nimble storage to Proxmox

Run **`pvesm add`** from **any** node — storage definitions sync across the cluster. Pick a **storage ID** (the name Proxmox shows) that you’ll recognize, e.g. `nimble-prod`.

### Quick setup

Minimal example: Nimble management URL, API user, password, and disk images as content. The plugin can **create** an initiator group named **`pve-<nodename>`** if you don’t name one.

```bash
pvesm add nimble nimble-prod \
  --address https://<NIMBLE_MGMT_IP_OR_FQDN> \
  --username <API_USER> \
  --password '<API_PASSWORD>' \
  --content images
```

*[Screenshot: Terminal after successful `pvesm add nimble …`]*

*[Screenshot: Datacenter → Storage — Nimble entry, Content includes Disk image]*

### More `pvesm` examples (optional)

Click to expand patterns you might use alongside or instead of the minimal command.

<details>
<summary><strong>Existing initiator group on the array</strong></summary>

If you already have an initiator group in Nimble (instead of letting the plugin create <code>pve-&lt;nodename&gt;</code>):

```bash
pvesm add nimble nimble-prod \
  --address https://<NIMBLE_MGMT_IP_OR_FQDN> \
  --username <API_USER> \
  --password '<API_PASSWORD>' \
  --initiator_group <GROUP_NAME_ON_NIMBLE> \
  --content images
```

</details>

<details>
<summary><strong>Default pool and volume collection</strong></summary>

Put new volumes in a specific **pool** and add them to a **volume collection** (useful for Nimble-side snapshot schedules and grouping):

```bash
pvesm add nimble nimble-prod \
  --address https://<NIMBLE_MGMT_IP_OR_FQDN> \
  --username <API_USER> \
  --password '<API_PASSWORD>' \
  --pool_name <POOL_NAME> \
  --volume_collection <COLLECTION_NAME> \
  --content images
```

</details>

<details>
<summary><strong>Prefix for volume names on the array</strong></summary>

Prefix every volume name Nimble sees (helps when multiple environments share one array):

```bash
pvesm add nimble nimble-prod \
  --address https://<NIMBLE_MGMT_IP_OR_FQDN> \
  --username <API_USER> \
  --password '<API_PASSWORD>' \
  --vnprefix <PREFIX_> \
  --content images
```

</details>

<details>
<summary><strong>Extra discovery IPs or disable auto discovery</strong></summary>

By default the plugin runs **iSCSI discovery when storage activates** and uses subnets from the Nimble API. If you need **additional** portals beyond what the API returns:

```bash
pvesm add nimble nimble-prod \
  --address https://<NIMBLE_MGMT_IP_OR_FQDN> \
  --username <API_USER> \
  --password '<API_PASSWORD>' \
  --iscsi_discovery_ips <IP1>,<IP2> \
  --content images
```

To **turn off** activate-time discovery and drive iSCSI yourself (each node):

```bash
pvesm add nimble nimble-prod \
  --address https://<NIMBLE_MGMT_IP_OR_FQDN> \
  --username <API_USER> \
  --password '<API_PASSWORD>' \
  --auto_iscsi_discovery 0 \
  --content images
```

Then on each node, discovery and login manually, for example:

```bash
sudo iscsiadm -m discovery -t sendtargets -p <NIMBLE_DISCOVERY_IP>
sudo iscsiadm -m node --op update -n node.startup -v automatic
sudo iscsiadm -m node --login
```

</details>

<details>
<summary><strong>Verify TLS to the Nimble API</strong></summary>

If the array presents a certificate your nodes trust, you can enable SSL verification (default is off for common lab/self-signed setups):

```bash
pvesm add nimble nimble-prod \
  --address https://<NIMBLE_MGMT_IP_OR_FQDN> \
  --username <API_USER> \
  --password '<API_PASSWORD>' \
  --check_ssl yes \
  --content images
```

</details>

<details>
<summary><strong>Debug logging (troubleshooting)</strong></summary>

```bash
pvesm add nimble nimble-prod \
  --address https://<NIMBLE_MGMT_IP_OR_FQDN> \
  --username <API_USER> \
  --password '<API_PASSWORD>' \
  --debug 1 \
  --content images
```

Levels: `0` off, `1` basic, `2` verbose, `3` trace. You can also change later with **`pvesm set <storage_id> --debug 1`**.

</details>

### Nimble storage options (reference)

| Option | Role |
|--------|------|
| **`address`** | Nimble management URL (`https://host` — API port 5392 is used by default). |
| **`username`** / **`password`** | REST API credentials. Password is stored in cluster config / priv files like other PVE backends. |
| **`content`** | What Proxmox may store here; **`images`** is typical for VM disks. |
| **`initiator_group`** | Optional. Use an existing Nimble initiator group name; if omitted, the plugin can create **`pve-<nodename>`**. |
| **`pool_name`** | Optional. Default Nimble pool for new volumes. |
| **`volume_collection`** | Optional. Add new volumes to this collection (e.g. for array snapshot policies). |
| **`vnprefix`** | Optional. Prefix for volume names on the array. |
| **`auto_iscsi_discovery`** | Default on. Set **`0`** or **`no`** to skip activate-time discovery (you manage `iscsiadm` yourself). |
| **`iscsi_discovery_ips`** | Optional. Extra comma-separated discovery IPs if the API path isn’t enough. |
| **`check_ssl`** | Default **`no`**. Set **`yes`** to verify TLS to the Nimble API. |
| **`token_ttl`** | Optional. Session token cache lifetime in seconds (default **3600**). |
| **`debug`** | Optional. **`0`–`3`** — plugin log verbosity for troubleshooting. |

After the store exists, use **`pvesm set <storage_id> …`** to adjust most options without removing storage. Custom storage types are often edited from the shell or **`storage.cfg`** rather than the full GUI on stock PVE.

---

## Verify in the UI

Open **Datacenter → Storage**, click your Nimble store, and check **Summary** for **Usage** and **Free** from the pool. If you’re using auto discovery, **touch the storage from another node** (browse or create a VM there) so that node activates storage and runs discovery too.

*[Screenshot: Storage summary — usage/free for the Nimble pool]*

---

## Create a VM disk and exercise resize

Create or edit a VM, **Hardware → Add → Hard disk**, pick your Nimble storage, set a size, add. Boot the guest, confirm the disk, then **resize** from Proxmox and grow the partition/filesystem inside the guest. That confirms create + map + resize end to end.

*[Screenshot: VM hardware — disk on Nimble storage]*

*[Screenshot: Guest showing the new disk or `lsblk`]*

---

## Snapshots and rollback (this is the “fully protected” moment)

With a VM using a Nimble disk:

1. Take a **VM snapshot** (VM → Snapshot).
2. Change something obvious in the guest (create a file, break something harmless).
3. **Rollback** to the snapshot — the guest should match the snapshot.

Optionally **clone from a snapshot** to spawn a new VM from that point. After this, you’ve proven **array-backed snapshots** through Proxmox, not just “a disk that mounts.”

*[Screenshot: VM Snapshots — snapshot taken]*

*[Screenshot: Rollback dialog or post-rollback guest state]*

---

## When you need to restore from the array (not only from PVE’s list)

The long guide spells out three patterns; here’s the short version:

- **PVE snapshot rollback** — use **VM → Snapshots → Rollback** when the snapshot was taken in Proxmox and you want the **whole VM** back. That drives the array in place for all disks in that snapshot.
- **Array-only snapshot** (schedule or manual in Nimble) — either **clone** the snapshot to a **new** volume (safe, attach as extra disk for recovery) or **restore in place** on the volume (destructive; VM should be off). The repo doc walks through Nimble UI steps and even a **curl** example for **`POST …/volumes/<id>/actions/restore`** if you need automation.

If you’re doing single-disk gymnastics, PVE’s rollback is **VM-wide**, so you might clone from snapshot or use Nimble for one volume — the full doc has a paragraph on that tradeoff.

---

## If something breaks

| What you see | Where to look first |
|--------------|---------------------|
| Storage missing on a node | Plugin installed **on every node**? Restart **`pvedaemon`** after install. |
| Can’t get discovery IPs | At least one iSCSI subnet with a **discovery IP** on the array. |
| Initiator / ACL errors | Installer pulls in **`open-iscsi`**; if errors persist, check **`/etc/iscsi/initiatorname.iscsi`** (see [README](https://github.com/brngates98/pve-nimble-plugin/blob/main/README.md#troubleshooting)). |
| No LUN after creating a disk | **`iscsiadm -m session`**, rescan, firewall to discovery IPs. |
| Multipath not grouping | **`multipath.conf`** exceptions + **`multipathd reconfigure`**. |

More detail, debug flags, and **`NIMBLE_DEBUG`** live in the [README troubleshooting](https://github.com/brngates98/pve-nimble-plugin/blob/main/README.md#troubleshooting).

---

## Where to read the full playbook

The repo’s [**00 – Setting up fully protected storage**](https://github.com/brngates98/pve-nimble-plugin/blob/main/docs/00-SETUP-FULLY-PROTECTED-STORAGE.md) is the authoritative checklist: same steps, more tables, restore workflows, and quick reference. Use this post as the hand-wavy tour; use that doc when you’re building it for real.

---

*This post is unlisted — share the link if it helps; it won’t appear on the main blog index.*
