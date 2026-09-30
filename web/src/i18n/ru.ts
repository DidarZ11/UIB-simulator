export const ru = {
  appTitle: "UIB Simulator",
  appDescription: "3D-кампус и учебная платформа UIB",
  controls: {
    move: "WASD или стрелки — ходить, Shift — бежать, пробел — прыжок",
    look: "Клик по экрану — управлять камерой мышью, Esc — отпустить",
    zoom: "Колесо мыши — приблизить до вида от первого лица",
    emotes: "Держать T — колесо эмоций, 1 — помахать",
  },
  emotes: {
    title: "Эмоции",
    Wave: "Помахать",
    Yes: "Да",
    No: "Нет",
    RaiseHand: "Поднять руку",
    Cheer: "Ура",
    Shrug: "Не знаю",
  },
  avatar: {
    button: "Внешность",
    Shirt: "Футболка",
    Pants: "Штаны",
    Hair: "Волосы",
    original: "Как было",
    reset: "Сбросить всё",
  },
  unknownZone: "Вне здания",
  hallSource: {
    blender: "Холл: модель из Blender",
    code: "Холл: построен кодом (?model=hall — из Blender)",
  },
};

export type Strings = typeof ru;
