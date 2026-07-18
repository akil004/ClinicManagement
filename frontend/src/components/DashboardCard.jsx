import React from "react";

/**
 * Single stat tile used on dashboard pages.
 *
 * @param {string} label - e.g. "Today's Appointments"
 * @param {string|number} value - the figure to display
 * @param {string} icon - emoji or short glyph shown beside the value
 */
function DashboardCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="stat-card__body">
        <p className="stat-card__value">{value}</p>
        <p className="stat-card__label">{label}</p>
      </div>
    </div>
  );
}

export default DashboardCard;
