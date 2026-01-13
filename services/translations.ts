

export type Language = 'cs' | 'en';

export const translations = {
  en: {
    appTitle: "Wiz!T",
    subTitle: "Route Optimization Wizard",
    footerBrand: "The evolution of OdoCalc",
    keyMissing: "Key Missing",
    
    // Buttons
    newVisit: "New Visit",
    importExcel: "Import Excel",
    importPlan: "Import Plan",
    delete: "Delete",
    confirm: "Confirm?",
    validate: "Validate",
    visualize: "Visualize",
    hideMap: "Hide Map",
    optimal: "Optimal",
    precalc: "Precalc",
    calculate: "Calculate",
    cancel: "Cancel",
    save: "Save",
    saveSettings: "Save Settings",
    close: "Close",
    exportDb: "Export Database (Backup)",
    importDb: "Import Database (Restore)",
    clearDb: "Clear Database (Factory Reset)",
    confirmClear: "Confirm Factory Reset?",
    btnTryIt: "Try it!",
    btnExample1: "Example 1 (Czechia)",
    btnExample2: "Example 2 (Pardubice)",
    savedRoutes: "Saved Routes",
    btnSaveCurrent: "Save Current List",
    clientDb: "Clients",
    addToRoute: "Add to Route",
    search: "Search...",

    // Saved Routes Modal
    savedRoutesTitle: "Route Manager",
    saveRouteTitle: "Save Current Route",
    noSavedRoutes: "No saved routes found.",
    routesFound: "saved routes",
    lblRouteName: "Route Name",
    saveRouteDesc: "This will save the current list of visits and results to your browser's local storage.",
    stops: "stops",
    load: "Load",
    confirmDeleteRoute: "Are you sure you want to delete this saved route?",

    // Client DB Modal
    dbTitle: "Clients Management",
    dbNoClients: "No clients in database. Import Excel or add manually.",
    dbSelected: "selected",
    dbAddManual: "Add Client",

    // Columns
    colSkip: "Skip",
    colOrder: "#", // Compact
    colName: "Name",
    colSurname: "Surname",
    colAddress: "Address",
    colValid: "", // Empty
    colOdometer: "ODO",
    colDistance: "Distance",
    colTime: "Time",
    colPlan: "Arrival", // Renamed from Plan
    colPlanned: "Planned", // New
    colPause: "Pause", // New
    colDurat: "Durat",
    colActions: "Actions",
    colPrefTime: "Plan. Time", // Renamed from Pref. Time
    colRepetition: "Repetition",

    // Rows
    start: "", // Disposed text
    departure: "DEP",
    end: "", // Disposed text
    return: "RETURN",
    total: "TOTAL",
    noVisits: "No visits scheduled for today. Import Plan, Excel or add manually.",

    // Modals
    editVisit: "Edit Visit",
    editClient: "Edit Client",
    createVisit: "New Visit",
    createClient: "New Client",
    settingsTitle: "Application Settings",
    helpTitle: "User Guide",

    // Settings
    lblApiKey: "Google Maps API Key",
    lblApiKeyDesc: "Required for routing and validation. Saved locally.",
    lblAddress: "Start / End Address",
    lblOdometer: "Current Odometer",
    lblDeparture: "Departure From",
    lblCache: "Cache Expiration (days)",
    lblStrictMode: "Strict Address Validation (Run on Calculate)",
    lblDarkMode: "Dark Mode",
    lblLanguage: "Language",

    // Visit Form
    lblName: "Name",
    lblSurname: "Surname",
    lblVisitAddr: "Address",
    lblDuration: "Duration (min)",
    lblDurationDesc: "Expected time spent at this location.",
    lblDragHint: "* Order is determined by the list position. Drag rows to reorder.",
    
    // Scheduling
    lblScheduleTitle: "Scheduling & Repetition",
    lblVisitStartAt: "Plan. Time (HH:mm)", // Renamed from Preferred Time
    lblRepetitionType: "Repetition Strategy",
    lblDaysOfWeek: "Days of Week",
    lblSpecificDate: "Specific Date",
    lblIntervalStart: "Start Date",
    lblIntervalDays: "Interval (Days)",
    optWeekly: "Weekly",
    optDate: "Exact Date",
    optInterval: "Custom Interval",
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],

    // Help - Detailed Sections
    helpPrereqTitle: "Prerequisites",
    helpPrereqExcel: "Excel Import: The first row is considered a header and is IGNORED. Start data from row 2. Columns: A: Name, B: Surname, C: Address. Optional: D: Order, E: Duration.",
    helpPrereqApiKey: "Google Maps API Key: To use this app, you must provide your own API Key from Google Cloud Platform. It requires the 'Directions API', 'Distance Matrix API', and 'Places API'.",
    
    helpLogicTitle: "Core Logic & Startup",
    helpLogicClients: "This is the central repository of all your customers. You define their addresses and repetition rules (e.g., Weekly on Mondays) here.",
    helpLogicImportPlan: "This button scans the Clients Database and automatically generates a route for TODAY based on the repetition rules.",
    helpLogicStartup: [
        "Startup Loading Priority: When the app starts, it looks for data in this order:",
        "   1. Saved Route matches Today's Name (e.g., if today is 'Friday', and you saved a route named 'Friday', it loads).",
        "   2. Dynamic Plan from DB (if no saved route found).",
        "   3. Last Session (restores what you had open last time)."
    ],

    helpCalcTitle: "Calculation Modes",
    helpCalcPrecalc: "A preview mode. It calculates distances and times but DOES NOT save the result to the odometer history. Useful for checking.",
    helpCalcOptimal: "First, it reorders your stops using a Traveling Salesperson Problem (TSP) algorithm to minimize total distance. Then, it runs a calculation.",
    helpCalcCalculate: "The standard production mode. It calculates the route, commits the new odometer reading to settings, and finalizes the trip.",
    helpCalcValidate: "Checks if addresses are recognized by Google Maps API without running a full route calculation.",

    helpMouseTitle: "Mouse Controls",
    helpMouseContent: [
        "Left Click: Select or Deselect a row (for bulk actions like Delete or Optimize).",
        "Right Click: Toggle 'Skip'. A skipped row is grayed out and excluded from calculations but remains in the list.",
        "Double Click: Open the Edit details modal for that visit."
    ],

    helpFeaturesTitle: "Special Features",
    helpFeatVisualize: "Displays an interactive map of your trip. Click on route segments or markers to see details.",
    helpFeatRoutes: "Save frequently used routes locally. Access them anytime via the folder icon in the toolbar.",
    helpFeatReset: "Factory Reset: Completely wipes the local database, settings, and cached distances. Use with caution.",
    helpFeatCache: "Smart Caching (LMOD): The app stores distance results in your browser ('LMOD'). This saves you money by preventing repeated API calls for the same route segments.",
    helpFeatValidation: "Validation: 'Strict Mode' in settings prevents calculation if any address is ambiguous. Standard mode allows calculation but marks addresses with red crosses if unverified.",
    
    helpTipsTitle: "Tips & Tricks",
    helpTipLmod: "To save API usage, do not clear your browser's 'Local Storage' unnecessarily, as this holds the LMOD cache.",
    helpTipExport: "Export/Import: Use the arrow icons in the top bar to save your entire workspace (including settings and cache) to a JSON file. Useful for moving to another computer.",

    // Messages
    msgApiMissing: "API Key Missing. Please enter your Google Maps API Key in Settings.",
    msgNoVisits: "No visits to validate.",
    msgValidationComplete: "Validation complete.",
    msgNoActive: "No active visits to calculate.",
    msgStartReq: "Start address is required.",
    msgValidating: "Validating",
    msgRouting: "Routing to",
    msgCalcReturn: "Calculating Return Trip...",
    msgOptFail: "Optimization failed",
    msgImportSuccess: "Successfully added visits from Excel.",
    msgImportFail: "Import failed",
    msgDbCleared: "Database cleared.",
    msgAddedToRoute: "clients added to current route.",
    msgDailyCompilation: "Dynamic Route Compiled",
    msgDailyInfo: "Visits loaded based on client schedules for today.",
    msgPlanReloaded: "Schedule reloaded for today.",
    msgConfirmPlanReload: "This will overwrite your current visit list with the scheduled plan for today. Continue?",
  },
  cs: {
    appTitle: "Wiz!T",
    subTitle: "Kouzelník pro optimalizaci tras",
    footerBrand: "Evoluce aplikace OdoCalc",
    keyMissing: "Chybí klíč",
    
    // Buttons
    newVisit: "Nová návštěva",
    importExcel: "Import Excel",
    importPlan: "Načíst plán",
    delete: "Smazat",
    confirm: "Potvrdit?",
    validate: "Ověřit",
    visualize: "Mapa",
    hideMap: "Skrýt mapu",
    optimal: "Optimální",
    precalc: "Test výpočet",
    calculate: "Spočítat",
    cancel: "Zrušit",
    save: "Uložit",
    saveSettings: "Uložit nastavení",
    close: "Zavřít",
    exportDb: "Exportovat databázi (Záloha)",
    importDb: "Importovat databázi (Obnovit)",
    clearDb: "Vymazat databázi (Reset)",
    confirmClear: "Opravdu vymazat?",
    btnTryIt: "Vyzkoušet!",
    btnExample1: "Příklad 1 (Česko)",
    btnExample2: "Příklad 2 (Pardubice)",
    savedRoutes: "Uložené trasy",
    btnSaveCurrent: "Uložit aktuální",
    clientDb: "Klienti",
    addToRoute: "Přidat do trasy",
    search: "Hledat...",

    // Saved Routes Modal
    savedRoutesTitle: "Správce tras",
    saveRouteTitle: "Uložit aktuální trasu",
    noSavedRoutes: "Žádné uložené trasy.",
    routesFound: "uložených tras",
    lblRouteName: "Název trasy",
    saveRouteDesc: "Toto uloží aktuální seznam návštěv a výsledků do paměti prohlížeče.",
    stops: "zastávek",
    load: "Načíst",
    confirmDeleteRoute: "Opravdu chcete smazat tuto uloženou trasu?",

    // Client DB Modal
    dbTitle: "Správa klientů",
    dbNoClients: "Databáze je prázdná. Importujte Excel nebo přidejte ručně.",
    dbSelected: "vybráno",
    dbAddManual: "Nový klient",

    // Columns
    colSkip: "Přes.",
    colOrder: "Poř.", // Changed from Poř. to # in requested spec, but Poř. is short. Let's use # for compact.
    colName: "Jméno",
    colSurname: "Příjmení",
    colAddress: "Adresa",
    colValid: "", // Empty
    colOdometer: "TACH",
    colDistance: "Vzdálenost",
    colTime: "Doba",
    colPlan: "Příjezd", // Renamed from Plán
    colPlanned: "Plánováno", // New
    colPause: "Pauza", // New
    colDurat: "Trvání",
    colActions: "Akce",
    colPrefTime: "Plán. Čas", // Renamed from Čas
    colRepetition: "Opakování",

    // Rows
    start: "", // Disposed text
    departure: "ODJ",
    end: "", // Disposed text
    return: "NÁVRAT",
    total: "CELKEM",
    noVisits: "Dnes žádné plánované návštěvy. Načtěte plán, Excel nebo přidejte ručně.",

    // Modals
    editVisit: "Upravit návštěvu",
    editClient: "Upravit klienta",
    createVisit: "Nová návštěva",
    createClient: "Nový klient",
    settingsTitle: "Nastavení aplikace",
    helpTitle: "Uživatelská příručka",

    // Settings
    lblApiKey: "Google Maps API Klíč",
    lblApiKeyDesc: "Vyžadováno pro výpočty. Uloženo lokálně.",
    lblAddress: "Startovní / Cílová adresa",
    lblOdometer: "Aktuální stav tachometru",
    lblDeparture: "Čas odjezdu",
    lblCache: "Expirace mezipaměti (dny)",
    lblStrictMode: "Striktní ověření adres (při výpočtu)",
    lblDarkMode: "Tmavý režim",
    lblLanguage: "Jazyk",

    // Visit Form
    lblName: "Jméno",
    lblSurname: "Příjmení",
    lblVisitAddr: "Adresa",
    lblDuration: "Trvání (min)",
    lblDurationDesc: "Předpokládaný čas strávený na místě.",
    lblDragHint: "* Pořadí je určeno pozicí v seznamu. Přetáhněte řádky myší.",
    
    // Scheduling
    lblScheduleTitle: "Plánování a Opakování",
    lblVisitStartAt: "Plán. Čas (HH:mm)", // Renamed from Preferovaný čas
    lblRepetitionType: "Strategie opakování",
    lblDaysOfWeek: "Dny v týdnu",
    lblSpecificDate: "Konkrétní datum",
    lblIntervalStart: "Datum začátku",
    lblIntervalDays: "Interval (Dny)",
    optWeekly: "Týdenní",
    optDate: "Přesné datum",
    optInterval: "Vlastní interval",
    days: ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"],

    // Help - Detailed Sections
    helpPrereqTitle: "Prerekvizity",
    helpPrereqExcel: "Import Excelu: Aplikace očekává specifickou strukturu sloupců (bez záhlaví). Sloupec A: Jméno, B: Příjmení, C: Adresa, D: Pořadí (Číslo), E: Trvání (Minuty, Volitelné).",
    helpPrereqApiKey: "Google Maps API Klíč: Pro funkčnost musíte vložit vlastní API klíč z Google Cloud Platform. Vyžaduje povolené služby 'Directions API', 'Distance Matrix API' a 'Places API'.",
    
    helpLogicTitle: "Logika a Spouštění",
    helpLogicClients: "Toto je centrální seznam všech zákazníků. Zde definujete jejich adresy a pravidla opakování (např. Každé pondělí).",
    helpLogicImportPlan: "Toto tlačítko projde databázi klientů a automaticky sestaví trasu pro DNEŠNÍ den na základě pravidel opakování.",
    helpLogicStartup: [
        "Priorita při spuštění: Aplikace hledá data v tomto pořadí:",
        "   1. Uložená trasa se jménem dnešního dne (např. pokud je dnes 'Pátek' a máte uloženou trasu 'Pátek', načte se).",
        "   2. Dynamický plán z DB (pokud se nenajde uložená trasa).",
        "   3. Poslední relace (obnoví to, co jste měli otevřeno naposledy)."
    ],

    helpCalcTitle: "Režimy Výpočtu",
    helpCalcPrecalc: "Náhledový režim. Spočítá vzdálenosti a časy, ale NEUKLÁDÁ výsledek do historie tachometru. Vhodné pro kontrolu.",
    helpCalcOptimal: "Nejprve přeuspořádá zastávky pomocí algoritmu TSP (obchodní cestující) pro minimalizaci vzdálenosti, poté provede výpočet.",
    helpCalcCalculate: "Standardní ostrý režim. Spočítá trasu, uloží nový stav tachometru do nastavení a finalizuje cestu.",
    helpCalcValidate: "Zkontroluje, zda jsou adresy rozpoznatelné API Google Maps, aniž by se spouštěl plný výpočet trasy.",

    helpMouseTitle: "Ovládání Myší",
    helpMouseContent: [
        "Levý klik: Vybere nebo zruší výběr řádku (pro hromadné akce jako Smazat nebo Optimalizovat).",
        "Pravý klik: Přepne 'Přeskočit'. Přeskočený řádek zešedne a je vyloučen z výpočtů, ale zůstává v seznamu.",
        "Dvojklik: Otevře okno pro úpravu detailů návštěvy."
    ],

    helpFeaturesTitle: "Speciální Funkce",
    helpFeatVisualize: "Vizualizace: Zobrazí interaktivní mapu cesty. Kliknutím na úseky trasy nebo značky zobrazíte detaily.",
    helpFeatRoutes: "Ukládejte si často používané trasy lokálně. Přistupujte k nim kdykoli přes ikonu složky v panelu nástrojů.",
    helpFeatReset: "Tovární nastavení: Kompletně vymaže lokální databázi, nastavení i mezipaměť vzdáleností. Používejte opatrně.",
    helpFeatCache: "Chytrá mezipaměť (LMOD): Aplikace ukládá výsledky vzdáleností v prohlížeči ('LMOD'). To šetří peníze zamezením opakovaných volání API pro stejné úseky.",
    helpFeatValidation: "Ověřování: 'Striktní režim' v nastavení zabrání výpočtu, pokud je nějaká adresa nejednoznačná. Standardní režim dovolí výpočet, ale označí neověřené adresy červeným křížkem.",
    
    helpTipsTitle: "Tipy a Triky",
    helpTipLmod: "Pro úsporu API volání nevymazávejte zbytečně 'Local Storage' prohlížeče, kde je uložena LMOD cache.",
    helpTipExport: "Záloha/Obnova: Použijte ikony šipek v horní liště pro uložení celého pracovního prostředí (včetně nastavení a cache) do JSON souboru. Vhodné pro přenos na jiný počítač.",
    helpTipSkip: "Dvojklik na libovolný řádek jej okamžitě 'Přeskočí'. Skvělé pro modelování scénářů 'Co kdyby' bez nutnosti mazat záznamy.",

    // Messages
    msgApiMissing: "Chybí API klíč. Zadejte jej prosím v Nastavení.",
    msgNoVisits: "Žádné návštěvy k ověření.",
    msgValidationComplete: "Ověření dokončeno.",
    msgNoActive: "Žádné aktivní návštěvy k výpočtu.",
    msgStartReq: "Startovní adresa je povinná.",
    msgValidating: "Ověřuji",
    msgRouting: "Cesta k",
    msgCalcReturn: "Počítám návrat...",
    msgOptFail: "Optimalizace selhala",
    msgImportSuccess: "Návštěvy úspěšně přidány.",
    msgImportFail: "Import selhal",
    msgDbCleared: "Databáze vymazána.",
    msgAddedToRoute: "klientů přidáno do aktuální trasy.",
    msgDailyCompilation: "Dynamická trasa sestavena",
    msgDailyInfo: "Návštěvy načteny dle plánů klientů pro dnešní den.",
    msgPlanReloaded: "Plán pro dnešní den byl načten.",
    msgConfirmPlanReload: "Toto přepíše aktuální seznam návštěv plánovanou trasou pro dnešní den. Pokračovat?",
  }
};
