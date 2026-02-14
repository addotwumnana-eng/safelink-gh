import { motion } from 'framer-motion'

function ELevyToggle({ checked, onChange, size = 'md' }) {
  const dims = size === 'sm'
    ? { track: 'w-11 h-6', knob: 'w-5 h-5', pad: 'p-0.5' }
    : { track: 'w-12 h-7', knob: 'w-6 h-6', pad: 'p-0.5' }

  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex ${dims.track} ${dims.pad} items-center rounded-full border transition-colors ${
        checked ? 'bg-ghana-gold/20 border-ghana-gold/40' : 'bg-charcoal/50 border-gray-700'
      }`}
      aria-pressed={checked}
      aria-label="Toggle E‑Levy estimate"
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`${dims.knob} rounded-full ${
          checked ? 'bg-ghana-gold' : 'bg-gray-500'
        }`}
        style={{ marginLeft: checked ? 'auto' : 0 }}
      />
    </button>
  )
}

export default ELevyToggle

