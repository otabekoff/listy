import React from "react";

export const NavHomeIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="winHomeRoof" x1="2" y1="3" x2="22" y2="12" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF8A3D" />
        <stop offset="100%" stopColor="#E04F16" />
      </linearGradient>
      <linearGradient id="winHomeWall" x1="5" y1="9" x2="19" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#E2E8F0" />
        <stop offset="100%" stopColor="#94A3B8" />
      </linearGradient>
    </defs>
    <path
      d="M5 10.5L12 5L19 10.5V19.5C19 20.33 18.33 21 17.5 21H6.5C5.67 21 5 20.33 5 19.5V10.5Z"
      fill="url(#winHomeWall)"
    />
    <rect x="9.8" y="13.5" width="4.4" height="7.5" rx="1" fill="#475569" />
    <path
      d="M2.8 11.2L11.2 4.1C11.66 3.71 12.34 3.71 12.8 4.1L21.2 11.2C21.65 11.58 21.38 12.3 20.8 12.3H19.2L12 6.2L4.8 12.3H3.2C2.62 12.3 2.35 11.58 2.8 11.2Z"
      fill="url(#winHomeRoof)"
    />
  </svg>
);

export const NavListsIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="winListsBack" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
      <linearGradient id="winListsAccent" x1="5" y1="6" x2="10" y2="18" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#BAE6FD" />
        <stop offset="100%" stopColor="#7DD3FC" />
      </linearGradient>
    </defs>
    <rect x="3" y="4" width="18" height="16" rx="3.5" fill="url(#winListsBack)" />
    <rect x="6.5" y="7.5" width="2.6" height="2.6" rx="0.8" fill="url(#winListsAccent)" />
    <rect x="10.8" y="8" width="7" height="1.8" rx="0.9" fill="#FFFFFF" fillOpacity="0.92" />
    <rect x="6.5" y="11.7" width="2.6" height="2.6" rx="0.8" fill="url(#winListsAccent)" />
    <rect x="10.8" y="12.2" width="7" height="1.8" rx="0.9" fill="#FFFFFF" fillOpacity="0.85" />
    <rect x="6.5" y="15.8" width="2.6" height="2.6" rx="0.8" fill="url(#winListsAccent)" />
    <rect x="10.8" y="16.3" width="5" height="1.8" rx="0.9" fill="#FFFFFF" fillOpacity="0.75" />
  </svg>
);

export const NavFavoritesIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="winStarGrad" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="55%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>
    <path
      d="M12 2.8L14.78 8.43L21 9.33L16.5 13.71L17.56 19.9L12 16.98L6.44 19.9L7.5 13.71L3 9.33L9.22 8.43L12 2.8Z"
      fill="url(#winStarGrad)"
    />
    <path
      d="M12 2.8L14.78 8.43L21 9.33L16.5 13.71L12 11.4V2.8Z"
      fill="#FEF08A"
      fillOpacity="0.35"
    />
  </svg>
);

export const NavTrashIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="winTrashBody" x1="6" y1="7" x2="18" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#CBD5E1" />
        <stop offset="100%" stopColor="#64748B" />
      </linearGradient>
      <linearGradient id="winTrashLid" x1="4" y1="4" x2="20" y2="7" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#94A3B8" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
    </defs>
    <path
      d="M6.2 7.5H17.8L16.9 19.2C16.82 20.22 15.97 21 14.95 21H9.05C8.03 21 7.18 20.22 7.1 19.2L6.2 7.5Z"
      fill="url(#winTrashBody)"
    />
    <rect x="9.5" y="10.2" width="1.6" height="7.6" rx="0.8" fill="#475569" fillOpacity="0.65" />
    <rect x="12.9" y="10.2" width="1.6" height="7.6" rx="0.8" fill="#475569" fillOpacity="0.65" />
    <path
      d="M9.5 4.2C9.5 3.54 10.04 3 10.7 3H13.3C13.96 3 14.5 3.54 14.5 4.2V5.5H19C19.55 5.5 20 5.95 20 6.5C20 7.05 19.55 7.5 19 7.5H5C4.45 7.5 4 7.05 4 6.5C4 5.95 4.45 5.5 5 5.5H9.5V4.2Z"
      fill="url(#winTrashLid)"
    />
  </svg>
);

