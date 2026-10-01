/* =========================================================================
   Boards built from the four Main_Notebook PDFs in resources/.

   app.js imports this pack once (see "resources.js carries boards" there) and
   remembers SEED.id, so editing it after the first load changes nothing for
   someone who already has it. Bump the id to hand out a new pack.

   Every link in the PDFs is here, each with a line on what it actually is.
   Links that were only a name in the notebook got their official URL; the
   three that are a best guess carry a "guess" tag.
   ========================================================================= */

'use strict';

window.SEED = (() => {
  const links = (title, items, more) => ({
    type: 'links', title, ...more,
    data: { items: items.map(([name, url, note, tag]) => ({ name, url: url || '', note: note || '', tag })) },
  });
  const listOf = (type) => (title, items, more) => ({
    type, title, ...more,
    data: { items: items.map((text) => (type === 'checklist' ? { text, done: false } : { text })) },
  });
  const check = listOf('checklist');
  const bullets = listOf('bulleted');
  const numbered = listOf('numbered');
  const steps = listOf('steps');
  const text = (title, body, more) => ({ type: 'text', title, data: { body }, ...more });
  const quote = (body, by, more) => ({ type: 'quote', title: '', color: 'purple', data: { text: body, by }, ...more });
  const table = (title, rows, more) => ({ type: 'table', title, data: { rows }, ...more });
  const bars = (title, unit, items, more) => ({
    type: 'bars', title, ...more,
    data: { unit, items: items.map(([label, value]) => ({ label, value })) },
  });

  /* ------------------------------------------------------------ dashboard */

  const dashboard = {
    name: 'Dashboard',
    layout: 'grid',
    cards: [
      { type: 'stats', title: 'At a glance', data: {} },
      { type: 'radar', title: 'Where my saved links live', data: { auto: 'links' } },
      check('Arteza', [
        'Make socials for Arteza',
        'Start marketing, or at least build a set-up / pathway',
        'Apply for paintings sale in the art magazines (Culture board)',
      ], { color: 'orange' }),
      check('Job hunt', [
        'Apply to jobs rigorously',
        'Reply to Pooja that I am still looking',
        'Give test: IBM',
        'Give test: MountBlue',
        'Give test: Turing',
        'Buy Coursera free trial + figure out McKinsey',
        'Cold-email one startup fix a day, 3 a day (Career board)',
      ], { color: 'blue' }),
      check('Self improvement', [
        'Go through saves: Graaa',
        'Go through saves: DMs',
        'Go through saves: Substack',
        'Go through saves: Pinterest',
        'Try a plastic detox',
        'Build a habit using neuroplasticity research papers',
      ], { color: 'green' }),
      {
        type: 'radar', title: 'Skill check — drag a spoke to rate yourself',
        data: { max: 10, axes: ['Docker', 'CI/CD', 'Kubernetes', 'Cloud', 'System design', 'DSA', 'ML', 'Open source'].map((label) => ({ label, value: 0 })) },
      },
      links('Pinned', [
        ['Books I\'m Reading', 'https://docs.google.com/spreadsheets/d/1XiD6vjfm4s_a14cccwGs5rL6xi2gnLMPOP7ozlXUCY8/edit?gid=0#gid=0', 'My reading tracker sheet.', 'login'],
        ['Substack saved', 'https://substack.com/inbox/saved', 'Everything saved to read later on Substack.', 'login'],
        ['Fiverr seller dashboard', 'https://www.fiverr.com/users/akshayaakashyap/seller_dashboard', 'My gigs, orders and messages.', 'login'],
        ['Forage', 'https://www.theforage.com/dashboard', 'Free virtual job simulations built by big employers — practise real tasks.', 'login'],
        ['Parker Dewey', 'https://app.parkerdewey.com/talent/655923/dashboard/opportunities', 'Paid micro-internships: short 5-40 hour projects for students and recent grads.', 'login'],
      ]),
      quote('Ask for big, unreasonable things. The universe will meet you at your level of audacity.', 'Advice I saved'),
    ],
  };

  /* --------------------------------------------------------------- career */

  const career = {
    name: 'Career',
    layout: 'grid',
    cards: [
      links('Job boards', [
        ['LinkedIn — my saved search', 'https://www.linkedin.com/jobs/search/?currentJobId=4389244165&f_JT=F%2CP%2CC%2CT&f_TPR=r18000&f_WT=1%2C3%2C2&origin=JOB_SEARCH_PAGE_JOB_FILTER&sortBy=R', 'Filtered: full/part-time/contract, posted in the last 5 hours, any work mode.', 'saved search'],
        ['Instahyre — my saved search', 'https://www.instahyre.com/candidate/opportunities/?company_size=2&job_categories=1,8,3&job_functions=%2Fapi%2Fv1%2Fjob_category%2F1,%2Fapi%2Fv1%2Fjob_category%2F8,%2Fapi%2Fv1%2Fjob_category%2F3&job_type=0&location=Anywhere+in+India,Work+From+Home&search=true&years=1', 'Indian tech hiring with salaries up front. Anywhere in India or WFH, 1 year exp.', 'saved search'],
        ['Naukri', 'https://www.naukri.com/', 'India\'s largest job portal.'],
        ['Google Careers', 'https://www.google.com/about/careers/applications/jobs/results/', 'Google\'s own jobs. For listings across the web, search "<role> jobs" on Google.'],
        ['Glassdoor', 'https://www.glassdoor.com/', 'Listings plus anonymous reviews, salaries and interview reports.'],
        ['Unstop', 'https://unstop.com/', 'Hackathons, competitions, internships and fresher jobs (ex-Dare2Compete).'],
        ['Cognition jobs', 'https://jobs.ashbyhq.com/cognition', 'Openings at Cognition, the AI lab behind the Devin coding agent.'],
        ['Work at a Startup (YC)', 'https://www.workatastartup.com/', 'Apply once to many Y Combinator startups.'],
        ['Wellfound', 'https://wellfound.com/', 'Startup jobs (ex-AngelList Talent) with salary and equity shown.'],
        ['Newgrad-jobs', 'https://www.newgrad-jobs.com/', 'US entry-level roles asking 0-2 years, updated hourly.'],
        ['Simplify', 'https://simplify.jobs/', 'Job board + Chrome extension that autofills and tracks applications.'],
        ['ZipRecruiter', 'https://www.ziprecruiter.com/', 'US job board that matches you to listings.'],
        ['Riipen', 'https://www.riipen.com/', 'Short, paid real-world projects from employers.'],
        ['Hub (Hubstaff Talent?)', 'https://hubstafftalent.net/', 'Free remote-job board. The notebook just says "Hub" — this is a guess.', 'guess'],
      ], { color: 'blue' }),
      steps('Startup cold-email play', [
        'Find startups on YC (Work at a Startup) and Wellfound',
        'Find a pain point I can actually solve',
        'Build the fix and push it to a GitHub repo',
        'Cold-email the repo — 3 a day',
      ], { color: 'blue' }),
      links('Remote work & side hustles', [
        ['Toptal', 'https://www.toptal.com/', 'Screened "top 3%" freelance network for devs, designers, finance.'],
        ['We Work Remotely', 'https://weworkremotely.com/', 'One of the largest remote-only job boards.'],
        ['Fiverr', 'https://www.fiverr.com/', 'Sell fixed-price service packages ("gigs").'],
        ['TELUS Digital AI Community', 'https://www.telusinternational.ai/', 'Freelance AI data work: search/ad rating, annotation.'],
        ['Arc.dev', 'https://arc.dev/', 'Remote jobs and freelance work for vetted developers.'],
        ['A.Team', 'https://www.a.team/', 'Senior freelance builders joining small product teams.'],
        ['PullRequest', 'https://www.pullrequest.com/', 'Paid on-demand code review (now part of HackerOne).', 'guess'],
        ['Cambly — tutor sign-up', 'https://www.cambly.com/en/tutorsignup/step/welcome', 'Apply to be a paid online English conversation tutor.'],
      ]),
      links('Companies to look at', [
        ['Alter Magazine', 'https://altermag.com', 'Monthly literary journal on science, tech and progress from South Asia.'],
        ['Alt Carbon', 'https://altcarbon.com', 'Indian carbon removal: enhanced rock weathering with basalt on farmland.'],
        ['Amuse Labs', 'https://amuselabs.com', 'PuzzleMe — crosswords and word games for WaPo, New Yorker, Guardian.'],
        ['Condé Nast careers', 'https://condenast.wd5.myworkdayjobs.com/CondeCareers', 'Vogue, GQ, Wired and the rest.'],
        ['Sarah & Sandeep', 'https://www.sarahsandeep.com/', 'Mumbai luxury menswear label (ex-SS Homme).'],
        ['Amaré', 'https://amareclothing.in/', 'Indian streetwear brand — unconfirmed match for "Amare".', 'guess'],
        ['Believe careers', 'https://careers.believe.com/en/jobs/', 'Digital music distribution and artist development (owns TuneCore).'],
        ['Times Music', 'https://timesmusic.com/', 'Indian label from The Times Group; Junglee Music, ffs.'],
        ['Spotify jobs', 'https://www.lifeatspotify.com/jobs', 'Spotify\'s careers site.'],
        ['Fever careers', 'https://careers.feverup.com/', 'Live and immersive events — Candlelight concerts.'],
        ['Revolve', 'https://www.revolve.com/', 'Fashion e-commerce; careers link in the footer.'],
        ['Zelig', 'https://zelig.com/', 'AI try-on and styling — powers Revolve\'s "Build a Look".'],
        ['@theauracircleagency', 'https://www.instagram.com/theauracircleagency/', 'Delhi NCR organic social and content agency.'],
        ['Socratica', 'https://socratica.info', 'Weekly co-working sessions for passion projects.'],
      ]),
      links('Companies I like', [
        ['IBM careers', 'https://www.ibm.com/careers', 'Coding and cognitive assessments arrive after you apply.'],
        ['Goldman Sachs careers', 'https://www.goldmansachs.com/careers/', ''],
        ['JPMorgan Chase careers', 'https://careers.jpmorgan.com/', ''],
        ['ASML careers', 'https://www.asml.com/en/careers', ''],
        ['Capital One careers', 'https://www.capitalonecareers.com/search-jobs', '~1,700 openings; filter by team and location. Was filed under certifications.'],
        ['Hudson River Trading', 'https://www.hudsonrivertrading.com/careers', 'Quant / algorithmic trading firm. Was filed under certifications.'],
      ]),
      bullets('Roles to target', ['Scrum master', 'Operations associate', 'Project coordinator', 'Specialist', 'Business analyst'], { color: 'blue' }),
      links('Certifications', [
        ['Microsoft DevOps Engineer Expert (AZ-400)', 'https://learn.microsoft.com/en-us/credentials/certifications/devops-engineer/', 'Also needs AZ-104 or AZ-204 first.'],
        ['GitHub Actions (GH-200)', 'https://learn.microsoft.com/en-us/credentials/certifications/github-actions/', 'Writing and securing workflows; exam runs through Microsoft Learn.'],
        ['Goldman Sachs Asia Possibilities', 'https://www.goldmansachs.com/careers/students/programs-and-internships/asia-pacific/asia-possibilities-series', 'Virtual webinars for APAC students that feed GS internships.'],
        ['Coursera', 'https://www.coursera.org/', 'For the free trial on the job-hunt list.'],
      ]),
      links('Volunteering', [
        ['Catchafire', 'https://www.catchafire.org/volunteer', 'Skills-based remote projects for nonprofits.'],
        ['Taproot Plus', 'https://taprootfoundation.org/taproot-plus', 'Pro-bono matches between nonprofits and skilled volunteers.'],
        ['Idealist (VolunteerMatch)', 'https://www.idealist.org/volunteermatch', 'VolunteerMatch merged into Idealist: volunteering and impact jobs.'],
        ['UN Volunteers', 'https://www.unv.org/', 'On the to-check list: "search UN volunteer programs".'],
      ], { color: 'green' }),
      numbered('Interviewing', [
        'Research the company first: mission, what they stand for, what they value in an employee.',
        'Have a real back-and-forth conversation. Don\'t act like a robot.',
        '"Tell me about yourself": not the resume — what drives you, your favourite things, then the resume.',
      ]),
      numbered('4 workplace advices', [
        'Deadlines are not real. If you need more time to do a good job, you\'re entitled to it — communicate it clearly.',
        'Don\'t talk down to less technical people. Learn to explain. Be kind; belittling people hurts your soul.',
        'Don\'t overwork yourself at the start of a new job.',
        'Don\'t ramble in standups. Being concise gets you noticed.',
      ]),
      text('Resumes should tell stories', 'Every bullet: action verb -> what you did -> why it was impactful -> metrics -> tools and technologies used.', { color: 'yellow' }),
      table('Pitching to clients', [
        ['Older clients', 'Younger clients'],
        ['Make it clear', 'Make it visual'],
        ['Show track record', 'Show social proof'],
        ['Talk about certainty', 'Talk about identity'],
        ['Slow down', 'Move fast'],
        ['Justify the value', 'Keep the price low'],
        ['Sell the outcome', 'Sell the dream'],
        ['Be professional', 'Be informal'],
      ]),
    ],
  };

  /* ---------------------------------------------------------------- learn */

  const learn = {
    name: 'Learn',
    layout: 'grid',
    cards: [
      check('Roadmap', [
        'Learn Docker',
        'Learn CI/CD pipelines',
        'Learn Kubernetes',
        'Learn cloud services',
        'Practise beyond LeetCode: Codeforces + system design',
        'Contribute to open-source repos instead of personal projects',
        'Read papers',
        'Apply to Google Summer of Code',
      ], { color: 'yellow' }),
      links('Core curriculum', [
        ['A Visual Git Reference', 'https://marklodato.github.io/visual-git-guide/index-en.html', 'Diagrams of what each git command does to tree, index and commits.'],
        ['Docker Curriculum', 'https://docker-curriculum.com', 'Hands-on: containers, Dockerfiles, Compose, deploying to AWS.'],
        ['GitHub Actions docs', 'https://docs.github.com/en/actions', 'For CI/CD pipelines.'],
        ['Kubernetes docs', 'https://kubernetes.io/docs/', 'Official docs, tutorials and reference.'],
        ['System Design Primer', 'https://github.com/donnemartin/system-design-primer', 'The guide to large-scale systems, with Anki cards and worked examples.'],
        ['Building Evolutionary Architectures', 'https://www.oreilly.com/library/view/building-evolutionary-architectures/9781492097532/', 'O\'Reilly, 2nd ed. — guiding architecture change with fitness functions.'],
        ['AWS Cloud Practitioner', 'https://aws.amazon.com/training/learn-about/cloud-practitioner/', 'Foundational cloud courses and certification prep.'],
        ['roadmap.sh', 'http://roadmap.sh', 'Community learning roadmaps for backend, DevOps, AI and more.'],
        ['DeepWiki', 'https://deepwiki.com', 'Cognition\'s AI-written, chat-searchable docs for any GitHub repo.'],
        ['LeetCode', 'https://leetcode.com/', 'Interview practice problems.'],
        ['Codeforces', 'https://codeforces.com/', 'Competitive programming contests and archive.'],
      ]),
      links('Open source & research', [
        ['Google Summer of Code', 'https://summerofcode.withgoogle.com', 'Paid, mentored open-source contributions.'],
        ['torch_brain', 'http://torchbrain.org', 'Open-source PyTorch library for training models on brain recordings.'],
        ['Awesome Public Datasets', 'https://github.com/awesomedata/awesome-public-datasets', 'Curated open datasets by topic. On the to-check list.'],
      ]),
      links('AI basics', [
        ['ML From Scratch', 'https://github.com/eriklindernoren/ML-From-Scratch', 'ML models written from scratch in NumPy.'],
        ['DS/ML projects with source code', 'https://github.com/durgeshsamariya/Data-Science-Machine-Learning-Project-with-Source-Code', 'Project ideas, each linked to code.'],
        ['ML For Beginners (Microsoft)', 'https://github.com/microsoft/ML-For-Beginners', '12 weeks, 26 lessons, 52 quizzes — classic ML with scikit-learn.'],
        ['Neural Networks: Zero to Hero', 'https://github.com/karpathy/nn-zero-to-hero', 'Karpathy: from backprop (micrograd) up to GPT.'],
      ], { color: 'purple' }),
      links('Hardware & security', [
        ['Wokwi', 'https://wokwi.com', 'Simulate ESP32 / Arduino / Pico circuits in the browser — no hardware.'],
        ['ESP32 projects', 'http://circuitdigest.com/esp32-projects', 'Project ideas with code and circuit diagrams.'],
        ['Hacksplaining', 'https://www.hacksplaining.com', 'Interactive secure-coding lessons: see a vulnerability, then learn the fix.'],
        ['ek0msUSB', 'https://github.com/ekomsSavior/ek0msUSB', 'USB security research toolkit — for authorised penetration testing only.'],
        ['ek0msUSB — write-up', 'https://medium.com/@ekoms1/ek0msusb-when-your-usb-drive-has-more-backdoors-than-ikea-and-the-manual-to-use-them-4b78fca0fa31', 'The author\'s Medium article explaining the toolkit.'],
      ]),
      links('Deploying apps', [
        ['Vercel', 'https://vercel.com/', 'Frontend and Next.js hosting.'],
        ['Netlify', 'https://www.netlify.com/', 'Static / Jamstack hosting with functions.'],
        ['Render', 'https://render.com/', 'Web services, databases, cron jobs.'],
        ['Railway', 'https://railway.com/', 'Simple app + database deploys.'],
        ['Firebase', 'https://firebase.google.com/', 'Google backend-as-a-service: auth, DB, hosting.'],
        ['Fly.io', 'https://fly.io/', 'Containers run close to users worldwide.'],
      ]),
      steps('Release pipeline', ['Local', 'Dev', 'Staging (mock data)', 'Beta (early access)', 'Production']),
      text('How Databricks works',
        'Companies used to keep data in warehouses and lakes, with two teams to run them.\n\n' +
        'In 2009 Matei Zaharia at UC Berkeley created Apache Spark, which spreads data across thousands of computers at once. On top of Spark came the lakehouse — a data lake and a warehouse in one — open-sourced as Delta Lake.\n\n' +
        'Spark\'s creators founded Databricks in 2013 as the layer between that technology and the companies using it. By 2022 the AI boom needed somewhere to keep training data for thousands of models, and Databricks was in position. IPO expected.'),
      bars('Databricks run rate (US$ billion)', '', [['2020', 0.2], ['2026 (projected)', 5.4]]),
      table('Warehouse vs lake', [
        ['Data warehouse', 'Data lake'],
        ['Structured data (docs, forms, sheets)', 'Unstructured data (images, video)'],
        ['Schema-on-write, fast structured queries, higher cost', 'Schema-on-read, flexible, cheaper storage'],
      ]),
    ],
  };

  /* ------------------------------------------------------------- discover */

  const discover = {
    name: 'Discover',
    layout: 'columns',
    columns: ['To check', 'Good & usable', 'HUH?!'],
    cards: [
      links('Try next', [
        ['tiat on Luma', 'https://luma.com/tiat?tag=noc', 'Events from tiat (art & tech). What the "noc" tag filters is unclear.'],
        ['Craftsy', 'https://www.craftsy.com/', 'Video classes: sewing, knitting, quilting, cooking, art.'],
        ['TouchDesigner', 'https://derivative.ca/', 'Node-based tool for real-time interactive visuals and installations.'],
        ['Awesome Public Datasets', 'https://github.com/awesomedata/awesome-public-datasets', 'Curated open datasets by topic.'],
        ['UN volunteer programs + book clubs', 'https://www.unv.org/', 'Search UN Volunteers; book clubs still to find.'],
      ], { col: 'To check' }),
      links('Found in April/June', [
        ['Neal.fun', 'https://neal.fun', 'Neal Agarwal\'s interactive web toys and visual explainers.'],
        ['Jackie Hu — designer', 'https://jackiehu.design', 'Product designer\'s portfolio, Paris-based. Design reference.'],
        ['Minds AI', 'https://getminds.ai', 'AI audience simulation: synthetic personas for fast market research.'],
        ['POLYMATH.SYS', 'https://polymath-sys-ai-eng.vercel.app', 'A 48-month self-study curriculum: deep learning, maths, quantum.'],
        ['MySketchBooth', 'https://mysketchbooth.com', 'In-browser vintage photobooth — retro webcam photo strips.'],
        ['Purrli', 'https://purrli.com', 'Adjustable cat-purr sound generator for background ambience.'],
        ['I Miss My Cafe', 'http://imissmycafe.com', 'Virtual cafe ambience mixer for focus.'],
        ['Switch-Lit', 'http://switch-lit.com', 'Two writers alternate chapters of one shared story.'],
      ], { col: 'To check' }),
      links('Good & usable', [
        ['Fig Careers', 'https://www.figcareer.com/roadmap/9b0efef1-c13f-4832-bce7-f50c901a5b2a', 'Personalised AI career roadmaps. Use it for personal branding.'],
        ['BirdsEyes', 'https://birdseyes.ai/home', 'Turns a topic into a layered learning pathway with a growing mind map.'],
        ['Strudel', 'https://strudel.cc', 'Browser REPL for live-coding music (a JS port of TidalCycles).'],
        ['World Monitor', 'https://worldmonitor.app/?lat=20.0000&lon=0.0000&zoom=1.00&view=global&timeRange=7d&layers=conflicts%2Cbases%2Chotspots%2Cnuclear%2Csanctions%2Cweather%2Ceconomic%2Cwaterways%2Coutages%2Cmilitary%2Cnatural%2CiranAttacks', 'Real-time world map: conflicts, chokepoints, markets, with AI analysis. OSINT.'],
        ['Gatekept', 'https://gatekeptmag.substack.com', 'Substack on style and culture with reading "syllabi".'],
        ['Napkin AI', 'https://app.napkin.ai', 'Turns text into diagrams and infographics. (Logged-in app URL.)', 'login'],
        ['TypeLit.io', 'http://typelit.io', 'Typing practice by retyping whole classic books.'],
        ['PayScope', 'https://www.payscope.ai', 'Upload a resume to see market value, percentile and skill gaps.'],
        ['Logically', 'https://logically.app', 'AI research workspace: citations, references, PDF notes, paper writing.'],
        ['AI Research Agent (demo)', 'https://browserbase-nextjs-template.vercel.app', 'Demo where an AI agent browses the web live to research a topic.'],
        ['PaperMe', 'https://paperme.pixzens.com/en', 'Generate printable custom paper: lined, grid, dot, music.'],
        ['Speech Topic Generator', 'https://speechtopicgen.com', 'Random impromptu speech topics with timer and recording.'],
        ['Sternberg Press', 'https://www.sternberg-press.com', 'Publisher of art and cultural criticism — a catalogue for book recs.'],
      ], { col: 'Good & usable', color: 'green' }),
      links('HUH?! — automation & odd', [
        ['SLAM&CO', 'https://slam.co', 'Shop for blueprint-style desk mats, pens, hats.'],
        ['CodeWords (Agemo)', 'https://codewords.agemo.ai', 'Chat-based automation builder — WhatsApp, LinkedIn outreach, reports.'],
        ['Twin', 'https://twin.so', 'Describe a task once; it builds an AI agent to run it across your tools.'],
        ['Peerlist', 'https://peerlist.io', 'Proof-of-work network for builders; profile pulls in GitHub/Dribbble.'],
        ['Kineto', 'https://kineto.dev/', 'JetBrains\' AI no-code builder for small sites and single-purpose apps.'],
        ['Superhuman', 'https://superhuman.com/', 'AI-first email client. (For the AI newsletter, that\'s superhuman.ai.)'],
      ], { col: 'HUH?!', color: 'purple' }),
      text('Aphex Twin + solving calculus', 'From the "HUH?!" column — a thread to pull on later.', { col: 'HUH?!', color: 'gray' }),
      text('SLAM', 'Also on the list. Superhuman AI for automation, and SLAM (simultaneous localisation and mapping) — worth a look.', { col: 'HUH?!', color: 'gray' }),
      links('Build an app', [
        ['Dribbble', 'https://dribbble.com/', 'Design inspiration and a design job marketplace.'],
        ['Behance', 'https://www.behance.net/', 'Adobe\'s creative portfolio platform.'],
        ['UI Land', 'https://uiland.design/', 'Real app screenshots by flow, screen type, element, colour.'],
        ['Page Flows', 'https://pageflows.com/', 'Recorded user flows and UI screens from real apps.'],
      ], { col: 'Good & usable' }),
      numbered('To make an app', [
        'Use Kineto.',
        'Write a PRD: who it\'s for, the user flow, features to include.',
        'Take design inspo from Dribbble, Behance, UI Land, Page Flows.',
      ], { col: 'To check' }),
    ],
  };

  /* -------------------------------------------------------------- culture */

  const culture = {
    name: 'Culture',
    layout: 'grid',
    cards: [
      links('Watch / listen', [
        ['Raga: A Journey Into the Soul of India (1971)', 'https://www.youtube.com/watch?v=DQ356Oovcw0', 'The Ravi Shankar documentary, 2010 remaster.'],
        ['Service95', 'https://www.youtube.com/@service95/featured', 'Dua Lipa\'s culture platform: book club + "At Your Service" podcast.'],
        ['Red Dragonfly — Cho Yong Pil', 'https://open.spotify.com/track/7r2GZTFHVfZCgvMd2LUGKe', 'Saved track.'],
      ]),
      bullets('Movies to watch', [
        'Lost and Found (1996) — imdb.com/title/tt0117904',
        'Little Forest (2018, Korean) — imdb.com/title/tt6083230',
        'Love Exposure (2008) — imdb.com/title/tt1128075',
      ], { color: 'brown' }),
      bullets('Songs', [
        'Money Trees — Kendrick Lamar',
        'Can\'t Get You Out of My Head — Kylie Minogue',
        'Where This Flower Blooms — Tyler, the Creator',
        'Kanye West',
        'Miles Davis',
        'Rondo Veneziano',
        'Red Dragonfly — Cho Yong Pil',
        'Ragas',
      ]),
      links('Music discovery', [
        ['Bandcamp', 'https://bandcamp.com/', 'Buy music and merch straight from independent artists.'],
        ['Bleep', 'https://bleep.com/', 'Independent and electronic music (started by Warp Records).'],
        ['Dissonant', 'https://dissonanthq.com/', 'Human-curated secondhand CDs mailed to you — no algorithm.'],
        ['Samplette', 'https://samplette.io/', 'Crate-digging: random YouTube tracks by genre, year, BPM, key.'],
        ['Tidal', 'https://tidal.com/', 'Hi-fi / lossless streaming.'],
        ['Deezer', 'https://www.deezer.com/', 'Streaming with the Flow personalised radio.'],
        ['Last.fm', 'https://www.last.fm/', 'Scrobbles your listening and recommends from it.'],
        ['BIRP!', 'https://birp.fm/', 'Free monthly 100+ track indie playlist since 2009.'],
      ]),
      text('Best audio quality', 'Music is best quality in FLAC, not MP3.', { color: 'gray' }),
      links('Make music', [
        ['FL Studio', 'https://www.image-line.com/', 'Image-Line\'s DAW.'],
        ['Cubase', 'https://www.steinberg.net/cubase/', 'Steinberg\'s pro DAW.'],
        ['Audacity', 'https://www.audacityteam.org/', 'Free open-source audio editor.'],
        ['Strudel', 'https://strudel.cc', 'Live-code music in the browser.'],
      ], { color: 'blue' }),
      links('Play', [
        ['Scale the Depths (Steam)', 'https://store.steampowered.com/app/3198890/Scale_the_Depths/', 'Cozy indie fishing game: catch and scale fish, feed customers.'],
        ['Neal.fun', 'https://neal.fun', 'Interactive web toys and games.'],
      ], { color: 'green' }),
      links('Art magazines (for Arteza sales)', [
        ['Artforum', 'https://www.artforum.com/', 'Leading international contemporary art magazine.'],
        ['Frieze', 'https://www.frieze.com/', 'Contemporary art magazine + the Frieze fairs.'],
        ['ARTnews', 'https://www.artnews.com/', 'Art news and market, founded 1902.'],
        ['Aperture', 'https://aperture.org/', 'Photography nonprofit, magazine and books.'],
        ['ArtReview', 'https://artreview.com/', 'London-based international contemporary art magazine.'],
        ['Whitehot Magazine', 'https://whitehotmagazine.com/', 'Online contemporary art magazine.'],
        ['Juxtapoz', 'https://www.juxtapoz.com/', 'Street, pop-surrealist and lowbrow art.'],
        ['BOMB Magazine', 'https://bombmagazine.org/', 'Artist-to-artist interviews across the arts.'],
        ['Hyperallergic', 'https://hyperallergic.com/', 'Art news and criticism from Brooklyn.'],
        ['Desi Art Mag', 'https://desiartmag.com/', 'South Asian contemporary art, twice a year.'],
        ['Tatler', 'https://www.tatler.com/', 'British society, fashion and lifestyle (Condé Nast).'],
      ], { color: 'orange' }),
      links('Fun things to make', [
        ['Crash course: Substack for photographers', 'https://ronaldsmeets.substack.com/p/a-crash-course-substack-for-photographers', 'Ronald Smeets on publishing photography on Substack.'],
      ]),
      bullets('Fun things to do', [
        'Design an album cover for a fake artist',
        'Make a moodboard for your dreamhouse',
        'Design your dream outfit',
        'NETFLIX effect / Anne Klein',
      ], { color: 'pink' }),
      links('Instagram saves', [
        ['@warpaintjournal — on loneliness', 'https://www.instagram.com/p/DUIgVkTk0bx', 'Modern loneliness as systemic: lost third spaces, precarity, monetised attention.'],
        ['@gaelaitor — on play', 'https://www.instagram.com/p/DVCDJgLEVol', '"The meaning of life is play." Play as counter-culture.'],
        ['@andrewamine — Robinhood ad reel', 'https://www.instagram.com/reel/DR8H_fxjozV', 'Robinhood ad staged as a subway video, dir. Clara Cullen.'],
      ]),
    ],
  };

  /* --------------------------------------------------------------- ideas */

  const ideas = {
    name: 'Ideas',
    layout: 'grid',
    cards: [
      links('Papers & reads', [
        ['Music as a scientific metaphor for mind and brain', 'https://www.sciencedirect.com/science/article/pii/S0149763426001004', 'Ibáñez et al., Neuroscience & Biobehavioral Reviews, 2026.'],
        ['Effects of Melody and Lyrics on Mood and Memory', 'https://doi.org/10.2466/pms.1997.85.1.31', 'Sousou, Perceptual and Motor Skills 85(1), 1997.'],
        ['Affective Impact of Music vs. Lyrics', 'https://doi.org/10.2190/35T0-U4DT-N09Q-LQHW', 'Stratton & Zalanowski, Empirical Studies of the Arts 12(2), 1994.'],
        ['Polymath.sys — math practice', 'https://polymath-sys-ai-eng.vercel.app', 'Self-study curriculum.'],
      ], { color: 'purple' }),
      bullets('Things to study', [
        'Predictive coding (neuroscience)',
        'The free energy principle',
        'Epigenetic inheritance',
        'Quantum decoherence',
        'The hard problem of consciousness',
        'The Fermi paradox',
        'The anthropic principle',
        'Emergence theory',
        'The Dunbar number',
        'Neuroplastic critical periods',
        'Entropy and the arrow of time',
        'Narrative identity',
        'Opportunity cost',
      ], { color: 'yellow' }),
      links('Reading list — authors', [
        ['Carl Jung', 'https://www.goodreads.com/author/show/38285.C_G_Jung', ''],
        ['Jean-Paul Sartre', 'https://www.goodreads.com/author/show/1466.Jean_Paul_Sartre', ''],
        ['Thomas Erikson', 'https://www.goodreads.com/author/show/15077558.Thomas_Erikson', 'Surrounded by Idiots, etc.'],
      ]),
      links('Books', [
        ['Men Who Hate Women — Laura Bates', 'https://www.goodreads.com/book/show/48635408-men-who-hate-women', 'On online misogynist extremism.'],
        ['Doctor Faustus — Marlowe', 'https://www.goodreads.com/book/show/18525.Dr_Faustus', 'The play. (Thomas Mann wrote a 1947 novel of the same name.)'],
        ['The Unfair Advantage — Ali & Kubba', 'https://www.goodreads.com/book/show/50714359-the-unfair-advantage', 'Using your own advantages to succeed at startups.'],
        ['The Courage to Be Disliked — Kishimi & Koga', 'https://www.goodreads.com/book/show/43306206-the-courage-to-be-disliked', 'Adlerian psychology as a dialogue.'],
        ['Doctor Faustus (the text)', 'https://www.gutenberg.org/ebooks/779', 'Free full text on Gutenberg.'],
      ], { color: 'brown' }),
      links('Substack to read', [
        ['Gatekept', 'https://gatekeptmag.substack.com', 'Style and culture with reading syllabi.'],
        ['Pluck vs Luck', 'https://substack.com/search/Pluck%20vs%20Luck', 'Search — the exact publication wasn\'t linked in the notebook.', 'search'],
        ['"There\'s no such thing as getting ahead"', 'https://substack.com/search/there\'s%20no%20such%20thing%20as%20getting%20ahead', 'Search — title only in the notebook.', 'search'],
      ]),
      quote('If capitalism rewarded intelligence, the richest would be neurosurgeons. If it rewarded talent, artists. If it rewarded hard work, labourers. But it rewards nepotism and the theft of personal data to sell targeted ads.', 'Notebook, June'),
      quote('The first step, especially for young people with energy and drive and talent but not money, the first step to controlling your world is to control your culture. To model the world you demand to live in. Write the books. Make the music. Shoot the films. Paint the art.', 'Chuck Palahniuk, 2004'),
      quote('Have the wisdom to know when to go with the flow and when to resist. (India: ignore everything and win. China: do nothing and win.)', 'Notebook'),
      text('Image has power', 'Style communicates ambition, identity, and belonging. Confidence completes the look.', { color: 'pink' }),
      text('It\'s only propaganda if you\'re stupid', 'The Village People manipulated the Navy into helping make a song that is actually anti-military (a verse defects the draft). The TikTok clip captures none of it. Same with "Just a Girl" by Gwen Stefani and "YMCA."', { color: 'gray' }),
      text('Everybody wants to be an engineer',
        'Nobody wants to engineer anything. 750,000 graduates a year; ask 90% to build something from scratch without a tutorial and they freeze. Four years, not one original project — just copied assignments and downloaded repos.\n\n' +
        'India didn\'t produce coders, it produced syntax memorisers: people who can write a for-loop but can\'t say when to use one, who\'ve "done" ML but can\'t clean a CSV without a YouTube tutorial. Then bootcamps: pay 2 lakhs to build the same todo app, weather app, Netflix clone.\n\n' +
        'Now AI writes better code than all of them. Coding was never the skill. Thinking was — which is what they never taught.'),
      text('Gen Z parenthood gap',
        'More Gen Z men want to be parents than women. Per a 2024 Pew study, 51% of men aged 18-34 want children vs 45% of women, even as US birth rates fell to ~1.6 per woman.\n\n' +
        'Falling birth rates track rising income and education — more intentional choices. Part of women\'s apprehension: they\'re a big share of the workforce but still do most caregiving, and a rise in young men wanting traditional roles (King\'s College London / Ipsos) doesn\'t help.'),
      links('Personal branding / touch designer', [
        ['TouchDesigner', 'https://derivative.ca/', 'Real-time interactive visuals.'],
        ['Fig Careers', 'https://www.figcareer.com/roadmap/9b0efef1-c13f-4832-bce7-f50c901a5b2a', 'Personal-branding roadmap.'],
      ]),
      bullets('Things to try', [
        'Plastic detox',
        'Neuroplasticity habit-building using research papers',
      ], { color: 'green' }),
    ],
  };

  return {
    id: 'notebook-2026-09',
    boards: [dashboard, career, learn, discover, culture, ideas],
  };
})();
