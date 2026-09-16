import aeroNexusLogo from "@/assets/logos/aeronexus-logo.svg";

/**
 * AeroNexus official brand logo asset component
 */
export const AeroLogo = ({ className = "w-6 h-6", size = 24 }) => {
  return (
    <img
      src={aeroNexusLogo}
      alt="AeroNexus"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
    />
  );
};

export default AeroLogo;
