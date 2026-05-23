window.__GESTALT_RECORDS = [
  {
    "id": "dashboard",
    "title": "System Dashboard",
    "section": "system",
    "type": "System",
    "status": "Online",
    "started": "2026-05-14",
    "updated": "2026-05-14",
    "summary": "The root index for projects, play sessions, setup notes, and field logs.",
    "banner": "",
    "headerImage": "",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 1,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "",
    "tags": [
      "system",
      "index",
      "home"
    ],
    "milestones": [
      {
        "label": "Archive Shell",
        "progress": 100,
        "status": "Ready"
      },
      {
        "label": "Content Flow",
        "progress": 100,
        "status": "Ready"
      },
      {
        "label": "Local Studio",
        "progress": 100,
        "status": "Ready"
      }
    ],
    "body": "## Boot Notes\n- [x] Archive shell is ready.\n- [x] Local content workflow is ready.\n- [ ] Add the first official record.\n\n> A quiet place for current work, play, notes, and setup history."
  },
  {
    "id": "gestalt",
    "title": "Gestalt",
    "section": "projects",
    "type": "Project Log",
    "status": "Active",
    "started": "2026-04-05",
    "updated": "2026-05-14",
    "summary": "Currently working on this blog / portfolio-ish thing. I have not stopped working on the other projects, still working on KiraPatch, but I wanted a dedicated place for the stuff that usually ends up scattered in notes.",
    "banner": "",
    "headerImage": "",
    "samples": [
      "public/media/records/gestalt/1779269816210-screenshot-2026-05-20-152713.png"
    ],
    "attachments": [],
    "progress": 100,
    "priority": 1,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "",
    "tags": [
      "gestalt",
      "blog",
      "archive",
      "portfolio"
    ],
    "milestones": [
      {
        "label": "Archive Shell",
        "progress": 100,
        "status": "Ready"
      },
      {
        "label": "Static Preview",
        "progress": 100,
        "status": "Ready"
      },
      {
        "label": "Studio Workflow",
        "progress": 100,
        "status": "Ready"
      },
      {
        "label": "GitHub Pages",
        "progress": 100,
        "status": "Ready"
      }
    ],
    "body": ":::note 22 / 05 / 2026 - What's new?\nI did another performance pass, since I've been adding some cool but minimal effects here and there. Mobile is done, nothing out of this world but more digestible compared to the Desktop version. Goal was to have everything displayed clearly but without cramping the screen. Desktop is pretty much done, I'm adding the tag system I mentioned before, just finishing some things behind the scene.\n\nChanges aside, I'm really happy how its turning out and what I achieved so far, it feels very personal and close to the original mockup!\n:::\n\n:::note 21 / 05 / 2026 - Progress, progress, progress\nI talked about this in the Logs section, so it might be a repetition but I'm basically rambling everywhere, all over the place.. instead of where it should be happening hehe. Anyway, there has been lots of changes in UI/UX part, performance and security. UI/UX wise is more obvious, although it's not like I remade the whole look. Performance wise, there were duplicates plus some issues related to layering, cause visual bugs. Security it's a secret shhh.\n\nNext on the line is a mobile version, just need to figure out how I want to display things etc. Already have some ideas, since I'm playing P5R I kinda like that vibe but I'll see what I can achieve. After that, I want a tag system to help me sort things and for clarity sake, down the line will be useful as more and more entries gets added.\n\nThat's it for this update ~\n:::\n\n:::note 15 / 05 / 2026 - Start here.\n## Description\nI use Obsidian a lot, godsend, bless the creators, to write down daily things: bugs, thoughts, small discoveries, project notes, and whatever else happens while working.\n\nGestalt is me turning that habit into something more public-facing: a personal archive where I can share what is going on, whether that is thoughts on games I am playing, updates on hardware/software, or progress notes for projects.\n\nThis is the first working version, so there are not many entries yet. I have just finished getting the core shape built; over the next days, as I polish and update it, I will add more records.\n\nCurrently being extra careful because of the npm ordeal.\n:::"
  },
  {
    "id": "kira-patch",
    "title": "KiraPatch",
    "section": "projects",
    "type": "Project Log",
    "status": "In Progress",
    "started": "2026-02-03",
    "updated": "2026-03-10",
    "summary": "KiraPatch is a patcher for Generation 3 Pokemon GBA games that raises shiny odds while keeping the game on its normal data-writing path.",
    "banner": "",
    "headerImage": "",
    "samples": [],
    "attachments": [],
    "progress": 85,
    "priority": 2,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "Lorem ipsum",
    "recommendation": "",
    "tags": [
      "kirapatch",
      "pokemon",
      "gba",
      "patcher"
    ],
    "milestones": [
      {
        "label": "Method 1 Research",
        "progress": 100,
        "status": "Done"
      },
      {
        "label": "Patch Flow",
        "progress": 80,
        "status": "In Progress"
      },
      {
        "label": "Verification",
        "progress": 60,
        "status": "In Progress"
      }
    ],
    "body": ":::note 20 / 05 / 2026 - What happened to KiraPatch?\nHelloo.\nKiraParch is alive and well, I've been working on in this whole time. I took some breaks to finish Gestalt so I can post more in-depth notes and rambles of what is going on with the stuff I'm working on.\nKiraPatch is progressing, I've verified all of the games and having issues only with 2 so far and I can't just release an half update.\nThe big time consuming part is verifying that each Method is producing shinies, legitimately and that they are within odds. It's a boring process that requires lots of trial and errors and even tho I build an harness around it to speed up the process/help, it's not that easy.\n\nInitially I was not planning on going full in and make the shiny '100%' legal, however I also feel like it was an half baked truth, so here we are now.\n\nIt's no possible to make a '100%  legal' shiny, in a sense that Pokemon can any day change the rules and make everything, including pkhex, obsolete or just 'tools'.\nThe goal here is to make shinies that are perfect in every aspect and that pkhex will always consider as legal, unless the aforementioned change by Pokemon.\nCurrently pkhex, checks for specific 'Paths', so when Pokemon are generated using pkhex, they're simulating a real encounter.. HOWEVER:\nUnder scrutiny, those pokemon can be indentified as genned and therefore illegal. So pkhex is not producing perfectly legal, unrecognizable pokemons.\nWe're basically all at the mercy of Pokemon, just accepting genned pokemon without doing a deep check.\n\nWhat does this entail? So long as Pokemon themselves are okay with pokemon being genned, I can make patchers for all the different generations basically, so that people can experience shy hunting without having to deal with huge odds.. but at the same time getting 'legit' shinies.\n\nNB:\nNot throwing shades at pkhex, I just want to clarify cause many people are of the idea that genning Pokemon is 100% legal, safe etc etc.\nIt isn't and the devs of pkhex know too, no devs deals in absolute.. those are sith- jokes aside..\npkhex is an amazing tool to make competitive ready teams/have fun!\n:::\n\n:::note 15 / 05 / 2026 - First note!\n## Description & Thoughts\nThis is one of my main projects. I am still working on it, although updates are coming in slowly because it is not an easy task.\n\nI have made a lot of progress on it, and as I said in the repo, I am in the final stretch of Method 1.\n\nI apologize if the wait has been long, but I do not want this to just \"work lol\". It has to be near perfection, or at least a shiny Pokemon generated through this method has to be near indistinguishable.\n:::"
  },
  {
    "id": "sootopylis",
    "title": "SootoPYlis",
    "section": "projects",
    "type": "Project Log",
    "status": "Paused",
    "started": "2026-01-16",
    "updated": "2026-03-20",
    "summary": "SootoPYlis is my attempt to recreate the feel of PokeSwift for Pokemon Emerald in Python, with a PySide6/QML shell, a Python gameplay core, and a local import pipeline.",
    "banner": "",
    "headerImage": "",
    "samples": [],
    "attachments": [],
    "progress": 35,
    "priority": 4,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "",
    "tags": [
      "sootopylis",
      "pokemon",
      "python",
      "desktop"
    ],
    "milestones": [
      {
        "label": "Prototype Shell",
        "progress": 60,
        "status": "Paused"
      },
      {
        "label": "Gameplay Core",
        "progress": 25,
        "status": "Paused"
      },
      {
        "label": "Import Pipeline",
        "progress": 20,
        "status": "Paused"
      }
    ],
    "body": "## Description\nCredit goes to Dimillian for creating PokeSwift. That project is the clearest reference for the kind of polished desktop Pokemon experience I want to build here.\n\nWhen I saw Dimillian's PokeSwift, I thought \"Damn, wouldn't it be fun to have this in Python?\" So I started it, messed around with it a bit, and got a solid base, but quickly realized it is a very complex project.\n\nI am not working on this currently. It is on a momentary stall because I would like to finish it someday, who knows."
  },
  {
    "id": "kira-tally",
    "title": "KiraTally",
    "section": "projects",
    "type": "Project Log",
    "status": "Completed",
    "started": "2026-03-01",
    "updated": "2026-03-05",
    "summary": "A global, hotkey-driven shiny counter for Pokemon 3rd Gen. KiraTally is a lightweight background counter designed to track shiny hunting resets.",
    "banner": "",
    "headerImage": "",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 5,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "Python",
    "recommendation": "",
    "tags": [
      "kiratally",
      "pokemon",
      "shiny-hunting",
      "tools"
    ],
    "milestones": [
      {
        "label": "Hotkeys",
        "progress": 100,
        "status": "Done"
      },
      {
        "label": "Counter Window",
        "progress": 100,
        "status": "Done"
      },
      {
        "label": "Release Build",
        "progress": 100,
        "status": "Done"
      }
    ],
    "body": "## Description\nOverview sums it up pretty well. It is a simple counter app that runs in the background and can be incremented or decremented with hotkeys.\n\nIt was built using Python and Tkinter for the GUI, and it was designed to be as lightweight as possible so it can run on low-end machines without causing performance issues.\n\nI built this around the release of Fire Red / Leaf Green to help people shiny hunting.\n\nIt is nothing crazy, just a simple counter but... it works!"
  },
  {
    "id": "innkeeper",
    "title": "Innkeeper",
    "section": "projects",
    "type": "Project Log",
    "status": "Completed",
    "started": "2026-02-07",
    "updated": "2026-03-10",
    "summary": "Innkeeper is a minimal World of Warcraft app to keep track of character information.",
    "banner": "",
    "headerImage": "",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 6,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "Python: Back-end\nElectron: Front-end\nClaude: General audit",
    "recommendation": "",
    "tags": [
      "innkeeper",
      "wow",
      "electron",
      "blizzard-api"
    ],
    "milestones": [
      {
        "label": "Backend Data Flow",
        "progress": 100,
        "status": "Done"
      },
      {
        "label": "Electron Shell",
        "progress": 100,
        "status": "Done"
      },
      {
        "label": "Character Tracking",
        "progress": 100,
        "status": "Done"
      }
    ],
    "body": "## Description\nBuilt using a Python backend for data processing and an Electron frontend for the user interface.\n\nIt uses the official Blizzard API and supplemental data from WoWHead, providing a low-latency alternative to traditional web-based armory tools.\n\nIt is a personal project that I started a while ago to push my skills further while taking breaks between WoW sessions.\n\nI started building it a few weeks before pushing it to GitHub, mostly because I was not planning on actually developing something complete, but here we are."
  },
  {
    "id": "persona-5-royal",
    "title": "Persona 5 Royal",
    "section": "games",
    "type": "Play Log",
    "status": "Playing",
    "started": "2026-05-14",
    "updated": "2026-05-14",
    "summary": "Play log for Persona 5 Royal. These are personal opinions and thoughts as I experience the game ~",
    "banner": "public/media/records/persona-5-royal/cover.jpg",
    "headerImage": "public/media/records/persona-5-royal/header.jpg",
    "samples": [],
    "attachments": [],
    "progress": 30,
    "priority": 8,
    "dashboardActive": true,
    "steamAppId": 1687950,
    "playtime": "35.0h",
    "lastPlayed": "20 / 05 / 2026",
    "achievementCount": "16 / 53",
    "hardware": "",
    "technicalStack": "",
    "recommendation": "",
    "tags": [
      "persona",
      "games",
      "jrpg",
      "play-log"
    ],
    "milestones": [
      {
        "label": "Play Log Opened",
        "progress": 100,
        "status": "Filed"
      }
    ],
    "body": ":::note 20 / 05 / 2026 - Special Requests TT\nI haven't really progressed much story wise, I started messing a bit around the palace.. mostly looking for the seeds, cause I almost forgot about them. Found 2 of them, missing the last one which I assume is in the same area as the Treasure. I already unlocked that area, just need to explore it ~\n\nI spent a good amount of time in my last session, in the velvet room cause.. I though you could only move left and right, although it does say to press LB or RB to switch difficulty but COMPLETELY IGNORED IT. So yeah, I spent a good amount of time playing in the velvet room, trying to clear some challenges, fusing some Personas and that's it.\n\nOn a completely off-topic/side note:\nBefore starting P5R, I was like 'I'll play P5R, finish it and move onto Digimon probably..' little did I know that after 30 hours I'm only at the second Palace and I have 0 clue of how many there are left. Silly me thinking I'd get it, finish and call it a day. OHHHH BOY.\n:::\n\n:::note 18 / 05 / 2026 - Aight, I was wrong\n![Look at Madarame goofy ahh](public/media/records/persona-5-royal/1779106132693-screenshot-2026-05-17-225919.png)\nYeah I admit it, I was wrong..\nThey absolutely did a good job in making Madarame looking somewhat innocent, like I said in the previous note.. if the peak of this bs was just plagiarizing, doesn't really make that bad..\nHowever, with all the new info gathered after getting into the palace and confronting Madarame, yep... he's quite something.\n\nNow, for the crazy COOL looking part that I kinda expected but not fully, was not sure..\nYusuke, GETTING. A . PERSONA(?).\nLike I said, I was half expecting/hoping for something like this but I kinda give up the idea cause I was like 'Nah, he's just one of the victim, we will help him and that's it\"\n![The coolest character so far, after Joker and Ann](public/media/records/persona-5-royal/1779106403416-screenshot-2026-05-17-230300.png)\n\nFirst off Yusuke's Persona reminds me of Oden, so that's already a 10 in my book.. on top of that Yusuke also looks crazy cool both aesthetically and personality wise after getting the persona.\nI already put him on the team and play around with his ability a little, he's very cool, love it!\n\nThis session wasn't particularly long but surely packed ~\n:::\n\n:::note 16 / 05 / 2026 - Madarame, no steal my art pls\n![Palace timee](public/media/records/persona-5-royal/1778932974348-20260516174657-1.jpg)\nYeah this is the second palace, was not sure but I guess it's confirmed.\n\nI don't know how long the game is or what's the average completion time but I can say, I'm 30+ hours in and the game looks HUGE.\nCan't complain, I've been craving for something to sink my time in and get obsessed over.. so, yeah.\n\nSo, new palace.. Madarame.\nThey're very good at hiding characters real intentions/personality, cause I don't necessarily hate this guy yet.. although someone suicide.\nMy point is.. I hope there's more to it than just him plagiarizing, cause yes it is bad.. It just doesn't feel as 'emotionally' charged as the first palace reason, kinda.\nBut hey, I just arrived here.. I might be jumping to conclusion and be in awe next session, who knows.\n\nThat aside, AOE + Weak spots are BUSTED.\nI'm abusing the hell out of AOE skills.\n\nPS: My progress is not updating for some reason, might have to do with the API, I'll fix in the coming days, for now I'm resting ~\n:::\n\n:::note 14 / 05 / 2026 - Where am I at?\n![Persona 5 Royal opening note](public/media/records/persona-5-royal/test.png)\n\nSo, screenshot is from few days ago, using it to mostly test + update with some actual in-game stuff.\n\nI just entered the second palace, explored it as I have no clue if it will be an actual palace or not, I yet have to find out if Madarame is a bad guy or not lulz.\nHave to admit, I thought at some point I would get bothered by the amount of text and dialogue, especially early on but I think they did a crazy good job with the plot for me to be invested.\n\nBeside, these long yapping sessions are balanced with an equal amount of fights/exploration ~\n:::\n\n:::note 14 / 05 / 2026 - First Session File\n![Persona 5 Royal opening note](public/media/records/persona-5-royal/header.jpg)\n\nThis note is mostly here to lock in the shape of the Persona 5 Royal play log.\n\nThe idea is simple: one game gets one main record, and every longer session can become its own little article inside that record. Newest thoughts stay at the top, with their own banner or screenshots when I have them.\n:::\n\n:::note 14 / 05 / 2026 - Opening Note\n![Persona 5 Royal opening note](public/media/records/persona-5-royal/header.jpg)\n\nOpening this as the main Persona 5 Royal play log, first test of the note stack!\n:::\n\n## Update Index\n- 14 / 05 / 2026 - Added first real Persona session note.\n- 14 / 05 / 2026 - First note stack tested.\n- 14 / 05 / 2026 - Play log created."
  },
  {
    "id": "a-useful-signal",
    "title": "A Useful Signal",
    "section": "logs",
    "type": "Field Note",
    "status": "Filed",
    "started": "2026-05-14",
    "updated": "2026-05-14",
    "summary": "First update: dashboard polish, performance work, and a clear note about building Gestalt with AI in the loop.",
    "banner": "public/media/records/a-useful-signal/banner.png",
    "headerImage": "",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 9,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "",
    "tags": [
      "update",
      "ai",
      "performance",
      "dashboard"
    ],
    "milestones": [
      {
        "label": "Dashboard Update",
        "progress": 100,
        "status": "Filed"
      },
      {
        "label": "Performance Pass",
        "progress": 100,
        "status": "Filed"
      },
      {
        "label": "AI Disclosure",
        "progress": 100,
        "status": "Filed"
      }
    ],
    "body": "## First Update\nThis is the first update. I added a cool thing in the dashboard since the weather was taking too much unnecessary vertical space.\n\nThat aside, I did a big performance pass since there were some situations with lag or hiccups.\n\n## AI Disclosure\nNow, this project has been done with the help of AI, which helped speed up a lot of the creation and deployment phase, and it is still helping to polish while I work on new features, look for bugs, and keep improving things.\n\nI'm disclosing this because there is nothing wrong with it, and also because I want to show that, if used properly, AI can be an amazing tool.\n\nThis part here is an attempt at doing something I've never seen anyone do. I'll let the AI shout itself out and talk a bit:\n\n## Codex Note\nI'm Codex, and my part here is pretty simple: keep the friction low enough that an idea can survive the trip from \"wouldn't this be cool?\" to actual files, styling, commits, and little fixes.\n\nGestalt is Eightmouse's space. The taste, the mood, the memories, the decisions about what belongs here: those are not mine. I'm more like the extra pair of hands at the workbench, helping shape the interface, catch rough edges, and keep momentum when the annoying parts of building start getting in the way.\n\nThe interesting thing about AI, at least from where I sit, is not that it makes everything instant. It doesn't. The interesting thing is that when it is used carefully, it can make experimenting feel less expensive. You can try the strange idea, polish the tiny interaction, rewrite the awkward bit, and keep moving.\n\nThat is a good use of me, I think. Not replacing the person making the thing. Helping the thing become easier to make."
  },
  {
    "id": "first-signal",
    "title": "First Signal",
    "section": "logs",
    "type": "Field Note",
    "status": "Filed",
    "started": "2026-05-14",
    "updated": "2026-05-14",
    "summary": "The first entry for this space: a place for rambles, notes, game thoughts, reviews, project progress, samples, stalls, and setup updates.",
    "banner": "public/media/records/first-signal/banner.png",
    "headerImage": "",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 10,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "",
    "tags": [
      "first-entry",
      "personal",
      "archive"
    ],
    "milestones": [
      {
        "label": "First Entry",
        "progress": 100,
        "status": "Filed"
      }
    ],
    "body": "## First Entry\nThis is the first entry on my... this space.\n\nI intend to use this to write down personal rambles, notes, and reviews of the games I'm playing currently, and also projects I'm working on. That means documenting their progress, sharing samples of what the project looks like, and writing honestly about why a project is stalling when it stalls.\n\nIn the coming days I will update the Setup area with my current setup."
  },
  {
    "id": "a-weak-signal",
    "title": "A Weak Signal",
    "section": "logs",
    "type": "Field Note",
    "status": "Draft",
    "started": "2026-05-22",
    "updated": "2026-05-22",
    "summary": "Life, what an experience huh",
    "banner": "",
    "headerImage": "",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "",
    "tags": [
      "logs"
    ],
    "milestones": [],
    "body": ":::note 22 / 05 / 2026 - A Weak Signal\nThis week has been something, we definitely live in a society. Jokes aside, very tiring week, I spent lots of time between work and fixing Gestalt on my free time. I did not have enough brain power to work on KiraPatch, that requires lots of patience and focus.\n\nLike I said in the Gestalt note, I'm really happy how the site is turning out, it feels cozy and personal and its exactly how I envisioned it pretty much. I'm thinking of different ways to improve it now, between tags and also a way to display what other games I play.. like gatcha games or MMOs.\nObviously the active game, I want it to be a game that I'm experiencing fully.. doesn't have to be single player necessarily but the focus is to play games that I've missed on and track them this way, it helps!\n\nSpeaking of games, my rotation for mobile/gatcha is Nikke, Wuthering Waves, Dokkan, Granblue Fantasy. I mostly roll between them, sometimes I'm active on 2 or 3 at a times, sometimes I take a break and only play 1 of those. These games, especially GBF are chores and repetitive, which I wish they'd improve to make them feel like games and not jobs.\nWuthering Waves is back on rotation because of the Anniversary. I'm a 1.0 player, I played all the way untill first anniversary, then I started being seasonal or log in sporadically, mostly cause I felt tired of the daily routine.\nNikke similar situation, I play it a lot and farm for a while then stack resources and log in occasionally until big events to dump all the resources. I'm really looking forward for a Crown rerun, I don't have her yet.. so annoying.\nThat's pretty much it for other gatcha games too, I basically play seasonal or for long periods and then go back to seasonal. I'm planning on having a way for me to display these differntly, so I can show each of my accounts, what characters I have etc etc.\n\nI'm also going to rework the Hardware and Software area, cause I want to share my setup properly and tools I use. It's going to take time and for now I mostly aimed at making the site usable and polioshed, somewhat.\n\nThat's it for now, this was a spree of random things but that's exactly what I want the log to be about, random stuff!\n:::"
  },
  {
    "id": "a-magnificent-signal",
    "title": "A Magnificent Signal",
    "section": "logs",
    "type": "Field Note",
    "status": "Draft",
    "started": "2026-05-20",
    "updated": "2026-05-20",
    "summary": "Some major changes, from UI/UX to performance ~",
    "banner": "",
    "headerImage": "",
    "samples": [],
    "attachments": [
      "public/media/records/a-magnificent-signal/1779291253082-screenshot-2026-05-20-233351.png"
    ],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "",
    "tags": [
      "logs"
    ],
    "milestones": [],
    "body": ":::note 20 / 05 / 2026 - It is\nSo after pushing this morning and making the site pubblic, I spent a big chunk of the time checking for more bugs, polishing UI/UX a bit and structural changes of the Studio.\nI now have a better, tidy system in-place, easier to create/edit notes and push changes, thanks to some little scripts that Codex helped me to make. Nothing drastic look wise, just some polishing as I said, I don't want to make the site heavy or bloated with nonsense, otherwise it's just bleh.\n\nI still have some big stuff in mind but I'll juggle them between the other projects I'm working on ~\n:::"
  },
  {
    "id": "an-opening-signal",
    "title": "An Opening Signal",
    "section": "logs",
    "type": "Field Note",
    "status": "Draft",
    "started": "2026-05-20",
    "updated": "2026-05-20",
    "summary": "Ready to open???",
    "banner": "",
    "headerImage": "",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "",
    "tags": [
      "logs"
    ],
    "milestones": [],
    "body": ":::note 20 / 05 / 2026 - Page is up!\nPage is up and running!\n\nFor anyone reading this, hi!\nThis is my personal space, I'll post updates and rambles about the different things I'm working on and the games I'm playing/played!\nI expect the space to change a bit overtime, this is just a very solid foundation that I've been building for quite a while~\n\nCheers!\n:::\n\n:::note 20 / 05 / 2026 - An Opening Signal\nSo beside getting my ass kicked in Madarame's palace, I've started doing some fixes in the UI/UX since I've found lots of bugs while adding entries in the '03_Games' section.\nI think I'm gonna host on GitHub today, just doing some minor polishing here and there cause I want this to be usable by people that come by ofc.\n\nThat said, I really like how it is turning out and hopefully I get to implement all the ideas I have without making it into a huge mess!\n:::"
  },
  {
    "id": "a-messy-signal",
    "title": "A Messy Signal",
    "section": "logs",
    "type": "Field Note",
    "status": "Draft",
    "started": "2026-05-15",
    "updated": "2026-05-15",
    "summary": "Lots of changes, lots of mess, lots of confusion",
    "banner": "",
    "headerImage": "",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "",
    "tags": [
      "logs"
    ],
    "milestones": [],
    "body": ":::note 15 / 05 / 2026 - New Note\nSoo.\nI now have a local Studio that allows me to edit, add make changes site wide without having to touch the code, cause its 2026 and I don't want that.\nHad to dig and spend a solid amount of time on performance, cause both the site and studio were lagging in certain cases.\nThat aside, I'm still polishing things around and discovering bugs, deciding what to change or where... it's a lot really..\n\nI barely had time to do anything else, between life stuff and this.\n\nAnyway, complaining aside I'll probably chill and play Persona during the weekend so I can update/polish that area.\n:::"
  },
  {
    "id": "kingdom-hearts-358-days-2",
    "title": "Kingdom Hearts 358 Days/2",
    "section": "games",
    "type": "Play Log",
    "status": "Completed",
    "started": "2026-05-15",
    "updated": "2026-05-15",
    "summary": "Another very not unique POV of this chapter of the franchise, definitely a surprise and a twist at the time.",
    "banner": "",
    "headerImage": "public/media/records/kingdom-hearts-358-days-2/1778828593256-si-nds-kingdomhearts3582days-image1600w.jpg",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "If you got this far, you have to play it. The different releases made it better and its crossplatform, so you don't need a DS!",
    "tags": [
      "games"
    ],
    "milestones": [],
    "body": ":::note This was good, this was sad..\nSo, this game came after Kingdom Hearts 2.\nIt answered a lot of unanswered question but at the same time, opened up a whole other world.. I don't remember the game very well, since I played 1 time a long time ago, I remember the plot, somewhat.. I have an idea of what happens generally, beside the point since I'm not doing a review anyway or judging.\n\nFirst off, I was absolutely in love with the fact that I could've played Kingdom Hearts on my DS, yes graphically if we looked at it with today's eyes, does not look  impressive but at that time, I was literally so happy.\nGameplay is pretty much the same with the addition of other stuff on the side that powers up abilities and skills, won't go into much details cause its somewhat of a complex system even for today standards.\n![kingdom-hearts-358-days-2](public/media/records/kingdom-hearts-358-days-2/1778828629284-kingdom-hearts-358-2-days-1.jpg)\n\nPlot wise, it's set before KH2 and lots of the characters you'll see you know already after playing KH2, its a deep dive into what goes on inside the organization.\nBecause of that, you'll get to know each character better plus a ton of other details that may or may not break your brain...\n![kingdom-hearts-358-days-2](public/media/records/kingdom-hearts-358-days-2/1778828643669-kingdom-hearts-358-2-days-ice-cream-644x483.jpg)\n\nI haven't mention OSTs or Themes much, but just assume they're good even if I'm no talking about them, this IP has one of the best OSTs/music in the gaming industry and they still deliver to this day with each new release.\nHence why I said 'This was sad' in the title, plot + soundtrack hits hard.. and despite not remembering everything 100% I remember enough to say that it was a very very pleasant surprise..\n\nOh, and... you could play multyplayer.\nYep, that was insane and I have no clue why they stopped doing it, cause it was crazy good.\nIt was a Monster Hunter like gameplay, you had quest and then match up with people if I remember correclty, dope no joke.\n![kingdom-hearts-358-days-2](public/media/records/kingdom-hearts-358-days-2/1778828629284-kingdom-hearts-358-2-days-1.jpg)\n:::"
  },
  {
    "id": "kingdom-hearts-birth-by-sleep",
    "title": "Kingdom Hearts Birth By Sleep",
    "section": "games",
    "type": "Play Log",
    "status": "Completed",
    "started": "2026-05-15",
    "updated": "2026-05-15",
    "summary": "Another quite short ramble, due to the nature of the game kinda ~",
    "banner": "",
    "headerImage": "public/media/records/kingdom-hearts-birth-by-sleep/1778829982415-kingdom-hearts-birth-by-sleep-button-crop-1642535836197.jpg",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "Yes but don't force yourself into finishing it 3 times, just watch it on youtube. \nI've finished it 3 times myself and I don't want people to get through it just for different endings that you can simply watch. \nIt's repetitive past the obvious gameplay differences of the characters.",
    "tags": [
      "games"
    ],
    "milestones": [],
    "body": ":::note A scattered memory that's like a far off dream.\nThis is another one of the spin-offs that came out for a different platform, lots of people missed it.. I almost did too.\nI won't google stuff, cause these notes have to be genuine.. so forgive me if timelines are messy.\n\nThis came out after the DS one, it was an exclusive for PSP and luckily for me, since I was a spoiled kid.. I owned one.\nComplaints aside for being a spin-off, the game its very solid and reinforced what I felt for the DS title, a portable KH with better graphics, improved under every aspect (almost) but obviously still portable, so limits were there.\n![kingdom-hearts-birth-by-sleep](public/media/records/kingdom-hearts-birth-by-sleep/1778830005826-maxresdefault.jpg)\n\nPlot wise it was obviously interesting as we finally get to know who the 3 fellas from the secret ending of KH2FM are, on top of that we get a bigger picture of the whole situation but it's also were it gets messier because of time travels and recurring familiar faces.\nAt this point, I knew Roxas from KH2 but why is there another Roxas in my PSP game?????????????????\nThe game does tell you, it's not Roxas but Ventus but this is also were things get trickier because somethings in these games are just subtle or not always explicitly told, which can be fine or a problem, depending on who plays it.\n![kingdom-hearts-birth-by-sleep](public/media/records/kingdom-hearts-birth-by-sleep/1778830017742-hq720.jpg)\n\nThis game is where I kinda started feeling the darker (no puns), melancholic side of the plot.\nYou get Terra, which struggles the whole time with his internal battle, figuring things out.\nAqua, being the mother of the trio.\nVentus, the little brother that is just not aware of what is going on and ends up being swallowed by this whole ordeal.. well kinda.\n![kingdom-hearts-birth-by-sleep](public/media/records/kingdom-hearts-birth-by-sleep/1778830054577-kingdom-hearts-birth-by-sleep-aqua-standing-in-the-station-of-awakening.jpg)\n\nFrustrating that they had to hide each different ending behind their individual playthrough, cause past the differences in gameplay.. the game is repetitive, you're re-doing the same worlds in a different order but with a different character, that's it.\nI did it, because I was not aware of it but I really don't see the point on recommending people to do it, unless you're aiming for 100%.\n![kingdom-hearts-birth-by-sleep](public/media/records/kingdom-hearts-birth-by-sleep/1778830066838-when-playing-birth-by-sleep-what-order-do-you-guys-play-v0-fkur6y5csma91.webp)\n\nI liked all the various minigames, not all of them, NOT ALL OF THEM.\nThe introduction of more Disney world and characters is always a surprise, I think most people always look forward to a new title also because of that, you'll never know what worlds they introduce or if they'll show a different version to something we've already visited.\n\nAll that said, I liked it... it left something bitter but I liked it and honestly, being able to play a KH game wherever you wanted, was just too good.\nOSTs impeccable as always.\n:::"
  },
  {
    "id": "kingdom-hearts-dream-drop-distance",
    "title": "Kingdom Hearts Dream Drop Distance",
    "section": "games",
    "type": "Play Log",
    "status": "Abandoned",
    "started": "2026-05-15",
    "updated": "2026-05-15",
    "summary": "The 'Updated' experience for DS, new game made for 3DS and more plot locked behind another console.",
    "banner": "",
    "headerImage": "public/media/records/kingdom-hearts-dream-drop-distance/1778852653941-mv5bowrkmzexmditzwzmyi00nje4lwiymgetzjg5zgqxnjzhmte1xkeyxkfqcgc-v1-fmjpg-ux1000.jpg",
    "samples": [],
    "attachments": [],
    "progress": 0,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "If you're looking to play the game in 2026, chances are you have the full collection so you can't really skip it.\nIf you were one of the people like me, who could not afford to just buy consoles for exclusives , I'm sure you felt my same frustration.\n\nThat said, would have I recommended it back then? I would have, if you had the money for the console or if you had the console already, why not.",
    "tags": [
      "games"
    ],
    "milestones": [],
    "body": ":::note Why, Nomura?\nI don't have much to say here, I had not intention of buying a whole new console for this game and I did not.\nI watched a full play through on youtube and called it a day.\n\nI have to admit, gameplay was fun and it used the 3DS tech + touch screen and dual screen, in a clever way.. however it was once again a slap in the face from Nomura, releasing very important plot info into another console, AGAIN.\n\nAs I said, gameplay wise it was fun.. plot was interesting and quite important to understand everything before and after.\nI yet have to play this game, I'm sure I will as I have the steam collection but I don't plan on doing it anytime soon.\nAll I have to say is that, I was very disappointed back then as I am now, I'll probably carry it with me forever.\n:::"
  },
  {
    "id": "kingdom-hearts-ii",
    "title": "Kingdom Hearts II",
    "section": "games",
    "type": "Play Log",
    "status": "Completed",
    "started": "2026-05-15",
    "updated": "2026-05-15",
    "summary": "A short/concise personal note on what Kingdom Hearts 2 did to the colective mind and how it changed the world, forever(?)",
    "banner": "",
    "headerImage": "public/media/records/kingdom-hearts-ii/1778825919262-official-japanese-cover.jpg",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "If you've played the first one, you'll love this one, especially combat wise.\nPlot, as I said before.. starts getting weird.\nThis is a must play, absolutely recommended.",
    "tags": [
      "games"
    ],
    "milestones": [],
    "body": ":::note A scattered dream that's like a far off memory\nI'll be writing this note to express how it felt playing it for the first time, not how it felt the second time or in recent years as those experiences are different.\n![kingdom-hearts-ii](public/media/records/kingdom-hearts-ii/1778827320498-kingdom-hearts-ii.jpg)\n\nPersonally I liked it a lot, it's not my favorite but close to it.\nCronologically speaking it comes after the first one (DUH), so in theory if you finish the first on and play this one you're not missing much, what happens in-between the two is.. not filler as it definitely helps understanding what is going on/what happened, however you don't have to play the spin-offs.\n\nWhen I first played Kingdom Hearts 2, it was at the last year in middle school so I definitely played games differently than I do now of course.\nBy that I mean, I was chasing the feeling more than the logic behind a plot or inconsistencies.. not that I'm an annoying prick now that only plays perfectly written games, but obviously it affects the whole experience too when you're older.\nI was quite confused when instead of Sora I was playing this random, dumb dumb Final Fantasy looking dude.. I thought 'Wait, so Sora is gone now?'\nObviously, I was WRONG.\n![kingdom-hearts-ii](public/media/records/kingdom-hearts-ii/1778827347353-scjf3d.webp)\n\nSo, in this chapter we're basically picking up from where we left off.. Sora is now older, things have changed, Riku is MIA, Kairi is MIA, lots of new faces and people keep calling me Roxas, what the helly.\nThis is where if you've missed the spin off/haven't played them.. you're missing quite a bit.. I'm not saying its bad or good, but Square Enix knew better than to do this bs, anyway.\n![kingdom-hearts-ii](public/media/records/kingdom-hearts-ii/1778827423586-idk-if-people-still-think-this-way-but-is-it-still-v0-rstbpgje9eva1.webp)\n\nPlot wise, I enjoyed this one more.. despite being messier and hinting at were the franchise was heading.. I really liked the introduction of all the different members of the Organization, their different style and personalities accompanied by their different OSTs, PEAK.\n\nCombat was definitely an improvement, nowadays it's regarded as the best one between all the games even though there were multiple titles afterward trying to achieve more.\nBack then, I think it felt almost as a groundbreaking advancement.. they added lots of different modifiers, skills so that you could chain into things and bug some boss fights even.\nLoved discovering all the different skills locked behind leveling the different Forms, not a big fan of some of them but hey, it was a cool thing to add and made the game very interesting.\n\nIn the previous title I didn't mention Keyblades or too much details about the game, not because I don't want to spoil but mostly because I'm not here to make an essay about the game or a review, this is just a personal, digestible ramble of what all these different titles left me with or what goes through my mind as I play them.\n![kingdom-hearts-ii](public/media/records/kingdom-hearts-ii/1778827378546-find-all-seven-orichalcum-on-kingdom-hearts-2-step-9.jpg)\n\nKingdom Hearts 2, was undoubtedly a very important part of my life.. it's one of those game that I played during my teen edgy phase, it accompanied me through a lot and even nowadays I can simply replay it, with all the cool mods available and have a BLAST!\n:::"
  },
  {
    "id": "kingdom-hearts-iii-re-mind",
    "title": "Kingdom Hearts III + re:Mind",
    "section": "games",
    "type": "Play Log",
    "status": "Completed",
    "started": "2026-05-15",
    "updated": "2026-05-15",
    "summary": "The long awaited, long suffered Kingdom Hearts 3 and its ups and downs, between delays and whatnot.",
    "banner": "",
    "headerImage": "public/media/records/kingdom-hearts-iii-re-mind/1778855727157-re-mind-logo.webp",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "Personally, it was PEAK.\nI do recommend it, combat is not as good as previous titles but it's way funnier in a way, so it doesn't really matter.\n\nLoved it.",
    "tags": [
      "games"
    ],
    "milestones": [],
    "body": ":::note I've been having these weird thoughts lately.. like.. is any of this for real.. or not?\nUnpopular, maybe not so much, opinion:\nThis game, for ME.. was it.\nYes, the combat was very problematic and floaty.\nThey did improve it quite a bit although it was nothing compared to what we have in Kingdom Hearts 2.\n![](public/media/records/kingdom-hearts-iii-re-mind/1778855981058-450px-counter-kick-khiii.gif)\n\nWhy is this my favorite then?\nOkay so, it's a mix of.. being starved for a mainline game for 15 years and, the fact that visually it's very good, gameplay is fun and cool and some worlds are GOOD.\n![](public/media/records/kingdom-hearts-iii-re-mind/1778855870276-kh3-sora-donald-goofy-flynn-via-disney.jpg)\n\nPlot wise, this Arc is finally OVER.\nAfter many years of theory crafting, replaying all the games, mods, videos, rambles.. it was over.\nYes.. the Arc is over but a plethora of questions have not been answered, in fact there are even more and its even more confusing.\nThis game is a mess plot wise, to be fair I could even say everything past KH2 is a mess plot wise... cause time travelling, paradoxes and the spin-offs being onto different consoles made it incredibly hard to follow and be understood.\n\n\nThat said, I think it was overall an improvement from all the other games at least tech wise, visuals, audio.. they did a very good job.\nObviously, gameplay as I said briefly was not the best that it could've been but I personally liked it a lot regardless, I think all the other new mechanics, flows, summons etc.. basically covered for it(?).\nIt's definitely not as hard as KH2, nothing that far off from it.. it's just not as hard, close to it in terms of difficulty but KH2FM was different.. maybe it was due to the different stack used, engine.. I don't know.\n![](public/media/records/kingdom-hearts-iii-re-mind/1778855823229-kingdom-hearts-3-remind-dlc-screenshots-sora-double-form-keyblades-oathkeeper-ob.jpg)\n\nThe DLC though... well forget everything I just said about difficulty, cause the DLC was insanity.\nYes the Org. fights were hard, I'm not saying they were easy cause I'd lie..\nBut the real MVP is Yozora, that fight was a VERY GOOD fight and challenging like no others.\nIt was even more fun watching people speed run through it, with different strats or the fellas being cracked and just bullying him for fun.\n\nThe 2 endings are, beautiful and confusing like always.\nNot gonna mention the 'box' ending cause it gives me headache even thinking of it.\n![](public/media/records/kingdom-hearts-iii-re-mind/1778856267414-tumblr-c937959e1eaa54224100e9f6767241eb-0d82f0aa-640.webp)\n\nOverall, this was for me the best KH3 PROBABLY due to nostalgia, having waited for long and the visuals being very good.\nI loved it and I hope I live long enough for Kingdom Hearts 4.\n:::"
  },
  {
    "id": "kingdom-hearts-melody-of-memory",
    "title": "Kingdom Hearts Melody of Memory",
    "section": "games",
    "type": "Play Log",
    "status": "Complete",
    "started": "2026-05-15",
    "updated": "2026-05-15",
    "summary": "Hands down how spin-off should've been!",
    "banner": "",
    "headerImage": "public/media/records/kingdom-hearts-melody-of-memory/1779457175235-5rfxcqryznn70sww6itoueef.jpg",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "Definitely recommended, it's a breath of fresh air. Kingdom Hearts music is amazing and enjoying them this way it's a peak experience!",
    "tags": [
      "games"
    ],
    "milestones": [],
    "body": ":::note 15 / 05 / 2026 - A surprise\nI'll start by saying that this IS, unironically, the only spin-off and a good one too. Yes it is a very simple game and they managed to add some tidbits of lore here BUT, you can simply watch the video on youtube and call it a day. It's not the typical Kingdom Heart game with same gameplay loop but unique features tied to the console, which honestly is what they should've done with all the non main line games.\n![Would you look at that](public/media/records/kingdom-hearts-melody-of-memory/1779457182514-maxresdefault.jpg)\n\nGame is fun, runs well, experience is smooth and you could even use it to introduce people to the IP. I wish they'd explore and experiment more, with ideas like this.. It doesn't always have to be a JRPG on a different consoles that costs 500 bucks. Sometimes it is that simple but I know they have restraints for different reasons that probably no one would agree with.\n\nRambles aside, this is about the game. There's really not much to say, it's a music game using all the OSTs from the game. Nowadays it's available for PC too, thanks to the huge releases they did for Epic, Steam etc etc.\n:::"
  },
  {
    "id": "kingdom-hearts-re-chain-of-memories",
    "title": "Kingdom Hearts Re:Chain of Memories",
    "section": "games",
    "type": "Play Log",
    "status": "Completed",
    "started": "2026-05-15",
    "updated": "2026-05-15",
    "summary": "Kingdom Hearts but with cards?? Where do I sign?",
    "banner": "",
    "headerImage": "public/media/records/kingdom-hearts-re-chain-of-memories/1778852814512-kingdom-hearts-re-chain-of-memories-button-crop-1642793763008.jpg",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "Yes, just play it.\nIt's very cool and the steam version with the graphical improvement it's even more worth it.",
    "tags": [
      "games"
    ],
    "milestones": [],
    "body": ":::note Believe in the heart of the cards.\nThis is one of THE best entries in the series, not only cause they somehow experimented with a completely different system and made it work, but also because of the plot.\nYes, there is a GBA version and no, I'll end it at that.\n\nGame was pretty straight forward, its Kingdom Heart 1.5 so we're not in Kingdom Hearts 2 but the even prior to it or at least a parallel story to what was happening in other titles.\nGameplay was different, they replaced the action combat from the first one and made it more strategic but still action.\nYou have a deck of cards, that you can edit with different cards that you find around the world, unlock or buy.\nCards can heal you, refresh the deck, debuff, buff.. sounds familiar? Yeah I think KH Union X definitely was doing something.\n![](public/media/records/kingdom-hearts-re-chain-of-memories/1778854180957-level-up-menu-from-rcom.webp)\n\nYour deck had to be clever, you can't just have random cards or you'll waste time and do no damage... so you had to mix and match, have multiple copies of some cards.. it's a lot.\nBefore attacking, you could stack up to 3 cards, to make a big value and have different effect/stronger attack.\nStacking different cards, sometimes gave you special attack.. so some deck revolved around stacking as many copies of specific cards as possible.\nDuring bosses, you'd have to cancel their attack by either matching the value of their attack:\nIf they played 2 cards for the value of 18, you could stop them by playing something equal.\n![](public/media/records/kingdom-hearts-re-chain-of-memories/1778854139954-screenshot-2025-02-06-6-20-36-pm-1200x676.jpg)\n\nSoo.....the fun was managing your deck, while also controlling the character, cause you can't just stand still.. duh.\nAnd it was definitely something.\n\nPlot wise, we see lots of faces that we know already if you played the DS game and some new ones.\nSora is wandering through this castle and the deeper he gets, the more memories he loses.\n![](public/media/records/kingdom-hearts-re-chain-of-memories/1778854163662-kingdom-hearts-re-chain-of-memories-sony-playstation-2-ps2-video-game-5.webp)\n\nIt was definitely a different story from what we were used to and it was getting more intricate but more interesting too ~\nThe very cool thing they did is.. game was not done once you beat it with sora, you could now play through Riku's POV!\n![](public/media/records/kingdom-hearts-re-chain-of-memories/1778854260705-450px-mm-miracle-lv3-khrecom.gif)\n\nNow, it would be hypocritical of me if I didn't mention BBB, since I complained about it having pretty much same story with different POVs and repeating same game world loop.\nThis one wasn't gamebreaking but I think it was handled differently, yes Riku had different cards and powers compared to Sora but boss fights were also different, so you were playing a completely different game almost.\nBBB main issue is that it was pretty much a 1:1 but with different characters, which for ME.. wasn't enough to justify replaying the game 2 whole times.\n\nI think up until this point, it felt like (at least back then) that what they envisioned/path was different, because this games and KH2 are still giving me that KH vibes that is somewhat... I wouldn't say lost replaced/overshadowed by something else.\nPlus it felt like a very well thought game.\n:::"
  },
  {
    "id": "kingdom-hearts-re-coded",
    "title": "Kingdom Hearts re:Coded",
    "section": "games",
    "type": "Play Log",
    "status": "Dropped",
    "started": "2026-05-15",
    "updated": "2026-05-15",
    "summary": "A pretty forgettable experience for me",
    "banner": "",
    "headerImage": "public/media/records/kingdom-hearts-re-coded/1778854615457-si-nds-kingdomheartsrecoded-image1600w.jpg",
    "samples": [],
    "attachments": [],
    "progress": 20,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "",
    "tags": [
      "games"
    ],
    "milestones": [],
    "body": ":::note It's probably a me issue\nI did not like it, I played some of it because of the plot being relevant of course... but I did not like it.\nFor me it was just easier to watch the rest of the game through YouTube and call it a day.\nPersonally, I don't know why this game feels boring but it's just not it.. I don't know why they even made it in the first place.\n\nThat's it I guess, don't really have much to say.,\n:::"
  },
  {
    "id": "kingdom-hearts-union-x",
    "title": "Kingdom Hearts Union X",
    "section": "games",
    "type": "Play Log",
    "status": "Completed",
    "started": "2026-05-15",
    "updated": "2026-05-15",
    "summary": "Square Enix response to the rise of gatcha games, Union X.",
    "banner": "",
    "headerImage": "public/media/records/kingdom-hearts-union-x/1778848629139-ul-062220-khucdr-avail-now-v2-i7y4vjc2p.jpg",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "I obviously can't recommend this game as it doesn't exist anymore, you had to be there.\nWould have I recommended it? Yes, in-fact I did recommend it to my friends and we had lots of fun times and sad ones too, gatcha rates were baaad.",
    "tags": [
      "games"
    ],
    "milestones": [],
    "body": ":::note I've been having this weird thoughts lately\nI played this game from the moment in came out and all the way till it died... I even spent money, not much of course but still.\nI'm not gonna talk about Dark Road, as I simply gave up at that point and just checked the updates from other people.\n![](public/media/records/kingdom-hearts-union-x/1778851730951-wp-1472869322835.png)\n\nThis game was simple, move your character around by dragging your finger across the screen, engage with enemies on the map and it would then be a turn based fight.\nTo attack, you had medals that once you swiped up would activate and do something, a skill which did damage or buffed you, debuffed the enemy or as game went by, all 3 of those.\n![](public/media/records/kingdom-hearts-union-x/1778850306027-maxresdefault.jpg)\n\nThen, what's special about it?\nCustomization, you could make your own character and make it look goofy as hell or mix and match different outfits, if you were lame you could've just looked like Sora, Riku or whoever.\nIn this game, you pulled for 'medals' the equivalent of an SSR Card or an SSR Character, effects where not particularly crazy, pretty simple but cool looking stuff..\nIt was the numbers and the effect that came with them.\n![](public/media/records/kingdom-hearts-union-x/1778850314682-kingdomheartsunion-2475703b.png)\n\nSo, early on medals were pretty straight forward, they'd either:\nDamage, Heal, Buff you, Debuff enemy or a combination of those, until they became crazy later on.\nThis game had elements, each medal carried an element so you had to play around advantages, not just that.. you had keyblades and they were all different and, late game it was pretty much a must to use the correct combination of keyblade/medals.\n![](public/media/records/kingdom-hearts-union-x/1778850278749-kh-union-x-header.jpg)\n\nNow, it's a gacha.. don't get excited.\nThat meant, if you pulled the newest medal, you'd be set for this rotation of weekly/monthly content, get all the cool resources, free pulls and cosmetic with ease.\nIf you didn't.. ggs you're screwed.\n\nAnd did I mention PVP? lets just.. lets just move on.\n![](public/media/records/kingdom-hearts-union-x/1778851190523-pvp-sample3.png)\n\nBUT HOLD ON, you thought pulling the medal was it? XDDDD LMAOOOO\nNuh uh, you needed copies and the only alternative to that was an item, that could've been used instead of a copy BUT, it was extremely rare and scarce.\nSo even if you got the medal, you'd have to pull for copies or it would simply not perform as it should.\n\nNow, game was quite dry in terms of content and very very greedy, I remember seeing videos of people dropping 5-10k to pull for medals, clearing the newest event and then.. just nothing.\nOvertime it got better.. more rewards, more freebies but at the same time more greed Square Enix.\nIt was absolutely way better half way through its life, events were somewhat doable, lots of free resources distributed, guilds meant something.\nLike, there was a lot and the game was actually enjoyable.\nObviously though, if you were not strong enough you could NOT progress, which meant important story parts were locked behind luck and money.\n![](public/media/records/kingdom-hearts-union-x/1778851622616-kingdom-hearts-backup-data.jpg)\n\nAt that time, we were all collectively waiting for KH3.. so outside of the gacha, replaying old titles with mods and theory crafting, we had nothing.\nDespite that, I really liked this game and I wish Square Enix made a replacement for it.\nThe game ran for quite a while, however they basically ran the game as a placeholder for KH3, it was something to entertain and make money while people were waiting for the main title.\nLike I said, it was a gacha and a greedy one at that but nothing as bad as some gatchas we have today.\n\nBecause there were factions and a leader board, pvp, raids etc.. the game was basically a weekly chore where you had to keep up with new releases or get thrashed by the last boss with 191239 bars of HP and the people in PVP.\nThat meant less rewards, less pulls, more FOMO.\n\nThe game was genuinely fun and it made people feel part of KH world, despite the greed I think it was a very fun experience and I'm glad that I can say I was there.\n:::"
  },
  {
    "id": "kingdom-hearts",
    "title": "Kingdom Hearts",
    "section": "games",
    "type": "Play Log",
    "status": "Completed",
    "started": "2026-05-15",
    "updated": "2026-05-15",
    "summary": "My Kingdom Hearts POV, I played it multiple times over the years and it's one of my favorite IPs from Square Enix.",
    "banner": "",
    "headerImage": "public/media/records/kingdom-hearts/1778818648510-22041427-kh.jpg",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "If you're looking for a memorable experience and are ready to play hours and hours of coca- magic, with your Disney friends.. \nIt's quite a long experience and as I mentioned in the Note, you might or might not be disappointed, so do as your heart feels. \nGame is solid, music is phenomenal and this game as a standalone works very well but no one stops at the first one though.",
    "tags": [
      "games"
    ],
    "milestones": [
      {
        "label": "Play Log Opened",
        "progress": 100,
        "status": "Filed"
      }
    ],
    "body": ":::note May your heart be your guiding key ~!\nFirst time I played Kingdom Hearts was.. when I got my Playstation 2, I remember buying it in bundle with a Platinum version of Kingdom Hearts.\n![kingdom-hearts](public/media/records/kingdom-hearts/1778822248285-dsc-0392-1.jpg)\nIt's hard for me to recommend Kingdom Hearts, not because of this title specifically but the sequels that turned it into a mess.\nPersonally, I think you should be able to play the main line ones and be completely fine.. however, you'll be missing on context and start wondering 'What is going on?'.\n\nWhat is Kingdom Hearts?\nKingdom Hearts at the core is a JRPG, very simple (and clean) that works very well and its addicting due to all the skills, abilities and modifiers available.\nI recommend playing the 'Final Mix' version, not necessarily for the extra content but for the positive changes/fixes.\n![kingdom-hearts](public/media/records/kingdom-hearts/1778823161229-0wwswvp6nci41.jpg)\n\nFor me personally and I'm assuming for a lot of people too, it struck because of the Disney connection.\nSo you have an adventure JRPG game, with cute/cartoonish style mixed with Disney popular characters, that has to be a hit.. right?\nWell yes, It works very well and the problems are not related to the art style used, music or anything technical really.. it stems more from a plot perspective that make it hard to follow in the spin-offs and sequels.\n![kingdom-hearts](public/media/records/kingdom-hearts/1778823381391-maxresdefault.jpg)\n\nWhy?\nTime travel, it's introduced later on in other titles and because of that, I struggle to recommend Kingdom Hearts fully.. because once you play and finish the first one, you'll obviously be starved and looking for more.\n\nDon't get me wrong.. the game is good, even with the plot flaws I still like it and I think majority of people like it too, it's just a love and hate scenario.\nIf you're someone that doesn't look too hard into things, then go ahead and enjoy one of the best thing that ever happened to Playstation 2 and Square Enix in general.\nOtherwise be ready to spend time digging for infos online and argue with people about theories and whatnot.\n![kingdom-hearts](public/media/records/kingdom-hearts/1778823445367-kh1-sokai-watches-the-sunset.webp)\n:::"
  },
  {
    "id": "linux-setup",
    "title": "Linux Setup",
    "section": "setup",
    "type": "Setup Note",
    "status": "Draft",
    "started": "2026-05-15",
    "updated": "2026-05-15",
    "summary": "Area dedicated to my Linux setup, might change overtime ~",
    "banner": "",
    "headerImage": "public/media/records/linux-setup/1778824751427-arch-linux-linux-anime-anime-devushki-temnyi-fon.webp",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "",
    "tags": [
      "setup"
    ],
    "milestones": [],
    "body": ":::note 15 / 05 / 2026 - New Note\nModel: MSI GF63 Thin 11SC\nCPU: Intel Core i5-11400H\nRAM: 12GB RAM\nGPU: NVIDIA GeForce GTX 1650 (Laptop, 40W)\nGPU: Intel(R) UHD Graphics\nOS: Arch Linux + Hyprland\n:::"
  },
  {
    "id": "windows-setup",
    "title": "Windows Setup",
    "section": "setup",
    "type": "Setup Note",
    "status": "Draft",
    "started": "2026-05-15",
    "updated": "2026-05-15",
    "summary": "Area dedicated at my windows setup, might change overtime of course!",
    "banner": "",
    "headerImage": "public/media/records/windows-setup/1778824759953-f634tsgzmbdg1.png",
    "samples": [],
    "attachments": [],
    "progress": 100,
    "priority": 50,
    "dashboardActive": false,
    "hardware": "",
    "technicalStack": "",
    "recommendation": "",
    "tags": [
      "setup"
    ],
    "milestones": [],
    "body": ":::note Current Setup\nModel: MSI Katana GF66 11UC\nCPU: 11th Gen Intel(R) Core(TM) i5-11400H @ 2.70GHz (2.69 GHz)\nRAM: 16.0 GB (15.7 GB usable)\nGPU: NVIDIA GeForce RTX 3050 Laptop GPU (4 GB)\nGPU: Intel(R) UHD Graphics (128 MB)\nOS: Windows 11\n:::"
  }
];
