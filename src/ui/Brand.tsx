import logoLight from '../assets/brand/mirabi-logo-light.svg'
import logoDark from '../assets/brand/mirabi-logo-dark.svg'
import brandIcon from '../assets/brand/mirabi-icon.svg'

export function MirabiBrand({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={'mirabi-brand' + (compact ? ' mirabi-brand--compact' : '')}
      role="img"
      aria-label="Mirabi"
    >
      {compact ? (
        <img
          src={brandIcon}
          className="brand-symbol"
          width={512}
          height={512}
          alt=""
        />
      ) : (
        <>
          <img
            src={logoLight}
            className="brand-logo brand-logo--light"
            width={1876}
            height={466}
            alt=""
          />
          <img
            src={logoDark}
            className="brand-logo brand-logo--dark"
            width={1876}
            height={466}
            alt=""
          />
        </>
      )}
    </span>
  )
}

/** Decorative landscape: all learning content continues to come from the catalog. */
export function JourneyScene({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 460 360"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="330" cy="106" r="73" fill="currentColor" opacity=".08" />
      <circle cx="330" cy="106" r="42" fill="currentColor" opacity=".12" />
      <path d="m114 284 147-173 129 173" fill="currentColor" opacity=".09" />
      <path
        d="m225 154 36-43 33 44-20-7-14 9-15-11-20 8Z"
        fill="currentColor"
        opacity=".45"
      />
      <path
        d="M0 277c59-31 118-39 188-7s128-18 272-35v125H0Z"
        fill="currentColor"
        opacity=".07"
      />
      <path
        d="M0 311c124-57 245 22 460-48v97H0Z"
        fill="currentColor"
        opacity=".07"
      />
      <path
        d="M230 360c-37-46-118-39-123-76-3-27 82-42 134-46"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="6 10"
        opacity=".3"
      />
      <g
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        opacity=".65"
      >
        <path d="M53 224h117M65 247h93M78 226v70M145 226v70" />
        <path d="M50 219q62 12 123 0" strokeWidth="7" />
      </g>
      <g fill="currentColor" opacity=".45">
        <ellipse
          cx="155"
          cy="77"
          rx="6"
          ry="3"
          transform="rotate(-32 155 77)"
        />
        <ellipse
          cx="394"
          cy="176"
          rx="6"
          ry="3"
          transform="rotate(24 394 176)"
        />
        <ellipse cx="215" cy="53" rx="4" ry="2" />
        <ellipse cx="85" cy="158" rx="5" ry="3" />
      </g>
      <path
        d="M27 116h85M365 69h58M344 192h78"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".18"
      />
    </svg>
  )
}
