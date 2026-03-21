// Site & contact — edit to match your profiles.
export const SITE_TITLE = "Brian Gates";
export const SITE_DESCRIPTION =
  "Systems engineer and developer. Infrastructure, observability, and open source work.";

export const SITE_URL = "https://briangates.tech";

/** Your GitHub username (used for profile link and default repo URLs). */
export const GITHUB_USERNAME = "brngates98";

export const CONTACT = {
  email: "brian@briangates.tech",
  /** Full URL, or "" to hide */
  linkedin: "https://www.linkedin.com/in/brian-gates-177519228/",
  /** e.g. Mastodon profile URL, or "" */
  mastodon: "" as string,
};

export type FeaturedProject = {
  name: string;
  description: string;
  /** Repository or project URL */
  url: string;
  /** Short tags shown under the card */
  tags?: string[];
};

/** Featured work — shown on the home page. */
export const FEATURED_PROJECTS: FeaturedProject[] = [
  {
    name: "Intune2snipe",
    description:
      "Keeps Snipe-IT asset records in sync with Microsoft Intune — device inventory stays accurate without manual spreadsheets.",
    url: `https://github.com/${GITHUB_USERNAME}/Intune2snipe`,
    tags: ["Intune", "Snipe-IT", "Python"],
  },
  {
    name: "pve-nimble-plugin",
    description:
      "Proxmox VE storage integration for HPE Nimble SANs — use Nimble volumes for virtual machines and containers.",
    url: `https://github.com/${GITHUB_USERNAME}/pve-nimble-plugin`,
    tags: ["Proxmox", "Nimble", "Perl"],
  },
  {
    name: "GrafanaAgents",
    description:
      "Shared Grafana Agent-style configs for metrics, logs, and pipelines — practical examples for observability setups.",
    url: `https://github.com/${GITHUB_USERNAME}/GrafanaAgents`,
    tags: ["Grafana", "Go", "Observability"],
  },
  {
    name: "UniPoller",
    description:
      "Collects UniFi controller data for Grafana, InfluxDB, Prometheus, and more — I am a contributor to this open-source project.",
    url: "https://github.com/unpoller/unpoller",
    tags: ["UniFi", "Go", "Observability", "Contributor"],
  },
];
