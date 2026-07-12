export const GOAL_TYPES = {
  silence: {
    name: 'Окно тишины',
    icon: '🌙',
    description: 'Не курить в указанный временной промежуток',
  },
  limit_before: {
    name: 'Лимит до времени',
    icon: '⏰',
    description: 'Не более N сигарет до указанного времени',
  },
  morning_interval: {
    name: 'Утренний интервал',
    icon: '🌅',
    description: 'Минимальный промежуток между первыми N сигаретами дня',
  },
  evening_interval: {
    name: 'Вечерний интервал',
    icon: '🌆',
    description: 'Минимальный промежуток между сигаретами после указанного времени',
  },
  custom: {
    name: 'Своя цель',
    icon: '✅',
    description: 'Произвольная цель — отмечайте выполнение вручную долгим нажатием',
  },
}
