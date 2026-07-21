import { forwardRef, InputHTMLAttributes } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const fieldId = id || props.name;
    return (
      <label className="form-field" htmlFor={fieldId}>
        <span>{label}</span>
        <input
          ref={ref}
          id={fieldId}
          className={className}
          aria-invalid={Boolean(error)}
          aria-describedby={error && fieldId ? `${fieldId}-error` : undefined}
          {...props}
        />
        {error && <small id={fieldId ? `${fieldId}-error` : undefined}>{error}</small>}
      </label>
    );
  },
);

TextField.displayName = 'TextField';
