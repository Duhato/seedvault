// ==================== THEME ====================
function getTheme() { return localStorage.getItem('seedvault_theme') || 'light'; }
function setTheme(theme) {
  localStorage.setItem('seedvault_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}
function toggleTheme() { setTheme(getTheme() === 'light' ? 'dark' : 'light'); render(); }

// ==================== AUTH ====================
const TOKEN_KEY = 'seedvault_token';
const USERNAME_KEY = 'seedvault_username';
const ROLE_KEY = 'seedvault_role';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function getRole() { return localStorage.getItem(ROLE_KEY); }
function setToken(token, username, role) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
  localStorage.setItem(ROLE_KEY, role || 'standard');
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(ROLE_KEY);
}

async function checkAuth() {
  try {
    const status = await fetch('/api/auth/status').then(r => r.json());
    if (!status.hasUsers) { showSetup(); return false; }
    const token = getToken();
    if (!token) { showLogin(); return false; }
    const test = await api('/api/stats');
    if (test.error === 'Unauthorized' || test.error === 'Invalid or expired token' || test.error) {
      clearToken(); showLogin(); return false;
    }
    showApp(); return true;
  } catch (err) { clearToken(); showLogin(); return false; }
}

function showLogin() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('setup-form').classList.add('hidden');
}

function showSetup() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('setup-form').classList.remove('hidden');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  const username = localStorage.getItem(USERNAME_KEY);
  if (username) document.getElementById('nav-username').textContent = username;
}

async function submitLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  if (!username || !password) { errEl.textContent = 'Please enter username and password'; errEl.classList.remove('hidden'); return; }
  clearToken();
  try {
    const result = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }).then(r => r.json());
    if (result.error) { errEl.textContent = result.error; errEl.classList.remove('hidden'); return; }
    setToken(result.token, result.username, result.role);
    showApp(); await loadAll(); render();
  } catch (err) { errEl.textContent = 'Login failed. Please try again.'; errEl.classList.remove('hidden'); }
}

async function submitSetup() {
  const username = document.getElementById('setup-username').value.trim();
  const password = document.getElementById('setup-password').value;
  const confirm = document.getElementById('setup-confirm').value;
  const errEl = document.getElementById('setup-error');
  errEl.classList.add('hidden');
  if (!username || !password) { errEl.textContent = 'Please fill in all fields'; errEl.classList.remove('hidden'); return; }
  if (password.length < 8) { errEl.textContent = 'Password must be at least 8 characters'; errEl.classList.remove('hidden'); return; }
  if (password !== confirm) { errEl.textContent = 'Passwords do not match'; errEl.classList.remove('hidden'); return; }
  try {
    const result = await fetch('/api/auth/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }).then(r => r.json());
    if (result.error) { errEl.textContent = result.error; errEl.classList.remove('hidden'); return; }
    setToken(result.token, result.username, result.role);
    showApp(); await loadAll(); render();
  } catch (err) { errEl.textContent = 'Setup failed. Please try again.'; errEl.classList.remove('hidden'); }
}

function logout() { clearToken(); showLogin(); }

// ==================== STATE ====================
const BUILTIN_COMPANIONS = {
  'CUC': { good: [{name:'Beans',icon:'🫘',reason:'Fix nitrogen, improve soil fertility',how:'Plant pole beans at the base of cucumber trellis or interplant bush beans between cucumber hills.',distance:'12-18 inches apart',timing:'Plant at the same time after last frost'},{name:'Corn',icon:'🌽',reason:'Provides shade, reduces moisture loss',how:'Plant corn on the west or south side of cucumbers to provide afternoon shade.',distance:'18-24 inches from cucumbers',timing:'Start corn 1-2 weeks before cucumbers'},{name:'Dill',icon:'🌿',reason:'Repels aphids and spider mites',how:'Let dill go to flower for maximum benefit — flowering dill attracts predatory wasps.',distance:'12 inches away',timing:'Plant dill 3-4 weeks before cucumbers so it is established'},{name:'Nasturtiums',icon:'🌸',reason:'Trap crop for aphids, repel squash bugs',how:'Plant nasturtiums as a border around cucumber beds to lure aphids away.',distance:'12 inches from cucumbers',timing:'Plant at the same time or slightly before'},{name:'Radishes',icon:'🌱',reason:'Deter cucumber beetles',how:'Interplant radishes directly between cucumber plants — do not harvest, let them bolt.',distance:'6 inches between radishes',timing:'Direct sow at same time as cucumbers'},{name:'Sunflowers',icon:'🌻',reason:'Attract pollinators, provide light shade',how:'Plant on the north side so they do not shade cucumbers — cucumbers can climb the stalks.',distance:'24 inches away',timing:'Start sunflowers 2 weeks before cucumbers'}], bad: [{name:'Sage',icon:'🌿',reason:'Inhibits cucumber growth',how:'Keep sage at least 3 feet away from cucumber beds.',distance:'Minimum 3 feet',timing:'N/A — avoid proximity entirely'},{name:'Potatoes',icon:'🥔',reason:'Compete for nutrients, share blight',how:'Grow in completely separate beds — they share blight diseases.',distance:'Keep in different beds',timing:'N/A'},{name:'Melons',icon:'🍈',reason:'Compete for space and nutrients',how:'Give each their own bed — they sprawl and compete aggressively.',distance:'Keep in different beds',timing:'N/A'}], tips: 'Cucumbers love warmth and consistent moisture. Plant after last frost when soil reaches 60°F. Trellis vertically to save space and improve air circulation.' },
  'TOM': { good: [{name:'Basil',icon:'🌿',reason:'Repels aphids, improves flavor',how:'Plant basil every 18 inches between tomato plants throughout the bed.',distance:'18 inches from tomatoes',timing:'Plant at the same time after last frost'},{name:'Carrots',icon:'🥕',reason:'Loosen soil around roots',how:'Direct sow carrot seeds between tomato transplants.',distance:'6 inches from tomato stems',timing:'Sow carrots when transplanting tomatoes'},{name:'Marigolds',icon:'🌼',reason:'Repel nematodes and whiteflies',how:'Plant French marigolds as a dense border around tomato beds.',distance:'12 inches apart around bed perimeter',timing:'Plant 2 weeks before tomatoes'},{name:'Parsley',icon:'🌱',reason:'Attracts beneficial insects',how:'Interplant parsley throughout the tomato bed and let some bolt to flower.',distance:'12 inches from tomatoes',timing:'Plant at same time as tomatoes'},{name:'Borage',icon:'🌸',reason:'Repels tomato hornworm',how:'Plant 1-2 borage plants per 4 tomato plants throughout the bed.',distance:'24 inches from tomatoes',timing:'Direct sow at same time as tomatoes'},{name:'Garlic',icon:'🧄',reason:'Deters spider mites and aphids',how:'Plant garlic cloves between tomato plants in fall for spring tomatoes, or use established garlic nearby.',distance:'6-12 inches from tomatoes',timing:'Plant garlic in fall for best results'}], bad: [{name:'Fennel',icon:'🌿',reason:'Inhibits tomato growth',how:'Keep fennel in a completely separate part of the garden.',distance:'Minimum 3 feet away',timing:'N/A'},{name:'Brassicas',icon:'🥦',reason:'Compete for nutrients',how:'Rotate tomatoes and brassicas to different beds each year.',distance:'Keep in separate beds',timing:'N/A'},{name:'Corn',icon:'🌽',reason:'Both attract tomato fruitworm/corn earworm',how:'Grow in separate beds on opposite sides of the garden.',distance:'As far apart as possible',timing:'N/A'}], tips: 'Tomatoes are heavy feeders. Rotate beds every year to prevent disease buildup. Remove suckers for indeterminate varieties to focus energy on fruit.' },
  'PEP': { good: [{name:'Basil',icon:'🌿',reason:'Repels aphids, may improve flavor',how:'Interplant basil throughout pepper bed, one basil per 2-3 peppers.',distance:'12-18 inches from peppers',timing:'Plant together after last frost'},{name:'Carrots',icon:'🥕',reason:'Loosen soil, compatible root depth',how:'Direct sow carrots between pepper transplants.',distance:'6 inches from pepper stems',timing:'Sow when transplanting peppers'},{name:'Tomatoes',icon:'🍅',reason:'Similar needs, good neighbors',how:'Plant peppers and tomatoes in adjacent beds or rows.',distance:'18-24 inches apart',timing:'Plant together after last frost'},{name:'Marigolds',icon:'🌼',reason:'Deter aphids and nematodes',how:'Plant as a dense border around the pepper bed.',distance:'12 inches apart around perimeter',timing:'Plant 2 weeks before peppers'},{name:'Spinach',icon:'🥬',reason:'Ground cover, retains moisture',how:'Sow spinach between pepper plants as living mulch.',distance:'6 inches between spinach plants',timing:'Sow spinach 2-3 weeks before peppers go out'}], bad: [{name:'Fennel',icon:'🌿',reason:'Allelopathic, inhibits growth',how:'Keep fennel far away in its own bed.',distance:'Minimum 3 feet',timing:'N/A'},{name:'Apricots',icon:'🍑',reason:'Share verticillium wilt',how:'Do not plant peppers where stone fruits have grown.',distance:'Keep in separate beds',timing:'N/A'}], tips: 'Peppers love heat and full sun. Begin indoors 8-10 weeks before last frost. Keep soil consistently moist for best fruit set.' },
  'CAR': { good: [{name:'Tomatoes',icon:'🍅',reason:'Tomatoes shade soil, carrots loosen it',how:'Plant carrots directly between tomato plants — they use different soil depths.',distance:'6 inches from tomato stems',timing:'Sow carrot seeds when transplanting tomatoes'},{name:'Lettuce',icon:'🥬',reason:'Shallow roots, no competition',how:'Interplant lettuce between carrot rows for efficient use of space.',distance:'8 inches between lettuce plants',timing:'Plant lettuce at same time as carrots'},{name:'Onions',icon:'🧅',reason:'Deter carrot fly',how:'Alternate rows of carrots and onions — the mixed scents confuse carrot fly.',distance:'Alternate rows 6 inches apart',timing:'Plant at the same time'},{name:'Sage',icon:'🌿',reason:'Repels carrot fly',how:'Plant sage as a border around the carrot bed.',distance:'12 inches from carrot rows',timing:'Establish sage before sowing carrots'},{name:'Rosemary',icon:'🌿',reason:'Deters carrot fly',how:'Plant rosemary at the ends of carrot rows as a windbreak and pest barrier.',distance:'18 inches from carrots',timing:'Establish rosemary before sowing carrots'},{name:'Chives',icon:'🌱',reason:'Improve flavor, deter aphids',how:'Plant chives every 12 inches along carrot rows.',distance:'12 inches apart along rows',timing:'Plant at same time'}], bad: [{name:'Dill',icon:'🌿',reason:'Cross-pollinates, inhibits growth',how:'Keep dill in a completely separate bed.',distance:'Minimum 2 feet',timing:'N/A'},{name:'Parsnips',icon:'🌱',reason:'Compete for same nutrients and space',how:'Grow in separate beds — they have identical needs and crowd each other.',distance:'Separate beds',timing:'N/A'},{name:'Fennel',icon:'🌿',reason:'Allelopathic to most vegetables',how:'Grow fennel in isolation away from all vegetables.',distance:'Minimum 3 feet',timing:'N/A'}], tips: 'Carrots need deep, loose, rock-free soil. Thin seedlings early — crowded carrots fork badly. Sow in early spring or fall for best flavor.' },
  'BEAN': { good: [{name:'Corn',icon:'🌽',reason:'Classic Three Sisters — beans fix nitrogen for corn',how:'Plant beans at the base of corn stalks once corn is 6 inches tall. Pole beans work best.',distance:'6 inches from corn base',timing:'Plant beans 2-3 weeks after corn'},{name:'Squash',icon:'🎃',reason:'Three Sisters — squash shades ground',how:'Plant squash between corn/bean hills — the large leaves shade out weeds.',distance:'18-24 inches between squash plants',timing:'Plant squash 1 week after beans'},{name:'Cucumbers',icon:'🥒',reason:'Beans fix nitrogen cucumbers need',how:'Interplant bush beans between cucumber hills.',distance:'12 inches from cucumbers',timing:'Plant at the same time'},{name:'Carrots',icon:'🥕',reason:'Different root depths, no competition',how:'Alternate rows of beans and carrots for efficient use of space.',distance:'6 inches between rows',timing:'Plant at the same time'},{name:'Marigolds',icon:'🌼',reason:'Deter Mexican bean beetles',how:'Plant marigolds as a border around bean beds.',distance:'12 inches apart around perimeter',timing:'Plant 2 weeks before beans'}], bad: [{name:'Onions',icon:'🧅',reason:'Inhibit bean growth',how:'Keep onion family plants away from beans completely.',distance:'Minimum 2 feet',timing:'N/A'},{name:'Garlic',icon:'🧄',reason:'Inhibit bean growth',how:'Keep garlic in a separate bed from beans.',distance:'Minimum 2 feet',timing:'N/A'},{name:'Fennel',icon:'🌿',reason:'Allelopathic to beans',how:'Grow fennel in complete isolation.',distance:'Minimum 3 feet',timing:'N/A'}], tips: 'Beans fix atmospheric nitrogen — great before heavy feeders. Do not over-fertilize with nitrogen or you get leaves, not pods. Direct sow after last frost.' },
  'LETT': { good: [{name:'Carrots',icon:'🥕',reason:'Different depths, great neighbors',how:'Interplant lettuce between carrot rows — they use different soil depths.',distance:'6-8 inches between lettuce plants',timing:'Plant at the same time'},{name:'Radishes',icon:'🌱',reason:'Break soil, mark slow lettuce rows',how:'Sow radish seeds along lettuce rows — they germinate fast and mark the row.',distance:'3 inches apart in the row',timing:'Sow at the same time as lettuce'},{name:'Strawberries',icon:'🍓',reason:'Ground cover, mutual benefit',how:'Plant lettuce between strawberry plants in spring before they fill in.',distance:'8-10 inches from strawberry crowns',timing:'Plant lettuce in early spring'},{name:'Chives',icon:'🌱',reason:'Deter aphids',how:'Plant chives as a border around lettuce beds.',distance:'6 inches apart around perimeter',timing:'Establish chives before planting lettuce'},{name:'Tall flowers',icon:'🌸',reason:'Provide shade in summer heat',how:'Plant sunflowers or zinnias on the south side of lettuce to provide afternoon shade.',distance:'18-24 inches from lettuce',timing:'Start flowers 2-3 weeks before lettuce'}], bad: [{name:'Celery',icon:'🌿',reason:'Compete aggressively',how:'Grow in separate beds.',distance:'Separate beds',timing:'N/A'},{name:'Fennel',icon:'🌿',reason:'Allelopathic',how:'Keep fennel far away from all lettuce.',distance:'Minimum 3 feet',timing:'N/A'}], tips: 'Lettuce bolts in heat — plant in spring/fall or in shade of taller crops. Cut-and-come-again harvesting extends the season significantly.' },
  'SQUA': { good: [{name:'Corn',icon:'🌽',reason:'Three Sisters — squash shades ground, reduces weeds',how:'Plant squash between corn hills once corn is established. Let vines sprawl between rows.',distance:'18-24 inches between squash plants',timing:'Plant 1 week after beans in the Three Sisters arrangement'},{name:'Beans',icon:'🫘',reason:'Beans fix nitrogen squash needs',how:'Plant pole beans at corn base, squash sprawls underneath — classic Three Sisters.',distance:'12 inches from bean base',timing:'Plant squash 1 week after beans'},{name:'Nasturtiums',icon:'🌸',reason:'Trap crop for aphids, repel squash bugs',how:'Plant nasturtiums as a border around squash beds — they lure pests away.',distance:'12 inches around bed perimeter',timing:'Plant at the same time as squash'},{name:'Borage',icon:'🌸',reason:'Deters squash vine borers',how:'Plant 1-2 borage plants near each squash hill.',distance:'18 inches from squash hill',timing:'Plant at same time as squash'},{name:'Marigolds',icon:'🌼',reason:'Deter squash bugs and beetles',how:'Plant French marigolds densely around the entire squash bed.',distance:'12 inches apart',timing:'Plant 2 weeks before squash'}], bad: [{name:'Potatoes',icon:'🥔',reason:'Compete for nutrients',how:'Grow in completely separate beds.',distance:'Separate beds',timing:'N/A'},{name:'Fennel',icon:'🌿',reason:'Allelopathic',how:'Keep fennel far away from squash.',distance:'Minimum 3 feet',timing:'N/A'}], tips: 'Squash needs lots of space and pollinators. Hand-pollinate if fruit drops early. Watch for squash vine borers — row cover early in season helps.' },
  'CORN': { good: [{name:'Beans',icon:'🫘',reason:'Fix nitrogen, classic Three Sisters',how:'Plant pole beans at the base of corn stalks once corn is 6 inches tall.',distance:'6 inches from corn base',timing:'Plant beans 2-3 weeks after corn emerges'},{name:'Squash',icon:'🎃',reason:'Ground cover, moisture retention',how:'Plant squash between corn hills — vines sprawl and shade out weeds.',distance:'24 inches between hills',timing:'Plant squash 1 week after beans'},{name:'Cucumbers',icon:'🥒',reason:'Cucumbers climb corn stalks',how:'Plant cucumbers at the base of outer corn rows and let them climb.',distance:'12 inches from corn base',timing:'Plant at same time as corn or slightly after'},{name:'Melons',icon:'🍈',reason:'Similar needs, good neighbors',how:'Plant melons between corn rows where they have room to sprawl.',distance:'24-36 inches between melon plants',timing:'Plant at the same time'}], bad: [{name:'Tomatoes',icon:'🍅',reason:'Share corn earworm/tomato fruitworm',how:'Grow tomatoes and corn on opposite sides of the garden.',distance:'As far apart as possible',timing:'N/A'},{name:'Celery',icon:'🌿',reason:'Inhibits corn growth',how:'Keep celery in a separate bed.',distance:'Minimum 3 feet',timing:'N/A'}], tips: 'Corn needs to be planted in blocks for good pollination — at least 4x4. Heavy feeder, amend with compost before planting.' },
  'SPIN': { good: [{name:'Strawberries',icon:'🍓',reason:'Mutual benefit, similar season',how:'Plant spinach between strawberry rows in early spring before strawberries fill in.',distance:'6-8 inches from strawberry crowns',timing:'Plant in early spring at the same time'},{name:'Peas',icon:'🫛',reason:'Fix nitrogen, cool season companions',how:'Plant spinach at the base of pea trellises — peas fix nitrogen and provide light shade.',distance:'6 inches from pea base',timing:'Plant at the same time in early spring'},{name:'Brassicas',icon:'🥦',reason:'Similar cool season timing',how:'Interplant spinach between brassica transplants while they are still small.',distance:'8 inches between plants',timing:'Plant at same time in spring or fall'}], bad: [{name:'Potatoes',icon:'🥔',reason:'Inhibit spinach growth',how:'Keep in separate beds.',distance:'Separate beds',timing:'N/A'},{name:'Fennel',icon:'🌿',reason:'Allelopathic',how:'Keep fennel away from all vegetables.',distance:'Minimum 3 feet',timing:'N/A'}], tips: 'Spinach is a cool-season crop. Sow in late summer for fall harvest. Needs consistent moisture and partial shade in warm weather.' },
  'MELO': { good: [{name:'Corn',icon:'🌽',reason:'Provide light shade, similar water needs',how:'Plant melons between corn rows on the east side to get morning sun.',distance:'24-36 inches between melon plants',timing:'Plant at same time as corn'},{name:'Nasturtiums',icon:'🌸',reason:'Repel aphids and beetles',how:'Plant nasturtiums as a border around the entire melon bed.',distance:'12 inches apart around perimeter',timing:'Plant 2 weeks before melons'},{name:'Marigolds',icon:'🌼',reason:'Deter pests',how:'Plant French marigolds densely around the melon bed perimeter.',distance:'12 inches apart',timing:'Plant 2 weeks before melons'}], bad: [{name:'Cucumbers',icon:'🥒',reason:'Compete for space and nutrients',how:'Give each their own dedicated bed.',distance:'Separate beds',timing:'N/A'},{name:'Potatoes',icon:'🥔',reason:'Compete, share diseases',how:'Rotate so melons and potatoes are never in adjacent beds.',distance:'Separate beds',timing:'N/A'}], tips: 'Melons need warmth, space, and consistent watering until fruit sets, then reduce water to concentrate sugars.' },
  'ONI': { good: [{name:'Carrots',icon:'🥕',reason:'Classic pairing — onions deter carrot fly',how:'Alternate rows of onions and carrots — the mixed scent confuses carrot fly.',distance:'Alternate rows 6 inches apart',timing:'Plant at the same time'},{name:'Tomatoes',icon:'🍅',reason:'Onions deter aphids around tomatoes',how:'Plant onions as a border around tomato beds.',distance:'6 inches apart around perimeter',timing:'Plant onions 3-4 weeks before tomatoes'},{name:'Brassicas',icon:'🥦',reason:'Deter cabbage worms',how:'Interplant onions between brassica transplants.',distance:'6 inches from brassica stems',timing:'Plant at same time as brassicas'},{name:'Chamomile',icon:'🌼',reason:'Said to improve onion flavor',how:'Plant 1-2 chamomile plants per onion bed.',distance:'18 inches from onion rows',timing:'Establish chamomile before planting onions'}], bad: [{name:'Beans',icon:'🫘',reason:'Onions inhibit bean growth',how:'Keep onion family in a completely separate bed from legumes.',distance:'Separate beds',timing:'N/A'},{name:'Peas',icon:'🫛',reason:'Inhibit each other',how:'Keep peas and onions in separate beds.',distance:'Separate beds',timing:'N/A'},{name:'Sage',icon:'🌿',reason:'Compete and inhibit',how:'Keep sage away from onion beds.',distance:'Minimum 2 feet',timing:'N/A'}], tips: 'Onions are slow growing — start early. Plant densely and thin for scallions. Keep weed-free as they hate competition.' },
  'PEA': { good: [{name:'Carrots',icon:'🥕',reason:'Classic companion, different root depths',how:'Plant carrots at the base of pea trellises — different root depths, no competition.',distance:'3-4 inches from pea base',timing:'Sow carrots when planting peas'},{name:'Radishes',icon:'🌱',reason:'Deter aphids',how:'Scatter radish seeds among pea rows — do not harvest, let them bolt.',distance:'4 inches apart between peas',timing:'Sow at same time as peas'},{name:'Spinach',icon:'🥬',reason:'Cool season companion',how:'Plant spinach between pea rows as ground cover.',distance:'6 inches between plants',timing:'Plant at the same time in early spring'},{name:'Lettuce',icon:'🥬',reason:'Similar needs, good use of space',how:'Plant lettuce at the base of pea trellises to use the shade.',distance:'8 inches between lettuce plants',timing:'Plant at same time as peas'}], bad: [{name:'Onions',icon:'🧅',reason:'Inhibit pea growth',how:'Keep all onion family away from peas.',distance:'Separate beds',timing:'N/A'},{name:'Garlic',icon:'🧄',reason:'Inhibit pea growth',how:'Keep garlic in a separate bed from peas.',distance:'Separate beds',timing:'N/A'},{name:'Gladiolus',icon:'🌸',reason:'Harbor thrips that damage peas',how:'Do not plant gladiolus near peas.',distance:'Minimum 3 feet',timing:'N/A'}], tips: 'Peas fix nitrogen — great before heavy feeders. Direct sow as soon as soil can be worked. Provide trellis for climbing varieties.' },
  'HERB': { good: [{name:'Most vegetables',icon:'🥦',reason:'Herbs generally deter pests and attract beneficials'},{name:'Tomatoes',icon:'🍅',reason:'Basil and parsley are classic tomato companions'},{name:'Brassicas',icon:'🥦',reason:'Dill and sage deter cabbage worms'}], bad: [{name:'Fennel',icon:'🌿',reason:'Allelopathic to most plants — grow alone'},{name:'Rue',icon:'🌿',reason:'Inhibits many vegetables'}], tips: 'Most herbs are beneficial companions. Plant them throughout the garden rather than in one spot for maximum pest deterrent effect.' },
  'MARI': { good: [{name:'Tomatoes',icon:'🍅',reason:'Repel nematodes, whiteflies and aphids'},{name:'Peppers',icon:'🫑',reason:'Deter aphids and nematodes'},{name:'Squash',icon:'🎃',reason:'Repel squash bugs and beetles'},{name:'Cucumbers',icon:'🥒',reason:'General pest deterrent'},{name:'Brassicas',icon:'🥦',reason:'Deter cabbage worms and aphids'}], bad: [{name:'Fennel',icon:'🌿',reason:'Allelopathic, inhibits marigold growth'}], tips: 'Marigolds are one of the most powerful companion plants. French marigolds (Tagetes patula) are most effective — their roots secrete a substance that kills nematodes. Plant densely around the garden perimeter and between rows.' },
  'NAST': { good: [{name:'Tomatoes',icon:'🍅',reason:'Trap crop for aphids, keeping them off tomatoes'},{name:'Cucumbers',icon:'🥒',reason:'Repel cucumber beetles and aphids'},{name:'Squash',icon:'🎃',reason:'Trap crop for aphids and squash bugs'},{name:'Brassicas',icon:'🥦',reason:'Trap crop for aphids and caterpillars'},{name:'Beans',icon:'🫘',reason:'Deter aphids and beetles'}], bad: [{name:'Fennel',icon:'🌿',reason:'Allelopathic, inhibits nasturtium growth'}], tips: 'Nasturtiums are edible — flowers and leaves have a peppery flavor. They work as a trap crop by luring aphids away from vegetables. Both trailing and climbing varieties work well. Self-seed readily.' },
  'BORA': { good: [{name:'Tomatoes',icon:'🍅',reason:'Repels tomato hornworm, attracts pollinators'},{name:'Squash',icon:'🎃',reason:'Deters squash vine borers'},{name:'Strawberries',icon:'🍓',reason:'Classic pairing, improves flavor and yield'},{name:'Brassicas',icon:'🥦',reason:'Repels cabbage worms'}], bad: [{name:'None known',icon:'✅',reason:'Borage is beneficial to nearly everything'}], tips: 'Borage is one of the best all-around companion plants. It attracts bees and beneficial insects, repels major pests, and is edible. Self-seeds aggressively so plant where you want it to spread.' },
  'SUNF': { good: [{name:'Cucumbers',icon:'🥒',reason:'Cucumbers climb stalks, shade reduces moisture loss'},{name:'Corn',icon:'🌽',reason:'Similar needs, attract pollinators together'},{name:'Squash',icon:'🎃',reason:'Attract pollinators, provide light shade'},{name:'Tomatoes',icon:'🍅',reason:'Attract beneficial insects and pollinators'}], bad: [{name:'Potatoes',icon:'🥔',reason:'Sunflowers inhibit potato growth'},{name:'Pole beans',icon:'🫘',reason:'Compete for vertical space and light'}], tips: 'Sunflowers attract pollinators and beneficial insects. Plant on the north side of the garden so they do not shade shorter crops. Excellent for attracting birds that eat pest insects.' },
  'CHAM': { good: [{name:'Brassicas',icon:'🥦',reason:'Improves growth and flavor of cabbage family'},{name:'Onions',icon:'🧅',reason:'Said to improve onion flavor'},{name:'Cucumbers',icon:'🥒',reason:'Attracts beneficial insects'},{name:'Most vegetables',icon:'🥦',reason:'General beneficial insect attractor'}], bad: [{name:'None known',icon:'✅',reason:'Chamomile is broadly beneficial in small amounts'}], tips: 'Chamomile is called the physicians plant — it improves the health of plants growing nearby. Makes excellent tea and attracts hoverflies whose larvae eat aphids.' },
  'ZINN': { good: [{name:'Tomatoes',icon:'🍅',reason:'Attract pollinators and beneficial wasps'},{name:'Peppers',icon:'🫑',reason:'Attract pollinators'},{name:'Cucumbers',icon:'🥒',reason:'Attract bees for pollination'},{name:'Squash',icon:'🎃',reason:'Attract pollinators, critical for squash fruit set'}], bad: [{name:'None known',icon:'✅',reason:'Zinnias are broadly beneficial pollinator attractors'}], tips: 'Zinnias are one of the best flowers for attracting pollinators and beneficial insects. Plant in clusters for maximum effect. Deadhead regularly to extend bloom time through the season.' },
  'CALE': { good: [{name:'Tomatoes',icon:'🍅',reason:'Repel tomato hornworm and whiteflies'},{name:'Brassicas',icon:'🥦',reason:'Deter aphids and cabbage worms'},{name:'Carrots',icon:'🥕',reason:'Attract beneficial insects'},{name:'Asparagus',icon:'🌱',reason:'Classic pairing, mutual benefit'}], bad: [{name:'None known',icon:'✅',reason:'Calendula is broadly beneficial'}], tips: 'Calendula (pot marigold) has edible petals and blooms all season. It self-seeds readily and deters many common garden pests.' },
  'BASI': { good: [{name:'Tomatoes',icon:'🍅',reason:'Repels aphids, thrips, and whiteflies — may improve flavor'},{name:'Peppers',icon:'🫑',reason:'Repels aphids and spider mites'},{name:'Marigolds',icon:'🌼',reason:'Together make a powerful pest deterrent duo'}], bad: [{name:'Sage',icon:'🌿',reason:'Inhibit each other when planted too close'},{name:'Fennel',icon:'🌿',reason:'Allelopathic to basil'}], tips: 'Plant basil throughout the tomato and pepper beds. Pinch flowers off regularly to keep the plant producing leaves. Sweet basil is most effective as a companion.' },
  'DILL': { good: [{name:'Brassicas',icon:'🥦',reason:'Attracts beneficial wasps that prey on cabbage worms'},{name:'Lettuce',icon:'🥬',reason:'Compatible, attracts beneficials'},{name:'Onions',icon:'🧅',reason:'Good neighbors in the herb garden'},{name:'Corn',icon:'🌽',reason:'Attracts beneficial insects'}], bad: [{name:'Carrots',icon:'🥕',reason:'Cross-pollinates and inhibits carrot growth'},{name:'Tomatoes',icon:'🍅',reason:'Young dill inhibits tomatoes — only mature dill is beneficial'},{name:'Peppers',icon:'🫑',reason:'Can inhibit pepper growth'}], tips: 'Let dill go to flower to attract the most beneficial insects. Keep away from carrots and fennel as they cross-pollinate.' },
  'CORI': { good: [{name:'Spinach',icon:'🥬',reason:'Attracts beneficial insects, compatible needs'},{name:'Lettuce',icon:'🥬',reason:'Cool season companions'},{name:'Brassicas',icon:'🥦',reason:'Attracts beneficial wasps'},{name:'Beans',icon:'🫘',reason:'Attracts pollinators and beneficials'}], bad: [{name:'Fennel',icon:'🌿',reason:'Cross-pollinates and inhibits'},{name:'Dill',icon:'🌿',reason:'Cross-pollinates, keep separated'}], tips: 'Cilantro bolts quickly in heat — succession plant every 2-3 weeks. Once it bolts the flowers attract enormous numbers of beneficial insects.' },
  'PARS': { good: [{name:'Tomatoes',icon:'🍅',reason:'Attracts predatory wasps that eat tomato pests'},{name:'Asparagus',icon:'🌱',reason:'Classic long-term pairing, mutual benefit'},{name:'Corn',icon:'🌽',reason:'Attracts beneficial insects'}], bad: [{name:'Mint',icon:'🌿',reason:'Mint aggressively outcompetes parsley'},{name:'Onions',icon:'🧅',reason:'Inhibit parsley growth'}], tips: 'Parsley is biennial — let it overwinter and flower in year two to attract huge numbers of beneficial insects.' },
  'CHIV': { good: [{name:'Carrots',icon:'🥕',reason:'Improve flavor and deter carrot fly'},{name:'Tomatoes',icon:'🍅',reason:'Deter aphids'},{name:'Brassicas',icon:'🥦',reason:'Deter aphids and cabbage worms'}], bad: [{name:'Beans',icon:'🫘',reason:'Onion family inhibits bean growth'},{name:'Peas',icon:'🫛',reason:'Onion family inhibits pea growth'}], tips: 'Chives are one of the easiest perennial herbs. The purple flowers are edible. Divide clumps every few years to keep them vigorous.' },
  'ROSE': { good: [{name:'Tomatoes',icon:'🍅',reason:'Repels spider mites and Mexican bean beetles'},{name:'Brassicas',icon:'🥦',reason:'Repels cabbage moths and bean beetles'},{name:'Beans',icon:'🫘',reason:'Deters bean beetles'},{name:'Carrots',icon:'🥕',reason:'Repels carrot fly'}], bad: [{name:'Cucumbers',icon:'🥒',reason:'Inhibits cucumber growth'},{name:'Pumpkins',icon:'🎃',reason:'Allelopathic to cucurbits'}], tips: 'Rosemary is a drought-tolerant perennial that repels a wide range of pests. Not cold-hardy below zone 7 — grow in pots to overwinter indoors.' },
  'SAGE': { good: [{name:'Brassicas',icon:'🥦',reason:'Deters cabbage moths, whiteflies, and aphids'},{name:'Carrots',icon:'🥕',reason:'Repels carrot fly'},{name:'Tomatoes',icon:'🍅',reason:'Deters flea beetles'},{name:'Strawberries',icon:'🍓',reason:'Improves flavor and growth'}], bad: [{name:'Cucumbers',icon:'🥒',reason:'Inhibits cucumber growth'},{name:'Onions',icon:'🧅',reason:'Compete and inhibit each other'},{name:'Basil',icon:'🌿',reason:'Inhibit each other when too close'}], tips: 'Sage is a perennial that gets woody with age — cut back hard in spring. Extremely effective against cabbage family pests.' },
  'THYM': { good: [{name:'Brassicas',icon:'🥦',reason:'Repels cabbage worms and whiteflies'},{name:'Tomatoes',icon:'🍅',reason:'Deters tomato hornworm'},{name:'Eggplant',icon:'🍆',reason:'Repels flea beetles'},{name:'Strawberries',icon:'🍓',reason:'Improves vigor and flavor'}], bad: [{name:'None known',icon:'✅',reason:'Thyme is broadly beneficial to most vegetables'}], tips: 'Thyme is a low-growing perennial that works well as ground cover between taller plants. Excellent pollinator attractor when in flower.' },
  'MINT': { good: [{name:'Brassicas',icon:'🥦',reason:'Strongly repels cabbage moths and aphids'},{name:'Tomatoes',icon:'🍅',reason:'Repels aphids and flea beetles'},{name:'Peas',icon:'🫛',reason:'Repels aphids'},{name:'Carrots',icon:'🥕',reason:'Repels carrot fly'}], bad: [{name:'Parsley',icon:'🌿',reason:'Mint aggressively outcompetes parsley'},{name:'Chamomile',icon:'🌼',reason:'Mint can overwhelm chamomile'}], tips: 'Mint is extremely aggressive — always grow in containers or with a root barrier buried 12 inches deep. Spearmint and peppermint are most potent for pest repelling.' },
};

const state = {
  page: 'dashboard',
  varieties: [], seedLots: [], plants: [], projects: [],
  harvest: [], species: [], stats: {}, viability: [],
  germination: [], users: [], locations: [], sources: [],
  crosses: [], observations: [], amendments: [],
  settings: {}, inventory: [], weatherLog: [], frostEvents: []
};

async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  return res.json();
}

async function uploadPhoto(url, file) {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch(url, { method: 'POST', headers: { 'Authorization': 'Bearer ' + getToken() }, body: formData });
  return res.json();
}

async function loadAll() {
  const calls = [
    api('/api/varieties'), api('/api/seed-lots'), api('/api/plants'), api('/api/projects'),
    api('/api/harvest'), api('/api/species'), api('/api/stats'), api('/api/viability'),
    api('/api/germination'), api('/api/locations'), api('/api/sources'),
    api('/api/crosses'), api('/api/observations'), api('/api/amendments'),
    api('/api/settings'), api('/api/inventory'),
    api('/api/weather?days=365'), api('/api/frost-events'), api('/api/companions'),
  ];
  if (getRole() === 'admin') calls.push(api('/api/users')); // index 15
  const results = await Promise.all(calls);
  state.varieties = Array.isArray(results[0]) ? results[0] : [];
  state.seedLots = Array.isArray(results[1]) ? results[1] : [];
  state.plants = Array.isArray(results[2]) ? results[2] : [];
  state.projects = Array.isArray(results[3]) ? results[3] : [];
  state.harvest = Array.isArray(results[4]) ? results[4] : [];
  state.species = Array.isArray(results[5]) ? results[5] : [];
  state.stats = results[6] || {};
  state.viability = Array.isArray(results[7]) ? results[7] : [];
  state.germination = Array.isArray(results[8]) ? results[8] : [];
  state.locations = Array.isArray(results[9]) ? results[9] : [];
  state.sources = Array.isArray(results[10]) ? results[10] : [];
  state.crosses = Array.isArray(results[11]) ? results[11] : [];
  state.observations = Array.isArray(results[12]) ? results[12] : [];
  state.amendments = Array.isArray(results[13]) ? results[13] : [];
  state.settings = results[14] && !Array.isArray(results[14]) ? results[14] : {};
  state.inventory = Array.isArray(results[15]) ? results[15] : [];
  state.weatherLog = Array.isArray(results[16]) ? results[16] : [];
  state.frostEvents = Array.isArray(results[17]) ? results[17] : [];
  const companionRows = Array.isArray(results[18]) ? results[18] : [];
  state.companions = {};
  companionRows.forEach(c => { state.companions[c.species_code] = c; });
  state.users = results[19] && Array.isArray(results[19]) ? results[19] : [];
}

