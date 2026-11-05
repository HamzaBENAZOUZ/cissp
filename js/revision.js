/* Fiches de révision CISSP (21 chapitres du Official Study Guide) : résumé, préparation à l'examen, à mémoriser.
   Texte original rédigé pour ce site (pas d'extrait du livre). Généré depuis le brouillon de rédaction. */
export const REVISION = [
 {
  "id": 1,
  "sum": {
   "en": [
    "Security governance is the set of practices that align the security program with the organization's mission, goals and objectives. Senior management is ultimately responsible for security, while the security function supports the business rather than blocking it. The core goals are confidentiality, integrity and availability (CIA), complemented by authenticity, nonrepudiation and the AAA services (identification, authentication, authorization, auditing and accounting).",
    "Governance is organized through strategic plans (about five years), tactical plans (about one year) and operational plans (short term). Organizational processes such as acquisitions, mergers and divestitures introduce new risks and require due diligence. Roles include senior manager, security professional, asset owner, custodian, user and auditor.",
    "Security control frameworks (ISO 27001/27002, NIST CSF, NIST SP 800-53, COBIT, SABSA, CIS Controls) give structure. Due diligence means investigating and planning before acting; due care means acting reasonably and continuously. The documentation hierarchy is: policy (mandatory, high-level intent), standards (mandatory, specific requirements), baselines (minimum configurations), guidelines (recommendations) and procedures (step-by-step). Threat modeling (STRIDE, PASTA, VAST, DREAD) identifies threats early, ideally during design. Supply chain risk management assesses suppliers, uses SBOMs and requires minimum security levels and SLAs."
   ],
   "fr": [
    "La gouvernance de la sécurité regroupe les pratiques qui alignent le programme de sécurité sur la mission, les buts et les objectifs de l'organisation. La direction générale est responsable en dernier ressort, et la fonction sécurité doit servir l'activité au lieu de la freiner. Les objectifs centraux sont la confidentialité, l'intégrité et la disponibilité (CIA), complétées par l'authenticité, la non-répudiation et les services AAA (identification, authentification, autorisation, audit et traçabilité).",
    "La gouvernance s'organise en plans stratégiques (environ cinq ans), tactiques (environ un an) et opérationnels (court terme). Les acquisitions, fusions et cessions apportent de nouveaux risques et exigent une due diligence. Les rôles : direction, professionnel de la sécurité, propriétaire de l'actif, dépositaire, utilisateur et auditeur.",
    "Les référentiels de contrôles (ISO 27001/27002, NIST CSF, NIST SP 800-53, COBIT, SABSA, CIS Controls) donnent un cadre. La due diligence consiste à se renseigner et planifier avant d'agir ; le due care consiste à agir de façon raisonnable et continue. Hiérarchie documentaire : politique (obligatoire, intention générale), normes (obligatoires, exigences précises), baselines (configurations minimales), lignes directrices (recommandations) et procédures (pas à pas). La modélisation des menaces (STRIDE, PASTA, VAST, DREAD) identifie les menaces tôt, idéalement en conception. La gestion du risque fournisseur évalue les fournisseurs, s'appuie sur les SBOM et impose des niveaux minimaux de sécurité et des SLA."
   ]
  },
  "tips": {
   "en": [
    "Think like a manager: choose answers that support business objectives and governance over purely technical fixes.",
    "Senior management is always ultimately accountable; responsibility can be delegated, accountability cannot.",
    "If two answers are both correct, prefer the one that addresses the root cause or is done first (for example policy before technology).",
    "Know the purpose of each framework (COBIT = IT governance, SABSA = business-driven architecture, NIST CSF = cybersecurity outcomes) rather than their detailed steps.",
    "Threat modeling is most valuable during design, when changes are cheapest."
   ],
   "fr": [
    "Pensez comme un manager : préférez les réponses qui servent les objectifs métier et la gouvernance aux corrections purement techniques.",
    "La direction générale est toujours responsable en dernier ressort ; on délègue les tâches, pas la responsabilité.",
    "Si deux réponses sont justes, choisissez celle qui traite la cause ou qui vient en premier (par exemple la politique avant la technologie).",
    "Retenez l'objectif de chaque référentiel (COBIT = gouvernance IT, SABSA = architecture pilotée par le métier, NIST CSF = résultats de cybersécurité) plutôt que ses étapes.",
    "La modélisation des menaces a le plus de valeur en conception, quand les changements coûtent le moins."
   ]
  },
  "mem": {
   "en": [
    "CIA: confidentiality, integrity, availability; plus authenticity and nonrepudiation.",
    "AAA: identification, authentication, authorization, auditing, accounting.",
    "Plans: strategic (~5 years), tactical (~1 year), operational (short term).",
    "Policy (mandatory, general) > standard (mandatory, specific) > baseline (minimum) > guideline (optional) > procedure (step-by-step).",
    "Due diligence = know before you act; due care = do the right thing continuously.",
    "STRIDE: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.",
    "PASTA: 7-stage, risk-centric threat modeling.",
    "SBOM formats: SPDX and CycloneDX.",
    "Defense in depth = multiple layered controls; it supports zero trust."
   ],
   "fr": [
    "CIA : confidentialité, intégrité, disponibilité ; plus authenticité et non-répudiation.",
    "AAA : identification, authentification, autorisation, audit, traçabilité.",
    "Plans : stratégique (~5 ans), tactique (~1 an), opérationnel (court terme).",
    "Politique (obligatoire, générale) > norme (obligatoire, précise) > baseline (minimum) > ligne directrice (facultative) > procédure (pas à pas).",
    "Due diligence = savoir avant d'agir ; due care = bien agir en continu.",
    "STRIDE : usurpation, falsification, répudiation, divulgation d'information, déni de service, élévation de privilèges.",
    "PASTA : modélisation des menaces en 7 étapes, centrée sur le risque.",
    "Formats de SBOM : SPDX et CycloneDX.",
    "Défense en profondeur = plusieurs couches de contrôles ; elle soutient le zero trust."
   ]
  }
 },
 {
  "id": 2,
  "sum": {
   "en": [
    "People are often the weakest link, so personnel security covers the whole employment lifecycle. Job descriptions define roles and required access. Candidate screening includes background, reference and education checks. Employment agreements, NDAs and acceptable use policies set expectations. Onboarding provisions only the access needed; transfers must remove old rights to avoid privilege creep; termination requires prompt removal of access (immediately for involuntary departures), recovery of assets and an exit interview. Controls such as separation of duties, job rotation, mandatory vacations and least privilege reduce fraud. Vendor, consultant and contractor controls rely on SLAs, contracts and monitoring.",
    "Risk management identifies, assesses and responds to risk. Key terms: asset, threat, vulnerability, exposure, risk, safeguard (proactive) and countermeasure (reactive). Quantitative analysis uses dollar values: SLE = AV x EF, ALE = SLE x ARO, and the value of a safeguard = ALE before - ALE after - annual cost of the safeguard. Qualitative analysis uses ratings, scenarios and techniques such as Delphi. Responses are mitigation, transference, avoidance and acceptance; ignoring (rejecting) risk is never acceptable. Residual risk must stay within the risk appetite. Controls are categorized as administrative, technical/logical and physical, and by type: directive, deterrent, preventive, detective, corrective, recovery and compensating. Frameworks include NIST RMF (with Authorization to Operate), ISO 31000 and FAIR. Security awareness, training and education programs, measured for effectiveness, complete the picture."
   ],
   "fr": [
    "L'humain est souvent le maillon faible : la sécurité du personnel couvre tout le cycle d'emploi. Les fiches de poste définissent les rôles et les accès nécessaires. La sélection des candidats comprend la vérification des antécédents, des références et des diplômes. Contrats de travail, accords de confidentialité et chartes d'utilisation fixent les attentes. L'intégration ne donne que les accès nécessaires ; les mutations doivent retirer les anciens droits pour éviter l'accumulation de privilèges ; le départ exige le retrait rapide des accès (immédiat pour un départ contraint), la restitution du matériel et un entretien de sortie. La séparation des tâches, la rotation des postes, les congés obligatoires et le moindre privilège réduisent la fraude. Les fournisseurs, consultants et prestataires sont encadrés par des SLA, des contrats et une surveillance.",
    "La gestion des risques identifie, évalue et traite les risques. Termes clés : actif, menace, vulnérabilité, exposition, risque, protection (proactive) et contre-mesure (réactive). L'analyse quantitative utilise des montants : SLE = AV x EF, ALE = SLE x ARO, et la valeur d'une mesure = ALE avant - ALE après - coût annuel de la mesure. L'analyse qualitative utilise des niveaux, des scénarios et des techniques comme Delphi. Les réponses : réduction, transfert, évitement et acceptation ; ignorer (rejeter) un risque n'est jamais acceptable. Le risque résiduel doit rester dans l'appétence au risque. Les contrôles se classent en administratifs, techniques/logiques et physiques, et par type : directif, dissuasif, préventif, détectif, correctif, de reprise et compensatoire. Référentiels : NIST RMF (avec l'autorisation d'exploitation, ATO), ISO 31000 et FAIR. Les programmes de sensibilisation, de formation et d'éducation, dont on mesure l'efficacité, complètent l'ensemble."
   ]
  },
  "tips": {
   "en": [
    "Practice the quantitative formulas until they are automatic; expect at least one calculation question.",
    "A control that costs more than the asset it protects is not cost-effective.",
    "Accountability for data cannot be transferred, even when risk is transferred through insurance or outsourcing.",
    "For terminations, remove access at the moment of notification, especially for involuntary departures.",
    "Recognize control types in scenarios: the same device can be deterrent and detective (for example a visible camera)."
   ],
   "fr": [
    "Entraînez-vous aux formules quantitatives jusqu'à ce qu'elles soient automatiques ; attendez-vous à au moins un calcul.",
    "Une mesure qui coûte plus que l'actif protégé n'est pas rentable.",
    "La responsabilité des données ne se transfère pas, même quand le risque est transféré par une assurance ou de la sous-traitance.",
    "Lors d'un départ, retirez les accès au moment de l'annonce, surtout pour un départ contraint.",
    "Reconnaissez les types de contrôles dans un scénario : un même dispositif peut être dissuasif et détectif (une caméra visible par exemple)."
   ]
  },
  "mem": {
   "en": [
    "SLE = AV x EF (asset value x exposure factor).",
    "ARO = how many times per year (once every 10 years = 0.1).",
    "ALE = SLE x ARO.",
    "Safeguard value = ALE before - ALE after - annual cost of safeguard.",
    "Risk responses: mitigate, transfer, avoid, accept (never ignore/reject).",
    "Inherent risk = before controls; residual risk = after controls; total risk = threats x vulnerabilities x asset value.",
    "Control types: directive, deterrent, preventive, detective, corrective, recovery, compensating.",
    "Control categories: administrative, technical (logical), physical.",
    "NIST RMF steps: Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor."
   ],
   "fr": [
    "SLE = AV x EF (valeur de l'actif x facteur d'exposition).",
    "ARO = nombre de fois par an (une fois tous les 10 ans = 0,1).",
    "ALE = SLE x ARO.",
    "Valeur d'une mesure = ALE avant - ALE après - coût annuel de la mesure.",
    "Réponses au risque : réduire, transférer, éviter, accepter (jamais ignorer/rejeter).",
    "Risque inhérent = avant contrôles ; risque résiduel = après contrôles ; risque total = menaces x vulnérabilités x valeur de l'actif.",
    "Types de contrôles : directif, dissuasif, préventif, détectif, correctif, de reprise, compensatoire.",
    "Catégories : administratif, technique (logique), physique.",
    "Étapes du NIST RMF : Prepare, Categorize, Select, Implement, Assess, Authorize, Monitor."
   ]
  }
 },
 {
  "id": 3,
  "sum": {
   "en": [
    "Business continuity planning (BCP) keeps critical business functions running during and after a disruption. It is driven by the business, approved by senior management and broader than disaster recovery, which focuses on restoring IT systems and facilities. The four main steps are: project scope and planning, business impact analysis, continuity planning, and approval and implementation.",
    "Project scope and planning starts with a business organization analysis, forms the BCP team with representatives from all departments, identifies resources and reviews legal and regulatory requirements. The business impact analysis (BIA) is the foundation: identify priorities and critical processes, assess likelihood and impact, and set the maximum tolerable downtime (MTD), recovery time objective (RTO) and recovery point objective (RPO). It combines quantitative and qualitative impacts such as lost revenue, reputation and legal penalties. External dependencies (suppliers, utilities, telecom) must be identified, and vendor diversity avoids relying on a provider affected by the same event.",
    "Continuity planning develops strategies and provisions (people, buildings, infrastructure) to meet the targets. People always come first. The plan is then approved, implemented, communicated, trained and tested, and maintained as the business changes. Documentation includes the continuity plan, a statement of importance, priorities, responsibilities, risk assessment results, risk acceptance and vital records."
   ],
   "fr": [
    "La planification de la continuité d'activité (PCA) maintient les fonctions critiques pendant et après une perturbation. Elle est pilotée par le métier, approuvée par la direction, et plus large que la reprise après sinistre, centrée sur la remise en service de l'IT et des locaux. Les quatre étapes : périmètre et planification du projet, analyse d'impact sur l'activité, planification de la continuité, approbation et mise en œuvre.",
    "Le cadrage commence par une analyse de l'organisation, constitue l'équipe PCA avec des représentants de tous les services, identifie les ressources et examine les exigences légales et réglementaires. Le BIA est la base : identifier les priorités et processus critiques, évaluer probabilité et impact, et fixer la durée maximale d'interruption tolérable (MTD), l'objectif de délai de reprise (RTO) et l'objectif de point de reprise (RPO). Il combine impacts quantitatifs et qualitatifs : chiffre d'affaires, réputation, sanctions. Les dépendances externes (fournisseurs, énergie, télécoms) doivent être identifiées, et la diversité des fournisseurs évite de dépendre d'un prestataire touché par le même événement.",
    "La planification de la continuité définit les stratégies et les moyens (personnes, bâtiments, infrastructure) pour tenir ces objectifs. Les personnes passent toujours en premier. Le plan est ensuite approuvé, déployé, communiqué, enseigné, testé, et tenu à jour au fil des évolutions. La documentation comprend le plan, une déclaration d'importance, les priorités, les responsabilités, les résultats de l'évaluation des risques, l'acceptation des risques et les documents vitaux."
   ]
  },
  "tips": {
   "en": [
    "The BIA is the most tested BCP topic: know what it produces (MTD, RTO, RPO, priorities).",
    "RTO must always be shorter than or equal to the MTD.",
    "Senior management support is the first prerequisite; without it, BCP fails.",
    "Human safety is always the top priority in any continuity or disaster question.",
    "Never rely on a single vendor that the same disaster could affect."
   ],
   "fr": [
    "Le BIA est le sujet PCA le plus testé : sachez ce qu'il produit (MTD, RTO, RPO, priorités).",
    "Le RTO doit toujours être inférieur ou égal à la MTD.",
    "Le soutien de la direction est le premier prérequis ; sans lui, le PCA échoue.",
    "La sécurité des personnes est toujours la priorité dans une question de continuité ou de sinistre.",
    "Ne dépendez jamais d'un fournisseur unique que le même sinistre pourrait toucher."
   ]
  },
  "mem": {
   "en": [
    "BCP steps: scope and planning, BIA, continuity planning, approval and implementation.",
    "MTD (or MAD/MTO) = longest tolerable outage.",
    "RTO = target time to restore; RPO = maximum acceptable data loss (in time).",
    "WRT (work recovery time) = time to verify and resume work after systems are restored; RTO + WRT <= MTD.",
    "BCP = keep the business running; DRP = restore IT and facilities.",
    "BCP team includes business units, legal, IT, security, HR, PR and senior management representation."
   ],
   "fr": [
    "Étapes du PCA : cadrage et planification, BIA, planification de la continuité, approbation et mise en œuvre.",
    "MTD (ou MAD/MTO) = interruption maximale supportable.",
    "RTO = délai cible de reprise ; RPO = perte de données maximale acceptable (en temps).",
    "WRT (temps de remise au travail) = temps pour vérifier et reprendre après restauration ; RTO + WRT <= MTD.",
    "PCA = maintenir l'activité ; PRA = rétablir l'IT et les locaux.",
    "L'équipe PCA réunit métiers, juridique, IT, sécurité, RH, communication et représentation de la direction."
   ]
  }
 },
 {
  "id": 4,
  "sum": {
   "en": [
    "This chapter covers the legal environment. The three main branches of law are criminal law (offenses against society, prosecuted by the government, proof beyond a reasonable doubt, penalties including prison), civil law (disputes between parties, preponderance of the evidence, damages) and administrative law (regulations issued by government agencies). Investigations can be administrative, criminal, civil or regulatory.",
    "Key US laws include the Computer Fraud and Abuse Act, the Electronic Communications Privacy Act, FISMA (federal agencies), HIPAA/HITECH (health information), GLBA (financial institutions), SOX (public company financial reporting), COPPA (children under 13) and FERPA (student records). PCI DSS is an industry standard enforced by contract by the card brands, not a law. In Europe, the GDPR protects personal data of EU residents, applies to organizations worldwide that process it, defines controllers and processors, grants rights (access, rectification, erasure, portability) and requires breach notification to the supervisory authority within 72 hours.",
    "Intellectual property is protected by copyrights, trademarks, patents (about 20 years, require disclosure) and trade secrets (protected as long as they remain secret). Licensing models include contractual, shrink-wrap, click-through and cloud service agreements. Import and export controls (ITAR for defense articles, EAR for dual-use items including encryption) restrict technology transfers. Transborder data flows and data sovereignty affect where data can be stored and processed. Compliance requires knowing which laws apply and demonstrating adherence through audits and documentation."
   ],
   "fr": [
    "Ce chapitre traite du cadre juridique. Les trois grandes branches du droit : le droit pénal (infractions contre la société, poursuivies par l'État, preuve au-delà du doute raisonnable, peines pouvant aller jusqu'à la prison), le droit civil (litiges entre parties, prépondérance des preuves, dommages-intérêts) et le droit administratif (réglementations des agences publiques). Les enquêtes peuvent être administratives, pénales, civiles ou réglementaires.",
    "Lois américaines clés : Computer Fraud and Abuse Act, Electronic Communications Privacy Act, FISMA (agences fédérales), HIPAA/HITECH (santé), GLBA (établissements financiers), SOX (information financière des sociétés cotées), COPPA (enfants de moins de 13 ans) et FERPA (dossiers scolaires). PCI DSS est une norme du secteur imposée par contrat par les marques de cartes, pas une loi. En Europe, le RGPD protège les données personnelles des résidents de l'UE, s'applique aux organisations du monde entier qui les traitent, définit responsables du traitement et sous-traitants, donne des droits (accès, rectification, effacement, portabilité) et impose de notifier une violation à l'autorité de contrôle sous 72 heures.",
    "La propriété intellectuelle est protégée par le droit d'auteur, les marques, les brevets (environ 20 ans, avec publication) et les secrets commerciaux (protégés tant qu'ils restent secrets). Les licences peuvent être contractuelles, sous emballage, par clic ou des contrats de service cloud. Les contrôles à l'import et à l'export (ITAR pour la défense, EAR pour le double usage, dont le chiffrement) encadrent les transferts de technologie. Les flux transfrontaliers et la souveraineté des données déterminent où les données peuvent être stockées et traitées. La conformité exige de savoir quelles lois s'appliquent et de le démontrer par des audits et de la documentation."
   ]
  },
  "tips": {
   "en": [
    "Know each law's purpose and who it applies to; that is usually what questions test.",
    "GDPR breach notification to the supervisory authority: 72 hours.",
    "PCI DSS is contractual, not a law.",
    "The branch of law in a scenario often reveals the answer: prison = criminal, damages between companies = civil, agency rules = administrative.",
    "Trade secrets need active protection (NDAs, access control); disclosure ends protection."
   ],
   "fr": [
    "Retenez l'objectif de chaque loi et à qui elle s'applique : c'est ce que les questions testent.",
    "Notification d'une violation RGPD à l'autorité de contrôle : 72 heures.",
    "PCI DSS est contractuel, pas une loi.",
    "La branche du droit dans un scénario donne souvent la réponse : prison = pénal, dommages entre entreprises = civil, règles d'une agence = administratif.",
    "Un secret commercial exige une protection active (accords de confidentialité, contrôle d'accès) ; la divulgation met fin à la protection."
   ]
  },
  "mem": {
   "en": [
    "Criminal: beyond a reasonable doubt. Civil: preponderance of the evidence.",
    "HIPAA = health; GLBA = financial institutions; SOX = public company financial reporting; FISMA = federal agencies; COPPA = children under 13; FERPA = student records.",
    "GDPR roles: controller, processor, data subject, DPO, supervisory authority.",
    "Patent ~20 years; copyright = life of author + 70 years; trademark renewable every 10 years (US).",
    "ITAR = defense articles; EAR = commercial and dual-use (Commerce Control List).",
    "Data sovereignty = data subject to the laws of the country where it is stored."
   ],
   "fr": [
    "Pénal : au-delà du doute raisonnable. Civil : prépondérance des preuves.",
    "HIPAA = santé ; GLBA = établissements financiers ; SOX = information financière des sociétés cotées ; FISMA = agences fédérales ; COPPA = moins de 13 ans ; FERPA = dossiers scolaires.",
    "Rôles RGPD : responsable du traitement, sous-traitant, personne concernée, DPO, autorité de contrôle.",
    "Brevet ~20 ans ; droit d'auteur = vie de l'auteur + 70 ans ; marque renouvelable tous les 10 ans (États-Unis).",
    "ITAR = articles de défense ; EAR = commercial et double usage (Commerce Control List).",
    "Souveraineté des données = données soumises aux lois du pays où elles sont stockées."
   ]
  }
 },
 {
  "id": 5,
  "sum": {
   "en": [
    "Asset security starts with identifying and classifying assets and data. Classification assigns protection based on value and sensitivity: government levels are Top Secret, Secret, Confidential and Unclassified; a common commercial scheme is Confidential/Proprietary, Private, Sensitive and Public. Assets are classified at the level of the most sensitive data they hold. Data is labeled so people and tools (DLP, CASB) know how to handle it.",
    "Data exists in three states: at rest (protected by disk, file and database encryption), in transit (TLS, IPsec, VPN) and in use (memory protection, enclaves). Data roles are: data owner (accountable, decides classification and access), system owner, data custodian (day-to-day protection such as backups and patching), administrator, user and, under GDPR, controller, processor, data subject and DPO.",
    "The data lifecycle covers collection, storage, use, sharing, archiving and destruction. Collect only what is needed (data minimization), keep data accurate, and retain it no longer than required, since excess retention increases risk. Data remanence must be eliminated with appropriate sanitization: clearing, purging (including cryptographic erase and degaussing for magnetic media) or destruction (shredding, disintegration, incineration). Degaussing does not work on SSDs. In the cloud, crypto-shredding destroys the keys. Privacy techniques include anonymization, pseudonymization, tokenization and masking. Security baselines (NIST SP 800-53, CIS) are adapted with scoping (which controls apply) and tailoring (adjusting them). Hardware end of life and end of support must be planned, since unsupported assets no longer receive patches."
   ],
   "fr": [
    "La sécurité des actifs commence par l'identification et la classification des actifs et des données. La classification attribue une protection selon la valeur et la sensibilité : niveaux publics Top Secret, Secret, Confidential et Unclassified ; schéma commercial courant : Confidentiel/Propriétaire, Privé, Sensible et Public. Un actif est classé au niveau des données les plus sensibles qu'il contient. Les données sont étiquetées pour que les personnes et les outils (DLP, CASB) sachent comment les manipuler.",
    "Les données ont trois états : au repos (chiffrement de disque, de fichier, de base), en transit (TLS, IPsec, VPN) et en cours d'utilisation (protection mémoire, enclaves). Les rôles : propriétaire des données (responsable, décide de la classification et des accès), propriétaire du système, dépositaire (protection au quotidien : sauvegardes, correctifs), administrateur, utilisateur et, au sens du RGPD, responsable du traitement, sous-traitant, personne concernée et DPO.",
    "Le cycle de vie couvre la collecte, le stockage, l'usage, le partage, l'archivage et la destruction. On ne collecte que le nécessaire (minimisation), on garde les données exactes, et on ne les conserve pas plus que requis, car une conservation excessive augmente le risque. La rémanence doit être éliminée par une sanitisation adaptée : effacement (clear), purge (dont l'effacement cryptographique et la démagnétisation des supports magnétiques) ou destruction (broyage, désintégration, incinération). La démagnétisation ne marche pas sur les SSD. Dans le cloud, le crypto-effacement détruit les clés. Techniques de protection de la vie privée : anonymisation, pseudonymisation, tokenisation et masquage. Les baselines de sécurité (NIST SP 800-53, CIS) s'adaptent par le scoping (quels contrôles s'appliquent) et le tailoring (leur ajustement). La fin de vie et la fin de support du matériel doivent être planifiées, car un actif non supporté ne reçoit plus de correctifs."
   ]
  },
  "tips": {
   "en": [
    "\"Day-to-day\" in a question almost always points to the data custodian.",
    "The data owner is accountable and decides classification; the custodian implements.",
    "Know which sanitization method fits which media (no degaussing for SSDs; crypto-shredding in the cloud).",
    "Retaining data longer than necessary increases risk and legal exposure.",
    "Scoping comes before tailoring."
   ],
   "fr": [
    "« Au quotidien » (day-to-day) dans une question désigne presque toujours le dépositaire (custodian).",
    "Le propriétaire des données est responsable et décide de la classification ; le dépositaire applique.",
    "Sachez quelle méthode d'effacement convient à quel support (pas de démagnétisation pour les SSD ; crypto-effacement dans le cloud).",
    "Garder des données trop longtemps augmente le risque et l'exposition juridique.",
    "Le scoping vient avant le tailoring."
   ]
  },
  "mem": {
   "en": [
    "Government: Top Secret > Secret > Confidential > Unclassified.",
    "Commercial: Confidential/Proprietary > Private > Sensitive > Public.",
    "Data states: at rest, in transit, in use.",
    "NIST SP 800-88: clear, purge, destroy.",
    "Pseudonymized data is still personal data; anonymized data is not.",
    "Tokenization replaces data with a token mapped in a vault (reduces PCI scope).",
    "EOL = no longer sold; EOS = no longer supported or patched."
   ],
   "fr": [
    "Public : Top Secret > Secret > Confidential > Unclassified.",
    "Commercial : Confidentiel/Propriétaire > Privé > Sensible > Public.",
    "États des données : au repos, en transit, en cours d'utilisation.",
    "NIST SP 800-88 : clear (effacer), purge (purger), destroy (détruire).",
    "Des données pseudonymisées restent personnelles ; des données anonymisées non.",
    "La tokenisation remplace la donnée par un jeton relié dans un coffre (réduit le périmètre PCI).",
    "EOL = plus vendu ; EOS = plus supporté ni corrigé."
   ]
  }
 },
 {
  "id": 6,
  "sum": {
   "en": [
    "Cryptography protects confidentiality, integrity, authentication and nonrepudiation. Key concepts include plaintext, ciphertext, keys, key space (2 to the power of the key length), Kerckhoffs's principle (only the key must stay secret), confusion and diffusion, one-way functions, nonces and initialization vectors, and zero-knowledge proofs. Split knowledge and dual control protect key material.",
    "Ciphers can be substitution or transposition, stream or block. The one-time pad is theoretically unbreakable when the key is truly random, as long as the message, used once and kept secret. Symmetric cryptography uses one shared key: it is fast and suited to bulk encryption but has key distribution and scalability problems (n(n-1)/2 keys) and provides no nonrepudiation. Algorithms: DES (56-bit, broken), 3DES (deprecated), AES (Rijndael; 128-bit blocks; 128, 192 or 256-bit keys; the current standard), Blowfish, Twofish, IDEA, RC4 (weak stream cipher), ChaCha20.",
    "Block cipher modes include ECB (weak, identical blocks give identical ciphertext), CBC, CFB, OFB, CTR and authenticated modes such as GCM, which provide both confidentiality and integrity. Key management covers creation, distribution, storage (HSMs), rotation, escrow and destruction. Cryptographic lifecycle management retires weak algorithms and key lengths over time, and post-quantum algorithms are being adopted to protect against future quantum computers."
   ],
   "fr": [
    "La cryptographie protège la confidentialité, l'intégrité, l'authentification et la non-répudiation. Concepts clés : texte clair, texte chiffré, clés, espace de clés (2 puissance la longueur de la clé), principe de Kerckhoffs (seule la clé doit rester secrète), confusion et diffusion, fonctions à sens unique, nonces et vecteurs d'initialisation, preuves à divulgation nulle. Le partage de connaissance et le double contrôle protègent les clés.",
    "Les chiffrements peuvent être par substitution ou transposition, par flot ou par bloc. Le masque jetable est théoriquement incassable si la clé est vraiment aléatoire, aussi longue que le message, utilisée une seule fois et gardée secrète. La cryptographie symétrique utilise une clé partagée : rapide et adaptée aux gros volumes, mais elle pose des problèmes de distribution et de passage à l'échelle (n(n-1)/2 clés) et n'apporte pas de non-répudiation. Algorithmes : DES (56 bits, cassé), 3DES (obsolète), AES (Rijndael ; blocs de 128 bits ; clés de 128, 192 ou 256 bits ; la norme actuelle), Blowfish, Twofish, IDEA, RC4 (chiffrement par flot faible), ChaCha20.",
    "Modes de chiffrement par bloc : ECB (faible, des blocs identiques donnent le même chiffré), CBC, CFB, OFB, CTR et les modes authentifiés comme GCM, qui assurent confidentialité et intégrité. La gestion des clés couvre la création, la distribution, le stockage (HSM), la rotation, le séquestre et la destruction. La gestion du cycle de vie cryptographique retire peu à peu les algorithmes et longueurs de clé faibles, et les algorithmes post-quantiques sont adoptés pour se protéger des futurs ordinateurs quantiques."
   ]
  },
  "tips": {
   "en": [
    "AES is the safest answer for modern symmetric encryption; DES and RC4 are wrong answers.",
    "Symmetric cryptography alone cannot provide nonrepudiation (both parties share the key).",
    "Know the key count formula: n(n-1)/2 for symmetric, 2n for asymmetric.",
    "ECB is insecure because patterns remain visible.",
    "Do not memorize every block size; focus on AES and on which algorithms are weak."
   ],
   "fr": [
    "AES est la réponse la plus sûre pour le chiffrement symétrique moderne ; DES et RC4 sont de mauvaises réponses.",
    "La cryptographie symétrique seule n'apporte pas de non-répudiation (les deux parties partagent la clé).",
    "Retenez le nombre de clés : n(n-1)/2 en symétrique, 2n en asymétrique.",
    "ECB n'est pas sûr car les motifs restent visibles.",
    "Inutile d'apprendre toutes les tailles de bloc ; concentrez-vous sur AES et sur les algorithmes faibles."
   ]
  },
  "mem": {
   "en": [
    "AES: 128-bit block; 128/192/256-bit keys.",
    "DES: 64-bit block, 56-bit key (broken); 3DES deprecated.",
    "Symmetric keys needed: n(n-1)/2.",
    "One-time pad requirements: random, as long as the message, used once, secret.",
    "Confusion hides the key-ciphertext relationship; diffusion spreads plaintext changes across the ciphertext.",
    "GCM = authenticated encryption (confidentiality + integrity).",
    "HSM = tamper-resistant hardware for key storage and crypto operations (FIPS 140-3 validated)."
   ],
   "fr": [
    "AES : blocs de 128 bits ; clés de 128/192/256 bits.",
    "DES : blocs de 64 bits, clé de 56 bits (cassé) ; 3DES obsolète.",
    "Clés symétriques nécessaires : n(n-1)/2.",
    "Masque jetable : aléatoire, aussi long que le message, utilisé une fois, secret.",
    "La confusion masque le lien clé-chiffré ; la diffusion répartit les changements du clair sur tout le chiffré.",
    "GCM = chiffrement authentifié (confidentialité + intégrité).",
    "HSM = matériel inviolable pour stocker les clés et faire les opérations cryptographiques (validé FIPS 140-3)."
   ]
  }
 },
 {
  "id": 7,
  "sum": {
   "en": [
    "Asymmetric (public key) cryptography uses a key pair: what one key encrypts, only the other can decrypt. It solves key distribution and enables digital signatures and nonrepudiation, but it is slower than symmetric cryptography, so hybrid systems use it to exchange a symmetric session key. Algorithms include RSA (factoring large primes), Diffie-Hellman (key exchange), ElGamal and elliptic curve cryptography (ECC, much smaller keys for equivalent strength, ideal for mobile and IoT).",
    "Hash functions (SHA-2, SHA-3; MD5 and SHA-1 are weak) produce fixed-length digests and verify integrity. Digital signatures hash the message and encrypt the hash with the sender's private key; anyone verifies with the sender's public key. HMAC combines a hash with a secret key for integrity and authentication without nonrepudiation.",
    "Public key infrastructure (PKI) binds identities to public keys through X.509 certificates issued by certificate authorities (root and intermediate CAs) after registration authorities verify identity. Certificates have validity periods and can be revoked, checked through CRLs or OCSP (with OCSP stapling). Certificate pinning protects against rogue certificates. Applications include TLS for the web, S/MIME and PGP for email, SPF/DKIM/DMARC for email authentication, code signing, IPsec, steganography and digital rights management. Attacks to know include brute force, frequency analysis, known/chosen plaintext, meet-in-the-middle, birthday, replay, side-channel, fault injection and pass-the-hash, along with ransomware considerations such as OFAC sanctions on ransom payments."
   ],
   "fr": [
    "La cryptographie asymétrique (à clé publique) utilise une paire de clés : ce que l'une chiffre, seule l'autre déchiffre. Elle résout la distribution des clés et permet les signatures numériques et la non-répudiation, mais elle est plus lente que le symétrique : les systèmes hybrides l'utilisent pour échanger une clé de session symétrique. Algorithmes : RSA (factorisation de grands nombres premiers), Diffie-Hellman (échange de clés), ElGamal et la cryptographie sur courbes elliptiques (ECC, clés bien plus courtes à force égale, idéale pour le mobile et l'IoT).",
    "Les fonctions de hachage (SHA-2, SHA-3 ; MD5 et SHA-1 sont faibles) produisent des empreintes de taille fixe et vérifient l'intégrité. Une signature numérique hache le message et chiffre l'empreinte avec la clé privée de l'expéditeur ; chacun la vérifie avec sa clé publique. Le HMAC combine un hachage et une clé secrète pour l'intégrité et l'authentification, sans non-répudiation.",
    "L'infrastructure à clé publique (PKI) lie des identités à des clés publiques par des certificats X.509 émis par des autorités de certification (racine et intermédiaires), après vérification d'identité par les autorités d'enregistrement. Les certificats ont une durée de validité et peuvent être révoqués, vérifiés par CRL ou OCSP (avec l'agrafage OCSP). L'épinglage de certificat protège contre les faux certificats. Applications : TLS pour le web, S/MIME et PGP pour l'e-mail, SPF/DKIM/DMARC pour l'authentification de l'e-mail, signature de code, IPsec, stéganographie et gestion des droits numériques. Attaques à connaître : force brute, analyse de fréquence, texte clair connu/choisi, rencontre au milieu, anniversaires, rejeu, canaux auxiliaires, injection de fautes et pass-the-hash, ainsi que les questions liées aux rançongiciels comme les sanctions OFAC sur le paiement des rançons."
   ]
  },
  "tips": {
   "en": [
    "Confidentiality: encrypt with the recipient's public key. Signature: encrypt the hash with the sender's private key.",
    "Hashing is one-way; encryption is two-way. A question about integrity alone points to hashing.",
    "ECC is the answer for resource-constrained devices.",
    "Know CRL vs OCSP for revocation checking.",
    "For attacks, also know the countermeasure (salting against rainbow tables, nonces against replay)."
   ],
   "fr": [
    "Confidentialité : chiffrer avec la clé publique du destinataire. Signature : chiffrer l'empreinte avec la clé privée de l'expéditeur.",
    "Le hachage est à sens unique ; le chiffrement est réversible. Une question sur l'intégrité seule renvoie au hachage.",
    "L'ECC est la réponse pour les appareils aux ressources limitées.",
    "Distinguez CRL et OCSP pour vérifier la révocation.",
    "Pour chaque attaque, retenez aussi la parade (sel contre les tables arc-en-ciel, nonces contre le rejeu)."
   ]
  },
  "mem": {
   "en": [
    "Asymmetric keys needed: 2 per user (2n).",
    "RSA = factoring; Diffie-Hellman = key exchange; ECC = small keys.",
    "SHA-256 output: 256 bits; MD5 (128) and SHA-1 (160) are weak.",
    "Digital signature gives integrity, authenticity, nonrepudiation (not confidentiality).",
    "X.509 certificate contains subject, public key, issuer, validity dates, serial number and CA signature.",
    "SPF = authorized senders; DKIM = message signature; DMARC = policy and reporting.",
    "Birthday attack targets hash collisions."
   ],
   "fr": [
    "Clés asymétriques nécessaires : 2 par utilisateur (2n).",
    "RSA = factorisation ; Diffie-Hellman = échange de clés ; ECC = petites clés.",
    "SHA-256 : empreinte de 256 bits ; MD5 (128) et SHA-1 (160) sont faibles.",
    "La signature numérique apporte intégrité, authenticité et non-répudiation (pas la confidentialité).",
    "Un certificat X.509 contient le sujet, la clé publique, l'émetteur, les dates de validité, le numéro de série et la signature de l'AC.",
    "SPF = expéditeurs autorisés ; DKIM = signature du message ; DMARC = politique et rapports.",
    "L'attaque des anniversaires vise les collisions de hachage."
   ]
  }
 },
 {
  "id": 8,
  "sum": {
   "en": [
    "Secure design principles guide engineering: threat modeling, least privilege, defense in depth, secure defaults, fail securely, separation of duties, keep it simple, zero trust, privacy by design, trust but verify (now largely replaced by zero trust) and shared responsibility. Objects and subjects, open versus closed systems, and techniques for ensuring confidentiality, integrity and availability are foundational.",
    "Security models formalize policies. Bell-LaPadula protects confidentiality (no read up, no write down) and is used mainly by government. Biba protects integrity (no read down, no write up). Clark-Wilson uses well-formed transactions, constrained data items and separation of duties. Brewer-Nash (Chinese Wall) prevents conflicts of interest. Other models: state machine, information flow, noninterference, Take-Grant, access control matrix, Graham-Denning, Harrison-Ruzzo-Ullman and lattice-based models.",
    "Systems are evaluated against criteria: Common Criteria (ISO 15408, with protection profiles, security targets and EAL1 to EAL7) replaced TCSEC and ITSEC. Certification is the technical evaluation; accreditation (authorization) is management's formal acceptance. Security capabilities of systems include memory protection, virtualization, the Trusted Platform Module (TPM), hardware security modules, interfaces, fault tolerance and the trusted computing base (TCB), whose reference monitor mediates all access through the security kernel. Processor protection rings separate kernel mode (ring 0) from user mode (ring 3)."
   ],
   "fr": [
    "Les principes de conception sécurisée guident l'ingénierie : modélisation des menaces, moindre privilège, défense en profondeur, sécurité par défaut, défaillance sécurisée, séparation des tâches, simplicité, zero trust, protection de la vie privée dès la conception, « faire confiance mais vérifier » (largement remplacé par le zero trust) et responsabilité partagée. Les notions d'objet et de sujet, de système ouvert ou fermé, et les techniques assurant confidentialité, intégrité et disponibilité sont fondamentales.",
    "Les modèles de sécurité formalisent les politiques. Bell-LaPadula protège la confidentialité (pas de lecture vers le haut, pas d'écriture vers le bas), surtout dans le public. Biba protège l'intégrité (pas de lecture vers le bas, pas d'écriture vers le haut). Clark-Wilson utilise des transactions bien formées, des éléments de données contraints et la séparation des tâches. Brewer-Nash (Muraille de Chine) empêche les conflits d'intérêts. Autres modèles : machine à états, flux d'information, non-interférence, Take-Grant, matrice de contrôle d'accès, Graham-Denning, Harrison-Ruzzo-Ullman et modèles en treillis.",
    "Les systèmes sont évalués selon des critères : Common Criteria (ISO 15408, avec profils de protection, cibles de sécurité et niveaux EAL1 à EAL7) a remplacé TCSEC et ITSEC. La certification est l'évaluation technique ; l'accréditation (autorisation) est l'acceptation formelle par la direction. Capacités de sécurité des systèmes : protection mémoire, virtualisation, TPM, HSM, interfaces, tolérance aux pannes et base informatique de confiance (TCB), dont le moniteur de référence arbitre tous les accès via le noyau de sécurité. Les anneaux de protection du processeur séparent le mode noyau (anneau 0) du mode utilisateur (anneau 3)."
   ]
  },
  "tips": {
   "en": [
    "Bell-LaPadula = confidentiality (government); Biba = integrity; Clark-Wilson = commercial integrity; Brewer-Nash = conflict of interest.",
    "A question mentioning \"star property\" or \"*\" refers to the write rule of the model.",
    "Certification comes before accreditation.",
    "Common Criteria matters more than TCSEC/ITSEC on today's exam.",
    "Where human safety is involved, fail-safe (open) beats fail-secure."
   ],
   "fr": [
    "Bell-LaPadula = confidentialité (public) ; Biba = intégrité ; Clark-Wilson = intégrité commerciale ; Brewer-Nash = conflit d'intérêts.",
    "Une question qui parle de « propriété étoile » ou « * » vise la règle d'écriture du modèle.",
    "La certification vient avant l'accréditation.",
    "Common Criteria compte davantage que TCSEC/ITSEC à l'examen actuel.",
    "Quand la sécurité des personnes est en jeu, l'ouverture en cas de panne l'emporte sur la défaillance sécurisée."
   ]
  },
  "mem": {
   "en": [
    "BLP: simple security property = no read up; * property = no write down; strong star = read/write only at own level.",
    "Biba: simple integrity = no read down; * integrity = no write up.",
    "Clark-Wilson access triple: subject, program (transformation procedure), object.",
    "Reference monitor: tamperproof, always invoked, verifiable.",
    "Ring 0 = kernel (most privileged); ring 3 = user.",
    "Common Criteria: PP = what the customer needs; ST = what the vendor claims; EAL1-7 = assurance depth."
   ],
   "fr": [
    "BLP : propriété simple = pas de lecture vers le haut ; propriété * = pas d'écriture vers le bas ; étoile forte = lecture/écriture seulement à son niveau.",
    "Biba : intégrité simple = pas de lecture vers le bas ; intégrité * = pas d'écriture vers le haut.",
    "Triplet d'accès Clark-Wilson : sujet, programme (procédure de transformation), objet.",
    "Moniteur de référence : inviolable, toujours appelé, vérifiable.",
    "Anneau 0 = noyau (le plus privilégié) ; anneau 3 = utilisateur.",
    "Common Criteria : PP = besoin du client ; ST = ce que revendique le fournisseur ; EAL1-7 = profondeur de l'assurance."
   ]
  }
 },
 {
  "id": 9,
  "sum": {
   "en": [
    "This chapter covers vulnerabilities across system architectures. Hardware topics include processors (multitasking, multiprocessing, multithreading), memory types (ROM, RAM, cache, registers), storage and firmware. Client-based risks involve mobile code, applets and local caches; server-based risks include data flow control and large-scale parallel processing. Database security addresses aggregation and inference (countered by polyinstantiation and cell suppression).",
    "Distributed and cloud systems require understanding the shared responsibility model across IaaS, PaaS and SaaS and deployment models (public, private, community, hybrid, multicloud). Virtualization brings risks such as VM escape, VM sprawl and hypervisor compromise; Type 1 hypervisors run on bare metal while Type 2 run on a host OS. Containers share the host kernel; serverless shifts more responsibility to the provider. Microservices communicate through APIs that must be secured. Infrastructure as code supports consistent deployment.",
    "Specialized systems include embedded systems, IoT (resource-constrained, often weak defaults; use ECC, segmentation and updates), industrial control systems (SCADA, PLC, DCS) where availability and safety come first, edge and fog computing, and high-performance computing. Mobile device security relies on MDM/UEM, containerization, remote wipe and deployment models (BYOD, COPE, CYOD, COBO). Common weaknesses include maintenance hooks, time-of-check to time-of-use (race) conditions, covert timing and storage channels, emanations (TEMPEST) and firmware attacks."
   ],
   "fr": [
    "Ce chapitre traite des vulnérabilités dans toutes les architectures. Côté matériel : processeurs (multitâche, multitraitement, multithread), types de mémoire (ROM, RAM, cache, registres), stockage et firmware. Les risques côté client concernent le code mobile, les applets et les caches locaux ; côté serveur, le contrôle des flux de données et le traitement parallèle à grande échelle. La sécurité des bases de données traite l'agrégation et l'inférence (contrées par la polyinstanciation et la suppression de cellules).",
    "Les systèmes distribués et le cloud exigent de comprendre le modèle de responsabilité partagée en IaaS, PaaS et SaaS et les modèles de déploiement (public, privé, communautaire, hybride, multicloud). La virtualisation apporte des risques comme l'évasion de VM, la prolifération des VM et la compromission de l'hyperviseur ; le type 1 tourne sur le matériel, le type 2 sur un système hôte. Les conteneurs partagent le noyau de l'hôte ; le serverless transfère davantage de responsabilité au fournisseur. Les microservices communiquent par des API à sécuriser. L'infrastructure as code permet des déploiements homogènes.",
    "Systèmes spécialisés : embarqués, IoT (ressources limitées, réglages par défaut souvent faibles ; ECC, segmentation et mises à jour), systèmes industriels (SCADA, automates, DCS) où priment disponibilité et sécurité des personnes, edge et fog computing, calcul haute performance. La sécurité mobile s'appuie sur le MDM/UEM, la conteneurisation, l'effacement à distance et les modèles de déploiement (BYOD, COPE, CYOD, COBO). Faiblesses courantes : accès de maintenance cachés, situations de concurrence (TOCTOU), canaux cachés temporels et de stockage, émissions (TEMPEST) et attaques sur le firmware."
   ]
  },
  "tips": {
   "en": [
    "Know who is responsible for what in IaaS, PaaS and SaaS; the customer always owns data and access.",
    "VM escape is the most serious virtualization threat; VM sprawl is a management problem.",
    "Edge/fog computing processes sensitive data locally, reducing data in transit.",
    "For IoT and embedded systems, manage them like regular computers: inventory, patch, segment, monitor.",
    "Aggregation combines data; inference deduces it."
   ],
   "fr": [
    "Sachez qui est responsable de quoi en IaaS, PaaS et SaaS ; le client reste toujours maître des données et des accès.",
    "L'évasion de VM est la menace la plus grave de la virtualisation ; la prolifération des VM est un problème de gestion.",
    "L'edge et le fog traitent les données sensibles localement, ce qui réduit les données en transit.",
    "Gérez l'IoT et l'embarqué comme des ordinateurs classiques : inventaire, correctifs, segmentation, surveillance.",
    "L'agrégation combine des données ; l'inférence en déduit."
   ]
  },
  "mem": {
   "en": [
    "IaaS: customer manages OS and up; PaaS: customer manages apps and data; SaaS: customer manages data, users, configuration.",
    "Type 1 hypervisor = bare metal; Type 2 = hosted.",
    "ICS priorities: safety and availability first.",
    "Mobile models: BYOD, COPE, CYOD, COBO.",
    "Covert channel types: timing and storage.",
    "TOCTOU = race condition between check and use."
   ],
   "fr": [
    "IaaS : le client gère l'OS et au-dessus ; PaaS : les applications et les données ; SaaS : les données, les utilisateurs, la configuration.",
    "Hyperviseur type 1 = sur le matériel ; type 2 = hébergé.",
    "Priorités des systèmes industriels : sécurité des personnes et disponibilité d'abord.",
    "Modèles mobiles : BYOD, COPE, CYOD, COBO.",
    "Types de canaux cachés : temporels et de stockage.",
    "TOCTOU = situation de concurrence entre vérification et utilisation."
   ]
  }
 },
 {
  "id": 10,
  "sum": {
   "en": [
    "Physical security protects people, facilities and equipment and always puts human safety first. Site selection considers crime, natural disasters, utilities and access. Facility design applies CPTED (Crime Prevention Through Environmental Design): natural surveillance, natural access control and territorial reinforcement. Controls follow a functional order: deter, deny, detect, delay, determine (assess) and decide (respond).",
    "Perimeter and internal controls include fences (heights matter), gates, bollards, lighting, guards and dogs, mantraps (access control vestibules), turnstiles, badges and smart cards, locks, motion detectors, intrusion alarms and CCTV. Server rooms and data centers need restricted access, no unnecessary windows, and environmental controls: temperature, humidity around 40-60 percent to avoid static and corrosion, positive pressurization, and clean, conditioned power with UPS and generators. Power problems include faults, blackouts, sags, brownouts, spikes, surges, inrush and noise.",
    "Fire protection relies on prevention, detection (heat, flame, smoke, and very early incipient detection in data centers) and suppression. Fire classes in the US: A (common combustibles), B (liquids), C (electrical), D (metals), K (cooking oils). Water-based systems are wet pipe, dry pipe, deluge and pre-action (preferred for data centers); gas systems use halon substitutes like FM-200 that interrupt the chemical reaction. Media storage, evidence storage, wiring closets and work areas need appropriate protection. Physical security should be measured with KPIs, and redundancy and vendor diversity improve resilience."
   ],
   "fr": [
    "La sécurité physique protège les personnes, les locaux et le matériel, et place toujours la sécurité des personnes en premier. Le choix du site tient compte de la criminalité, des risques naturels, des réseaux d'énergie et de l'accès. La conception applique la CPTED (prévention de la criminalité par l'aménagement) : surveillance naturelle, contrôle d'accès naturel et renforcement territorial. Les contrôles suivent un ordre fonctionnel : dissuader, refuser, détecter, retarder, évaluer et réagir.",
    "Contrôles de périmètre et internes : clôtures (la hauteur compte), portails, bornes, éclairage, gardiens et chiens, sas, tourniquets, badges et cartes à puce, serrures, détecteurs de mouvement, alarmes et vidéosurveillance. Les salles serveurs et datacenters exigent un accès restreint, pas de fenêtres inutiles et des contrôles d'environnement : température, humidité autour de 40 à 60 % contre l'électricité statique et la corrosion, surpression, et une alimentation propre et régulée avec onduleurs et groupes électrogènes. Problèmes électriques : coupure brève, panne totale, creux, baisse prolongée, pic, surtension, appel de courant et bruit.",
    "La protection incendie repose sur la prévention, la détection (chaleur, flamme, fumée, et détection très précoce dans les datacenters) et l'extinction. Classes de feu aux États-Unis : A (combustibles ordinaires), B (liquides), C (électrique), D (métaux), K (huiles de cuisson). Systèmes à eau : sous eau, sous air, déluge et pré-action (préféré en datacenter) ; les systèmes à gaz utilisent des substituts du halon comme le FM-200, qui interrompent la réaction chimique. Le stockage des supports, des preuves, les locaux techniques et les espaces de travail doivent être protégés. La sécurité physique se mesure par des KPI, et la redondance et la diversité des fournisseurs renforcent la résilience."
   ]
  },
  "tips": {
   "en": [
    "Human life always comes first, even above data and equipment.",
    "Pre-action sprinklers are the usual best answer for data centers using water.",
    "Early (incipient) smoke detection is the priority in data centers.",
    "Know the functional order of physical controls: deter, deny, detect, delay, determine, decide.",
    "Cameras are mainly detective; guards are the most flexible control because they use judgment."
   ],
   "fr": [
    "La vie humaine passe toujours en premier, avant les données et le matériel.",
    "Le sprinkler à pré-action est en général la meilleure réponse pour un datacenter avec de l'eau.",
    "La détection très précoce de fumée est la priorité en datacenter.",
    "Retenez l'ordre fonctionnel des contrôles physiques : dissuader, refuser, détecter, retarder, évaluer, réagir.",
    "Les caméras sont surtout détectives ; les gardiens sont le contrôle le plus souple car ils ont du jugement."
   ]
  },
  "mem": {
   "en": [
    "Fire classes (US): A combustibles, B liquids, C electrical, D metals, K cooking oils.",
    "Fire triangle: heat, fuel, oxygen (plus chemical reaction = tetrahedron).",
    "Water lowers temperature; CO2 removes oxygen; halon substitutes stop the chemical reaction.",
    "Sag = brief low voltage; brownout = prolonged low; spike = brief high; surge = prolonged high; fault = brief loss; blackout = prolonged loss.",
    "Humidity 40-60%.",
    "Fences: 3-4 ft deters casual; 6-7 ft hard to climb; 8 ft + barbed wire deters determined intruders."
   ],
   "fr": [
    "Classes de feu (États-Unis) : A combustibles, B liquides, C électrique, D métaux, K huiles de cuisson.",
    "Triangle du feu : chaleur, combustible, oxygène (plus la réaction chimique = tétraèdre).",
    "L'eau abaisse la température ; le CO2 retire l'oxygène ; les substituts du halon arrêtent la réaction chimique.",
    "Sag = baisse brève ; brownout = baisse prolongée ; spike = pic bref ; surge = surtension prolongée ; fault = coupure brève ; blackout = panne prolongée.",
    "Humidité 40-60 %.",
    "Clôtures : 0,9-1,2 m dissuade les passants ; 1,8-2,1 m difficile à franchir ; 2,4 m + barbelés contre les intrus déterminés."
   ]
  }
 },
 {
  "id": 11,
  "sum": {
   "en": [
    "Network security starts with the OSI model (Physical, Data Link, Network, Transport, Session, Presentation, Application) and the TCP/IP model (Link, Internet, Transport, Application). Encapsulation adds headers at each layer; the protocol data units are bits, frames, packets, segments/datagrams and data. TCP is connection-oriented with a three-way handshake (SYN, SYN-ACK, ACK); UDP is connectionless and faster. IPv4 uses 32-bit addresses and IPv6 128-bit addresses; ports 0-1023 are well-known.",
    "Secure protocols replace insecure ones: SSH instead of Telnet, SFTP/FTPS instead of FTP, HTTPS instead of HTTP, SNMPv3, LDAPS, DNSSEC and DNS over HTTPS. Converged protocols include iSCSI, Fibre Channel over Ethernet, VoIP and SDN. Network devices include hubs, switches (layer 2, collision domains), routers (layer 3, broadcast domains), bridges, gateways, proxies, load balancers and firewalls (static packet filtering, application-level, circuit-level, stateful inspection, next-generation, WAF).",
    "Segmentation (VLANs, screened subnets/DMZ, micro-segmentation, VXLAN) limits attack spread. Software-defined networking separates the control plane from the data plane; SD-WAN and NFV add flexibility. Wireless security uses WPA2/WPA3 and 802.1X with EAP-TLS, and must address rogue access points and evil twins. Endpoint security includes EDR, host-based firewalls and antimalware. Network access control (NAC) checks devices before admission. Physical media such as fiber resist interference and tapping. Content delivery networks improve availability. Zero trust architecture removes implicit trust based on network location."
   ],
   "fr": [
    "La sécurité réseau commence par le modèle OSI (Physique, Liaison, Réseau, Transport, Session, Présentation, Application) et le modèle TCP/IP (Accès réseau, Internet, Transport, Application). L'encapsulation ajoute des en-têtes à chaque couche ; les unités de données sont les bits, trames, paquets, segments/datagrammes et données. TCP est orienté connexion avec une poignée de main en trois temps (SYN, SYN-ACK, ACK) ; UDP est sans connexion et plus rapide. IPv4 utilise des adresses de 32 bits, IPv6 de 128 bits ; les ports 0 à 1023 sont réservés.",
    "Les protocoles sûrs remplacent les anciens : SSH au lieu de Telnet, SFTP/FTPS au lieu de FTP, HTTPS au lieu de HTTP, SNMPv3, LDAPS, DNSSEC et DNS over HTTPS. Protocoles convergés : iSCSI, Fibre Channel over Ethernet, VoIP et SDN. Équipements : concentrateurs, commutateurs (couche 2, domaines de collision), routeurs (couche 3, domaines de diffusion), ponts, passerelles, proxys, répartiteurs de charge et pare-feu (filtrage statique, applicatif, niveau circuit, à états, nouvelle génération, WAF).",
    "La segmentation (VLAN, sous-réseau filtré/DMZ, micro-segmentation, VXLAN) limite la propagation des attaques. Le SDN sépare plan de contrôle et plan de données ; SD-WAN et NFV apportent de la souplesse. La sécurité sans fil repose sur WPA2/WPA3 et 802.1X avec EAP-TLS, et doit traiter les points d'accès pirates et les jumeaux maléfiques. La sécurité des postes comprend l'EDR, les pare-feu locaux et l'antimalware. Le NAC vérifie les appareils avant de les admettre. Les supports physiques comme la fibre résistent aux interférences et à l'écoute. Les CDN améliorent la disponibilité. L'architecture zero trust supprime la confiance implicite liée à l'emplacement réseau."
   ]
  },
  "tips": {
   "en": [
    "Routers and switches are the most tested devices: routers split broadcast domains, switches split collision domains.",
    "Know which layer each device and protocol works at.",
    "Always prefer the encrypted version of a protocol in answer choices.",
    "Know TCP versus UDP use cases (UDP for real-time voice/video and DNS queries).",
    "Physical segmentation isolates best but costs more; logical segmentation is cheaper and more flexible."
   ],
   "fr": [
    "Routeurs et commutateurs sont les plus testés : le routeur sépare les domaines de diffusion, le commutateur ceux de collision.",
    "Sachez à quelle couche travaille chaque équipement et protocole.",
    "Préférez toujours la version chiffrée d'un protocole parmi les réponses.",
    "Distinguez les usages de TCP et d'UDP (UDP pour la voix/vidéo en temps réel et les requêtes DNS).",
    "La segmentation physique isole mieux mais coûte plus ; la logique est moins chère et plus souple."
   ]
  },
  "mem": {
   "en": [
    "OSI: Please Do Not Throw Sausage Pizza Away (Physical to Application).",
    "PDUs: bits (1), frames (2), packets (3), segments/datagrams (4), data (5-7).",
    "Ports: 22 SSH, 23 Telnet, 25 SMTP, 53 DNS, 80 HTTP, 443 HTTPS, 389 LDAP, 636 LDAPS, 3389 RDP.",
    "Firewall generations: packet filter, application proxy, circuit-level, stateful, NGFW.",
    "802.1X = port-based NAC (supplicant, authenticator, authentication server).",
    "802.1Q = VLAN tagging; 802.3 = Ethernet; 802.11 = Wi-Fi."
   ],
   "fr": [
    "OSI (de bas en haut) : Physique, Liaison, Réseau, Transport, Session, Présentation, Application.",
    "PDU : bits (1), trames (2), paquets (3), segments/datagrammes (4), données (5-7).",
    "Ports : 22 SSH, 23 Telnet, 25 SMTP, 53 DNS, 80 HTTP, 443 HTTPS, 389 LDAP, 636 LDAPS, 3389 RDP.",
    "Générations de pare-feu : filtre de paquets, proxy applicatif, niveau circuit, à états, nouvelle génération.",
    "802.1X = contrôle d'accès réseau par port (demandeur, authentificateur, serveur d'authentification).",
    "802.1Q = étiquetage VLAN ; 802.3 = Ethernet ; 802.11 = Wi-Fi."
   ]
  }
 },
 {
  "id": 12,
  "sum": {
   "en": [
    "Secure communications protect voice, video, data and remote access. Authentication protocols range from PAP (cleartext, avoid) to CHAP and EAP variants (EAP-TLS is the strongest). Remote access uses VPNs: IPsec (AH for integrity and authentication; ESP for encryption; transport mode host-to-host, tunnel mode gateway-to-gateway; IKE for key exchange), TLS VPNs, and older protocols like PPTP (insecure) and L2TP (used with IPsec). Split tunneling sends only corporate traffic through the VPN; full tunneling sends everything. Remote desktop, VDI and jump boxes need MFA and monitoring.",
    "Voice and collaboration security covers VoIP (SIP/RTP, use SRTP and TLS), PBX fraud and toll fraud, video conferencing and instant messaging. Email security uses S/MIME or PGP for end-to-end protection and SPF, DKIM and DMARC for sender authentication. Virtualized networks, SDN and third-party connectivity require clear agreements and controls.",
    "Common network attacks and countermeasures: denial of service and DDoS (SYN floods, Smurf, ping of death, teardrop, amplification; mitigate with filtering, rate limiting, SYN cookies and DDoS services), eavesdropping, on-path (man-in-the-middle) attacks, ARP poisoning (dynamic ARP inspection), DNS poisoning and pharming (DNSSEC), VLAN hopping, MAC flooding (port security), session hijacking, replay attacks (timestamps, nonces), IP spoofing (ingress/egress filtering) and downgrade attacks (disable old TLS versions; allow only TLS 1.2 and 1.3)."
   ],
   "fr": [
    "Les communications sécurisées protègent la voix, la vidéo, les données et l'accès à distance. Les protocoles d'authentification vont de PAP (en clair, à éviter) à CHAP et aux variantes EAP (EAP-TLS est la plus forte). L'accès distant passe par des VPN : IPsec (AH pour l'intégrité et l'authentification ; ESP pour le chiffrement ; mode transport d'hôte à hôte, mode tunnel entre passerelles ; IKE pour l'échange de clés), VPN TLS, et des protocoles anciens comme PPTP (non sûr) et L2TP (utilisé avec IPsec). Le split tunneling n'envoie dans le VPN que le trafic de l'entreprise ; le tunnel complet envoie tout. Bureau à distance, VDI et serveurs de rebond exigent MFA et surveillance.",
    "La sécurité de la voix et de la collaboration couvre la VoIP (SIP/RTP, avec SRTP et TLS), la fraude sur les PBX et la fraude téléphonique, la visioconférence et la messagerie instantanée. La sécurité de l'e-mail utilise S/MIME ou PGP pour la protection de bout en bout et SPF, DKIM et DMARC pour authentifier l'expéditeur. Les réseaux virtualisés, le SDN et les connexions de tiers exigent des accords et des contrôles clairs.",
    "Attaques réseau et parades : déni de service et DDoS (inondation SYN, Smurf, ping de la mort, teardrop, amplification ; filtrage, limitation de débit, SYN cookies, services anti-DDoS), écoute, attaque de l'intercepteur, empoisonnement ARP (inspection ARP dynamique), empoisonnement DNS et pharming (DNSSEC), saut de VLAN, inondation MAC (sécurité des ports), détournement de session, rejeu (horodatages, nonces), usurpation d'IP (filtrage en entrée et en sortie) et rétrogradation (désactiver les anciennes versions de TLS ; n'autoriser que TLS 1.2 et 1.3)."
   ]
  },
  "tips": {
   "en": [
    "IPsec is a high-probability topic: AH = integrity/authentication only; ESP = encryption too.",
    "Tunnel mode protects the whole packet (site-to-site); transport mode only the payload (host-to-host).",
    "For each attack, be ready to pick the countermeasure.",
    "TLS 1.0/1.1 and SSL are deprecated; downgrade attacks exploit them if left enabled.",
    "EAP-TLS with certificates on both sides is the strongest wireless and VPN authentication."
   ],
   "fr": [
    "IPsec est un sujet très probable : AH = intégrité/authentification seulement ; ESP = chiffrement en plus.",
    "Le mode tunnel protège tout le paquet (site à site) ; le mode transport seulement la charge utile (hôte à hôte).",
    "Pour chaque attaque, sachez choisir la parade.",
    "TLS 1.0/1.1 et SSL sont obsolètes ; les attaques par rétrogradation les exploitent s'ils restent actifs.",
    "EAP-TLS avec certificats des deux côtés est l'authentification sans fil et VPN la plus forte."
   ]
  },
  "mem": {
   "en": [
    "AH: integrity + authentication, no encryption. ESP: encryption + integrity + authentication.",
    "IKE negotiates security associations (SAs).",
    "PAP = cleartext; CHAP = challenge-response; EAP = extensible framework.",
    "Smurf = ICMP to broadcast with spoofed source; Fraggle = UDP version.",
    "SYN flood = half-open connections; countered by SYN cookies.",
    "SRTP secures VoIP media; SIP over TLS secures signaling."
   ],
   "fr": [
    "AH : intégrité + authentification, sans chiffrement. ESP : chiffrement + intégrité + authentification.",
    "IKE négocie les associations de sécurité (SA).",
    "PAP = en clair ; CHAP = défi-réponse ; EAP = cadre extensible.",
    "Smurf = ICMP vers une adresse de diffusion avec source usurpée ; Fraggle = version UDP.",
    "Inondation SYN = connexions à moitié ouvertes ; parade : SYN cookies.",
    "SRTP protège les flux VoIP ; SIP sur TLS protège la signalisation."
   ]
  }
 },
 {
  "id": 13,
  "sum": {
   "en": [
    "Identity and access management controls access to physical and logical assets (information, systems, devices, facilities, applications and services). The process is identification, authentication, authorization and accountability. Authentication factors are something you know (passwords, PINs), something you have (smart cards, tokens, phones) and something you are (biometrics), with context such as location as an additional signal. Multifactor authentication combines different factor types. Passwords should follow NIST SP 800-63B guidance: length, screening against breached lists and no arbitrary forced changes. Phishing-resistant MFA (FIDO2/WebAuthn, passkeys) is preferred over SMS.",
    "Biometrics are measured by false rejection rate (Type I), false acceptance rate (Type II) and the crossover error rate (lower CER is better). Device authentication, service accounts and mutual authentication also matter.",
    "Single sign-on improves usability but concentrates risk. Federated identity management extends SSO across organizations using SAML (XML assertions, IdP and SP), OAuth 2.0 (authorization delegation with access tokens), OpenID Connect (authentication on top of OAuth, ID tokens in JWT) and Kerberos inside enterprises (KDC, TGT, service tickets, time synchronization). Identity can be on-premises, cloud-based (IDaaS) or hybrid. Credential management systems and password vaults protect secrets. The identity lifecycle runs from provisioning with identity proofing, through periodic access reviews and role changes, to deprovisioning."
   ],
   "fr": [
    "La gestion des identités et des accès contrôle l'accès aux actifs physiques et logiques (informations, systèmes, appareils, locaux, applications et services). Le processus : identification, authentification, autorisation et imputabilité. Facteurs d'authentification : ce que l'on sait (mots de passe, PIN), ce que l'on possède (cartes à puce, jetons, téléphones) et ce que l'on est (biométrie), le contexte comme la localisation servant de signal complémentaire. La MFA combine des types de facteurs différents. Les mots de passe suivent le NIST SP 800-63B : longueur, vérification contre les listes de mots de passe divulgués et pas de changement forcé arbitraire. La MFA résistante au phishing (FIDO2/WebAuthn, passkeys) est préférée au SMS.",
    "La biométrie se mesure par le taux de faux rejets (type I), le taux de fausses acceptations (type II) et le taux d'erreur croisé (un CER bas est meilleur). L'authentification des appareils, les comptes de service et l'authentification mutuelle comptent aussi.",
    "Le SSO améliore l'ergonomie mais concentre le risque. La fédération d'identité étend le SSO entre organisations via SAML (assertions XML, IdP et SP), OAuth 2.0 (délégation d'autorisation par jetons d'accès), OpenID Connect (authentification au-dessus d'OAuth, ID tokens en JWT) et Kerberos en entreprise (KDC, TGT, tickets de service, synchronisation des horloges). L'identité peut être sur site, dans le cloud (IDaaS) ou hybride. Les systèmes de gestion des identifiants et les coffres à mots de passe protègent les secrets. Le cycle de vie de l'identité va du provisionnement avec vérification d'identité aux revues d'accès et changements de rôle, jusqu'au déprovisionnement."
   ]
  },
  "tips": {
   "en": [
    "Two items of the same factor type (password + PIN) are still single-factor.",
    "Type II errors (false acceptance) are the most dangerous for security.",
    "SAML = enterprise web SSO; OAuth = authorization; OIDC = authentication on OAuth.",
    "Kerberos depends on time synchronization; the KDC is a single point of failure.",
    "Deprovision promptly; access reviews catch privilege creep."
   ],
   "fr": [
    "Deux éléments du même type (mot de passe + PIN) restent un seul facteur.",
    "Les erreurs de type II (fausse acceptation) sont les plus dangereuses pour la sécurité.",
    "SAML = SSO web d'entreprise ; OAuth = autorisation ; OIDC = authentification au-dessus d'OAuth.",
    "Kerberos dépend de la synchronisation des horloges ; le KDC est un point de défaillance unique.",
    "Déprovisionnez rapidement ; les revues d'accès détectent l'accumulation de privilèges."
   ]
  },
  "mem": {
   "en": [
    "Factors: know, have, are (+ somewhere you are, something you do).",
    "Type I = false rejection; Type II = false acceptance; CER = equal point.",
    "Kerberos: AS issues TGT; TGS issues service tickets; default skew ~5 minutes.",
    "SAML roles: principal (user), identity provider, service provider.",
    "OAuth 2.0 issues access tokens; OIDC adds ID tokens (JWT).",
    "Identity lifecycle: provision, review, revoke/deprovision."
   ],
   "fr": [
    "Facteurs : savoir, posséder, être (+ lieu, comportement).",
    "Type I = faux rejet ; type II = fausse acceptation ; CER = point d'égalité.",
    "Kerberos : l'AS délivre le TGT ; le TGS délivre les tickets de service ; décalage toléré ~5 minutes.",
    "Rôles SAML : principal (utilisateur), fournisseur d'identité, fournisseur de services.",
    "OAuth 2.0 délivre des jetons d'accès ; OIDC ajoute des ID tokens (JWT).",
    "Cycle de vie de l'identité : provisionner, revoir, révoquer/déprovisionner."
   ]
  }
 },
 {
  "id": 14,
  "sum": {
   "en": [
    "Authorization mechanisms decide what an authenticated subject can do. Access control models: discretionary (DAC, the owner decides, using ACLs), mandatory (MAC, labels and clearances set by the system, common in the military), role-based (RBAC, permissions tied to job roles), rule-based (global rules such as firewall ACLs), attribute-based (ABAC, policies combining subject, object, action and environment attributes) and risk-based (adaptive, using context such as location or device health). Implicit deny, least privilege, need to know and separation of duties underpin them. Constrained interfaces, content-dependent and context-dependent controls refine access.",
    "Access is controlled for physical and logical resources, including cloud resources, with policies enforced at policy decision and enforcement points (a zero trust concept). Privileged access management (PAM) vaults admin credentials, provides just-in-time elevation and records sessions. Accountability depends on unique accounts, logging and monitoring.",
    "Common access control attacks include password attacks (brute force, dictionary, credential stuffing, password spraying, rainbow tables countered by salting), privilege escalation, pass-the-hash, Kerberos attacks (golden ticket, silver ticket, Kerberoasting, pass-the-ticket), spoofing, and social engineering. Defenses include strong authentication and MFA, account lockout and throttling, monitoring of privileged activity, protecting password databases with salted, slow hashing, and user awareness."
   ],
   "fr": [
    "Les mécanismes d'autorisation décident de ce qu'un sujet authentifié peut faire. Modèles de contrôle d'accès : discrétionnaire (DAC, le propriétaire décide, via des ACL), obligatoire (MAC, étiquettes et habilitations fixées par le système, courant chez les militaires), à base de rôles (RBAC, droits liés aux fonctions), à base de règles (règles globales comme les ACL d'un pare-feu), à base d'attributs (ABAC, règles combinant attributs du sujet, de l'objet, de l'action et de l'environnement) et à base de risque (adaptatif, selon le contexte comme le lieu ou l'état de l'appareil). Ils reposent sur le refus implicite, le moindre privilège, le besoin d'en connaître et la séparation des tâches. Interfaces restreintes et contrôles dépendant du contenu ou du contexte affinent l'accès.",
    "L'accès est contrôlé pour les ressources physiques et logiques, y compris dans le cloud, avec des règles appliquées par des points de décision et d'application (notion du zero trust). La gestion des accès privilégiés (PAM) met les identifiants admin dans un coffre, fournit l'élévation juste-à-temps et enregistre les sessions. L'imputabilité dépend de comptes uniques, de la journalisation et de la surveillance.",
    "Attaques courantes : attaques de mots de passe (force brute, dictionnaire, credential stuffing, pulvérisation, tables arc-en-ciel contrées par le sel), élévation de privilèges, pass-the-hash, attaques Kerberos (golden ticket, silver ticket, kerberoasting, pass-the-ticket), usurpation et ingénierie sociale. Défenses : authentification forte et MFA, verrouillage et temporisation des comptes, surveillance de l'activité privilégiée, hachage salé et lent des bases de mots de passe, et sensibilisation des utilisateurs."
   ]
  },
  "tips": {
   "en": [
    "Role-based (job functions) vs rule-based (global rules): do not confuse them.",
    "ABAC is the most granular model and the best fit for zero trust scenarios.",
    "MAC users cannot change permissions; DAC owners can.",
    "Salting defeats rainbow tables; MFA defeats most password attacks.",
    "Shared accounts break accountability."
   ],
   "fr": [
    "À base de rôles (fonctions) ou à base de règles (règles globales) : ne les confondez pas.",
    "L'ABAC est le modèle le plus fin et le plus adapté aux scénarios zero trust.",
    "En MAC, les utilisateurs ne peuvent pas changer les droits ; en DAC, les propriétaires le peuvent.",
    "Le sel contre les tables arc-en-ciel ; la MFA contre la plupart des attaques de mots de passe.",
    "Les comptes partagés empêchent l'imputabilité."
   ]
  },
  "mem": {
   "en": [
    "DAC = owner; MAC = labels; RBAC = roles; rule-based = global rules; ABAC = attributes; risk-based = context.",
    "MAC types: hierarchical, compartmentalized, hybrid.",
    "Golden ticket = forged TGT (KRBTGT hash); silver ticket = forged service ticket.",
    "Kerberoasting = crack service account tickets offline.",
    "Password spraying = few passwords, many accounts; credential stuffing = reused leaked credentials.",
    "PAM: vault, rotation, just-in-time access, session recording."
   ],
   "fr": [
    "DAC = propriétaire ; MAC = étiquettes ; RBAC = rôles ; à base de règles = règles globales ; ABAC = attributs ; à base de risque = contexte.",
    "Types de MAC : hiérarchique, compartimenté, hybride.",
    "Golden ticket = TGT forgé (empreinte KRBTGT) ; silver ticket = ticket de service forgé.",
    "Kerberoasting = casser hors ligne les tickets des comptes de service.",
    "Pulvérisation = peu de mots de passe, beaucoup de comptes ; credential stuffing = identifiants volés réutilisés.",
    "PAM : coffre, rotation, accès juste-à-temps, enregistrement des sessions."
   ]
  }
 },
 {
  "id": 15,
  "sum": {
   "en": [
    "Security assessment and testing verify that controls work. A strategy combines internal, external and third-party assessments, aligned with business objectives. Security tests verify individual controls; assessments review the overall program; audits provide formal, independent evidence for stakeholders, regulators or customers. Service organization reports (SOC 1 for financial reporting controls, SOC 2 for security, availability, processing integrity, confidentiality and privacy, SOC 3 as a public summary; Type 1 at a point in time, Type 2 over a period) are issued under SSAE 18 or ISAE 3402.",
    "Technical testing includes vulnerability scanning (network discovery, authenticated and unauthenticated scans, web scanning, database scanning) using SCAP components such as CVE, CVSS, CPE, CCE, XCCDF and OVAL, and penetration testing (planning with written authorization and rules of engagement, reconnaissance, scanning, exploitation, reporting; black box/unknown, white box/known, gray box/partially known environments). Software testing covers code review (Fagan inspection, peer review), static analysis (SAST), dynamic analysis (DAST), fuzzing, interface testing, misuse case testing, test coverage analysis, regression testing and user acceptance testing. Breach and attack simulation and red, blue and purple teaming validate detection.",
    "Security process data is collected for management review: account management reviews, backup verification, training and awareness metrics, disaster recovery and business continuity tests, key performance and risk indicators. Log reviews, synthetic transactions and real user monitoring support continuous monitoring. Findings are analyzed, reported to the right audience, remediated, exceptions approved and documented, and ethical disclosure considered for vulnerabilities found in vendor products."
   ],
   "fr": [
    "L'évaluation et les tests de sécurité vérifient que les contrôles fonctionnent. Une stratégie combine évaluations internes, externes et par des tiers, alignées sur les objectifs métier. Les tests vérifient des contrôles précis ; les évaluations examinent l'ensemble du programme ; les audits apportent une preuve formelle et indépendante aux parties prenantes, régulateurs ou clients. Les rapports SOC (SOC 1 pour les contrôles de l'information financière, SOC 2 pour sécurité, disponibilité, intégrité du traitement, confidentialité et vie privée, SOC 3 comme résumé public ; Type 1 à un instant, Type 2 sur une période) sont émis selon SSAE 18 ou ISAE 3402.",
    "Les tests techniques comprennent le scan de vulnérabilités (découverte réseau, scans authentifiés et non authentifiés, scan web, scan de bases) avec les composants SCAP comme CVE, CVSS, CPE, CCE, XCCDF et OVAL, et le test d'intrusion (planification avec autorisation écrite et règles d'engagement, reconnaissance, scan, exploitation, rapport ; boîte noire/inconnu, blanche/connu, grise/partiellement connu). Les tests logiciels couvrent la revue de code (inspection de Fagan, revue par les pairs), l'analyse statique (SAST), l'analyse dynamique (DAST), le fuzzing, les tests d'interface, les cas d'abus, l'analyse de couverture, la non-régression et l'acceptation utilisateur. La simulation de brèches et d'attaques et les équipes rouge, bleue et violette valident la détection.",
    "Les données de processus sont collectées pour la revue de direction : revues des comptes, vérification des sauvegardes, indicateurs de formation et de sensibilisation, tests de reprise et de continuité, indicateurs de performance et de risque. Revue des journaux, transactions synthétiques et surveillance des utilisateurs réels soutiennent la surveillance continue. Les constats sont analysés, présentés au bon public, corrigés, les exceptions approuvées et documentées, et la divulgation responsable est envisagée pour les vulnérabilités trouvées dans les produits des fournisseurs."
   ]
  },
  "tips": {
   "en": [
    "Written authorization is the first requirement for any penetration test.",
    "Vulnerability assessment finds weaknesses; penetration testing exploits them.",
    "SOC 2 Type 2 is the report customers usually want from a cloud or service provider.",
    "False negatives are more dangerous than false positives.",
    "Recognize KPIs (performance) versus KRIs (risk exposure) in metrics questions."
   ],
   "fr": [
    "L'autorisation écrite est le premier prérequis de tout test d'intrusion.",
    "L'évaluation de vulnérabilités trouve les faiblesses ; le test d'intrusion les exploite.",
    "Le SOC 2 Type 2 est le rapport que les clients attendent d'un fournisseur cloud ou de services.",
    "Les faux négatifs sont plus dangereux que les faux positifs.",
    "Distinguez les KPI (performance) des KRI (exposition au risque) dans les questions d'indicateurs."
   ]
  },
  "mem": {
   "en": [
    "SOC 1 = financial reporting; SOC 2 = trust services criteria (restricted); SOC 3 = public.",
    "Type 1 = design at a point in time; Type 2 = operating effectiveness over a period.",
    "CVSS = severity score 0-10; CVE = vulnerability ID; CWE = weakness type.",
    "Black box = unknown environment; white box = known; gray box = partial.",
    "SAST = static, no execution; DAST = running app; IAST = instrumented runtime; SCA = third-party components.",
    "Fagan inspection: planning, overview, preparation, inspection, rework, follow-up."
   ],
   "fr": [
    "SOC 1 = information financière ; SOC 2 = critères de confiance (diffusion restreinte) ; SOC 3 = public.",
    "Type 1 = conception à un instant ; Type 2 = efficacité sur une période.",
    "CVSS = score de gravité 0-10 ; CVE = identifiant de vulnérabilité ; CWE = type de faiblesse.",
    "Boîte noire = environnement inconnu ; blanche = connu ; grise = partiel.",
    "SAST = statique, sans exécution ; DAST = application en marche ; IAST = instrumentation à l'exécution ; SCA = composants tiers.",
    "Inspection de Fagan : planification, présentation, préparation, inspection, reprise, suivi."
   ]
  }
 },
 {
  "id": 16,
  "sum": {
   "en": [
    "Security operations apply foundational principles every day: need to know, least privilege, separation of duties and responsibilities, two-person control, split knowledge, job rotation and mandatory vacations. Privileged account management limits and monitors administrator activity. Service level agreements, operational level agreements and memoranda of understanding define expectations with providers. Personnel safety covers duress systems, travel security, emergency management and security training.",
    "Resource protection manages media (marking, handling, storage, transport, sanitization) and assets throughout their lifecycle, including asset inventory and hardware and software management. Cloud resources require understanding shared responsibility and protecting management interfaces. Provisioning should use secure baselines, templates and automation.",
    "Configuration management establishes and maintains baselines and detects drift; images and infrastructure as code help keep systems consistent. Change management ensures changes are requested, reviewed, approved (for example by a change advisory board), tested, implemented with a rollback plan and documented, and emergency changes are reviewed afterwards. Patch management evaluates, tests, approves, deploys and verifies patches. Vulnerability management continuously scans, prioritizes by risk and remediates. Together these processes keep systems in a known, secure and supported state."
   ],
   "fr": [
    "Les opérations de sécurité appliquent chaque jour les principes de base : besoin d'en connaître, moindre privilège, séparation des tâches et responsabilités, contrôle à deux personnes, partage de connaissance, rotation des postes et congés obligatoires. La gestion des comptes privilégiés limite et surveille l'activité des administrateurs. SLA, OLA et protocoles d'accord fixent les attentes vis-à-vis des prestataires. La sécurité du personnel couvre les systèmes de contrainte, la sécurité en voyage, la gestion des urgences et la formation.",
    "La protection des ressources gère les supports (marquage, manipulation, stockage, transport, effacement) et les actifs tout au long de leur cycle de vie, avec l'inventaire et la gestion du matériel et des logiciels. Les ressources cloud exigent de comprendre la responsabilité partagée et de protéger les interfaces d'administration. Le provisionnement s'appuie sur des baselines sûres, des modèles et l'automatisation.",
    "La gestion de configuration établit et maintient des références et détecte les dérives ; les images et l'infrastructure as code gardent les systèmes homogènes. La gestion des changements garantit que les changements sont demandés, analysés, approuvés (par exemple par un comité, le CAB), testés, mis en œuvre avec un plan de retour arrière et documentés, et que les changements d'urgence sont revus après coup. La gestion des correctifs évalue, teste, approuve, déploie et vérifie. La gestion des vulnérabilités scanne en continu, priorise selon le risque et corrige. Ensemble, ces processus gardent les systèmes dans un état connu, sûr et supporté."
   ]
  },
  "tips": {
   "en": [
    "Need to know restricts information even when clearance is sufficient; least privilege restricts rights.",
    "Mandatory vacations and job rotation are detective controls against fraud.",
    "Never deploy patches straight to production without testing, except through an approved emergency process.",
    "Change management prevents outages caused by unauthorized changes; configuration management prevents drift.",
    "An SLA defines measurable service levels and penalties."
   ],
   "fr": [
    "Le besoin d'en connaître restreint l'information même si l'habilitation suffit ; le moindre privilège restreint les droits.",
    "Congés obligatoires et rotation des postes sont des contrôles de détection contre la fraude.",
    "Ne déployez jamais un correctif directement en production sans test, sauf par un processus d'urgence approuvé.",
    "La gestion des changements évite les pannes dues aux changements non autorisés ; la gestion de configuration évite les dérives.",
    "Un SLA définit des niveaux de service mesurables et des pénalités."
   ]
  },
  "mem": {
   "en": [
    "Two-person control = two people act together; split knowledge = no one has the whole secret.",
    "Change management: request, review, approve, test, schedule, implement, document (with rollback).",
    "Patch management: evaluate, test, approve, deploy, verify.",
    "SLA (with provider), OLA (internal teams), MOU (informal agreement), ISA (interconnection security agreement).",
    "Media handling: mark, handle, store, transport, sanitize, destroy."
   ],
   "fr": [
    "Contrôle à deux personnes = deux personnes agissent ensemble ; partage de connaissance = personne n'a tout le secret.",
    "Gestion des changements : demande, analyse, approbation, test, planification, mise en œuvre, documentation (avec retour arrière).",
    "Gestion des correctifs : évaluer, tester, approuver, déployer, vérifier.",
    "SLA (avec un prestataire), OLA (entre équipes internes), MOU (accord informel), ISA (accord de sécurité d'interconnexion).",
    "Supports : marquer, manipuler, stocker, transporter, effacer, détruire."
   ]
  }
 },
 {
  "id": 17,
  "sum": {
   "en": [
    "Incident management follows a lifecycle. A common CISSP sequence is detection, response, mitigation (containment), reporting, recovery, remediation and lessons learned; NIST SP 800-61 groups it as preparation; detection and analysis; containment, eradication and recovery; and post-incident activity. An event is any observable occurrence; an incident is an event with adverse effect on confidentiality, integrity or availability. Evidence must be preserved throughout.",
    "Preventive and detective measures include firewalls, IDS and IPS (signature-based and anomaly/behavior-based), allowlisting and denylisting, sandboxing, honeypots and honeynets (enticement is legal, entrapment is not), antimalware, EDR and XDR, third-party security services, and warning banners. Logging and monitoring rely on synchronized time (NTP), protected and centralized logs, SIEM for correlation and alerting, SOAR for automated playbooks, UEBA for behavior anomalies, and threat intelligence with threat hunting (often mapped to MITRE ATT&CK). Egress monitoring and DLP detect exfiltration.",
    "Common attacks to recognize include botnets, denial of service (SYN flood, Smurf, ping of death, amplification), zero-day exploits, malicious code, man-in-the-middle, sabotage and espionage. Automation and orchestration speed up response, while machine learning and AI help detect anomalies. Clear roles, communication plans (internal, legal, regulators, customers, law enforcement) and regular exercises keep the incident response team ready."
   ],
   "fr": [
    "La gestion des incidents suit un cycle. La séquence CISSP courante : détection, réponse, atténuation (confinement), signalement, rétablissement, remédiation et retour d'expérience ; le NIST SP 800-61 la regroupe en préparation ; détection et analyse ; confinement, éradication et rétablissement ; activités post-incident. Un événement est tout fait observable ; un incident est un événement qui nuit à la confidentialité, l'intégrité ou la disponibilité. Les preuves doivent être préservées tout du long.",
    "Mesures préventives et détectives : pare-feu, IDS et IPS (par signatures et par anomalies/comportement), listes d'autorisation et de blocage, bacs à sable, pots de miel et honeynets (l'incitation est légale, la provocation non), antimalware, EDR et XDR, services de sécurité tiers et bannières d'avertissement. La journalisation et la surveillance reposent sur des horloges synchronisées (NTP), des journaux protégés et centralisés, un SIEM pour corréler et alerter, un SOAR pour les playbooks automatisés, l'UEBA pour les anomalies de comportement, et le renseignement sur les menaces avec la chasse aux menaces (souvent alignée sur MITRE ATT&CK). La surveillance en sortie et le DLP détectent l'exfiltration.",
    "Attaques à reconnaître : botnets, déni de service (inondation SYN, Smurf, ping de la mort, amplification), exploits zero-day, code malveillant, attaque de l'intercepteur, sabotage et espionnage. L'automatisation et l'orchestration accélèrent la réponse, l'apprentissage automatique et l'IA aident à détecter les anomalies. Des rôles clairs, des plans de communication (interne, juridique, régulateurs, clients, forces de l'ordre) et des exercices réguliers gardent l'équipe de réponse prête."
   ]
  },
  "tips": {
   "en": [
    "Know the order of the incident response steps and what happens in each.",
    "Containment comes before eradication and recovery; preserve evidence while containing.",
    "IDS = detect and alert (passive); IPS = inline, can block (active).",
    "Anomaly-based detection can catch zero-days but produces more false positives.",
    "Enticement (honeypot) is acceptable; entrapment is not."
   ],
   "fr": [
    "Retenez l'ordre des étapes de réponse aux incidents et ce qui se passe à chacune.",
    "Le confinement vient avant l'éradication et le rétablissement ; préservez les preuves pendant le confinement.",
    "IDS = détecte et alerte (passif) ; IPS = en coupure, peut bloquer (actif).",
    "La détection par anomalies peut repérer les zero-days mais produit plus de faux positifs.",
    "L'incitation (pot de miel) est acceptable ; la provocation ne l'est pas."
   ]
  },
  "mem": {
   "en": [
    "CISSP IR steps: detection, response, mitigation, reporting, recovery, remediation, lessons learned.",
    "NIST 800-61: preparation; detection & analysis; containment, eradication & recovery; post-incident activity.",
    "SIEM = collect and correlate; SOAR = automate response; UEBA = behavior analytics.",
    "IOC examples: malicious IPs/domains, file hashes, unusual processes or traffic.",
    "MITRE ATT&CK = tactics (why) and techniques (how) of adversaries."
   ],
   "fr": [
    "Étapes CISSP : détection, réponse, atténuation, signalement, rétablissement, remédiation, retour d'expérience.",
    "NIST 800-61 : préparation ; détection et analyse ; confinement, éradication et rétablissement ; post-incident.",
    "SIEM = collecter et corréler ; SOAR = automatiser la réponse ; UEBA = analyse comportementale.",
    "Exemples d'IOC : IP/domaines malveillants, empreintes de fichiers, processus ou trafic inhabituels.",
    "MITRE ATT&CK = tactiques (pourquoi) et techniques (comment) des attaquants."
   ]
  }
 },
 {
  "id": 18,
  "sum": {
   "en": [
    "Disaster recovery planning restores IT systems and facilities after a disaster and supports the business continuity plan. Disasters can be natural (earthquakes, floods, storms, fires, pandemics) or human-made (terrorism, fires, power outages, network and utility failures, hardware and software failures, strikes, theft, vandalism). System resilience, high availability and fault tolerance reduce the need for recovery: redundant components, RAID, clustering, load balancing, multiple data centers and cloud regions, and redundant power (UPS, generators).",
    "Recovery strategies are prioritized based on the BIA. Site options are cold sites (space and utilities only, cheapest, slowest), warm sites (equipment, data must be restored), hot sites (fully equipped with current data, fastest, most expensive), mobile sites, cloud-based recovery and reciprocal (mutual assistance) agreements, which are cheap but hard to enforce. Database recovery uses electronic vaulting, remote journaling and remote mirroring. Backup strategies include full, incremental (since last backup, clears archive bit) and differential (since last full, does not clear archive bit), the 3-2-1 rule, off-site and immutable copies, and regular restore tests.",
    "The DRP documents emergency response, personnel notification, assessments, backups and off-site storage, software escrow, utilities, logistics and supplies, and recovery versus restoration (return to the primary site, least critical functions first). Training, awareness and documentation are essential. Plans are tested in increasing order of disruption: read-through (checklist), structured walk-through (tabletop), simulation, parallel and full interruption tests, and maintained over time."
   ],
   "fr": [
    "Le plan de reprise après sinistre (PRA) rétablit l'IT et les locaux après un sinistre et soutient le plan de continuité. Les sinistres peuvent être naturels (séismes, inondations, tempêtes, incendies, pandémies) ou humains (terrorisme, incendies, pannes d'électricité, de réseau et d'utilités, pannes matérielles et logicielles, grèves, vols, vandalisme). La résilience, la haute disponibilité et la tolérance aux pannes réduisent le besoin de reprise : composants redondants, RAID, clustering, répartition de charge, plusieurs datacenters et régions cloud, alimentation redondante (onduleurs, groupes électrogènes).",
    "Les stratégies de reprise sont priorisées selon le BIA. Types de sites : froid (locaux et utilités seulement, le moins cher, le plus lent), tiède (équipement, données à restaurer), chaud (entièrement équipé avec des données à jour, le plus rapide, le plus cher), mobile, reprise dans le cloud et accords réciproques (assistance mutuelle), bon marché mais difficiles à faire respecter. La reprise des bases utilise le coffre électronique (electronic vaulting), la journalisation distante et le miroir distant. Sauvegardes : complète, incrémentale (depuis la dernière sauvegarde, remet le bit d'archive à zéro) et différentielle (depuis la dernière complète, ne remet pas le bit à zéro), règle 3-2-1, copies hors site et immuables, et tests de restauration réguliers.",
    "Le PRA documente la réponse d'urgence, l'alerte du personnel, les évaluations, les sauvegardes et le stockage hors site, le séquestre logiciel, les utilités, la logistique et les fournitures, ainsi que la reprise puis la restauration (retour au site principal, en commençant par les fonctions les moins critiques). Formation, sensibilisation et documentation sont essentielles. Les tests vont du moins au plus perturbant : relecture (checklist), déroulé structuré (exercice sur table), simulation, test parallèle et interruption complète, et le plan est tenu à jour."
   ]
  },
  "tips": {
   "en": [
    "Match the site to the RTO: hot for minutes/hours, warm for days, cold for weeks.",
    "Differential restore = last full + last differential; incremental restore = last full + every incremental.",
    "When returning to the primary site, move the least critical functions back first.",
    "A backup that was never restored is not proven.",
    "RAID is not a backup."
   ],
   "fr": [
    "Associez le site au RTO : chaud pour des minutes/heures, tiède pour des jours, froid pour des semaines.",
    "Restauration différentielle = dernière complète + dernière différentielle ; incrémentale = dernière complète + toutes les incrémentales.",
    "Au retour sur le site principal, rapatriez d'abord les fonctions les moins critiques.",
    "Une sauvegarde jamais restaurée n'est pas prouvée.",
    "Le RAID n'est pas une sauvegarde."
   ]
  },
  "mem": {
   "en": [
    "Sites: cold < warm < hot (cost and speed).",
    "Electronic vaulting = bulk transfer of backups; remote journaling = transaction logs; remote mirroring = live copy.",
    "RAID 0 striping (no redundancy); RAID 1 mirroring; RAID 5 striping with parity; RAID 10 mirror + stripe.",
    "3-2-1: 3 copies, 2 media types, 1 off-site.",
    "Test order: read-through, walk-through/tabletop, simulation, parallel, full interruption."
   ],
   "fr": [
    "Sites : froid < tiède < chaud (coût et rapidité).",
    "Electronic vaulting = transfert en bloc des sauvegardes ; remote journaling = journaux de transactions ; remote mirroring = copie en direct.",
    "RAID 0 répartition (sans redondance) ; RAID 1 miroir ; RAID 5 répartition avec parité ; RAID 10 miroir + répartition.",
    "3-2-1 : 3 copies, 2 types de supports, 1 hors site.",
    "Ordre des tests : relecture, déroulé/exercice sur table, simulation, parallèle, interruption complète."
   ]
  }
 },
 {
  "id": 19,
  "sum": {
   "en": [
    "Investigations can be administrative (internal, operational), criminal (violations of criminal law, highest standard of proof), civil (disputes between parties) or regulatory (by government bodies, may lead to fines), and industry standards may also define investigation requirements. Electronic discovery (e-discovery) handles electronically stored information for litigation following a process of identification, preservation, collection, processing, review, analysis, production and presentation; a legal hold suspends normal deletion.",
    "Evidence must be admissible: relevant, material and competent (legally obtained). Types include real (physical) evidence, documentary evidence (best evidence rule favors originals; parol evidence rule for written agreements), testimonial evidence, and demonstrative evidence. Hearsay is generally not admissible, though business records made in the normal course of business can be. Evidence collection follows the order of volatility, uses forensic imaging with write blockers and hashing, and maintains a documented chain of custody. Forensic analysis covers media, network, software and hardware/embedded devices. Investigators should involve legal counsel and decide with management whether to contact law enforcement.",
    "Computer crimes include military and intelligence attacks, business attacks, financial attacks, terrorist attacks, grudge attacks and thrill attacks. Ethics is the final topic: the ISC2 Code of Ethics has a preamble and four canons, applied in order: protect society, the common good, necessary public trust and confidence, and the infrastructure; act honorably, honestly, justly, responsibly and legally; provide diligent and competent service to principals; advance and protect the profession. Organizational codes of ethics and RFC 1087 (Ethics and the Internet) also guide behavior."
   ],
   "fr": [
    "Les enquêtes peuvent être administratives (internes, opérationnelles), pénales (infractions au droit pénal, niveau de preuve le plus élevé), civiles (litiges entre parties) ou réglementaires (par des organismes publics, avec amendes possibles), et des normes sectorielles peuvent aussi en fixer les exigences. L'e-discovery traite les informations électroniques pour un litige selon un processus d'identification, préservation, collecte, traitement, revue, analyse, production et présentation ; une conservation légale (legal hold) suspend la suppression normale.",
    "La preuve doit être recevable : pertinente, importante et légalement obtenue. Types : preuve matérielle, preuve documentaire (la règle de la meilleure preuve privilégie les originaux ; la règle de la preuve verbale protège les accords écrits), preuve testimoniale et preuve démonstrative. Le ouï-dire est en général irrecevable, mais les registres tenus dans le cours normal de l'activité peuvent l'être. La collecte suit l'ordre de volatilité, utilise des images légales avec bloqueur d'écriture et empreintes, et maintient une chaîne de possession documentée. L'analyse porte sur les supports, le réseau, les logiciels et le matériel/embarqué. Les enquêteurs impliquent le juridique et décident avec la direction s'il faut contacter les forces de l'ordre.",
    "Délits informatiques : attaques militaires et de renseignement, contre les entreprises, financières, terroristes, par rancune ou par défi. L'éthique conclut : le Code d'éthique de l'ISC2 a un préambule et quatre canons, appliqués dans l'ordre : protéger la société, le bien commun, la confiance du public et l'infrastructure ; agir de façon honorable, honnête, juste, responsable et légale ; fournir un service diligent et compétent aux mandants ; faire progresser et protéger la profession. Les codes d'éthique des organisations et la RFC 1087 (Ethics and the Internet) guident aussi les comportements."
   ]
  },
  "tips": {
   "en": [
    "Memorize the four ISC2 canons in order; when canons conflict, the earlier one wins.",
    "A broken chain of custody can make evidence inadmissible.",
    "Always work on a verified forensic copy, never on the original.",
    "Collect the most volatile data first (CPU, RAM) before shutting down.",
    "For ethics questions, pick the most ethical option."
   ],
   "fr": [
    "Apprenez les quatre canons de l'ISC2 dans l'ordre ; en cas de conflit, le premier l'emporte.",
    "Une chaîne de possession rompue peut rendre une preuve irrecevable.",
    "Travaillez toujours sur une copie légale vérifiée, jamais sur l'original.",
    "Collectez d'abord les données les plus volatiles (processeur, RAM) avant d'éteindre.",
    "Pour une question d'éthique, choisissez l'option la plus éthique."
   ]
  },
  "mem": {
   "en": [
    "ISC2 canons: 1 society/infrastructure, 2 honorable/legal, 3 diligent service to principals, 4 advance the profession.",
    "Admissible evidence: relevant, material, competent.",
    "Evidence types: real, documentary, testimonial, demonstrative.",
    "Order of volatility: registers/cache, RAM, temp files, disk, remote logs, archival media.",
    "E-discovery (EDRM): identify, preserve, collect, process, review, analyze, produce, present."
   ],
   "fr": [
    "Canons ISC2 : 1 société/infrastructure, 2 honorable/légal, 3 service diligent aux mandants, 4 faire progresser la profession.",
    "Preuve recevable : pertinente, importante, légalement obtenue.",
    "Types de preuves : matérielle, documentaire, testimoniale, démonstrative.",
    "Ordre de volatilité : registres/cache, RAM, fichiers temporaires, disque, journaux distants, archives.",
    "E-discovery (EDRM) : identifier, préserver, collecter, traiter, revoir, analyser, produire, présenter."
   ]
  }
 },
 {
  "id": 20,
  "sum": {
   "en": [
    "Software development security integrates security into the whole lifecycle. Lifecycle models include Waterfall (sequential), Spiral (iterative and risk-driven), Agile (iterative, valuing individuals, working software, customer collaboration and responding to change; Scrum and Kanban) and DevOps/DevSecOps, which automate build, test and deployment through CI/CD pipelines with integrated security checks. Maturity models (CMMI/SW-CMM, OWASP SAMM, BSIMM) measure and improve processes; IDEAL is an improvement model.",
    "Development controls include requirements and design reviews, threat modeling, secure coding standards, code review, static and dynamic testing, software composition analysis and SBOMs, change and configuration management, version control and separation of development, test and production environments. Operation and maintenance, and an integrated product team, keep software secure after release. Object-oriented concepts (encapsulation, inheritance, polymorphism, cohesion, coupling) influence quality and security.",
    "Databases rely on DBMS models (hierarchical, network, relational with keys and SQL), ACID transactions, concurrency control, and protections against aggregation and inference (polyinstantiation, cell suppression). Storage threats and knowledge-based systems (expert systems, machine learning, AI) are also covered. Acquired software (COTS, open source, third-party, managed services, SaaS) requires security assessment, contractual requirements and software escrow when needed. APIs must be secured with authentication, authorization, input validation and rate limiting, often through API gateways. Secure coding guidelines address source code weaknesses and vulnerabilities at the code level."
   ],
   "fr": [
    "La sécurité du développement intègre la sécurité à tout le cycle de vie. Modèles : cascade (séquentiel), spirale (itératif et guidé par le risque), Agile (itératif, privilégiant les individus, le logiciel qui fonctionne, la collaboration avec le client et l'adaptation au changement ; Scrum et Kanban) et DevOps/DevSecOps, qui automatisent compilation, tests et déploiement dans des chaînes CI/CD avec des contrôles de sécurité intégrés. Les modèles de maturité (CMMI/SW-CMM, OWASP SAMM, BSIMM) mesurent et améliorent les processus ; IDEAL est un modèle d'amélioration.",
    "Contrôles du développement : revues des exigences et de la conception, modélisation des menaces, normes de codage sécurisé, revue de code, tests statiques et dynamiques, analyse de la composition logicielle et SBOM, gestion des changements et de la configuration, contrôle de version et séparation des environnements de développement, de test et de production. L'exploitation, la maintenance et une équipe produit intégrée maintiennent la sécurité après la livraison. Les concepts objet (encapsulation, héritage, polymorphisme, cohésion, couplage) influent sur la qualité et la sécurité.",
    "Les bases de données reposent sur des modèles de SGBD (hiérarchique, réseau, relationnel avec clés et SQL), les transactions ACID, le contrôle de concurrence, et des protections contre l'agrégation et l'inférence (polyinstanciation, suppression de cellules). Les menaces sur le stockage et les systèmes à base de connaissances (systèmes experts, apprentissage automatique, IA) sont aussi traités. Les logiciels acquis (COTS, open source, tiers, services gérés, SaaS) exigent une évaluation de sécurité, des exigences contractuelles et, si besoin, un séquestre du code. Les API doivent être protégées par authentification, autorisation, validation des entrées et limitation de débit, souvent via des passerelles d'API. Les guides de codage sécurisé traitent les faiblesses du code source."
   ]
  },
  "tips": {
   "en": [
    "Security is cheapest to add during requirements and design.",
    "DevSecOps = security automated in the pipeline and shared by everyone.",
    "Know the ACID properties and what each means.",
    "Polyinstantiation counters inference in multilevel databases.",
    "For acquired software, rely on contracts, testing and vendor assessment; escrow protects against vendor failure."
   ],
   "fr": [
    "La sécurité coûte le moins cher ajoutée dès les exigences et la conception.",
    "DevSecOps = sécurité automatisée dans la chaîne et partagée par tous.",
    "Retenez les propriétés ACID et leur sens.",
    "La polyinstanciation contre l'inférence dans les bases multiniveaux.",
    "Pour un logiciel acquis : contrats, tests et évaluation du fournisseur ; le séquestre protège contre sa défaillance."
   ]
  },
  "mem": {
   "en": [
    "ACID: atomicity, consistency, isolation, durability.",
    "CMM levels: initial, repeatable, defined, managed, optimizing.",
    "IDEAL: initiating, diagnosing, establishing, acting, learning.",
    "Agile values: individuals, working software, customer collaboration, responding to change.",
    "Low coupling and high cohesion = better design.",
    "Primary key = unique row ID; foreign key = link to another table; candidate key = possible primary key."
   ],
   "fr": [
    "ACID : atomicité, cohérence, isolation, durabilité.",
    "Niveaux CMM : initial, reproductible, défini, géré, optimisé.",
    "IDEAL : initier, diagnostiquer, établir, agir, apprendre.",
    "Valeurs Agile : individus, logiciel qui fonctionne, collaboration client, adaptation au changement.",
    "Faible couplage et forte cohésion = meilleure conception.",
    "Clé primaire = identifiant unique ; clé étrangère = lien vers une autre table ; clé candidate = clé primaire possible."
   ]
  }
 },
 {
  "id": 21,
  "sum": {
   "en": [
    "Malicious code includes viruses (need a host and user action; types include boot sector, file infector, macro, service injection, multipartite, stealth, polymorphic and encrypted), worms (self-propagating), Trojan horses (appear legitimate), logic bombs (trigger on a condition), ransomware, rootkits, spyware, adware, keyloggers, fileless malware residing in memory, and malicious scripts. Advanced persistent threats use zero-day vulnerabilities and stealth. Defenses include antimalware with signature and behavior analysis, EDR, allowlisting, sandboxing, patching, least privilege, user awareness and offline or immutable backups; rootkit infections are best handled by rebuilding from known-good media.",
    "Application attacks exploit flaws in code: buffer overflows (bounds checking, memory-safe languages, ASLR, DEP), time-of-check to time-of-use race conditions, backdoors and maintenance hooks, privilege escalation, and injection attacks (SQL, command, LDAP, XML/XXE, code). Web application attacks include cross-site scripting (reflected, stored, DOM; prevented by output encoding, input validation and Content Security Policy), cross-site request forgery (anti-CSRF tokens, SameSite cookies), server-side request forgery, session hijacking and fixation, directory traversal and clickjacking.",
    "Countermeasures follow secure coding practices: server-side input validation with allowlists, parameterized queries, output encoding, secure error handling with generic messages, secure session management, code signing, web application firewalls, database security, and code review and testing. The OWASP Top 10 summarizes the most critical web risks. Reconnaissance (whois, DNS, port scanning, vulnerability scanning) and masquerading (IP and MAC spoofing, session hijacking) round out the attacker's toolkit."
   ],
   "fr": [
    "Le code malveillant comprend les virus (ont besoin d'un hôte et d'une action de l'utilisateur ; types : secteur d'amorçage, infecteur de fichiers, macro, injection de service, multipartite, furtif, polymorphe et chiffré), les vers (se propagent seuls), les chevaux de Troie (ont l'air légitimes), les bombes logiques (se déclenchent sur une condition), les rançongiciels, les rootkits, les logiciels espions, publicitaires, les enregistreurs de frappe, les malwares sans fichier résidant en mémoire et les scripts malveillants. Les menaces persistantes avancées (APT) utilisent des failles zero-day et la discrétion. Défenses : antimalware par signatures et comportement, EDR, liste d'autorisation, bacs à sable, correctifs, moindre privilège, sensibilisation et sauvegardes hors ligne ou immuables ; face à un rootkit, le mieux est de reconstruire depuis un support sain.",
    "Les attaques applicatives exploitent des défauts du code : débordements de tampon (vérification des limites, langages sûrs en mémoire, ASLR, DEP), situations de concurrence TOCTOU, portes dérobées et accès de maintenance, élévation de privilèges et injections (SQL, commandes, LDAP, XML/XXE, code). Attaques web : cross-site scripting (réfléchi, stocké, DOM ; prévenu par l'encodage des sorties, la validation des entrées et la Content Security Policy), CSRF (jetons anti-CSRF, cookies SameSite), SSRF, détournement et fixation de session, traversée de répertoires et clickjacking.",
    "Les parades suivent le codage sécurisé : validation côté serveur par liste d'autorisation, requêtes paramétrées, encodage des sorties, gestion des erreurs avec messages génériques, gestion sûre des sessions, signature de code, pare-feu applicatifs web, sécurité des bases de données, revue de code et tests. L'OWASP Top 10 résume les risques web les plus critiques. La reconnaissance (whois, DNS, scan de ports, scan de vulnérabilités) et l'usurpation (IP, MAC, détournement de session) complètent la panoplie de l'attaquant."
   ]
  },
  "tips": {
   "en": [
    "Worm = self-propagating; virus = needs a host and user action; Trojan = disguised.",
    "Parameterized queries are the best defense against SQL injection.",
    "XSS attacks the user's browser; CSRF abuses the user's authenticated session; SQL injection attacks the database.",
    "Client-side validation alone is never sufficient.",
    "For a rootkit, restore or rebuild from known-good media."
   ],
   "fr": [
    "Ver = se propage seul ; virus = a besoin d'un hôte et d'une action ; cheval de Troie = déguisé.",
    "Les requêtes paramétrées sont la meilleure défense contre l'injection SQL.",
    "Le XSS vise le navigateur de l'utilisateur ; le CSRF abuse de sa session authentifiée ; l'injection SQL vise la base.",
    "La validation côté client seule ne suffit jamais.",
    "Face à un rootkit, restaurez ou reconstruisez depuis un support sain."
   ]
  },
  "mem": {
   "en": [
    "Polymorphic virus changes its signature; stealth virus hides changes; multipartite uses several vectors.",
    "XSS types: reflected, stored (persistent), DOM-based.",
    "CSRF defense: anti-CSRF tokens, SameSite cookies, re-authentication.",
    "Buffer overflow defenses: bounds checking, input validation, ASLR, DEP/NX, memory-safe languages.",
    "TOCTOU = race condition; fix with atomic operations and locking.",
    "Clickjacking defense: X-Frame-Options or CSP frame-ancestors."
   ],
   "fr": [
    "Virus polymorphe : change de signature ; furtif : cache ses modifications ; multipartite : plusieurs vecteurs.",
    "Types de XSS : réfléchi, stocké (persistant), basé sur le DOM.",
    "Défense CSRF : jetons anti-CSRF, cookies SameSite, nouvelle authentification.",
    "Défenses contre les débordements : vérification des limites, validation des entrées, ASLR, DEP/NX, langages sûrs en mémoire.",
    "TOCTOU = situation de concurrence ; corriger avec des opérations atomiques et des verrous.",
    "Défense contre le clickjacking : X-Frame-Options ou CSP frame-ancestors."
   ]
  }
 }
];
