import type { SVGProps } from 'react';

const baseIconProps: SVGProps<SVGSVGElement> = {
  width: 14,
  height: 14,
  viewBox: '0 0 14 14',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
};

export const PlusIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseIconProps} {...props}>
    <path
      d="M7 2.1v9.8M2.1 7h9.8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const EditIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseIconProps} {...props}>
    <path
      d="M3.304 8.66l1.607-.323L9.43 3.818a1.04 1.04 0 00-1.47-1.47L3.44 6.87l-.136 1.79zM2.5 11.5h9"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const TrashIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseIconProps} {...props}>
    <path
      d="M4.5 4.5v5.25M7 4.5v5.25m2.5-5.25v5.25M2.75 4.5h8.5m-6.125-1.75h3.75c.483 0 .875.392.875.875V4H3V3.625c0-.483.392-.875.875-.875zm6.75 1.75v6.562c0 .483-.392.875-.875.875H3.125a.875.875 0 01-.875-.875V4.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CloseIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseIconProps} {...props}>
    <path d="M3.1 3.1l7.8 7.8M10.9 3.1l-7.8 7.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const largeIconProps: SVGProps<SVGSVGElement> = {
  width: 18,
  height: 18,
  viewBox: '0 0 20 20',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
};

export const PlusCircleIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...largeIconProps} {...props}>
    <circle cx={10} cy={10} r={7.25} stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6.25v7.5M6.25 10h7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const NetworkIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...largeIconProps} {...props}>
    <circle cx={10} cy={4.5} r={2.25} stroke="currentColor" strokeWidth="1.4" />
    <circle cx={5} cy={13} r={2.1} stroke="currentColor" strokeWidth="1.4" />
    <circle cx={15} cy={13} r={2.1} stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M8.6 6.4l-2 3.4m4.8-3.4l2 3.4M7.1 13h5.8"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PaletteIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...largeIconProps} {...props}>
    <path
      d="M10 3c-3.866 0-7 2.675-7 5.977 0 2.115 1.46 3.577 3.498 3.577.806 0 1.452.57 1.452 1.387 0 .64.486 1.059 1.17 1.059 3.167 0 6.38-2.604 6.38-6.281C15.5 5.69 12.96 3 10 3z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <circle cx={7.4} cy={6.6} r={0.8} fill="currentColor" />
    <circle cx={10} cy={6} r={0.8} fill="currentColor" />
    <circle cx={12.2} cy={8} r={0.8} fill="currentColor" />
    <circle cx={8.4} cy={9.2} r={0.8} fill="currentColor" />
  </svg>
);

export const SettingsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...largeIconProps} {...props}>
    <path
      d="M10 7.1a2.9 2.9 0 110 5.8 2.9 2.9 0 010-5.8z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path
      d="M4.3 8.7l-1.6-.9M4.3 11.3l-1.6.9M15.7 8.7l1.6-.9M15.7 11.3l1.6.9M10 4.1V2.5M7 5l-.6-1.7M13 5l.6-1.7M10 17.5v-1.6M7 15l-.6 1.7M13 15l.6 1.7"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);