function navigate(page) {
  state.page = page;
  document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.nav-gear').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.getElementById('mobile-menu').classList.add('hidden');
  render();
}

function openModal(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

function render() {
  const main = document.getElementById('main-content');
  switch (state.page) {
    case 'dashboard': main.innerHTML = renderDashboard(); setTimeout(loadWeather, 100); break;
    case 'varieties': main.innerHTML = renderVarieties(); break;
    case 'seedlots': main.innerHTML = renderSeedLots(); break;
    case 'plants': main.innerHTML = renderPlants(); break;
    case 'harvest': main.innerHTML = renderHarvest(); break;
    case 'projects': main.innerHTML = renderProjects(); break;
    case 'germination': main.innerHTML = renderGermination(); break;
    case 'locations': main.innerHTML = renderLocations(); break;
    case 'crosses': main.innerHTML = renderCrosses(); break;
    case 'observations': main.innerHTML = renderObservations(); break;
    case 'amendments': main.innerHTML = renderAmendments(); break;
    case 'weather': main.innerHTML = renderWeather(); break;
    case 'resources': main.innerHTML = renderResources(); break;
    case 'settings': main.innerHTML = renderSettings(); break;
  }
}

function formatFrostDate(mmdd) {
  if (!mmdd) return '—';
  const parts = mmdd.split('-');
  if (parts.length < 2) return mmdd;
  const m = parseInt(parts[0]);
  const d = parseInt(parts[1]);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (m < 1 || m > 12) return mmdd;
  return months[m-1] + ' ' + d;
}

function getPlantingWindow(lot) {
  const settings = state.settings;
  if (!settings.last_frost_date) return '';
  const year = new Date().getFullYear();
  const [lm, ld] = settings.last_frost_date.split('-').map(Number);
  const [fm, fd] = (settings.first_frost_date || '10-15').split('-').map(Number);
  const lastFrost = new Date(year, lm-1, ld);
  const firstFrost = new Date(year, fm-1, fd);
  const today = new Date();
  let lines = [];

  if (lot.start_indoors_weeks && !lot.direct_sow) {
    const startIndoors = new Date(lastFrost);
    startIndoors.setDate(startIndoors.getDate() - (lot.start_indoors_weeks * 7));
    const isPast = startIndoors < today;
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span>🏠 Start Indoors</span>
      <span style="font-weight:600;color:${isPast ? '#ef4444' : '#22c55e'};">${startIndoors.toLocaleDateString('en-US', {month:'short', day:'numeric'})}${isPast ? ' (past)' : ''}</span>
    </div>`);
  }

  if (lot.direct_sow !== false) {
    const directSow = new Date(lastFrost);
    const isPast = directSow < today;
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span>🌱 Direct Sow After</span>
      <span style="font-weight:600;color:${isPast ? '#f59e0b' : '#22c55e'};">${directSow.toLocaleDateString('en-US', {month:'short', day:'numeric'})}${isPast ? ' (ongoing)' : ''}</span>
    </div>`);
  }

  if (lot.days_to_harvest) {
    const dth = parseInt(lot.days_to_harvest) || parseInt((lot.days_to_harvest || '').split('-')[1]) || 70;
    const lastPlant = new Date(firstFrost);
    lastPlant.setDate(lastPlant.getDate() - dth);
    const isPast = lastPlant < today;
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span>⏰ Last Planting Date</span>
      <span style="font-weight:600;color:${isPast ? '#ef4444' : '#22c55e'};">${lastPlant.toLocaleDateString('en-US', {month:'short', day:'numeric'})}${isPast ? ' (past)' : ''}</span>
    </div>`);

    if (lot.days_to_harvest) {
      lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span>🎯 Expected Harvest</span>
        <span style="font-weight:600;">${lot.days_to_harvest} days after planting</span>
      </div>`);
    }
  }

  if (lot.soil_temp_min_f) {
    lines.push(`<div style="display:flex;justify-content:space-between;">
      <span>🌡️ Min Soil Temp</span>
      <span style="font-weight:600;">${lot.soil_temp_min_f}°F</span>
    </div>`);
  }

  return lines.length > 0 ? lines.join('') : '<p style="color:var(--text-muted);font-size:0.85rem;">Add growing info to see planting dates.</p>';
}

async function loadWeather() {
  const zip = state.settings.zip_code;
  const apiKey = state.settings.openweather_api_key;
  if (!zip || !apiKey) return;
  const weatherEl = document.getElementById('weather-data');
  if (!weatherEl) return;
  try {
    const weather = await fetch(`https://api.openweathermap.org/data/2.5/weather?zip=${zip},US&appid=${apiKey}&units=imperial`).then(r => r.json());
    if (weather.cod !== 200) { weatherEl.textContent = 'Weather unavailable — check API key in Settings'; return; }
    const forecast = await fetch(`https://api.openweathermap.org/data/2.5/forecast?zip=${zip},US&appid=${apiKey}&units=imperial&cnt=40`).then(r => r.json());
    const c = weather;
    const desc = '🌡️ ' + (weather.weather[0]?.description || '');
    const name = weather.name;
    const admin1 = 'WV';
    const frostInfo = (() => {
      if (!state.settings.last_frost_date) return '';
      const today = new Date();
      const year = today.getFullYear();
      const [lm, ld] = state.settings.last_frost_date.split('-').map(Number);
      const lastFrost = new Date(year, lm-1, ld);
      const days = Math.ceil((lastFrost - today) / (1000 * 60 * 60 * 24));
      if (days < 0) return ' · 🌱 ' + Math.abs(days) + 'd past frost';
      if (days === 0) return ' · 🌡️ Frost today';
      return ' · 🌡️ Frost in ' + days + 'd';
    })();
    weatherEl.innerHTML = '<strong style="font-size:1.1rem;">' + Math.round(c.main.temp) + '°F</strong> <span>' + (c.weather[0]?.description || '') + '</span> <span style="color:var(--text-muted);font-size:0.85rem;">💨 ' + Math.round(c.wind.speed) + ' mph' + (c.rain ? ' · 🌧️' : '') + frostInfo + '</span>';

    // 5 day forecast from OpenWeatherMap
    const forecastEl = document.getElementById('weather-forecast');
    if (forecastEl && forecast.list) {
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const days = {};
      forecast.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const key = date.toDateString();
        if (!days[key]) days[key] = { date, temps: [], icons: [], rain: false };
        days[key].temps.push(item.main.temp_max, item.main.temp_min);
        days[key].icons.push(item.weather[0]?.icon || '');
        if (item.rain) days[key].rain = true;
      });
      const dayKeys = Object.keys(days).slice(0, 5);
      let forecastHTML = '<div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-top:10px;margin-bottom:4px;">5-Day Forecast</div><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;">';
      dayKeys.forEach(key => {
        const d = days[key];
        const hi = Math.round(Math.max(...d.temps));
        const lo = Math.round(Math.min(...d.temps));
        const dayName = dayNames[d.date.getDay()];
        const icon = d.icons[0] ? `<img src="https://openweathermap.org/img/wn/${d.icons[0]}.png" style="width:30px;height:30px;">` : '🌡️';
        forecastHTML += '<div style="text-align:center;padding:4px;background:var(--green-bg);border-radius:6px;">' +
          '<div style="font-size:0.75rem;font-weight:700;">' + dayName + '</div>' +
          icon +
          '<div style="font-size:0.75rem;font-weight:600;">' + hi + '°</div>' +
          '<div style="font-size:0.7rem;color:var(--text-muted);">' + lo + '°</div>' +
          (d.rain ? '<div style="font-size:0.65rem;">🌧️</div>' : '') +
          '</div>';
      });
      forecastHTML += '</div>';
      forecastEl.innerHTML = forecastHTML;
    }
    if (state.settings.location_name !== (name + ', ' + admin1)) {
      await api('/api/settings', 'PUT', { key: 'location_name', value: name + ', ' + admin1 });
    }

    // Auto log today's weather
    const today = new Date().toISOString().split('T')[0];
    await api('/api/weather', 'POST', {
      log_date: today,
      high_temp_f: c.main.temp_max,
      low_temp_f: c.main.temp_min,
      precip_inches: c.rain ? (c.rain['1h'] || 0) / 25.4 : 0,
      condition: c.weather[0]?.description || '',
      wind_speed_mph: Math.round(c.wind.speed),
      source: 'auto'
    });
  } catch (err) { if (weatherEl) weatherEl.textContent = 'Weather unavailable'; }
}

