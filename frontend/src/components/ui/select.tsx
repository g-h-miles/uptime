import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

const Select = ({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-10 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
    </div>
  );
};

const SelectValue = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
const SelectTrigger = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
const SelectContent = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);
const SelectItem = ({
  className,
  children,
  ...props
}: React.OptionHTMLAttributes<HTMLOptionElement>) => {
  return (
    <option className={cn('', className)} {...props}>
      {children}
    </option>
  );
};

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };
