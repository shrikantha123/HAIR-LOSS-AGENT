import React from 'react';
import * as Icons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name?: string;
  className?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className = 'w-5 h-5', ...props }) => {
  if (!name) {
    return <Icons.Sparkles className={className} {...props} />;
  }

  // Find icon by name safely
  const IconComponent = (Icons as unknown as Record<string, React.FC<LucideProps>>)[name];

  if (!IconComponent) {
    return <Icons.Sparkles className={className} {...props} />;
  }

  return <IconComponent className={className} {...props} />;
};
