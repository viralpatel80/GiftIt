'use client'
import { useState } from 'react'

export const COUNTRIES = [
  { code: 'IN', dial: '91',  flag: '🇮🇳', name: 'India' },
  { code: 'US', dial: '1',   flag: '🇺🇸', name: 'USA' },
  { code: 'GB', dial: '44',  flag: '🇬🇧', name: 'UK' },
  { code: 'CA', dial: '1',   flag: '🇨🇦', name: 'Canada' },
  { code: 'AU', dial: '61',  flag: '🇦🇺', name: 'Australia' },
  { code: 'SG', dial: '65',  flag: '🇸🇬', name: 'Singapore' },
  { code: 'MY', dial: '60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: 'NZ', dial: '64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: 'AE', dial: '971', flag: '🇦🇪', name: 'UAE' },
  { code: 'SA', dial: '966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: 'KW', dial: '965', flag: '🇰🇼', name: 'Kuwait' },
  { code: 'QA', dial: '974', flag: '🇶🇦', name: 'Qatar' },
  { code: 'BH', dial: '973', flag: '🇧🇭', name: 'Bahrain' },
  { code: 'OM', dial: '968', flag: '🇴🇲', name: 'Oman' },
  { code: 'ZA', dial: '27',  flag: '🇿🇦', name: 'South Africa' },
  { code: 'DE', dial: '49',  flag: '🇩🇪', name: 'Germany' },
  { code: 'NL', dial: '31',  flag: '🇳🇱', name: 'Netherlands' },
  { code: 'SE', dial: '46',  flag: '🇸🇪', name: 'Sweden' },
  { code: 'JP', dial: '81',  flag: '🇯🇵', name: 'Japan' },
  { code: 'KR', dial: '82',  flag: '🇰🇷', name: 'South Korea' },
  { code: 'HK', dial: '852', flag: '🇭🇰', name: 'Hong Kong' },
]

interface Props {
  value: string           // local number only (no country code)
  dialCode: string        // e.g. "91"
  onChange: (local: string, dial: string) => void
  onEnter?: () => void
  placeholder?: string
  inputStyle?: React.CSSProperties
}

export default function PhoneInput({ value, dialCode, onChange, onEnter, placeholder, inputStyle }: Props) {
  const [open, setOpen] = useState(false)
  const selected = COUNTRIES.find(c => c.dial === dialCode) ?? COUNTRIES[0]

  const base: React.CSSProperties = {
    background: '#fff', border: '1px solid #E5E0D8',
    borderRadius: '8px', fontSize: '14px', color: '#1A1A1A', outline: 'none',
    ...inputStyle,
  }

  return (
    <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
      {/* Country picker button */}
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ ...base, padding: '11px 12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', background: '#F7F4F0' }}>
        <span style={{ fontSize: '16px' }}>{selected.flag}</span>
        <span style={{ fontSize: '13px', color: '#555', fontWeight: 600 }}>+{selected.dial}</span>
        <span style={{ fontSize: '10px', color: '#AAA' }}>▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: '#fff', border: '1px solid #E5E0D8', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '220px', maxHeight: '260px', overflowY: 'auto', marginTop: '4px' }}>
          {COUNTRIES.map(c => (
            <button key={c.code} type="button"
              onClick={() => { onChange(value, c.dial); setOpen(false) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: c.dial === dialCode ? '#FFF8E7' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: '16px' }}>{c.flag}</span>
              <span style={{ fontSize: '13px', color: '#1A1A1A', flex: 1 }}>{c.name}</span>
              <span style={{ fontSize: '12px', color: '#888' }}>+{c.dial}</span>
            </button>
          ))}
        </div>
      )}

      {/* Phone number input */}
      <input
        type="tel"
        placeholder={placeholder ?? '9876543210'}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, ''), dialCode)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        style={{ ...base, flex: 1, padding: '11px 14px', boxSizing: 'border-box' }}
      />
    </div>
  )
}

/** Returns the full international number (digits only, no +) e.g. "919876543210" */
export function fullPhone(dial: string, local: string): string {
  return `${dial}${local.replace(/\D/g, '')}`
}
