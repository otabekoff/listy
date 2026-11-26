import React from "react";

interface ListyLogoProps {
  size?: number;
}

export const ListyLogo: React.FC<ListyLogoProps> = ({ size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block", flexShrink: 0 }}
  >
    <rect width="32" height="32" rx="8" fill="#0067C0" />
    <path
      d="M8.5 11.2L10.3 13L13.6 9.5"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.5 11.2H23.5"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <circle cx="10.2" cy="17.2" r="1.4" fill="#FFFFFF" />
    <path
      d="M16.5 17.2H23.5"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <circle cx="10.2" cy="22.4" r="1.4" fill="#FFFFFF" />
    <path
      d="M16.5 22.4H21.2"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);
