/* =========================================================================
   One canvas board built from resources/Main_Notebook (4).pdf — nothing else.

   app.js imports this pack once (see "resources.js carries boards" there) and
   remembers SEED.id. reset: true means the import wipes everything saved
   first, so bumping the id while reset is on wipes it again: turn reset off
   for a pack that should add beside what is already there.

   Cards are listed in the PDF's order. `zone` is the canvas lane a card
   stacks into; app.js measures the cards and packs each lane on first load.
     0 Inspiration · 1 Career · 2 Opportunities · 3 Coding · 4 Notes
   Names the PDF gives without a link stay unlinked, except job boards and
   companies, where the official site is obvious.
   ========================================================================= */

'use strict';

window.SEED = (() => {
  const links = (title, items, more) => ({
    type: 'links', title, ...more,
    // Rows are [name, url, note, tag]; an object (a folding group) passes through.
    data: { items: items.map((it) => (Array.isArray(it) ? { name: it[0], url: it[1] || '', note: it[2] || '', tag: it[3] } : it)) },
  });
  const listOf = (type) => (title, items, more) => ({
    type, title, ...more,
    data: { items: items.map((text) => (type === 'checklist' ? { text, done: false } : { text })) },
  });
  const numbered = listOf('numbered');
  const bullets = listOf('bulleted');
  const steps = listOf('steps');
  const text = (title, body, more) => ({ type: 'text', title, data: { body }, ...more });
  const table = (title, rows, cols, more) => ({ type: 'table', title, data: { rows, cols }, ...more });

  const STATUS = ['To apply', 'Applied', 'Assessment', 'Interviewing', 'Offer', 'Rejected', 'Ghosted'];
  const WIDE = 440;
  const note = { zone: 4, color: 'yellow', collapsed: true };

  // Every track in the playlist, in its order, read from Spotify's embed
  // of it on 2026-10-16 (43 items, which is all of them).
  const PLAYLIST = [
    ['Flowers — Miley Cyrus', 'https://open.spotify.com/track/7DSAEUvxU8FajXtRloy8M0'],
    ['Send It Back — DON WEST', 'https://open.spotify.com/track/08QVyeT5P43ll1voKgaiw8'],
    ['Give Me All Your Love — DON WEST', 'https://open.spotify.com/track/05RjUZcuFw476yNUsnrHZX'],
    ['So Easy (To Fall In Love) — Olivia Dean', 'https://open.spotify.com/track/6sGIMrtIzQjdzNndVxe397'],
    ['American Pie — Don McLean', 'https://open.spotify.com/track/1fDsrQ23eTAVFElUMaf38X'],
    ['Vienna — Billy Joel', 'https://open.spotify.com/track/4U45aEWtQhrm8A5mxPaFZ7'],
    ['The Chain - 2004 Remaster — Fleetwood Mac', 'https://open.spotify.com/track/5e9TFTbltYBg2xThimr0rU'],
    ["These Boots Are Made For Walkin' — Nancy Sinatra", 'https://open.spotify.com/track/0OW3i3QHCyBXjKiGRBURzH'],
    ['Flashing Lights — Kanye West, Dwele', 'https://open.spotify.com/track/5TRPicyLGbAF2LGBFbHGvO'],
    ['Rumour Has It — Adele', 'https://open.spotify.com/track/5mFMb5OHI3cN0UjITVztCj'],
    ['Hey Jude — The Beatles', 'https://open.spotify.com/track/1eT2CjXwFXNx6oY5ydvzKU'],
    ['I Follow Rivers - The Magician Remix — Lykke Li, The Magician', 'https://open.spotify.com/track/4Jv7lweGIUOFQ7Oq2AtAh9'],
    ['Lost In The Rhythm — Jamie Berry, Octavia Rose', 'https://open.spotify.com/track/2gvM9vazIkAxaE7j0ynRGg'],
    ['Dreams - 2004 Remaster — Fleetwood Mac', 'https://open.spotify.com/track/0ofHAoxe9vBkTCp2UQIavz'],
    ['Lullaby For A Cat — Epik High', 'https://open.spotify.com/track/0tDIWrioC8NSq5dZgOyMN3'],
    ['Suddenly I See — KT Tunstall', 'https://open.spotify.com/track/5p9XWUdvbUzmPCukOmwoU3'],
    ['Start with Yourself — The Chordline', 'https://open.spotify.com/track/4hXuD3lUDg1Lh4hREhnh4O'],
    ['Luv (sic) — Nujabes', 'https://open.spotify.com/track/6SNGzhVrisdq63Ndz58ovT'],
    ['Good to Go — LÒNIS, Daphne Willis', 'https://open.spotify.com/track/7apaVSk8pGOQxqXiNKUIQM'],
    ["Can't Get You out of My Head — Kylie Minogue", 'https://open.spotify.com/track/3E7ZwUMJFqpsDOJzEkBrQ7'],
    ['Pop Muzik - 12 Inch Version — M / Robin Scott, Nick Launay', 'https://open.spotify.com/track/43U1bCDTZAhhY1Y8mCkTG4'],
    ['Unwritten — Natasha Bedingfield', 'https://open.spotify.com/track/3U5JVgI2x4rDyHGObzJfNf'],
    ['Training Season — Dua Lipa', 'https://open.spotify.com/track/5b5cPscqVEMChvDqscVw26'],
    ['Part-Time Lover — Stevie Wonder', 'https://open.spotify.com/track/0Dm43YLUlGdePpSbI1ct8h'],
    ["I Don't Ask, I Invite — Goddess No Holy", 'https://open.spotify.com/track/12vAbPnPT0XGinOX2cgGK8'],
    ['Subterranean Homesick Alien — Radiohead', 'https://open.spotify.com/track/2CVV8PtUYYsux8XOzWkCP0'],
    ['Us and Them — Pink Floyd', 'https://open.spotify.com/track/1TKTiKp3zbNgrBH2IwSwIx'],
    ['Earrings — Malcolm Todd', 'https://open.spotify.com/track/0eAuGrXyGFYwur9ARUe7LJ'],
    ['BEAUTY QUEEN — Sam Tompkins', 'https://open.spotify.com/track/1LywLmiRljnPwvwGVXrHih'],
    ['Abhi Kuch Dino Se — Pritam, Mohit Chauhan', 'https://open.spotify.com/track/1QufGJee7k9v4Cfp2NxXbv'],
    ['Into the Sun — BTS', 'https://open.spotify.com/track/1ZNolq7VI7efGlh2hb2VVr'],
    ['Dust — SEVENTEEN', 'https://open.spotify.com/track/7v8v911KfBuFkqXvuDOtNm'],
    ['Love Yourself — Justin Bieber', 'https://open.spotify.com/track/50kpGaPAhYJ3sGmk6vplg0'],
    ['BUMPA — BIBI', 'https://open.spotify.com/track/6GSdBUjAnJmIjxMAYz5WCa'],
    ['Smile Flower — SEVENTEEN', 'https://open.spotify.com/track/054sQZ2qmw0Ya7N0XSxl3j'],
    ['MILLION DOLLAR BABY — Tommy Richman', 'https://open.spotify.com/track/5AJ9hqTS2wcFQCELCFRO7A'],
    ['Woman in Late — Giovanni Venosta', 'https://open.spotify.com/track/69ALudlYWPJkkCvkAD91LL'],
    ['What You Waiting For? — Gwen Stefani', 'https://open.spotify.com/track/0ny5zITdmyNwyTPVzRGscU'],
    ['My Girlfriend Is a Witch — October Country', 'https://open.spotify.com/track/39PWLJrvfBCrfe4NX9aGZD'],
    ['Season Of The Witch — Lana Del Rey', 'https://open.spotify.com/track/5DSi7heBC8eTIFROBvttnp'],
    ['Chick Habit — April March', 'https://open.spotify.com/track/6KcrRaeL8h9XFtwlKrT0xi'],
    ['Tonight — PinkPantheress', 'https://open.spotify.com/track/5QCfOMH5K7bS4dH7H7PNeI'],
    ['Jawani Jan-E-Man — Asha Bhosle', 'https://open.spotify.com/track/6X4bexIzuwXBaqBTyRROB0'],
  ];
  const cards = [
    links('People to look up to', [
      ['Warren Buffett', 'https://en.wikipedia.org/wiki/Warren_Buffett', 'Investor; Berkshire Hathaway, value investing.'],
      ['Gwen Stefani', 'https://en.wikipedia.org/wiki/Gwen_Stefani', 'Singer; No Doubt frontwoman, then solo.'],
      ['Richard Feynman', 'https://en.wikipedia.org/wiki/Richard_Feynman', 'Physicist; QED, Feynman diagrams, the Lectures.'],
      ['J.D. Salinger', 'https://en.wikipedia.org/wiki/J._D._Salinger', 'Writer; The Catcher in the Rye.'],
      ['Alexander McQueen', 'https://en.wikipedia.org/wiki/Alexander_McQueen', 'Fashion designer; theatrical British couture.'],
      ['Hozier', 'https://en.wikipedia.org/wiki/Hozier_(musician)', 'Irish singer-songwriter.'],
    ], { zone: 0, color: 'purple' }),

    links('Magazines', [
      ['Desi Art Mag', ''],
      ['Alter Mag', 'https://altermag.com'],
      ['Tangerine Mag', 'https://www.instagram.com/tangerinemag.art/', '@tangerinemag.art'],
    ], { zone: 0, color: 'pink' }),

    numbered('Things to try', [
      'Plastic detox',
      'Neuroplasticity habit building using research papers',
    ], { zone: 0, color: 'green' }),

    table('Job boards / side hustles', [
      ['Board', 'Type', 'Status'],
      ['Toptal', 'Freelance (vetted)', ''],
      ['WeWorkRemotely', 'Remote jobs', ''],
      ['Fiverr', 'Freelance gigs', ''],
      ['Telus International', 'AI data / rating work', ''],
      ['Arc.dev', 'Remote dev jobs', ''],
      ['A.team', 'Freelance product teams', ''],
      ['Pull request', '', ''],
      ['Cambly', 'Tutoring — cambly.com/en/tutorsignup/step/welcome', ''],
    ], null, { zone: 1, w: WIDE, color: 'orange' }),

    links('Companies to look at', [
      ['Alter Mag', 'https://altermag.com'],
      ['Alt Carbon', 'https://altcarbon.com'],
      ['Amuse Labs', 'https://amuselabs.com'],
    ], { zone: 1, w: WIDE, color: 'blue' }),

    table('Companies I like', [
      ['Company', 'Careers link', 'Position', 'Status'],
      ['IBM', 'ibm.com/careers', '', 'To apply'],
      ['Goldman Sachs', 'goldmansachs.com/careers', '', 'To apply'],
      ['DailyObjects', 'dailyobjects.com', '', 'To apply'],
      ['JP Morgan Chase', 'careers.jpmorgan.com', '', 'To apply'],
      ['HSBC', 'hsbc.com/careers', '', 'To apply'],
      ['Amazon', 'amazon.jobs', '', 'To apply'],
    ], [{}, { kind: 'link' }, {}, { kind: 'select', options: STATUS }], { zone: 1, w: WIDE, color: 'blue' }),

    links('Volunteering', [
      ['Catchafire', 'https://www.catchafire.org/volunteer'],
      ['Taproot+', 'https://taprootfoundation.org/taproot-plus'],
      ['VolunteerMatch (Idealist)', 'https://www.idealist.org/volunteermatch'],
      ['Parker Dewey', 'https://app.parkerdewey.com/talent/655923/dashboard/opportunities', '', 'login'],
      ['Forage', 'https://www.theforage.com/dashboard', '', 'login'],
    ], { zone: 2, color: 'green' }),

    links('Websites', [
      ['Glyph', 'https://glyph.kateander.com', 'For making glyphs.'],
      ['Depth of field', 'https://jherr.github.io/depth-of-field/', 'For checking camera settings.'],
      ['bl00d.money', 'https://bl00d.money', 'Weapon analytics.'],
    ], { zone: 2, color: 'gray' }),

    // Coding is one parent and three children, as nested in the PDF: the
    // parent's items 5–7 point at the cards stacked right under it.
    links('Coding', [
      ['1. Google Summer of Code', 'https://summerofcode.withgoogle.com'],
      ['2. pwn.college', 'https://pwn.college', 'Hacking courses.'],
      ['3. Article by @DeRonin_', 'https://x.com/DeRonin_/article/2033587293064204349'],
      ['4. System design', '', 'Learn system design + O\'Reilly Building Evolutionary Architectures.'],
      ['5. Services to learn', '', '→ Coding › Services to learn'],
      ['6. Claude', '', '→ Coding › Claude'],
      ['7. GitHub', '', '→ Coding › GitHub'],
    ], { zone: 3, color: 'blue' }),

    links('Coding › Services to learn', [
      ['Typesafe console', 'https://console.typesafe.ai/home', 'JEV'],
      ['Airtable', 'https://www.airtable.com'],
      ['Cloudflare', 'https://www.cloudflare.com'],
    ], { zone: 3, color: 'blue' }),

    links('Coding › Claude', [
      ['claude-skills-founder', 'https://github.com/emotixco/claude-skills-founder'],
      ['ponytail', 'https://github.com/DietrichGebert/ponytail'],
      ['Article by @DeRonin_', 'https://x.com/DeRonin_/article/2097006908183806027'],
      ['Claude Academy: small business', 'https://academy.claude.com/collections/small-business'],
    ], { zone: 3, color: 'blue' }),

    links('Coding › GitHub', [
      ['MiroFish', 'https://github.com/666ghj/MiroFish'],
      ['emmi-lili', 'https://github.com/emmi-lili'],
      ['trace-research-paper-studio', 'https://github.com/Ahmet-Ruchan/trace-research-paper-studio'],
      ['manim', 'https://github.com/3b1b/manim', '3Blue1Brown\'s math animation engine.'],
      ['trivy', 'https://github.com/aquasecurity/trivy', 'Security scanner for containers and code.'],
    ], { zone: 3, color: 'blue' }),

    links('Certification / Courses', [
      ['Capital One careers', 'https://www.capitalonecareers.com/search-jobs'],
      ['Hudson River Trading careers', 'https://www.hudsonrivertrading.com/careers'],
      ['Clay University', 'https://university.clay.com'],
    ], { zone: 2, color: 'orange' }),

    links('Movies', [
      ['Love Exposure (2008)', 'https://letterboxd.com/film/love-exposure/'],
    ], { zone: 0, color: 'pink' }),

    links('Songs', [
      ['Red Dragonfly — Cho Yongpil', 'https://open.spotify.com/track/14E1HdsDTF6xbjNxsKobFm'],
      ['Ragas', 'https://open.spotify.com/search/ragas', 'No single track in the notebook.', 'search'],
      // A folding group: the heading links to the playlist, and the tracks
      // scroll inside the card once it is open.
      { name: 'LVs', url: 'https://open.spotify.com/playlist/1n8WSpb3Lui5j7AFzaCZfS', open: false,
        children: PLAYLIST.map(([name, url]) => ({ name, url, note: '' })) },
    ], { zone: 0, color: 'pink' }),

    numbered('Advice', [
      'MAKE IT EXIST FIRST, YOU CAN MAKE IT GOOD LATER',
    ], { zone: 0, color: 'yellow' }),

    /* ---------------------------------------------------- notes, folded */

    text('O\'Reilly system design books', 'O\'Reilly system design books.', note),

    bullets('Resumes should tell stories', [
      'Every bullet begins with an action verb',
      'Say what you did, why it was impactful, metrics, and the tools and technologies used',
    ], note),

    text('How Databricks works',
      'Traditionally, companies stored their data in data warehouses and data lakes and needed two teams to manage them separately. In 2009, Matei Zaharia at UC Berkeley created Apache Spark, which distributes data across thousands of computers at the same time.\n\n' +
      'On top of Spark, a lakehouse was built that combined the features of a data lake and a data warehouse. It was open-sourced as Delta Lake, and over the next decade companies used this structure for data storage.\n\n' +
      'Databricks was founded in 2013 by Spark\'s creators as a middle layer between this technology and the companies using it. By 2022, with the boom in AI and the need to store training data for thousands of models, Databricks was well placed to make money.\n\n' +
      'Its run rate went from $200 million in 2020 to $5.4 billion (projected) in 2026, and it is set for an IPO in the near future.',
      note),

    table('How Databricks works › Warehouse vs Lake', [
      ['Data Warehouse', 'Data Lake'],
      ['Structured data (Docs, Forms, Sheets)', 'Unstructured data (Images, Videos)'],
      ['Schema-on-write, fast for structured queries, higher cost', 'Schema-on-read, flexible, cheaper storage'],
    ], null, note),

    steps('Release stages', [
      'Local',
      'Dev',
      'Staging (mock data)',
      'Beta (early access)',
      'Production',
    ], note),

    text('Finding remote jobs on Reddit and Twitter',
      'You will never have trouble finding a remote job if you know how to use Twitter and Reddit. Everyone applies on LinkedIn and Indeed with 500 other people. The best remote jobs get posted on Reddit and Twitter first, direct from hiring managers and founders. No ATS. No 500-application competition. (Verified via Virtuoso Resumes, Sensei AI, Sidequestboard and Flashfire 2026 research.)\n\n' +
      'REDDIT — 5 SUBREDDITS TO FOLLOW\n' +
      '• r/RemoteJobs (500K+ members) — direct hiring posts\n' +
      '• r/forhire — freelance and contract gigs\n' +
      '• r/digitalnomad — global remote opportunities\n' +
      '• r/cscareerquestions (1M+ members) — tech-specific\n' +
      '• r/remotework — general remote leads\n\n' +
      'TWITTER — THE SEARCH STRING\n' +
      '• Type this into search: "hiring" "remote" "[your role]" "DM"\n' +
      '• That surfaces real-time posts from founders before they hit any job board.\n' +
      '• Save the search. Refresh it daily. When you find a match, reply publicly (signals interest) and DM privately (real conversation). Founders reward speed.\n\n' +
      'THE PATTERN NOBODY TEACHES\n' +
      '• Founders post before they list. Small companies never list at all. The people who use Reddit and Twitter are applying to 10 people who see the post, not 500.',
      note),
  ];

  return {
    id: 'notebook-4',
    reset: true,
    // Re-sends one card's items to a board that imported this pack before the
    // card changed. Applied once each; links added by hand are kept.
    patches: [{ id: 'songs-lvs', card: 'Songs' }],
    // What each colour means on this board, read live by the legend (so it
    // applies without re-importing). Renaming in the legend overrides it.
    legend: {
      purple: 'People',
      pink: 'Culture',
      green: 'Growth & volunteering',
      orange: 'Jobs & courses',
      blue: 'Companies & coding',
      gray: 'Tools',
      yellow: 'Notes & advice',
    },
    boards: [{ name: 'Notebook', layout: 'canvas', cards }],
  };
})();
