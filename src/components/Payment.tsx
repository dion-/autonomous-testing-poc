import type { FormData } from "../hooks/useFormState";
import { isValidCardNumber, isValidCvv, isValidExpiry } from "../utils/validators";

interface PaymentProps {
  data: FormData["payment"];
  onChange: (field: keyof FormData["payment"], value: string) => void;
}

function InputRow({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  maxLength,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  error: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400
          outline-none transition-colors
          ${
            error && value !== ""
              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
              : "border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          }
          ${error && value === "" ? "border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100" : ""}
        `}
      />
      {error && value !== "" && (
        <p className="text-xs text-red-500">Please enter a valid {label.toLowerCase()}.</p>
      )}
    </div>
  );
}

export function Payment({ data, onChange }: PaymentProps) {
  const errors = {
    cardNumber: !isValidCardNumber(data.cardNumber),
    expiry: !isValidExpiry(data.expiry),
    cvv: !isValidCvv(data.cvv),
  };

  return (
    <fieldset className="space-y-5">
      <legend className="sr-only">Payment Information</legend>
      <InputRow
        id="cardNumber"
        label="Card Number"
        value={data.cardNumber}
        onChange={(v) => onChange("cardNumber", v)}
        error={errors.cardNumber}
        placeholder="1234 5678 9012 3456"
        maxLength={19}
      />
      <div className="grid grid-cols-2 gap-5">
        <InputRow
          id="expiry"
          label="Expiry (MM/YY)"
          value={data.expiry}
          onChange={(v) => onChange("expiry", v)}
          error={errors.expiry}
          placeholder="12/25"
          maxLength={5}
        />
        <InputRow
          id="cvv"
          label="CVV"
          value={data.cvv}
          onChange={(v) => onChange("cvv", v)}
          error={errors.cvv}
          placeholder="123"
          maxLength={4}
        />
      </div>
    </fieldset>
  );
}
