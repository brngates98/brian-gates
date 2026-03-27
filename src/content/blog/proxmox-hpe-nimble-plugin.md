---
title: "From zero to fully protected Nimble storage on Proxmox"
description: "The same journey as the full setup guide — plan the network, prep the array, install the plugin, optional multipath, then prove it with a VM disk and snapshots."
pubDate: 2026-03-26
unlisted: true
---

“Fully protected storage” here means something specific: **one Nimble volume per VM disk** (no giant LUN plus LVM gymnastics), **snapshots and rollback from Proxmox**, **resize from the UI**, and optionally **multipath** when you have redundant paths. The [pve-nimble-plugin](https://github.com/brngates98/pve-nimble-plugin) is what ties Proxmox to the array: REST API for volume work, iSCSI for data, and **activate-time discovery** by default so you are not hand-wiring portals on every host unless you want to.

This post follows the same story as the repo’s step-by-step guide ([*Setting up fully protected storage*](https://github.com/brngates98/pve-nimble-plugin/blob/main/docs/00-SETUP-FULLY-PROTECTED-STORAGE.md)) — just written like something you’d send a colleague before their first build.

---

## What you’re building

When you’re done, you should be able to:

- Create VM disks that are **individual Nimble volumes**, not slices of one big LUN.
- Use **Proxmox VM snapshots** (backed by the array) and **rollback** when something goes wrong.
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

## Install the plugin on every node

Cluster config for storage replicates via corosync, but the **Perl plugin package must be installed on each node** — otherwise one node simply won’t know how to talk to Nimble.

Scripted install (recommended):

```bash
# Single node
curl -fsSL https://raw.githubusercontent.com/brngates98/pve-nimble-plugin/main/scripts/install-pve-nimble-plugin.sh | sudo bash

# Whole cluster — dry-run first, then go
curl -fsSL https://raw.githubusercontent.com/brngates98/pve-nimble-plugin/main/scripts/install-pve-nimble-plugin.sh | sudo bash -s -- --all-nodes --dry-run
curl -fsSL https://raw.githubusercontent.com/brngates98/pve-nimble-plugin/main/scripts/install-pve-nimble-plugin.sh | sudo bash -s -- --all-nodes
```

You can confirm with:

```bash
dpkg -l | grep libpve-storage-nimble-perl
```

The long-form doc also has **manual APT** and **.deb** install paths if you pin versions — same repo.

---

## open-iscsi and the IQN

The plugin registers each host with the Nimble using the node’s **iSCSI initiator name**. The scripted install pulls in **`open-iscsi`**; you just need a real IQN on disk.

```bash
sudo cat /etc/iscsi/initiatorname.iscsi
```

You should see `InitiatorName=iqn.…`. If you’re fixing it:

```bash
echo "InitiatorName=iqn.1993-08.org.debian:01:$(hostname)" | sudo tee /etc/iscsi/initiatorname.iscsi
sudo systemctl restart iscsid
```

Sanity check that the kernel sees an iSCSI host:

```bash
ls /sys/class/iscsi_host/
```

*[Screenshot: Terminal — contents of initiatorname.iscsi and listing of /sys/class/iscsi_host/]*

---

## Multipath (optional but the guide’s “recommended” once you have dual paths)

If you only have one path to the array, you can skip this. If you have **two paths** (or more), install multipath tools and **blacklist everything** except Nimble so you don’t multipath local disks by accident.

```bash
sudo apt install multipath-tools
sudo systemctl enable multipathd
sudo systemctl start multipathd
```

Then edit **`/etc/multipath.conf`**: use a blacklist for generic devices, **`blacklist_exceptions`** for Nimble (`vendor "Nimble"` / `product "Server"`), and a **`devices`** block tuned for Nimble. The [plugin README](https://github.com/brngates98/pve-nimble-plugin/blob/main/README.md#multipath-optional) has a full **Nimble-only** example — copy that rather than inventing one.

```bash
sudo multipathd reconfigure
sudo multipath -ll
```

*[Screenshot: `multipath -ll` output showing a Nimble LUN with multiple paths]*

---

## Add Nimble storage to Proxmox

From **any** node (config syncs cluster-wide):

```bash
pvesm add nimble <storage_id> \
  --address https://<NIMBLE_MGMT_IP_OR_FQDN> \
  --username <API_USER> \
  --password '<API_PASSWORD>' \
  --content images
```

Name `<storage_id>` something you’ll recognize (e.g. `nimble-prod`). You **don’t** have to pre-create an initiator group: the plugin can create **`pve-<nodename>`** and attach this host. If you already use a named group on the array, add **`--initiator_group <name>`**.

If you **disabled** auto discovery, you’ll run discovery and login on each node yourself — the full guide has the exact **`iscsiadm`** sequence:

```bash
sudo iscsiadm -m discovery -t sendtargets -p <NIMBLE_DISCOVERY_IP>
sudo iscsiadm -m node --op update -n node.startup -v automatic
sudo iscsiadm -m node --login
```

*[Screenshot: Terminal after successful `pvesm add nimble …`]*

*[Screenshot: Datacenter → Storage — Nimble entry, Content includes Disk image]*

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
| Initiator / ACL errors | Valid **`InitiatorName`** in **`initiatorname.iscsi`**, **`open-iscsi`** installed. |
| No LUN after creating a disk | **`iscsiadm -m session`**, rescan, firewall to discovery IPs. |
| Multipath not grouping | **`multipath.conf`** exceptions + **`multipathd reconfigure`**. |

More detail, debug flags, and **`NIMBLE_DEBUG`** live in the [README troubleshooting](https://github.com/brngates98/pve-nimble-plugin/blob/main/README.md#troubleshooting).

---

## Where to read the full playbook

The repo’s [**00 – Setting up fully protected storage**](https://github.com/brngates98/pve-nimble-plugin/blob/main/docs/00-SETUP-FULLY-PROTECTED-STORAGE.md) is the authoritative checklist: same steps, more tables, restore workflows, and quick reference. Use this post as the hand-wavy tour; use that doc when you’re building it for real.

---

*This post is unlisted — share the link if it helps; it won’t appear on the main blog index.*
