---
title: "HPE Nimble on Proxmox: what the custom storage plugin gives you"
description: "An honest overview of pve-nimble-plugin — current capabilities, real-lab status, and features that set it apart from typical Proxmox storage integrations."
pubDate: 2026-04-15
---

Most Proxmox storage types either present **a LUN you already carved** (kernel iSCSI) or **a file share** (NFS, Ceph, ZFS on local disks). A smaller set of **vendor plugins** talk to an array API so Proxmox can create volumes and snapshots for you. This post is about one of those: **[pve-nimble-plugin](https://github.com/brngates98/pve-nimble-plugin)** — a Perl storage backend for **HPE Nimble** over **iSCSI**, with the Nimble **REST API** on port **5392**.

I maintain it for my own lab and production-style testing; as of **v0.0.20** it has seen broad exercise on real **PVE + Nimble** (VM disks, snapshots, rollback, clone, move disk, capacity, multipath, array-side snapshot import). Your firmware and network may still differ — treat your own validation as the final word.

![Proxmox VE 8 — VM 103 Snapshots tab showing Nimble-imported array snapshots (nimble* names) with per-volume descriptions from the array](/blog/pve-nimble-vm103-snapshots.png)

*VM **103 (test)** on a lab cluster: array-created snapshots appear in the normal Proxmox snapshot list. Descriptions show **`volume: snapshot name`** from Nimble (e.g. schedule / collection names), not a generic “imported” placeholder.*

---

## What you get in one sentence

**Proxmox creates and owns Nimble volumes as VM (and optional LXC) disks**, maps them over iSCSI (with optional multipath), and uses **array snapshots** for VM snapshot, rollback, and clone — including pulling **snapshots taken only on the array** into the VM’s snapshot list so you can roll back from the UI.

---

## Current state (high level)

- **Install:** APT repo on [GitHub Pages](https://brngates98.github.io/pve-nimble-plugin/) or `.deb` from [Releases](https://github.com/brngates98/pve-nimble-plugin/releases); scripted install supports **single node or all cluster nodes** over SSH.
- **Core:** Create / delete / resize / rename volumes via API; **access control** per volume; **status** and pool-aware capacity (with arrays fallback when pool summaries are thin).
- **Snapshots:** PVE-driven create/delete/rollback; **storage-side** snapshot method for QEMU (block device path).
- **Array sync:** Periodic import of **Nimble-only** snapshots into **`/etc/pve/qemu-server/<vmid>.conf`** as **`nimble<time>`** entries (QEMU VMs), with **snap time** hydrated when the list API omits **`creation_time`** (detail GET + careful merge). **v0.0.20** fixed rollback when the stored key and **`snaptime`** could diverge across disks.
- **UX detail:** Import descriptions show **`array volume name: Nimble snapshot name`** per LUN (semicolon-separated when one PVE snapshot groups several disks).
- **Extras:** **Clone from snapshot** (POST volumes with **`clone=true`**), **`raw+size`** import/export (e.g. Veeam-style flows), optional **`rootdir`** for LXC on raw block, **auto iSCSI discovery** from Nimble subnets (with optional extra portals), **multipath** helpers and **`conf.d`** aliases, session **token cache** and **401** retry.

CI runs unit tests and **Perl syntax checks** in Docker for **bookworm** and **trixie** (PVE 8 / 9–ish baselines).

---

## What most plugins (and stock types) do not do

These are differentiators in practice — not a ranking of “best storage,” just **capabilities that are uncommon** in the Proxmox ecosystem.

1. **Per-VM-disk volumes on the array**  
   Each Proxmox disk can be its **own Nimble volume** with a predictable name (`vm-<id>-disk-…`), not a shared datastore you subdivide by hand. That maps cleanly to **per-disk snapshot and restore** semantics on the array.

2. **Two-way snapshot story**  
   You get **PVE → Nimble** snapshots for normal VM operations, **and** a path for **Nimble → PVE**: schedules, collections, or manual snaps on the array can show up under **VM → Snapshots** after sync (throttled, ~30s per store). Few integrations both **drive** the array and **reconcile** foreign snapshots into the VM config.

3. **Firmware-tolerant snapshot metadata**  
   Some Nimble builds return **sparse** rows from **`GET snapshots?vol_id=`** (missing **`vol_name`**, **`creation_time`**, etc.). The plugin fills identity from context, derives ordering time from **`creation_time`**, **`last_modified`**, embedded timestamps in **`name`**, or stable fallbacks, and **hydrates** from **`GET snapshots/:id`** (and related reads) without letting JSON **`null`** clobber good fields. That class of “API quirk” work is **not** something generic iSCSI or every vendor plugin does.

4. **Activate-time iSCSI discovery wired to the array**  
   Default **auto discovery** walks Nimble **subnets** (including per-subnet GET for authoritative discovery IPs), merges optional **`iscsi_discovery_ips`**, and can fall back to live **`iscsiadm`** session hints. You can turn it off and stay fully manual.

5. **Initiator groups and ACLs as part of the workflow**  
   Optional named **initiator group**, or automatic **`pve-<nodename>`** from the node IQN, plus **access control records** so the right IQN sees the right volume — aligned with how Nimble expects iSCSI to work.

6. **Multipath ownership**  
   WWID → alias snippets under **`/etc/multipath/conf.d/nimble-<storeid>.conf`**, with a persisted WWID cache under **`/etc/pve/priv/nimble/`**, so aliases survive **map** / **free** / **activate** without hand-editing multipath for every volume.

7. **Move disk / delete source teardown**  
   The same **disconnect → offline → purge snaps → DELETE** discipline used for rollback prep shows up when **freeing** a volume (e.g. storage migration with delete source), including retries when the array returns **409** / permission-style errors.

8. **Packaging and operations**  
   **Debian package** with **postinst** restarting **`pvedaemon`**, **`pvestatd`**, **`pveproxy`**, **`pvescheduler`** (intentionally **not** **`pve-cluster`**, to avoid long **`apt`** stalls). That’s a deliberate choice called out in the project docs.

---

## What it is not

- **Not a backup target** for **`vzdump`** in the sense of “dump directory on this store” — content types are oriented around **images** and optional **`rootdir`**, not backup ISO/snippets in the usual NFS sense.
- **Not a substitute for Nimble replication DR** — it integrates **control and presentation**; your replication and protection design still live on the array (orchestration you already trust).
- **Not every Nimble feature exposed** — the surface area is what Proxmox’s storage plugin model needs plus a few high-value extras (clone, import/export format, collections, etc.).

---

## Where to go next

- **Hands-on walkthrough** (longer, step-by-step): [From zero to fully protected Nimble storage on Proxmox](/blog/proxmox-hpe-nimble-plugin/) (currently unlisted; link works if you have it).
- **Repo:** [github.com/brngates98/pve-nimble-plugin](https://github.com/brngates98/pve-nimble-plugin) — README, troubleshooting, **API validation** notes, diagnostic script for snapshot sync.
- **Releases:** [github.com/brngates98/pve-nimble-plugin/releases](https://github.com/brngates98/pve-nimble-plugin/releases) — changelog-style notes per tag.

If you’re standardizing on Nimble behind Proxmox and want **array-native protection** without giving up the **normal VM snapshot UX**, this plugin is aimed squarely at that gap — with the caveats that **cluster-wide installs**, **iSCSI reachability**, and **API behavior per firmware** remain your operational checklist.
