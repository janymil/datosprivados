# Prehľad všetkých povinných dokumentov podľa peruánskeho zákona (Ley N.° 29733 & DS N.° 016-2024-JUS)

Tento dokument slúži ako kompletná mapa všetkých právnych dokumentov, formulárov a záznamov, ktoré musí mať peruánska firma (MYPE / RUC 10 / RUC 20), aby bola 100 % v súlade so zákonom **Ley N.° 29733** (Ley de Protección de Datos Personales) a novým vykonávacím predpisom **Decreto Supremo N.° 016-2024-JUS**, a ako ich pokrýva aplikácia **DatosPrivados**.

Dokumenty sú rozdelené do **3 skupín**:
1. **Dokumenty pre ZÁKAZNÍKOV a OBČANOV (Verejné / Externé)**
2. **INTERNÉ dokumenty pre FIRMU (Pracovné zmluvy, dodávatelia, bezpečnosť)**
3. **Dokumenty pre ŠTÁTNU KONTROLU — ANPD / MINJUSDH (Inšpekčná zložka / Expediente de Fiscalización)**

---

## 1. Dokumenty pre ZÁKAZNÍKOV a OBČANOV (Verejné / Externé)

Tieto dokumenty vidia zákazníci, pacienti, návštevníci webu alebo ľudia, ktorí s firmou komunikujú cez WhatsApp, Instagram, e-mail alebo osobne v predajni. Ich cieľom je splniť **Deber de Información (Čl. 18 Ley 29733)** a **Principio de Consentimiento (Čl. 5 a 13 Ley 29733)**.

