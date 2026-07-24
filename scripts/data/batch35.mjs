// Norwegian-flavoured categories. Easiest/most-iconic first — the build keeps the
// first 40 after global dedup, so collision-prone entries trail as buffer:
//   - artists: "Karpe" collides with the fish "karpe".
//   - brands: "Jarlsberg" (cheese), "Kiwi" (fruit) are owned elsewhere.
//   - turmål avoids peaks (in "Fjell og fjellkjeder") and national parks
//     (in "Norske nasjonalparker"); islands like "Runde" trail as buffer.
//   - children's figures: "Kaptein Sabeltann" is owned by "Eventyrfigurer".
export default {
  "Norske artister og band": [
    "a-ha", "Kygo", "Aurora", "Sigrid", "Alan Walker", "Astrid S",
    "Marcus & Martinus", "Röyksopp", "Madcon", "Kaizers Orchestra",
    "DumDum Boys", "deLillos", "Raga Rockers", "CC Cowboys", "Postgirobygget",
    "Motorpsycho", "Turbonegro", "Wig Wam", "Madrugada", "Highasakite",
    "Bjørn Eidsvåg", "Jan Eggum", "Halvdan Sivertsen", "Odd Nordstoga",
    "Åge Aleksandersen", "Jonas Fjeld", "Kurt Nilsen", "Sondre Lerche",
    "Maria Mena", "Lene Marlin", "Susanne Sundfør", "girl in red", "Dagny",
    "Gabrielle", "Julie Bergan", "Tix", "Cezinando", "Lars Vaular", "OnklP",
    "Ole Ivars", "Hellbillies", "D.D.E.", "Vazelina Bilopphøggers",
    "Sondre Justad", "Emilie Nicolas", "Morten Harket", "Ingrid Olava",
    "Bigbang", "Vamp", "Gåte", "Karpe",
  ],
  // "Freia" is unusable (owned by "Kjente merkevarer"); "Kiwi"/"Jarlsberg" clash
  // with the fruit/cheese. Helly Hansen, Bergans, Norrøna are free (their only
  // other home, "Sportsklesmerker", is excluded from the build).
  "Norske merkevarer og bedrifter": [
    "Telenor", "Equinor", "Kvikk Lunsj", "Vinmonopolet", "Rema 1000", "Vy",
    "Elkjøp", "Helly Hansen", "Bergans", "Norrøna", "Toro", "Gilde", "Stabburet",
    "Mills", "Nortura", "Ringnes", "Hansa", "Mack", "Nidar", "Stratos", "Laban",
    "Synnøve", "Diplom-Is", "Hennig-Olsen", "Coop", "Meny", "Europris", "XXL",
    "Power", "Komplett", "Norsk Tipping", "Posten", "DNB", "Storebrand",
    "Gjensidige", "Statkraft", "Norsk Hydro", "Yara", "Orkla", "Mowi", "Aker",
    "Jotun", "Swix", "Stormberg", "Glava", "Bunnpris", "Tine",
  ],
  "Norske politikere": [
    "Jonas Gahr Støre", "Erna Solberg", "Jens Stoltenberg",
    "Gro Harlem Brundtland", "Kjell Magne Bondevik", "Kåre Willoch",
    "Einar Gerhardsen", "Trygve Bratteli", "Thorbjørn Jagland", "Per Borten",
    "Carl I. Hagen", "Siv Jensen", "Sylvi Listhaug", "Trygve Slagsvold Vedum",
    "Audun Lysbakken", "Bjørnar Moxnes", "Knut Arild Hareide",
    "Trine Skei Grande", "Guri Melby", "Une Bastholm", "Hadia Tajik",
    "Anniken Huitfeldt", "Jan Tore Sanner", "Ine Eriksen Søreide", "Abid Raja",
    "Ola Borten Moe", "Marit Arnstad", "Kjell Ingolf Ropstad", "Kristin Halvorsen",
    "Torbjørn Røe Isaksen", "Erik Solheim", "Anne Enger", "Lars Sponheim",
    "Dagfinn Høybråten", "Valgerd Svarstad Haugland", "Jan Petersen",
    "Reiulf Steen", "Raymond Johansen", "Martin Kolberg", "Trygve Lie",
    "Christian Michelsen", "Johan Sverdrup", "Johan Nygaardsvold",
    "Vidkun Quisling", "Jan P. Syse", "Odvar Nordli", "Bård Vegar Solhjell",
    "Terje Aasland", "Emilie Enger Mehl", "Hallvard Bakke",
  ],
  // Leans into hikes and nature spots — the iconic landmarks (Preikestolen,
  // Trolltunga, Nordkapp, Bryggen, Nidarosdomen …) are already owned by
  // "Landemerker og vidundere", and the peaks by "Fjell og fjellkjeder".
  "Norske turmål og naturperler": [
    "Kjerag", "Trollstigen", "Atlanterhavsveien", "Geirangerfjorden",
    "Nærøyfjorden", "Lysefjorden", "Romsdalseggen", "Briksdalsbreen",
    "Nigardsbreen", "Vøringsfossen", "Låtefossen", "Steinsdalsfossen",
    "Flåmsbana", "Rallarvegen", "Reinebringen", "Henningsvær", "Saltstraumen",
    "Torghatten", "Svartisen", "Fløyen", "Ulriken", "Borgund stavkirke",
    "Heddal stavkirke", "Urnes stavkirke", "Eidsvollsbygningen",
    "Fredriksten festning", "Sognefjellet", "Aurlandsdalen", "Kjeragbolten",
    "Segla", "Kvalvika", "Nusfjord", "Karl Johan", "Fløibanen", "Slottet",
    "Stegastein", "Dalsnibba", "Måbødalen", "Vettisfossen", "Ryten", "Lovatnet",
    "Uttakleiv", "Haukland", "Bunes", "Kjerringøy",
  ],
  "Norske barnebok- og TV-figurer": [
    "Reodor Felgen", "Solan Gundersen", "Ludvig", "Karius", "Baktus", "Knerten",
    "Karsten", "Petra", "Kasper", "Jesper", "Jonatan", "Tante Sofie",
    "Politimester Bastian", "Tobias", "Klatremus", "Mikkel Rev", "Morten Skogmus",
    "Brumlemann", "Petronella", "Marabu", "Pinky", "Langemann",
    "Grusomme Gabriel", "Benjamin", "Veslemøy", "Sunniva", "Doktor Proktor",
    "Bulle", "Lise", "Elias", "Ruff", "Alfons Åberg", "Bamse",
    "Emanuel Desperado", "Frimand Pløsen", "Mysil Bergsprekken", "Kamomilla",
    "Bertrand", "Remo", "Max", "Fabian", "Kaia", "Bjarne Betjent", "Sonja",
    "Vetle", "Kurt", "Lillebror", "Bø", "Bæ", "Skalken",
  ],
};
