import React from "react";

/**
 * Reusable dashboard sidebar.
 *
 * @param {string} title - Portal label shown at the top (e.g. "Doctor Portal")
 * @param {Array}  links - [{ label, icon }] nav items
 * @param {string} activeLabel - which link should be highlighted as active
 * @param {Function} onLogout - called when the Logout button is clicked
 */
function Sidebar({ title, links, activeLabel, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">{title}</div>

      <nav className="sidebar__nav">
        {links.map((link) => (
          <button
            key={link.label}
            type="button"
            className={`sidebar__link ${
              link.label === activeLabel ? "sidebar__link--active" : ""
            }`}
          >
            <span className="sidebar__icon" aria-hidden="true">
              {link.icon}
            </span>
            {link.label}
          </button>
        ))}
      </nav>

      <button type="button" className="sidebar__logout" onClick={onLogout}>
        <span className="sidebar__icon" aria-hidden="true">
          ⏻
        </span>
        Logout
      </button>
    </aside>
  );
}

export default Sidebar;
