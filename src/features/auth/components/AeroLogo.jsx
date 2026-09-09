/**
 * AeroNexus stacked diamond isometric logo matching the reference design.
 */
export const AeroLogo = ({ className = "w-6 h-6 text-[#22D3EE]", size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top isometric diamond layer */}
      <polygon
        points="12,2.8 21.2,6.8 12,10.8 2.8,6.8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Middle isometric layer chevron */}
      <path
        d="M2.8 11.6L12 15.6L21.2 11.6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Bottom isometric layer chevron */}
      <path
        d="M2.8 16.4L12 20.4L21.2 16.4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export default AeroLogo