| # | Názov dokumentu (ES / SK) | Zákonný základ | Čo musí obsahovať a načo slúži | Kde je to v aplikácii DatosPrivados |
|---|---|---|---|---|
| **1.1** | **Política de Privacidad**<br>*(Verejná politika ochrany osobných údajov)* | Art. 18 Ley 29733 & DS 016-2024-JUS | 10 povinných bodov: Identita firmy (RUC, adresa), kontakt na ODP/privacidad, zoznam bánk dát a ich účel, ktoré dáta sú povinné/dobrovoľné a následky ich neposkytnutia, právny základ (Art. 14), doba uchovávania, príjemcovia a medzinárodný prenos (cloud), bezplatné uplatnenie práv ARCO + lehoty (8/10/20 pracovných dní, čl. 69 DS 016-2024-JUS) + právo na reklamáciu na ANPD (platforma «Yo cuido mis datos personales»; nariadenie nestanovuje 15-dňovú lehotu na podanie), informácia o automatizovanom spracovaní a o práve na tratamiento objetivo. | **Documentos → 1. Política de privacidad**<br>+ Verejná URL: `/p/[slug]`<br>([`src/lib/documents.ts`](file:///c:/Users/USER/Documents/SAAS%20Projects/src/lib/documents.ts#L37)) |
| **1.2** | **Cláusulas de Consentimiento Web (2 Checkboxes)**<br>*(Texty súhlasov pre webové formuláre)* | Art. 5, 13.5 Ley 29733 | Oddelenie účelov: **1)** Povinné potvrdenie o prečítaní politiky pre vybavenie nákupu/dopytu a **2)** Samostatný, nezaškrtnutý (voliteľný) checkbox pre posielanie reklám a akcií. | **Documentos → 2. Textos de consentimiento (Sekcia A)**<br>([`src/lib/documents.ts`](file:///c:/Users/USER/Documents/SAAS%20Projects/src/lib/documents.ts#L134)) |
| **1.3** | **Mensaje Opt-in para WhatsApp y Redes**<br>*(Text žiadosti o súhlas na WhatsApp)* | Art. 5, 13.5 Ley 29733 | Krátka správa do chatu WhatsApp Business, kde zákazník odpíše *«SÍ ACEPTO»* pred zaradením do reklamného rozosielania + inštrukcia ako sa odhlásiť (*«BAJA»*). | **Documentos → 2. Textos de consentimiento (Sekcia B)** |
| **1.4** | **Correo de Doble Opt-in (Newsletter)**<br>*(Potvrdzovací e-mail na odber noviniek)* | Art. 5, 13.5 Ley 29733 | Text e-mailu na potvrdenie prihlásenia do newslettra s odkazom na politiku súkromia a odhlásenie. | **Documentos → 2. Textos de consentimiento (Sekcia C)** |
| **1.5** | **Autorización Expresa por Escrito para Datos Sensibles**<br>*(Písomný súhlas pre citlivé údaje – kliniky, zdravie, biometria)* | Art. 13.6 Ley 29733 | Zákon pri citlivých údajoch (zdravotný stav, zubári, estetika, lekárske potvrdenia, odtlačky/tvár) vyžaduje **písomný súhlas** (alebo digitálny podpis). | **Documentos → 2. Textos de consentimiento (Sekcia D)** |
| **1.6** | **Aviso de Privacidad Corto (Letra pequeña)**<br>*(Krátke poučenie na bločky, faktúry a pätu dokumentov)* | Art. 18 Ley 29733 | Krátky 3-riadkový text s odkazom na plnú politiku súkromia a formulár ARCO. | **Documentos → 2. Textos de consentimiento (Sekcia E)** |
| **1.7** | **Cartel Informativo de Videovigilancia (CCTV)**<br>*(Informačná tabuľka pre bezpečnostné kamery v prevádzke)* | Directiva de Videovigilancia ANPD | Povinná tabuľka so symbolom kamery pri vstupe do predajne/kancelárie: uvádza meno firmy, RUC, adresu, účel, dobu uchovávania záznamu (30–60 kalendárnych dní; v školách max. 30 dní — Directiva 01-2020-JUS/DGTAIPD), žltú tabuľu min. A4 a doplnkový informačný list a kde uplatniť práva ARCO. | **Documentos → 4. Contratos, Confidencialidad y Cartel CCTV (Sekcia C)** |
| **1.8** | **Formulario Público de Solicitudes ARCO + Constancia de Ticket**<br>*(Verejný formulár na uplatnenie práv občanov)* | Art. 19–27 Ley 29733 & DS 016-2024-JUS | Verejne dostupný bezplatný kanál, kde občan zadá žiadosť (Acceso, Rectificación, Cancelación, Oposición) a okamžite dostane potvrdenie s číslom ticketu (`ARCO-2026-XXXX`). | Verejná URL: `/solicitud/[slug]`<br>([`src/app/solicitud/[slug]/page.tsx`](file:///c:/Users/USER/Documents/SAAS%20Projects/src/app/solicitud/%5Bslug%5D/page.tsx)) |
| **1.9** | **Cartas de Respuesta Legal a Solicitudes ARCO**<br>*(Oficiálne odpovede zákazníkom na žiadosti ARCO)* | Art. 73 DS 016-2024-JUS | 4 právne šablóny odpovedí (Acceso, Rectificación, Cancelación, Oposición). Obsahujú rozhodnutie firmy, vysvetlenie zákonnej výnimky pri faktúrach pre SUNAT a **povinné poučenie o práve podať reklamáciu na ANPD alebo hábeas data (čl. 73) — bez 15-dňovej lehoty, ktorú nariadenie nepozná**. | **Solicitudes ARCO → Detail žiadosti → Cargar plantilla legal**<br>([`src/components/arco-response-form.tsx`](file:///c:/Users/USER/Documents/SAAS%20Projects/src/components/arco-response-form.tsx)) |

---

## 2. INTERNÉ dokumenty pre FIRMU (Prevádzka, zamestnanci a dodávatelia)

Tieto dokumenty sa **nezverejňujú na internete**. Slúžia na to, aby mala firma legálne ošetrené vzťahy so svojimi zamestnancami, externým účtovníkom, kuriérom a IT systémami.

| # | Názov dokumentu (ES / SK) | Zákonný základ | Čo musí obsahovať a načo slúži | Kde je to v aplikácii DatosPrivados |
|---|---|---|---|---|
| **2.1** | **Documento de Seguridad (Manual Interno)**<br>*(Interný bezpečnostný projekt / manuál)* | Art. 16 Ley 29733 & DS 016-2024-JUS | 8-kapitolový interný predpis s dátumom schválenia (*fecha cierta*) a podpisom: inventár bánk dát, zodpovedné osoby, správa hesiel a prístupov (zákaz zdieľaných účtov, zrušenie prístupov pri odchode zamestnanca), týždenné zálohovanie (backups) + 6-mesačné testy obnovy, bezpečné mazanie zariadení pred vyradením, 48-hodinový protokol pri incidente. | **Documentos → 3. Documento de seguridad (Interno)**<br>([`src/lib/documents.ts`](file:///c:/Users/USER/Documents/SAAS%20Projects/src/lib/documents.ts#L197)) |
| **2.2** | **Compromiso de Confidencialidad para Trabajadores**<br>*(Zmluva o mlčanlivosti pre zamestnancov a brigádnikov)* | Art. 17 Ley 29733 (*Deber de confidencialidad*) | Dokument, ktorý podpíše každý zamestnanec/predajca, ktorý vidí údaje klientov. Zaväzuje ho k mlčanlivosti (aj po skončení pracovného pomeru), zákazu kopírovania databáz a povinnosti nahlásiť incident do 2 hodín. | **Documentos → 4. Contratos, Confidencialidad y Cartel CCTV (Sekcia A)**<br>([`src/lib/documents.ts`](file:///c:/Users/USER/Documents/SAAS%20Projects/src/lib/documents.ts#L261)) |
| **2.3** | **Cláusula / Adenda de Encargo de Tratamiento para Proveedores**<br>*(Zmluvný dodatok pre spracovateľov – účtovník, kuriér, marketing, IT)* | DS 016-2024-JUS (*Encargado del tratamiento*) | Zmluvná doložka medzi firmou a externým dodávateľom (napr. externý účtovník, kuriér, marketingová agentúra). Zakazuje dodávateľovi použiť dáta na vlastné účely, prikazuje mu bezpečnostné opatrenia, nahlásenie incidentu do 12 hodín a vymazanie dát po skončení zmluvy. | **Documentos → 4. Contratos, Confidencialidad y Cartel CCTV (Sekcia B)** |
| **2.4** | **Acta de Designación Interna de Responsable de Privacidad / ODP**<br>*(Interné menovanie kontaktnej osoby / Oficial de Datos Personales)* | DS 016-2024-JUS | Interný zápis vedenia firmy o tom, kto vo firme zodpovedá za agendu ochrany údajov a vybavenie žiadostí ARCO (s odkazom na prechodné ustanovenie DS 016-2024-JUS pre MYPE do 30. novembra 2028). | **Documentos → 4. Contratos, Confidencialidad y Cartel CCTV (Sekcia D)** |

| **2.5** | **Aviso y consentimiento para trabajadores** *(Pracovné oznámenie, súhlas s citlivými údajmi, oznámenie pre uchádzačov, monitoring)* | Art. 18 Ley 29733; art. 6, 8, 46.2 y 46.4 DS 016-2024-JUS | Banka «Colaboradores y postulantes» sa navrhuje každému odvetviu, ale doteraz k nej neexistoval žiaden dokument. Obsahuje oznámenie o spracovaní, písomný súhlas pre zdravie/biometriu, CV uchádzačov (6 mesiacov), oznámenie o kamerách/GPS a záznam o školení. | **Documentos → Aviso y consentimiento para trabajadores** (`trabajadores`) |
| **2.6** | **Procedimiento interno de derechos ARCO** *(Interný postup vybavovania žiadostí)* | Arts. 61–88 DS 016-2024-JUS | Kanály, lehoty (8/10/20), doplnenie žiadosti (5+5 dní, art. 66.2), doplňujúce informácie (7+10 dní, art. 70), predĺženie (art. 71), obsah odpovede, zamietnutie (art. 73), evidencia dôkazov. | **Documentos → Procedimiento de derechos ARCO** (`arco`) |

---

## Adaptácia podľa odvetvia

Všetkých **63** odvetví (nie 77) z `src/lib/sectors.ts` je priradených do **26 právnych rodín** v `src/lib/sector-legal.ts`. Rodina určuje: citlivé údaje, maloletých, sektorové normy, retenčné lehoty, text súhlasu, bezpečnostné opatrenia a riziká EIPD; plus ktoré dokumenty sú pre odvetvie *esencial / recomendado / opcional*. Podrobnosti: `AUDITORIA_DOCUMENTOS_LEGALES.md`.

---

## 3. Dokumenty pre ŠTÁTNU KONTROLU — ANPD / MINJUSDH (Inšpekčná zložka)

Keď **Dirección de Fiscalización e Instrucción de la ANPD** pošle firme výzvu na kontrolu (*Requerimiento de fiscalización*) alebo keď nastane bezpečnostný incident, firma musí predložiť presne tieto dokumenty a evidencie:

| # | Názov dokumentu / dôkazu (ES / SK) | Zákonný základ | Čo kontrolór ANPD kontroluje | Kde je to v aplikácii DatosPrivados |
|---|---|---|---|---|
| **3.1** | **Inventario y Fichas Técnicas para Inscripción en el RNPDP / SIPDP**<br>*(Inventár a technické listy bánk dát + štátne kódy zápisu)* | Art. 29 y 34 Ley 29733 & DS 016-2024-JUS | Či sú všetky databázy firmy (Clientes, Trabajadores, Proveedores, Videovigilancia, Marketing) zapísané v štátnom registri RNPDP cez portál `sipdp.minjus.gob.pe` a či sa realita zhoduje s registráciou. | **Bancos de datos → Ficha SIPDP** (`/app/bancos/[id]/ficha`) + uložený kód `sipdp_code` a dátum registrácie |
| **3.2** | **Reporte Oficial de Notificación de Incidente de Seguridad en 48 Horas**<br>*(Úradné hlásenie úniku dát pre ANPD a CNSD)* | DS 016-2024-JUS | Ak nastal únik dát (hacknutie, krádež notebooku, omylom rozoslaná databáza), či firma do **48 hodín** od zistenia podala hlásenie s 7 povinnými náležitosťami na ANPD (a pri digitálnom incidente aj na CNSD) a informovala dotknuté osoby. | **Incidentes → Detail incidentu → Borrador de notificación ANPD**<br>([`src/app/app/incidentes/[id]/page.tsx`](file:///c:/Users/USER/Documents/SAAS%20Projects/src/app/app/incidentes/%5Bid%5D/page.tsx#L31)) |
| **3.3** | **Registro / Bitácora Histórica de Incidentes**<br>*(Kniha bezpečnostných incidentov)* | DS 016-2024-JUS | Aj keď incident nebol taký vážny, aby vyžadoval notifikáciu občanov, firma musí viesť interný záznam o tom, kedy bol zistený, koľko ľudí sa týkal a aké nápravné opatrenia prijala. | **Incidentes** (`/app/incidentes`) |
| **3.4** | **Expediente de Evidencia de Atención ARCO**<br>*(Archív prijatých žiadostí ARCO a odoslaných odpovedí s časovou pečiatkou)* | Principio de Responsabilidad Proactiva (*Accountability*) | Dôkaz, že firma odpovedala občanom v zákonnej lehote (**8 dní** pre información, **10 pracovných dní** pre Rectificación/Cancelación/Oposición a **20 pracovných dní** pre Acceso) — vrátane dátumu prijatia (`received_at`), vypočítanej lehoty (`due_at`) a dátumu odpovede (`responded_at`). | **Solicitudes ARCO** (`/app/arco` a `/app/arco/[id]`) |
| **3.5** | **Exportación Integral del Expediente de Cumplimiento**<br>*(Kompletný export spisu pre právnika alebo inšpekciu)* | DS 016-2024-JUS | Súhrnný balík všetkých deklarovaných bánk dát, verzií dokumentov, žiadostí ARCO, incidentov a časovej osi aktivít (`activity log`). | **Ajustes → Descargar expediente (.json)** (`/app/ajustes`) + tlač/PDF jednotlivých dokumentov |

---

## Ako by mal podnikateľ postupovať, ak mu príde kontrola z ANPD?

1. **Predloží Kódy zápisu z RNPDP / SIPDP** (z modulu *Bancos de datos* + vytlačené *Fichas SIPDP*).
2. **Ukáže verejnú URL adresu Politiky súkromia** (`/p/jeho-firma`) a **texty súhlasov** (z modulu *Documentos → Pestañas 1 y 2*).
3. **Predloží podpísaný Documento de Seguridad** spolu s **podpísanými dohodami o mlčanlivosti zamestnancov a dodatkami s dodávateľmi** (z modulu *Documentos → Pestañas 3 y 4*).
4. **Predloží históriu vybavených žiadostí ARCO** a **knihu incidentov** (z modulov *Solicitudes ARCO* a *Incidentes*, prípadne kompletný export zo sekcie *Ajustes*).
