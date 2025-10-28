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