export const NavShortcutsIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="winKeyBase" x1="2" y1="5" x2="22" y2="19" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#A78BFA" />
        <stop offset="100%" stopColor="#6D28D9" />
      </linearGradient>
    </defs>
    <rect x="2.5" y="5" width="19" height="14" rx="3.2" fill="url(#winKeyBase)" />
    <rect x="5" y="8" width="2.6" height="2.4" rx="0.7" fill="#FFFFFF" fillOpacity="0.9" />
    <rect x="8.8" y="8" width="2.6" height="2.4" rx="0.7" fill="#FFFFFF" fillOpacity="0.9" />
    <rect x="12.6" y="8" width="2.6" height="2.4" rx="0.7" fill="#FFFFFF" fillOpacity="0.9" />
    <rect x="16.4" y="8" width="2.6" height="2.4" rx="0.7" fill="#DDD6FE" />
    <rect x="5" y="11.8" width="3.5" height="2.4" rx="0.7" fill="#DDD6FE" />
    <rect x="9.6" y="11.8" width="2.6" height="2.4" rx="0.7" fill="#FFFFFF" fillOpacity="0.9" />
    <rect x="13.3" y="11.8" width="5.7" height="2.4" rx="0.7" fill="#FFFFFF" fillOpacity="0.9" />
    <rect x="7" y="15.4" width="10" height="2" rx="0.9" fill="#FFFFFF" fillOpacity="0.85" />
  </svg>
);

export const NavSettingsIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="winGearOuter" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#CBD5E1" />
        <stop offset="100%" stopColor="#64748B" />
      </linearGradient>
      <linearGradient id="winGearInner" x1="8" y1="8" x2="16" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
    </defs>
    <path
      d="M10.3 2.7C10.5 2.28 10.92 2 11.38 2H12.62C13.08 2 13.5 2.28 13.7 2.7L14.2 3.82C14.7 3.96 15.17 4.16 15.62 4.41L16.75 3.95C17.18 3.77 17.68 3.87 18.01 4.2L18.89 5.08C19.22 5.41 19.32 5.91 19.14 6.34L18.68 7.47C18.93 7.92 19.13 8.39 19.27 8.89L20.39 9.39C20.81 9.59 21.09 10.01 21.09 10.47V11.71C21.09 12.17 20.81 12.59 20.39 12.79L19.27 13.29C19.13 13.79 18.93 14.26 18.68 14.71L19.14 15.84C19.32 16.27 19.22 16.77 18.89 17.1L18.01 17.98C17.68 18.31 17.18 18.41 16.75 18.23L15.62 17.77C15.17 18.02 14.7 18.22 14.2 18.36L13.7 19.48C13.5 19.9 13.08 20.18 12.62 20.18H11.38C10.92 20.18 10.5 19.9 10.3 19.48L9.8 18.36C9.3 18.22 8.83 18.02 8.38 17.77L7.25 18.23C6.82 18.41 6.32 18.31 5.99 17.98L5.11 17.1C4.78 16.77 4.68 16.27 4.86 15.84L5.32 14.71C5.07 14.26 4.87 13.79 4.73 13.29L3.61 12.79C3.19 12.59 2.91 12.17 2.91 11.71V10.47C2.91 10.01 3.19 9.59 3.61 9.39L4.73 8.89C4.87 8.39 5.07 7.92 5.32 7.47L4.86 6.34C4.68 5.91 4.78 5.41 5.11 5.08L5.99 4.2C6.32 3.87 6.82 3.77 7.25 3.95L8.38 4.41C8.83 4.16 9.3 3.96 9.8 3.82L10.3 2.7Z"
      transform="translate(0 0.9)"
      fill="url(#winGearOuter)"
    />
    <circle cx="12" cy="12" r="4" fill="url(#winGearInner)" />
    <circle cx="12" cy="12" r="1.8" fill="#0F172A" fillOpacity="0.6" />
  </svg>
);

export const NavDocsIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="winDocsPage" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
    </defs>
    <path
      d="M5 4.5C5 3.12 6.12 2 7.5 2H14.5L19.5 7V19.5C19.5 20.88 18.38 22 17 22H7.5C6.12 22 5 20.88 5 19.5V4.5Z"
      fill="url(#winDocsPage)"
    />
    <path d="M14.5 2V6C14.5 6.55 14.95 7 15.5 7H19.5L14.5 2Z" fill="#BFDBFE" />
    <rect x="8" y="10.2" width="8" height="1.8" rx="0.9" fill="#FFFFFF" fillOpacity="0.92" />
    <rect x="8" y="13.6" width="8" height="1.8" rx="0.9" fill="#FFFFFF" fillOpacity="0.85" />
    <rect x="8" y="17" width="5.2" height="1.8" rx="0.9" fill="#FFFFFF" fillOpacity="0.78" />
  </svg>
);
