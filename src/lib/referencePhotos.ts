export const referencePhotos: Record<
  string,
  {
    alt: string;
    credit: string;
    source: string;
    license: string;
    licenseUrl: string;
    prompt: string;
  }
> = {
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Kneading.jpg/500px-Kneading.jpg': {
    alt: 'Hands kneading bread dough',
    credit: 'Anonymous friend of ElinorD',
    source: 'https://commons.wikimedia.org/wiki/File:Kneading.jpg',
    license: 'Public domain',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    prompt:
      'What signs do you watch in the dough, beyond the time on the recipe? Share what you tried and what happened.',
  },
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Sewing_Machine.JPG/960px-Sewing_Machine.JPG':
    {
      alt: 'Sewing fabric with a sewing machine',
      credit: 'Angelsharum',
      source: 'https://commons.wikimedia.org/wiki/File:Sewing_Machine.JPG',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      prompt:
        'What do you test on a scrap before sewing the final fabric: stitch length, tension, or something else?',
    },
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Francesco_Gallarotti_2016-03-09_%28Unsplash_Bfdia-aJOvI%29.jpg/1280px-Francesco_Gallarotti_2016-03-09_%28Unsplash_Bfdia-aJOvI%29.jpg':
    {
      alt: 'Young green seedlings growing in soil',
      credit: 'Francesco Gallarotti',
      source:
        'https://commons.wikimedia.org/wiki/File:Francesco_Gallarotti_2016-03-09_(Unsplash_Bfdia-aJOvI).jpg',
      license: 'CC0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      prompt:
        'If you kept a seven-day plant journal, what would you measure each day? Compare your observation methods.',
    },
};
