import React from 'react';
import { Check } from 'lucide-react';
import { BadgeType } from '../../types';

interface VerifiedBadgeProps {
  badgeType?: BadgeType;
  isVerified?: boolean;
  isBusiness?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  badgeType,
  isVerified,
  isBusiness,
  size = 'sm',
  className = '',
  showTooltip = true
}) => {
  // Determine effective badge type
  let effectiveBadge: BadgeType = 'none';
  if (badgeType && badgeType !== 'none') {
    effectiveBadge = badgeType;
  } else if (isBusiness) {
    effectiveBadge = 'business_blue';
  } else if (isVerified) {
    effectiveBadge = 'creator_purple';
  }

  if (effectiveBadge === 'none') return null;

  const sizeClasses = {
    xs: 'w-3 h-3 text-[7px]',
    sm: 'w-3.5 h-3.5 text-[8px]',
    md: 'w-4 h-4 text-[9px]',
    lg: 'w-5 h-5 text-[10px]'
  }[size];

  const iconSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  }[size];

  if (effectiveBadge === 'business_blue') {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-[#1D9BF0] text-white shadow-[0_0_8px_rgba(29,155,240,0.6)] ${sizeClasses} ${className}`}
        title={showTooltip ? 'Verified Official Business' : undefined}
      >
        <Check className={`${iconSizes} stroke-[3.5] text-white`} />
      </span>
    );
  }

  // Creator Purple (#8A2BE2)
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[#8A2BE2] text-white shadow-[0_0_10px_rgba(138,43,226,0.7)] ${sizeClasses} ${className}`}
      title={showTooltip ? 'Verified Creator' : undefined}
    >
      <Check className={`${iconSizes} stroke-[3.5] text-white`} />
    </span>
  );
};
