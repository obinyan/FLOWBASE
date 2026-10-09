const P = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.6"/><rect x="14" y="3" width="7" height="5" rx="1.6"/><rect x="14" y="12" width="7" height="9" rx="1.6"/><rect x="3" y="16" width="7" height="5" rx="1.6"/></>,
  pipeline: <path d="M3 6h2M8 6h13M3 12h2M8 12h13M3 18h2M8 18h13"/>,
  leads: <><circle cx="9" cy="8" r="3.4" fill="currentColor"/><path d="M2.5 20c0-3.6 2.9-5.8 6.5-5.8s6.5 2.2 6.5 5.8z" fill="currentColor"/><circle cx="17.2" cy="9" r="2.5" fill="currentColor"/><path d="M16.5 14.4c2.9 0 5 1.8 5 4.9h-4" fill="currentColor"/></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2.5v3.5M16 2.5v3.5M7.5 13h.01M12 13h.01M16.5 13h.01M7.5 17h.01M12 17h.01M16.5 17h.01"/></>,
  tasks: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7.5 12.5l3 3 6-7.5"/></>,
  report: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><circle cx="13.5" cy="15" r="3.2"/><path d="M13.5 13.4V15l1.1 1"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  search: <><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  chevron: <path d="M6 9l6 6 6-6"/>,
  arrow: <path d="M4 12h15M14 7l5 5-5 5"/>,
  trend: <path d="M7 17L17 7M8 7h9v9"/>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5"/>,
  note: <path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3"/>,
  clock: <><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="M6 6l12 12M18 6L6 18"/>,
};

export default function Icon({ name, size = 24, strokeWidth = 1.6, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {P[name]}
    </svg>
  );
}
