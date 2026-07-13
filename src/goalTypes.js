export const GOAL_TYPES = {
  silence: {
    name: 'Окно тишины',
    icon: '🌙',
    category: 'rule',
    description: 'Не курить в указанный временной промежуток',
  },
  limit_before: {
    name: 'Лимит до времени',
    icon: '⏰',
    category: 'rule',
    description: 'Не более N сигарет до указанного времени',
  },
  morning_interval: {
    name: 'Утренний интервал',
    icon: '🌅',
    category: 'rule',
    description: 'Минимальный промежуток между первыми N сигаретами дня',
  },
  evening_interval: {
    name: 'Вечерний интервал',
    icon: '🌆',
    category: 'rule',
    description: 'Минимальный промежуток между сигаретами после указанного времени',
  },
  custom: {
    name: 'Обещание',
    icon: '🤝',
    category: 'promise',
    description: 'Обещание самому себе — отмечайте выполнение вручную долгим нажатием',
  },
}

export const GOAL_CATEGORIES = {
  rule: {
    name: 'Правила',
    icon: '📏',
    hint: 'Система следит за выполнением сама',
  },
  promise: {
    name: 'Обещания',
    icon: '🤝',
    hint: 'Отмечаете выполнение сами',
  },
}

export function getGoalCategory(goal) {
  return GOAL_TYPES[goal?.type]?.category || 'rule'
}
