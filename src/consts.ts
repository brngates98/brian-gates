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
  linkedin: "" as string,
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
 * Featured GitHub projects — replace with repos you want to highlight.
 * `url` should be the repo or project page on GitHub.
 */
export const FEATURED_PROJECTS: FeaturedProject[] = [
  {
    name: "brian-gates",
    description:
      "This portfolio site — Astro, static build, GitHub Pages, custom domain.",
    url: `https://github.com/${GITHUB_USERNAME}/brian-gates`,
    tags: ["Astro", "GitHub Pages"],
  },
  {
    name: "Your next project",
    description:
      "Add a one-line summary. Link to the GitHub repo or live demo.",
    url: `https://github.com/${GITHUB_USERNAME}`,
    tags: ["Topic"],
  },
  {
    name: "Another highlight",
    description: "Swap these placeholders for real repositories you are proud of.",
    url: `https://github.com/${GITHUB_USERNAME}?tab=repositories`,
    tags: ["Open source"],
  },
];
