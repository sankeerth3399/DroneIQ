import { ChevronDown } from "lucide-react"

/**
 * GcsSelect: Reusable accessible GCS dropdown select.
 * Follows SRP and LSP.
 */
export const GcsSelect = ({
  id,
  label,
  options = [],
  className = "",
  containerClassName = "",
  ...props
}) => {
  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={id}
          className="block text-[13px] font-medium text-[var(--gcs-text-label)] mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={id}
          className={`gcs-select ${className}`}
          {...props}
        >
          {options.map((opt) => {
            const isObject = typeof opt === "object" && opt !== null
            const val = isObject ? opt.value : opt
            const lbl = isObject ? opt.label : opt

            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            )
          })}
        </select>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
      </div>
    </div>
  )
}

export default GcsSelect
