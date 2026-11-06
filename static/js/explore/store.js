import { ACHIEVEMENTS, ALL_CARDS, CARD_MAP, OBJECTS_BY_WORLD, SCAVENGER_HUNTS, WORLDS } from "./data.js";
import { LANGUAGES } from "./i18n.js";

const STORAGE_KEY = "himalaya-connect-explorer-v1";
const XP_FOR = {
  discovery: 10,
  card: 20,
  quiz: 15,
  daily: 20,
  bridge: 30,
  hunt: 40,
};
const LEVELS = [0, 80, 190, 340, 540, 800, 1120, 1500];

function todayKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

function defaultProgress() {
  return {
    version: 1,
    language: "en",
    xp: 0,
    discoveredObjects: [],
    collection: {},
    quizResults: {},
    completedBridges: [],
    completedEtiquette: [],
    achievements: [],
    visitedWorlds: [],
    activeHunt: null,
    huntProgress: {},
    completedHunts: [],
    lastWorld: "kathmandu",
    tutorialDone: false,
    dailySaved: {},
    dailyRead: {},
    streak: { count: 0, lastDate: null },
    settings: {
      reducedMotion:
        typeof window !== "undefined" &&
        Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches),
      sound: false,
      quality: "auto",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function safeParse(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function mergeProgress(base, loaded) {
  if (!loaded) return base;
  return {
    ...base,
    ...loaded,
    settings: { ...base.settings, ...(loaded.settings || {}) },
    streak: { ...base.streak, ...(loaded.streak || {}) },
    discoveredObjects: Array.isArray(loaded.discoveredObjects)
      ? loaded.discoveredObjects.filter((id) => CARD_MAP[id])
      : [],
    completedBridges: Array.isArray(loaded.completedBridges) ? loaded.completedBridges : [],
    completedEtiquette: Array.isArray(loaded.completedEtiquette) ? loaded.completedEtiquette : [],
    achievements: Array.isArray(loaded.achievements) ? loaded.achievements : [],
    visitedWorlds: Array.isArray(loaded.visitedWorlds) ? loaded.visitedWorlds : [],
    activeHunt: typeof loaded.activeHunt === "string" ? loaded.activeHunt : null,
    huntProgress:
      loaded.huntProgress && typeof loaded.huntProgress === "object" ? loaded.huntProgress : {},
    completedHunts: Array.isArray(loaded.completedHunts) ? loaded.completedHunts : [],
    collection:
      loaded.collection && typeof loaded.collection === "object" ? loaded.collection : {},
    quizResults:
      loaded.quizResults && typeof loaded.quizResults === "object" ? loaded.quizResults : {},
    dailySaved:
      loaded.dailySaved && typeof loaded.dailySaved === "object" ? loaded.dailySaved : {},
    dailyRead:
      loaded.dailyRead && typeof loaded.dailyRead === "object" ? loaded.dailyRead : {},
    language: LANGUAGES[loaded.language] ? loaded.language : "en",
  };
}

export class ExplorerStore {
  constructor() {
    this.listeners = new Set();
    this.progress = mergeProgress(defaultProgress(), safeParse(this.readRaw()));
    this.storageAvailable = true;
    this.touchStreak();
    this.persist();
  }

  readRaw() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      this.storageAvailable = false;
      return null;
    }
  }

  persist() {
    this.progress.updatedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch (error) {
      this.storageAvailable = false;
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(detail = {}) {
    this.listeners.forEach((listener) => listener(this.progress, detail));
  }

  get state() {
    return this.progress;
  }

  get language() {
    return this.progress.language;
  }

  setLanguage(language) {
    if (!LANGUAGES[language]) return false;
    if (this.progress.language === language) return false;
    this.progress.language = language;
    this.persist();
    this.emit({ type: "language", language });
    return true;
  }

  setSetting(key, value) {
    if (!(key in this.progress.settings)) return;
    this.progress.settings[key] = value;
    this.persist();
    this.emit({ type: "settings", key, value });
  }

  touchStreak() {
    const today = todayKey();
    if (this.progress.streak.lastDate === today) return;
    if (this.progress.streak.lastDate === yesterdayKey()) {
      this.progress.streak.count = Math.max(0, Number(this.progress.streak.count) || 0) + 1;
    } else {
      this.progress.streak.count = 1;
    }
    this.progress.streak.lastDate = today;
  }

  recordWorld(worldId) {
    if (!WORLDS[worldId]) return;
    if (!this.progress.visitedWorlds.includes(worldId)) {
      this.progress.visitedWorlds.push(worldId);
    }
    this.progress.lastWorld = worldId;
    this.persist();
    this.emit({ type: "world", worldId });
  }

  finishTutorial() {
    this.progress.tutorialDone = true;
    this.persist();
    this.emit({ type: "tutorial" });
  }

  isWorldComplete(worldId) {
    const ids = OBJECTS_BY_WORLD[worldId] || [];
    return ids.length > 0 && ids.every((id) => this.progress.discoveredObjects.includes(id));
  }

  markDiscovered(objectId, object) {
    if (!CARD_MAP[objectId]) return { added: false, xp: 0, achievements: [] };
    if (this.progress.discoveredObjects.includes(objectId)) {
      return { added: false, xp: 0, achievements: [] };
    }
    this.progress.discoveredObjects.push(objectId);
    this.progress.xp += XP_FOR.discovery;
    const beforeLevel = this.getLevel().level;
    this.persist();
    const achievements = this.evaluateAchievements();
    const afterLevel = this.getLevel().level;
    this.emit({ type: "discovery", objectId, object });
    return {
      added: true,
      xp: XP_FOR.discovery,
      achievements,
      levelUp: afterLevel > beforeLevel ? afterLevel : null,
    };
  }

  collectCard(cardId) {
    if (!CARD_MAP[cardId]) return { added: false, xp: 0, achievements: [] };
    if (this.progress.collection[cardId]) {
      return { added: false, xp: 0, card: CARD_MAP[cardId], achievements: [] };
    }
    this.progress.collection[cardId] = new Date().toISOString();
    this.progress.xp += XP_FOR.card;
    const beforeLevel = this.getLevel().level;
    this.persist();
    const achievements = this.evaluateAchievements();
    const afterLevel = this.getLevel().level;
    this.emit({ type: "card", cardId, card: CARD_MAP[cardId] });
    return {
      added: true,
      xp: XP_FOR.card,
      card: CARD_MAP[cardId],
      achievements,
      levelUp: afterLevel > beforeLevel ? afterLevel : null,
    };
  }

  passQuiz(quizId, score) {
    if (!quizId) return { first: false, xp: 0, achievements: [] };
    const previous = this.progress.quizResults[quizId] || {
      attempts: 0,
      passed: false,
      best: 0,
    };
    const alreadyPassed = previous.passed;
    this.progress.quizResults[quizId] = {
      attempts: previous.attempts + 1,
      passed: true,
      best: Math.max(previous.best || 0, Number(score) || 100),
      lastAt: new Date().toISOString(),
    };
    const beforeLevel = this.getLevel().level;
    if (!alreadyPassed) this.progress.xp += XP_FOR.quiz;
    this.persist();
    const achievements = this.evaluateAchievements();
    const afterLevel = this.getLevel().level;
    this.emit({ type: "quiz", quizId, first: !alreadyPassed });
    return {
      first: !alreadyPassed,
      xp: alreadyPassed ? 0 : XP_FOR.quiz,
      achievements,
      levelUp: afterLevel > beforeLevel ? afterLevel : null,
    };
  }

  completeBridge(bridgeId, rewardCardId) {
    if (!bridgeId) return { first: false, xp: 0, achievements: [] };
    if (this.progress.completedBridges.includes(bridgeId)) {
      return { first: false, xp: 0, achievements: [] };
    }
    this.progress.completedBridges.push(bridgeId);
    this.progress.xp += XP_FOR.bridge;
    if (rewardCardId && CARD_MAP[rewardCardId] && !this.progress.collection[rewardCardId]) {
      this.progress.collection[rewardCardId] = new Date().toISOString();
    }
    const beforeLevel = this.getLevel().level;
    this.persist();
    const achievements = this.evaluateAchievements();
    const afterLevel = this.getLevel().level;
    this.emit({ type: "bridge", bridgeId });
    return {
      first: true,
      xp: XP_FOR.bridge,
      rewardCardId,
      achievements,
      levelUp: afterLevel > beforeLevel ? afterLevel : null,
    };
  }

  saveDaily(encounter) {
    if (!encounter) return { first: false, xp: 0, achievements: [] };
    const day = todayKey();
    if (this.progress.dailySaved[day]) {
      return { first: false, xp: 0, achievements: [] };
    }
    this.progress.dailySaved[day] = encounter.id;
    this.progress.dailyRead[day] = encounter.id;
    this.touchStreak();
    const cardWasNew = encounter.cardId && !this.progress.collection[encounter.cardId];
    if (cardWasNew) {
      this.progress.collection[encounter.cardId] = new Date().toISOString();
    }
    this.progress.xp += XP_FOR.daily;
    const beforeLevel = this.getLevel().level;
    this.persist();
    const achievements = this.evaluateAchievements();
    const afterLevel = this.getLevel().level;
    this.emit({ type: "daily", encounterId: encounter.id });
    return {
      first: true,
      xp: XP_FOR.daily,
      cardWasNew,
      achievements,
      levelUp: afterLevel > beforeLevel ? afterLevel : null,
    };
  }

  readDaily(encounter) {
    if (!encounter) return;
    this.progress.dailyRead[todayKey()] = encounter.id;
    this.touchStreak();
    this.persist();
    this.emit({ type: "daily-read" });
  }

  completeEtiquette(scenarioId) {
    if (!scenarioId || this.progress.completedEtiquette.includes(scenarioId)) return false;
    this.progress.completedEtiquette.push(scenarioId);
    this.persist();
    this.emit({ type: "etiquette", scenarioId });
    return true;
  }

  startHunt(huntId) {
    const hunt = SCAVENGER_HUNTS.find((item) => item.id === huntId);
    if (!hunt) return false;
    if (!Array.isArray(this.progress.huntProgress[huntId])) {
      this.progress.huntProgress[huntId] = [];
    }
    this.progress.activeHunt = huntId;
    this.persist();
    this.emit({ type: "hunt-start", huntId });
    return true;
  }

  /* Called whenever a cultural object is discovered. Updates any hunt whose
     target list includes that object and completes hunts that are now full. */
  recordHuntFind(objectId) {
    let progress = null;
    let completion = null;
    for (const hunt of SCAVENGER_HUNTS) {
      if (!hunt.targets.includes(objectId)) continue;
      const found = this.progress.huntProgress[hunt.id] || (this.progress.huntProgress[hunt.id] = []);
      if (found.includes(objectId)) continue;
      found.push(objectId);
      if (hunt.targets.every((id) => found.includes(id))) {
        const result = this.completeHunt(hunt.id);
        if (result.first) completion = { hunt, result };
      } else if (!progress) {
        progress = { hunt, found: found.length, total: hunt.targets.length };
      }
    }
    if (completion) {
      this.persist();
      this.emit({ type: "hunt-complete", huntId: completion.hunt.id });
      return { completed: true, hunt: completion.hunt, result: completion.result };
    }
    if (progress) {
      this.persist();
      this.emit({ type: "hunt-progress", objectId });
      return { completed: false, ...progress };
    }
    return null;
  }

  completeHunt(huntId) {
    const hunt = SCAVENGER_HUNTS.find((item) => item.id === huntId);
    if (!hunt || this.progress.completedHunts.includes(huntId)) {
      return { first: false, xp: 0, achievements: [] };
    }
    this.progress.completedHunts.push(huntId);
    this.progress.xp += hunt.xp || XP_FOR.hunt;
    if (hunt.rewardCard && CARD_MAP[hunt.rewardCard] && !this.progress.collection[hunt.rewardCard]) {
      this.progress.collection[hunt.rewardCard] = new Date().toISOString();
    }
    const beforeLevel = this.getLevel().level;
    this.persist();
    const achievements = this.evaluateAchievements();
    const afterLevel = this.getLevel().level;
    this.emit({ type: "hunt", huntId });
    return {
      first: true,
      xp: hunt.xp || XP_FOR.hunt,
      rewardCard: hunt.rewardCard,
      achievements,
      levelUp: afterLevel > beforeLevel ? afterLevel : null,
    };
  }

  getHuntState(huntId) {
    const hunt = SCAVENGER_HUNTS.find((item) => item.id === huntId);
    if (!hunt) return null;
    const found = this.progress.huntProgress[huntId] || [];
    return {
      hunt,
      found,
      total: hunt.targets.length,
      complete: this.progress.completedHunts.includes(huntId),
    };
  }

  evaluateAchievements() {
    const newlyUnlocked = [];
    const discovered = this.progress.discoveredObjects;
    const passedQuizzes = Object.values(this.progress.quizResults).filter((q) => q.passed).length;
    const mountainComplete = Object.keys(WORLDS)
      .filter((id) => WORLDS[id].mountain)
      .some((id) => this.isWorldComplete(id));
    const checks = {
      "first-discovery": discovered.length >= 1,
      "cultural-explorer": discovered.length >= 10,
      "mountain-traveller": mountainComplete,
      "bridge-builder": this.progress.completedBridges.length >= 1,
      "knowledge-seeker": passedQuizzes >= 5,
      "trailblazer": this.progress.completedHunts.length >= 1,
    };
    ACHIEVEMENTS.forEach((achievement) => {
      if (checks[achievement.id] && !this.progress.achievements.includes(achievement.id)) {
        this.progress.achievements.push(achievement.id);
        this.progress.xp += achievement.xp;
        newlyUnlocked.push(achievement);
      }
    });
    if (newlyUnlocked.length) this.persist();
    return newlyUnlocked;
  }

  getLevel(xp = this.progress.xp) {
    let level = 1;
    for (let index = 0; index < LEVELS.length; index += 1) {
      if (xp >= LEVELS[index]) level = index + 1;
      else break;
    }
    const currentFloor = LEVELS[level - 1] || 0;
    const nextFloor = LEVELS[level] ?? currentFloor + 400;
    const pct = nextFloor === currentFloor ? 100 : Math.round(((xp - currentFloor) / (nextFloor - currentFloor)) * 100);
    return {
      level,
      currentFloor,
      nextFloor,
      pct: Math.max(0, Math.min(100, pct)),
      remaining: Math.max(0, nextFloor - xp),
    };
  }

  getStats() {
    return {
      xp: this.progress.xp,
      level: this.getLevel(),
      discoveries: this.progress.discoveredObjects.length,
      cards: Object.keys(this.progress.collection).length,
      totalCards: ALL_CARDS.length,
      quizzes: Object.values(this.progress.quizResults).filter((q) => q.passed).length,
      bridges: this.progress.completedBridges.length,
      streak: this.progress.streak.count || 0,
      visitedWorlds: this.progress.visitedWorlds.length,
    };
  }

  getRecentDiscoveries(limit = 3) {
    return Object.entries(this.progress.collection)
      .filter(([cardId]) => CARD_MAP[cardId])
      .sort(([, a], [, b]) => new Date(b) - new Date(a))
      .slice(0, limit)
      .map(([cardId, discoveredAt]) => ({ card: CARD_MAP[cardId], discoveredAt }));
  }

  getToday() {
    return todayKey();
  }

  getDailyHistory() {
    return this.progress.dailySaved;
  }

  getAchievements() {
    return ACHIEVEMENTS.map((achievement) => ({
      ...achievement,
      unlocked: this.progress.achievements.includes(achievement.id),
    }));
  }

  getQuizResult(quizId) {
    return this.progress.quizResults[quizId] || null;
  }

  get isReturning() {
    return (
      this.progress.discoveredObjects.length > 0 ||
      Object.keys(this.progress.collection).length > 0 ||
      this.progress.tutorialDone
    );
  }

  loadServerState(state) {
    if (!state || typeof state !== "object") return false;
    this.progress = mergeProgress(defaultProgress(), state);
    this.persist();
    this.emit({ type: "server-load" });
    return true;
  }

  reset() {
    this.progress = defaultProgress();
    this.touchStreak();
    this.persist();
    this.emit({ type: "reset" });
  }
}

export { todayKey, XP_FOR, LEVELS };
