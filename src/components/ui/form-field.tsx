/** ApexChain Network Operations Intelligence Platform */
"use client";

interface FormFieldErrorProps {
  id: string;
  error?: string;
}

export function FormFieldError({ id, error }: FormFieldErrorProps) {
  if (!error) return null;

  return (
    <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-600">
      {error}
    </p>
  );
}

interface FormFieldProps {
  label: string;
  id: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({ label, id, error, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      <div aria-describedby={error ? `${id}-error` : undefined} aria-invalid={!!error}>
        {children}
      </div>
      <FormFieldError id={id} error={error} />
    </div>
  );
}
