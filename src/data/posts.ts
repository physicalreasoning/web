// Blog posts, newest first. Each post's page lives at src/pages/blog/<slug>.astro and renders
// through the BlogPost layout, which reads its title, description and date from here.

export interface Post {
  slug: string;
  title: string;
  /** ISO date, used for the JSON-LD datePublished and the month shown on /blog/. */
  published: string;
  /** Meta and social description of the post page. */
  description: string;
  /** The line under the title on /blog/. */
  summary: string;
  /** og:type of the post page. Kept per post: most posts have shipped as 'website'. */
  ogType: 'website' | 'article';
}

export const posts: Post[] = [
  {
    slug: 'new-pixels-old-trajectories',
    title: 'New pixels, old trajectories',
    published: '2026-10-12',
    description: 'A test video can look new while repeating a training event. We built a trajectory-lineage audit, tested it on PhyWorld collisions, and trained a first pixel-conditioned ConvLSTM.',
    summary: 'A test video can look new while repeating a training event. We built a trajectory-lineage audit, stress-tested its metrics on PhyWorld, and trained a first pixel-conditioned ConvLSTM.',
    ogType: 'article',
  },
  {
    slug: 'a-benchmark-you-cant-train-on',
    title: "A benchmark you can't train on",
    published: '2026-10-12',
    description: "We built a benchmark that scores models only on outcomes that had not happened when they were frozen. In dry runs, ECMWF's learned weather model wins only once calibrated, and no released time-series foundation model beats copying the last price.",
    summary: 'Models frozen before the round, scored only on what happens next. A learned weather model wins only once calibrated, and foundation models cannot beat copying the last price.',
    ogType: 'website',
  },
  {
    slug: 'the-weather-market-learned-to-read-the-forecast',
    title: 'The weather market learned to read the forecast',
    published: '2026-10-05',
    description: "We built a calibrated decision model for Kalshi's daily temperature markets and tested it the way a trading desk would. The edge is real, it passed a sealed out-of-sample test, and it is shrinking every month.",
    summary: 'A calibrated decision model for Kalshi temperature markets. The edge is real, it passed a sealed test, and it is shrinking every month.',
    ogType: 'website',
  },
  {
    slug: 'we-tried-to-break-our-own-diagnostic',
    title: 'We tried to break our own diagnostic',
    published: '2026-08-10',
    description: 'We attacked our own martingale-collapse detector and it held. Then everything else came apart: more training made the representation worse, and the metric we had ranked every model by was mostly measuring input reconstruction.',
    summary: 'We attacked our own martingale-collapse detector and it held. Then everything else came apart.',
    ogType: 'website',
  },
  {
    slug: 'prediction-vs-understanding',
    title: 'Prediction is not understanding, until it is',
    published: '2026-07-15',
    description: 'Where pixel-level forecasting diverges from causal competence, and an evaluation protocol that separates the two.',
    summary: 'Where pixel-level forecasting diverges from causal competence, and an evaluation protocol that separates the two.',
    ogType: 'website',
  },
];

export function getPost(slug: string): Post {
  const post = posts.find((p) => p.slug === slug);
  if (!post) throw new Error(`No post with slug "${slug}" in src/data/posts.ts`);
  return post;
}
