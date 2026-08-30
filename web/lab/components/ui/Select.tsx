import { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <span className="select-control">
      <select {...props} className={`styled-select ${className}`.trim()}>
        {children}
      </select>
      <ChevronDown className="select-chevron" size={16} aria-hidden="true" />
    </span>
  );
}
