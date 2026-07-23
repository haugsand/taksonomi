// New categories (Star Wars, Ringenes Herre, Disney/Pixar, norske idrettsstjerner,
// Game of Thrones). Listed easiest/most-iconic first — the build keeps the first
// 40 after global dedup, so collision-prone or lesser-known entries go last:
//   - Disney avoids fairy-tale names already owned by "Eventyrfigurer".
//   - Footballers sit last in the athletes list; "Fotballspillere" wins ties.
//   - Generic race words go last in the Tolkien list ("Mytiske vesener" may own them).
export default {
  "Star Wars-universet": [
    "Luke Skywalker", "Darth Vader", "Prinsesse Leia", "Han Solo", "Chewbacca",
    "Yoda", "Obi-Wan Kenobi", "R2-D2", "C-3PO", "Anakin Skywalker",
    "Keiser Palpatine", "Boba Fett", "Jabba the Hutt", "Lando Calrissian",
    "Darth Maul", "Qui-Gon Jinn", "Mace Windu", "Padmé Amidala", "Grev Dooku",
    "General Grievous", "Jar Jar Binks", "Rey", "Finn", "Poe Dameron",
    "Kylo Ren", "BB-8", "Ahsoka Tano", "Grogu", "Mandalorianeren", "Jango Fett",
    "Millennium Falcon", "X-wing", "TIE-jager", "Dødsstjernen", "Tatooine",
    "Hoth", "Endor", "Naboo", "Coruscant", "Dagobah", "Mustafar", "Kamino",
    "Jakku", "Jedi", "Sith", "Ewok", "Wookiee", "Stormtrooper", "lyssverd",
    "Kraften",
  ],
  "Ringenes Herre-universet": [
    "Frodo", "Gandalf", "Aragorn", "Legolas", "Gimli", "Boromir", "Samvis",
    "Merry", "Pippin", "Bilbo", "Gollum", "Sauron", "Saruman", "Elrond",
    "Galadriel", "Arwen", "Théoden", "Éowyn", "Éomer", "Faramir", "Denethor",
    "Trebart", "Smaug", "Thorin", "Bard", "Thranduil", "Radagast",
    "Grima Ormtunge", "Nazgûl", "Balrog", "Uruk-hai", "Mordor", "Hobsyssel",
    "Kløvendal", "Rohan", "Gondor", "Isengard", "Moria", "Lothlórien",
    "Minas Tirith", "Helms skar", "Dommedagsberget", "Den ene ring", "hobbit",
    "alv", "dverg", "ent", "ork", "trollmann", "Shelob",
  ],
  "Disney- og Pixar-figurer": [
    "Mikke Mus", "Minni Mus", "Donald Duck", "Langbein", "Pluto", "Elsa",
    "Anna", "Olaf", "Kristoff", "Sven", "Simba", "Mufasa", "Scar", "Timon",
    "Pumbaa", "Nala", "Rafiki", "Zazu", "Aladdin", "Jasmin", "Jafar", "Abu",
    "Ariel", "Sebastian", "Ursula", "Belle", "Udyret", "Mulan", "Vaiana",
    "Maui", "Woody", "Buzz Lightyear", "Jessie", "Rex", "Nemo", "Dory",
    "Marlin", "Sulley", "Mike Wazowski", "Boo", "Lynet McQueen", "Remy",
    "Wall-E", "Baymax", "Merida", "Tiana", "Bambi", "Dumbo", "Miguel",
    "Russell",
  ],
  // NB: "Erling Haaland" is deliberately omitted — it already belongs to
  // "Fotballspillere" (keep-first), so listing it here would just be dropped.
  // Other footballers are free; the least-iconic names trail as trim buffer.
  "Norske idrettsstjerner": [
    "Magnus Carlsen", "Martin Ødegaard", "Karsten Warholm", "Jakob Ingebrigtsen",
    "Marit Bjørgen", "Petter Northug", "Therese Johaug", "Ole Einar Bjørndalen",
    "Johannes Thingnes Bø", "Ole Gunnar Solskjær", "Aksel Lund Svindal",
    "Kjetil André Aamodt", "Cecilia Brækhus", "Sonja Henie", "Grete Waitz",
    "Ada Hegerberg", "Casper Ruud", "Suzann Pettersen", "Bjørn Dæhlie",
    "Johannes Høsflot Klæbo", "Henrik Kristoffersen", "Lucas Braathen",
    "Kjetil Jansrud", "Andreas Thorkildsen", "Maren Lundby", "Tiril Eckhoff",
    "Marte Olsbu Røiseland", "Emil Hegle Svendsen", "Tarjei Bø", "Lasse Kjus",
    "Vegard Ulvang", "Oddvar Brå", "Ingrid Kristiansen", "Thor Hushovd",
    "Alexander Kristoff", "Caroline Graham Hansen", "John Arne Riise",
    "Sander Sagosen", "Nora Mørk", "Edvald Boasson Hagen", "Simen Hegstad Krüger",
    "Heidi Weng", "Gunn-Rita Dahle Flesjå", "Camilla Herrem", "Anette Sagen",
    "Tore André Flo",
  ],
  "Game of Thrones-universet": [
    "Jon Snow", "Daenerys Targaryen", "Tyrion Lannister", "Cersei Lannister",
    "Jaime Lannister", "Ned Stark", "Arya Stark", "Sansa Stark", "Bran Stark",
    "Robb Stark", "Catelyn Stark", "Joffrey", "Tywin Lannister", "Hunden",
    "Brienne", "Samwell Tarly", "Lillefinger", "Varys", "Theon Greyjoy",
    "Ramsay Bolton", "Melisandre", "Davos", "Stannis Baratheon",
    "Robert Baratheon", "Margaery Tyrell", "Olenna Tyrell", "Jorah Mormont",
    "Khal Drogo", "Ygritte", "Tormund", "Bronn", "Podrick", "Gendry", "Hodor",
    "Nattkongen", "Drogon", "Gråorm", "Missandei", "Vinterfell", "Kings Landing",
    "Casterly Rock", "Dragonstein", "Muren", "Braavos", "Westeros", "Essos",
    "Huset Stark", "Huset Lannister", "Huset Targaryen", "Nattevakten",
  ],
};