function printSeasonSummary() {
  const currentYear = new Date().getFullYear();
  const thisYearPlants = state.plants.filter(p => p.season_year === currentYear);
  const thisYearHarvest = state.harvest.filter(h => h.harvest_date && h.harvest_date.startsWith(currentYear.toString()));
  const thisYearAmendments = state.amendments.filter(a => a.amendment_date && a.amendment_date.startsWith(currentYear.toString()));
  const thisYearGerm = state.germination.filter(g => g.date_started && g.date_started.startsWith(currentYear.toString()));
  const selectedPlants = thisYearPlants.filter(p => p.selected_for_seed);

  const avgGermRate = thisYearGerm.filter(g => g.seeds_germinated !== null).length > 0
    ? Math.round(thisYearGerm.filter(g => g.seeds_germinated !== null)
        .reduce((sum, g) => sum + (g.seeds_germinated / g.seeds_planted * 100), 0)
        / thisYearGerm.filter(g => g.seeds_germinated !== null).length)
    : null;

  const plantsByVariety = {};
  thisYearPlants.forEach(p => {
    const v = p.variety_name || 'Unknown';
    plantsByVariety[v] = (plantsByVariety[v] || 0) + 1;
  });

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SeedVault Season Summary ${currentYear}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; padding: 30px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 24pt; color: #2d5a27; margin-bottom: 4px; }
        h2 { font-size: 14pt; color: #2d5a27; margin: 20px 0 10px; border-bottom: 2px solid #2d5a27; padding-bottom: 4px; }
        h3 { font-size: 11pt; margin-bottom: 6px; }
        .subtitle { font-size: 11pt; color: #666; margin-bottom: 24px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat-box { border: 1px solid #ddd; border-radius: 6px; padding: 12px; text-align: center; }
        .stat-number { font-size: 22pt; font-weight: bold; color: #2d5a27; }
        .stat-label { font-size: 8pt; color: #666; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9pt; }
        th { background: #2d5a27; color: white; padding: 6px 8px; text-align: left; }
        td { padding: 5px 8px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8pt; font-weight: bold; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-star { color: #f59e0b; }
        .footer { margin-top: 30px; font-size: 8pt; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
        @media print { body { padding: 15px; } }
      </style>
    </head>
    <body>
      <h1>🌱 SeedVault</h1>
      <div class="subtitle">Season Summary — ${currentYear} · Generated ${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</div>

      <div class="stats-grid">
        <div class="stat-box"><div class="stat-number">${thisYearPlants.length}</div><div class="stat-label">Plants This Season</div></div>
        <div class="stat-box"><div class="stat-number">${selectedPlants.length}</div><div class="stat-label">Selected for Seed Saving</div></div>
        <div class="stat-box"><div class="stat-number">${thisYearHarvest.length}</div><div class="stat-label">Harvest Records</div></div>
        <div class="stat-box"><div class="stat-number">${avgGermRate !== null ? avgGermRate + '%' : '—'}</div><div class="stat-label">Avg Germination Rate</div></div>
      </div>

      <h2>🪴 Plants This Season</h2>
      ${thisYearPlants.length === 0 ? '<p style="color:#666;font-size:9pt;">No plants logged this season.</p>' : `
      <table>
        <thead><tr><th>Designation</th><th>Variety</th><th>Location</th><th>Season</th><th>Seed Save</th></tr></thead>
        <tbody>
          ${thisYearPlants.map(p => `<tr>
            <td><code>${p.designation}</code></td>
            <td>${p.variety_name || '—'}</td>
            <td>${p.location_name || '—'}</td>
            <td>${p.season_type}</td>
            <td>${p.selected_for_seed ? '<span class="badge-star">⭐ Selected</span>' : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`}

      <h2>🫙 Seed Lots in Vault</h2>
      <table>
        <thead><tr><th>Designation</th><th>Variety</th><th>Gen</th><th>Year</th><th>Quantity</th><th>Storage</th><th>Germ Rate</th></tr></thead>
        <tbody>
          ${state.seedLots.map(l => {
            const qty = l.quantity_unit === 'seeds' || !l.quantity_unit
              ? (l.quantity_estimate ? l.quantity_estimate + ' seeds' : '—')
              : (l.quantity_weight ? l.quantity_weight + l.quantity_unit : '—');
            return `<tr>
              <td><code>${l.designation}</code></td>
              <td>${l.variety_name || l.variety_code}</td>
              <td><span class="badge badge-green">G${l.generation}</span></td>
              <td>${l.year_saved}</td>
              <td>${qty}</td>
              <td>${l.storage_location || '—'}</td>
              <td>${l.germination_rate ? l.germination_rate + '%' : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      ${thisYearGerm.length > 0 ? `
      <h2>🌿 Germination Tests</h2>
      <table>
        <thead><tr><th>Seed Lot</th><th>Started</th><th>Planted</th><th>Germinated</th><th>Rate</th><th>Days</th></tr></thead>
        <tbody>
          ${thisYearGerm.map(g => {
            const rate = g.seeds_germinated !== null ? Math.round(g.seeds_germinated / g.seeds_planted * 100) : null;
            return `<tr>
              <td><code>${g.seed_lot_designation}</code></td>
              <td>${new Date(g.date_started).toLocaleDateString()}</td>
              <td>${g.seeds_planted}</td>
              <td>${g.seeds_germinated !== null ? g.seeds_germinated : '—'}</td>
              <td>${rate !== null ? rate + '%' : '—'}</td>
              <td>${g.days_to_germination !== null ? g.days_to_germination + 'd' : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>` : ''}

      ${thisYearAmendments.length > 0 ? `
      <h2>🌿 Amendments & Fertilizer</h2>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Product</th><th>Plant/Location</th><th>Amount</th><th>Method</th></tr></thead>
        <tbody>
          ${thisYearAmendments.map(a => `<tr>
            <td>${new Date(a.amendment_date).toLocaleDateString()}</td>
            <td>${a.type}</td>
            <td>${a.product_name || '—'}</td>
            <td>${a.plant_designation || a.location_name || '—'}</td>
            <td>${a.amount || '—'}</td>
            <td>${a.method || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : ''}

      ${thisYearHarvest.length > 0 ? `
      <h2>📋 Harvest Log</h2>
      <table>
        <thead><tr><th>Date</th><th>Plant</th><th>Variety</th><th>Length</th><th>Weight</th><th>Seeds</th><th>Method</th></tr></thead>
        <tbody>
          ${thisYearHarvest.map(h => `<tr>
            <td>${new Date(h.harvest_date).toLocaleDateString()}</td>
            <td><code>${h.plant_designation}</code></td>
            <td>${h.variety_name || '—'}</td>
            <td>${h.fruit_length_inches ? h.fruit_length_inches + '"' : '—'}</td>
            <td>${h.fruit_weight_oz ? h.fruit_weight_oz + ' oz' : '—'}</td>
            <td>${h.seed_count || '—'}</td>
            <td>${h.processing_method || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : ''}

      <div class="footer">Generated by SeedVault · github.com/Duhato/seedvault · ${new Date().toISOString()}</div>
      <script>setTimeout(() => window.print(), 400);</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function renderDashboard() {
  const s = state.stats;
  const recentLots = [...state.seedLots].slice(0, 5);
  const selectedPlants = state.plants.filter(p => p.selected_for_seed);
  const pendingCrosses = state.crosses.filter(c => c.success === null);
  const currentYear = new Date().getFullYear();

  // Chart data
  const speciesCounts = {};
  state.seedLots.forEach(l => {
    const sp = l.species_code || 'Other';
    speciesCounts[sp] = (speciesCounts[sp] || 0) + 1;
  });

  const plantsByVariety = {};
  state.plants.filter(p => p.season_year === currentYear).forEach(p => {
    const v = p.variety_name || p.variety_code || 'Unknown';
    plantsByVariety[v] = (plantsByVariety[v] || 0) + 1;
  });

  const recentAmendments = state.amendments.slice(0, 5);
  const totalHarvest = state.harvest.length;
  const totalGermTests = state.germination.length;
  const avgGermRate = state.germination.filter(g => g.seeds_germinated !== null).length > 0
    ? Math.round(state.germination.filter(g => g.seeds_germinated !== null)
        .reduce((sum, g) => sum + (g.seeds_germinated / g.seeds_planted * 100), 0)
        / state.germination.filter(g => g.seeds_germinated !== null).length)
    : null;

  return `
    <div class="page-header">
      <h1 class="page-title">🌱 SeedVault Dashboard</h1>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span style="color:var(--text-muted);font-size:0.9rem;">${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</span>
        <button class="btn btn-secondary btn-sm" onclick="printSeasonSummary()">🖨️ Season Summary</button>
      </div>
    </div>
    ${(() => {
      const lastBackup = state.settings.last_backup_date;
      if (!lastBackup) {
        return '<div onclick="navigate(&quot;settings&quot;)" style="background:#b45309;color:white;border-radius:8px;padding:12px 16px;margin-bottom:16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">'
          + '<span>💾 <strong>No backup found</strong> — export a ZIP backup to protect your data</span>'
          + '<span style="font-size:0.85rem;opacity:0.85;">Back up now →</span>'
          + '</div>';
      }
      const days = Math.floor((new Date() - new Date(lastBackup)) / (1000 * 60 * 60 * 24));
      if (days >= 14) {
        return '<div onclick="navigate(&quot;settings&quot;)" style="background:#b91c1c;color:white;border-radius:8px;padding:12px 16px;margin-bottom:16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">'
          + '<span>💾 <strong>Backup overdue</strong> — last backup was ' + days + ' days ago</span>'
          + '<span style="font-size:0.85rem;opacity:0.85;">Back up now →</span>'
          + '</div>';
      }
      if (days >= 7) {
        return '<div onclick="navigate(&quot;settings&quot;)" style="background:#92400e;color:white;border-radius:8px;padding:12px 16px;margin-bottom:16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">'
          + '<span>💾 <strong>Backup reminder</strong> — last backup was ' + days + ' days ago</span>'
          + '<span style="font-size:0.85rem;opacity:0.85;">Back up now →</span>'
          + '</div>';
      }
      return '';
    })()}
    ${(() => {
      if (!state.settings.last_frost_date) return '';
      const today = new Date();
      const year = today.getFullYear();
      const [lm, ld] = state.settings.last_frost_date.split('-').map(Number);
      const lastFrost = new Date(year, lm-1, ld);
      const daysUntil = Math.ceil((lastFrost - today) / (1000 * 60 * 60 * 24));
      if (daysUntil >= -7 && daysUntil <= 14) {
        const msg = daysUntil < 0 ? `Last frost was ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago` : daysUntil === 0 ? 'Frost expected today' : `Frost risk in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
        const sub = daysUntil < 0
          ? `Your average last frost date is ${formatFrostDate(state.settings.last_frost_date)}. Late frosts are still possible — watch the forecast before planting tender seedlings.`
          : `Your average last frost date is ${formatFrostDate(state.settings.last_frost_date)}. Protect tender plants from frost damage.`;
        return `<div class="card" style="border-left:4px solid #f59e0b;padding:12px 16px;margin-bottom:0;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.5rem;">🌡️</span>
            <div>
              <div style="font-weight:700;color:#f59e0b;">⚠️ ${msg}</div>
              <div style="font-size:0.85rem;color:var(--text-muted);">${sub}</div>
            </div>
          </div>
        </div>`;
      }
      const [fm, fd] = (state.settings.first_frost_date || '10-15').split('-').map(Number);
      const firstFrost = new Date(year, fm-1, fd);
      const daysUntilFirst = Math.ceil((firstFrost - today) / (1000 * 60 * 60 * 24));
      if (daysUntilFirst >= 0 && daysUntilFirst <= 30) {
        return `<div class="card" style="border-left:4px solid #ef4444;padding:12px 16px;margin-bottom:0;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.5rem;">❄️</span>
            <div>
              <div style="font-weight:700;color:#ef4444;">First Fall Frost in ${daysUntilFirst} days</div>
              <div style="font-size:0.85rem;color:var(--text-muted);">Average first frost date is ${formatFrostDate(state.settings.first_frost_date)}. Plan your final harvests.</div>
            </div>
          </div>
        </div>`;
      }
      return '';
    })()}
    ${state.settings.zip_code && state.settings.openweather_api_key ? `
    <div id="weather-widget" class="card" style="padding:12px 16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:0.85rem;font-weight:700;color:var(--text-muted);margin-bottom:4px;">🌤️ ${state.settings.location_name || 'Local Weather'}</div>
          <div id="weather-data" style="font-size:0.9rem;color:var(--text-muted);">Loading weather...</div>
        <div id="weather-forecast"></div>
        </div>
        ${state.settings.last_frost_date ? `
        <div style="text-align:right;">
          <div style="font-size:0.8rem;color:var(--text-muted);">Last Frost</div>
          <div style="font-weight:600;color:var(--green-mid);">${formatFrostDate(state.settings.last_frost_date)}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">First Frost</div>
          <div style="font-weight:600;color:#f59e0b;">${formatFrostDate(state.settings.first_frost_date)}</div>
        </div>` : ''}
      </div>
    </div>` : ''}
    <div class="card" style="padding:12px 16px;">
      <div style="font-size:0.85rem;font-weight:700;color:var(--text-muted);margin-bottom:10px;">⚡ Quick Actions</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="showAddHarvest()">📋 Log Harvest</button>
        <button class="btn btn-primary btn-sm" onclick="showAddAmendment()">🌿 Log Amendment</button>
        <button class="btn btn-primary btn-sm" onclick="showAddObservation()">🔍 Log Observation</button>
        <button class="btn btn-primary btn-sm" onclick="showAddGermination()">🌱 Start Germ Test</button>
        <button class="btn btn-secondary btn-sm" onclick="showAddPlants()">🪴 Add Plants</button>
        <button class="btn btn-secondary btn-sm" onclick="showAddSeedLot()">🫙 Add Seed Lot</button>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card clickable" onclick="navigate('varieties')"><div class="stat-number">${s.varieties || 0}</div><div class="stat-label">Varieties</div></div>
      <div class="stat-card clickable" onclick="navigate('seedlots')"><div class="stat-number">${s.seedLots || 0}</div><div class="stat-label">Seed Lots</div></div>
      <div class="stat-card clickable" onclick="navigate('plants')"><div class="stat-number">${s.activePlants || 0}</div><div class="stat-label">Plants This Season</div></div>
      <div class="stat-card clickable" onclick="navigate('projects')"><div class="stat-number">${s.activeProjects || 0}</div><div class="stat-label">Active Projects</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px;">
      <div class="stat-card" style="cursor:default;">
        <div class="stat-number" style="color:${avgGermRate >= 80 ? '#22c55e' : avgGermRate >= 50 ? '#f59e0b' : '#ef4444'}">${avgGermRate !== null ? avgGermRate + '%' : '—'}</div>
        <div class="stat-label">Avg Germination Rate</div>
      </div>
      <div class="stat-card clickable" onclick="navigate('harvest')">
        <div class="stat-number">${totalHarvest}</div>
        <div class="stat-label">Harvest Records</div>
      </div>
      <div class="stat-card clickable" onclick="navigate('amendments')">
        <div class="stat-number">${state.amendments.length}</div>
        <div class="stat-label">Amendments Logged</div>
      </div>
    </div>
    ${Object.keys(speciesCounts).length > 0 ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
      <div class="card">
        <div class="card-title">🫙 Seed Lots by Species</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${Object.entries(speciesCounts).sort((a,b) => b[1]-a[1]).map(([sp, count]) => {
            const pct = Math.round(count / state.seedLots.length * 100);
            const colors = {CUC:'#22c55e', TOM:'#ef4444', PEP:'#f59e0b', CAR:'#f97316', Other:'#6b7280'};
            const color = colors[sp] || '#6b7280';
            return `<div>
              <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:3px;">
                <span>${sp}</span><span style="color:var(--text-muted);">${count} lot${count !== 1 ? 's' : ''}</span>
              </div>
              <div style="background:var(--border);border-radius:4px;height:8px;">
                <div style="background:${color};width:${pct}%;height:8px;border-radius:4px;transition:width 0.3s;"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">🪴 Plants This Season by Variety</div>
        ${Object.keys(plantsByVariety).length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">No plants this season yet.</p>' : `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${Object.entries(plantsByVariety).sort((a,b) => b[1]-a[1]).map(([v, count]) => {
            const total = Object.values(plantsByVariety).reduce((a,b) => a+b, 0);
            const pct = Math.round(count / total * 100);
            return `<div>
              <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:3px;">
                <span>${v}</span><span style="color:var(--text-muted);">${count} plant${count !== 1 ? 's' : ''}</span>
              </div>
              <div style="background:var(--border);border-radius:4px;height:8px;">
                <div style="background:var(--green-mid);width:${pct}%;height:8px;border-radius:4px;transition:width 0.3s;"></div>
              </div>
            </div>`;
          }).join('')}
        </div>`}
      </div>
    </div>` : ''}
    ${recentAmendments.length > 0 ? `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-title">🌿 Recent Amendments</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${recentAmendments.map(a => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--green-bg);border-radius:6px;font-size:0.85rem;">
            <div>
              <span class="tag tag-active">${a.type}</span>
              ${a.product_name ? `<strong style="margin-left:6px;">${a.product_name}</strong>` : ''}
              ${a.plant_designation ? `<span style="margin-left:6px;color:var(--text-muted);">${a.plant_designation}</span>` : ''}
              ${a.location_name ? `<span style="margin-left:6px;color:var(--text-muted);">📍 ${a.location_name}</span>` : ''}
            </div>
            <span style="color:var(--text-muted);">${new Date(a.amendment_date).toLocaleDateString()}</span>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
    ${state.viability.length > 0 ? `
    <div class="card" style="border-left:4px solid #ef4444;">
      <div class="card-title">⚠️ Seed Viability Warnings</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${state.viability.map(lot => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:${lot.status === 'expired' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'};border-radius:6px;">
            <div><span class="designation" style="cursor:pointer;" onclick="showSeedLotDetail('${lot.designation}')">${lot.designation}</span>
            <span style="margin-left:8px;font-size:0.85rem;color:var(--text-muted);">${lot.variety_name}</span></div>
            <span style="font-size:0.85rem;font-weight:700;color:${lot.status === 'expired' ? '#ef4444' : '#f59e0b'};">
              ${lot.status === 'expired' ? '🔴 Expired' : '🟡 Expires in ' + lot.yearsLeft + ' year' + (lot.yearsLeft === 1 ? '' : 's')}
            </span>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div class="card">
        <div class="card-title">🫙 Recent Seed Lots</div>
        ${recentLots.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">No seed lots yet.</p>' : `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${recentLots.map(lot => `
            <div class="clickable-row" onclick="showSeedLotDetail('${lot.designation}')" style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--green-bg);border-radius:6px;cursor:pointer;">
              <span class="designation">${lot.designation}</span>
              <span class="gen-badge">G${lot.generation}</span>
            </div>
          `).join('')}
        </div>`}
      </div>
      <div class="card">
        <div class="card-title">⭐ Selected for Seed Saving</div>
        ${selectedPlants.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">No plants flagged yet.</p>' : `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${selectedPlants.map(p => `
            <div class="clickable-row" onclick="navigate('plants')" style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--green-bg);border-radius:6px;cursor:pointer;">
              <span class="designation">${p.designation}</span>
              <span class="seed-star">⭐</span>
            </div>
          `).join('')}
        </div>`}
      </div>
    </div>
    ${pendingCrosses.length > 0 ? `
    <div class="card" style="border-left:4px solid var(--green-mid);">
      <div class="card-title">🌸 Pending Cross Pollinations</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${pendingCrosses.map(c => `
          <div class="clickable-row" onclick="navigate('crosses')" style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--green-bg);border-radius:6px;cursor:pointer;">
            <div>
              <span class="designation" style="font-size:0.75rem;">${c.mother_designation}</span>
              <span style="margin:0 6px;color:var(--text-muted);">×</span>
              <span class="designation" style="font-size:0.75rem;">${c.father_designation || '?'}</span>
            </div>
            <span style="font-size:0.8rem;color:var(--text-muted);">${c.date_pollinated ? new Date(c.date_pollinated).toLocaleDateString() : 'Not yet pollinated'}</span>
          </div>
        `).join('')}
      </div>
    </div>` : ''}
    <div class="card">
      <div class="card-title">🧬 Active Breeding Projects</div>
      ${state.projects.filter(p => p.status === 'active').length === 0
        ? '<p style="color:var(--text-muted);font-size:0.9rem;">No active breeding projects.</p>'
        : state.projects.filter(p => p.status === 'active').map(p => `
          <div class="clickable-row" onclick="navigate('projects')" style="padding:12px;background:var(--green-bg);border-radius:6px;margin-bottom:8px;cursor:pointer;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong>${p.name}</strong><span class="designation">${p.code}</span>
            </div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${p.description || ''}</div>
          </div>
        `).join('')}
    </div>
    ${state.settings.last_frost_date && state.seedLots.length > 0 ? `
    <div class="card">
      <div class="card-title">📅 Planting Calendar — ${new Date().getFullYear()}</div>
      <div style="overflow-x:auto;">
        <div style="display:grid;grid-template-columns:140px repeat(12,1fr);gap:2px;min-width:700px;font-size:0.75rem;">
          <div style="font-weight:700;padding:4px;">Variety</div>
          ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => `<div style="text-align:center;font-weight:700;padding:4px;">${m}</div>`).join('')}
          ${state.seedLots.map(lot => {
            if (!lot.days_to_harvest && !lot.start_indoors_weeks && lot.direct_sow === undefined) return '';
            const year = new Date().getFullYear();
            const [lm, ld] = state.settings.last_frost_date.split('-').map(Number);
            const [fm, fd] = (state.settings.first_frost_date || '10-15').split('-').map(Number);
            const lastFrost = new Date(year, lm-1, ld);
            const firstFrost = new Date(year, fm-1, fd);

            const cells = Array(12).fill('');

            if (lot.start_indoors_weeks) {
              const startIndoors = new Date(lastFrost);
              startIndoors.setDate(startIndoors.getDate() - lot.start_indoors_weeks * 7);
              const endIndoors = new Date(lastFrost);
              for (let m = startIndoors.getMonth(); m <= endIndoors.getMonth(); m++) {
                if (m >= 0 && m < 12) cells[m] = 'indoor';
              }
            }

            if (lot.direct_sow !== false) {
              const directStart = new Date(lastFrost);
              const dth = parseInt(lot.days_to_harvest) || parseInt((lot.days_to_harvest || '').split('-')[0]) || 70;
              const lastPlant = new Date(firstFrost);
              lastPlant.setDate(lastPlant.getDate() - dth);
              for (let m = directStart.getMonth(); m <= Math.min(lastPlant.getMonth(), 11); m++) {
                if (m >= 0 && m < 12) cells[m] = cells[m] === 'indoor' ? 'both' : 'outdoor';
              }
            }

            const hasData = cells.some(c => c !== '');
            if (!hasData) return '';

            return '<div style="padding:4px;font-size:0.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + (lot.variety_name || lot.variety_code) + '">' + (lot.variety_name || lot.variety_code) + '</div>' +
              cells.map(c => {
                const bg = c === 'indoor' ? '#a855f7' : c === 'outdoor' ? '#22c55e' : c === 'both' ? '#f59e0b' : 'transparent';
                const title = c === 'indoor' ? 'Start indoors' : c === 'outdoor' ? 'Direct sow' : c === 'both' ? 'Transition' : '';
                return '<div style="height:20px;background:' + bg + ';border-radius:3px;opacity:0.8;" title="' + title + '"></div>';
              }).join('');
          }).filter(Boolean).join('')}
        </div>
        <div style="display:flex;gap:12px;margin-top:8px;font-size:0.75rem;flex-wrap:wrap;">
          <span><span style="display:inline-block;width:12px;height:12px;background:#a855f7;border-radius:2px;"></span> Start Indoors</span>
          <span><span style="display:inline-block;width:12px;height:12px;background:#22c55e;border-radius:2px;"></span> Direct Sow</span>
          <span><span style="display:inline-block;width:12px;height:12px;background:#f59e0b;border-radius:2px;"></span> Transition</span>
        </div>
      </div>
    </div>` : ''}
    ${state.locations.length > 0 ? `
    <div class="card">
      <div class="card-title">📍 Garden Locations</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;">
        ${state.locations.filter(l => l.active).map(loc => {
          const plantCount = state.plants.filter(p => p.location_id === loc.id && p.season_year === new Date().getFullYear()).length;
          return `<div class="clickable-row" onclick="navigate('locations')" style="padding:12px;background:var(--green-bg);border-radius:6px;cursor:pointer;">
            <div style="font-weight:700;font-size:0.9rem;">${loc.name}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);">${loc.type}</div>
            <div style="font-size:0.8rem;margin-top:4px;"><span class="gen-badge">${plantCount}</span> plant${plantCount !== 1 ? 's' : ''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}
  `;
}

// FULL PHOTO VIEWER
function showFullPhoto(path, title) {
  openModal(title, `
    <img src="${path}" style="width:100%;border-radius:8px;border:2px solid var(--border);">
    <div class="form-actions" style="margin-top:12px;">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
    </div>
  `);
}

// LINEAGE TREE
function showLineageTree(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  if (!lot) return;

  // Build lineage chain - find all related lots by variety
  const varietyLots = state.seedLots
    .filter(l => l.variety_code === lot.variety_code)
    .sort((a, b) => a.generation - b.generation);

  // Build ancestor chain
  function buildChain(desig, visited = new Set()) {
    if (!desig || visited.has(desig)) return null;
    visited.add(desig);
    const l = state.seedLots.find(x => x.designation === desig);
    if (!l) return { designation: desig, unknown: true };
    const plants = state.plants.filter(p => p.seed_lot_designation === desig);
    const children = state.seedLots.filter(x =>
      x.mother_designation && plants.some(p => p.designation === x.mother_designation) ||
      x.variety_code === l.variety_code && x.generation === l.generation + 1
    );
    return {
      designation: desig,
      lot: l,
      plants: plants.length,
      children: children.map(c => buildChain(c.designation, visited)).filter(Boolean)
    };
  }

  // Find root — G0 or earliest generation of this variety
  const root = varietyLots[0];
  const chain = buildChain(root.designation);

  function renderNode(node, depth = 0, isTarget = false) {
    if (!node) return '';
    const isCurrentLot = node.designation === designation;
    const bgColor = isCurrentLot ? 'var(--green-mid)' : 'var(--green-bg)';
    const textColor = isCurrentLot ? '#fff' : 'var(--text)';
    const borderColor = isCurrentLot ? 'var(--green-mid)' : 'var(--border)';
    const l = node.lot;
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:0;">
        ${depth > 0 ? '<div style="width:2px;height:20px;background:var(--border);"></div>' : ''}
        <div style="background:${bgColor};border:2px solid ${borderColor};border-radius:8px;padding:10px 14px;min-width:180px;text-align:center;cursor:pointer;" onclick="closeModal();showSeedLotDetail('${node.designation}')">
          <div style="font-family:monospace;font-size:0.75rem;color:${isCurrentLot ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'};">${node.designation}</div>
          ${l ? `<div style="font-weight:700;font-size:0.9rem;color:${textColor};margin-top:2px;">${l.variety_name || l.variety_code}</div>` : ''}
          ${l ? `<div style="font-size:0.75rem;color:${isCurrentLot ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)'};">G${l.generation} · ${l.year_saved}</div>` : ''}
          ${node.plants > 0 ? `<div style="font-size:0.75rem;color:${isCurrentLot ? 'rgba(255,255,255,0.7)' : 'var(--green-mid)'};">${node.plants} plant${node.plants !== 1 ? 's' : ''} grown</div>` : ''}
        </div>
        ${node.children && node.children.length > 0 ? `
          <div style="display:flex;gap:16px;align-items:flex-start;">
            ${node.children.map(child => renderNode(child, depth + 1)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  openModal('🌿 Lineage — ' + (lot.variety_name || lot.variety_code), `
    <div style="overflow-x:auto;padding:8px;">
      <div style="display:flex;justify-content:center;min-width:300px;">
        ${chain ? renderNode(chain) : '<p style="color:var(--text-muted);">No lineage data found.</p>'}
      </div>
    </div>
    <div style="margin-top:16px;font-size:0.85rem;color:var(--text-muted);text-align:center;">
      Highlighted node is the current seed lot. Click any node to view details.
    </div>
    <div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>
  `);
}

// SEED LOT DETAIL VIEW
function showSeedLotDetail(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  if (!lot) return;
  const plants = state.plants.filter(p => p.seed_lot_designation === designation);
  const germTests = state.germination.filter(g => g.seed_lot_designation === designation);
  const viabilityYears = { CUC: 5, TOM: 4, PEP: 3, CAR: 3, BEAN: 3, LETT: 3, SPIN: 3, CORN: 2, ONI: 1, PEA: 3, SQUA: 4, MELO: 5, HERB: 3 };
  const maxYears = viabilityYears[lot.species_code] || 3;
  const yearsLeft = maxYears - (new Date().getFullYear() - lot.year_saved);
  const viabilityColor = yearsLeft <= 0 ? '#ef4444' : yearsLeft <= 1 ? '#f59e0b' : '#22c55e';
  const viabilityText = yearsLeft <= 0 ? '🔴 Expired' : yearsLeft <= 1 ? '🟡 Expires in ' + yearsLeft + ' year' + (yearsLeft === 1 ? '' : 's') : '🟢 Good — ' + yearsLeft + ' years left';

  const qtyDisplay = lot.quantity_unit === 'seeds' || !lot.quantity_unit
    ? (lot.quantity_estimate ? lot.quantity_estimate + ' seeds' : '—')
    : (lot.quantity_weight ? (parseFloat(lot.quantity_weight) % 1 === 0 ? parseInt(lot.quantity_weight) : parseFloat(lot.quantity_weight)) + ' ' + lot.quantity_unit : '—');

  openModal('🫙 ' + designation, `
    <div style="display:flex;flex-direction:column;gap:16px;">

      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:1.1rem;font-weight:700;">${lot.variety_name || lot.variety_code}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);">Generation ${lot.generation} · Saved ${lot.year_saved}</div>
        </div>
        <span style="font-weight:700;color:${viabilityColor};">${viabilityText}</span>
      </div>

      ${lot.packet_front_path || lot.packet_back_path ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${lot.packet_front_path ? `<div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px;">Front</div>
          <img src="${lot.packet_front_path}" style="width:100%;border-radius:8px;border:2px solid var(--border);cursor:pointer;" onclick="showFullPhoto('${lot.packet_front_path}', 'Front — ${designation}')">
        </div>` : ''}
        ${lot.packet_back_path ? `<div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px;">Back</div>
          <img src="${lot.packet_back_path}" style="width:100%;border-radius:8px;border:2px solid var(--border);cursor:pointer;" onclick="showFullPhoto('${lot.packet_back_path}', 'Back — ${designation}')">
        </div>` : ''}
      </div>` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:var(--green-bg);padding:12px;border-radius:8px;">
        <div><span style="font-size:0.8rem;color:var(--text-muted);">Quantity</span><div style="font-weight:600;">${qtyDisplay}</div></div>
        <div><span style="font-size:0.8rem;color:var(--text-muted);">Storage</span><div style="font-weight:600;">${lot.storage_location || '—'}</div></div>
        <div><span style="font-size:0.8rem;color:var(--text-muted);">Germination Rate</span><div style="font-weight:600;">${lot.germination_rate ? lot.germination_rate + '%' : '—'}</div></div>
        <div><span style="font-size:0.8rem;color:var(--text-muted);">Last Tested</span><div style="font-weight:600;">${lot.last_tested ? new Date(lot.last_tested).toLocaleDateString() : '—'}</div></div>
        ${lot.lot_number ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Lot Number</span><div style="font-weight:600;">${lot.lot_number}</div></div>` : ''}
        ${lot.packed_for_year ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Packed For</span><div style="font-weight:600;">${lot.packed_for_year}</div></div>` : ''}
        ${lot.sell_by_date ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Sell By</span><div style="font-weight:600;">${lot.sell_by_date}</div></div>` : ''}
        ${lot.upc_code ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">UPC</span><div style="font-weight:600;">${lot.upc_code}</div></div>` : ''}
      </div>

      ${lot.days_to_germination || lot.days_to_harvest || lot.planting_depth_inches || lot.spacing_inches || lot.sun_requirements ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌱 Growing Information</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:var(--green-bg);padding:12px;border-radius:8px;">
          ${lot.days_to_germination ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Days to Germinate</span><div style="font-weight:600;">${lot.days_to_germination} days</div></div>` : ''}
          ${lot.days_to_harvest ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Days to Harvest</span><div style="font-weight:600;">${lot.days_to_harvest} days</div></div>` : ''}
          ${lot.planting_depth_inches ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Planting Depth</span><div style="font-weight:600;">${lot.planting_depth_inches}</div></div>` : ''}
          ${lot.spacing_inches ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Spacing</span><div style="font-weight:600;">${lot.spacing_inches}</div></div>` : ''}
          ${lot.row_spacing_inches ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Row Spacing</span><div style="font-weight:600;">${lot.row_spacing_inches}</div></div>` : ''}
          ${lot.sun_requirements ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Sun</span><div style="font-weight:600;">${lot.sun_requirements}</div></div>` : ''}
          ${lot.watering_needs ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Watering</span><div style="font-weight:600;">${lot.watering_needs}</div></div>` : ''}
          ${lot.soil_temp_min_f ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Min Soil Temp</span><div style="font-weight:600;">${lot.soil_temp_min_f}°F</div></div>` : ''}
          ${lot.start_indoors_weeks ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Start Indoors</span><div style="font-weight:600;">${lot.start_indoors_weeks} weeks before last frost</div></div>` : ''}
          ${lot.frost_tolerance ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Frost Tolerance</span><div style="font-weight:600;">${lot.frost_tolerance}</div></div>` : ''}
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Direct Sow</span><div style="font-weight:600;">${lot.direct_sow ? 'Yes' : 'No — start indoors'}</div></div>
          ${lot.container_variety ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Container Variety</span><div style="font-weight:600;">✅ Yes</div></div>` : ''}
          ${lot.container_size ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Container Size</span><div style="font-weight:600;">${lot.container_size}</div></div>` : ''}
          ${lot.origin ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Origin</span><div style="font-weight:600;">${lot.origin}</div></div>` : ''}
        </div>
      </div>` : ''}

      ${lot.notes ? `<div><div style="font-weight:700;margin-bottom:4px;font-size:0.9rem;">Notes</div><div style="font-size:0.9rem;color:var(--text-muted);">${lot.notes}</div></div>` : ''}

      ${state.settings.last_frost_date && (lot.days_to_harvest || lot.start_indoors_weeks || lot.direct_sow !== undefined) ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">📅 Planting Window — ${new Date().getFullYear()}</div>
        <div style="background:var(--green-bg);padding:12px;border-radius:8px;">
          ${getPlantingWindow(lot)}
        </div>
      </div>` : ''}

      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🪴 Plants from this lot (${plants.length})</div>
        ${plants.length === 0 ? '<p style="font-size:0.85rem;color:var(--text-muted);">No plants logged yet.</p>'
        : `<div style="display:flex;flex-wrap:wrap;gap:6px;">${plants.map(p => `<span class="designation" style="font-size:0.75rem;">${p.designation}${p.selected_for_seed ? ' ⭐' : ''}</span>`).join('')}</div>`}
      </div>

      ${germTests.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌿 Germination Tests</div>
        ${germTests.map(g => {
          const rate = g.seeds_germinated !== null && g.seeds_planted ? Math.round((g.seeds_germinated / g.seeds_planted) * 100) : null;
          return `<div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            ${new Date(g.date_started).toLocaleDateString()} — ${g.seeds_planted} planted
            ${rate !== null ? `→ <strong>${rate}%</strong> germination` : '(pending)'}
            ${g.days_to_germination ? `in ${g.days_to_germination} days` : ''}
          </div>`;
        }).join('')}
      </div>` : ''}

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="closeModal(); showEditSeedLot('${designation}');">✏️ Edit</button>
        <button class="btn btn-brown btn-sm" onclick="closeModal(); showPacketPhotos('${designation}');">📷 Photos</button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal(); showAddPlants('${designation}');">+ Add Plants</button>
        <button class="btn btn-secondary btn-sm" onclick="showLineageTree('${designation}');">🌿 Lineage</button>
      </div>
    </div>
  `);
}

function renderVarieties() {
  const searchTerm = (document.getElementById('variety-search')?.value || '').toLowerCase();
  const filterSpecies = document.getElementById('variety-filter-species')?.value || '';
  let filteredVarieties = state.varieties.filter(v => {
    const matchSearch = !searchTerm ||
      v.name.toLowerCase().includes(searchTerm) ||
      v.code.toLowerCase().includes(searchTerm) ||
      (v.source || '').toLowerCase().includes(searchTerm);
    const matchSpecies = !filterSpecies || v.species_code === filterSpecies;
    return matchSearch && matchSpecies;
  });
  return `
    <div class="page-header"><h1 class="page-title">🌿 Varieties</h1><button class="btn btn-primary" onclick="showAddVariety()">+ Add Variety</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="variety-search" placeholder="🔍 Search varieties..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="variety-filter-species" style="max-width:150px;" onchange="render()">
          <option value="">All Species</option>
          ${state.species.map(s => `<option value="${s.code}" ${filterSpecies === s.code ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
        ${searchTerm || filterSpecies ? `<button class="btn btn-secondary btn-sm" onclick="clearVarietyFilters()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredVarieties.length} of ${state.varieties.length} varieties</span>
      </div>
    </div>
    <div class="card">
      ${filteredVarieties.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🌿</div><p>${state.varieties.length === 0 ? 'No varieties yet.' : 'No varieties match your search.'}</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Code</th><th>Name</th><th>Species</th><th>Type</th><th>Source</th><th>Year</th><th>Lots</th><th>Actions</th></tr></thead>
        <tbody>${filteredVarieties.map(v => {
          const lots = state.seedLots.filter(l => l.variety_code === v.code).length;
          return `<tr style="cursor:pointer;" onclick="showVarietyDetail('${v.code}')">
            <td><span class="designation">${v.code}</span></td>
            <td><strong>${v.name}</strong></td>
            <td>${v.species_name || v.species_code}</td>
            <td><span class="tag tag-${v.type.toLowerCase()}">${v.type}</span></td>
            <td>${v.source || '—'}</td><td>${v.year_acquired || '—'}</td>
            <td><span class="gen-badge">${lots}</span></td>
            <td onclick="event.stopPropagation()" style="display:flex;gap:4px;">
              <button class="btn btn-secondary btn-sm" data-tip="Edit this variety" onclick="showEditVariety('${v.code}')">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" data-tip="Delete this variety" onclick="deleteVariety('${v.code}')">🗑️</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
  `;
}

function clearPlantFilters() {
  const s = document.getElementById('plant-search');
  const fs = document.getElementById('plant-filter-seedsave');
  const fl = document.getElementById('plant-filter-location');
  if (s) s.value = '';
  if (fs) fs.value = '';
  if (fl) fl.value = '';
  render();
}

function clearSeedLotFilters() {
  const s = document.getElementById('seedlot-search');
  const fs = document.getElementById('seedlot-filter-species');
  const fg = document.getElementById('seedlot-filter-gen');
  if (s) s.value = '';
  if (fs) fs.value = '';
  if (fg) fg.value = '';
  render();
}

function clearVarietyFilters() {
  const s = document.getElementById('variety-search');
  const fs = document.getElementById('variety-filter-species');
  if (s) s.value = '';
  if (fs) fs.value = '';
  render();
}

function showVarietyDetail(code) {
  const v = state.varieties.find(x => x.code === code);
  const lots = state.seedLots.filter(l => l.variety_code === code);
  openModal('🌿 ' + v.name, `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div style="background:var(--green-bg);padding:12px;border-radius:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Code</span><div><span class="designation">${v.code}</span></div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Species</span><div style="font-weight:600;">${v.species_name || v.species_code}</div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Type</span><div><span class="tag tag-${v.type.toLowerCase()}">${v.type}</span></div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Source</span><div style="font-weight:600;">${v.source || '—'}</div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Year Acquired</span><div style="font-weight:600;">${v.year_acquired || '—'}</div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Seed Lots</span><div><span class="gen-badge">${lots.length}</span></div></div>
        </div>
        ${v.description ? `<div style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);">${v.description}</div>` : ''}
      </div>
      ${lots.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">Seed Lots</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${lots.map(l => `
            <div class="clickable-row" onclick="closeModal(); showSeedLotDetail('${l.designation}')" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--green-bg);border-radius:6px;cursor:pointer;">
              <span class="designation">${l.designation}</span>
              <div style="display:flex;gap:8px;align-items:center;">
                ${l.germination_rate ? `<span style="font-size:0.8rem;">${l.germination_rate}% germ</span>` : ''}
                <span class="gen-badge">G${l.generation}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary btn-sm" onclick="closeModal(); showEditVariety('${code}');">✏️ Edit</button>
      </div>
    </div>
  `);
}

function showAddVariety() { openModal('Add New Variety', varietyForm(null)); }
function showEditVariety(code) { openModal('Edit Variety — ' + code, varietyForm(state.varieties.find(x => x.code === code))); }

function varietyForm(v) {
  return `
    <div class="form-group"><label class="form-label">Species *</label>
      <select class="form-control" id="f-species" ${v ? 'disabled' : ''}>
        ${state.species.map(s => `<option value="${s.code}" ${v && v.species_code === s.code ? 'selected' : ''}>${s.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Variety Name *</label><input class="form-control" id="f-vname" placeholder="e.g. Straight 8" value="${v ? v.name : ''}"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Type</label>
        <select class="form-control" id="f-type">
          <option value="OP" ${v && v.type === 'OP' ? 'selected' : ''}>Open Pollinated (OP)</option>
          <option value="Heirloom" ${v && v.type === 'Heirloom' ? 'selected' : ''}>Heirloom (open pollinated 50+ years)</option>
          <option value="Hybrid" ${v && v.type === 'Hybrid' ? 'selected' : ''}>Hybrid (F1)</option>
          <option value="AOP" ${v && v.type === 'AOP' ? 'selected' : ''}>Hybrid OP (stabilizing)</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Year Acquired</label><input class="form-control" id="f-year" type="number" value="${v ? v.year_acquired || '' : ''}"></div>
    </div>
    <div class="form-group"><label class="form-label">Source</label><input class="form-control" id="f-source" value="${v ? v.source || '' : ''}" placeholder="e.g. Burpee"></div>
    <div class="form-group"><label class="form-label">Description / Notes</label><textarea class="form-control" id="f-desc" rows="3">${v ? v.description || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${v ? `submitEditVariety('${v.code}')` : 'submitVariety()'}">${v ? 'Save Changes' : 'Save Variety'}</button>
    </div>
  `;
}

async function submitVariety() {
  const name = document.getElementById('f-vname').value.trim();
  const species_code = document.getElementById('f-species').value;
  if (!name || !species_code) return alert('Name and species are required');
  await api('/api/varieties', 'POST', { name, species_code, type: document.getElementById('f-type').value, year_acquired: document.getElementById('f-year').value || null, source: document.getElementById('f-source').value, description: document.getElementById('f-desc').value });
  closeModal(); await loadAll(); render();
}

async function submitEditVariety(code) {
  const name = document.getElementById('f-vname').value.trim();
  if (!name) return alert('Name is required');
  await api('/api/varieties/' + code, 'PUT', { name, type: document.getElementById('f-type').value, year_acquired: document.getElementById('f-year').value || null, source: document.getElementById('f-source').value, description: document.getElementById('f-desc').value });
  closeModal(); await loadAll(); render();
}

async function deleteVariety(code) {
  if (!confirm('Delete variety ' + code + '? This cannot be undone.')) return;
  await api('/api/varieties/' + code, 'DELETE'); await loadAll(); render();
}

function renderSeedLots() {
  const currentYear = new Date().getFullYear();
  const viabilityYears = { CUC: 5, TOM: 4, PEP: 3, CAR: 3, BEAN: 3, LETT: 3, SPIN: 3, CORN: 2, ONI: 1, PEA: 3, SQUA: 4, MELO: 5, HERB: 3 };
  const searchTerm = (document.getElementById('seedlot-search')?.value || '').toLowerCase();
  const filterSpecies = document.getElementById('seedlot-filter-species')?.value || '';
  const filterGen = document.getElementById('seedlot-filter-gen')?.value || '';
  let filteredLots = state.seedLots.filter(lot => {
    const matchSearch = !searchTerm ||
      lot.designation.toLowerCase().includes(searchTerm) ||
      (lot.variety_name || '').toLowerCase().includes(searchTerm) ||
      (lot.storage_location || '').toLowerCase().includes(searchTerm) ||
      (lot.lot_number || '').toLowerCase().includes(searchTerm);
    const matchSpecies = !filterSpecies || lot.species_code === filterSpecies;
    const matchGen = !filterGen || String(lot.generation) === filterGen;
    return matchSearch && matchSpecies && matchGen;
  });
  return `
    <div class="page-header"><h1 class="page-title">🫙 Seed Lots</h1><button class="btn btn-primary" onclick="showAddSeedLot()">+ Add Seed Lot</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="seedlot-search" placeholder="🔍 Search lots..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="seedlot-filter-species" style="max-width:150px;" onchange="render()">
          <option value="">All Species</option>
          ${state.species.map(s => `<option value="${s.code}" ${filterSpecies === s.code ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
        <select class="form-control" id="seedlot-filter-gen" style="max-width:130px;" onchange="render()">
          <option value="">All Generations</option>
          <option value="0" ${filterGen === '0' ? 'selected' : ''}>G0 — Commercial</option>
          <option value="1" ${filterGen === '1' ? 'selected' : ''}>G1 — First Saved</option>
          <option value="2" ${filterGen === '2' ? 'selected' : ''}>G2</option>
          <option value="3" ${filterGen === '3' ? 'selected' : ''}>G3+</option>
        </select>
        ${searchTerm || filterSpecies || filterGen ? `<button class="btn btn-secondary btn-sm" onclick="clearSeedLotFilters()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredLots.length} of ${state.seedLots.length} lots</span>
      </div>
    </div>
    <div class="card">
      ${filteredLots.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🫙</div><p>${state.seedLots.length === 0 ? 'No seed lots yet.' : 'No lots match your search.'}</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Designation</th><th>Variety</th><th>Gen</th><th>Year</th><th>Quantity</th><th>Storage</th><th>Germination</th><th>Notes</th><th>Viability</th><th>Actions</th></tr></thead>
        <tbody>${filteredLots.map(lot => {
          const maxYears = viabilityYears[lot.species_code] || 3;
          const yearsLeft = maxYears - (currentYear - lot.year_saved);
          let viabilityBadge = '<span style="color:#22c55e;font-weight:600;">🟢 Good</span>';
          if (yearsLeft <= 0) viabilityBadge = '<span style="color:#ef4444;font-weight:600;">🔴 Expired</span>';
          else if (yearsLeft <= 1) viabilityBadge = '<span style="color:#f59e0b;font-weight:600;">🟡 Expiring</span>';
          const qtyRaw = lot.quantity_unit === 'seeds' || !lot.quantity_unit
            ? (lot.quantity_estimate ? lot.quantity_estimate + ' seeds' : '—')
            : (lot.quantity_weight ? (parseFloat(lot.quantity_weight) % 1 === 0 ? parseInt(lot.quantity_weight) : parseFloat(lot.quantity_weight)) + ' ' + lot.quantity_unit : '—');
          const qtyDisplay = qtyRaw;
          return `<tr style="cursor:pointer;" onclick="showSeedLotDetail('${lot.designation}')">
            <td><span class="designation">${lot.designation}</span></td>
            <td>${lot.variety_name || lot.variety_code}</td>
            <td><span class="gen-badge">G${lot.generation}</span></td>
            <td>${lot.year_saved}</td>
            <td>${qtyDisplay}</td>
            <td>${lot.storage_location || '—'}</td>
            <td>${lot.germination_rate ? lot.germination_rate + '%' : '—'}</td>
            <td style="max-width:150px;font-size:0.8rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${lot.notes ? lot.notes.substring(0, 40) + (lot.notes.length > 40 ? '...' : '') : '—'}</td>
            <td>${viabilityBadge}</td>
            <td onclick="event.stopPropagation()" style="display:flex;gap:4px;flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" onclick="showEditSeedLot('${lot.designation}')">✏️</button>
              <button class="btn btn-brown btn-sm" onclick="showPacketPhotos('${lot.designation}')">📷</button>
              <button class="btn btn-secondary btn-sm" onclick="showSeedLotQR('${lot.designation}')">⬛ QR</button>
              <button class="btn btn-secondary btn-sm" onclick="showCompanionPlants('${lot.species_code || lot.variety_code.split('-')[0]}', '${lot.variety_name || lot.variety_code}')">🌿 Companions</button>
              <button class="btn btn-secondary btn-sm" onclick="printSeedLabel('${lot.designation}')">🏷️ Label</button>
              <button class="btn btn-danger btn-sm" onclick="deleteSeedLot('${lot.designation}')">🗑️</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
  `;
}

function printSeedLabel(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  if (!lot) return;
  openModal('🏷️ Print Label — ' + designation, `
    <div class="form-group">
      <label class="form-label">Label Size</label>
      <select class="form-control" id="f-labelsize">
        <option value="30346">Dymo 30346 — 1" x 2-1/8" (Small seed label)</option>
        <option value="1933081" selected>Dymo 1933081 — 1" x 3-1/2" (Standard seed label)</option>
        <option value="30252">Dymo 30252 — 1-1/8" x 3-1/2" (Address label)</option>
        <option value="30321">Dymo 30321 — 2-1/8" x 4" (Large label)</option>
        <option value="custom">Custom size</option>
      </select>
    </div>
    <div id="custom-size-fields" class="hidden">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Width (inches)</label><input class="form-control" id="f-labelw" type="number" step="0.125" value="3.5"></div>
        <div class="form-group"><label class="form-label">Height (inches)</label><input class="form-control" id="f-labelh" type="number" step="0.125" value="1"></div>
      </div>
    </div>
    <div class="form-group" style="margin-top:12px;">
      <label class="form-label">Include on label</label>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px;">
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-qr" checked> QR Code</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-variety" checked> Variety Name</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-designation" checked> Designation Code</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-storage" checked> Storage Location</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-growing" checked> Growing Info (days to germ/harvest)</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-dates" checked> Packed/Sell By Dates</label>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;"><input type="checkbox" id="lbl-qty" checked> Quantity</label>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="generateSeedLabel('${designation}')">🖨️ Print</button>
    </div>
  `);
  setTimeout(() => {
    document.getElementById('f-labelsize').addEventListener('change', e => {
      document.getElementById('custom-size-fields').classList.toggle('hidden', e.target.value !== 'custom');
    });
  }, 50);
}

const LABEL_SIZES = {
  '30346':   { width: 2.125, height: 1 },
  '1933081': { width: 3.5,   height: 1 },
  '30252':   { width: 3.5,   height: 1.125 },
  '30321':   { width: 4,     height: 2.125 },
};

function generateSeedLabel(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  if (!lot) return;
  const sizeKey = document.getElementById('f-labelsize').value;
  let w, h;
  if (sizeKey === 'custom') {
    w = parseFloat(document.getElementById('f-labelw').value) || 3.5;
    h = parseFloat(document.getElementById('f-labelh').value) || 1;
  } else {
    w = LABEL_SIZES[sizeKey].width;
    h = LABEL_SIZES[sizeKey].height;
  }
  const showQR = document.getElementById('lbl-qr').checked;
  const showVariety = document.getElementById('lbl-variety').checked;
  const showDesignation = document.getElementById('lbl-designation').checked;
  const showStorage = document.getElementById('lbl-storage').checked;
  const showGrowing = document.getElementById('lbl-growing').checked;
  const showDates = document.getElementById('lbl-dates').checked;
  const showQty = document.getElementById('lbl-qty').checked;

  const qrSize = Math.round(h * 82);
  const isSmall = w <= 2.2;
  const baseFontSize = isSmall ? 5.5 : 7;
  const varietyFontSize = isSmall ? 8 : 11;

  const qtyDisplay = lot.quantity_unit === 'seeds' || !lot.quantity_unit
    ? (lot.quantity_estimate ? lot.quantity_estimate + ' seeds' : '')
    : (lot.quantity_weight ? lot.quantity_weight + lot.quantity_unit : '');

  closeModal();
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Label — ${designation}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        @page { size: ${w}in ${h}in; margin:0; }
        body { width:${w}in; height:${h}in; font-family:Arial,sans-serif; overflow:hidden; }
        .label { width:${w}in; height:${h}in; display:flex; flex-direction:row; align-items:center; padding:3px 5px; gap:4px; }
        .qr-section { flex-shrink:0; width:${qrSize}px; height:${qrSize}px; display:flex; align-items:center; justify-content:center; }
        .info-section { flex:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center; gap:1px; }
        .brand { font-size:5pt; color:#888; text-transform:uppercase; letter-spacing:0.5px; }
        .variety { font-size:${varietyFontSize}pt; font-weight:bold; line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .designation { font-family:monospace; font-size:${baseFontSize}pt; color:#333; }
        .details { font-size:${baseFontSize}pt; color:#555; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .growing { font-size:${baseFontSize - 0.5}pt; color:#444; }
      </style>
    </head>
    <body>
      <div class="label">
        ${showQR ? `<div class="qr-section" id="qr"></div>` : ''}
        <div class="info-section">
          <div class="brand">🌱 SeedVault</div>
          ${showVariety ? `<div class="variety">${lot.variety_name || lot.variety_code}</div>` : ''}
          ${showDesignation ? `<div class="designation">${designation}</div>` : ''}
          ${showStorage && lot.storage_location ? `<div class="details">📦 ${lot.storage_location}${showQty && qtyDisplay ? ' · ' + qtyDisplay : ''}</div>` : (showQty && qtyDisplay ? `<div class="details">${qtyDisplay}</div>` : '')}
          ${showGrowing && (lot.days_to_germination || lot.days_to_harvest) ? `<div class="growing">${lot.days_to_germination ? 'Germ: ' + lot.days_to_germination + 'd' : ''}${lot.days_to_germination && lot.days_to_harvest ? ' · ' : ''}${lot.days_to_harvest ? 'Harvest: ' + lot.days_to_harvest + 'd' : ''}</div>` : ''}
          ${showDates && (lot.packed_for_year || lot.sell_by_date) ? `<div class="details">${lot.packed_for_year ? 'Packed: ' + lot.packed_for_year : ''}${lot.packed_for_year && lot.sell_by_date ? ' · ' : ''}${lot.sell_by_date ? 'Sell by: ' + lot.sell_by_date : ''}</div>` : ''}
        </div>
      </div>
      ${showQR ? `<script>
        new QRCode(document.getElementById('qr'), {
          text: '${designation}',
          width: ${qrSize},
          height: ${qrSize},
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
        setTimeout(() => window.print(), 600);
      </script>` : `<script>setTimeout(() => window.print(), 300);</script>`}
    </body>
    </html>
  `);
  printWindow.document.close();
}

function _oldPrintSeedLabel_unused(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  if (!lot) return;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Label — ${designation}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page {
          size: 3.5in 1in;
          margin: 0;
        }
        body {
          width: 3.5in;
          height: 1in;
          font-family: Arial, sans-serif;
          overflow: hidden;
        }
        .label {
          width: 3.5in;
          height: 1in;
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 4px 6px;
          gap: 6px;
        }
        .qr-section {
          flex-shrink: 0;
          width: 0.85in;
          height: 0.85in;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-section img {
          width: 0.85in;
          height: 0.85in;
        }
        .info-section {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1px;
        }
        .brand {
          font-size: 6pt;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .variety {
          font-size: 11pt;
          font-weight: bold;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .designation {
          font-family: monospace;
          font-size: 7pt;
          color: #333;
        }
        .details {
          font-size: 7pt;
          color: #555;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .growing {
          font-size: 6.5pt;
          color: #444;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>
    </head>
    <body>
      <div class="label">
        <div class="qr-section" id="qr"></div>
        <div class="info-section">
          <div class="brand">🌱 SeedVault</div>
          <div class="variety">${lot.variety_name || lot.variety_code}</div>
          <div class="designation">${designation}</div>
          <div class="details">G${lot.generation} · ${lot.year_saved}${lot.storage_location ? ' · ' + lot.storage_location : ''}${lot.quantity_estimate ? ' · ' + lot.quantity_estimate + ' seeds' : lot.quantity_weight ? ' · ' + lot.quantity_weight + lot.quantity_unit : ''}</div>
          ${lot.days_to_germination || lot.days_to_harvest ? `<div class="growing">${lot.days_to_germination ? 'Germ: ' + lot.days_to_germination + 'd' : ''}${lot.days_to_germination && lot.days_to_harvest ? ' · ' : ''}${lot.days_to_harvest ? 'Harvest: ' + lot.days_to_harvest + 'd' : ''}</div>` : ''}
          ${lot.sell_by_date || lot.packed_for_year ? `<div class="details">${lot.packed_for_year ? 'Packed: ' + lot.packed_for_year : ''}${lot.packed_for_year && lot.sell_by_date ? ' · ' : ''}${lot.sell_by_date ? 'Sell by: ' + lot.sell_by_date : ''}</div>` : ''}
        </div>
      </div>
      <script>
        new QRCode(document.getElementById('qr'), {
          text: '${designation}',
          width: 82,
          height: 82,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
        setTimeout(() => window.print(), 600);
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

const COMPANION_DATA = {
  CUC: {
    good: [
      { name: 'Beans', icon: '🫘', reason: 'Fix nitrogen, improve soil fertility' },
      { name: 'Corn', icon: '🌽', reason: 'Provides shade, reduces moisture loss' },
      { name: 'Dill', icon: '🌿', reason: 'Repels aphids and spider mites' },
      { name: 'Nasturtiums', icon: '🌸', reason: 'Trap crop for aphids, repels squash bugs' },
      { name: 'Radishes', icon: '🌱', reason: 'Deter cucumber beetles' },
      { name: 'Sunflowers', icon: '🌻', reason: 'Attract pollinators, provide light shade' },
    ],
    bad: [
      { name: 'Sage', icon: '🌿', reason: 'Inhibits cucumber growth' },
      { name: 'Potatoes', icon: '🥔', reason: 'Compete for nutrients, share blight' },
      { name: 'Melons', icon: '🍈', reason: 'Compete for space and nutrients' },
    ],
    tips: 'Cucumbers love warmth and consistent moisture. Plant after last frost when soil reaches 60°F. Trellis vertically to save space and improve air circulation.'
  },
  TOM: {
    good: [
      { name: 'Basil', icon: '🌿', reason: 'Repels aphids, improves flavor' },
      { name: 'Carrots', icon: '🥕', reason: 'Loosen soil around roots' },
      { name: 'Marigolds', icon: '🌼', reason: 'Repel nematodes and whiteflies' },
      { name: 'Parsley', icon: '🌱', reason: 'Attracts beneficial insects' },
      { name: 'Borage', icon: '🌸', reason: 'Repels tomato hornworm' },
      { name: 'Garlic', icon: '🧄', reason: 'Deters spider mites and aphids' },
    ],
    bad: [
      { name: 'Fennel', icon: '🌿', reason: 'Inhibits tomato growth' },
      { name: 'Brassicas', icon: '🥦', reason: 'Compete for nutrients' },
      { name: 'Corn', icon: '🌽', reason: 'Both attract tomato fruitworm/corn earworm' },
    ],
    tips: 'Tomatoes are heavy feeders. Rotate beds every year to prevent disease buildup. Remove suckers for indeterminate varieties to focus energy on fruit.'
  },
  PEP: {
    good: [
      { name: 'Basil', icon: '🌿', reason: 'Repels aphids, may improve flavor' },
      { name: 'Carrots', icon: '🥕', reason: 'Loosen soil, compatible root depth' },
      { name: 'Tomatoes', icon: '🍅', reason: 'Similar needs, good neighbors' },
      { name: 'Marigolds', icon: '🌼', reason: 'Deter aphids and nematodes' },
      { name: 'Spinach', icon: '🥬', reason: 'Ground cover, retains moisture' },
    ],
    bad: [
      { name: 'Fennel', icon: '🌿', reason: 'Allelopathic, inhibits growth' },
      { name: 'Apricots', icon: '🍑', reason: 'Share verticillium wilt' },
    ],
    tips: 'Peppers love heat and full sun. They are slow to start — begin indoors 8-10 weeks before last frost. Keep soil consistently moist for best fruit set.'
  },
  CAR: {
    good: [
      { name: 'Tomatoes', icon: '🍅', reason: 'Tomatoes shade soil, carrots loosen it' },
      { name: 'Lettuce', icon: '🥬', reason: 'Shallow roots, no competition' },
      { name: 'Onions', icon: '🧅', reason: 'Deter carrot fly' },
      { name: 'Sage', icon: '🌿', reason: 'Repels carrot fly' },
      { name: 'Rosemary', icon: '🌿', reason: 'Deters carrot fly' },
      { name: 'Chives', icon: '🌱', reason: 'Improve flavor, deter aphids' },
    ],
    bad: [
      { name: 'Dill', icon: '🌿', reason: 'Cross-pollinates, inhibits growth' },
      { name: 'Parsnips', icon: '🌱', reason: 'Compete for same nutrients and space' },
      { name: 'Fennel', icon: '🌿', reason: 'Allelopathic to most vegetables' },
    ],
    tips: 'Carrots need deep, loose, rock-free soil. Thin seedlings early — crowded carrots fork badly. Sow in early spring or fall for best flavor.'
  },
  BEAN: {
    good: [
      { name: 'Corn', icon: '🌽', reason: 'Classic Three Sisters — beans fix nitrogen for corn' },
      { name: 'Squash', icon: '🎃', reason: 'Three Sisters — squash shades ground' },
      { name: 'Cucumbers', icon: '🥒', reason: 'Beans fix nitrogen cucumbers need' },
      { name: 'Carrots', icon: '🥕', reason: 'Different root depths, no competition' },
      { name: 'Marigolds', icon: '🌼', reason: 'Deter Mexican bean beetles' },
    ],
    bad: [
      { name: 'Onions', icon: '🧅', reason: 'Inhibit bean growth' },
      { name: 'Garlic', icon: '🧄', reason: 'Inhibit bean growth' },
      { name: 'Fennel', icon: '🌿', reason: 'Allelopathic to beans' },
    ],
    tips: 'Beans fix atmospheric nitrogen — great before heavy feeders. Do not over-fertilize with nitrogen or you get leaves, not pods. Direct sow after last frost.'
  },
  LETT: {
    good: [
      { name: 'Carrots', icon: '🥕', reason: 'Different depths, great neighbors' },
      { name: 'Radishes', icon: '🌱', reason: 'Break soil, mark slow lettuce rows' },
      { name: 'Strawberries', icon: '🍓', reason: 'Ground cover, mutual benefit' },
      { name: 'Chives', icon: '🌱', reason: 'Deter aphids' },
      { name: 'Tall flowers', icon: '🌸', reason: 'Provide shade in summer heat' },
    ],
    bad: [
      { name: 'Celery', icon: '🌿', reason: 'Compete aggressively' },
      { name: 'Fennel', icon: '🌿', reason: 'Allelopathic' },
    ],
    tips: 'Lettuce bolts in heat — plant in spring/fall or in the shade of taller crops in summer. Cut-and-come-again harvesting extends the season significantly.'
  },
  SQUA: {
    good: [
      { name: 'Corn', icon: '🌽', reason: 'Three Sisters — squash shades ground, reduces weeds' },
      { name: 'Beans', icon: '🫘', reason: 'Beans fix nitrogen squash needs' },
      { name: 'Nasturtiums', icon: '🌸', reason: 'Trap crop for aphids, repel squash bugs' },
      { name: 'Borage', icon: '🌸', reason: 'Deters squash vine borers' },
      { name: 'Marigolds', icon: '🌼', reason: 'Deter squash bugs and beetles' },
    ],
    bad: [
      { name: 'Potatoes', icon: '🥔', reason: 'Compete for nutrients' },
      { name: 'Fennel', icon: '🌿', reason: 'Allelopathic' },
    ],
    tips: 'Squash needs lots of space and pollinators. Hand-pollinate if fruit drops early. Watch for squash vine borers — row cover early in season helps.'
  },
  CORN: {
    good: [
      { name: 'Beans', icon: '🫘', reason: 'Fix nitrogen, classic Three Sisters' },
      { name: 'Squash', icon: '🎃', reason: 'Ground cover, moisture retention' },
      { name: 'Cucumbers', icon: '🥒', reason: 'Cucumbers climb corn stalks' },
      { name: 'Melons', icon: '🍈', reason: 'Similar needs, good neighbors' },
    ],
    bad: [
      { name: 'Tomatoes', icon: '🍅', reason: 'Share corn earworm/tomato fruitworm' },
      { name: 'Celery', icon: '🌿', reason: 'Inhibits corn growth' },
    ],
    tips: 'Corn needs to be planted in blocks, not rows, for good pollination. Plant at least 4x4 block. Heavy feeder — amend with compost before planting.'
  },
  SPIN: {
    good: [
      { name: 'Strawberries', icon: '🍓', reason: 'Mutual benefit, similar season' },
      { name: 'Peas', icon: '🫛', reason: 'Fix nitrogen, cool season companions' },
      { name: 'Brassicas', icon: '🥦', reason: 'Similar cool season timing' },
    ],
    bad: [
      { name: 'Potatoes', icon: '🥔', reason: 'Inhibit spinach growth' },
      { name: 'Fennel', icon: '🌿', reason: 'Allelopathic' },
    ],
    tips: 'Spinach is a cool-season crop — bolt-resistant varieties help in spring. Sow in late summer for fall harvest. Needs consistent moisture and partial shade in warm weather.'
  },
  MELO: {
    good: [
      { name: 'Corn', icon: '🌽', reason: 'Provide light shade, similar water needs' },
      { name: 'Nasturtiums', icon: '🌸', reason: 'Repel aphids and beetles' },
      { name: 'Marigolds', icon: '🌼', reason: 'Deter pests' },
    ],
    bad: [
      { name: 'Cucumbers', icon: '🥒', reason: 'Compete for space and nutrients' },
      { name: 'Potatoes', icon: '🥔', reason: 'Compete, share diseases' },
    ],
    tips: 'Melons need warmth, space, and consistent watering until fruit sets, then reduce water to concentrate sugars. Lift fruit off ground with a sling to prevent rot.'
  },
};

function companionCard(c, borderColor, expandedId) {
  var hasDetail = !!(c.how || c.distance || c.timing);
  var html = '<div style="padding:8px;background:var(--green-bg);border-radius:6px;margin-bottom:4px;border-left:3px solid ' + borderColor + ';cursor:' + (hasDetail ? 'pointer' : 'default') + ';"';
  if (hasDetail) html += ' onclick="toggleCompanionDetail(this)"';
  html += ' data-id="' + expandedId + '">';
  html += '<div style="display:flex;gap:8px;align-items:center;">';
  html += '<span style="font-size:1.1rem;">' + c.icon + '</span>';
  html += '<div style="flex:1;"><div style="font-weight:600;font-size:0.85rem;">' + c.name;
  if (hasDetail) html += ' <span style="font-size:0.7rem;color:var(--text-muted);">&#9660; details</span>';
  html += '</div><div style="font-size:0.75rem;color:var(--text-muted);">' + c.reason + '</div></div></div>';
  if (hasDetail) {
    html += '<div class="comp-detail" style="display:none;margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">';
    if (c.how) html += '<div style="font-size:0.78rem;margin-bottom:4px;"><span style="color:var(--green-mid);font-weight:600;">How to plant:</span> ' + c.how + '</div>';
    if (c.distance) html += '<div style="font-size:0.78rem;margin-bottom:4px;"><span style="color:var(--green-mid);font-weight:600;">Distance:</span> ' + c.distance + '</div>';
    if (c.timing) html += '<div style="font-size:0.78rem;"><span style="color:var(--green-mid);font-weight:600;">Timing:</span> ' + c.timing + '</div>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function toggleCompanionDetail(el) {
  var detail = el.querySelector('.comp-detail');
  if (!detail) return;
  detail.style.display = detail.style.display === 'block' ? 'none' : 'block';
}



function companionModalBody(info, speciesCode, varietyName) {
  var idx = 0;
  var goodHtml = (info.good || []).map(function(c) { return companionCard(c, '#22c55e', 'g' + (idx++)); }).join('');
  var badHtml = (info.bad || []).map(function(c) { return companionCard(c, '#ef4444', 'b' + (idx++)); }).join('');
  return '<div style="margin-bottom:16px;background:var(--green-bg);border-radius:8px;padding:12px;font-size:0.85rem;color:var(--text-muted);">\u{1F4A1} ' + (info.tips || 'No growing tips yet.') + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">'
    + '<div><div style="font-weight:700;color:#22c55e;margin-bottom:8px;font-size:0.9rem;">\u2705 Good Neighbors</div>' + goodHtml + '</div>'
    + '<div><div style="font-weight:700;color:#ef4444;margin-bottom:8px;font-size:0.9rem;">\u274C Keep Away</div>' + badHtml + '</div>'
    + '</div>'
    + '<div class="form-actions">'
    + '<button class="btn btn-secondary" onclick="closeModal()">Close</button>'
    + '<button class="btn btn-secondary" onclick="showEditCompanions(' + JSON.stringify(speciesCode) + ', ' + JSON.stringify(varietyName) + ')">\u270F\uFE0F Edit</button>'
    + '</div>';
}



function companionModalBody(info, speciesCode, varietyName) {
  let idx = 0;
  const goodHtml = (info.good || []).map(function(c) {
    return companionCard(c, '#22c55e', 'g' + (idx++));
  }).join('');
  const badHtml = (info.bad || []).map(function(c) {
    return companionCard(c, '#ef4444', 'b' + (idx++));
  }).join('');
  return '<div style="margin-bottom:16px;background:var(--green-bg);border-radius:8px;padding:12px;font-size:0.85rem;color:var(--text-muted);">💡 ' + (info.tips || 'No growing tips yet.') + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">'
    + '<div><div style="font-weight:700;color:#22c55e;margin-bottom:8px;font-size:0.9rem;">✅ Good Neighbors</div>' + goodHtml + '</div>'
    + '<div><div style="font-weight:700;color:#ef4444;margin-bottom:8px;font-size:0.9rem;">❌ Keep Away</div>' + badHtml + '</div>'
    + '</div>'
    + '<div class="form-actions">'
    + '<button class="btn btn-secondary" onclick="closeModal()">Close</button>'
    + '<button class="btn btn-secondary" onclick="showEditCompanions(\"' + speciesCode + '\", \"' + varietyName + '\")">✏️ Edit</button>'
    + '</div>';
}

function showCompanionPlants(speciesCode, varietyName) {
  const dbData = state.companions && state.companions[speciesCode];
  const builtinData = BUILTIN_COMPANIONS[speciesCode];
  const info = dbData ? { good: dbData.good_companions, bad: dbData.bad_companions, tips: dbData.tips } : builtinData || null;
  if (info) {
    openModal('🌿 Companions — ' + varietyName, companionModalBody(info, speciesCode, varietyName));
  } else {
    openModal('🌿 Companions — ' + varietyName,
      '<div style="text-align:center;padding:24px;">'
      + '<div style="font-size:3rem;margin-bottom:12px;">🌱</div>'
      + '<div style="font-weight:600;margin-bottom:8px;">No companion data for this crop yet</div>'
      + '<div style="color:var(--text-muted);font-size:0.85rem;margin-bottom:20px;">Add companion planting info for <strong>' + varietyName + '</strong> to help yourself and other SeedVault users.</div>'
      + '</div>'
      + '<div class="form-actions">'
      + '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>'
      + '<button class="btn btn-primary" onclick="showEditCompanions(\'' + speciesCode + '\', \'' + varietyName + '\')">+ Add Companion Data</button>'
      + '</div>'
    );
  }
}

function showEditCompanions(speciesCode, varietyName) {
  const dbData = state.companions && state.companions[speciesCode];
  const builtinData = BUILTIN_COMPANIONS[speciesCode];
  const existing = dbData ? { good: dbData.good_companions, bad: dbData.bad_companions, tips: dbData.tips }
    : builtinData || { good: [], bad: [], tips: '' };
  const formatList = function(arr) { return (arr || []).map(function(c) { return c.icon + ' ' + c.name + ' \u2014 ' + c.reason; }).join('\n'); };
  openModal('✏️ Edit Companions — ' + varietyName,
    '<div class="alert alert-info" style="font-size:0.82rem;">Format each line as: <strong>emoji Name \u2014 reason</strong><br>Example: 🌿 Basil \u2014 Repels aphids and improves flavor</div>'
    + '<div class="form-group"><label class="form-label">✅ Good Neighbors (one per line)</label>'
    + '<textarea class="form-control" id="comp-good" rows="6" style="font-family:monospace;font-size:0.82rem;">' + formatList(existing.good) + '</textarea></div>'
    + '<div class="form-group"><label class="form-label">❌ Keep Away (one per line)</label>'
    + '<textarea class="form-control" id="comp-bad" rows="4" style="font-family:monospace;font-size:0.82rem;">' + formatList(existing.bad) + '</textarea></div>'
    + '<div class="form-group"><label class="form-label">💡 Growing Tips</label>'
    + '<textarea class="form-control" id="comp-tips" rows="3">' + (existing.tips || '') + '</textarea></div>'
    + '<div class="form-actions">'
    + '<button class="btn btn-secondary" onclick="showCompanionPlants(\'' + speciesCode + '\', \'' + varietyName + '\')">Cancel</button>'
    + '<button class="btn btn-primary" onclick="saveCompanions(\'' + speciesCode + '\', \'' + varietyName + '\')">💾 Save</button>'
    + '</div>'
  );
}

function parseCompanionLine(line) {
  line = line.trim();
  if (!line) return null;
  const dashIdx = line.indexOf(' \u2014 ');
  if (dashIdx === -1) return null;
  const namePart = line.substring(0, dashIdx).trim();
  const reason = line.substring(dashIdx + 3).trim();
  const spaceIdx = namePart.indexOf(' ');
  const icon = spaceIdx > -1 ? namePart.substring(0, spaceIdx) : '🌱';
  const name = spaceIdx > -1 ? namePart.substring(spaceIdx + 1).trim() : namePart;
  return { icon, name, reason };
}

async function saveCompanions(speciesCode, varietyName) {
  const good = document.getElementById('comp-good').value.split('\n').map(parseCompanionLine).filter(Boolean);
  const bad = document.getElementById('comp-bad').value.split('\n').map(parseCompanionLine).filter(Boolean);
  const tips = document.getElementById('comp-tips').value.trim();
  if (good.length === 0 && bad.length === 0) return alert('Please add at least one companion plant.');
  const result = await api('/api/companions/' + speciesCode, 'POST', { good_companions: good, bad_companions: bad, tips });
  if (result.error) return alert('Save failed: ' + result.error);
  await loadAll();
  showCompanionPlants(speciesCode, varietyName);
}

function showSeedLotQR(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  openModal('QR Code — ' + designation, `
    <div style="text-align:center;padding:16px;">
      <div id="qr-container" style="display:inline-block;padding:16px;background:white;border-radius:8px;margin-bottom:16px;"></div>
      <div style="font-family:monospace;font-size:0.9rem;font-weight:700;margin-bottom:4px;">${designation}</div>
      <div style="font-size:0.85rem;color:var(--text-muted);">${lot.variety_name || ''}</div>
      ${lot.storage_location ? `<div style="font-size:0.8rem;color:var(--text-muted);">📦 ${lot.storage_location}</div>` : ''}
    </div>
    <div class="alert alert-info">Print and attach to your seed envelope or packet. Scan to open this seed lot instantly.</div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="printSeedLotQR('${designation}')">🖨️ Print</button>
    </div>
  `);
  setTimeout(() => {
    const container = document.getElementById('qr-container');
    if (container && typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text: designation,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }, 100);
}

function printSeedLotQR(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR — ${designation}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 20px; }
        .label { border: 2px solid #000; display: inline-block; padding: 16px; border-radius: 8px; min-width: 180px; }
        .designation { font-family: monospace; font-size: 13px; font-weight: bold; margin-top: 8px; }
        .variety { font-size: 11px; color: #555; margin-top: 4px; }
        .storage { font-size: 11px; color: #777; margin-top: 2px; }
      </style>
    </head>
    <body>
      <div class="label">
        <div id="qr"></div>
        <div class="designation">${designation}</div>
        <div class="variety">${lot.variety_name || ''}</div>
        ${lot.storage_location ? `<div class="storage">${lot.storage_location}</div>` : ''}
      </div>
      <script>
        new QRCode(document.getElementById('qr'), {
          text: '${designation}',
          width: 150,
          height: 150,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
        setTimeout(() => window.print(), 500);
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function showPacketPhotos(designation) {
  const lot = state.seedLots.find(l => l.designation === designation);
  openModal('Seed Packet Photos — ' + designation, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div>
        <div style="font-weight:700;margin-bottom:8px;">Front of Packet</div>
        ${lot.packet_front_path ? `
          <img src="${lot.packet_front_path}" style="width:100%;border-radius:8px;margin-bottom:8px;border:2px solid var(--border);">
          <button class="btn btn-danger btn-sm" onclick="deletePacketPhoto('${designation}', 'front')">🗑️ Remove</button>
        ` : '<div style="background:var(--green-bg);border-radius:8px;padding:20px;text-align:center;color:var(--text-muted);margin-bottom:8px;">No photo</div>'}
        <div style="margin-top:8px;">
          <input type="file" id="front-upload" accept="image/*" style="display:none" onchange="uploadPacketPhoto('${designation}', 'front')">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('front-upload').click()">📷 ${lot.packet_front_path ? 'Replace' : 'Upload'} Front</button>
        </div>
      </div>
      <div>
        <div style="font-weight:700;margin-bottom:8px;">Back of Packet</div>
        ${lot.packet_back_path ? `
          <img src="${lot.packet_back_path}" style="width:100%;border-radius:8px;margin-bottom:8px;border:2px solid var(--border);">
          <button class="btn btn-danger btn-sm" onclick="deletePacketPhoto('${designation}', 'back')">🗑️ Remove</button>
        ` : '<div style="background:var(--green-bg);border-radius:8px;padding:20px;text-align:center;color:var(--text-muted);margin-bottom:8px;">No photo</div>'}
        <div style="margin-top:8px;">
          <input type="file" id="back-upload" accept="image/*" style="display:none" onchange="uploadPacketPhoto('${designation}', 'back')">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('back-upload').click()">📷 ${lot.packet_back_path ? 'Replace' : 'Upload'} Back</button>
        </div>
      </div>
    </div>
    <div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>
  `);
}

async function uploadPacketPhoto(designation, side) {
  const input = document.getElementById(side + '-upload');
  const file = input.files[0];
  if (!file) return;
  const result = await uploadPhoto('/api/seed-lots/' + designation + '/packet/' + side, file);
  if (result.error) return alert('Upload failed: ' + result.error);
  await loadAll(); showPacketPhotos(designation);
}

async function deletePacketPhoto(designation, side) {
  if (!confirm('Remove this photo?')) return;
  await api('/api/seed-lots/' + designation + '/packet/' + side, 'DELETE');
  await loadAll(); showPacketPhotos(designation);
}

function showAddSeedLot() { openModal('Add Seed Lot', seedLotForm(null)); }
function showEditSeedLot(designation) { openModal('Edit Seed Lot — ' + designation, seedLotForm(state.seedLots.find(l => l.designation === designation))); }

function seedLotForm(lot) {
  const sunOptions = ['Full Sun', 'Partial Sun', 'Partial Shade', 'Full Shade'];
  const waterOptions = ['Low', 'Medium', 'High'];
  const frostOptions = ['Hardy — survives hard frost', 'Semi-hardy — light frost ok', 'Tender — no frost'];
  return `
    ${!lot ? '<div class="alert alert-info">Designation is auto-generated from variety + generation + year.</div>' : ''}
    ${!lot ? '<div id="seedlot-form-error" class="alert alert-danger hidden"></div>' : ''}
    ${!lot ? `
    <div class="form-group"><label class="form-label">Variety *</label>
      <select class="form-control" id="f-variety">
        <option value="">Select variety...</option>
        ${state.varieties.map(v => `<option value="${v.code}">${v.name} (${v.code})</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Generation * (0=commercial, 1=first saved)</label><input class="form-control" id="f-gen" type="number" min="0" value="0"></div>
      <div class="form-group"><label class="form-label">Year Saved/Bought *</label><input class="form-control" id="f-yearsaved" type="number" value="${new Date().getFullYear()}"></div>
    </div>` : ''}

    ${lot ? `<div class="alert alert-info" style="margin-bottom:8px;">Changing generation or year will update the designation.</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Generation</label><input class="form-control" id="f-editgen" type="number" min="0" value="${lot.generation}"></div>
      <div class="form-group"><label class="form-label">Year</label><input class="form-control" id="f-edityear" type="number" value="${lot.year_saved}"></div>
    </div>` : ''}

    <div style="font-weight:700;margin:12px 0 8px;font-size:0.9rem;">📦 Packet Info</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Lot Number</label><input class="form-control" id="f-lotnum" value="${lot ? lot.lot_number || '' : ''}" placeholder="e.g. A2847"></div>
      <div class="form-group"><label class="form-label">Packed For Year</label><input class="form-control" id="f-packedyear" type="number" value="${lot ? lot.packed_for_year || '' : ''}"></div>
    </div>
    <div class="form-group"><label class="form-label">UPC Code</label><input class="form-control" id="f-upc" value="${lot ? lot.upc_code || '' : ''}" placeholder="Barcode number from packet"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Sell By Date</label><input class="form-control" id="f-sellby" value="${lot ? lot.sell_by_date || '' : ''}" placeholder="e.g. 12/26 or 12/2026"></div>
    </div>

    <div style="font-weight:700;margin:12px 0 8px;font-size:0.9rem;">🌱 Quantity</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Unit</label>
        <select class="form-control" id="f-qtyunit" onchange="toggleQtyFields()">
          <option value="seeds" ${!lot || lot.quantity_unit === 'seeds' ? 'selected' : ''}>Seeds (count)</option>
          <option value="mg" ${lot && lot.quantity_unit === 'mg' ? 'selected' : ''}>Milligrams (mg)</option>
          <option value="g" ${lot && lot.quantity_unit === 'g' ? 'selected' : ''}>Grams (g)</option>
          <option value="oz" ${lot && lot.quantity_unit === 'oz' ? 'selected' : ''}>Ounces (oz)</option>
        </select>
      </div>
      <div class="form-group" id="qty-count-group">
        <label class="form-label">Seed Count</label>
        <input class="form-control" id="f-qty" type="number" value="${lot ? lot.quantity_estimate || '' : ''}">
      </div>
      <div class="form-group hidden" id="qty-weight-group">
        <label class="form-label">Weight</label>
        <input class="form-control" id="f-qtyweight" type="number" step="0.01" value="${lot ? lot.quantity_weight || '' : ''}">
      </div>
    </div>

    <div style="font-weight:700;margin:12px 0 8px;font-size:0.9rem;">📍 Storage</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Storage Location</label><input class="form-control" id="f-storage" value="${lot ? lot.storage_location || '' : ''}" placeholder="e.g. Ammo box"></div>
      <div class="form-group"><label class="form-label">Germination Rate %</label><input class="form-control" id="f-germrate" type="number" min="0" max="100" value="${lot ? lot.germination_rate || '' : ''}"></div>
    </div>
    ${lot ? `<div class="form-group"><label class="form-label">Last Tested Date</label><input class="form-control" id="f-lasttest" type="date" value="${lot && lot.last_tested ? lot.last_tested.split('T')[0] : ''}"></div>` : ''}
    <div class="form-group"><label class="form-label">Mother Plant Designation</label><input class="form-control" id="f-mother" value="${lot ? lot.mother_designation || '' : ''}"></div>
    <div class="form-group"><label class="form-label">Father Plant Designation</label><input class="form-control" id="f-father" value="${lot ? lot.father_designation || '' : ''}"></div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0 8px;">
      <div style="font-weight:700;font-size:0.9rem;">🌱 Growing Information</div>
      ${state.settings.ai_provider ? '<button type="button" class="btn btn-secondary btn-sm" onclick="lookupGrowingInfo(this)" data-designation="' + (lot ? lot.designation : '') + '" data-variety="' + (lot ? (lot.variety_name || lot.variety_code) : '') + '">✨ Lookup Info</button>' : ''}
    </div>
    <div id="ai-growing-preview" style="display:none;background:var(--green-bg);border-radius:8px;padding:12px;margin-bottom:12px;font-size:0.85rem;"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Days to Germination</label><input class="form-control" id="f-dtg" placeholder="e.g. 7-14 or 10" value="${lot ? lot.days_to_germination || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Days to Harvest</label><input class="form-control" id="f-dth" placeholder="e.g. 60-70 or 67" value="${lot ? lot.days_to_harvest || '' : ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Planting Depth</label><input class="form-control" id="f-depth" placeholder="e.g. 1/4 - 1/2 in" value="${lot ? lot.planting_depth_inches || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Plant Spacing</label><input class="form-control" id="f-spacing" placeholder="e.g. 15 in / 3 in" value="${lot ? lot.spacing_inches || '' : ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Row Spacing</label><input class="form-control" id="f-rowspacing" placeholder="e.g. 12 in" value="${lot ? lot.row_spacing_inches || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Min Soil Temp (°F)</label><input class="form-control" id="f-soiltemp" type="number" value="${lot ? lot.soil_temp_min_f || '' : ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Sun Requirements</label>
        <select class="form-control" id="f-sun">
          <option value="">Select...</option>
          ${sunOptions.map(s => `<option value="${s}" ${lot && lot.sun_requirements === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Watering Needs</label>
        <select class="form-control" id="f-water">
          <option value="">Select...</option>
          ${waterOptions.map(w => `<option value="${w}" ${lot && lot.watering_needs === w ? 'selected' : ''}>${w}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Frost Tolerance</label>
        <select class="form-control" id="f-frost">
          <option value="">Select...</option>
          ${frostOptions.map(f => `<option value="${f}" ${lot && lot.frost_tolerance === f ? 'selected' : ''}>${f}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Start Indoors (weeks before last frost)</label>
        <input class="form-control" id="f-indoor" type="number" value="${lot ? lot.start_indoors_weeks || '' : ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Sowing Method</label>
        <select class="form-control" id="f-directsow">
          <option value="true" ${!lot || lot.direct_sow ? 'selected' : ''}>Direct Sow</option>
          <option value="false" ${lot && !lot.direct_sow ? 'selected' : ''}>Start Indoors / Transplant</option>
          <option value="both">Both OK</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Container Variety</label>
        <select class="form-control" id="f-container">
          <option value="false" ${!lot || !lot.container_variety ? 'selected' : ''}>No</option>
          <option value="true" ${lot && lot.container_variety ? 'selected' : ''}>Yes</option>
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group"><label class="form-label">Origin</label><input class="form-control" id="f-origin" value="${lot ? lot.origin || '' : ''}" placeholder="e.g. Italy, Appalachia, Netherlands"></div>
      <div class="form-group"><label class="form-label">Container Size (if container variety)</label><input class="form-control" id="f-contsize" value="${lot ? lot.container_size || '' : ''}" placeholder="e.g. 5 gallon minimum, 12 inch pot"></div>
    </div>
    <div style="font-weight:700;margin:12px 0 8px;font-size:0.9rem;">📝 Notes</div>
    <div class="form-group"><textarea class="form-control" id="f-notes" rows="3">${lot ? lot.notes || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${lot ? `submitEditSeedLot('${lot.designation}')` : 'submitSeedLot()'}">${lot ? 'Save Changes' : 'Save Seed Lot'}</button>
    </div>
  `;
}

function toggleQtyFields() {
  const unit = document.getElementById('f-qtyunit').value;
  const isSeeds = unit === 'seeds';
  document.getElementById('qty-count-group').classList.toggle('hidden', !isSeeds);
  document.getElementById('qty-weight-group').classList.toggle('hidden', isSeeds);
}

function getSeedLotFormData(lot) {
  const unit = document.getElementById('f-qtyunit').value;
  return {
    quantity_estimate: unit === 'seeds' ? (document.getElementById('f-qty').value || null) : null,
    quantity_weight: unit !== 'seeds' ? (document.getElementById('f-qtyweight').value || null) : null,
    quantity_unit: unit,
    storage_location: document.getElementById('f-storage').value,
    germination_rate: document.getElementById('f-germrate').value || null,
    last_tested: lot && document.getElementById('f-lasttest') ? document.getElementById('f-lasttest').value || null : null,
    mother_designation: document.getElementById('f-mother').value,
    father_designation: document.getElementById('f-father').value,
    lot_number: document.getElementById('f-lotnum').value,
    upc_code: document.getElementById('f-upc').value,
    packed_for_year: document.getElementById('f-packedyear').value || null,
    sell_by_date: document.getElementById('f-sellby').value || null,
    days_to_germination: document.getElementById('f-dtg').value || null,
    days_to_harvest: document.getElementById('f-dth').value || null,
    origin: document.getElementById('f-origin') ? document.getElementById('f-origin').value || null : null,
    container_size: document.getElementById('f-contsize') ? document.getElementById('f-contsize').value || null : null,
    planting_depth_inches: document.getElementById('f-depth').value || null,
    spacing_inches: document.getElementById('f-spacing').value || null,
    row_spacing_inches: document.getElementById('f-rowspacing').value || null,
    sun_requirements: document.getElementById('f-sun').value || null,
    watering_needs: document.getElementById('f-water').value || null,
    frost_tolerance: document.getElementById('f-frost').value || null,
    start_indoors_weeks: document.getElementById('f-indoor').value || null,
    direct_sow: document.getElementById('f-directsow').value !== 'false',
    container_variety: document.getElementById('f-container').value === 'true',
    notes: document.getElementById('f-notes').value,
  };
}

async function submitSeedLot() {
  const variety_code = document.getElementById('f-variety').value;
  const generation = document.getElementById('f-gen').value;
  const year_saved = document.getElementById('f-yearsaved').value;
  let hasError = false;

  const varietyEl = document.getElementById('f-variety');
  const genEl = document.getElementById('f-gen');
  const yearEl = document.getElementById('f-yearsaved');

  [varietyEl, genEl, yearEl].forEach(el => el.style.borderColor = '');

  if (!variety_code) { varietyEl.style.borderColor = '#ef4444'; hasError = true; }
  if (generation === '' || generation === null) { genEl.style.borderColor = '#ef4444'; hasError = true; }
  if (!year_saved) { yearEl.style.borderColor = '#ef4444'; hasError = true; }

  if (hasError) {
    const errDiv = document.getElementById('seedlot-form-error');
    if (errDiv) { errDiv.textContent = 'Please fill in the fields highlighted in red.'; errDiv.classList.remove('hidden'); }
    return;
  }

  const result = await api('/api/seed-lots', 'POST', { variety_code, generation: parseInt(generation), year_saved: parseInt(year_saved), ...getSeedLotFormData(null) });

  if (result && result.error) {
    const errDiv = document.getElementById('seedlot-form-error');
    if (errDiv) { errDiv.textContent = '❌ ' + result.error; errDiv.classList.remove('hidden'); }
    return;
  }

  closeModal(); await loadAll(); render();
  if (result && result.designation) {
    setTimeout(() => alert('✅ Seed lot created!\nDesignation: ' + result.designation), 100);
  }
}

async function submitEditSeedLot(designation) {
  const data = getSeedLotFormData(true);
  const genEl = document.getElementById('f-editgen');
  const yearEl = document.getElementById('f-edityear');
  if (genEl) data.generation = parseInt(genEl.value);
  if (yearEl) data.year_saved = parseInt(yearEl.value);
  await api('/api/seed-lots/' + designation, 'PUT', data);
  closeModal(); await loadAll(); render();
}

async function deleteSeedLot(designation) {
  if (!confirm('Delete seed lot ' + designation + '? This cannot be undone.')) return;
  await api('/api/seed-lots/' + designation, 'DELETE'); await loadAll(); render();
}

function showPlantDetail(designation) {
  const p = state.plants.find(x => x.designation === designation);
  if (!p) return;
  const lot = state.seedLots.find(l => l.designation === p.seed_lot_designation);
  const plantHarvest = state.harvest.filter(h => h.plant_designation === designation);
  const plantObs = state.observations.filter(o => o.plant_designation === designation);
  const plantAmendments = state.amendments.filter(a => a.plant_designation === designation);
  const plantCrosses = state.crosses.filter(c => c.mother_designation === designation || c.father_designation === designation);

  openModal('🪴 ' + designation, `
    <div style="display:flex;flex-direction:column;gap:16px;">

      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:1.1rem;font-weight:700;">${p.variety_name || '—'}</div>
          <div style="font-size:0.85rem;color:var(--text-muted);">${p.season_type} ${p.season_year} · ${p.location_name ? '📍 ' + p.location_name : 'No location'}</div>
          ${p.selected_for_seed ? '<span class="seed-star" style="font-size:0.9rem;">⭐ Selected for Seed Saving</span>' : ''}
        </div>
        ${p.photo_path ? `<img src="${p.photo_path}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid var(--border);cursor:pointer;" onclick="showPlantPhoto('${designation}')">` : ''}
      </div>

      <div style="background:var(--green-bg);padding:12px;border-radius:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Seed Lot</span>
            <div style="font-weight:600;cursor:pointer;" onclick="closeModal();showSeedLotDetail('${p.seed_lot_designation}')">${p.seed_lot_designation}</div>
          </div>
          ${lot ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Generation</span><div style="font-weight:600;">G${lot.generation}</div></div>` : ''}
          ${lot && lot.storage_location ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Storage</span><div style="font-weight:600;">${lot.storage_location}</div></div>` : ''}
        </div>
        ${p.notes ? `<div style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);">${p.notes}</div>` : ''}
      </div>

      ${plantHarvest.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">📋 Harvest Records (${plantHarvest.length})</div>
        ${plantHarvest.map(h => `
          <div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;">
              <span>${h.harvest_date ? new Date(h.harvest_date).toLocaleDateString() : '—'}</span>
              <span style="color:var(--text-muted);">${h.condition || ''}</span>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;color:var(--text-muted);">
              ${h.fruit_length_inches ? `<span>📏 ${h.fruit_length_inches}"</span>` : ''}
              ${h.fruit_weight_oz ? `<span>⚖️ ${h.fruit_weight_oz}oz</span>` : ''}
              ${h.seed_count ? `<span>🌱 ${h.seed_count} seeds</span>` : ''}
              ${h.processing_method ? `<span>${h.processing_method}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>` : ''}

      ${plantObs.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🔍 Observations (${plantObs.length})</div>
        ${plantObs.map(o => `
          <div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            <div style="display:flex;justify-content:space-between;">
              <span>${new Date(o.observation_date).toLocaleDateString()}</span>
              ${o.fruit_count !== null ? `<span>🍅 ${o.fruit_count} fruit</span>` : ''}
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;color:var(--text-muted);">
              ${o.color ? `<span>🎨 ${o.color}</span>` : ''}
              ${o.avg_length_inches ? `<span>📏 ${o.avg_length_inches}"</span>` : ''}
              ${o.flavor_notes ? `<span>😋 ${o.flavor_notes}</span>` : ''}
            </div>
            ${o.health_notes ? `<div style="color:#f59e0b;margin-top:4px;">⚕️ ${o.health_notes}</div>` : ''}
          </div>
        `).join('')}
      </div>` : ''}

      ${(() => {
        const locAmendments = p.location_id ? state.amendments.filter(a => a.location_id === p.location_id && !a.plant_designation) : [];
        const allAmendments = [...plantAmendments, ...locAmendments].sort((a,b) => new Date(b.amendment_date) - new Date(a.amendment_date));
        return allAmendments.length > 0 ? `
        <div>
          <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌿 Amendments (${allAmendments.length})</div>
          ${allAmendments.map(a => `
            <div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
              <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;">
                <span><span class="tag tag-active">${a.type}</span>${a.product_name ? ' ' + a.product_name : ''}${a.location_name ? ' <span style="font-size:0.75rem;color:var(--text-muted);">(📍 ' + a.location_name + ')</span>' : ''}</span>
                <span style="color:var(--text-muted);">${new Date(a.amendment_date).toLocaleDateString()}</span>
              </div>
              ${a.amount || a.method ? '<div style="color:var(--text-muted);margin-top:4px;">' + (a.amount || '') + ' ' + (a.method || '') + '</div>' : ''}
            </div>
          `).join('')}
        </div>` : '';
      })()}
      ${plantAmendments.length > 0 ? `
      <div style="display:none;">
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌿 Amendments (${plantAmendments.length})</div>
        ${plantAmendments.map(a => `
          <div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;">
              <span><span class="tag tag-active">${a.type}</span>${a.product_name ? ' ' + a.product_name : ''}</span>
              <span style="color:var(--text-muted);">${new Date(a.amendment_date).toLocaleDateString()}</span>
            </div>
            ${a.amount || a.method ? `<div style="color:var(--text-muted);margin-top:4px;">${a.amount || ''} ${a.method || ''}</div>` : ''}
          </div>
        `).join('')}
      </div>` : ''}

      ${p.started_indoors_date || p.transplant_date ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌱 Growth Timeline</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${p.start_method && p.start_method !== 'direct_sow' && p.started_indoors_date ? `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--green-bg);border-radius:6px;">
            <span style="font-size:1.2rem;">🏠</span>
            <div>
              <div style="font-weight:600;font-size:0.85rem;">Started Indoors</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">${new Date(p.started_indoors_date).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'})}</div>
            </div>
          </div>` : ''}
          ${p.transplant_date ? `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--green-bg);border-radius:6px;">
            <span style="font-size:1.2rem;">🪴</span>
            <div>
              <div style="font-weight:600;font-size:0.85rem;">Transplanted${p.transplant_location_name ? ' to ' + p.transplant_location_name : ''}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">${new Date(p.transplant_date).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'})}</div>
              ${p.transplant_notes ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">${p.transplant_notes}</div>` : ''}
            </div>
          </div>` : ''}
          ${p.started_indoors_date && p.transplant_date ? `
          <div style="font-size:0.8rem;color:var(--text-muted);padding-left:12px;">
            ⏱️ ${Math.round((new Date(p.transplant_date) - new Date(p.started_indoors_date)) / (1000*60*60*24))} days from start to transplant
          </div>` : ''}
        </div>
      </div>` : ''}

      ${plantCrosses.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌸 Cross Pollinations (${plantCrosses.length})</div>
        ${plantCrosses.map(c => `
          <div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            <span class="designation" style="font-size:0.75rem;">${c.mother_designation}</span>
            <span style="margin:0 6px;">×</span>
            <span class="designation" style="font-size:0.75rem;">${c.father_designation || '?'}</span>
            <span style="margin-left:8px;color:${c.success === true ? '#22c55e' : c.success === false ? '#ef4444' : '#f59e0b'};">${c.success === true ? '✅' : c.success === false ? '❌' : '⏳'}</span>
          </div>
        `).join('')}
      </div>` : ''}

      <div id="plant-photo-gallery-${designation}" style="margin-bottom:8px;">
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">📷 Photos</div>
        <div id="plant-gallery-grid-${designation}" style="display:flex;flex-wrap:wrap;gap:8px;">
          <div style="color:var(--text-muted);font-size:0.85rem;">Loading photos...</div>
        </div>
        <div style="margin-top:8px;display:flex;gap:8px;align-items:center;">
          <input type="file" id="gallery-upload-${designation}" accept="image/*" style="display:none" onchange="uploadPlantGalleryPhoto('${designation}')">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('gallery-upload-${designation}').click()">📷 Add Photo</button>
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="closeModal();showEditPlant('${designation}');">✏️ Edit</button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal();showPlantQR('${designation}');">⬛ QR</button>
        <button class="btn btn-primary btn-sm" onclick="closeModal();showAddAmendment('${designation}');">🌿 Amend</button>
        <button class="btn btn-brown btn-sm" onclick="toggleSeedSelect('${designation}', ${!p.selected_for_seed});closeModal();">${p.selected_for_seed ? '★ Deselect' : '☆ Seed Save'}</button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal();printSeedLabel('${p.seed_lot_designation}');">🏷️ Label</button>
        ${state.settings.ai_provider ? `<button class="btn btn-secondary btn-sm" onclick="closeModal();showPestHelper('${designation}', '${p.variety_name || p.variety_code}');">🐛 Pest Help</button>` : ''}
      </div>
    </div>
  `);
  loadPlantGallery('${designation}');
}

async function loadPlantGallery(designation) {
  const grid = document.getElementById('plant-gallery-grid-' + designation);
  if (!grid) return;
  try {
    const photos = await api('/api/plants/' + designation + '/photos');
    if (!photos || photos.length === 0) {
      grid.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem;">No photos yet — click Add Photo to upload.</span>';
      return;
    }
    grid.innerHTML = photos.map(photo => `
      <div style="position:relative;">
        <img src="${photo.photo_path}" style="width:100px;height:100px;object-fit:cover;border-radius:6px;border:2px solid var(--border);cursor:pointer;" onclick="showFullPhoto('${photo.photo_path}', '${photo.caption || designation}')">
        <button onclick="deletePlantGalleryPhoto('${designation}', ${photo.id})" style="position:absolute;top:2px;right:2px;background:rgba(239,68,68,0.9);border:none;color:white;border-radius:50%;width:20px;height:20px;font-size:0.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
        ${photo.caption ? `<div style="font-size:0.7rem;text-align:center;color:var(--text-muted);margin-top:2px;">${photo.caption}</div>` : ''}
      </div>
    `).join('');
  } catch (err) { grid.innerHTML = '<span style="color:var(--text-muted);">Could not load photos</span>'; }
}

async function uploadPlantGalleryPhoto(designation) {
  const input = document.getElementById('gallery-upload-' + designation);
  const file = input.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('photo', file);
  try {
    const res = await fetch('/api/plants/' + designation + '/photos', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + getToken() },
      body: formData
    });
    const result = await res.json();
    if (result.error) { alert('Upload failed: ' + result.error); return; }
    await loadPlantGallery(designation);
    input.value = '';
  } catch (err) { alert('Upload failed: ' + err.message); }
}

async function deletePlantGalleryPhoto(designation, id) {
  if (!confirm('Delete this photo?')) return;
  await api('/api/plants/' + designation + '/photos/' + id, 'DELETE');
  await loadPlantGallery(designation);
}

function renderPlants() {
  const year = new Date().getFullYear();
  const searchTerm = (document.getElementById('plant-search')?.value || '').toLowerCase();
  const filterSeedSave = document.getElementById('plant-filter-seedsave')?.value || '';
  const filterLocation = document.getElementById('plant-filter-location')?.value || '';
  let thisYear = state.plants.filter(p => {
    if (p.season_year !== year) return false;
    const matchSearch = !searchTerm ||
      p.designation.toLowerCase().includes(searchTerm) ||
      (p.variety_name || '').toLowerCase().includes(searchTerm) ||
      (p.location_name || '').toLowerCase().includes(searchTerm);
    const matchSeedSave = !filterSeedSave || (filterSeedSave === 'yes' ? p.selected_for_seed : !p.selected_for_seed);
    const matchLocation = !filterLocation || String(p.location_id) === filterLocation;
    return matchSearch && matchSeedSave && matchLocation;
  });
  const allThisYear = state.plants.filter(p => p.season_year === year);
  return `
    <div class="page-header"><h1 class="page-title">🪴 Plants — ${year}</h1><button class="btn btn-primary" onclick="showAddPlants()">+ Add Plants</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="plant-search" placeholder="🔍 Search plants..." style="max-width:200px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="plant-filter-seedsave" style="max-width:150px;" onchange="render()">
          <option value="">All Plants</option>
          <option value="yes" ${filterSeedSave === 'yes' ? 'selected' : ''}>⭐ Seed Save Selected</option>
          <option value="no" ${filterSeedSave === 'no' ? 'selected' : ''}>Not Selected</option>
        </select>
        <select class="form-control" id="plant-filter-location" style="max-width:150px;" onchange="render()">
          <option value="">All Locations</option>
          ${state.locations.filter(l => l.active).map(l => `<option value="${l.id}" ${filterLocation === String(l.id) ? 'selected' : ''}>${l.name}</option>`).join('')}
        </select>
        ${searchTerm || filterSeedSave || filterLocation ? `<button class="btn btn-secondary btn-sm" onclick="clearPlantFilters()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${thisYear.length} of ${allThisYear.length} plants</span>
      </div>
    </div>
    <div class="card">
      ${thisYear.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🪴</div><p>${allThisYear.length === 0 ? 'No plants logged this season yet.' : 'No plants match your search.'}</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Designation</th><th>Variety</th><th>Location</th><th>Photo</th><th>Start</th><th>Transplanted</th><th>Seed Save</th><th>Actions</th></tr></thead>
        <tbody>${thisYear.map(p => `<tr style="cursor:pointer;" onclick="showPlantDetail('${p.designation}')">
          <td><span class="designation">${p.designation}</span></td>
          <td>${p.variety_name || '—'}</td>
          <td>${p.location_name ? '<span style="font-size:0.85rem;">📍 ' + p.location_name + '</span>' : '—'}</td>
          <td onclick="event.stopPropagation()">${p.photo_path ? `<img src="${p.photo_path}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="showPlantPhoto('${p.designation}')">` : '<span style="color:var(--text-muted);font-size:0.8rem;">—</span>'}</td>
          <td>${p.start_method === 'indoor_start' ? '🏠 Indoor' : p.start_method === 'transplant' ? '🌿 Transplant' : '🌱 Direct'}</td>
          <td>${p.transplant_date ? '🪴 ' + new Date(p.transplant_date).toLocaleDateString() : p.started_indoors_date ? '🏠 Started' : '—'}</td>
          <td>${p.selected_for_seed ? '<span class="seed-star">⭐ Selected</span>' : '—'}</td>
          <td onclick="event.stopPropagation()" style="display:flex;gap:4px;flex-wrap:wrap;">
            <button class="btn btn-brown btn-sm" onclick="toggleSeedSelect('${p.designation}', ${!p.selected_for_seed})">${p.selected_for_seed ? '★ Deselect' : '☆ Seed Save'}</button>
            <button class="btn btn-secondary btn-sm" onclick="showEditPlant('${p.designation}')">✏️</button>
            <button class="btn btn-secondary btn-sm" onclick="showPlantPhotoUpload('${p.designation}')">📷</button>
            <button class="btn btn-secondary btn-sm" onclick="showPlantQR('${p.designation}')">⬛ QR</button>
            <button class="btn btn-primary btn-sm" onclick="showAddAmendment('${p.designation}')">🌿 Amend</button>
            <button class="btn btn-danger btn-sm" onclick="deletePlant('${p.designation}')">🗑️</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>
    ${state.plants.filter(p => p.season_year !== year).length > 0 ? `
    <div class="card">
      <div class="card-title">📚 Previous Seasons</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Designation</th><th>Variety</th><th>Year</th><th>Seed Save</th><th>Actions</th></tr></thead>
        <tbody>${state.plants.filter(p => p.season_year !== year).map(p => `<tr>
          <td><span class="designation">${p.designation}</span></td>
          <td>${p.variety_name || '—'}</td>
          <td>${p.season_year}</td>
          <td>${p.selected_for_seed ? '⭐' : '—'}</td>
          <td style="display:flex;gap:4px;">
            <button class="btn btn-secondary btn-sm" onclick="showEditPlant('${p.designation}')">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deletePlant('${p.designation}')">🗑️</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>` : ''}
  `;
}

function showPlantPhoto(designation) {
  const p = state.plants.find(x => x.designation === designation);
  openModal('Photo — ' + designation, `
    <img src="${p.photo_path}" style="width:100%;border-radius:8px;margin-bottom:16px;">
    <div class="form-actions">
      <button class="btn btn-danger" onclick="deletePlantPhoto('${designation}')">🗑️ Remove Photo</button>
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
    </div>
  `);
}

function showPlantPhotoUpload(designation) {
  const p = state.plants.find(x => x.designation === designation);
  openModal('Plant Photo — ' + designation, `
    ${p.photo_path ? `
      <img src="${p.photo_path}" style="width:100%;border-radius:8px;margin-bottom:16px;border:2px solid var(--border);">
      <button class="btn btn-danger btn-sm" style="margin-bottom:16px;" onclick="deletePlantPhoto('${designation}')">🗑️ Remove Photo</button>
    ` : '<div style="background:var(--green-bg);border-radius:8px;padding:30px;text-align:center;color:var(--text-muted);margin-bottom:16px;">No photo yet</div>'}
    <div class="form-group">
      <label class="form-label">Upload Plant Photo</label>
      <input type="file" id="plant-photo-upload" accept="image/*" class="form-control">
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitPlantPhoto('${designation}')">📷 Upload Photo</button>
    </div>
  `);
}

async function submitPlantPhoto(designation) {
  const input = document.getElementById('plant-photo-upload');
  const file = input.files[0];
  if (!file) return alert('Please select a photo');
  const result = await uploadPhoto('/api/plants/' + designation + '/photo', file);
  if (result.error) return alert('Upload failed: ' + result.error);
  await loadAll(); closeModal(); render();
  alert('✅ Photo uploaded successfully!');
}

async function deletePlantPhoto(designation) {
  if (!confirm('Remove this photo?')) return;
  await api('/api/plants/' + designation + '/photo', 'DELETE');
  await loadAll(); closeModal(); render();
}

function showAddPlants(preselectedLot = '') {
  openModal('Add Plants to Season', `
    <div class="alert alert-info">Plant designations are auto-generated.</div>
    <div class="form-group"><label class="form-label">Seed Lot *</label>
      <select class="form-control" id="f-lot">
        <option value="">Select seed lot...</option>
        ${state.seedLots.map(l => `<option value="${l.designation}" ${l.designation === preselectedLot ? 'selected' : ''}>${l.designation} — ${l.variety_name || l.variety_code}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Number of Plants *</label><input class="form-control" id="f-count" type="number" min="1" value="1"></div>
      <div class="form-group"><label class="form-label">Season</label>
        <select class="form-control" id="f-season">
          <option value="summer">Summer</option><option value="winter">Winter (Greenhouse)</option>
          <option value="spring">Spring</option><option value="fall">Fall</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Garden Location</label>
      <select class="form-control" id="f-location">
        <option value="">No location assigned</option>
        ${state.locations.filter(l => l.active).map(l => `<option value="${l.id}">${l.name} (${l.type})</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Start Method</label>
      <select class="form-control" id="f-startmethod" onchange="toggleIndoorDate()">
        <option value="direct_sow">Direct Sow</option>
        <option value="indoor_start">Started Indoors</option>
        <option value="transplant">Transplant from Nursery</option>
      </select>
    </div>
    <div class="form-group hidden" id="f-indoordate-group">
      <label class="form-label">Date Started Indoors</label>
      <input class="form-control" id="f-indoordate" type="date">
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2"></textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitPlants()">Add Plants</button>
    </div>
  `);
}

function toggleIndoorDate() {
  const method = document.getElementById('f-startmethod')?.value;
  const group = document.getElementById('f-indoordate-group');
  if (group) group.classList.toggle('hidden', method === 'direct_sow');
}

function showEditPlant(designation) {
  const p = state.plants.find(x => x.designation === designation);
  openModal('Edit Plant — ' + designation, `
    <div class="form-group"><label class="form-label">Season</label>
      <select class="form-control" id="f-season">
        <option value="summer" ${p.season_type === 'summer' ? 'selected' : ''}>Summer</option>
        <option value="winter" ${p.season_type === 'winter' ? 'selected' : ''}>Winter (Greenhouse)</option>
        <option value="spring" ${p.season_type === 'spring' ? 'selected' : ''}>Spring</option>
        <option value="fall" ${p.season_type === 'fall' ? 'selected' : ''}>Fall</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Garden Location</label>
      <select class="form-control" id="f-location">
        <option value="">No location assigned</option>
        ${state.locations.filter(l => l.active).map(l => `<option value="${l.id}" ${p.location_id === l.id ? 'selected' : ''}>${l.name} (${l.type})</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Selected for Seed Save</label>
      <select class="form-control" id="f-seedsave">
        <option value="false" ${!p.selected_for_seed ? 'selected' : ''}>No</option>
        <option value="true" ${p.selected_for_seed ? 'selected' : ''}>Yes ⭐</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2">${p.notes || ''}</textarea></div>
    <div style="font-weight:700;margin:12px 0 8px;font-size:0.9rem;">🌱 Growth Timeline</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Start Method</label>
        <select class="form-control" id="f-startmethod">
          <option value="direct_sow" ${p.start_method === 'direct_sow' || !p.start_method ? 'selected' : ''}>Direct Sow</option>
          <option value="indoor_start" ${p.start_method === 'indoor_start' ? 'selected' : ''}>Started Indoors</option>
          <option value="transplant" ${p.start_method === 'transplant' ? 'selected' : ''}>Transplant from Nursery</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Date Started Indoors</label>
        <input class="form-control" id="f-indoordate" type="date" value="${p.started_indoors_date ? p.started_indoors_date.split('T')[0] : ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Transplant Date</label>
        <input class="form-control" id="f-transplantdate" type="date" value="${p.transplant_date ? p.transplant_date.split('T')[0] : ''}">
      </div>
      <div class="form-group"><label class="form-label">Transplanted To</label>
        <select class="form-control" id="f-transplantloc">
          <option value="">Select location...</option>
          ${state.locations.filter(l => l.active).map(l => `<option value="${l.id}" ${p.transplant_location_id === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Transplant Notes</label>
      <textarea class="form-control" id="f-transplantnotes" rows="2" placeholder="Condition when transplanted, weather, observations...">${p.transplant_notes || ''}</textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitEditPlant('${designation}')">Save Changes</button>
    </div>
  `);
}

async function submitPlants() {
  const seed_lot_designation = document.getElementById('f-lot').value;
  if (!seed_lot_designation) return alert('Select a seed lot');
  const location_id = document.getElementById('f-location').value;
  const startMethod = document.getElementById('f-startmethod')?.value || 'direct_sow';
  const indoorDate = document.getElementById('f-indoordate')?.value || null;
  const result = await api('/api/plants', 'POST', { seed_lot_designation, season_year: new Date().getFullYear(), season_type: document.getElementById('f-season').value, count: parseInt(document.getElementById('f-count').value), location_id: location_id || null, notes: document.getElementById('f-notes').value, start_method: startMethod, started_indoors_date: indoorDate });
  closeModal(); await loadAll(); render();
  setTimeout(() => alert('✅ ' + result.length + ' plant(s) added!\nFirst: ' + result[0].designation), 100);
}

async function submitEditPlant(designation) {
  const plant = state.plants.find(p => p.designation === designation);
  const location_id = document.getElementById('f-location').value;
  const transplantLocId = document.getElementById('f-transplantloc')?.value || null;
  await api('/api/plants/' + designation, 'PUT', { selected_for_seed: document.getElementById('f-seedsave').value === 'true', notes: document.getElementById('f-notes').value, season_type: document.getElementById('f-season').value, location_id: location_id || null, traits: plant.traits || {}, start_method: document.getElementById('f-startmethod')?.value || 'direct_sow', started_indoors_date: document.getElementById('f-indoordate')?.value || null, transplant_date: document.getElementById('f-transplantdate')?.value || null, transplant_location_id: transplantLocId || null, transplant_notes: document.getElementById('f-transplantnotes')?.value || null });
  closeModal(); await loadAll(); render();
}

async function toggleSeedSelect(designation, selected) {
  const plant = state.plants.find(p => p.designation === designation);
  await api('/api/plants/' + designation, 'PUT', { selected_for_seed: selected, notes: plant.notes, season_type: plant.season_type, location_id: plant.location_id, traits: plant.traits || {} });
  await loadAll(); render();
}

async function deletePlant(designation) {
  if (!confirm('Delete plant ' + designation + '? This cannot be undone.')) return;
  await api('/api/plants/' + designation, 'DELETE'); await loadAll(); render();
}

// AMENDMENTS
function renderAmendments() {
  const searchTerm = (document.getElementById('amend-search')?.value || '').toLowerCase();
  const filterType = document.getElementById('amend-filter-type')?.value || '';
  let filteredAmendments = state.amendments.filter(a => {
    const matchSearch = !searchTerm ||
      (a.plant_designation || '').toLowerCase().includes(searchTerm) ||
      (a.product_name || '').toLowerCase().includes(searchTerm) ||
      (a.location_name || '').toLowerCase().includes(searchTerm) ||
      (a.notes || '').toLowerCase().includes(searchTerm);
    const matchType = !filterType || a.type === filterType;
    return matchSearch && matchType;
  });
  const types = [...new Set(state.amendments.map(a => a.type))].sort();
  return `
    <div class="page-header"><h1 class="page-title">🌿 Amendments & Fertilizer</h1><button class="btn btn-primary" onclick="showAddAmendment()">+ Log Amendment</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="amend-search" placeholder="🔍 Search amendments..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="amend-filter-type" style="max-width:150px;" onchange="render()">
          <option value="">All Types</option>
          ${types.map(t => `<option value="${t}" ${filterType === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        ${searchTerm || filterType ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('amend-search').value='';document.getElementById('amend-filter-type').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredAmendments.length} of ${state.amendments.length} records</span>
      </div>
    </div>
    ${filteredAmendments.length === 0 ? `<div class="card"><div class="empty-state"><div class="empty-state-icon">🌿</div><p>${state.amendments.length === 0 ? 'No amendments logged yet. Use the 🌿 Amend button on a plant or location.' : 'No amendments match your search.'}</p></div></div>`
    : filteredAmendments.map(a => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
              <span class="tag tag-active">${a.type}</span>
              ${a.product_name ? `<strong>${a.product_name}</strong>` : ''}
              <span style="font-size:0.85rem;color:var(--text-muted);">${new Date(a.amendment_date).toLocaleDateString()}</span>
            </div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.85rem;color:var(--text-muted);">
              ${a.plant_designation ? `<span>🪴 ${a.plant_designation}</span>` : ''}
              ${a.location_name ? `<span>📍 ${a.location_name}</span>` : ''}
              ${a.amount ? `<span>📏 ${a.amount}</span>` : ''}
              ${a.method ? `<span>🔧 ${a.method}</span>` : ''}
            </div>
            ${a.notes ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${a.notes}</div>` : ''}
          </div>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-secondary btn-sm" data-tip="Edit amendment" onclick="showEditAmendment(${a.id})">✏️</button>
            <button class="btn btn-danger btn-sm" data-tip="Delete amendment" onclick="deleteAmendment(${a.id})">🗑️</button>
          </div>
        </div>
      </div>
    `).join('')}
  `;
}

function amendmentForm(a, preselectedPlant = '') {
  const types = ['Fertilizer', 'Amendment', 'Pesticide', 'Fungicide', 'Herbicide', 'Other'];
  const methods = ['Top dress', 'Side dress', 'Soil drench', 'Foliar spray', 'Mixed into soil', 'Other'];
  return `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Apply to Plant</label>
        <select class="form-control" id="f-aplant">
          <option value="">No specific plant</option>
          ${state.plants.filter(p => p.season_year === new Date().getFullYear()).map(p => `<option value="${p.designation}" ${(a && a.plant_designation === p.designation) || preselectedPlant === p.designation ? 'selected' : ''}>${p.designation} — ${p.variety_name || ''}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Apply to Location</label>
        <select class="form-control" id="f-alocation">
          <option value="">No specific location</option>
          ${state.locations.filter(l => l.active).map(l => `<option value="${l.id}" ${a && a.location_id === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date *</label><input class="form-control" id="f-adate" type="date" value="${a && a.amendment_date ? a.amendment_date.split('T')[0] : new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Type *</label>
        <select class="form-control" id="f-atype">
          ${types.map(t => `<option value="${t}" ${a && a.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Product Name</label><input class="form-control" id="f-aproduct" value="${a ? a.product_name || '' : ''}" placeholder="e.g. Tomato-tone, Miracle-Gro, Lime"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Amount / Rate</label><input class="form-control" id="f-aamount" value="${a ? a.amount || '' : ''}" placeholder="e.g. 1 tbsp per gallon, 1 cup per plant"></div>
      <div class="form-group"><label class="form-label">Method</label>
        <select class="form-control" id="f-amethod">
          <option value="">Select...</option>
          ${methods.map(m => `<option value="${m}" ${a && a.method === m ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-anotes" rows="2">${a ? a.notes || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${a ? `submitEditAmendment(${a.id})` : 'submitAmendment()'}">${a ? 'Save Changes' : 'Log Amendment'}</button>
    </div>
  `;
}

function showAddAmendment(preselectedPlant = '') { openModal('Log Amendment / Fertilizer', amendmentForm(null, preselectedPlant)); }
function showEditAmendment(id) { openModal('Edit Amendment', amendmentForm(state.amendments.find(x => x.id === id))); }

async function submitAmendment() {
  const amendment_date = document.getElementById('f-adate').value;
  const type = document.getElementById('f-atype').value;
  if (!amendment_date || !type) return alert('Date and type are required');
  await api('/api/amendments', 'POST', { plant_designation: document.getElementById('f-aplant').value || null, location_id: document.getElementById('f-alocation').value || null, amendment_date, type, product_name: document.getElementById('f-aproduct').value, amount: document.getElementById('f-aamount').value, method: document.getElementById('f-amethod').value, notes: document.getElementById('f-anotes').value });
  closeModal(); await loadAll(); render();
}

async function submitEditAmendment(id) {
  await api('/api/amendments/' + id, 'PUT', { amendment_date: document.getElementById('f-adate').value, type: document.getElementById('f-atype').value, product_name: document.getElementById('f-aproduct').value, amount: document.getElementById('f-aamount').value, method: document.getElementById('f-amethod').value, notes: document.getElementById('f-anotes').value });
  closeModal(); await loadAll(); render();
}

async function deleteAmendment(id) {
  if (!confirm('Delete this amendment record? This cannot be undone.')) return;
  await api('/api/amendments/' + id, 'DELETE'); await loadAll(); render();
}

function showPlantQR(designation) {
  const p = state.plants.find(x => x.designation === designation);
  const lot = state.seedLots.find(l => l.designation === p.seed_lot_designation);
  openModal('QR Code — ' + designation, `
    <div style="text-align:center;padding:16px;">
      <div id="qr-container" style="display:inline-block;padding:16px;background:white;border-radius:8px;margin-bottom:16px;"></div>
      <div style="font-family:monospace;font-size:0.85rem;margin-bottom:4px;">${designation}</div>
      <div style="font-size:0.85rem;color:var(--text-muted);">${p.variety_name || ''} · ${p.season_year}</div>
      ${lot && lot.storage_location ? `<div style="font-size:0.8rem;color:var(--text-muted);">${lot.storage_location}</div>` : ''}
    </div>
    <div class="alert alert-info">Print this QR code and attach it to your plant stake. Scan next season to pull up this plant instantly.</div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="printQR('${designation}')">🖨️ Print</button>
    </div>
  `);
  setTimeout(() => {
    const container = document.getElementById('qr-container');
    if (container && typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text: designation,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }, 100);
}

function printQR(designation) {
  const p = state.plants.find(x => x.designation === designation);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR — ${designation}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 20px; }
        .label { border: 2px solid #000; display: inline-block; padding: 12px; border-radius: 8px; }
        .designation { font-family: monospace; font-size: 14px; font-weight: bold; margin-top: 8px; }
        .variety { font-size: 12px; color: #555; }
      </style>
    </head>
    <body>
      <div class="label">
        <div id="qr"></div>
        <div class="designation">${designation}</div>
        <div class="variety">${p.variety_name || ''} · ${p.season_year}</div>
      </div>
      <script>
        new QRCode(document.getElementById('qr'), {
          text: '${designation}',
          width: 150,
          height: 150,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
        setTimeout(() => window.print(), 500);
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function renderHarvest() {
  const searchTerm = (document.getElementById('harvest-search')?.value || '').toLowerCase();
  let filteredHarvest = state.harvest.filter(h => {
    return !searchTerm ||
      h.plant_designation.toLowerCase().includes(searchTerm) ||
      (h.variety_name || '').toLowerCase().includes(searchTerm) ||
      (h.processing_method || '').toLowerCase().includes(searchTerm) ||
      (h.condition || '').toLowerCase().includes(searchTerm);
  });
  return `
    <div class="page-header"><h1 class="page-title">📋 Harvest Log</h1><button class="btn btn-primary" onclick="showAddHarvest()">+ Log Harvest</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="harvest-search" placeholder="🔍 Search harvest..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        ${searchTerm ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('harvest-search').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredHarvest.length} of ${state.harvest.length} records</span>
      </div>
    </div>
    <div class="card">
      ${filteredHarvest.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">📋</div><p>${state.harvest.length === 0 ? 'No harvest records yet.' : 'No records match your search.'}</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Plant</th><th>Variety</th><th>Length</th><th>Diameter</th><th>Weight</th><th>Seeds</th><th>Method</th><th>Actions</th></tr></thead>
        <tbody>${filteredHarvest.map(h => `<tr>
          <td>${h.harvest_date ? new Date(h.harvest_date).toLocaleDateString() : '—'}</td>
          <td><span class="designation" style="font-size:0.75rem;">${h.plant_designation}</span></td>
          <td>${h.variety_name || '—'}</td>
          <td>${h.fruit_length_inches ? h.fruit_length_inches + '"' : '—'}</td>
          <td>${h.fruit_diameter_inches ? h.fruit_diameter_inches + '"' : '—'}</td>
          <td>${h.fruit_weight_oz ? h.fruit_weight_oz + ' oz' : '—'}</td>
          <td>${h.seed_count || '—'}</td>
          <td>${h.processing_method || '—'}</td>
          <td style="display:flex;gap:4px;">
            <button class="btn btn-secondary btn-sm" data-tip="Edit harvest record" onclick="showEditHarvest(${h.id})">✏️</button>
            <button class="btn btn-danger btn-sm" data-tip="Delete harvest record" onclick="deleteHarvest(${h.id})">🗑️</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`}
    </div>
  `;
}

function harvestForm(h) {
  return `
    <div class="form-group"><label class="form-label">Plant *</label>
      <select class="form-control" id="f-plant" ${h ? 'disabled' : ''}>
        <option value="">Select plant...</option>
        ${state.plants.map(p => `<option value="${p.designation}" ${h && h.plant_designation === p.designation ? 'selected' : ''}>${p.designation} — ${p.variety_name || ''}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Harvest Date</label><input class="form-control" id="f-date" type="date" value="${h && h.harvest_date ? h.harvest_date.split('T')[0] : new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Condition</label>
        <select class="form-control" id="f-condition">
          <option value="perfect" ${h && h.condition === 'perfect' ? 'selected' : ''}>Perfect</option>
          <option value="good" ${h && h.condition === 'good' ? 'selected' : ''}>Good</option>
          <option value="overripe" ${h && h.condition === 'overripe' ? 'selected' : ''}>Overripe (ideal for seeds)</option>
          <option value="damaged" ${h && h.condition === 'damaged' ? 'selected' : ''}>Damaged</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Fruit Length (inches)</label><input class="form-control" id="f-length" type="number" step="0.1" value="${h ? h.fruit_length_inches || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Fruit Diameter (inches)</label><input class="form-control" id="f-diameter" type="number" step="0.1" value="${h ? h.fruit_diameter_inches || '' : ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Weight (oz)</label><input class="form-control" id="f-weight" type="number" step="0.1" value="${h ? h.fruit_weight_oz || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Seed Count</label><input class="form-control" id="f-seeds" type="number" value="${h ? h.seed_count || '' : ''}"></div>
    </div>
    <div class="form-group"><label class="form-label">Processing Method</label>
      <select class="form-control" id="f-method">
        <option value="direct dry" ${h && h.processing_method === 'direct dry' ? 'selected' : ''}>Direct Dry (cucumbers, peppers)</option>
        <option value="wet ferment" ${h && h.processing_method === 'wet ferment' ? 'selected' : ''}>Wet Ferment (tomatoes)</option>
        <option value="rinse dry" ${h && h.processing_method === 'rinse dry' ? 'selected' : ''}>Rinse and Dry</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2">${h ? h.notes || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${h ? `submitEditHarvest(${h.id})` : 'submitHarvest()'}">${h ? 'Save Changes' : 'Log Harvest'}</button>
    </div>
  `;
}

function showAddHarvest() { openModal('Log Seed Harvest', harvestForm(null)); }
function showEditHarvest(id) { openModal('Edit Harvest Record', harvestForm(state.harvest.find(x => x.id === id))); }

async function submitHarvest() {
  const plant_designation = document.getElementById('f-plant').value;
  if (!plant_designation) return alert('Select a plant');
  await api('/api/harvest', 'POST', { plant_designation, harvest_date: document.getElementById('f-date').value, fruit_length_inches: document.getElementById('f-length').value || null, fruit_diameter_inches: document.getElementById('f-diameter').value || null, fruit_weight_oz: document.getElementById('f-weight').value || null, seed_count: document.getElementById('f-seeds').value || null, condition: document.getElementById('f-condition').value, processing_method: document.getElementById('f-method').value, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function submitEditHarvest(id) {
  await api('/api/harvest/' + id, 'PUT', { harvest_date: document.getElementById('f-date').value, fruit_length_inches: document.getElementById('f-length').value || null, fruit_diameter_inches: document.getElementById('f-diameter').value || null, fruit_weight_oz: document.getElementById('f-weight').value || null, seed_count: document.getElementById('f-seeds').value || null, condition: document.getElementById('f-condition').value, processing_method: document.getElementById('f-method').value, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function deleteHarvest(id) {
  if (!confirm('Delete this harvest record? This cannot be undone.')) return;
  await api('/api/harvest/' + id, 'DELETE'); await loadAll(); render();
}

function renderGermination() {
  const searchTerm = (document.getElementById('germ-search')?.value || '').toLowerCase();
  let filteredGerm = state.germination.filter(g => {
    return !searchTerm ||
      g.seed_lot_designation.toLowerCase().includes(searchTerm) ||
      (g.variety_name || '').toLowerCase().includes(searchTerm) ||
      (g.notes || '').toLowerCase().includes(searchTerm);
  });
  return `
    <div class="page-header"><h1 class="page-title">🌿 Germination</h1><button class="btn btn-primary" onclick="showAddGermination()">+ Start Test</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="germ-search" placeholder="🔍 Search tests..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        ${searchTerm ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('germ-search').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredGerm.length} of ${state.germination.length} tests</span>
      </div>
    </div>
    <div class="card">
      ${filteredGerm.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🌿</div><p>${state.germination.length === 0 ? 'No germination tests yet.' : 'No tests match your search.'}</p></div>`
      : `<div class="table-wrap"><table>
        <thead><tr><th>Seed Lot</th><th>Variety</th><th>Started</th><th>Planted</th><th>Germinated</th><th>Rate</th><th>Days</th><th>Thinned</th><th>Remaining</th><th>Actions</th></tr></thead>
        <tbody>${filteredGerm.map(g => {
          const rate = g.seeds_germinated !== null && g.seeds_planted ? Math.round((g.seeds_germinated / g.seeds_planted) * 100) : null;
          return `<tr>
            <td><span class="designation" style="font-size:0.75rem;">${g.seed_lot_designation}</span></td>
            <td>${g.variety_name || '—'}</td>
            <td>${g.date_started ? new Date(g.date_started).toLocaleDateString() : '—'}</td>
            <td>${g.seeds_planted}</td>
            <td>${g.seeds_germinated !== null ? g.seeds_germinated : '—'}</td>
            <td>${rate !== null ? `<span class="gen-badge" style="background:${rate >= 80 ? 'var(--green-mid)' : rate >= 50 ? '#d97706' : '#dc2626'}">${rate}%</span>` : '—'}</td>
            <td>${g.days_to_germination !== null ? g.days_to_germination + ' days' : '—'}</td>
            <td>${g.seeds_thinned !== null ? g.seeds_thinned : '—'}</td>
            <td>${g.plants_remaining !== null ? g.plants_remaining : '—'}</td>
            <td style="display:flex;gap:4px;flex-wrap:wrap;">
              ${g.seeds_germinated === null ? `<button class="btn btn-primary btn-sm" data-tip="Enter germination results" onclick="showUpdateGermination(${g.id})">📊 Update</button>` : ''}
              ${g.seeds_thinned === null && g.seeds_germinated !== null ? `<button class="btn btn-brown btn-sm" data-tip="Log seedling thinning" onclick="showThinningLog(${g.id})">✂️ Thinning</button>` : ''}
              <button class="btn btn-danger btn-sm" data-tip="Delete this test" onclick="deleteGermination(${g.id})">🗑️</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`}
    </div>
  `;
}

function showAddGermination() {
  openModal('Start Germination Test', `
    <div class="alert alert-info">Track seeds from planting through germination and thinning.</div>
    <div class="form-group"><label class="form-label">Seed Lot *</label>
      <select class="form-control" id="f-lot">
        <option value="">Select seed lot...</option>
        ${state.seedLots.map(l => `<option value="${l.designation}">${l.designation} — ${l.variety_name || l.variety_code}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date Started *</label><input class="form-control" id="f-date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Seeds Planted *</label><input class="form-control" id="f-planted" type="number" min="1" placeholder="e.g. 8"></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2" placeholder="Soil mix, indoor/outdoor, conditions..."></textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitGermination()">Start Test</button>
    </div>
  `);
}

function showUpdateGermination(id) {
  const g = state.germination.find(x => x.id === id);
  openModal('Update Germination — ' + g.seed_lot_designation, `
    <div style="background:var(--green-bg);padding:12px;border-radius:6px;margin-bottom:16px;">
      <strong>${g.seeds_planted} seeds planted</strong> on ${new Date(g.date_started).toLocaleDateString()}
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Seeds Germinated *</label><input class="form-control" id="f-germinated" type="number" min="0" max="${g.seeds_planted}"></div>
      <div class="form-group"><label class="form-label">Date Germinated *</label><input class="form-control" id="f-dategerm" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2">${g.notes || ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitUpdateGermination(${id})">Save Results</button>
    </div>
  `);
}

function showThinningLog(id) {
  const g = state.germination.find(x => x.id === id);
  openModal('Log Thinning — ' + g.seed_lot_designation, `
    <div style="background:var(--green-bg);padding:12px;border-radius:6px;margin-bottom:16px;">
      <strong>${g.seeds_germinated} of ${g.seeds_planted} germinated</strong>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Seeds Thinned *</label><input class="form-control" id="f-thinned" type="number" min="0" max="${g.seeds_germinated}"></div>
      <div class="form-group"><label class="form-label">Date Thinned</label><input class="form-control" id="f-datethinned" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
    </div>
    <div class="form-group"><label class="form-label">Plants Remaining *</label><input class="form-control" id="f-remaining" type="number" min="0"></div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2"></textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitThinning(${id})">Log Thinning</button>
    </div>
  `);
}

async function submitGermination() {
  const seed_lot_designation = document.getElementById('f-lot').value;
  const date_started = document.getElementById('f-date').value;
  const seeds_planted = document.getElementById('f-planted').value;
  if (!seed_lot_designation || !date_started || !seeds_planted) return alert('Seed lot, date and seeds planted are required');
  await api('/api/germination', 'POST', { seed_lot_designation, date_started, seeds_planted: parseInt(seeds_planted), notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function submitUpdateGermination(id) {
  const seeds_germinated = document.getElementById('f-germinated').value;
  const date_germinated = document.getElementById('f-dategerm').value;
  if (!seeds_germinated || !date_germinated) return alert('Seeds germinated and date are required');
  await api('/api/germination/' + id, 'PUT', { seeds_germinated: parseInt(seeds_germinated), date_germinated, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function submitThinning(id) {
  const g = state.germination.find(x => x.id === id);
  const seeds_thinned = document.getElementById('f-thinned').value;
  const plants_remaining = document.getElementById('f-remaining').value;
  if (!seeds_thinned || !plants_remaining) return alert('Seeds thinned and plants remaining are required');
  await api('/api/germination/' + id, 'PUT', { seeds_germinated: g.seeds_germinated, date_germinated: g.date_germinated ? g.date_germinated.split('T')[0] : null, seeds_thinned: parseInt(seeds_thinned), date_thinned: document.getElementById('f-datethinned').value, plants_remaining: parseInt(plants_remaining), notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function deleteGermination(id) {
  if (!confirm('Delete this germination test? This cannot be undone.')) return;
  await api('/api/germination/' + id, 'DELETE'); await loadAll(); render();
}

function showLocationDetail(id) {
  const loc = state.locations.find(l => l.id === id);
  if (!loc) return;
  const currentYear = new Date().getFullYear();
  const plants = state.plants.filter(p => p.location_id === id);
  const thisYearPlants = plants.filter(p => p.season_year === currentYear);
  const locAmendments = state.amendments.filter(a => a.location_id === id);
  const allYears = [...new Set(plants.map(p => p.season_year))].sort((a,b) => b-a);

  openModal('📍 ' + loc.name, `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div style="background:var(--green-bg);padding:12px;border-radius:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Type</span><div style="font-weight:600;">${loc.type}</div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Status</span><div><span class="tag tag-${loc.active ? 'active' : 'complete'}">${loc.active ? 'Active' : 'Inactive'}</span></div></div>
          ${loc.size_description ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Size</span><div style="font-weight:600;">${loc.size_description}</div></div>` : ''}
          ${loc.sun_exposure ? `<div><span style="font-size:0.8rem;color:var(--text-muted);">Sun</span><div style="font-weight:600;">${loc.sun_exposure}</div></div>` : ''}
        </div>
        ${loc.soil_notes ? `<div style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);">🌱 ${loc.soil_notes}</div>` : ''}
        ${loc.notes ? `<div style="margin-top:4px;font-size:0.85rem;color:var(--text-muted);">${loc.notes}</div>` : ''}
      </div>

      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🪴 Plants This Season (${thisYearPlants.length})</div>
        ${thisYearPlants.length === 0 ? '<p style="font-size:0.85rem;color:var(--text-muted);">No plants this season.</p>' : `
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${thisYearPlants.map(p => `<span class="designation" style="font-size:0.75rem;cursor:pointer;" onclick="closeModal();showPlantDetail('${p.designation}')">${p.designation}${p.selected_for_seed ? ' ⭐' : ''}</span>`).join('')}
        </div>`}
      </div>

      ${allYears.filter(y => y !== currentYear).length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">📚 Previous Seasons</div>
        ${allYears.filter(y => y !== currentYear).map(year => {
          const yearPlants = plants.filter(p => p.season_year === year);
          return `<div style="font-size:0.85rem;margin-bottom:4px;"><strong>${year}:</strong> ${yearPlants.map(p => p.designation).join(', ')}</div>`;
        }).join('')}
      </div>` : ''}

      ${locAmendments.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌿 Amendment History (${locAmendments.length})</div>
        ${locAmendments.map(a => `
          <div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            <div style="display:flex;justify-content:space-between;">
              <span><span class="tag tag-active">${a.type}</span>${a.product_name ? ' ' + a.product_name : ''}</span>
              <span style="color:var(--text-muted);">${new Date(a.amendment_date).toLocaleDateString()}</span>
            </div>
            ${a.amount || a.method ? `<div style="color:var(--text-muted);margin-top:4px;">${a.amount || ''} ${a.method || ''}</div>` : ''}
          </div>
        `).join('')}
      </div>` : ''}

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="closeModal();showAddAmendmentLocation(${id});">🌿 Amend</button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal();showEditLocation(${id});">✏️ Edit</button>
      </div>
    </div>
  `);
}

function renderLocations() {
  const searchTerm = (document.getElementById('loc-search')?.value || '').toLowerCase();
  const filterActive = document.getElementById('loc-filter-active')?.value || '';
  let filteredLocations = state.locations.filter(loc => {
    const matchSearch = !searchTerm ||
      loc.name.toLowerCase().includes(searchTerm) ||
      loc.type.toLowerCase().includes(searchTerm) ||
      (loc.notes || '').toLowerCase().includes(searchTerm);
    const matchActive = !filterActive ||
      (filterActive === 'active' ? loc.active : !loc.active);
    return matchSearch && matchActive;
  });
  return `
    <div class="page-header"><h1 class="page-title">📍 Garden Locations</h1><button class="btn btn-primary" onclick="showAddLocation()">+ Add Location</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="loc-search" placeholder="🔍 Search locations..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="loc-filter-active" style="max-width:150px;" onchange="render()">
          <option value="">All Locations</option>
          <option value="active" ${filterActive === 'active' ? 'selected' : ''}>Active Only</option>
          <option value="inactive" ${filterActive === 'inactive' ? 'selected' : ''}>Inactive Only</option>
        </select>
        ${searchTerm || filterActive ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('loc-search').value='';document.getElementById('loc-filter-active').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredLocations.length} of ${state.locations.length} locations</span>
      </div>
    </div>
    ${filteredLocations.length === 0 ? `<div class="card"><div class="empty-state"><div class="empty-state-icon">📍</div><p>${state.locations.length === 0 ? 'No garden locations yet.' : 'No locations match your search.'}</p></div></div>`
    : filteredLocations.map(loc => {
      const plants = state.plants.filter(p => p.location_id === loc.id && p.season_year === new Date().getFullYear());
      const locAmendments = state.amendments.filter(a => a.location_id === loc.id).slice(0, 3);
      return `
        <div class="card" style="cursor:pointer;" onclick="showLocationDetail(${loc.id})">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
                <strong style="font-size:1.1rem;">${loc.name}</strong>
                <span class="tag tag-active">${loc.type}</span>
                ${!loc.active ? '<span class="tag tag-complete">Inactive</span>' : ''}
              </div>
              ${loc.size_description ? `<div style="font-size:0.85rem;color:var(--text-muted);">📐 ${loc.size_description}</div>` : ''}
              ${loc.sun_exposure ? `<div style="font-size:0.85rem;color:var(--text-muted);">☀️ ${loc.sun_exposure}</div>` : ''}
              ${loc.soil_notes ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">🌱 ${loc.soil_notes}</div>` : ''}
              ${loc.notes ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${loc.notes}</div>` : ''}
            </div>
            <div onclick="event.stopPropagation()" style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm" data-tip="Log amendment for this location" onclick="showAddAmendmentLocation(${loc.id})">🌿 Amend</button>
              <button class="btn btn-secondary btn-sm" data-tip="Edit location details" onclick="showEditLocation(${loc.id})">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" data-tip="Delete this location" onclick="deleteLocation(${loc.id})">🗑️</button>
            </div>
          </div>
          <div style="margin-top:16px;">
            <div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:8px;">Plants this season (${plants.length}):</div>
            ${plants.length === 0 ? '<p style="font-size:0.85rem;color:var(--text-muted);">No plants assigned yet.</p>'
            : `<div style="display:flex;flex-wrap:wrap;gap:6px;">${plants.map(p => `<span class="designation" style="font-size:0.75rem;">${p.designation}</span>`).join('')}</div>`}
          </div>
          ${locAmendments.length > 0 ? `
          <div style="margin-top:12px;">
            <div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:6px;">Recent amendments:</div>
            ${locAmendments.map(a => `<div style="font-size:0.8rem;color:var(--text-muted);">${new Date(a.amendment_date).toLocaleDateString()} — ${a.type}${a.product_name ? ': ' + a.product_name : ''}</div>`).join('')}
          </div>` : ''}
        </div>
      `;
    }).join('')}
  `;
}

function showAddAmendmentLocation(locationId) {
  openModal('Log Amendment for Location', amendmentForm(null, ''));
  setTimeout(() => {
    const sel = document.getElementById('f-alocation');
    if (sel) sel.value = locationId;
  }, 50);
}

function locationForm(loc) {
  const types = ['Raised Bed', 'Fabric Grow Bag', 'In Ground', 'Container/Pot', 'Greenhouse Bed', 'Greenhouse Bench', 'Other'];
  const sunOptions = ['Full Sun', 'Partial Sun', 'Partial Shade', 'Full Shade'];
  return `
    <div class="form-group"><label class="form-label">Location Name *</label><input class="form-control" id="f-lname" value="${loc ? loc.name : ''}" placeholder="e.g. Front Bed, Grow Bag Table"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Type *</label>
        <select class="form-control" id="f-ltype">
          ${types.map(t => `<option value="${t}" ${loc && loc.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Size / Dimensions</label><input class="form-control" id="f-lsize" value="${loc ? loc.size_description || '' : ''}" placeholder="e.g. 4x5 ft, 5 gallon"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Sun Exposure</label>
        <select class="form-control" id="f-lsun">
          <option value="">Select...</option>
          ${sunOptions.map(s => `<option value="${s}" ${loc && loc.sun_exposure === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      ${loc ? `<div class="form-group"><label class="form-label">Status</label>
        <select class="form-control" id="f-lactive">
          <option value="true" ${loc.active ? 'selected' : ''}>Active</option>
          <option value="false" ${!loc.active ? 'selected' : ''}>Inactive</option>
        </select>
      </div>` : ''}
    </div>
    <div class="form-group"><label class="form-label">Soil / Mix Notes</label><textarea class="form-control" id="f-lsoil" rows="2">${loc ? loc.soil_notes || '' : ''}</textarea></div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-lnotes" rows="2">${loc ? loc.notes || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${loc ? `submitEditLocation(${loc.id})` : 'submitLocation()'}">${loc ? 'Save Changes' : 'Add Location'}</button>
    </div>
  `;
}

function showAddLocation() { openModal('Add Garden Location', locationForm(null)); }
function showEditLocation(id) { openModal('Edit Location', locationForm(state.locations.find(l => l.id === id))); }

async function submitLocation() {
  const name = document.getElementById('f-lname').value.trim();
  const type = document.getElementById('f-ltype').value;
  if (!name || !type) return alert('Name and type are required');
  await api('/api/locations', 'POST', { name, type, size_description: document.getElementById('f-lsize').value, sun_exposure: document.getElementById('f-lsun').value, soil_notes: document.getElementById('f-lsoil').value, notes: document.getElementById('f-lnotes').value });
  closeModal(); await loadAll(); render();
}

async function submitEditLocation(id) {
  const name = document.getElementById('f-lname').value.trim();
  if (!name) return alert('Name is required');
  await api('/api/locations/' + id, 'PUT', { name, type: document.getElementById('f-ltype').value, size_description: document.getElementById('f-lsize').value, sun_exposure: document.getElementById('f-lsun').value, soil_notes: document.getElementById('f-lsoil').value, notes: document.getElementById('f-lnotes').value, active: document.getElementById('f-lactive').value === 'true' });
  closeModal(); await loadAll(); render();
}

async function deleteLocation(id) {
  if (!confirm('Delete this location? This cannot be undone.')) return;
  await api('/api/locations/' + id, 'DELETE'); await loadAll(); render();
}

function renderCrosses() {
  const searchTerm = (document.getElementById('cross-search')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('cross-filter-status')?.value || '';
  let filteredCrosses = state.crosses.filter(c => {
    const matchSearch = !searchTerm ||
      c.mother_designation.toLowerCase().includes(searchTerm) ||
      (c.father_designation || '').toLowerCase().includes(searchTerm) ||
      (c.project_code || '').toLowerCase().includes(searchTerm) ||
      (c.notes || '').toLowerCase().includes(searchTerm);
    const matchStatus = !filterStatus ||
      (filterStatus === 'pending' && c.success === null) ||
      (filterStatus === 'success' && c.success === true) ||
      (filterStatus === 'failed' && c.success === false);
    return matchSearch && matchStatus;
  });
  return `
    <div class="page-header"><h1 class="page-title">🌸 Cross Pollination</h1><button class="btn btn-primary" onclick="showAddCross()">+ Log Cross</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="cross-search" placeholder="🔍 Search crosses..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="cross-filter-status" style="max-width:150px;" onchange="render()">
          <option value="">All Status</option>
          <option value="pending" ${filterStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
          <option value="success" ${filterStatus === 'success' ? 'selected' : ''}>✅ Success</option>
          <option value="failed" ${filterStatus === 'failed' ? 'selected' : ''}>❌ Failed</option>
        </select>
        ${searchTerm || filterStatus ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('cross-search').value='';document.getElementById('cross-filter-status').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredCrosses.length} of ${state.crosses.length} crosses</span>
      </div>
    </div>
    ${filteredCrosses.length === 0 ? `<div class="card"><div class="empty-state"><div class="empty-state-icon">🌸</div><p>${state.crosses.length === 0 ? 'No cross pollinations logged yet.' : 'No crosses match your search.'}</p></div></div>`
    : filteredCrosses.map(c => {
      const statusColor = c.success === true ? '#22c55e' : c.success === false ? '#ef4444' : '#f59e0b';
      const statusText = c.success === true ? '✅ Success' : c.success === false ? '❌ Failed' : '⏳ Pending';
      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                <span class="designation" style="font-size:0.8rem;">${c.mother_designation}</span>
                <span style="font-size:1.2rem;">×</span>
                <span class="designation" style="font-size:0.8rem;">${c.father_designation || '?'}</span>
                ${c.project_code ? `<span class="tag tag-active">${c.project_code}</span>` : ''}
              </div>
              <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.85rem;color:var(--text-muted);">
                ${c.date_bagged ? `<span>🛍️ Bagged: ${new Date(c.date_bagged).toLocaleDateString()}</span>` : ''}
                ${c.date_pollinated ? `<span>🌸 Pollinated: ${new Date(c.date_pollinated).toLocaleDateString()}</span>` : ''}
                ${c.date_unbagged ? `<span>✂️ Unbagged: ${new Date(c.date_unbagged).toLocaleDateString()}</span>` : ''}
              </div>
              ${c.fruit_set ? '<div style="font-size:0.85rem;margin-top:4px;">🍅 Fruit set confirmed</div>' : ''}
              ${c.notes ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${c.notes}</div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
              <span style="font-weight:700;color:${statusColor};">${statusText}</span>
              <div style="display:flex;gap:4px;">
                <button class="btn btn-secondary btn-sm" data-tip="Update cross pollination result" onclick="showUpdateCross(${c.id})">✏️ Update</button>
                <button class="btn btn-danger btn-sm" data-tip="Delete this cross record" onclick="deleteCross(${c.id})">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function showAddCross() {
  openModal('Log Cross Pollination', `
    <div class="alert alert-info">Log a hand pollination attempt between two plants.</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Mother Plant (receives pollen) *</label>
        <select class="form-control" id="f-mother">
          <option value="">Select plant...</option>
          ${state.plants.map(p => `<option value="${p.designation}">${p.designation} — ${p.variety_name || ''}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Father Plant (donates pollen)</label>
        <select class="form-control" id="f-father">
          <option value="">Select plant...</option>
          ${state.plants.map(p => `<option value="${p.designation}">${p.designation} — ${p.variety_name || ''}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Breeding Project</label>
      <select class="form-control" id="f-project">
        <option value="">None</option>
        ${state.projects.filter(p => p.status === 'active').map(p => `<option value="${p.code}">${p.name} (${p.code})</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date Bagged</label><input class="form-control" id="f-bagged" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Date Pollinated</label><input class="form-control" id="f-pollinated" type="date"></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2"></textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitCross()">Log Cross</button>
    </div>
  `);
}

function showUpdateCross(id) {
  const c = state.crosses.find(x => x.id === id);
  openModal('Update Cross — ' + c.mother_designation + ' × ' + (c.father_designation || '?'), `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date Pollinated</label><input class="form-control" id="f-pollinated" type="date" value="${c.date_pollinated ? c.date_pollinated.split('T')[0] : ''}"></div>
      <div class="form-group"><label class="form-label">Date Unbagged</label><input class="form-control" id="f-unbagged" type="date" value="${c.date_unbagged ? c.date_unbagged.split('T')[0] : ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Fruit Set?</label>
        <select class="form-control" id="f-fruitset">
          <option value="false" ${!c.fruit_set ? 'selected' : ''}>No</option>
          <option value="true" ${c.fruit_set ? 'selected' : ''}>Yes 🍅</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Result</label>
        <select class="form-control" id="f-success">
          <option value="" ${c.success === null ? 'selected' : ''}>Pending</option>
          <option value="true" ${c.success === true ? 'selected' : ''}>Success ✅</option>
          <option value="false" ${c.success === false ? 'selected' : ''}>Failed ❌</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-notes" rows="2">${c.notes || ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitUpdateCross(${id})">Save Update</button>
    </div>
  `);
}

async function submitCross() {
  const mother_designation = document.getElementById('f-mother').value;
  if (!mother_designation) return alert('Mother plant is required');
  await api('/api/crosses', 'POST', { mother_designation, father_designation: document.getElementById('f-father').value || null, project_code: document.getElementById('f-project').value || null, date_bagged: document.getElementById('f-bagged').value || null, date_pollinated: document.getElementById('f-pollinated').value || null, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function submitUpdateCross(id) {
  const successVal = document.getElementById('f-success').value;
  await api('/api/crosses/' + id, 'PUT', { date_pollinated: document.getElementById('f-pollinated').value || null, date_unbagged: document.getElementById('f-unbagged').value || null, fruit_set: document.getElementById('f-fruitset').value === 'true', success: successVal === '' ? null : successVal === 'true', notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function deleteCross(id) {
  if (!confirm('Delete this cross pollination record? This cannot be undone.')) return;
  await api('/api/crosses/' + id, 'DELETE'); await loadAll(); render();
}

function renderObservations() {
  const searchTerm = (document.getElementById('obs-search')?.value || '').toLowerCase();
  let filteredObs = state.observations.filter(o => {
    return !searchTerm ||
      o.plant_designation.toLowerCase().includes(searchTerm) ||
      (o.variety_name || '').toLowerCase().includes(searchTerm) ||
      (o.color || '').toLowerCase().includes(searchTerm) ||
      (o.notes || '').toLowerCase().includes(searchTerm);
  });
  return `
    <div class="page-header"><h1 class="page-title">🔍 Fruit Observations</h1><button class="btn btn-primary" onclick="showAddObservation()">+ Add Observation</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="obs-search" placeholder="🔍 Search observations..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        ${searchTerm ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('obs-search').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredObs.length} of ${state.observations.length} observations</span>
      </div>
    </div>
    ${filteredObs.length === 0 ? `<div class="card"><div class="empty-state"><div class="empty-state-icon">🔍</div><p>${state.observations.length === 0 ? 'No fruit observations yet.' : 'No observations match your search.'}</p></div></div>`
    : filteredObs.map(o => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
              <span class="designation" style="font-size:0.8rem;">${o.plant_designation}</span>
              ${o.variety_name ? `<span style="font-size:0.85rem;color:var(--text-muted);">${o.variety_name}</span>` : ''}
              <span style="font-size:0.85rem;color:var(--text-muted);">${new Date(o.observation_date).toLocaleDateString()}</span>
            </div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:0.85rem;">
              ${o.fruit_count !== null ? `<span>🍅 Count: <strong>${o.fruit_count}</strong></span>` : ''}
              ${o.avg_length_inches ? `<span>📏 Length: <strong>${o.avg_length_inches}"</strong></span>` : ''}
              ${o.avg_diameter_inches ? `<span>⭕ Diameter: <strong>${o.avg_diameter_inches}"</strong></span>` : ''}
              ${o.color ? `<span>🎨 Color: <strong>${o.color}</strong></span>` : ''}
              ${o.texture ? `<span>✋ Texture: <strong>${o.texture}</strong></span>` : ''}
            </div>
            ${o.flavor_notes ? `<div style="font-size:0.85rem;margin-top:6px;">😋 <em>${o.flavor_notes}</em></div>` : ''}
            ${o.health_notes ? `<div style="font-size:0.85rem;margin-top:4px;color:#f59e0b;">⚕️ ${o.health_notes}</div>` : ''}
            ${o.notes ? `<div style="font-size:0.85rem;color:var(--text-muted);margin-top:4px;">${o.notes}</div>` : ''}
          </div>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-secondary btn-sm" data-tip="Edit observation" onclick="showEditObservation(${o.id})">✏️</button>
            <button class="btn btn-danger btn-sm" data-tip="Delete observation" onclick="deleteObservation(${o.id})">🗑️</button>
          </div>
        </div>
      </div>
    `).join('')}
  `;
}

function observationForm(o) {
  return `
    <div class="form-group"><label class="form-label">Plant *</label>
      <select class="form-control" id="f-plant" ${o ? 'disabled' : ''}>
        <option value="">Select plant...</option>
        ${state.plants.map(p => `<option value="${p.designation}" ${o && o.plant_designation === p.designation ? 'selected' : ''}>${p.designation} — ${p.variety_name || ''}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Observation Date *</label><input class="form-control" id="f-obsdate" type="date" value="${o && o.observation_date ? o.observation_date.split('T')[0] : new Date().toISOString().split('T')[0]}"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Fruit Count</label><input class="form-control" id="f-count" type="number" min="0" value="${o ? o.fruit_count || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Color</label><input class="form-control" id="f-color" value="${o ? o.color || '' : ''}" placeholder="e.g. Dark green"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Avg Length (inches)</label><input class="form-control" id="f-length" type="number" step="0.1" value="${o ? o.avg_length_inches || '' : ''}"></div>
      <div class="form-group"><label class="form-label">Avg Diameter (inches)</label><input class="form-control" id="f-diameter" type="number" step="0.1" value="${o ? o.avg_diameter_inches || '' : ''}"></div>
    </div>
    <div class="form-group"><label class="form-label">Texture Notes</label><input class="form-control" id="f-texture" value="${o ? o.texture || '' : ''}" placeholder="e.g. Firm, bumpy, smooth"></div>
    <div class="form-group"><label class="form-label">Flavor Notes</label><textarea class="form-control" id="f-flavor" rows="2">${o ? o.flavor_notes || '' : ''}</textarea></div>
    <div class="form-group"><label class="form-label">Health / Disease Notes</label><textarea class="form-control" id="f-health" rows="2">${o ? o.health_notes || '' : ''}</textarea></div>
    <div class="form-group"><label class="form-label">General Notes</label><textarea class="form-control" id="f-notes" rows="2">${o ? o.notes || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${o ? `submitEditObservation(${o.id})` : 'submitObservation()'}">${o ? 'Save Changes' : 'Save Observation'}</button>
    </div>
  `;
}

function showAddObservation() { openModal('Add Fruit Observation', observationForm(null)); }
function showEditObservation(id) { openModal('Edit Observation', observationForm(state.observations.find(x => x.id === id))); }

async function submitObservation() {
  const plant_designation = document.getElementById('f-plant').value;
  const observation_date = document.getElementById('f-obsdate').value;
  if (!plant_designation || !observation_date) return alert('Plant and date are required');
  await api('/api/observations', 'POST', { plant_designation, observation_date, fruit_count: document.getElementById('f-count').value || null, color: document.getElementById('f-color').value, avg_length_inches: document.getElementById('f-length').value || null, avg_diameter_inches: document.getElementById('f-diameter').value || null, texture: document.getElementById('f-texture').value, flavor_notes: document.getElementById('f-flavor').value, health_notes: document.getElementById('f-health').value, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function submitEditObservation(id) {
  await api('/api/observations/' + id, 'PUT', { observation_date: document.getElementById('f-obsdate').value, fruit_count: document.getElementById('f-count').value || null, color: document.getElementById('f-color').value, avg_length_inches: document.getElementById('f-length').value || null, avg_diameter_inches: document.getElementById('f-diameter').value || null, texture: document.getElementById('f-texture').value, flavor_notes: document.getElementById('f-flavor').value, health_notes: document.getElementById('f-health').value, notes: document.getElementById('f-notes').value });
  closeModal(); await loadAll(); render();
}

async function deleteObservation(id) {
  if (!confirm('Delete this observation? This cannot be undone.')) return;
  await api('/api/observations/' + id, 'DELETE'); await loadAll(); render();
}

function showProjectDetail(code) {
  const p = state.projects.find(x => x.code === code);
  if (!p) return;
  const projectCrosses = state.crosses.filter(c => c.project_code === code);
  const successCount = projectCrosses.filter(c => c.success === true).length;
  const failCount = projectCrosses.filter(c => c.success === false).length;
  const pendingCount = projectCrosses.filter(c => c.success === null).length;

  openModal('🧬 ' + p.name, `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <div style="background:var(--green-bg);padding:12px;border-radius:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Code</span><div><span class="designation">${p.code}</span></div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Status</span><div><span class="tag tag-${p.status}">${p.status}</span></div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Started</span><div style="font-weight:600;">${p.started_year}</div></div>
          <div><span style="font-size:0.8rem;color:var(--text-muted);">Total Crosses</span><div style="font-weight:600;">${projectCrosses.length}</div></div>
        </div>
        ${p.description ? `<div style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);">${p.description}</div>` : ''}
      </div>

      ${p.target_traits && p.target_traits.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🎯 Target Traits</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${p.target_traits.map(t => `<span class="tag tag-heirloom">${t}</span>`).join('')}</div>
      </div>` : ''}

      ${projectCrosses.length > 0 ? `
      <div>
        <div style="font-weight:700;margin-bottom:8px;font-size:0.9rem;">🌸 Cross Results</div>
        <div style="display:flex;gap:12px;margin-bottom:12px;">
          <span style="color:#22c55e;font-weight:600;">✅ ${successCount} success</span>
          <span style="color:#ef4444;font-weight:600;">❌ ${failCount} failed</span>
          <span style="color:#f59e0b;font-weight:600;">⏳ ${pendingCount} pending</span>
        </div>
        ${projectCrosses.map(c => `
          <div style="background:var(--green-bg);padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.85rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
              <div>
                <span class="designation" style="font-size:0.75rem;">${c.mother_designation}</span>
                <span style="margin:0 6px;">×</span>
                <span class="designation" style="font-size:0.75rem;">${c.father_designation || '?'}</span>
              </div>
              <span style="color:${c.success === true ? '#22c55e' : c.success === false ? '#ef4444' : '#f59e0b'};">${c.success === true ? '✅ Success' : c.success === false ? '❌ Failed' : '⏳ Pending'}</span>
            </div>
            ${c.date_pollinated ? `<div style="color:var(--text-muted);margin-top:4px;">Pollinated: ${new Date(c.date_pollinated).toLocaleDateString()}</div>` : ''}
            ${c.notes ? `<div style="color:var(--text-muted);margin-top:4px;">${c.notes}</div>` : ''}
          </div>
        `).join('')}
      </div>` : '<p style="color:var(--text-muted);font-size:0.9rem;">No crosses logged for this project yet.</p>'}

      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary btn-sm" onclick="closeModal();showEditProject('${code}');">✏️ Edit</button>
        <button class="btn btn-secondary btn-sm" onclick="closeModal();showAddCross();">+ Log Cross</button>
      </div>
    </div>
  `);
}

function renderProjects() {
  const searchTerm = (document.getElementById('project-search')?.value || '').toLowerCase();
  const filterStatus = document.getElementById('project-filter-status')?.value || '';
  let filteredProjects = state.projects.filter(p => {
    const matchSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm) ||
      p.code.toLowerCase().includes(searchTerm) ||
      (p.description || '').toLowerCase().includes(searchTerm);
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchSearch && matchStatus;
  });
  return `
    <div class="page-header"><h1 class="page-title">🧬 Breeding Projects</h1><button class="btn btn-primary" onclick="showAddProject()">+ New Project</button></div>
    <div class="card" style="padding:12px 16px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <input class="form-control" id="project-search" placeholder="🔍 Search projects..." style="max-width:220px;" oninput="render()" value="${searchTerm}">
        <select class="form-control" id="project-filter-status" style="max-width:150px;" onchange="render()">
          <option value="">All Status</option>
          <option value="active" ${filterStatus === 'active' ? 'selected' : ''}>Active</option>
          <option value="complete" ${filterStatus === 'complete' ? 'selected' : ''}>Complete</option>
          <option value="paused" ${filterStatus === 'paused' ? 'selected' : ''}>Paused</option>
        </select>
        ${searchTerm || filterStatus ? `<button class="btn btn-secondary btn-sm" onclick="document.getElementById('project-search').value='';document.getElementById('project-filter-status').value='';render()">✕ Clear</button>` : ''}
        <span style="font-size:0.85rem;color:var(--text-muted);">${filteredProjects.length} of ${state.projects.length} projects</span>
      </div>
    </div>
    ${filteredProjects.length === 0 ? `<div class="card"><div class="empty-state"><div class="empty-state-icon">🧬</div><p>${state.projects.length === 0 ? 'No breeding projects yet.' : 'No projects match your search.'}</p></div></div>`
    : filteredProjects.map(p => {
      const projectCrosses = state.crosses.filter(c => c.project_code === p.code);
      return `
        <div class="card" style="cursor:pointer;" onclick="showProjectDetail('${p.code}')">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap;">
                <strong style="font-size:1.1rem;">${p.name}</strong>
                <span class="designation">${p.code}</span>
                <span class="tag tag-${p.status}">${p.status}</span>
              </div>
              <div style="color:var(--text-muted);font-size:0.9rem;">${p.description || 'No description'}</div>
              <div style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);">Started: ${p.started_year}</div>
            </div>
            <div onclick="event.stopPropagation()" style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm" data-tip="Edit breeding project" onclick="showEditProject('${p.code}')">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" data-tip="Delete this project" onclick="deleteProject('${p.code}')">🗑️</button>
            </div>
          </div>
          ${p.target_traits && p.target_traits.length > 0 ? `
          <div style="margin-top:16px;">
            <div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:8px;">Target Traits:</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">${p.target_traits.map(t => `<span class="tag tag-heirloom">${t}</span>`).join('')}</div>
          </div>` : ''}
          ${projectCrosses.length > 0 ? `
          <div style="margin-top:16px;">
            <div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:8px;">Cross Pollinations (${projectCrosses.length}):</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${projectCrosses.map(c => `<span style="font-size:0.8rem;padding:3px 8px;border-radius:4px;background:var(--green-bg);">${c.mother_designation} × ${c.father_designation || '?'} ${c.success === true ? '✅' : c.success === false ? '❌' : '⏳'}</span>`).join('')}
            </div>
          </div>` : ''}
        </div>
      `;
    }).join('')}
  `;
}

function projectForm(p) {
  return `
    <div class="form-group"><label class="form-label">Project Name *</label><input class="form-control" id="f-pname" value="${p ? p.name : ''}" placeholder="e.g. West Virginia Pepper"></div>
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-control" id="f-pdesc" rows="3">${p ? p.description || '' : ''}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Started Year</label><input class="form-control" id="f-pyear" type="number" value="${p ? p.started_year : new Date().getFullYear()}"></div>
      ${p ? `<div class="form-group"><label class="form-label">Status</label>
        <select class="form-control" id="f-status">
          <option value="active" ${p.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="complete" ${p.status === 'complete' ? 'selected' : ''}>Complete</option>
          <option value="paused" ${p.status === 'paused' ? 'selected' : ''}>Paused</option>
        </select>
      </div>` : ''}
    </div>
    <div class="form-group"><label class="form-label">Target Traits (comma separated)</label><input class="form-control" id="f-traits" value="${p && p.target_traits ? p.target_traits.join(', ') : ''}" placeholder="e.g. mild heat, thick walls"></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${p ? `submitEditProject('${p.code}')` : 'submitProject()'}">${p ? 'Save Changes' : 'Create Project'}</button>
    </div>
  `;
}

function showAddProject() { openModal('New Breeding Project', projectForm(null)); }
function showEditProject(code) { openModal('Edit Project — ' + code, projectForm(state.projects.find(x => x.code === code))); }

async function submitProject() {
  const name = document.getElementById('f-pname').value.trim();
  if (!name) return alert('Project name is required');
  const traitsRaw = document.getElementById('f-traits').value;
  const target_traits = traitsRaw ? traitsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const result = await api('/api/projects', 'POST', { name, description: document.getElementById('f-pdesc').value, started_year: document.getElementById('f-pyear').value, target_traits });
  closeModal(); await loadAll(); render();
  setTimeout(() => alert('✅ Project created!\nCode: ' + result.code), 100);
}

async function submitEditProject(code) {
  const traitsRaw = document.getElementById('f-traits').value;
  const target_traits = traitsRaw ? traitsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  await api('/api/projects/' + code, 'PUT', { name: document.getElementById('f-pname').value, description: document.getElementById('f-pdesc').value, target_traits, status: document.getElementById('f-status').value });
  closeModal(); await loadAll(); render();
}

async function deleteProject(code) {
  if (!confirm('Delete project ' + code + '? This cannot be undone.')) return;
  await api('/api/projects/' + code, 'DELETE'); await loadAll(); render();
}

function renderWeather() {
  const currentYear = new Date().getFullYear();
  const thisYearLog = state.weatherLog.filter(w => w.log_date && w.log_date.startsWith(currentYear.toString()));
  const avgHigh = thisYearLog.length > 0 ? Math.round(thisYearLog.reduce((s,w) => s + parseFloat(w.high_temp_f || 0), 0) / thisYearLog.length) : null;
  const avgLow = thisYearLog.length > 0 ? Math.round(thisYearLog.reduce((s,w) => s + parseFloat(w.low_temp_f || 0), 0) / thisYearLog.length) : null;
  const totalPrecip = thisYearLog.reduce((s,w) => s + parseFloat(w.precip_inches || 0), 0).toFixed(2);
  const frostDays = state.frostEvents.filter(f => f.year === currentYear && f.confirmed).length;

  // Calculate Growing Degree Days (base 50°F for most veg, from last frost date to today)
  const gddBase = 50;
  const lastFrostSetting = state.settings.last_frost_date;
  let gddStartDate = null;
  if (lastFrostSetting) {
    const [lm, ld] = lastFrostSetting.split('-').map(Number);
    gddStartDate = new Date(currentYear, lm - 1, ld);
  }
  const today = new Date();
  const gddLog = thisYearLog.filter(w => {
    if (!gddStartDate) return false;
    const d = new Date(w.log_date);
    return d >= gddStartDate && d <= today;
  });
  const totalGDD = Math.round(gddLog.reduce((s, w) => {
    const avg = (parseFloat(w.high_temp_f || 0) + parseFloat(w.low_temp_f || 0)) / 2;
    return s + Math.max(0, avg - gddBase);
  }, 0));
  const gddDaysLogged = gddLog.length;

  // GDD thresholds per crop with individual base temps
  // Base temp is the minimum temp at which that crop grows
  const gddCrops = [
    { name: 'Cucumbers', min: 800, max: 1200, icon: '🥒', base: 50 },
    { name: 'Tomatoes', min: 1000, max: 1400, icon: '🍅', base: 50 },
    { name: 'Peppers', min: 1200, max: 1600, icon: '🫑', base: 50 },
    { name: 'Beans', min: 600, max: 900, icon: '🫘', base: 50 },
    { name: 'Corn', min: 1200, max: 1800, icon: '🌽', base: 50 },
    { name: 'Squash', min: 800, max: 1200, icon: '🎃', base: 50 },
    { name: 'Carrots', min: 800, max: 1200, icon: '🥕', base: 40 },
    { name: 'Lettuce', min: 500, max: 900, icon: '🥬', base: 40 },
    { name: 'Spinach', min: 400, max: 800, icon: '🌿', base: 40 },
    { name: 'Peas', min: 600, max: 1000, icon: '🫛', base: 40 },
    { name: 'Onions', min: 700, max: 1100, icon: '🧅', base: 40 },
    { name: 'Melons', min: 1200, max: 1800, icon: '🍈', base: 50 },
  ];
  // Calculate per-crop GDD using each crop's own base temp
  const gddByBase = {};
  gddLog.forEach(function(w) {
    const high = parseFloat(w.high_temp_f || 0);
    const low = parseFloat(w.low_temp_f || 0);
    [40, 50].forEach(function(base) {
      if (!gddByBase[base]) gddByBase[base] = 0;
      gddByBase[base] += Math.max(0, ((high + low) / 2) - base);
    });
  });

  // Calculate personal frost averages
  const lastSpringFrosts = state.frostEvents.filter(f => f.event_type === 'last_spring' && f.confirmed);
  const firstFallFrosts = state.frostEvents.filter(f => f.event_type === 'first_fall' && f.confirmed);

  const avgLastFrost = lastSpringFrosts.length >= 2 ? (() => {
    const avgDoy = Math.round(lastSpringFrosts.reduce((s,f) => {
      const d = new Date(f.event_date);
      const start = new Date(d.getFullYear(), 0, 0);
      return s + Math.floor((d - start) / 86400000);
    }, 0) / lastSpringFrosts.length);
    const date = new Date(currentYear, 0, avgDoy);
    return date.toLocaleDateString('en-US', {month:'short', day:'numeric'});
  })() : null;

  const avgFirstFrost = firstFallFrosts.length >= 2 ? (() => {
    const avgDoy = Math.round(firstFallFrosts.reduce((s,f) => {
      const d = new Date(f.event_date);
      const start = new Date(d.getFullYear(), 0, 0);
      return s + Math.floor((d - start) / 86400000);
    }, 0) / firstFallFrosts.length);
    const date = new Date(currentYear, 0, avgDoy);
    return date.toLocaleDateString('en-US', {month:'short', day:'numeric'});
  })() : null;

  return `
    <div class="page-header">
      <h1 class="page-title">🌤️ Weather History</h1>
      <button class="btn btn-primary" onclick="showLogWeather()">+ Log Weather</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px;">
      <div class="stat-card" style="cursor:default;"><div class="stat-number">${thisYearLog.length}</div><div class="stat-label">Days Logged ${currentYear}</div></div>
      <div class="stat-card" style="cursor:default;"><div class="stat-number">${avgHigh !== null ? avgHigh + '°' : '—'}</div><div class="stat-label">Avg High ${currentYear}</div></div>
      <div class="stat-card" style="cursor:default;"><div class="stat-number">${totalPrecip}"</div><div class="stat-label">Total Rain ${currentYear}</div></div>
      <div class="stat-card" style="cursor:default;"><div class="stat-number">${frostDays}</div><div class="stat-label">Confirmed Frost Events ${currentYear}</div></div>
    </div>

    ${gddStartDate ? `
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div class="card-title" style="margin-bottom:0;">🌡️ Growing Degree Days (GDD)</div>
        <div style="font-size:0.8rem;color:var(--text-muted);">Base 50°F · From last frost date · ${gddDaysLogged} days of data</div>
      </div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center;margin-bottom:16px;">
        <div style="text-align:center;background:var(--green-bg);border-radius:12px;padding:16px 24px;">
          <div style="font-size:2rem;font-weight:800;color:var(--green-mid);">${totalGDD}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">GDD Accumulated</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          ${gddCrops.map(crop => {
            const cropGDD = Math.round(gddByBase[crop.base] || 0);
            const pct = Math.min(100, Math.round((cropGDD / crop.max) * 100));
            const done = cropGDD >= crop.max;
            const started = cropGDD >= crop.min;
            const color = done ? '#22c55e' : started ? '#f59e0b' : 'var(--green-mid)';
            const label = done ? 'Mature' : started ? 'Growing' : 'Building';
            return '<div style="background:var(--green-bg);border-radius:8px;padding:8px;">'
              + '<div style="font-size:0.8rem;font-weight:600;margin-bottom:4px;">' + crop.icon + ' ' + crop.name + '</div>'
              + '<div style="background:var(--border);border-radius:4px;height:6px;margin-bottom:4px;">'
              + '<div style="background:' + color + ';border-radius:4px;height:6px;width:' + pct + '%;transition:width 0.3s;"></div>'
              + '</div>'
              + '<div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-muted);">'
              + '<span style="color:' + color + ';">' + label + '</span>'
              + '<span>' + pct + '%</span>'
              + '</div>'
              + '</div>';
          }).join('')}
        </div>
      </div>
      ${gddDaysLogged === 0 ? '<div style="color:var(--text-muted);font-size:0.85rem;">No weather data logged since your last frost date. Log weather daily to track GDD accurately.</div>' : ''}
    </div>` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
      <div class="card">
        <div class="card-title">❄️ Frost History</div>
        ${state.frostEvents.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">No frost events recorded yet. Mark actual frost dates to build your personal average.</p>' : ''}
        ${avgLastFrost ? `<div style="margin-bottom:12px;padding:10px;background:var(--green-bg);border-radius:6px;">
          <div style="font-size:0.85rem;color:var(--text-muted);">Your personal last spring frost average</div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--green-mid);">${avgLastFrost}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Based on ${lastSpringFrosts.length} years of data</div>
        </div>` : '<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px;">Need 2+ years of data for personal average.</p>'}
        ${avgFirstFrost ? `<div style="margin-bottom:12px;padding:10px;background:var(--green-bg);border-radius:6px;">
          <div style="font-size:0.85rem;color:var(--text-muted);">Your personal first fall frost average</div>
          <div style="font-size:1.2rem;font-weight:700;color:#f59e0b;">${avgFirstFrost}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Based on ${firstFallFrosts.length} years of data</div>
        </div>` : ''}
        <div style="margin-top:12px;">
          <div style="font-weight:700;margin-bottom:8px;font-size:0.85rem;">Recorded Frost Events</div>
          ${state.frostEvents.map(f => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--green-bg);border-radius:6px;margin-bottom:4px;font-size:0.85rem;">
              <span>${f.year} — ${f.event_type === 'last_spring' ? '🌱 Last Spring Frost' : '❄️ First Fall Frost'}</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-weight:600;">${new Date(f.event_date).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</span>
                ${f.confirmed ? '<span style="color:#22c55e;font-size:0.75rem;">✅ Confirmed</span>' : '<span style="color:#f59e0b;font-size:0.75rem;">Estimated</span>'}
                <button class="btn btn-secondary btn-sm" style="padding:2px 6px;" onclick="showEditFrostEvent(${f.id}, ${f.year}, '${f.event_type}', '${f.event_date ? f.event_date.split('T')[0] : ''}', ${f.confirmed})">✏️</button>
                <button class="btn btn-danger btn-sm" style="padding:2px 6px;" onclick="deleteFrostEvent(${f.id})">🗑️</button>
              </div>
            </div>
          `).join('')}
          <button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="showLogFrostEvent()">+ Record Frost Event</button>
        </div>
      </div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div class="card-title" style="margin-bottom:0;">📊 Recent Weather Log</div>
          ${state.weatherLog.length > 10 ? `<button class="btn btn-secondary btn-sm" onclick="toggleWeatherLog()" id="weather-log-toggle">${state._showAllWeather ? 'Show Less' : 'View All (' + state.weatherLog.length + ')'}</button>` : ''}
        </div>
        ${(state._showAllWeather ? state.weatherLog : state.weatherLog.slice(0, 10)).map(w => `
          <div onclick="showWeatherDetail(${w.id})" style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:var(--green-bg);border-radius:6px;margin-bottom:4px;font-size:0.82rem;cursor:pointer;transition:opacity 0.15s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
            <div>
              <span style="font-weight:600;">${new Date(w.log_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</span>
              <span style="color:var(--text-muted);margin-left:6px;">${w.condition || ''}</span>
              ${w.source === 'manual' ? '<span style="color:var(--green-mid);font-size:0.72rem;margin-left:4px;">✏️</span>' : ''}
            </div>
            <div style="display:flex;gap:8px;color:var(--text-muted);align-items:center;">
              ${w.high_temp_f ? `<span>H:${Math.round(w.high_temp_f)}°</span>` : ''}
              ${w.low_temp_f ? `<span>L:${Math.round(w.low_temp_f)}°</span>` : ''}
              ${w.precip_inches > 0 ? `<span>🌧️${w.precip_inches}"</span>` : ''}
              <span style="color:var(--green-mid);font-size:0.75rem;">›</span>
            </div>
          </div>
        `).join('')}
        ${state.weatherLog.length === 0 ? '<p style="color:var(--text-muted);font-size:0.85rem;">No weather logged yet. Open the dashboard to auto-log today\'s weather.</p>' : ''}
      </div>
    </div>

    <div class="card">
      <div class="card-title">📈 Year Comparison</div>
      ${(() => {
        const years = [...new Set(state.weatherLog.map(w => w.log_date?.substring(0,4)))].filter(Boolean).sort((a,b) => b-a).slice(0,3);
        if (years.length < 2) return '<p style="color:var(--text-muted);font-size:0.85rem;">Need data from multiple years for comparison. Keep using SeedVault and this will fill in automatically.</p>';
        return '<div class="table-wrap"><table><thead><tr><th>Year</th><th>Days Logged</th><th>Avg High</th><th>Avg Low</th><th>Total Rain</th><th>Frost Days</th><th>Last Spring Frost</th><th>First Fall Frost</th></tr></thead><tbody>' +
          years.map(year => {
            const yLog = state.weatherLog.filter(w => w.log_date?.startsWith(year));
            const yAvgHigh = yLog.length > 0 ? Math.round(yLog.reduce((s,w) => s + parseFloat(w.high_temp_f||0), 0) / yLog.length) : null;
            const yAvgLow = yLog.length > 0 ? Math.round(yLog.reduce((s,w) => s + parseFloat(w.low_temp_f||0), 0) / yLog.length) : null;
            const yPrecip = yLog.reduce((s,w) => s + parseFloat(w.precip_inches||0), 0).toFixed(2);
            const yFrost = yLog.filter(w => parseFloat(w.low_temp_f) <= 32).length;
            const yLastSpring = state.frostEvents.find(f => f.year == year && f.event_type === 'last_spring');
            const yFirstFall = state.frostEvents.find(f => f.year == year && f.event_type === 'first_fall');
            return '<tr><td><strong>' + year + '</strong></td><td>' + yLog.length + '</td><td>' + (yAvgHigh !== null ? yAvgHigh + '°F' : '—') + '</td><td>' + (yAvgLow !== null ? yAvgLow + '°F' : '—') + '</td><td>' + yPrecip + '"</td><td>' + yFrost + '</td><td>' + (yLastSpring ? new Date(yLastSpring.event_date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—') + '</td><td>' + (yFirstFall ? new Date(yFirstFall.event_date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      })()}
    </div>
  `;
}

function toggleWeatherLog() {
  state._showAllWeather = !state._showAllWeather;
  const btn = document.getElementById('weather-log-toggle');
  if (btn) btn.textContent = state._showAllWeather ? 'Show Less' : 'View All (' + state.weatherLog.length + ')';
  const main = document.getElementById('main-content');
  if (main) main.innerHTML = renderWeather();
}

function showWeatherDetail(id) {
  const w = state.weatherLog.find(x => x.id === id);
  if (!w) return;
  const date = new Date(w.log_date).toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
  const rows = [
    ['Date', date],
    ['Condition', w.condition || '—'],
    ['High Temp', w.high_temp_f != null ? Math.round(w.high_temp_f) + '°F' : '—'],
    ['Low Temp', w.low_temp_f != null ? Math.round(w.low_temp_f) + '°F' : '—'],
    ['Humidity', w.humidity_pct != null ? w.humidity_pct + '%' : '—'],
    ['Precipitation', w.precip_inches != null && w.precip_inches > 0 ? w.precip_inches + '"' : '—'],
    ['Wind Speed', w.wind_mph != null ? w.wind_mph + ' mph' : '—'],
    ['Source', w.source === 'manual' ? '✏️ Manual entry' : '🌐 Auto-logged'],
    ['Notes', w.notes || '—'],
  ];
  openModal('🌤️ Weather — ' + new Date(w.log_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}), `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:16px;">
      ${rows.map(([label, val]) => `
        <div style="background:var(--green-bg);border-radius:8px;padding:10px 12px;">
          <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">${label}</div>
          <div style="font-weight:600;font-size:0.95rem;">${val}</div>
        </div>
      `).join('')}
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="closeModal();showEditWeatherLog(${w.id})">✏️ Edit</button>
    </div>
  `);
}

function showEditFrostEvent(id, year, event_type, event_date, confirmed) {
  openModal('Edit Frost Event', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Year</label><input class="form-control" id="f-fyear" type="number" value="${year}"></div>
      <div class="form-group"><label class="form-label">Event Type</label>
        <select class="form-control" id="f-ftype">
          <option value="last_spring" ${event_type === 'last_spring' ? 'selected' : ''}>🌱 Last Spring Frost</option>
          <option value="first_fall" ${event_type === 'first_fall' ? 'selected' : ''}>❄️ First Fall Frost</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date</label><input class="form-control" id="f-fdate" type="date" value="${event_date}"></div>
      <div class="form-group"><label class="form-label">Confirmed?</label>
        <select class="form-control" id="f-fconfirmed">
          <option value="true" ${confirmed ? 'selected' : ''}>✅ Yes — actual frost observed</option>
          <option value="false" ${!confirmed ? 'selected' : ''}>Estimated</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-fnotes" rows="2"></textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitFrostEventEdit()">Save Changes</button>
    </div>
  `);
}

async function submitFrostEventEdit() {
  await api('/api/frost-events', 'POST', {
    year: parseInt(document.getElementById('f-fyear').value),
    event_type: document.getElementById('f-ftype').value,
    event_date: document.getElementById('f-fdate').value,
    confirmed: document.getElementById('f-fconfirmed').value === 'true',
    notes: document.getElementById('f-fnotes').value
  });
  closeModal(); await loadAll(); render();
}

async function deleteFrostEvent(id) {
  if (!confirm('Delete this frost event?')) return;
  await api('/api/frost-events/' + id, 'DELETE');
  await loadAll(); render();
}

async function deleteWeatherLog(id) {
  if (!confirm('Delete this weather entry?')) return;
  await api('/api/weather/' + id, 'DELETE');
  await loadAll(); render();
}

function showLogWeather() {
  openModal('Log Weather', `
    <div class="alert alert-info">Weather is auto-logged daily from Open-Meteo. Use this to add manual observations or corrections.</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date *</label><input class="form-control" id="f-wdate" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Condition</label><input class="form-control" id="f-wcond" placeholder="e.g. Sunny, Rainy, Overcast"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">High Temp (°F)</label><input class="form-control" id="f-whigh" type="number" step="0.1"></div>
      <div class="form-group"><label class="form-label">Low Temp (°F)</label><input class="form-control" id="f-wlow" type="number" step="0.1"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Precipitation (inches)</label><input class="form-control" id="f-wprecip" type="number" step="0.01"></div>
      <div class="form-group"><label class="form-label">Wind Speed (mph)</label><input class="form-control" id="f-wwind" type="number" step="0.1"></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-wnotes" rows="2" placeholder="Hail, severe weather, notable events..."></textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitWeatherLog()">Log Weather</button>
    </div>
  `);
}

function showLogFrostEvent() {
  const currentYear = new Date().getFullYear();
  openModal('Record Frost Event', `
    <div class="alert alert-info">Record actual frost dates to build your personal frost date average over time.</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Year *</label><input class="form-control" id="f-fyear" type="number" value="${currentYear}"></div>
      <div class="form-group"><label class="form-label">Event Type *</label>
        <select class="form-control" id="f-ftype">
          <option value="last_spring">🌱 Last Spring Frost</option>
          <option value="first_fall">❄️ First Fall Frost</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Date *</label><input class="form-control" id="f-fdate" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Confirmed?</label>
        <select class="form-control" id="f-fconfirmed">
          <option value="true">✅ Yes — actual frost observed</option>
          <option value="false">Estimated</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-fnotes" rows="2" placeholder="Temperature, damage observed, source..."></textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitFrostEvent()">Record Event</button>
    </div>
  `);
}

async function submitWeatherLog() {
  const log_date = document.getElementById('f-wdate').value;
  if (!log_date) return alert('Date is required');
  await api('/api/weather', 'POST', {
    log_date,
    high_temp_f: document.getElementById('f-whigh').value || null,
    low_temp_f: document.getElementById('f-wlow').value || null,
    precip_inches: document.getElementById('f-wprecip').value || null,
    wind_speed_mph: document.getElementById('f-wwind').value || null,
    condition: document.getElementById('f-wcond').value,
    notes: document.getElementById('f-wnotes').value,
    source: 'manual'
  });
  closeModal(); await loadAll(); render();
}

async function submitFrostEvent() {
  const year = document.getElementById('f-fyear').value;
  const event_type = document.getElementById('f-ftype').value;
  const event_date = document.getElementById('f-fdate').value;
  if (!year || !event_type || !event_date) return alert('Year, type and date are required');
  await api('/api/frost-events', 'POST', {
    year: parseInt(year),
    event_type,
    event_date,
    confirmed: document.getElementById('f-fconfirmed').value === 'true',
    notes: document.getElementById('f-fnotes').value
  });
  closeModal(); await loadAll(); render();
  alert('✅ Frost event recorded! If confirmed, your frost date settings have been updated.');
}

function openResource(el) {
  var url = el.getAttribute('data-url');
  if (url) window.open(url, '_blank');
}

function renderResources() {
  const exchanges = [
    { name: 'Seed Savers Exchange', icon: '🌽', description: 'Americas largest heirloom seed library. Trade, buy, and preserve rare open-pollinated varieties. Nonprofit founded in 1975.', specialty: 'Heirloom & Heritage varieties', url: 'https://www.seedsavers.org', free: true },
    { name: "Baker Creek Rare Seeds", icon: '🌺', description: 'One of the largest selections of rare, open-pollinated, non-GMO heirloom seeds. Specializes in varieties from around the world.', specialty: 'Rare & International varieties', url: 'https://www.rareseeds.com', free: false },
    { name: 'Southern Exposure Seed Exchange', icon: '🌻', description: 'Focus on varieties suited to the mid-Atlantic and southeastern US. Excellent for heat-tolerant and disease-resistant varieties.', specialty: 'Southeast US adapted varieties', url: 'https://www.southernexposure.com', free: false },
    { name: 'High Mowing Organic Seeds', icon: '🥦', description: 'Certified organic seed producer in Vermont. All varieties are trialed on their farm. Excellent germination rates.', specialty: 'Certified organic seeds', url: 'https://www.highmowingseeds.com', free: false },
    { name: "Johnny's Selected Seeds", icon: '🥕', description: 'Employee-owned company with extensive variety trials. Excellent growing information and planting guides for every variety.', specialty: 'Trialed varieties with detailed info', url: 'https://www.johnnyseeds.com', free: false },
    { name: 'Burpee Seeds', icon: '🍅', description: 'One of the oldest seed companies in America. Wide selection of vegetable, herb, and flower seeds with detailed planting guides.', specialty: 'Wide variety selection', url: 'https://www.burpee.com', free: false },
    { name: 'r/SeedSwap', icon: '🤝', description: 'Active Reddit community for trading seeds with gardeners worldwide. Free to join. Great for finding rare varieties and connecting with other seed savers.', specialty: 'Free community seed trading', url: 'https://www.reddit.com/r/SeedSwap', free: true },
    { name: 'Growstuff', icon: '🌱', description: 'Open source food gardening community. Track your garden, connect with other gardeners, and find seeds to trade.', specialty: 'Community & tracking', url: 'https://www.growstuff.org', free: true },
    { name: 'Trade Winds Fruit', icon: '🍉', description: 'Specializes in rare tropical and subtropical fruit seeds. Excellent source for unusual varieties not found elsewhere.', specialty: 'Rare tropical varieties', url: 'https://www.tradewindsfruit.com', free: false },
    { name: 'Peaceful Valley Farm Supply', icon: '🌾', description: 'Organic seeds, cover crops, and farming supplies. Great resource for large garden and small farm needs.', specialty: 'Organic & cover crops', url: 'https://www.groworganic.com', free: false },
    { name: "Old Farmer's Almanac", icon: '📅', description: 'Comprehensive planting guides, frost date calculator, and gardening advice. Free resource for growing info on any vegetable or herb.', specialty: 'Planting guides & growing info', url: 'https://www.almanac.com/gardening', free: true },
    { name: 'National Gardening Association', icon: '🏡', description: 'Plant database, growing guides, and gardening community. Excellent reference for plant spacing, care, and companion planting.', specialty: 'Plant database & guides', url: 'https://garden.org', free: true },
  ];

  const cards = exchanges.map(function(e) {
    return '<div data-url="' + e.url + '" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;cursor:pointer;transition:opacity 0.15s;display:flex;flex-direction:column;gap:8px;" onclick="openResource(this)" onmouseover="this.style.opacity=\'0.8\'" onmouseout="this.style.opacity=\'1\'">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;">'
      + '<div style="font-size:2rem;">' + e.icon + '</div>'
      + (e.free ? '<span style="background:#166534;color:#86efac;font-size:0.7rem;padding:2px 8px;border-radius:20px;font-weight:600;">FREE</span>' : '')
      + '</div>'
      + '<div style="font-weight:700;font-size:1rem;">' + e.name + '</div>'
      + '<div style="font-size:0.75rem;color:var(--green-mid);font-weight:600;">' + e.specialty + '</div>'
      + '<div style="font-size:0.82rem;color:var(--text-muted);flex:1;">' + e.description + '</div>'
      + '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">' + e.url.replace('https://','') + '</div>'
      + '</div>';
  }).join('');

  return '<div class="page-header"><h1 class="page-title">🌐 Seed Resources</h1></div>'
    + '<div class="alert alert-info" style="margin-bottom:20px;">Click any card to visit that resource. These are trusted seed exchanges, suppliers, and gardening references used by the seed saving community.</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">' + cards + '</div>';
}


function renderSettings() {
  const isAdmin = getRole() === 'admin';
  const isDark = getTheme() === 'dark';
  return `
    <div class="page-header"><h1 class="page-title">⚙️ Settings</h1></div>
    <div class="card">
      <div class="settings-section-title">🎨 Appearance</div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Dark Mode</h4><p>Switch between light and dark theme.</p></div>
        <button class="btn ${isDark ? 'btn-primary' : 'btn-secondary'}" onclick="toggleTheme()">${isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}</button>
      </div>
    </div>
    <div class="card">
      <div class="settings-section-title">💾 Backup & Restore</div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Export ZIP Backup</h4><p>Download a full backup including all photos. Recommended.</p></div>
        <button class="btn btn-primary" onclick="exportZipBackup()">⬇️ Export ZIP</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Import ZIP Backup</h4><p>Restore from a ZIP backup including photos.</p></div>
        <button class="btn btn-secondary" onclick="triggerZipImport()">⬆️ Import ZIP</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Export JSON Backup</h4><p>Download data only backup without photos.</p></div>
        <button class="btn btn-secondary" onclick="exportBackup()">⬇️ Export JSON</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Export CSV</h4><p>Download all data as a CSV file.</p></div>
        <button class="btn btn-secondary" onclick="exportCSV()">⬇️ Export CSV</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Import JSON Backup</h4><p>Restore from a previously exported JSON backup.</p></div>
        <button class="btn btn-secondary" onclick="triggerImport()">⬆️ Import JSON</button>
      </div>
    </div>
    <div class="card">
      <div class="settings-section-title">🔒 Account</div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Change Password</h4><p>Update your SeedVault password.</p></div>
        <button class="btn btn-secondary" onclick="showChangePassword()">Change Password</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Sign Out</h4><p>Sign out of SeedVault on this device.</p></div>
        <button class="btn btn-danger" onclick="logout()">⏏️ Sign Out</button>
      </div>
      <div class="settings-row">

      </div>
    </div>
    <div class="card">
      <div class="settings-section-title">🌡️ Garden Location & Frost Dates</div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Zip Code</h4><p>Your zip code for weather and planting calculations.</p></div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input class="form-control" id="s-zipcode" style="width:100px;" value="${state.settings.zip_code || ''}" placeholder="e.g. 26301">
          <button class="btn btn-secondary" onclick="saveSetting('zip_code', document.getElementById('s-zipcode').value)">Save</button>
        </div>
      </div>
      <div class="settings-row">
        <div class="settings-row-info">
          <h4>OpenWeatherMap API Key</h4>
          <p>Optional — enables accurate live weather on dashboard. Free at <a href="https://openweathermap.org/api" target="_blank" style="color:var(--green-mid);">openweathermap.org</a>. Without this, weather widget is hidden.<br><span style="color:#f59e0b;font-size:0.8rem;">⚠️ New API keys take up to 2 hours to activate after creation.</span></p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input class="form-control" id="s-owmkey" style="width:220px;" value="${state.settings.openweather_api_key || ''}" placeholder="Paste API key here" type="password">
          <button class="btn btn-secondary" onclick="saveSetting('openweather_api_key', document.getElementById('s-owmkey').value)">Save</button>
        </div>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Last Spring Frost</h4><p>Average date of last spring frost. Used for planting windows.</p></div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input class="form-control" id="s-lastfrost" style="width:120px;" value="${state.settings.last_frost_date || ''}" placeholder="MM-DD e.g. 04-22">
          <button class="btn btn-secondary" onclick="saveFrostDate('last_frost_date', document.getElementById('s-lastfrost').value)">Save</button>
        </div>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>First Fall Frost</h4><p>Average date of first fall frost. Used for last planting date calculations.</p></div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input class="form-control" id="s-firstfrost" style="width:120px;" value="${state.settings.first_frost_date || ''}" placeholder="MM-DD e.g. 10-15">
          <button class="btn btn-secondary" onclick="saveFrostDate('first_frost_date', document.getElementById('s-firstfrost').value)">Save</button>
        </div>
      </div>
    </div>
    ${isAdmin ? `
    <div class="card">
      <div class="settings-section-title">👥 User Management</div>
      <div style="margin-bottom:16px;">
        <table style="width:100%;">
          <thead><tr><th>Username</th><th>Role</th><th>Last Login</th><th>Actions</th></tr></thead>
          <tbody>
            ${state.users.map(u => `<tr>
              <td><strong>${u.username}</strong></td>
              <td><span class="tag tag-${u.role === 'admin' ? 'active' : 'op'}">${u.role}</span></td>
              <td style="font-size:0.85rem;">${u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
              <td style="display:flex;gap:4px;">
                ${u.username !== localStorage.getItem('seedvault_username') ? `
                  <button class="btn btn-secondary btn-sm" onclick="toggleUserRole('${u.username}', '${u.role === 'admin' ? 'standard' : 'admin'}')">${u.role === 'admin' ? 'Make Standard' : 'Make Admin'}</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.username}')">🗑️</button>
                ` : '<span style="font-size:0.85rem;color:var(--text-muted);">You</span>'}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <button class="btn btn-primary btn-sm" onclick="showAddUser()">+ Add User</button>
    </div>` : ''}
    <div class="card">
      <div class="settings-section-title">🌿 Species Management</div>
      <div style="margin-bottom:16px;">
        <table style="width:100%;">
          <thead><tr><th>Code</th><th>Name</th><th>Varieties</th><th>Actions</th></tr></thead>
          <tbody>
            ${state.species.map(s => {
              const count = state.varieties.filter(v => v.species_code === s.code).length;
              return `<tr>
                <td><span class="designation">${s.code}</span></td>
                <td>${s.name}</td>
                <td><span class="gen-badge">${count}</span></td>
                <td style="display:flex;gap:4px;">
                  <button class="btn btn-secondary btn-sm" onclick="showEditSpecies('${s.code}', '${s.name}')">✏️ Edit</button>
                  ${count === 0 ? `<button class="btn btn-danger btn-sm" onclick="deleteSpecies('${s.code}')">🗑️</button>` : ''}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <button class="btn btn-primary btn-sm" onclick="showAddSpecies()">+ Add Species</button>
    </div>
    <div class="card">
      <div class="settings-section-title">🏪 Seed Sources</div>
      ${state.sources.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:16px;">No seed sources added yet.</p>' : `
      <div style="margin-bottom:16px;">
        <table style="width:100%;">
          <thead><tr><th>Name</th><th>Type</th><th>Rating</th><th>Website</th><th>Actions</th></tr></thead>
          <tbody>
            ${state.sources.map(s => `<tr>
              <td><strong>${s.name}</strong></td>
              <td>${s.type || '—'}</td>
              <td>${s.rating ? '⭐'.repeat(s.rating) : '—'}</td>
              <td>${s.website ? `<a href="${s.website}" target="_blank" style="color:var(--green-mid);font-size:0.85rem;">Visit</a>` : '—'}</td>
              <td style="display:flex;gap:4px;">
                <button class="btn btn-secondary btn-sm" onclick="showEditSource(${s.id})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteSource(${s.id})">🗑️</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
      <button class="btn btn-primary btn-sm" onclick="showAddSource()">+ Add Source</button>
    </div>
    <div class="card">
      <div class="settings-section-title">ℹ️ About SeedVault</div>
      <div class="settings-row"><div class="settings-row-info"><h4>Version</h4><p>SeedVault v1.2.3</p></div></div>
      <div class="settings-row"><div class="settings-row-info"><h4>Database Records</h4><p>${state.stats.varieties || 0} varieties · ${state.stats.seedLots || 0} seed lots · ${state.stats.activePlants || 0} plants this season · ${state.germination.length} germination tests · ${state.harvest.length} harvest records · ${state.amendments.length} amendments</p></div></div>
      <div class="settings-row"><div class="settings-row-info"><h4>Photos</h4><p>${state.plants.filter(p => p.photo_path).length} plant photos · ${state.seedLots.filter(l => l.packet_front_path || l.packet_back_path).length} seed packets with photos</p></div></div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Source Code</h4><p>github.com/Duhato/seedvault — AGPL-3.0 License</p></div>
        <a href="https://github.com/Duhato/seedvault" target="_blank" class="btn btn-secondary">View on GitHub</a>
      </div>
    </div>
    <div class="card">
      <div class="settings-section-title">🤖 AI Assistant</div>
      <div class="settings-row">
        <div class="settings-row-info">
          <h4>AI Provider</h4>
          <p>Connect an AI provider to enable growing info lookup, companion suggestions, pest identification, and season planning. Your key is stored locally and never shared.</p>
        </div>
      </div>
      <div style="padding:0 0 16px 0;">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Provider</label>
            <select class="form-control" id="ai-provider" onchange="toggleAIKeyField()">
              <option value="">— Disabled —</option>
              <option value="gemini" ${state.settings.ai_provider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
              <option value="openai" ${state.settings.ai_provider === 'openai' ? 'selected' : ''}>OpenAI ChatGPT</option>
              <option value="claude" ${state.settings.ai_provider === 'claude' ? 'selected' : ''}>Anthropic Claude</option>
              <option value="ollama" ${state.settings.ai_provider === 'ollama' ? 'selected' : ''}>Ollama (Local)</option>
            </select>
          </div>
          <div class="form-group" id="ai-key-group">
            <label class="form-label" id="ai-key-label">API Key</label>
            <input class="form-control" id="ai-key" type="password" placeholder="Paste your API key here" value="${state.settings.ai_api_key ? '••••••••••••••••' : ''}">
          </div>
        </div>
        <div class="form-group hidden" id="ai-ollama-group">
          <label class="form-label">Ollama URL</label>
          <input class="form-control" id="ai-ollama-url" type="text" placeholder="http://localhost:11434" value="${state.settings.ai_ollama_url || ''}">
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn btn-secondary" onclick="testAIConnection()">🔌 Test Connection</button>
          <button class="btn btn-primary" onclick="saveAISettings()">💾 Save AI Settings</button>
          ${state.settings.ai_provider ? '<button class="btn btn-danger btn-sm" onclick="removeAISettings()">Remove</button>' : ''}
        </div>
        ${state.settings.ai_provider ? '<div style="margin-top:8px;font-size:0.82rem;color:var(--green-mid);">✅ AI Assistant active — using ' + (state.settings.ai_provider === 'gemini' ? 'Google Gemini' : state.settings.ai_provider === 'openai' ? 'OpenAI ChatGPT' : state.settings.ai_provider === 'claude' ? 'Anthropic Claude' : 'Ollama (Local)') + '</div>' : ''}
      </div>

      <div class="settings-section-title">📊 Reports</div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Seed Inventory Report</h4><p>Print a full inventory of all your seed lots with quantities and viability.</p></div>
        <button class="btn btn-primary" onclick="printInventoryReport()">🖨️ Print Inventory</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Variety Performance Report</h4><p>Compare germination rates, harvest counts and plant performance by variety.</p></div>
        <button class="btn btn-secondary" onclick="printVarietyReport()">🖨️ Print Report</button>
      </div>
      <div class="settings-row">
        <div class="settings-row-info"><h4>Season Comparison Report</h4><p>Compare how each variety performed across multiple seasons — germination, harvest counts, seed saves.</p></div>
        <button class="btn btn-secondary" onclick="printSeasonComparisonReport()">🖨️ Print Report</button>
      </div>
      ${state.settings.ai_provider ? '<div class="settings-section-title">✨ AI Features</div><div class="settings-row"><div class="settings-row-info"><h4>Season Planner</h4><p>Get AI suggestions on what to start, transplant, and harvest based on your frost dates and seed vault.</p></div><button class="btn btn-secondary" onclick="showSeasonPlanner()">✨ Plan My Season</button></div><div class="settings-row"><div class="settings-row-info"><h4>Harvest Analysis</h4><p>AI reviews your harvest log and suggests which plants are best candidates for seed saving.</p></div><button class="btn btn-secondary" onclick="showHarvestAnalysis()">✨ Analyse Harvests</button></div>' : ''}
    </div>
  `;
}

async function lookupGrowingInfo(btn) {
  const variety = btn.getAttribute('data-variety');
  const preview = document.getElementById('ai-growing-preview');
  if (!preview) return;

  btn.textContent = '⏳ Looking up...';
  btn.disabled = true;
  preview.style.display = 'none';

  const prompt = 'Give me growing information for ' + variety + '. Respond with JSON only, no markdown, no explanation. Use exactly this structure: {"days_to_germination":"7-14","days_to_harvest":"50-70","planting_depth":"1/2 in","plant_spacing":"12 in","row_spacing":"36-60 in","min_soil_temp":"60","sun":"Full Sun","water":"Medium","frost_tolerance":"Tender — no frost","notes":"Brief growing tip"}. For sun use one of: Full Sun, Partial Sun, Partial Shade, Full Shade. For water use: Low, Medium, High. Keep values concise.';

  try {
    const result = await api('/api/ai/query', 'POST', { prompt });
    if (!result.response) throw new Error('No response');

    let data;
    try {
      const clean = stripJsonFences(result.response);
      data = JSON.parse(clean);
    } catch(e) { throw new Error('Could not parse AI response'); }

    // Show preview
    const fields = [
      ['Days to Germination', data.days_to_germination, 'f-dtg'],
      ['Days to Harvest', data.days_to_harvest, 'f-dth'],
      ['Planting Depth', data.planting_depth, 'f-depth'],
      ['Plant Spacing', data.plant_spacing, 'f-spacing'],
      ['Row Spacing', data.row_spacing, 'f-rowspacing'],
      ['Min Soil Temp', data.min_soil_temp, 'f-soiltemp'],
      ['Sun', data.sun, 'f-sun'],
      ['Water', data.water, 'f-water'],
      ['Frost Tolerance', data.frost_tolerance, 'f-frost'],
    ];

    const emptyFields = fields.filter(function(f) {
      const el = document.getElementById(f[2]);
      return el && !el.value && f[1];
    });

    if (emptyFields.length === 0) {
      preview.style.display = 'block';
      preview.innerHTML = '<div style="color:var(--green-mid);">✅ All growing info fields are already filled in.</div>';
      btn.textContent = '✨ Lookup Info';
      btn.disabled = false;
      return;
    }

    let previewHtml = '<div style="font-weight:600;margin-bottom:8px;">✨ AI found the following — click Apply to fill in empty fields only:</div>';
    previewHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:10px;">';
    emptyFields.forEach(function(f) {
      previewHtml += '<div style="font-size:0.8rem;"><span style="color:var(--text-muted);">' + f[0] + ':</span> <strong>' + f[1] + '</strong></div>';
    });
    previewHtml += '</div>';
    if (data.notes) previewHtml += '<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:10px;">💡 ' + data.notes + '</div>';
    previewHtml += '<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:10px;">⚠️ AI-generated info may not be exact for your specific variety. Always verify days to germination and harvest against your seed packet or supplier.</div>';
    window._aiGrowingData = data;
    previewHtml += '<div style="display:flex;gap:8px;">'
      + '<button class="btn btn-primary btn-sm" onclick="applyGrowingInfo()">✅ Apply to Empty Fields</button>'
      + '<button class="btn btn-secondary btn-sm" onclick="document.getElementById(&quot;ai-growing-preview&quot;).style.display=&quot;none&quot;">Dismiss</button>'
      + '</div>';

    preview.innerHTML = previewHtml;
    preview.style.display = 'block';

  } catch(err) {
    preview.style.display = 'block';
    preview.innerHTML = '<div style="color:#ef4444;">❌ Lookup failed: ' + err.message + '</div>';
  }

  btn.textContent = '✨ Lookup Info';
  btn.disabled = false;
}

function applyGrowingInfo() {
  var data = window._aiGrowingData;
  if (!data) return;
  const fieldMap = {
    'f-dtg': data.days_to_germination,
    'f-dth': data.days_to_harvest,
    'f-depth': data.planting_depth,
    'f-spacing': data.plant_spacing,
    'f-rowspacing': data.row_spacing,
    'f-soiltemp': data.min_soil_temp,
  };
  Object.keys(fieldMap).forEach(function(id) {
    const el = document.getElementById(id);
    if (el && !el.value && fieldMap[id]) el.value = fieldMap[id];
  });
  // Handle dropdowns
  ['f-sun', 'f-water', 'f-frost'].forEach(function(id) {
    const el = document.getElementById(id);
    const val = id === 'f-sun' ? data.sun : id === 'f-water' ? data.water : data.frost_tolerance;
    if (el && !el.value && val) {
      for (let i = 0; i < el.options.length; i++) {
        if (el.options[i].value === val || el.options[i].text === val) {
          el.value = el.options[i].value;
          break;
        }
      }
    }
  });
  document.getElementById('ai-growing-preview').style.display = 'none';
}

function showPestHelper(designation, varietyName) {
  if (!state.settings.ai_provider) return;
  var supportsVision = ['gemini', 'openai', 'claude'].includes(state.settings.ai_provider);
  var html = '<div class="alert alert-info" style="font-size:0.85rem;">Describe what you are seeing on your plant. ' + (supportsVision ? 'You can also upload a photo for better accuracy.' : '') + '</div>'
    + '<div class="form-group"><label class="form-label">What are you seeing?</label>'
    + '<textarea class="form-control" id="pest-description" rows="3" placeholder="e.g. Yellow spots on leaves, white powder on stems, holes in leaves, wilting despite watering..."></textarea></div>'
    + '<div class="form-group"><label class="form-label">Where on the plant?</label>'
    + '<select class="form-control" id="pest-location">'
    + '<option value="leaves">Leaves</option>'
    + '<option value="stems">Stems</option>'
    + '<option value="roots">Roots/Soil</option>'
    + '<option value="fruit">Fruit</option>'
    + '<option value="whole plant">Whole plant</option>'
    + '</select></div>'
    + (supportsVision ? '<div class="form-group"><label class="form-label">📷 Photo (optional — helps AI identify the problem)</label>'
    + '<input type="file" class="form-control" id="pest-photo" accept="image/*">'
    + '<div id="pest-photo-preview" style="margin-top:8px;display:none;"><img id="pest-photo-img" style="max-width:100%;max-height:200px;border-radius:8px;border:2px solid var(--border);"></div>'
    + '</div>' : '')
    + '<div id="pest-result" style="display:none;margin-top:12px;"></div>'
    + '<div class="form-actions">'
    + '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>'
    + '<button class="btn btn-primary" id="pest-submit-btn" onclick="submitPestHelper()">🔍 Identify Problem</button>'
    + '</div>';
  window._pestDesignation = designation;
  window._pestVarietyName = varietyName;
  openModal('🐛 Pest & Disease Helper — ' + varietyName, html);
  // Add photo preview listener after modal opens
  setTimeout(function() {
    var photoInput = document.getElementById('pest-photo');
    if (photoInput) {
      photoInput.addEventListener('change', function() {
        var file = this.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById('pest-photo-img').src = e.target.result;
          document.getElementById('pest-photo-preview').style.display = 'block';
          window._pestPhotoBase64 = e.target.result.split(',')[1];
          window._pestPhotoMime = file.type;
        };
        reader.readAsDataURL(file);
      });
    }
  }, 100);
  window._pestPhotoBase64 = null;
  window._pestPhotoMime = null;
}


async function submitPestHelper() {
  var designation = window._pestDesignation;
  var varietyName = window._pestVarietyName;
  const description = document.getElementById('pest-description').value.trim();
  const location = document.getElementById('pest-location').value;
  const result = document.getElementById('pest-result');
  if (!description && !window._pestPhotoBase64) { alert('Please describe what you are seeing or upload a photo'); return; }

  const btn = event.target;
  btn.textContent = '⏳ Analyzing...';
  btn.disabled = true;
  result.style.display = 'none';

  const prompt = 'I am growing ' + varietyName + ' and I am seeing the following on the ' + location + ': ' + description + '. Please identify the most likely pest or disease and provide treatment options. Respond with JSON only, no markdown. Use this structure: {"problem":"name of pest or disease","confidence":"High/Medium/Low","description":"brief description of the problem","organic_treatment":"organic treatment options","chemical_treatment":"chemical treatment if needed","prevention":"how to prevent in future","urgent":true/false}';

  try {
    const response = await api('/api/ai/query', 'POST', { prompt });
    if (!response.response) throw new Error('No response');
    const clean = stripJsonFences(response.response);
    const data = JSON.parse(clean);

    result.style.display = 'block';
    result.innerHTML = '<div style="background:var(--green-bg);border-radius:8px;padding:12px;">'
      + (data.urgent ? '<div style="color:#ef4444;font-weight:700;margin-bottom:8px;">⚠️ Act quickly — this problem can spread fast</div>' : '')
      + '<div style="font-size:1rem;font-weight:700;margin-bottom:4px;">' + data.problem + ' <span style="font-size:0.75rem;color:var(--text-muted);font-weight:400;">(' + data.confidence + ' confidence)</span></div>'
      + '<div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:10px;">' + data.description + '</div>'
      + '<div style="font-size:0.85rem;margin-bottom:6px;"><span style="color:#22c55e;font-weight:600;">🌿 Organic:</span> ' + data.organic_treatment + '</div>'
      + (data.chemical_treatment ? '<div style="font-size:0.85rem;margin-bottom:6px;"><span style="color:#f59e0b;font-weight:600;">⚗️ Chemical:</span> ' + data.chemical_treatment + '</div>' : '')
      + '<div style="font-size:0.85rem;margin-bottom:10px;"><span style="color:var(--green-mid);font-weight:600;">🛡️ Prevention:</span> ' + data.prevention + '</div>'
      + '<div style="font-size:0.75rem;color:var(--text-muted);border-top:1px solid var(--border);padding-top:8px;">⚠️ AI suggestions may not always be accurate. When in doubt consult your local extension office or a plant disease specialist before applying any treatment.</div>'
      + '</div>';
  } catch(err) {
    result.style.display = 'block';
    result.innerHTML = '<div style="color:#ef4444;">❌ Could not identify problem: ' + err.message + '</div>';
  }

  btn.textContent = '🔍 Identify Problem';
  btn.disabled = false;
}

function toggleAIKeyField() {
  const provider = document.getElementById('ai-provider').value;
  const keyGroup = document.getElementById('ai-key-group');
  const ollamaGroup = document.getElementById('ai-ollama-group');
  const keyLabel = document.getElementById('ai-key-label');
  if (provider === 'ollama') {
    keyGroup.classList.add('hidden');
    ollamaGroup.classList.remove('hidden');
  } else if (provider === '') {
    keyGroup.classList.add('hidden');
    ollamaGroup.classList.add('hidden');
  } else {
    keyGroup.classList.remove('hidden');
    ollamaGroup.classList.add('hidden');
    keyLabel.textContent = provider === 'gemini' ? 'Gemini API Key' : provider === 'openai' ? 'OpenAI API Key' : 'Anthropic API Key';
  }
}

async function saveAISettings() {
  const provider = document.getElementById('ai-provider').value;
  const key = document.getElementById('ai-key').value;
  const ollamaUrl = document.getElementById('ai-ollama-url')?.value || '';

  if (!provider) {
    await removeAISettings();
    return;
  }
  if (provider !== 'ollama' && (!key || key === '••••••••••••••••')) {
    alert('Please enter your API key');
    return;
  }

  await api('/api/settings', 'PUT', { key: 'ai_provider', value: provider });
  if (provider === 'ollama') {
    await api('/api/settings', 'PUT', { key: 'ai_ollama_url', value: ollamaUrl || 'http://localhost:11434' });
  } else if (key && key !== '••••••••••••••••') {
    await api('/api/settings', 'PUT', { key: 'ai_api_key', value: key });
  }
  await loadAll();
  render();
  alert('✅ AI settings saved!');
}

async function removeAISettings() {
  await api('/api/settings', 'PUT', { key: 'ai_provider', value: '' });
  await api('/api/settings', 'PUT', { key: 'ai_api_key', value: '' });
  await loadAll();
  render();
}

async function testAIConnection() {
  const provider = document.getElementById('ai-provider').value;
  const key = document.getElementById('ai-key').value;
  const ollamaUrl = document.getElementById('ai-ollama-url')?.value || '';

  if (!provider) { alert('Please select a provider first'); return; }
  if (provider !== 'ollama' && (!key || key === '••••••••••••••••')) {
    alert('Please enter your API key first'); return;
  }

  const btn = event.target;
  btn.textContent = 'Testing...';
  btn.disabled = true;

  try {
    const result = await api('/api/ai/test', 'POST', {
      provider,
      key: key === '••••••••••••••••' ? null : key,
      ollamaUrl
    });
    if (result.success) {
      alert('✅ Connection successful! AI Assistant is ready.');
    } else {
      alert('❌ Connection failed: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    alert('❌ Connection failed: ' + err.message);
  } finally {
    btn.textContent = '🔌 Test Connection';
    btn.disabled = false;
  }
}

function stripJsonFences(str) {
  if (!str) return '';
  return str.replace(/^[\s\S]*?({[\s\S]*})[\s\S]*$/, '$1').trim();
}

// Main AI query function — used by all AI features
async function queryAI(prompt) {
  if (!state.settings.ai_provider) return null;
  try {
    const result = await api('/api/ai/query', 'POST', { prompt });
    if (result.error) return null;
    return result.response;
  } catch (err) {
    return null;
  }
}

async function showSeasonPlanner() {
  if (!state.settings.ai_provider) return;
  openModal('✨ Season Planner', '<div style="text-align:center;padding:32px;"><div style="font-size:2rem;margin-bottom:12px;">🌱</div><div>Building your season plan...</div></div>');

  const lastFrost = state.settings.last_frost_date || 'unknown';
  const firstFrost = state.settings.first_frost_date || 'unknown';
  const location = state.settings.location_name || 'unknown location';
  const varieties = state.varieties.map(function(v) { return v.name + ' (' + v.species_code + ')'; }).join(', ');
  const seedLots = state.seedLots.filter(function(l) { return l.quantity_estimate > 0 || l.quantity_weight > 0; }).map(function(l) { return l.variety_name || l.variety_code; }).join(', ');
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const prompt = 'I am a home gardener in ' + location + '. Today is ' + today + '. My last spring frost date is ' + lastFrost + ' and first fall frost is ' + firstFrost + '. I grow these varieties: ' + (varieties || 'various vegetables') + '. I currently have seeds for: ' + (seedLots || 'various vegetables') + '. Give me a practical season planting plan for the next 8 weeks. Respond with JSON only, no markdown. Use this structure: {"summary":"2-3 sentence overview","weeks":[{"week":"Week 1 (dates)","start_indoors":["list of what to start indoors"],"direct_sow":["list of what to direct sow"],"transplant":["list of what to transplant out"],"harvest":["list of what may be ready"],"tasks":["other important tasks"]}],"tips":"2-3 important tips for this time of year"}. Include 8 weeks. Keep each list concise.';

  try {
    const response = await api('/api/ai/query', 'POST', { prompt });
    if (!response.response) throw new Error('No response');
    const clean = stripJsonFences(response.response);
    const data = JSON.parse(clean);

    var html = '<div style="background:var(--green-bg);border-radius:8px;padding:12px;margin-bottom:16px;font-size:0.85rem;">' + data.summary + '</div>';

    data.weeks.forEach(function(w) {
      html += '<div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">';
      html += '<div style="font-weight:700;margin-bottom:8px;color:var(--green-mid);">' + w.week + '</div>';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.82rem;">';
      if (w.start_indoors && w.start_indoors.length) html += '<div><div style="font-weight:600;color:#22c55e;">🌱 Start Indoors</div>' + w.start_indoors.map(function(x) { return '<div>' + x + '</div>'; }).join('') + '</div>';
      if (w.direct_sow && w.direct_sow.length) html += '<div><div style="font-weight:600;color:#22c55e;">🌿 Direct Sow</div>' + w.direct_sow.map(function(x) { return '<div>' + x + '</div>'; }).join('') + '</div>';
      if (w.transplant && w.transplant.length) html += '<div><div style="font-weight:600;color:#f59e0b;">🪴 Transplant</div>' + w.transplant.map(function(x) { return '<div>' + x + '</div>'; }).join('') + '</div>';
      if (w.harvest && w.harvest.length) html += '<div><div style="font-weight:600;color:#f97316;">🍅 Harvest</div>' + w.harvest.map(function(x) { return '<div>' + x + '</div>'; }).join('') + '</div>';
      if (w.tasks && w.tasks.length) html += '<div style="grid-column:span 2;"><div style="font-weight:600;color:var(--text-muted);">📋 Tasks</div>' + w.tasks.map(function(x) { return '<div>' + x + '</div>'; }).join('') + '</div>';
      html += '</div></div>';
    });

    if (data.tips) html += '<div style="background:var(--green-bg);border-radius:8px;padding:12px;font-size:0.82rem;color:var(--text-muted);">💡 ' + data.tips + '</div>';
    html += '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;">⚠️ AI suggestions are based on your frost dates and location. Always check local conditions before planting.</div>';
    html += '<div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>';

    const modal = document.querySelector('.modal-body') || document.querySelector('.modal-content');
    if (modal) modal.innerHTML = html;
  } catch(err) {
    const modal = document.querySelector('.modal-body') || document.querySelector('.modal-content');
    if (modal) modal.innerHTML = '<div style="color:#ef4444;padding:16px;">❌ Could not generate plan: ' + err.message + '</div><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>';
  }
}

async function showHarvestAnalysis() {
  if (!state.settings.ai_provider) return;
  if (!state.harvest || state.harvest.length === 0) {
    alert('No harvest data yet. Log some harvests first and come back!');
    return;
  }
  openModal('✨ Harvest Analysis', '<div style="text-align:center;padding:32px;"><div style="font-size:2rem;margin-bottom:12px;">🍅</div><div>Analysing your harvest data...</div></div>');

  var harvestSummary = state.harvest.slice(0, 30).map(function(h) {
    return h.plant_designation + ': ' + (h.fruit_weight_oz ? h.fruit_weight_oz + 'oz' : '') + ' ' + (h.seed_count ? h.seed_count + ' seeds' : '') + ' condition:' + (h.condition || 'unknown');
  }).join('; ');

  var plants = state.plants.filter(function(p) { return p.selected_for_seed; }).map(function(p) { return p.designation; }).join(', ');

  const prompt = 'I am a seed saver. Here is my harvest log data: ' + harvestSummary + '. Plants already selected for seed saving: ' + (plants || 'none yet') + '. Based on this data, which plants look like the best candidates for seed saving and why? Also flag any concerns. Respond with JSON only, no markdown. Use this structure: {"summary":"overall assessment","top_candidates":[{"plant":"designation","reason":"why its a good seed saver","score":"Excellent/Good/Fair"}],"concerns":[{"plant":"designation","issue":"what to watch"}],"general_tips":"seed saving advice based on this harvest data"}';

  try {
    const response = await api('/api/ai/query', 'POST', { prompt });
    if (!response.response) throw new Error('No response');
    const clean = stripJsonFences(response.response);
    const data = JSON.parse(clean);

    var html = '<div style="background:var(--green-bg);border-radius:8px;padding:12px;margin-bottom:16px;font-size:0.85rem;">' + data.summary + '</div>';

    if (data.top_candidates && data.top_candidates.length) {
      html += '<div style="font-weight:700;color:#22c55e;margin-bottom:8px;">⭐ Top Seed Saving Candidates</div>';
      data.top_candidates.forEach(function(c) {
        var scoreColor = c.score === 'Excellent' ? '#22c55e' : c.score === 'Good' ? '#f59e0b' : 'var(--text-muted)';
        html += '<div style="padding:10px;background:var(--green-bg);border-radius:6px;margin-bottom:6px;border-left:3px solid ' + scoreColor + ';">'
          + '<div style="font-weight:600;font-size:0.85rem;">' + c.plant + ' <span style="color:' + scoreColor + ';font-size:0.75rem;">(' + c.score + ')</span></div>'
          + '<div style="font-size:0.8rem;color:var(--text-muted);">' + c.reason + '</div>'
          + '</div>';
      });
    }

    if (data.concerns && data.concerns.length) {
      html += '<div style="font-weight:700;color:#f59e0b;margin:12px 0 8px;">⚠️ Concerns</div>';
      data.concerns.forEach(function(c) {
        html += '<div style="padding:8px;background:var(--green-bg);border-radius:6px;margin-bottom:4px;border-left:3px solid #f59e0b;">'
          + '<div style="font-weight:600;font-size:0.85rem;">' + c.plant + '</div>'
          + '<div style="font-size:0.8rem;color:var(--text-muted);">' + c.issue + '</div>'
          + '</div>';
      });
    }

    if (data.general_tips) html += '<div style="background:var(--green-bg);border-radius:8px;padding:12px;font-size:0.82rem;color:var(--text-muted);margin-top:12px;">💡 ' + data.general_tips + '</div>';
    html += '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;">⚠️ AI analysis is based on your logged harvest data. Use your own judgement when selecting plants for seed saving.</div>';
    html += '<div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>';

    const modal = document.querySelector('.modal-body') || document.querySelector('.modal-content');
    if (modal) modal.innerHTML = html;
  } catch(err) {
    const modal = document.querySelector('.modal-body') || document.querySelector('.modal-content');
    if (modal) modal.innerHTML = '<div style="color:#ef4444;padding:16px;">❌ Could not analyse harvests: ' + err.message + '</div><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>';
  }
}

function printSeasonComparisonReport() {
  const varieties = state.varieties;
  const seedLots = state.seedLots;
  const plants = state.plants;
  const germTests = state.germination || [];
  const harvest = state.harvestLog || [];

  // Build per-variety per-year data
  const data = {};
  for (const v of varieties) {
    const lots = seedLots.filter(l => l.variety_code === v.code);
    const allPlants = plants.filter(p => lots.some(l => l.designation === p.seed_lot_designation));
    if (allPlants.length === 0) continue;

    const years = [...new Set(allPlants.map(p => p.season_year))].filter(Boolean).sort((a,b) => b - a);
    data[v.code] = { variety: v, years: {} };

    for (const year of years) {
      const yPlants = allPlants.filter(p => p.season_year == year);
      const yLots = lots.filter(l => l.year_saved == year);
      const yHarvest = harvest.filter(h => yPlants.some(p => p.designation === h.plant_designation));
      const yGerm = germTests.filter(g => lots.some(l => l.designation === g.seed_lot_designation && l.year_saved == year));
      const seedSaved = yPlants.filter(p => p.selected_for_seed).length;
      const avgGerm = yGerm.length > 0
        ? Math.round(yGerm.reduce((s, g) => s + (g.seeds_germinated && g.seeds_planted ? (g.seeds_germinated / g.seeds_planted * 100) : 0), 0) / yGerm.length)
        : null;
      const totalFruit = yHarvest.reduce((s, h) => s + (parseInt(h.fruit_count || h.seed_count) || 0), 0);
      const avgWeight = yHarvest.length > 0
        ? (yHarvest.reduce((s, h) => s + parseFloat(h.fruit_weight_oz || 0), 0) / yHarvest.length).toFixed(1)
        : null;

      data[v.code].years[year] = {
        plants: yPlants.length,
        seedSaved,
        germRate: avgGerm,
        harvestEntries: yHarvest.length,
        totalFruit,
        avgWeightOz: avgWeight,
        lots: yLots.length,
      };
    }
  }

  const allYears = [...new Set(Object.values(data).flatMap(d => Object.keys(d.years)))].sort((a,b) => b - a);

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>SeedVault Season Comparison</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a; }
      h1 { color: #2d5a27; margin-bottom: 4px; }
      h2 { color: #2d5a27; margin: 24px 0 8px; border-bottom: 2px solid #2d5a27; padding-bottom: 4px; font-size: 13pt; }
      .subtitle { color: #666; font-size: 10pt; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 8px; }
      th { background: #2d5a27; color: white; padding: 6px 8px; text-align: left; }
      th.year { text-align: center; }
      td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
      td.year-cell { text-align: center; }
      tr:nth-child(even) td { background: #f9f9f9; }
      .good { color: #22c55e; font-weight: bold; }
      .warning { color: #f59e0b; font-weight: bold; }
      .none { color: #bbb; }
      .seed-saved { color: #22c55e; }
      .footer { margin-top: 20px; font-size: 8pt; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
      @media print { body { padding: 10px; } }
    </style>
    </head><body>
    <h1>🌱 SeedVault — Season Comparison Report</h1>
    <div class="subtitle">Generated ${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</div>

    ${Object.values(data).map(({ variety, years }) => {
      const yKeys = Object.keys(years).sort((a,b) => b - a);
      if (yKeys.length === 0) return '';
      return `
        <h2>${variety.name} <span style="font-weight:normal;font-size:10pt;color:#666;">(${variety.code})</span></h2>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              ${yKeys.map(y => `<th class="year">${y}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr><td>Plants grown</td>${yKeys.map(y => `<td class="year-cell">${years[y].plants}</td>`).join('')}</tr>
            <tr><td>Selected for seed save</td>${yKeys.map(y => `<td class="year-cell ${years[y].seedSaved > 0 ? 'seed-saved' : ''}">${years[y].seedSaved > 0 ? '✔ ' + years[y].seedSaved : '—'}</td>`).join('')}</tr>
            <tr><td>Germination rate</td>${yKeys.map(y => `<td class="year-cell ${years[y].germRate !== null ? (years[y].germRate >= 75 ? 'good' : 'warning') : ''}">${years[y].germRate !== null ? years[y].germRate + '%' : '—'}</td>`).join('')}</tr>
            <tr><td>Harvest log entries</td>${yKeys.map(y => `<td class="year-cell">${years[y].harvestEntries || '—'}</td>`).join('')}</tr>
            <tr><td>Avg fruit weight (oz)</td>${yKeys.map(y => `<td class="year-cell">${years[y].avgWeightOz > 0 ? years[y].avgWeightOz + ' oz' : '—'}</td>`).join('')}</tr>
            <tr><td>Seed lots saved</td>${yKeys.map(y => `<td class="year-cell">${years[y].lots || '—'}</td>`).join('')}</tr>
          </tbody>
        </table>
      `;
    }).join('')}

    ${Object.keys(data).length === 0 ? '<p style="color:#999;">No multi-season data yet. Keep growing and this report will fill in automatically.</p>' : ''}
    <div class="footer">SeedVault · Printed ${new Date().toLocaleString()}</div>
    </body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

function printInventoryReport() {
  const currentYear = new Date().getFullYear();
  const viabilityYears = { CUC: 5, TOM: 4, PEP: 3, CAR: 3, BEAN: 3, LETT: 3, SPIN: 3, CORN: 2, ONI: 1, PEA: 3, SQUA: 4, MELO: 5, HERB: 3 };
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>SeedVault Inventory</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a; }
      h1 { color: #2d5a27; margin-bottom: 4px; }
      h2 { color: #2d5a27; margin: 20px 0 10px; border-bottom: 2px solid #2d5a27; padding-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 16px; }
      th { background: #2d5a27; color: white; padding: 6px 8px; text-align: left; }
      td { padding: 5px 8px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) td { background: #f9f9f9; }
      .good { color: #22c55e; font-weight: bold; }
      .warning { color: #f59e0b; font-weight: bold; }
      .expired { color: #ef4444; font-weight: bold; }
      .footer { margin-top: 20px; font-size: 8pt; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
    </style></head><body>
    <h1>🌱 SeedVault — Seed Inventory</h1>
    <p style="color:#666;font-size:9pt;">Generated ${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
    <table>
      <thead><tr><th>Designation</th><th>Variety</th><th>Gen</th><th>Year</th><th>Quantity</th><th>Storage</th><th>Germ Rate</th><th>Viability</th><th>Notes</th></tr></thead>
      <tbody>
        ${state.inventory.map(lot => {
          const maxYears = viabilityYears[lot.species_code] || 3;
          const yearsLeft = maxYears - (currentYear - lot.year_saved);
          const viabilityClass = yearsLeft <= 0 ? 'expired' : yearsLeft <= 1 ? 'warning' : 'good';
          const viabilityText = yearsLeft <= 0 ? 'Expired' : yearsLeft <= 1 ? 'Expiring soon' : yearsLeft + ' years left';
          const qty = lot.quantity_unit === 'seeds' || !lot.quantity_unit
            ? (lot.quantity_estimate ? lot.quantity_estimate + ' seeds' : '—')
            : (lot.quantity_weight ? (parseFloat(lot.quantity_weight) % 1 === 0 ? parseInt(lot.quantity_weight) : parseFloat(lot.quantity_weight)) + lot.quantity_unit : '—');
          return '<tr><td><code>' + lot.designation + '</code></td><td>' + (lot.variety_name || lot.variety_code) + '</td><td>G' + lot.generation + '</td><td>' + lot.year_saved + '</td><td>' + qty + '</td><td>' + (lot.storage_location || '—') + '</td><td>' + (lot.germination_rate ? lot.germination_rate + '%' : '—') + '</td><td class="' + viabilityClass + '">' + viabilityText + '</td><td style="font-size:8pt;max-width:150px;">' + (lot.notes ? lot.notes.substring(0, 60) : '—') + '</td></tr>';
        }).join('')}
      </tbody>
    </table>
    <div class="footer">SeedVault v1.1.1 · github.com/Duhato/seedvault · ${new Date().toISOString()}</div>
    <script>setTimeout(() => window.print(), 400);</script>
    </body></html>
  `);
  printWindow.document.close();
}

function printVarietyReport() {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>SeedVault Variety Performance</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a; }
      h1 { color: #2d5a27; margin-bottom: 4px; }
      h2 { color: #2d5a27; margin: 20px 0 10px; border-bottom: 2px solid #2d5a27; padding-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 16px; }
      th { background: #2d5a27; color: white; padding: 6px 8px; text-align: left; }
      td { padding: 5px 8px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) td { background: #f9f9f9; }
      .footer { margin-top: 20px; font-size: 8pt; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
    </style></head><body>
    <h1>🌱 SeedVault — Variety Performance Report</h1>
    <p style="color:#666;font-size:9pt;">Generated ${new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
    <table>
      <thead><tr><th>Variety</th><th>Code</th><th>Species</th><th>Type</th><th>Seed Lots</th><th>Plants Grown</th><th>Best Germ Rate</th><th>Harvests</th><th>Seeds Harvested</th></tr></thead>
      <tbody>
        ${state.varieties.map(v => {
          const lots = state.seedLots.filter(l => l.variety_code === v.code);
          const totalPlants = state.plants.filter(p => lots.some(l => l.designation === p.seed_lot_designation)).length;
          const bestGerm = lots.reduce((best, l) => l.germination_rate ? Math.max(best, l.germination_rate) : best, 0);
          const harvests = state.harvest.filter(h => {
            const plant = state.plants.find(p => p.designation === h.plant_designation);
            return plant && lots.some(l => l.designation === plant.seed_lot_designation);
          });
          const totalSeeds = harvests.reduce((sum, h) => sum + (h.seed_count || 0), 0);
          return '<tr><td><strong>' + v.name + '</strong></td><td><code>' + v.code + '</code></td><td>' + (v.species_name || v.species_code) + '</td><td>' + v.type + '</td><td>' + lots.length + '</td><td>' + totalPlants + '</td><td>' + (bestGerm > 0 ? bestGerm + '%' : '—') + '</td><td>' + harvests.length + '</td><td>' + (totalSeeds > 0 ? totalSeeds : '—') + '</td></tr>';
        }).join('')}
      </tbody>
    </table>
    <div class="footer">SeedVault v1.1.1 · github.com/Duhato/seedvault · ${new Date().toISOString()}</div>
    <script>setTimeout(() => window.print(), 400);</script>
    </body></html>
  `);
  printWindow.document.close();
}

async function saveFrostDate(key, value) {
  // Normalize to MM-DD format
  if (value) {
    const parts = value.split('-');
    if (parts.length === 2) {
      value = parts[0].padStart(2,'0') + '-' + parts[1].padStart(2,'0');
    }
  }
  await saveSetting(key, value);
}

async function saveSetting(key, value) {
  await api('/api/settings', 'PUT', { key, value });
  await loadAll();
  render();
  alert('✅ Setting saved!');
}

function showAddUser() {
  openModal('Add User', `
    <div class="form-group"><label class="form-label">Username *</label><input class="form-control" id="f-uname" placeholder="e.g. Jess"></div>
    <div class="form-group"><label class="form-label">Password *</label><input class="form-control" id="f-upw" type="password" placeholder="Min 8 characters"></div>
    <div class="form-group"><label class="form-label">Role</label>
      <select class="form-control" id="f-urole">
        <option value="standard">Standard</option>
        <option value="admin">Admin</option>
      </select>
    </div>
    <div id="user-error" class="alert alert-danger hidden"></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitAddUser()">Add User</button>
    </div>
  `);
}

async function submitAddUser() {
  const username = document.getElementById('f-uname').value.trim();
  const password = document.getElementById('f-upw').value;
  const role = document.getElementById('f-urole').value;
  const errEl = document.getElementById('user-error');
  errEl.classList.add('hidden');
  if (!username || !password) { errEl.textContent = 'Username and password required'; errEl.classList.remove('hidden'); return; }
  if (password.length < 8) { errEl.textContent = 'Password must be at least 8 characters'; errEl.classList.remove('hidden'); return; }
  const result = await api('/api/users', 'POST', { username, password, role });
  if (result.error) { errEl.textContent = result.error; errEl.classList.remove('hidden'); return; }
  closeModal(); await loadAll(); render();
  alert('✅ User ' + username + ' created successfully!');
}

async function deleteUser(username) {
  if (!confirm('Delete user ' + username + '? This cannot be undone.')) return;
  const result = await api('/api/users/' + username, 'DELETE');
  if (result.error) return alert('Error: ' + result.error);
  await loadAll(); render();
}

async function toggleUserRole(username, newRole) {
  if (!confirm('Change ' + username + ' to ' + newRole + '?')) return;
  await api('/api/users/' + username + '/role', 'PUT', { role: newRole });
  await loadAll(); render();
}

function showChangePassword() {
  openModal('Change Password', `
    <div class="form-group"><label class="form-label">Current Password</label><input class="form-control" id="f-curpw" type="password"></div>
    <div class="form-group"><label class="form-label">New Password</label><input class="form-control" id="f-newpw" type="password" placeholder="Min 8 characters"></div>
    <div class="form-group"><label class="form-label">Confirm New Password</label><input class="form-control" id="f-confirmpw" type="password"></div>
    <div id="pw-error" class="alert alert-danger hidden"></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitChangePassword()">Change Password</button>
    </div>
  `);
}

async function submitChangePassword() {
  const currentPassword = document.getElementById('f-curpw').value;
  const newPassword = document.getElementById('f-newpw').value;
  const confirm = document.getElementById('f-confirmpw').value;
  const errEl = document.getElementById('pw-error');
  errEl.classList.add('hidden');
  if (newPassword.length < 8) { errEl.textContent = 'Password must be at least 8 characters'; errEl.classList.remove('hidden'); return; }
  if (newPassword !== confirm) { errEl.textContent = 'Passwords do not match'; errEl.classList.remove('hidden'); return; }
  const result = await api('/api/auth/change-password', 'POST', { currentPassword, newPassword });
  if (result.error) { errEl.textContent = result.error; errEl.classList.remove('hidden'); return; }
  closeModal(); alert('✅ Password changed successfully!');
}

function showAddSpecies() {
  openModal('Add Species', `
    <div class="form-row">
      <div class="form-group"><label class="form-label">Code *</label><input class="form-control" id="f-scode" placeholder="e.g. HERB" maxlength="10"></div>
      <div class="form-group"><label class="form-label">Name *</label><input class="form-control" id="f-sname" placeholder="e.g. Herb"></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitAddSpecies()">Add Species</button>
    </div>
  `);
}

function showEditSpecies(code, name) {
  openModal('Edit Species — ' + code, `
    <div class="form-group"><label class="form-label">Name *</label><input class="form-control" id="f-sname" value="${name}"></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitEditSpecies('${code}')">Save Changes</button>
    </div>
  `);
}

async function submitAddSpecies() {
  const code = document.getElementById('f-scode').value.trim().toUpperCase();
  const name = document.getElementById('f-sname').value.trim();
  if (!code || !name) return alert('Code and name are required');
  await api('/api/species', 'POST', { code, name }); closeModal(); await loadAll(); render();
}

async function submitEditSpecies(code) {
  const name = document.getElementById('f-sname').value.trim();
  if (!name) return alert('Name is required');
  await api('/api/species/' + code, 'PUT', { name }); closeModal(); await loadAll(); render();
}

async function deleteSpecies(code) {
  if (!confirm('Delete species ' + code + '? This cannot be undone.')) return;
  const result = await api('/api/species/' + code, 'DELETE');
  if (result.error) return alert('Error: ' + result.error);
  await loadAll(); render();
}

function sourceForm(s) {
  const types = ['commercial', 'local greenhouse', 'seed swap', 'saved', 'online', 'other'];
  return `
    <div class="form-group"><label class="form-label">Source Name *</label><input class="form-control" id="f-sname" value="${s ? s.name : ''}" placeholder="e.g. Burpee"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Type</label>
        <select class="form-control" id="f-stype">
          ${types.map(t => `<option value="${t}" ${s && s.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Rating (1-5 ⭐)</label>
        <select class="form-control" id="f-srating">
          <option value="">No rating</option>
          ${[1,2,3,4,5].map(n => `<option value="${n}" ${s && s.rating === n ? 'selected' : ''}>${'⭐'.repeat(n)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Website</label><input class="form-control" id="f-swebsite" value="${s ? s.website || '' : ''}" placeholder="https://..."></div>
    <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="f-snotes" rows="2">${s ? s.notes || '' : ''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="${s ? `submitEditSource(${s.id})` : 'submitSource()'}">${s ? 'Save Changes' : 'Add Source'}</button>
    </div>
  `;
}

function showAddSource() { openModal('Add Seed Source', sourceForm(null)); }
function showEditSource(id) { openModal('Edit Seed Source', sourceForm(state.sources.find(x => x.id === id))); }

async function submitSource() {
  const name = document.getElementById('f-sname').value.trim();
  if (!name) return alert('Name is required');
  await api('/api/sources', 'POST', { name, type: document.getElementById('f-stype').value, rating: document.getElementById('f-srating').value || null, website: document.getElementById('f-swebsite').value, notes: document.getElementById('f-snotes').value });
  closeModal(); await loadAll(); render();
}

async function submitEditSource(id) {
  const name = document.getElementById('f-sname').value.trim();
  if (!name) return alert('Name is required');
  await api('/api/sources/' + id, 'PUT', { name, type: document.getElementById('f-stype').value, rating: document.getElementById('f-srating').value || null, website: document.getElementById('f-swebsite').value, notes: document.getElementById('f-snotes').value });
  closeModal(); await loadAll(); render();
}

async function deleteSource(id) {
  if (!confirm('Delete this seed source? This cannot be undone.')) return;
  await api('/api/sources/' + id, 'DELETE'); await loadAll(); render();
}

async function exportZipBackup() {
  try {
    const res = await fetch('/api/backup/export-zip', { headers: { 'Authorization': 'Bearer ' + getToken() } });
    if (!res.ok) { alert('Export failed'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'seedvault-backup-' + new Date().toISOString().split('T')[0] + '.zip'; a.click();
    URL.revokeObjectURL(url);
    await recordBackupDate();
  } catch (err) { alert('Export failed: ' + err.message); }
}

function triggerZipImport() { document.getElementById('import-zip-input').click(); }

async function handleZipImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.name.endsWith('.zip')) { alert('Please select a .zip backup file'); return; }
  openModal('Import ZIP Backup', `
    <div class="alert alert-warn">⚠️ This will import all data and photos from the backup. Existing records will be skipped.</div>
    <div style="background:var(--green-bg);padding:12px;border-radius:8px;margin-bottom:16px;">
      <div style="font-size:0.9rem;">File: <strong>${file.name}</strong></div>
      <div style="font-size:0.85rem;color:var(--text-muted);">Size: ${(file.size / 1024 / 1024).toFixed(1)} MB</div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="confirm-zip-import-btn">✅ Import</button>
    </div>
  `);
  document.getElementById('confirm-zip-import-btn').onclick = async () => {
    closeModal();
    const formData = new FormData();
    formData.append('backup', file);
    try {
      const res = await fetch('/api/backup/import-zip', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + getToken() },
        body: formData
      });
      const result = await res.json();
      if (result.error) { alert('Import failed: ' + result.error); return; }
      await loadAll(); render();
      setTimeout(() => alert('✅ ZIP Import complete!\n\nImported:\n  Varieties: ' + result.imported.varieties + '\n  Seed Lots: ' + result.imported.seed_lots + '\n  Plants: ' + result.imported.plants + '\n  Photos restored from ZIP'), 100);
    } catch (err) { alert('Import failed: ' + err.message); }
  };
  e.target.value = '';
}

async function exportBackup() {
  try {
    const res = await fetch('/api/backup/export', { headers: { 'Authorization': 'Bearer ' + getToken() } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'seedvault-backup-' + new Date().toISOString().split('T')[0] + '.json'; a.click();
    URL.revokeObjectURL(url);
    await recordBackupDate();
  } catch (err) { alert('Export failed: ' + err.message); }
}

async function recordBackupDate() {
  try {
    await api('/api/settings', 'PUT', { key: 'last_backup_date', value: new Date().toISOString().split('T')[0] });
    state.settings.last_backup_date = new Date().toISOString().split('T')[0];
    render();
  } catch(e) { console.warn('Could not record backup date', e); }
}

async function exportCSV() {
  try {
    const res = await fetch('/api/backup/export-csv', { headers: { 'Authorization': 'Bearer ' + getToken() } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'seedvault-export-' + new Date().toISOString().split('T')[0] + '.csv'; a.click();
    URL.revokeObjectURL(url);
  } catch (err) { alert('CSV export failed: ' + err.message); }
}

function triggerImport() { document.getElementById('import-file-input').click(); }

async function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    if (backup.app !== 'SeedVault') return alert('❌ Not a valid SeedVault backup file.');
    const preview = await api('/api/backup/preview', 'POST', backup);
    const backupData = backup;
    openModal('Import Backup — Preview', `
      <div class="alert alert-warn">⚠️ Existing records will be skipped. New records will be added.</div>
      <div style="background:var(--green-bg);border-radius:8px;padding:16px;margin-bottom:16px;">
        <table style="width:100%;font-size:0.9rem;">
          <tr><td style="padding:4px 0;"><strong>Species</strong></td><td>${preview.species || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Varieties</strong></td><td>${preview.varieties}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Seed Lots</strong></td><td>${preview.seed_lots}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Garden Locations</strong></td><td>${preview.garden_locations || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Plants</strong></td><td>${preview.plants}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Breeding Projects</strong></td><td>${preview.breeding_projects}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Harvest Records</strong></td><td>${preview.harvest_log || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Germination Tests</strong></td><td>${preview.germination_tests || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Amendments</strong></td><td>${preview.plant_amendments || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Cross Pollinations</strong></td><td>${preview.cross_pollinations || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Observations</strong></td><td>${preview.fruit_observations || 0}</td></tr>
          <tr><td style="padding:4px 0;"><strong>Seed Sources</strong></td><td>${preview.seed_sources || 0}</td></tr>
        </table>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="confirm-import-btn">✅ Import</button>
      </div>
    `);
    document.getElementById('confirm-import-btn').onclick = () => confirmImport(backupData);
  } catch (err) { alert('Failed to read backup file: ' + err.message); }
  e.target.value = '';
}

async function confirmImport(backup) {
  try {
    const result = await api('/api/backup/import', 'POST', backup);
    closeModal(); await loadAll(); render();
    setTimeout(() => alert('✅ Import complete!\n\nImported:\n  Varieties: ' + result.imported.varieties + '\n  Seed Lots: ' + result.imported.seed_lots + '\n  Plants: ' + result.imported.plants), 100);
  } catch (err) { alert('Import failed: ' + err.message); }
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
});

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
  }
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (document.getElementById('modal-overlay') && !document.getElementById('modal-overlay').classList.contains('hidden')) {
    if (e.key === 'Escape') closeModal();
    return;
  }
  switch(e.key) {
    case '1': navigate('dashboard'); break;
    case '2': navigate('varieties'); break;
    case '3': navigate('seedlots'); break;
    case '4': navigate('plants'); break;
    case '5': navigate('germination'); break;
    case '6': navigate('harvest'); break;
    case '7': navigate('projects'); break;
    case '8': navigate('crosses'); break;
    case '9': navigate('observations'); break;
    case '0': navigate('amendments'); break;
    case 'n': case 'N':
      if (state.page === 'seedlots') showAddSeedLot();
      else if (state.page === 'plants') showAddPlants();
      else if (state.page === 'varieties') showAddVariety();
      else if (state.page === 'harvest') showAddHarvest();
      else if (state.page === 'germination') showAddGermination();
      else if (state.page === 'crosses') showAddCross();
      else if (state.page === 'observations') showAddObservation();
      else if (state.page === 'amendments') showAddAmendment();
      break;
    case 's': case 'S':
      const searchEl = document.querySelector('[id$="-search"]');
      if (searchEl) { searchEl.focus(); e.preventDefault(); }
      break;
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  setTheme(getTheme());
  document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.page)));
  document.querySelectorAll('.nav-gear').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.page)));
  document.getElementById('hamburger').addEventListener('click', () => document.getElementById('mobile-menu').classList.toggle('hidden'));
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === document.getElementById('modal-overlay')) closeModal(); });
  document.getElementById('import-file-input').addEventListener('change', handleImportFile);
  document.getElementById('import-zip-input').addEventListener('change', handleZipImportFile);
  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(); });
  document.getElementById('login-username').addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(); });

  // Tooltip system
  let tooltipEl = document.getElementById('sv-tooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'sv-tooltip';
    tooltipEl.style.cssText = 'position:fixed;background:#1a1a1a;color:#fff;padding:6px 10px;border-radius:6px;font-size:0.78rem;max-width:200px;text-align:center;z-index:99999;line-height:1.4;pointer-events:none;display:none;';
    document.body.appendChild(tooltipEl);
  }
  let tipTimer = null;
  document.querySelectorAll('[data-tip]').forEach(el => {
    el.addEventListener('mouseenter', () => {
      tipTimer = setTimeout(() => {
        const tip = el.getAttribute('data-tip');
        tooltipEl.textContent = tip;
        tooltipEl.style.display = 'block';
        const rect = el.getBoundingClientRect();
        const left = Math.max(8, rect.left + rect.width / 2 - tooltipEl.offsetWidth / 2);
        tooltipEl.style.left = left + 'px';
        tooltipEl.style.top = (rect.bottom + 8) + 'px';
      }, 800);
    });
    el.addEventListener('mouseleave', () => {
      clearTimeout(tipTimer);
      tooltipEl.style.display = 'none';
    });
  });

  await checkAuth();
  if (getToken()) { await loadAll(); render(); }
});
