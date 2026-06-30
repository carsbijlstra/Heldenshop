/* Heldenshop — shared front-end behaviour */
(function () {
  'use strict';

  // ---- Countdown to the film release ----
  function initCountdown() {
    var el = document.getElementById('countdown');
    if (!el) return;
    var target = new Date(el.getAttribute('data-target') || '2026-07-31T00:00:00+02:00').getTime();
    var d = document.getElementById('cd-d'),
        h = document.getElementById('cd-h'),
        m = document.getElementById('cd-m'),
        s = document.getElementById('cd-s');
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    function tick() {
      var diff = Math.max(0, target - Date.now());
      var dd = Math.floor(diff / 864e5); diff -= dd * 864e5;
      var hh = Math.floor(diff / 36e5); diff -= hh * 36e5;
      var mm = Math.floor(diff / 6e4); diff -= mm * 6e4;
      var ss = Math.floor(diff / 1e3);
      if (d) { d.textContent = dd; h.textContent = p2(hh); m.textContent = p2(mm); s.textContent = p2(ss); }
    }
    tick();
    setInterval(tick, 1000);
  }

  // ---- Current year in footer ----
  function initYear() {
    var yr = document.getElementById('yr');
    if (yr) yr.textContent = new Date().getFullYear();
  }

  // ---- Progressive "thanks" for simple forms (no backend) ----
  function initForms() {
    var forms = document.querySelectorAll('form[data-thanks]');
    Array.prototype.forEach.call(forms, function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = f.getAttribute('data-thanks') || 'Bedankt!';
        var box = document.createElement('div');
        box.className = 'form-done';
        box.textContent = msg;
        f.innerHTML = '';
        f.appendChild(box);
      });
    });
  }

  // ---- Reveal on scroll (respects reduced motion) ----
  function initReveal() {
    var nodes = document.querySelectorAll('[data-reveal]');
    if (!nodes.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    Array.prototype.forEach.call(nodes, function (n) { io.observe(n); });
  }

  // ---- Site search (static, client-side) ----
  var SEARCH_INDEX = [{"t":"Aquaman","u":"/aquaman.html","c":"Held","k":"aquaman aquaman, alles over de superheld aquaman aquaman aquaman"},{"t":"Black Panther","u":"/black-panther.html","c":"Held","k":"black panther black panther, alles over de superheld black panther black-panther blackpanther"},{"t":"Captain America","u":"/captain-america.html","c":"Held","k":"captain america captain america, alles over de superheld captain america captain-america captainamerica"},{"t":"Doctor Strange","u":"/doctor-strange.html","c":"Held","k":"doctor strange doctor strange, alles over de superheld doctor strange doctor-strange doctorstrange"},{"t":"Green Lantern","u":"/green-lantern.html","c":"Held","k":"green lantern green lantern, alles over de superheld green lantern green-lantern greenlantern"},{"t":"Iron Man","u":"/iron-man.html","c":"Held","k":"iron man iron man, alles over de superheld iron man iron-man ironman"},{"t":"Supergirl","u":"/supergirl.html","c":"Held","k":"supergirl supergirl, alles over de superheld supergirl supergirl supergirl"},{"t":"Superman","u":"/superman.html","c":"Held","k":"superman superman, alles over de superheld superman superman superman"},{"t":"The Flash","u":"/the-flash.html","c":"Held","k":"the flash the flash, alles over de superheld the flash the-flash theflash"},{"t":"Thor","u":"/thor.html","c":"Held","k":"thor thor, alles over de superheld thor thor thor"},{"t":"Wat is Frozen?","u":"/frozen.html","c":"Held","k":"wat is frozen ? wat is frozen? alles over anna, elsa & olaf frozen frozen watisfrozen"},{"t":"Wat is Paw Patrol?","u":"/paw-patrol.html","c":"Held","k":"wat is paw patrol ? wat is paw patrol? de reddingspups & ryder paw patrol paw-patrol watispawpatrol"},{"t":"Wat is Pokémon?","u":"/pokemon.html","c":"Held","k":"wat is pokemon ? wat is pokemon? alles over pikachu & trainers pokemon pokemon watispokemon"},{"t":"Wat is Star Wars?","u":"/star-wars.html","c":"Held","k":"wat is star wars ? wat is star wars? jedi, de force & lichtzwaarden star wars star-wars watisstarwars"},{"t":"Wat zijn de Avengers?","u":"/avengers.html","c":"Held","k":"wat zijn de avengers ? wat zijn de avengers? aardes machtigste helden avengers avengers watzijndeavengers"},{"t":"Wie is Batman?","u":"/batman.html","c":"Held","k":"wie is batman ? wie is batman? alles over de held van gotham batman batman wieisbatman"},{"t":"Wie is Harry Potter?","u":"/harry-potter.html","c":"Held","k":"wie is harry potter ? wie is harry potter? magie op zweinstein harry potter harry-potter wieisharrypotter"},{"t":"Wie is Hulk?","u":"/hulk.html","c":"Held","k":"wie is hulk ? wie is de hulk? alles over de groene reus hulk hulk wieishulk"},{"t":"Wie is Spider-Man?","u":"/spider-man.html","c":"Held","k":"wie is spider-man ? wie is spider-man? alles over de webslinger spider man spider-man wieisspiderman"},{"t":"Wie is Super Mario?","u":"/super-mario.html","c":"Held","k":"wie is super mario ? wie is super mario? alles over de loodgieter super mario super-mario wieissupermario"},{"t":"Wolverine","u":"/wolverine.html","c":"Held","k":"wolverine wolverine, alles over de superheld wolverine wolverine wolverine"},{"t":"Wonder Woman","u":"/wonder-woman.html","c":"Held","k":"wonder woman wonder woman, alles over de superheld wonder woman wonder-woman wonderwoman"},{"t":"Alle helden","u":"/helden.html","c":"Alle helden","k":"alle helden alle superhelden, ontdek wie ze zijn helden helden allehelden"},{"t":"Heldenshop gidsen","u":"/gidsen.html","c":"Alle gidsen","k":"heldenshop gidsen heldenshop gidsen, 21 gidsen over al je favoriete helden gidsen gidsen heldenshopgidsen"},{"t":"Spider-Man: Brand New Day","u":"/spider-man-brand-new-day.html","c":"Film","k":"spider-man: brand new day spider-man: brand new day (2026), release, cast & aftelteller spider man brand new day spider-man-brand-new-day spidermanbrandnewday"},{"t":"Spider-Man swingt terug, in een gloednieuwe film!","u":"/index.html","c":"Home","k":"spider-man swingt terug, in een gloednieuwe film! heldenshop, alles over je favoriete superhelden & films index index spidermanswingtterugineengloednieuwefilm"},{"t":"Alle Avengers-films in de juiste volgorde","u":"/gidsen/avengers-films-volgorde.html","c":"Gids","k":"alle avengers-films in de juiste volgorde alle avengers-films in de juiste volgorde avengers films volgorde avengers-films-volgorde alleavengersfilmsindejuistevolgorde"},{"t":"Alle power-ups van Super Mario uitgelegd","u":"/gidsen/mario-power-ups.html","c":"Gids","k":"alle power-ups van super mario uitgelegd alle power-ups van super mario uitgelegd mario power ups mario-power-ups allepowerupsvansupermariouitgelegd"},{"t":"Alle pups van Paw Patrol en hun voertuigen","u":"/gidsen/de-pups-van-paw-patrol.html","c":"Gids","k":"alle pups van paw patrol en hun voertuigen alle pups van paw patrol en hun voertuigen de pups van paw patrol de-pups-van-paw-patrol allepupsvanpawpatrolenhunvoertuigen"},{"t":"Alle Spider-Man films op een rij","u":"/gidsen/spider-man-films-op-een-rij.html","c":"Gids","k":"alle spider-man films op een rij alle spider-man films op een rij spider man films op een rij spider-man-films-op-een-rij allespidermanfilmsopeenrij"},{"t":"Beginnen met Pokémon kaarten: zo doe je dat","u":"/gidsen/beginnen-met-pokemon-kaarten.html","c":"Gids","k":"beginnen met pokemon kaarten: zo doe je dat beginnen met pokemon kaarten: zo doe je dat beginnen met pokemon kaarten beginnen-met-pokemon-kaarten beginnenmetpokemonkaartenzodoejedat"},{"t":"Brand New Day, alles wat we weten","u":"/gidsen/brand-new-day-alles-wat-we-weten.html","c":"Gids","k":"brand new day, alles wat we weten brand new day, alles wat we weten brand new day alles wat we weten brand-new-day-alles-wat-we-weten brandnewdayalleswatweweten"},{"t":"De 4 afdelingen van Zweinstein: bij welke hoor jij?","u":"/gidsen/zweinstein-afdelingen.html","c":"Gids","k":"de 4 afdelingen van zweinstein: bij welke hoor jij? de 4 afdelingen van zweinstein: bij welke hoor jij? zweinstein afdelingen zweinstein-afdelingen de4afdelingenvanzweinsteinbijwelkehoorjij"},{"t":"De bekendste Pokémon op een rij","u":"/gidsen/de-bekendste-pokemon.html","c":"Gids","k":"de bekendste pokemon op een rij de bekendste pokemon op een rij de bekendste pokemon de-bekendste-pokemon debekendstepokemonopeenrij"},{"t":"De beste Spider-Man actiefiguren","u":"/gidsen/beste-spider-man-actiefiguren.html","c":"Gids","k":"de beste spider-man actiefiguren de beste spider-man actiefiguren beste spider man actiefiguren beste-spider-man-actiefiguren debestespidermanactiefiguren"},{"t":"De coolste gadgets van Batman","u":"/gidsen/batman-gadgets.html","c":"Gids","k":"de coolste gadgets van batman de coolste gadgets van batman batman gadgets batman-gadgets decoolstegadgetsvanbatman"},{"t":"De geschiedenis van Spider-Man","u":"/gidsen/de-geschiedenis-van-spider-man.html","c":"Gids","k":"de geschiedenis van spider-man de geschiedenis van spider-man de geschiedenis van spider man de-geschiedenis-van-spider-man degeschiedenisvanspiderman"},{"t":"De grootste schurken van Spider-Man","u":"/gidsen/de-grootste-schurken-van-spider-man.html","c":"Gids","k":"de grootste schurken van spider-man de grootste schurken van spider-man de grootste schurken van spider man de-grootste-schurken-van-spider-man degrootsteschurkenvanspiderman"},{"t":"De krachten van Spider-Man","u":"/gidsen/de-krachten-van-spider-man.html","c":"Gids","k":"de krachten van spider-man de krachten van spider-man de krachten van spider man de-krachten-van-spider-man dekrachtenvanspiderman"},{"t":"De leukste LEGO sets voor superheldenfans","u":"/gidsen/leukste-lego-superhelden-sets.html","c":"Gids","k":"de leukste lego sets voor superheldenfans de leukste lego sets voor superheldenfans leukste lego superhelden sets leukste-lego-superhelden-sets deleukstelegosetsvoorsuperheldenfans"},{"t":"De leukste Spider-Man games","u":"/gidsen/de-beste-spider-man-games.html","c":"Gids","k":"de leukste spider-man games de leukste spider-man games de beste spider man games de-beste-spider-man-games deleukstespidermangames"},{"t":"De leukste superhelden cadeaus voor Sinterklaas","u":"/gidsen/superhelden-cadeaus-sinterklaas.html","c":"Gids","k":"de leukste superhelden cadeaus voor sinterklaas de leukste superhelden cadeaus voor sinterklaas superhelden cadeaus sinterklaas superhelden-cadeaus-sinterklaas deleukstesuperheldencadeausvoorsinterklaas"},{"t":"De sterkste Avengers actiefiguren","u":"/gidsen/de-sterkste-avengers-figuren.html","c":"Gids","k":"de sterkste avengers actiefiguren de sterkste avengers actiefiguren de sterkste avengers figuren de-sterkste-avengers-figuren desterksteavengersactiefiguren"},{"t":"Een Spider-Man verjaardagsfeest organiseren","u":"/gidsen/spider-man-verjaardagsfeestje.html","c":"Gids","k":"een spider-man verjaardagsfeest organiseren een spider-man verjaardagsfeest organiseren spider man verjaardagsfeestje spider-man-verjaardagsfeestje eenspidermanverjaardagsfeestorganiseren"},{"t":"Grote superheldenquiz: hoeveel weet jij?","u":"/gidsen/superhelden-quiz.html","c":"Gids","k":"grote superheldenquiz: hoeveel weet jij? grote superheldenquiz: hoeveel weet jij? superhelden quiz superhelden-quiz grotesuperheldenquizhoeveelweetjij"},{"t":"Het beste Aquaman speelgoed","u":"/gidsen/het-beste-aquaman-speelgoed.html","c":"Gids","k":"het beste aquaman speelgoed het beste aquaman speelgoed het beste aquaman speelgoed het-beste-aquaman-speelgoed hetbesteaquamanspeelgoed"},{"t":"Het beste Black Panther speelgoed","u":"/gidsen/het-beste-black-panther-speelgoed.html","c":"Gids","k":"het beste black panther speelgoed het beste black panther speelgoed het beste black panther speelgoed het-beste-black-panther-speelgoed hetbesteblackpantherspeelgoed"},{"t":"Het beste Captain America speelgoed","u":"/gidsen/het-beste-captain-america-speelgoed.html","c":"Gids","k":"het beste captain america speelgoed het beste captain america speelgoed het beste captain america speelgoed het-beste-captain-america-speelgoed hetbestecaptainamericaspeelgoed"},{"t":"Het beste Doctor Strange speelgoed","u":"/gidsen/het-beste-doctor-strange-speelgoed.html","c":"Gids","k":"het beste doctor strange speelgoed het beste doctor strange speelgoed het beste doctor strange speelgoed het-beste-doctor-strange-speelgoed hetbestedoctorstrangespeelgoed"},{"t":"Het beste Green Lantern speelgoed","u":"/gidsen/het-beste-green-lantern-speelgoed.html","c":"Gids","k":"het beste green lantern speelgoed het beste green lantern speelgoed het beste green lantern speelgoed het-beste-green-lantern-speelgoed hetbestegreenlanternspeelgoed"},{"t":"Het beste Iron Man speelgoed","u":"/gidsen/het-beste-iron-man-speelgoed.html","c":"Gids","k":"het beste iron man speelgoed het beste iron man speelgoed het beste iron man speelgoed het-beste-iron-man-speelgoed hetbesteironmanspeelgoed"},{"t":"Het beste Supergirl speelgoed","u":"/gidsen/het-beste-supergirl-speelgoed.html","c":"Gids","k":"het beste supergirl speelgoed het beste supergirl speelgoed het beste supergirl speelgoed het-beste-supergirl-speelgoed hetbestesupergirlspeelgoed"},{"t":"Het beste Superman speelgoed","u":"/gidsen/het-beste-superman-speelgoed.html","c":"Gids","k":"het beste superman speelgoed het beste superman speelgoed het beste superman speelgoed het-beste-superman-speelgoed hetbestesupermanspeelgoed"},{"t":"Het beste The Flash speelgoed","u":"/gidsen/het-beste-the-flash-speelgoed.html","c":"Gids","k":"het beste the flash speelgoed het beste the flash speelgoed het beste the flash speelgoed het-beste-the-flash-speelgoed hetbestetheflashspeelgoed"},{"t":"Het beste Thor speelgoed","u":"/gidsen/het-beste-thor-speelgoed.html","c":"Gids","k":"het beste thor speelgoed het beste thor speelgoed het beste thor speelgoed het-beste-thor-speelgoed hetbestethorspeelgoed"},{"t":"Het beste Wolverine speelgoed","u":"/gidsen/het-beste-wolverine-speelgoed.html","c":"Gids","k":"het beste wolverine speelgoed het beste wolverine speelgoed het beste wolverine speelgoed het-beste-wolverine-speelgoed hetbestewolverinespeelgoed"},{"t":"Het beste Wonder Woman speelgoed","u":"/gidsen/het-beste-wonder-woman-speelgoed.html","c":"Gids","k":"het beste wonder woman speelgoed het beste wonder woman speelgoed het beste wonder woman speelgoed het-beste-wonder-woman-speelgoed hetbestewonderwomanspeelgoed"},{"t":"Het coolste Batman speelgoed om mee te spelen","u":"/gidsen/het-coolste-batman-speelgoed.html","c":"Gids","k":"het coolste batman speelgoed om mee te spelen het coolste batman speelgoed om mee te spelen het coolste batman speelgoed het-coolste-batman-speelgoed hetcoolstebatmanspeelgoedommeetespelen"},{"t":"Het leukste Super Mario speelgoed","u":"/gidsen/het-leukste-super-mario-speelgoed.html","c":"Gids","k":"het leukste super mario speelgoed het leukste super mario speelgoed het leukste super mario speelgoed het-leukste-super-mario-speelgoed hetleukstesupermariospeelgoed"},{"t":"Het verhaal van Frozen (en de liedjes)","u":"/gidsen/het-verhaal-van-frozen.html","c":"Gids","k":"het verhaal van frozen (en de liedjes) het verhaal van frozen (en de liedjes) het verhaal van frozen het-verhaal-van-frozen hetverhaalvanfrozenendeliedjes"},{"t":"LEGO Star Wars voor beginners","u":"/gidsen/lego-star-wars-voor-beginners.html","c":"Gids","k":"lego star wars voor beginners lego star wars voor beginners lego star wars voor beginners lego-star-wars-voor-beginners legostarwarsvoorbeginners"},{"t":"Spider-Man knutselen: 5 leuke ideeën","u":"/gidsen/spider-man-knutselen.html","c":"Gids","k":"spider-man knutselen: 5 leuke ideeen spider-man knutselen: 5 leuke ideeen spider man knutselen spider-man-knutselen spidermanknutselen5leukeideeen"},{"t":"Spider-Man maskers en verkleedpakken","u":"/gidsen/spider-man-maskers-en-verkleedpakken.html","c":"Gids","k":"spider-man maskers en verkleedpakken spider-man maskers en verkleedpakken spider man maskers en verkleedpakken spider-man-maskers-en-verkleedpakken spidermanmaskersenverkleedpakken"},{"t":"Star Wars kijken: in welke volgorde?","u":"/gidsen/star-wars-kijkvolgorde.html","c":"Gids","k":"star wars kijken: in welke volgorde? star wars kijken: in welke volgorde? star wars kijkvolgorde star-wars-kijkvolgorde starwarskijkeninwelkevolgorde"},{"t":"Superhelden kerstcadeaus: onze leukste tips","u":"/gidsen/superhelden-kerstcadeaus.html","c":"Gids","k":"superhelden kerstcadeaus: onze leukste tips superhelden kerstcadeaus: onze leukste tips superhelden kerstcadeaus superhelden-kerstcadeaus superheldenkerstcadeausonzeleukstetips"},{"t":"Toveren als een echte tovenaar","u":"/gidsen/toveren-als-harry-potter.html","c":"Gids","k":"toveren als een echte tovenaar toveren als een echte tovenaar toveren als harry potter toveren-als-harry-potter toverenalseenechtetovenaar"},{"t":"Verkleed je als Elsa of Anna uit Frozen","u":"/gidsen/verkleed-als-elsa-of-anna.html","c":"Gids","k":"verkleed je als elsa of anna uit frozen verkleed je als elsa of anna uit frozen verkleed als elsa of anna verkleed-als-elsa-of-anna verkleedjealselsaofannauitfrozen"},{"t":"Waarom wordt de Hulk groen en boos?","u":"/gidsen/waarom-wordt-de-hulk-groen.html","c":"Gids","k":"waarom wordt de hulk groen en boos? waarom wordt de hulk groen en boos? waarom wordt de hulk groen waarom-wordt-de-hulk-groen waaromwordtdehulkgroenenboos"},{"t":"Wat is het Spider-Verse?","u":"/gidsen/wat-is-het-spider-verse.html","c":"Gids","k":"wat is het spider-verse? wat is het spider-verse? wat is het spider verse wat-is-het-spider-verse watishetspiderverse"},{"t":"Wat is Star Wars?","u":"/gidsen/wat-is-star-wars.html","c":"Gids","k":"wat is star wars? wat is star wars? wat is star wars wat-is-star-wars watisstarwars"},{"t":"Web shooters: zo schiet je webben net als Spider-Man","u":"/gidsen/spider-man-web-shooter-gids.html","c":"Gids","k":"web shooters: zo schiet je webben net als spider-man web shooters: zo schiet je webben net als spider-man spider man web shooter gids spider-man-web-shooter-gids webshooterszoschietjewebbennetalsspiderman"},{"t":"Welk Spider-Man cadeau past bij welke leeftijd?","u":"/gidsen/spider-man-cadeau-per-leeftijd.html","c":"Gids","k":"welk spider-man cadeau past bij welke leeftijd? welk spider-man cadeau past bij welke leeftijd? spider man cadeau per leeftijd spider-man-cadeau-per-leeftijd welkspidermancadeaupastbijwelkeleeftijd"},{"t":"Welke Paw Patrol pup ben jij?","u":"/gidsen/welke-paw-patrol-pup-ben-jij.html","c":"Gids","k":"welke paw patrol pup ben jij? welke paw patrol pup ben jij? welke paw patrol pup ben jij welke-paw-patrol-pup-ben-jij welkepawpatrolpupbenjij"},{"t":"Welke superheld past bij jou?","u":"/gidsen/welke-superheld-past-bij-jou.html","c":"Gids","k":"welke superheld past bij jou? welke superheld past bij jou? welke superheld past bij jou welke-superheld-past-bij-jou welkesuperheldpastbijjou"},{"t":"Wie is Aquaman?","u":"/gidsen/wie-is-aquaman.html","c":"Gids","k":"wie is aquaman? wie is aquaman? wie is aquaman wie-is-aquaman wieisaquaman"},{"t":"Wie is Batman?","u":"/gidsen/wie-is-batman.html","c":"Gids","k":"wie is batman? wie is batman? wie is batman wie-is-batman wieisbatman"},{"t":"Wie is Black Panther?","u":"/gidsen/wie-is-black-panther.html","c":"Gids","k":"wie is black panther? wie is black panther? wie is black panther wie-is-black-panther wieisblackpanther"},{"t":"Wie is Captain America?","u":"/gidsen/wie-is-captain-america.html","c":"Gids","k":"wie is captain america? wie is captain america? wie is captain america wie-is-captain-america wieiscaptainamerica"},{"t":"Wie is de Green Goblin?","u":"/gidsen/wie-is-green-goblin.html","c":"Gids","k":"wie is de green goblin? wie is de green goblin? wie is green goblin wie-is-green-goblin wieisdegreengoblin"},{"t":"Wie is Doctor Strange?","u":"/gidsen/wie-is-doctor-strange.html","c":"Gids","k":"wie is doctor strange? wie is doctor strange? wie is doctor strange wie-is-doctor-strange wieisdoctorstrange"},{"t":"Wie is Green Lantern?","u":"/gidsen/wie-is-green-lantern.html","c":"Gids","k":"wie is green lantern? wie is green lantern? wie is green lantern wie-is-green-lantern wieisgreenlantern"},{"t":"Wie is Iron Man?","u":"/gidsen/wie-is-iron-man.html","c":"Gids","k":"wie is iron man? wie is iron man? wie is iron man wie-is-iron-man wieisironman"},{"t":"Wie is Miles Morales?","u":"/gidsen/wie-is-miles-morales.html","c":"Gids","k":"wie is miles morales? wie is miles morales? wie is miles morales wie-is-miles-morales wieismilesmorales"},{"t":"Wie is Super Mario?","u":"/gidsen/wie-is-super-mario.html","c":"Gids","k":"wie is super mario? wie is super mario? wie is super mario wie-is-super-mario wieissupermario"},{"t":"Wie is Supergirl?","u":"/gidsen/wie-is-supergirl.html","c":"Gids","k":"wie is supergirl? wie is supergirl? wie is supergirl wie-is-supergirl wieissupergirl"},{"t":"Wie is Superman?","u":"/gidsen/wie-is-superman.html","c":"Gids","k":"wie is superman? wie is superman? wie is superman wie-is-superman wieissuperman"},{"t":"Wie is The Flash?","u":"/gidsen/wie-is-the-flash.html","c":"Gids","k":"wie is the flash? wie is the flash? wie is the flash wie-is-the-flash wieistheflash"},{"t":"Wie is Thor?","u":"/gidsen/wie-is-thor.html","c":"Gids","k":"wie is thor? wie is thor? wie is thor wie-is-thor wieisthor"},{"t":"Wie is Venom?","u":"/gidsen/wie-is-venom.html","c":"Gids","k":"wie is venom? wie is venom? wie is venom wie-is-venom wieisvenom"},{"t":"Wie is Wolverine?","u":"/gidsen/wie-is-wolverine.html","c":"Gids","k":"wie is wolverine? wie is wolverine? wie is wolverine wie-is-wolverine wieiswolverine"},{"t":"Wie is Wonder Woman?","u":"/gidsen/wie-is-wonder-woman.html","c":"Gids","k":"wie is wonder woman? wie is wonder woman? wie is wonder woman wie-is-wonder-woman wieiswonderwoman"},{"t":"Wie zijn de Avengers?","u":"/gidsen/wie-zijn-de-avengers.html","c":"Gids","k":"wie zijn de avengers? wie zijn de avengers? wie zijn de avengers wie-zijn-de-avengers wiezijndeavengers"},{"t":"Zo verkleed je je als de Incredible Hulk","u":"/gidsen/verkleed-als-de-hulk.html","c":"Gids","k":"zo verkleed je je als de incredible hulk zo verkleed je je als de incredible hulk verkleed als de hulk verkleed-als-de-hulk zoverkleedjejealsdeincrediblehulk"},{"t":"Zo word je zelf een echte superheld","u":"/gidsen/word-zelf-een-superheld.html","c":"Gids","k":"zo word je zelf een echte superheld zo word je zelf een echte superheld word zelf een superheld word-zelf-een-superheld zowordjezelfeenechtesuperheld"},{"t":"Contact","u":"/contact.html","c":"Info","k":"contact contact, heldenshop contact contact contact"},{"t":"Cookiebeleid","u":"/cookies.html","c":"Info","k":"cookiebeleid cookiebeleid, heldenshop cookies cookies cookiebeleid"},{"t":"Hoe wij werken","u":"/hoe-wij-werken.html","c":"Info","k":"hoe wij werken hoe wij werken, de werkwijze van heldenshop hoe wij werken hoe-wij-werken hoewijwerken"},{"t":"Over ons","u":"/over-ons.html","c":"Info","k":"over ons over heldenshop, het onafhankelijke superhelden-platform over ons over-ons overons"},{"t":"Privacyverklaring","u":"/privacy.html","c":"Info","k":"privacyverklaring privacyverklaring, heldenshop privacy privacy privacyverklaring"},{"t":"Veelgestelde vragen","u":"/faq.html","c":"Info","k":"veelgestelde vragen veelgestelde vragen (faq), heldenshop faq faq veelgesteldevragen"}];

  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  }
  function esc(s) {
    return (s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function runSearch(q) {
    q = norm(q);
    if (!q) return [];
    var toks = q.split(' ');
    var qFlat = q.replace(/[^a-z0-9]/g, '');
    var out = [];
    for (var i = 0; i < SEARCH_INDEX.length; i++) {
      var it = SEARCH_INDEX[i];
      var tnorm = norm(it.t);
      var hay = tnorm + ' ' + it.k;
      var hayFlat = hay.replace(/[^a-z0-9]/g, '');
      var ok = true;
      for (var j = 0; j < toks.length; j++) {
        var tk = toks[j];
        if (hay.indexOf(tk) < 0 && hayFlat.indexOf(tk.replace(/[^a-z0-9]/g, '')) < 0) { ok = false; break; }
      }
      if (!ok) continue;
      var score = 0;
      if (tnorm === q) score += 120;
      if (tnorm.indexOf(q) === 0) score += 60;
      if (tnorm.indexOf(q) >= 0) score += 25;
      if ((' ' + tnorm).indexOf(' ' + q) >= 0) score += 15;
      if (hayFlat.indexOf(qFlat) >= 0) score += 8;
      if (it.c === 'Held') score += 6;
      score += Math.max(0, 10 - it.t.length / 8);
      out.push({ it: it, s: score });
    }
    out.sort(function (a, b) { return b.s - a.s; });
    return out.slice(0, 8).map(function (x) { return x.it; });
  }

  function initSearch() {
    var forms = document.querySelectorAll('form.search');
    Array.prototype.forEach.call(forms, function (form) {
      var input = form.querySelector('input[type=search], input[type=text]');
      if (!input) return;
      var box = document.createElement('div');
      box.className = 'search-results';
      box.setAttribute('role', 'listbox');
      box.hidden = true;
      form.appendChild(box);
      var items = [], active = -1;

      function go(u) { if (u) window.location.href = u; }
      function close() { box.hidden = true; active = -1; }
      function paint() {
        var links = box.querySelectorAll('.sr-item');
        Array.prototype.forEach.call(links, function (a, i) {
          if (i === active) { a.classList.add('active'); } else { a.classList.remove('active'); }
        });
      }
      function render() {
        if (!input.value.trim()) { close(); return; }
        if (!items.length) {
          box.innerHTML = '<div class="sr-empty">Niks gevonden. Probeer een held, zoals <strong>Spider-Man</strong> of <strong>Batman</strong>.</div>';
          box.hidden = false; return;
        }
        var html = '';
        for (var i = 0; i < items.length; i++) {
          html += '<a class="sr-item" role="option" href="' + esc(items[i].u) + '">' +
                  '<span class="sr-t">' + esc(items[i].t) + '</span>' +
                  '<span class="sr-c">' + esc(items[i].c) + '</span></a>';
        }
        box.innerHTML = html;
        box.hidden = false;
        active = -1;
      }

      input.setAttribute('autocomplete', 'off');
      input.addEventListener('input', function () { items = runSearch(input.value); render(); });
      input.addEventListener('focus', function () { if (input.value.trim()) { items = runSearch(input.value); render(); } });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { close(); return; }
        if (box.hidden || !items.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; paint(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % items.length; paint(); }
        else if (e.key === 'Enter') { e.preventDefault(); go(items[active >= 0 ? active : 0].u); }
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var res = items.length ? items : runSearch(input.value);
        if (res.length) go(res[active >= 0 ? active : 0].u);
      });
      document.addEventListener('click', function (e) { if (!form.contains(e.target)) close(); });
    });
  }

  function init() { initCountdown(); initYear(); initForms(); initReveal(); initSearch(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
