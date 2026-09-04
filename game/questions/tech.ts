import type { Question } from "../types";

/**
 * Beginner-friendly IT / computing trivia, pitched at someone on their first
 * day of university rather than at a gatekeeping "real programmer" level.
 *
 * Authoring rules, please keep these if you add more:
 *  - Exactly 4 options. The engine shows 3 at a low streak and all 4 once the
 *    streak crosses CONFIG.ANSWER_COUNT_STREAK_THRESHOLD, dropping a random
 *    wrong option when it shows 3, so every wrong option must be wrong on its
 *    own rather than merely "less right" than another wrong one.
 *  - correctIndex is always 0 here purely so the bank is easy to review.
 *    selectOptions() in game/answerBlocks.ts shuffles the on-screen order
 *    every time, so there is no positional tell for the player.
 *  - Keep options to roughly 25 characters. Blocks clamp to
 *    ANSWER_BLOCK_MAX_WIDTH and longer text is condensed to fit, which starts
 *    to look cramped from booth distance.
 *  - No trick questions and no negatives ("which is NOT..."). Players read
 *    these under a shrinking timer; ambiguity reads as a broken game.
 *  - Unique ids. pickNextQuestion() remembers the last
 *    CONFIG.QUESTION_HISTORY_SIZE ids to avoid near-term repeats.
 */
