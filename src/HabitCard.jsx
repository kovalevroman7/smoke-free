import { HABIT_STATUS } from './habitTypes.js'
import { formatArchiveDate, formatTrigger, getHabitFormula, getHabitStats } from './habitUtils.js'

export default function HabitCard({
  habit,
  expanded,
  onToggle,
  onMenu,
  onSituation,
  showMenu = true,
}) {
  const stats = getHabitStats(habit)
  const archived = habit.status === HABIT_STATUS.ARCHIVED
  const summary = archived
    ? formatArchiveDate(habit.archivedAt)
    : `${stats.successful} из ${stats.total} за 7 дней`

  return (
    <article className={`habit-card ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="habit-card-topline">
        <button
          className="habit-card-header"
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <span className={`habit-trigger-chip ${archived ? 'archived' : ''}`}>
            {formatTrigger(habit.trigger)}
          </span>
          <span className="habit-card-title">{habit.title}</span>
        </button>

        {showMenu ? (
          <button
            className="habit-menu-button"
            type="button"
            aria-label={`Действия с привычкой «${habit.title}»`}
            onClick={onMenu}
          >
            <span aria-hidden="true">•••</span>
          </button>
        ) : (
          <button
            className={`habit-chevron-button ${expanded ? 'expanded' : ''}`}
            type="button"
            aria-label={expanded ? 'Свернуть привычку' : 'Раскрыть привычку'}
            onClick={onToggle}
          >
            <span aria-hidden="true" />
          </button>
        )}
      </div>

      {expanded ? (
        <div className="habit-card-details">
          <p className="habit-formula">{getHabitFormula(habit)}</p>
          {archived ? (
            <p className="habit-archive-summary">{summary}</p>
          ) : (
            <>
              <div className="habit-progress-meta">
                <span>За последние 7 дней</span>
                <strong className={`habit-progress-value ${stats.level}`}>
                  {stats.successful} из {stats.total}
                </strong>
              </div>
              <div
                className="habit-progress-track"
                role="progressbar"
                aria-label="Успешные замены за последние 7 дней"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={stats.percent}
              >
                <span
                  className={`habit-progress-fill ${stats.level}`}
                  style={{ width: `${stats.percent}%` }}
                />
              </div>
              <button className="habit-primary-action" type="button" onClick={onSituation}>
                Ситуация произошла
              </button>
            </>
          )}
        </div>
      ) : (
        <p className="habit-card-summary">{summary}</p>
      )}
    </article>
  )
}
