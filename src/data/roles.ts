// Open roles. Each becomes a page at /join/<slug>/ with its Tally application form embedded.
// Roles with a `listing` also appear on /join/; the others are reachable only by link.

export interface Role {
  slug: string;
  title: string;
  /** Shown above the title on the role page, joined with " · ". */
  tags: string[];
  /** Meta description of the role page. */
  description: string;
  /** Tally form id, from https://tally.so/r/<id>. */
  tallyForm: string;
  /** Accessible title of the embedded form. */
  formTitle: string;
  listing?: {
    /** Shown beside the role on /join/, one per line. */
    tags: string[];
    summary: string;
  };
}

export const roles: Role[] = [
  {
    slug: 'member-of-research-staff',
    title: 'Member of Research Staff',
    tags: ['Research', 'SF / NYC / Remote'],
    description: 'Apply to join Physical Reasoning as a Member of Research Staff.',
    tallyForm: 'XxZaYL',
    formTitle: 'Member of Research Staff application',
    listing: {
      tags: ['Research', 'SF / NYC / Remote'],
      summary: 'Conduct AI/ML research on world models and apply it to real-world product challenges.',
    },
  },
  {
    slug: 'research-fellow',
    title: 'Research Fellow',
    tags: ['Research', 'SF / NYC / Remote'],
    description: 'Apply to join Physical Reasoning as a Research Fellow.',
    tallyForm: 'pblZLJ',
    formTitle: 'Research Fellow application',
    listing: {
      tags: ['Research', 'SF / NYC / Remote'],
      summary: 'Lead an open research project on world models, published in public with the code to reproduce it.',
    },
  },
  {
    slug: 'member-of-research-staff-new-grad',
    title: 'Member of Research Staff, New Grad',
    tags: ['Research', 'New Grad 2027', 'SF / NYC / Remote'],
    description: 'Apply to join Physical Reasoning as a Member of Research Staff, New Grad.',
    tallyForm: 'lbor7o',
    formTitle: 'Member of Research Staff, New Grad 2027 application',
  },
  {
    slug: 'software-engineering-intern',
    title: 'Software Engineering Intern',
    tags: ['Internship', 'Summer 2027', 'SF / NYC / Canada / Remote'],
    description: 'Apply for the Software Engineering Intern position at Physical Reasoning for Summer 2027.',
    tallyForm: 'kdMPjo',
    formTitle: 'Software Engineering Intern, Summer 2027 application',
  },
];
