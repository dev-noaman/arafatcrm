interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  maxDigits?: number;
}

export function PhoneInput({ label, value, onChange, required, error, maxDigits = 8 }: PhoneInputProps) {
  const localNumber = value.replace(/^\+974\s?/, "");
  const digits = localNumber.replace(/\D/g, "");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, maxDigits);
    onChange(raw ? `+974 ${raw}` : "");
  };

  const isValid = digits.length === 0 || digits.length === maxDigits;
  const showError = error || (!isValid && digits.length > 0);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="flex">
        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-sm text-gray-700 select-none">
          <svg width="22" height="15" viewBox="0 0 44 30" className="flex-shrink-0">
            <rect width="44" height="30" fill="#8A1538" />
            <polygon points="0,0 10,0 14,3.33 10,6.67 14,10 10,13.33 14,16.67 10,20 14,23.33 10,26.67 14,30 0,30" fill="#FFFFFF" />
          </svg>
          +974
        </span>
        <input
          type="tel"
          value={digits}
          onChange={handleChange}
          placeholder={maxDigits === 6 ? "XXXXXX" : "4XXX XXXX"}
          maxLength={maxDigits}
          className={`flex-1 min-w-0 rounded-r-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            showError ? "border-red-300 focus:ring-red-500" : "border-gray-300"
          }`}
        />
      </div>
      {showError && (
        <p className="mt-1 text-xs text-red-600">
          {error || `Enter a valid ${maxDigits}-digit Qatar number`}
        </p>
      )}
    </div>
  );
}
