// Site & contact — edit to match your profiles.
export const SITE_TITLE = "Brian Gates";
export const SITE_DESCRIPTION =
  "Systems engineer and developer — portfolio and contact.";

export const SITE_URL = "https://briangates.tech";

/** Your GitHub username (used for profile link and default repo URLs). */
export const GITHUB_USERNAME = "brngates98";

export const CONTACT = {
  email: "brian@briangates.tech",
  /** Full URL, or "" to hide */
  linkedin: "https://www.linkedin.com/in/brian-gates-177519228/",
  /** GrafanaAgents GitHub repo — "" to hide */
  grafanaAgents: `https://github.com/${GITHUB_USERNAME}/GrafanaAgents`,
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

/**
 * Curated from your public GitHub (stars, recency, and fit for a portfolio).
 * Edit anytime — see https://github.com/brngates98?tab=repositories
 */
export const FEATURED_PROJECTS: FeaturedProject[] = [
  {
    name: "Intune2snipe",
    description:
      "Microsoft Intune → Snipe-IT: sync inventory and asset data through the Snipe-IT API.",
    url: `https://github.com/${GITHUB_USERNAME}/Intune2snipe`,
    tags: ["Intune", "Snipe-IT", "Python"],
  },
  {
    name: "pve-nimble-plugin",
    description:
      "Proxmox VE storage plugin for HPE Nimble / Nimble SAN volumes as VM and container storage.",
    url: `https://github.com/${GITHUB_USERNAME}/pve-nimble-plugin`,
    tags: ["Proxmox", "Nimble", "Perl"],
  },
  {
    name: "GrafanaAgents",
    description:
      "Shared Grafana Agent (and related) configs for metrics, logs, and observability pipelines.",
    url: `https://github.com/${GITHUB_USERNAME}/GrafanaAgents`,
    tags: ["Grafana", "Go", "Observability"],
  },
];
