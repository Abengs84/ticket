/**
 * English / Swedish UI strings. Preference: localStorage key it-tickets-lang (en | sv).
 */
(function (global) {
  const LANG_KEY = 'it-tickets-lang';

  const STR = {
    en: {
      langLabel: 'Language',
      langEn: 'English',
      langSv: 'Svenska',

      navTickets: 'Tickets',
      navDevices: 'Devices',
      navReports: 'Reports',
      navLoan: 'Loan computers',

      brandTitle: 'School IT Tickets',
      brandSubtitle: 'Log and track issues — Abitti, hardware, accounts, and more',

      themeToggleTitle: 'Toggle theme',
      newTicket: '＋ New ticket',

      allTickets: 'All tickets',
      search: 'Search',
      searchPh: 'Title, description, name…',
      status: 'Status',
      category: 'Category',
      priority: 'Priority',
      reporter: 'Reporter',
      reporterPh: 'Name or type',
      tag: 'Tag',
      tagPh: 'Filter by tag',
      fromDate: 'From date',
      toDate: 'To date',
      sort: 'Sort',

      any: 'Any',
      stOpen: 'Open',
      stClosed: 'Closed',
      stUnresolved: 'Unresolved',

      catAbitti: 'Abitti',
      catHardware: 'Hardware',
      catSoftware: 'Software',
      catNetwork: 'Network',
      catAccount: 'Account',
      catOther: 'Other',

      priLow: 'Low',
      priMedium: 'Medium',
      priHigh: 'High',
      priNA: 'N/A',

      sortCreated: 'Newest created',
      sortUpdated: 'Recently updated',

      thId: 'ID',
      thTitle: 'Title',
      thReporter: 'Reporter',
      thCategory: 'Category',
      thDevice: 'Device',
      thPriority: 'Priority',
      thStatus: 'Status',
      thCreated: 'Created',
      thUpdated: 'Updated',
      ticketSortHint: 'Click to sort',
      loanSortHint: 'Click to sort',

      loading: 'Loading…',
      noTicketsMatch: 'No tickets match your filters.',
      serverError:
        'Could not reach the server. Run <code>npm start</code> from the project folder.',

      modalTicket: 'Ticket',
      modalNewTicket: 'New ticket',
      modalTicketNum: 'Ticket #',
      closeAria: 'Close',

      fieldTitle: 'Title / short description *',
      fieldDesc: 'Detailed description *',
      reporterType: 'Reporter type *',
      reporterName: 'Reporter name',
      reporterNamePh: 'Optional but recommended',

      repPupil: 'Pupil',
      repStaff: 'Staff',
      repUnknown: 'Unknown',
      repNA: 'N/A',

      fieldCategory: 'Category *',
      fieldPriority: 'Priority *',

      deviceLabel: 'Device',
      deviceOptional: '— Optional: select device —',
      hardwareHintPrefix: 'Register devices (and brands) under',
      hardwareHintSuffix: '. Each option includes type and brand.',

      statusLabel: 'Status *',
      resolutionLabel: 'What solved it (optional)',
      resolutionPh: 'e.g. command you ran, driver or patch, hardware fix, workaround…',

      tagsLabel: 'Tags (comma-separated)',
      tagsPh: 'e.g. laptop, lab-3, urgent-followup',

      createdUpdated: 'Created:',
      updatedPart: 'Updated:',
      publicLinkLabel: 'Public link:',
      qrScanHint: 'Scan to open this ticket on a phone',
      attachments: 'Attachments',
      uploadFile: 'Upload file',

      deleteTicket: 'Delete ticket',
      printTicket: 'Print ticket',
      cancel: 'Cancel',
      save: 'Save',

      alertChooseStatus: 'Please choose a status.',
      confirmDelete: 'Delete this ticket permanently?',
      attachLoadFail: 'Could not load attachments.',
      attachKb: 'KB · view',

      printHeading: 'IT Ticket #',
      printReporter: 'Reporter:',
      printCategory: 'Category:',
      printPriority: 'Priority:',
      printStatus: 'Status:',
      printDevice: 'Device:',
      printResolution: 'Resolution:',
      printTags: 'Tags:',
      printCreated: 'Created:',
      printUpdated: 'Updated:',

      typePrinter: 'Printer',
      typeComputer: 'Computer',
      typePeripheral: 'Peripheral',
      typeOther: 'Other',

      // Kiosk
      kioskTitle: 'Loan equipment',
      kioskYourName: 'Your name',
      kioskIAmA: 'I am a',
      kioskRolePupil: 'Pupil',
      kioskRoleStaff: 'Teacher / staff',
      kioskRoleOther: 'Other',
      kioskMainItem: 'Equipment to borrow (computer, charger, or other)',
      kioskChargerTag: ' (Charger)',
      kioskChargerOpt: 'Charger (optional)',
      kioskNoCharger: 'No charger',
      kioskNoPrimaryAvailable: 'No computers or other items available',
      kioskSignHint: 'Sign below to confirm the loan.',
      kioskClear: 'Clear',
      kioskBack: 'Back',
      kioskOk: 'OK',
      kioskSigAria: 'Signature',
      kioskOtherTag: ' (Other)',
      kioskMsgName: 'Please enter your name.',
      kioskMsgNoItem: 'No main item selected or none available.',
      kioskMsgGone: 'That item is no longer available. Choose another.',
      kioskMsgSession: 'Session expired. Go back and try again.',
      kioskMsgSign: 'Please sign in the box before confirming.',
      kioskMsgSaving: 'Saving…',
      kioskMsgThanks: 'Loan recorded. Thank you!',
      kioskMsgLoadFail: 'Could not load equipment',
      kioskSaveFail: 'Could not save loan',
      kioskRoleSummaryPupil: 'Pupil',
      kioskRoleSummaryStaff: 'Teacher / staff',
      kioskRoleSummaryOther: 'Other',

      devDocTitle: 'Devices — School IT Tickets',
      devPageTitle: 'Devices & brands',
      devPageSubtitle: 'Manage hardware inventory for hardware tickets',
      devBrandsH2: 'Brands',
      devNewBrandLabel: 'New brand name',
      devNewBrandPh: 'e.g. HP, Dell, Canon',
      devAddBrand: 'Add brand',
      devThName: 'Name',
      devNoBrands: 'No brands yet. Use Add brand to create one.',
      devModalBrandTitleAdd: 'Add brand',
      devModalBrandTitleEdit: 'Edit brand',
      devModalDeviceTitleAdd: 'Add device',
      devModalDeviceTitleEdit: 'Edit device',
      devEdit: 'Edit',
      devDelete: 'Delete',
      devSave: 'Save',
      devCancel: 'Cancel',
      devConfirmBrand: 'Delete this brand? (Only if no devices use it.)',
      devDevicesH2: 'Devices',
      devDevicesBlurb:
        'Type: printer, computer, peripheral, or other. Each device is linked to a brand.',
      devTypeLabel: 'Type *',
      devBrandLabel: 'Brand *',
      devLabelNote: 'Label / note (optional)',
      devLabelPh: 'e.g. Lab 3, Main office MFP',
      devAddDevice: 'Add device',
      devSaveDevice: 'Save device',
      devCancelEdit: 'Cancel edit',
      devThType: 'Type',
      devThBrand: 'Brand',
      devThLabel: 'Label',
      devNoDevices: 'No devices yet. Use Add device to create one.',
      devConfirmDevice:
        'Delete this device? Linked tickets will keep history but device link clears.',
      devServerErr: 'Could not reach the server.',

      repDocTitle: 'Reports — School IT Tickets',
      repPageTitle: 'Reports',
      repPageSubtitle: 'Overview, periods, and exports',
      dashAria: 'Dashboard',
      dashOpen: 'Open',
      dashClosed: 'Closed',
      dashUnresolved: 'Unresolved',
      dashTotal: 'Total',
      dashOpenHint: 'Active tickets',
      dashClosedHint: 'Resolved & closed',
      dashUnresHint: 'Needs follow-up',
      dashTotalHint: 'All time',
      dashByCategory: 'By category',
      dashByPriority: 'By priority',
      repPeriodSummary: 'Period summary',
      repTabDaily: 'Daily',
      repTabWeekly: 'Weekly',
      repTabMonthly: 'Monthly',
      repRangePrefix: 'Range:',
      repRangeArrow: '→',
      repRangeTickets: 'ticket(s)',
      repExportCsv: 'Export CSV',
      repExportPdf: 'Export PDF',
      repLoadErr: 'Could not load reports. Is the server running?',

      loanDocTitle: 'Loan computers — School IT Tickets',
      loanPageTitle: 'Loan computers',
      loanPageSubtitle: 'Overview — availability and active loans',
      loanSubOverview: 'Overview',
      loanSubManage: 'Manage inventory',
      loanSubKiosk: 'Borrow (kiosk)',
      loanSubHistory: 'History',
      loanSubAbitti2: 'Abitti2 versions',
      loanActiveLoans: 'Active loans',
      loanReturnHint:
        'Returning completes the loan and frees that equipment (including a charger borrowed alone or with a computer).',
      loanThSince: 'Since',
      loanThBorrower: 'Borrower',
      loanThRole: 'Role',
      loanThMainItem: 'Main item',
      loanThCharger: 'Charger',
      loanRefresh: 'Refresh',
      loanNoActive: 'No active loans.',
      loanMarkReturned: 'Mark returned',
      loanConfirmReturn: 'Mark this loan as returned?',
      loanAllEquipment: 'All equipment',
      loanViewToggleAria: 'Equipment layout',
      loanViewListTitle: 'List view',
      loanViewIconsTitle: 'Icon view',
      loanColType: 'Type',
      loanColName: 'Name',
      loanColStatus: 'Status',
      loanColWith: 'With',
      loanColBrand: 'Brand',
      loanColAbitti2: 'Abitti2 version',
      loanBrandOptional: 'Brand (optional)',
      loanBrandHintTitle:
        'Brands are managed under Devices in the main menu — add or edit them there first.',
      loanAbitti2Optional: 'Abitti2 version (optional)',
      loanSaveAsset: 'Save',
      loanAbitti2DocTitle: 'Abitti2 versions — School IT Tickets',
      loanAbitti2PageTitle: 'Abitti2 versions',
      loanAbitti2PageSubtitle: 'Add labels for Abitti2 builds used on loan computers',
      loanAbitti2LabelPh: 'e.g. 2.14',
      loanAbitti2Add: 'Add version',
      loanAbitti2Empty: 'No versions yet. Use Add version.',
      loanAbitti2SectionH2: 'Registered versions',
      loanAbitti2ModalAdd: 'Add Abitti2 version',
      loanAbitti2ModalEdit: 'Edit Abitti2 version',
      loanAbitti2Remove: 'Remove',
      loanAbitti2ConfirmRemove: 'Remove Abitti2 version “{name}”?',
      loanNameChargerBit: '+ charger {name}',
      loanIconChargerWord: 'charger',
      loanAvail: 'Available',
      loanOut: 'Out',
      loanKindOtherParen: '(Other)',
      loanKindChargerParen: '(Charger)',
      loanRolePupil: 'Pupil',
      loanRoleStaff: 'Teacher / staff',
      loanRoleOther: 'Other',
      loanLoadErr: 'Could not load status',
      loanReturnFail: 'Return failed',
      loanKindComputer: 'Computer',
      loanKindCharger: 'Charger',
      loanKindOther: 'Other',

      loanManageDocTitle: 'Loan inventory — School IT Tickets',
      loanManageTitle: 'Loan inventory',
      loanManageSubtitle: 'Add computers, chargers, and other loanable items',
      loanManageTabListAria: 'Inventory category',
      loanSecComputers: 'Computers',
      loanSecChargers: 'Chargers',
      loanSecOther: 'Other',
      loanNameLabel: 'Name / label',
      loanPhComputer: 'e.g. Laptop cart A-12',
      loanPhCharger: 'e.g. USB-C charger #3',
      loanPhOther: 'e.g. Projector, mouse, adapter…',
      loanAddComputer: 'Add computer',
      loanAddCharger: 'Add charger',
      loanAddOther: 'Add other',
      loanListEmpty: 'No items yet. Use the add button for this category.',
      loanModalComputerAdd: 'Add computer',
      loanModalComputerEdit: 'Edit computer',
      loanModalChargerAdd: 'Add charger',
      loanModalChargerEdit: 'Edit charger',
      loanModalOtherAdd: 'Add other item',
      loanModalOtherEdit: 'Edit item',
      loanModalSave: 'Save',
      loanRemove: 'Remove',
      loanConfirmRemove: 'Remove “{name}”?',

      loanHistDocTitle: 'Loan history — School IT Tickets',
      loanHistTitle: 'Loan history',
      loanHistSubtitle: 'When items were loaned and when they were returned',
      loanThLoanedAt: 'Loaned',
      loanThReturnedAt: 'Returned',
      loanHistState: 'State',
      loanHistActive: 'Out',
      loanHistReturned: 'Returned',
      loanHistEmpty: 'No loan events yet.',

      kioskRecordLoan: 'Record loan',
    },
    sv: {
      langLabel: 'Språk',
      langEn: 'English',
      langSv: 'Svenska',

      navTickets: 'Ärenden',
      navDevices: 'Enheter',
      navReports: 'Rapporter',
      navLoan: 'Datorlån',

      brandTitle: 'Skolans IT-ärenden',
      brandSubtitle: 'Logga och följ ärenden — Abitti, hårdvara, konton',

      themeToggleTitle: 'Byt tema',
      newTicket: '＋ Nytt ärende',

      allTickets: 'Alla ärenden',
      search: 'Sök',
      searchPh: 'Titel, beskrivning, namn…',
      status: 'Status',
      category: 'Kategori',
      priority: 'Prioritet',
      reporter: 'Anmälare',
      reporterPh: 'Namn eller typ',
      tag: 'Tagg',
      tagPh: 'Filtrera på tagg',
      fromDate: 'Från datum',
      toDate: 'Till datum',
      sort: 'Sortering',

      any: 'Alla',
      stOpen: 'Öppen',
      stClosed: 'Stängd',
      stUnresolved: 'Olöst',

      catAbitti: 'Abitti',
      catHardware: 'Hårdvara',
      catSoftware: 'Programvara',
      catNetwork: 'Nätverk',
      catAccount: 'Konto',
      catOther: 'Övrigt',

      priLow: 'Låg',
      priMedium: 'Medel',
      priHigh: 'Hög',
      priNA: 'Tillämpas inte',

      sortCreated: 'Senast skapad',
      sortUpdated: 'Senast uppdaterad',

      thId: 'ID',
      thTitle: 'Titel',
      thReporter: 'Anmälare',
      thCategory: 'Kategori',
      thDevice: 'Enhet',
      thPriority: 'Prioritet',
      thStatus: 'Status',
      thCreated: 'Skapad',
      thUpdated: 'Uppdaterad',
      ticketSortHint: 'Klicka för att sortera',
      loanSortHint: 'Klicka för att sortera',

      loading: 'Laddar…',
      noTicketsMatch: 'Inga ärenden matchar dina filter.',
      serverError:
        'Kunde inte nå servern. Kör <code>npm start</code> i projektmappen.',

      modalTicket: 'Ärende',
      modalNewTicket: 'Nytt ärende',
      modalTicketNum: 'Ärende nr ',
      closeAria: 'Stäng',

      fieldTitle: 'Titel / kort beskrivning *',
      fieldDesc: 'Utförlig beskrivning *',
      reporterType: 'Typ av anmälare *',
      reporterName: 'Anmälarens namn',
      reporterNamePh: 'Valfritt men rekommenderas',

      repPupil: 'Elev',
      repStaff: 'Personal',
      repUnknown: 'Okänd',
      repNA: 'Tillämpas inte',

      fieldCategory: 'Kategori *',
      fieldPriority: 'Prioritet *',

      deviceLabel: 'Enhet',
      deviceOptional: '— Valfritt: välj enhet —',
      hardwareHintPrefix: 'Registrera enheter (och varumärken) under',
      hardwareHintSuffix: '. Varje alternativ visar typ och varumärke.',

      statusLabel: 'Status *',
      resolutionLabel: 'Vad löste det (valfritt)',
      resolutionPh: 't.ex. kommando, drivrutin, patch, hårdvaruåtgärd, tillfällig lösning…',

      tagsLabel: 'Taggar (kommaseparerade)',
      tagsPh: 't.ex. laptop, lab-3, uppföljning',

      createdUpdated: 'Skapad:',
      updatedPart: 'Uppdaterad:',
      publicLinkLabel: 'Publik länk:',
      qrScanHint: 'Skanna för att öppna ärendet på telefon',
      attachments: 'Bilagor',
      uploadFile: 'Ladda upp fil',

      deleteTicket: 'Ta bort ärende',
      printTicket: 'Skriv ut ärende',
      cancel: 'Avbryt',
      save: 'Spara',

      alertChooseStatus: 'Välj en status.',
      confirmDelete: 'Ta bort detta ärende permanent?',
      attachLoadFail: 'Kunde inte ladda bilagor.',
      attachKb: 'kB · visa',

      printHeading: 'IT-ärende nr ',
      printReporter: 'Anmälare:',
      printCategory: 'Kategori:',
      printPriority: 'Prioritet:',
      printStatus: 'Status:',
      printDevice: 'Enhet:',
      printResolution: 'Lösning:',
      printTags: 'Taggar:',
      printCreated: 'Skapad:',
      printUpdated: 'Uppdaterad:',

      typePrinter: 'Skrivare',
      typeComputer: 'Dator',
      typePeripheral: 'Kringutrustning',
      typeOther: 'Övrigt',

      kioskTitle: 'Låna utrustning',
      kioskYourName: 'Ditt namn',
      kioskIAmA: 'Vem lånar utrustningen?',
      kioskRolePupil: 'Elev',
      kioskRoleStaff: 'Lärare / personal',
      kioskRoleOther: 'Övrig',
      kioskMainItem: 'Utrustning att låna (dator, laddare eller övrigt)',
      kioskChargerTag: ' (Laddare)',
      kioskChargerOpt: 'Laddare (valfritt)',
      kioskNoCharger: 'Ingen laddare',
      kioskNoPrimaryAvailable: 'Inga datorer eller andra artiklar tillgängliga',
      kioskSignHint: 'Signera nedan för att bekräfta utlåningen.',
      kioskClear: 'Rensa',
      kioskBack: 'Tillbaka',
      kioskOk: 'OK',
      kioskSigAria: 'Signatur',
      kioskOtherTag: ' (Övrigt)',
      kioskMsgName: 'Ange ditt namn.',
      kioskMsgNoItem: 'Ingen huvudart vald eller inget tillgängligt.',
      kioskMsgGone: 'Artikeln är inte längre tillgänglig. Välj en annan.',
      kioskMsgSession: 'Sessionen har gått ut. Gå tillbaka och försök igen.',
      kioskMsgSign: 'Signera i rutan innan du bekräftar.',
      kioskMsgSaving: 'Sparar…',
      kioskMsgThanks: 'Utlåning registrerad. Tack!',
      kioskMsgLoadFail: 'Kunde inte ladda utrustning',
      kioskSaveFail: 'Kunde inte spara utlåningen',
      kioskRoleSummaryPupil: 'Elev',
      kioskRoleSummaryStaff: 'Lärare / personal',
      kioskRoleSummaryOther: 'Övrigt',

      devDocTitle: 'Enheter — Skolans IT-ärenden',
      devPageTitle: 'Enheter',
      devPageSubtitle: 'Hantera hårdvarulager för hårdvaruärenden',
      devBrandsH2: 'Varumärken',
      devNewBrandLabel: 'Nytt varumärke',
      devNewBrandPh: 't.ex. HP, Dell, Canon',
      devAddBrand: 'Lägg till varumärke',
      devThName: 'Namn',
      devNoBrands: 'Inga varumärken ännu. Använd Lägg till varumärke.',
      devModalBrandTitleAdd: 'Lägg till varumärke',
      devModalBrandTitleEdit: 'Redigera varumärke',
      devModalDeviceTitleAdd: 'Lägg till enhet',
      devModalDeviceTitleEdit: 'Redigera enhet',
      devEdit: 'Redigera',
      devDelete: 'Ta bort',
      devSave: 'Spara',
      devCancel: 'Avbryt',
      devConfirmBrand: 'Ta bort detta varumärke? (Endast om inga enheter använder det.)',
      devDevicesH2: 'Enheter',
      devDevicesBlurb:
        'Typ: skrivare, dator, kringutrustning eller övrigt. Varje enhet kopplas till ett varumärke.',
      devTypeLabel: 'Typ *',
      devBrandLabel: 'Varumärke *',
      devLabelNote: 'Etikett / anteckning (valfritt)',
      devLabelPh: 't.ex. Lab 3, Kontoret huvud-MFP',
      devAddDevice: 'Lägg till enhet',
      devSaveDevice: 'Spara enhet',
      devCancelEdit: 'Avbryt redigering',
      devThType: 'Typ',
      devThBrand: 'Varumärke',
      devThLabel: 'Etikett',
      devNoDevices: 'Inga enheter ännu. Använd Lägg till enhet.',
      devConfirmDevice:
        'Ta bort denna enhet? Kopplade ärenden behåller historik men enhetslänken rensas.',
      devServerErr: 'Kunde inte nå servern.',

      repDocTitle: 'Rapporter — Skolans IT-ärenden',
      repPageTitle: 'Rapporter',
      repPageSubtitle: 'Översikt, perioder och exporter',
      dashAria: 'Översikt',
      dashOpen: 'Öppna',
      dashClosed: 'Stängda',
      dashUnresolved: 'Olösta',
      dashTotal: 'Totalt',
      dashOpenHint: 'Aktiva ärenden',
      dashClosedHint: 'Lösta och stängda',
      dashUnresHint: 'Kräver uppföljning',
      dashTotalHint: 'Sedan start',
      dashByCategory: 'Per kategori',
      dashByPriority: 'Per prioritet',
      repPeriodSummary: 'Periodsammanfattning',
      repTabDaily: 'Dag',
      repTabWeekly: 'Vecka',
      repTabMonthly: 'Månad',
      repRangePrefix: 'Intervall:',
      repRangeArrow: '→',
      repRangeTickets: 'ärenden',
      repExportCsv: 'Exportera CSV',
      repExportPdf: 'Exportera PDF',
      repLoadErr: 'Kunde inte ladda rapporter. Körs servern?',

      loanDocTitle: 'Datorlån — Skolans IT-ärenden',
      loanPageTitle: 'Datorlån',
      loanPageSubtitle: 'Översikt — tillgänglighet och aktiva utlåningar',
      loanSubOverview: 'Översikt',
      loanSubManage: 'Hantera lager',
      loanSubKiosk: 'Låna (kiosk)',
      loanSubHistory: 'Historik',
      loanSubAbitti2: 'Abitti2-versioner',
      loanActiveLoans: 'Aktiva utlåningar',
      loanReturnHint:
        'Vid återlämning avslutas lånet och utrustningen frigörs (även en laddare som lånats ensam eller med dator).',
      loanThSince: 'Sedan',
      loanThBorrower: 'Låntagare',
      loanThRole: 'Roll',
      loanThMainItem: 'Huvudartikel',
      loanThCharger: 'Laddare',
      loanRefresh: 'Uppdatera',
      loanNoActive: 'Inga aktiva utlåningar.',
      loanMarkReturned: 'Markera återlämnad',
      loanConfirmReturn: 'Markera denna utlåning som återlämnad?',
      loanAllEquipment: 'All utrustning',
      loanViewToggleAria: 'Layout för utrustning',
      loanViewListTitle: 'Listvy',
      loanViewIconsTitle: 'Ikonvy',
      loanColType: 'Typ',
      loanColName: 'Namn',
      loanColStatus: 'Status',
      loanColWith: 'Utlånad till',
      loanColBrand: 'Märke',
      loanColAbitti2: 'Abitti2-version',
      loanBrandOptional: 'Märke (valfritt)',
      loanBrandHintTitle:
        'Märken hanteras under Enheter i huvudmenyn — lägg till eller redigera dem där först.',
      loanAbitti2Optional: 'Abitti2-version (valfritt)',
      loanSaveAsset: 'Spara',
      loanAbitti2DocTitle: 'Abitti2-versioner — Skolans IT-ärenden',
      loanAbitti2PageTitle: 'Abitti2-versioner',
      loanAbitti2PageSubtitle: 'Lägg till beteckningar för Abitti2-versioner på utlåningsdatorer',
      loanAbitti2LabelPh: 't.ex. 2.14',
      loanAbitti2Add: 'Lägg till version',
      loanAbitti2Empty: 'Inga versioner ännu. Använd Lägg till version.',
      loanAbitti2SectionH2: 'Registrerade versioner',
      loanAbitti2ModalAdd: 'Lägg till Abitti2-version',
      loanAbitti2ModalEdit: 'Redigera Abitti2-version',
      loanAbitti2Remove: 'Ta bort',
      loanAbitti2ConfirmRemove: 'Ta bort Abitti2-version ”{name}”?',
      loanNameChargerBit: '+ laddare {name}',
      loanIconChargerWord: 'laddare',
      loanAvail: 'Tillgänglig',
      loanOut: 'Utlånad',
      loanKindOtherParen: '(Övrigt)',
      loanKindChargerParen: '(Laddare)',
      loanRolePupil: 'Elev',
      loanRoleStaff: 'Lärare / personal',
      loanRoleOther: 'Övrig',
      loanLoadErr: 'Kunde inte ladda status',
      loanReturnFail: 'Återlämning misslyckades',
      loanKindComputer: 'Dator',
      loanKindCharger: 'Laddare',
      loanKindOther: 'Övrigt',

      loanManageDocTitle: 'Utlåningslager — Skolans IT-ärenden',
      loanManageTitle: 'Utlåningslager',
      loanManageSubtitle: 'Lägg till datorer, laddare och andra lånebara artiklar',
      loanManageTabListAria: 'Lagerkategori',
      loanSecComputers: 'Datorer',
      loanSecChargers: 'Laddare',
      loanSecOther: 'Övrigt',
      loanNameLabel: 'Namn / etikett',
      loanPhComputer: 't.ex. KG lånedator 01',
      loanPhCharger: 't.ex. USB-C-laddare nr 3',
      loanPhOther: 't.ex. projektor, mus, adapter…',
      loanAddComputer: 'Lägg till dator',
      loanAddCharger: 'Lägg till laddare',
      loanAddOther: 'Lägg till övrigt',
      loanListEmpty: 'Inga poster ännu. Använd knappen Lägg till för den här kategorin.',
      loanModalComputerAdd: 'Lägg till dator',
      loanModalComputerEdit: 'Redigera dator',
      loanModalChargerAdd: 'Lägg till laddare',
      loanModalChargerEdit: 'Redigera laddare',
      loanModalOtherAdd: 'Lägg till övrigt',
      loanModalOtherEdit: 'Redigera post',
      loanModalSave: 'Spara',
      loanRemove: 'Ta bort',
      loanConfirmRemove: 'Ta bort ”{name}”?',

      loanHistDocTitle: 'Utlåningshistorik — Skolans IT-ärenden',
      loanHistTitle: 'Utlåningshistorik',
      loanHistSubtitle: 'När artiklar lånades ut och när de återlämnades',
      loanThLoanedAt: 'Utlånad',
      loanThReturnedAt: 'Återlämnad',
      loanHistState: 'Läge',
      loanHistActive: 'Ute',
      loanHistReturned: 'Återlämnad',
      loanHistEmpty: 'Inga utlåningar ännu.',

      kioskRecordLoan: 'Registrera utlåning',
    },
  };

  function getLang() {
    const s = localStorage.getItem(LANG_KEY);
    if (s === 'sv' || s === 'en') return s;
    return 'en';
  }

  function setLang(lang) {
    if (lang !== 'sv' && lang !== 'en') return;
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
    applyDataI18n();
    global.dispatchEvent(new CustomEvent('it-lang-change', { detail: { lang } }));
  }

  function t(key) {
    const lang = getLang();
    const v = STR[lang]?.[key];
    if (v != null) return v;
    return STR.en[key] ?? key;
  }

  function applyDataI18n(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      if (k) el.textContent = t(k);
    });
    scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const k = el.getAttribute('data-i18n-html');
      if (k) el.innerHTML = t(k);
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const k = el.getAttribute('data-i18n-placeholder');
      if (k && 'placeholder' in el) el.placeholder = t(k);
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const k = el.getAttribute('data-i18n-title');
      if (k) el.title = t(k);
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const k = el.getAttribute('data-i18n-aria');
      if (k) el.setAttribute('aria-label', t(k));
    });
    scope.querySelectorAll('[data-i18n-alt]').forEach((el) => {
      const k = el.getAttribute('data-i18n-alt');
      if (k) el.setAttribute('alt', t(k));
    });
  }

  function initLangSelector() {
    const sel = document.getElementById('langSelect');
    if (!sel) return;
    sel.value = getLang();
    sel.addEventListener('change', () => setLang(sel.value));
  }

  function boot() {
    document.documentElement.lang = getLang();
    applyDataI18n();
    initLangSelector();
  }

  global.ITTicketsI18n = {
    LANG_KEY,
    STR,
    getLang,
    setLang,
    t,
    applyDataI18n,
    initLangSelector,
    boot,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
