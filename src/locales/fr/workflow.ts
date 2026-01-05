export const workflow = {
  "config.title": "Configuration",
  "config.workflowName": "Nom du workflow",
  "config.globalInput": "Entrée globale",
  "config.readOnly": "Lecture seule en mode démo",
  "config.edit": "Modifier le JSON",
  "config.view": "Vue visuelle",
  "config.defaultName": "Exemple de workflow",
  "btn.run": "Exécuter le workflow",
  "btn.running": "Exécution...",

  "toolbox.title": "Boîte à outils",
  "toolbox.loading": "Chargement des outils...",

  "canvas.title": "Étapes du workflow",
  "canvas.subtitle": "Glissez-déposez pour réordonner la logique d'exécution.",
  "canvas.clear": "Tout effacer",
  "canvas.empty.title": "Le workflow est vide",
  "canvas.empty.subtitle": "Cliquez sur les outils à gauche ou demandez à l'IA de le construire.",
  "canvas.deleteEdge": "Supprimer la connexion",

  "upload.title": "Import .mat/.csv",
  "upload.pickFile": "Veuillez d'abord sélectionner un fichier .mat ou .csv.",
  "upload.button": "Envoyer au backend et écrire dans le JSON (.mat / .csv)",
  "upload.uploading": "Téléversement...",
  "upload.success": "Téléversement réussi : {{filename}} → {{path}}",
  "upload.failure": "Échec du téléversement : {{message}}",
  "upload.choose": "Choisir un fichier",
  "upload.noFile": "Aucun fichier choisi",

  "input.invalidJson": "Syntaxe JSON invalide.",
  "input.invalidJsonAlert": "Entrée JSON invalide",

  "alert.noEntryNodes": "Aucun nœud d'entrée. Ajoutez au moins un nœud sans arêtes entrantes.",
  "alert.cycleDetected": "Cycle ou branchement infini détecté ; exécution arrêtée.",
  "alert.toolNotRegistered": "Outil non enregistré dans le pool backend : {{toolId}}\nVérifiez que getAvailableTools() renvoie cet outil.",

  "logs.title": "Journaux d'exécution",
  "logs.empty.title": "Prêt à exécuter",
  "logs.empty.subtitle": "Cliquez sur « Exécuter le workflow » pour démarrer.",
  "logs.input": "Entrée",
  "logs.output": "Sortie",
  "logs.openChart": "📊 Ouvrir le graphique DiPCA",

  "workflow.help.welcome": "Bienvenue dans l'orchestrateur",
  "workflow.help.subtitle": "Constructeur visuel de workflows pour outils MCP",
  "workflow.help.step1.title": "Construire",
  "workflow.help.step1.desc": "Cliquez sur les outils de la boîte ou réordonnez les étapes sur la toile centrale.",
  "workflow.help.step2.title": "Exécuter",
  "workflow.help.step2.desc": "Cliquez sur le bouton violet « Exécuter le workflow » dans la barre latérale gauche.",
  "workflow.help.step3.title": "Assistance IA",
  "workflow.help.step3.desc": "Utilisez le bouton de chat flottant (en bas à droite) pour demander à Gemini de construire le workflow.",
  "workflow.help.getStarted": "Commencer",

  "logs.resize.title": "Glisser pour redimensionner le panneau de logs",
  "toolbox.category.fallback": "Outil"
};