export const TECH_QUESTIONS: Question[] = [
  // ---- Core acronyms -------------------------------------------------------
  { id: "t01", category: "tech", question: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Power Unit", "Core Program Utility", "Central Program Unit"], correctIndex: 0 },
  { id: "t02", category: "tech", question: "What does RAM stand for?", options: ["Random Access Memory", "Rapid Access Module", "Read Active Memory", "Run Access Memory"], correctIndex: 0 },
  { id: "t03", category: "tech", question: "What does GPU stand for?", options: ["Graphics Processing Unit", "General Power Unit", "Global Program Utility", "Grid Port Unit"], correctIndex: 0 },
  { id: "t04", category: "tech", question: "What does ROM stand for?", options: ["Read Only Memory", "Rapid Output Memory", "Random Order Memory", "Remote Object Memory"], correctIndex: 0 },
  { id: "t05", category: "tech", question: "What does USB stand for?", options: ["Universal Serial Bus", "Unified System Board", "Universal Sync Bridge", "User Storage Block"], correctIndex: 0 },
  { id: "t06", category: "tech", question: "What does WWW stand for?", options: ["World Wide Web", "World Web Wire", "Wide World Website", "World Wireless Web"], correctIndex: 0 },
  { id: "t07", category: "tech", question: "What does URL stand for?", options: ["Uniform Resource Locator", "Universal Read Link", "United Resource Line", "Unified Radio Link"], correctIndex: 0 },
  { id: "t08", category: "tech", question: "What does HTML stand for?", options: ["HyperText Markup Lang", "High Tech Modern Lang", "HyperLink Markup Lang", "Home Tool Markup Lang"], correctIndex: 0 },
  { id: "t09", category: "tech", question: "What does OS stand for?", options: ["Operating System", "Online Server", "Output Signal", "Optical Storage"], correctIndex: 0 },
  { id: "t10", category: "tech", question: "What does PDF stand for?", options: ["Portable Doc Format", "Print Data File", "Personal Doc Font", "Page Display Format"], correctIndex: 0 },
  { id: "t11", category: "tech", question: "What does VPN stand for?", options: ["Virtual Private Network", "Verified Public Node", "Visual Packet Number", "Variable Port Name"], correctIndex: 0 },
  { id: "t12", category: "tech", question: "What does IoT stand for?", options: ["Internet of Things", "Input Output Test", "Internet Online Tool", "Index of Terms"], correctIndex: 0 },
  { id: "t13", category: "tech", question: "What does API stand for?", options: ["App Programming Interface", "Applied Program Index", "Automatic Push Input", "Active Public Internet"], correctIndex: 0 },
  { id: "t14", category: "tech", question: "What does GUI stand for?", options: ["Graphical User Interface", "General Utility Input", "Guided User Index", "Global Unit Interface"], correctIndex: 0 },
  { id: "t15", category: "tech", question: "What does CLI stand for?", options: ["Command Line Interface", "Central Logic Input", "Common Link Interface", "Client Login Index"], correctIndex: 0 },
  { id: "t16", category: "tech", question: "What does SSD stand for?", options: ["Solid State Drive", "Super Speed Disk", "System Storage Drive", "Secure Static Disk"], correctIndex: 0 },
  { id: "t17", category: "tech", question: "What does LAN stand for?", options: ["Local Area Network", "Large Access Node", "Linked Array Network", "Line Access Number"], correctIndex: 0 },
  { id: "t18", category: "tech", question: "What does DNS stand for?", options: ["Domain Name System", "Data Network Service", "Direct Node Server", "Digital Name Standard"], correctIndex: 0 },
  { id: "t19", category: "tech", question: "What does ISP stand for?", options: ["Internet Service Provider", "Internal System Port", "Indexed Server Path", "Instant Signal Protocol"], correctIndex: 0 },
  { id: "t20", category: "tech", question: "What does GPS stand for?", options: ["Global Positioning System", "General Position Sensor", "Grid Point Scanner", "Guided Path Service"], correctIndex: 0 },
  { id: "t21", category: "tech", question: "What does AI stand for?", options: ["Artificial Intelligence", "Automated Input", "Applied Internet", "Active Interface"], correctIndex: 0 },
  { id: "t22", category: "tech", question: "What does QR stand for in QR code?", options: ["Quick Response", "Quality Reader", "Quad Range", "Query Record"], correctIndex: 0 },
  { id: "t23", category: "tech", question: "What does IP stand for in IP address?", options: ["Internet Protocol", "Internal Program", "Input Port", "Interface Path"], correctIndex: 0 },
  { id: "t24", category: "tech", question: "What does the S in HTTPS stand for?", options: ["Secure", "Server", "Standard", "Static"], correctIndex: 0 },
  { id: "t25", category: "tech", question: "What does FAQ stand for?", options: ["Frequently Asked Qs", "Fast Answer Query", "Full App Quality", "Final Access Question"], correctIndex: 0 },

  // ---- Hardware ------------------------------------------------------------
  { id: "t26", category: "tech", question: "What is often called the brain of a computer?", options: ["The processor", "The monitor", "The keyboard", "The router"], correctIndex: 0 },
  { id: "t27", category: "tech", question: "What does a GPU mainly handle?", options: ["Graphics", "Sound", "Storage", "Networking"], correctIndex: 0 },
  { id: "t28", category: "tech", question: "Which memory is wiped when power is lost?", options: ["RAM", "SSD", "Hard disk", "DVD"], correctIndex: 0 },
  { id: "t29", category: "tech", question: "Which storage type has no moving parts?", options: ["SSD", "Hard disk", "DVD", "Cassette tape"], correctIndex: 0 },
  { id: "t30", category: "tech", question: "What does a motherboard do?", options: ["Connects the parts", "Stores passwords", "Cools the room", "Renders graphics"], correctIndex: 0 },
  { id: "t31", category: "tech", question: "What keeps a CPU from overheating?", options: ["A heatsink and fan", "Extra RAM", "A bigger screen", "A faster router"], correctIndex: 0 },
  { id: "t32", category: "tech", question: "Which cable carries video and audio?", options: ["HDMI", "Ethernet", "USB-A", "Power cable"], correctIndex: 0 },
  { id: "t33", category: "tech", question: "Which of these is hardware?", options: ["Keyboard", "Windows", "Photoshop", "Email"], correctIndex: 0 },
  { id: "t34", category: "tech", question: "What is a pixel?", options: ["A tiny image dot", "A sound unit", "A file type", "A network cable"], correctIndex: 0 },
  { id: "t35", category: "tech", question: "What does screen resolution describe?", options: ["Pixel count", "Screen brightness", "Refresh speed", "Colour depth"], correctIndex: 0 },
  { id: "t36", category: "tech", question: "Refresh rate is measured in what?", options: ["Hertz", "Bytes", "Volts", "Pixels"], correctIndex: 0 },
  { id: "t37", category: "tech", question: "What does FPS mean in games?", options: ["Frames per second", "Files per system", "Frequency per signal", "Fast packet sync"], correctIndex: 0 },
  { id: "t38", category: "tech", question: "What is a Raspberry Pi?", options: ["A small computer", "A coding language", "A web browser", "A file format"], correctIndex: 0 },
  { id: "t39", category: "tech", question: "What is an Arduino board used for?", options: ["Electronics projects", "Photo editing", "Web hosting", "Video streaming"], correctIndex: 0 },
  { id: "t40", category: "tech", question: "What does a sensor do?", options: ["Measures the world", "Stores files", "Prints pages", "Encrypts data"], correctIndex: 0 },

  // ---- Data and units ------------------------------------------------------
  { id: "t41", category: "tech", question: "8 bits make up one what?", options: ["Byte", "Pixel", "Node", "Chip"], correctIndex: 0 },
  { id: "t42", category: "tech", question: "Which unit is the biggest?", options: ["Terabyte", "Gigabyte", "Megabyte", "Kilobyte"], correctIndex: 0 },
  { id: "t43", category: "tech", question: "Which two digits does binary use?", options: ["0 and 1", "1 and 2", "0 and 9", "A and B"], correctIndex: 0 },
  { id: "t44", category: "tech", question: "What is metadata?", options: ["Data about data", "Deleted data", "Encrypted data", "Printed data"], correctIndex: 0 },
  { id: "t45", category: "tech", question: "What does zipping a folder do?", options: ["Compresses it", "Deletes it", "Encrypts it", "Prints it"], correctIndex: 0 },
  { id: "t46", category: "tech", question: "Which image format supports transparency?", options: ["PNG", "JPG", "BMP", "TIFF"], correctIndex: 0 },
  { id: "t47", category: "tech", question: "What is ASCII used to represent?", options: ["Text characters", "Sound waves", "Video frames", "Network ports"], correctIndex: 0 },
  { id: "t48", category: "tech", question: "What does RGB describe?", options: ["Colour", "Sound", "Speed", "Storage"], correctIndex: 0 },
  { id: "t49", category: "tech", question: "What does bandwidth measure?", options: ["Data per second", "Screen size", "Disk space", "CPU heat"], correctIndex: 0 },
  { id: "t50", category: "tech", question: "What does latency mean on a network?", options: ["Delay", "Volume", "Storage", "Brightness"], correctIndex: 0 },

  // ---- Networking ----------------------------------------------------------
  { id: "t51", category: "tech", question: "Which device connects a home to the internet?", options: ["Router", "Printer", "Scanner", "Speaker"], correctIndex: 0 },
  { id: "t52", category: "tech", question: "Wi-Fi lets devices connect without what?", options: ["Cables", "Power", "Software", "Screens"], correctIndex: 0 },
  { id: "t53", category: "tech", question: "What does DNS translate a site name into?", options: ["An IP address", "A password", "A file", "A cookie"], correctIndex: 0 },
  { id: "t54", category: "tech", question: "What is an IP address used for?", options: ["Identifying a device", "Charging a device", "Cooling a device", "Cleaning a device"], correctIndex: 0 },
  { id: "t55", category: "tech", question: "What does HTTPS add over HTTP?", options: ["Encryption", "Speed", "Storage", "Colour"], correctIndex: 0 },
  { id: "t56", category: "tech", question: "What is Bluetooth mainly for?", options: ["Short-range wireless", "Long-range radio", "Wired video", "Cloud backup"], correctIndex: 0 },
  { id: "t57", category: "tech", question: "What does a ping test measure?", options: ["Response delay", "Disk space", "Screen size", "Battery life"], correctIndex: 0 },
  { id: "t58", category: "tech", question: "What does 404 mean on a website?", options: ["Page not found", "Access granted", "Server rebooted", "Payment received"], correctIndex: 0 },
  { id: "t59", category: "tech", question: "What does a server do?", options: ["Serves data to clients", "Prints documents", "Cools the room", "Charges phones"], correctIndex: 0 },
  { id: "t60", category: "tech", question: "Which symbol appears in every email address?", options: ["@", "#", "%", "&"], correctIndex: 0 },
  { id: "t61", category: "tech", question: "What does CC mean in an email?", options: ["Carbon copy", "Contact code", "Closed chat", "Clear cache"], correctIndex: 0 },
  { id: "t62", category: "tech", question: "What is spam?", options: ["Unwanted bulk email", "A backup type", "A fast network", "A file format"], correctIndex: 0 },
  { id: "t63", category: "tech", question: "What does SSH let you do?", options: ["Log in remotely", "Print wirelessly", "Compress files", "Edit photos"], correctIndex: 0 },

  // ---- Security ------------------------------------------------------------
  { id: "t64", category: "tech", question: "What is software that harms your device called?", options: ["Malware", "Firmware", "Freeware", "Shareware"], correctIndex: 0 },
  { id: "t65", category: "tech", question: "What does a firewall mainly do?", options: ["Filters traffic", "Cools the CPU", "Stores files", "Prints faster"], correctIndex: 0 },
  { id: "t66", category: "tech", question: "What is phishing?", options: ["A fake message scam", "A network cable", "A backup type", "A CPU brand"], correctIndex: 0 },
  { id: "t67", category: "tech", question: "What is ransomware?", options: ["Malware demanding pay", "A free antivirus", "A backup tool", "A web browser"], correctIndex: 0 },
  { id: "t68", category: "tech", question: "What does encryption do to data?", options: ["Scrambles it", "Deletes it", "Prints it", "Compresses it"], correctIndex: 0 },
  { id: "t69", category: "tech", question: "What does two-factor authentication add?", options: ["A second check", "A faster login", "More storage", "A new email"], correctIndex: 0 },
  { id: "t70", category: "tech", question: "What makes a password strong?", options: ["Length and randomness", "Your birthday", "Your first name", "The word password"], correctIndex: 0 },
  { id: "t71", category: "tech", question: "What is social engineering?", options: ["Tricking people", "Building networks", "Writing CSS", "Cooling servers"], correctIndex: 0 },
  { id: "t72", category: "tech", question: "What should you do with a suspicious link?", options: ["Do not click it", "Click it quickly", "Forward it on", "Save it offline"], correctIndex: 0 },
  { id: "t73", category: "tech", question: "What does antivirus software look for?", options: ["Malicious software", "Slow typing", "Dim screens", "Old cables"], correctIndex: 0 },
  { id: "t74", category: "tech", question: "What is a software patch?", options: ["A fix for a problem", "A hardware part", "A backup copy", "A network cable"], correctIndex: 0 },
  { id: "t75", category: "tech", question: "What do security updates mostly fix?", options: ["Known weaknesses", "Screen colours", "Font sizes", "Battery shape"], correctIndex: 0 },
  { id: "t76", category: "tech", question: "What is a DDoS attack?", options: ["Flooding a service", "Erasing a database", "Stealing a laptop", "Cutting the power"], correctIndex: 0 },
  { id: "t77", category: "tech", question: "What does a CAPTCHA try to detect?", options: ["Whether you are human", "Your location", "Your password", "Your browser"], correctIndex: 0 },
  { id: "t78", category: "tech", question: "What is biometric login based on?", options: ["Your body", "Your postcode", "Your birthday", "Your username"], correctIndex: 0 },
  { id: "t79", category: "tech", question: "Which is a good backup habit?", options: ["Copies in 2 places", "One copy only", "Never backing up", "Deleting originals"], correctIndex: 0 },
  { id: "t80", category: "tech", question: "What is a safety copy of your data called?", options: ["A backup", "A shortcut", "A driver", "A plugin"], correctIndex: 0 },

  // ---- Web -----------------------------------------------------------------
  { id: "t81", category: "tech", question: "Which language styles web pages?", options: ["CSS", "SQL", "PDF", "ZIP"], correctIndex: 0 },
  { id: "t82", category: "tech", question: "Which language adds behaviour to web pages?", options: ["JavaScript", "CSS", "HTML", "SQL"], correctIndex: 0 },
  { id: "t83", category: "tech", question: "What does HTML mostly describe?", options: ["Page structure", "Page colours", "Server speed", "Database rows"], correctIndex: 0 },
  { id: "t84", category: "tech", question: "Which of these is a web browser?", options: ["Chrome", "Excel", "Photoshop", "Windows"], correctIndex: 0 },
  { id: "t85", category: "tech", question: "What is a browser cookie?", options: ["Small stored data", "A type of virus", "A CPU part", "A font file"], correctIndex: 0 },
  { id: "t86", category: "tech", question: "What does a cache do?", options: ["Stores for reuse", "Deletes old files", "Blocks websites", "Cools the CPU"], correctIndex: 0 },
  { id: "t87", category: "tech", question: "What does F5 usually do in a browser?", options: ["Refresh the page", "Close the tab", "Open settings", "Print the page"], correctIndex: 0 },
  { id: "t88", category: "tech", question: "What does responsive design adapt to?", options: ["Screen size", "Battery level", "Time of day", "Typing speed"], correctIndex: 0 },
  { id: "t89", category: "tech", question: "What is a wireframe in design?", options: ["A layout sketch", "A network cable", "A CSS file", "An error log"], correctIndex: 0 },
  { id: "t90", category: "tech", question: "What does accessible design aim for?", options: ["Usable by everyone", "Faster servers", "Smaller files", "Brighter colours"], correctIndex: 0 },
  { id: "t91", category: "tech", question: "What does UX focus on?", options: ["User experience", "Unix exports", "Upload speed", "Unicode text"], correctIndex: 0 },
  { id: "t92", category: "tech", question: "What is e-commerce?", options: ["Selling online", "Editing video", "Encrypting email", "Erasing disks"], correctIndex: 0 },

  // ---- Programming ---------------------------------------------------------
  { id: "t93", category: "tech", question: "What do you call an error in a program?", options: ["A bug", "A crack", "A leak", "A patch"], correctIndex: 0 },
  { id: "t94", category: "tech", question: "What does debugging mean?", options: ["Finding and fixing", "Deleting files", "Adding features", "Restarting a PC"], correctIndex: 0 },
  { id: "t95", category: "tech", question: "What does an algorithm describe?", options: ["A set of steps", "A type of cable", "A screen size", "A password"], correctIndex: 0 },
  { id: "t96", category: "tech", question: "What does a loop do in code?", options: ["Repeats steps", "Stops the program", "Prints a page", "Opens a file"], correctIndex: 0 },
  { id: "t97", category: "tech", question: "What does a variable hold?", options: ["A value", "A cable", "A screen", "A user"], correctIndex: 0 },
  { id: "t98", category: "tech", question: "What is an array?", options: ["An ordered list", "A single letter", "A network port", "A screen mode"], correctIndex: 0 },
  { id: "t99", category: "tech", question: "What does an if statement do?", options: ["Chooses a branch", "Repeats forever", "Saves a file", "Opens a window"], correctIndex: 0 },
  { id: "t100", category: "tech", question: "What is a function in code?", options: ["A reusable block", "A hardware chip", "A file folder", "A screen pixel"], correctIndex: 0 },
  { id: "t101", category: "tech", question: "What does a compiler produce?", options: ["Machine code", "A web page", "A backup", "A password"], correctIndex: 0 },
  { id: "t102", category: "tech", question: "What is syntax in programming?", options: ["The language rules", "The screen layout", "The file size", "The CPU speed"], correctIndex: 0 },
  { id: "t103", category: "tech", question: "What is pseudocode?", options: ["A plain-word plan", "A type of virus", "A file format", "A cable type"], correctIndex: 0 },
  { id: "t104", category: "tech", question: "Which of these is a programming language?", options: ["Python", "Cobra", "Anaconda", "Viper"], correctIndex: 0 },
  { id: "t105", category: "tech", question: "What is a tool that finds code errors called?", options: ["A debugger", "A firewall", "A browser", "A driver"], correctIndex: 0 },
  { id: "t106", category: "tech", question: "What is open-source software?", options: ["Code anyone can see", "Software with no code", "Paid-only software", "Offline software"], correctIndex: 0 },

  // ---- Version control and workflow ---------------------------------------
  { id: "t107", category: "tech", question: "Which of these is a version control tool?", options: ["Git", "Excel", "Chrome", "Slack"], correctIndex: 0 },
  { id: "t108", category: "tech", question: "What does GitHub mainly host?", options: ["Code repositories", "Video streams", "Email inboxes", "Music files"], correctIndex: 0 },
  { id: "t109", category: "tech", question: "What does a Git commit save?", options: ["A set of changes", "A browser tab", "A screenshot", "A password"], correctIndex: 0 },
  { id: "t110", category: "tech", question: "What does DevOps combine?", options: ["Dev and operations", "Design and outreach", "Data and optics", "Debug and output"], correctIndex: 0 },
  { id: "t111", category: "tech", question: "What does CI/CD automate?", options: ["Builds and releases", "Screen brightness", "Mouse clicks", "Font loading"], correctIndex: 0 },
  { id: "t112", category: "tech", question: "What does agile emphasise?", options: ["Short iterations", "One long release", "Skipping planning", "Fixed contracts"], correctIndex: 0 },

  // ---- Databases -----------------------------------------------------------
  { id: "t113", category: "tech", question: "What is an organised collection of data called?", options: ["A database", "A spreadsheet", "A folder", "A shortcut"], correctIndex: 0 },
  { id: "t114", category: "tech", question: "Which of these is a database language?", options: ["SQL", "HTML", "CSS", "JSON"], correctIndex: 0 },
  { id: "t115", category: "tech", question: "What is a database query?", options: ["A request for data", "A backup copy", "A network cable", "A screen layout"], correctIndex: 0 },
  { id: "t116", category: "tech", question: "What is a database table made of?", options: ["Rows and columns", "Cables and ports", "Pixels and dots", "Files and folders"], correctIndex: 0 },
  { id: "t117", category: "tech", question: "What does a primary key do?", options: ["Identifies a row", "Encrypts a table", "Backs up a disk", "Opens a door"], correctIndex: 0 },
  { id: "t118", category: "tech", question: "What is JSON mainly used for?", options: ["Exchanging data", "Styling pages", "Cooling servers", "Printing files"], correctIndex: 0 },
  { id: "t119", category: "tech", question: "What is big data?", options: ["Very large datasets", "A big monitor", "A large font", "A long cable"], correctIndex: 0 },

  // ---- Operating systems and everyday IT ----------------------------------
  { id: "t120", category: "tech", question: "Which of these is an operating system?", options: ["Linux", "Firefox", "Word", "Zoom"], correctIndex: 0 },
  { id: "t121", category: "tech", question: "Who is credited with starting Linux?", options: ["Linus Torvalds", "Bill Gates", "Steve Jobs", "Alan Turing"], correctIndex: 0 },
  { id: "t122", category: "tech", question: "Which command lists files on Linux?", options: ["ls", "go", "run", "open"], correctIndex: 0 },
  { id: "t123", category: "tech", question: "What does sudo do on Linux?", options: ["Runs as admin", "Shuts down", "Deletes a file", "Opens a browser"], correctIndex: 0 },
  { id: "t124", category: "tech", question: "What is a terminal?", options: ["A text command tool", "A type of monitor", "A network cable", "A backup disk"], correctIndex: 0 },
  { id: "t125", category: "tech", question: "What does Ctrl + Z usually do?", options: ["Undo", "Save", "Print", "Quit"], correctIndex: 0 },
  { id: "t126", category: "tech", question: "Which key deletes text backwards?", options: ["Backspace", "Tab", "Shift", "Escape"], correctIndex: 0 },
  { id: "t127", category: "tech", question: "What does rebooting a device mean?", options: ["Restarting it", "Selling it", "Charging it", "Cleaning it"], correctIndex: 0 },
  { id: "t128", category: "tech", question: "What is a driver in computing?", options: ["Software for hardware", "A type of cable", "A backup file", "A web page"], correctIndex: 0 },
  { id: "t129", category: "tech", question: "What is a spreadsheet best at?", options: ["Numbers and tables", "Editing video", "Routing traffic", "Compiling code"], correctIndex: 0 },

  // ---- Cloud and AI --------------------------------------------------------
  { id: "t130", category: "tech", question: "What does cloud storage really mean?", options: ["Files on remote servers", "Files on paper", "Files in RAM only", "Files on the screen"], correctIndex: 0 },
  { id: "t131", category: "tech", question: "Which of these is a cloud platform?", options: ["AWS", "Photoshop", "Notepad", "Calculator"], correctIndex: 0 },
  { id: "t132", category: "tech", question: "What does virtualisation create?", options: ["Virtual machines", "Extra monitors", "Faster cables", "Bigger fonts"], correctIndex: 0 },
  { id: "t133", category: "tech", question: "What is Docker used for?", options: ["Containers", "Photo editing", "Video calls", "Disk cleaning"], correctIndex: 0 },
  { id: "t134", category: "tech", question: "Training an AI model needs a lot of what?", options: ["Data", "Paper", "Ink", "Cables"], correctIndex: 0 },
  { id: "t135", category: "tech", question: "What is machine learning?", options: ["Learning from data", "Building hardware", "Cooling servers", "Printing reports"], correctIndex: 0 },
  { id: "t136", category: "tech", question: "What is a chatbot?", options: ["A program you talk to", "A phone charger", "A wifi router", "A screen filter"], correctIndex: 0 },

  // ---- Companies and general ----------------------------------------------
  { id: "t137", category: "tech", question: "Which company makes Windows?", options: ["Microsoft", "Apple", "Google", "Amazon"], correctIndex: 0 },
  { id: "t138", category: "tech", question: "Which company makes the iPhone?", options: ["Apple", "Samsung", "Sony", "Nokia"], correctIndex: 0 },
  { id: "t139", category: "tech", question: "Which company develops Android?", options: ["Google", "Apple", "Microsoft", "IBM"], correctIndex: 0 },
  { id: "t140", category: "tech", question: "What does VR stand for?", options: ["Virtual Reality", "Video Rendering", "Variable Range", "Visual Routing"], correctIndex: 0 },
  { id: "t141", category: "tech", question: "What does 3D printing build objects from?", options: ["Layers", "Pixels", "Cables", "Sound"], correctIndex: 0 },
  { id: "t142", category: "tech", question: "Which field combines coding with machines?", options: ["Robotics", "Typography", "Accounting", "Geology"], correctIndex: 0 },
  { id: "t143", category: "tech", question: "What does automation usually replace?", options: ["Repetitive work", "Creative thinking", "Team meetings", "Job titles"], correctIndex: 0 },
];
