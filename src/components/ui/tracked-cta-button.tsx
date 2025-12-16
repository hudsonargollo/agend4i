import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useCTAFeedback } from '../../hooks/useCTAFeedback';
import { CTAInteractionData } from '../../lib/conversion-tracking';
import { cn } from '../../lib/utils';

export interface TrackedCTAButtonProps {
  children: React.ReactNode;
  href?: string;
  to?: string;
  onClick?: () => Promise<void> | void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  ctaData: CTAInteractionData;
  showIcon?: boolean;
  feedbackOptions?: {
    successMessage?: string;
    errorMessage?: string;
    loadingDuration?: number;
  };
}

/**
 * Enhanced CTA button with conversion tracking and smooth feedback
 */
export const TrackedCTAButton: React.FC<TrackedCTAButtonProps> = ({
  children,
  href,
  to,
  onClick,
  variant = 'primary',
  size = 'md',
  className,
  disabled = false,
  ctaData,
  showIcon = true,
  feedbackOptions
}) => {
  const { feedbackState, handleCTAClick } = useCTAFeedback(feedbackOptions);

  const baseClasses = cn(
    'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 transform',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-green/50',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
    {
      // Primary variant
      'bg-neon-green text-brand-dark hover:bg-neon-green/90 hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-neon-green/25': 
        variant === 'primary',
      
      // Secondary variant  
      'border-2 border-glass-surface text-white hover:border-neon-green hover:text-neon-green hover:shadow-lg hover:shadow-neon-green/10': 
        variant === 'secondary',
      
      // Size variants
      'px-4 py-2 text-sm rounded-lg': size === 'sm',
      'px-6 py-3 text-base rounded-xl': size === 'md',
      'px-8 py-4 text-lg rounded-2xl': size === 'lg',
      
      // State variants
      'animate-pulse': feedbackState.isLoading,
      'bg-green-500 text-white': feedbackState.isSuccess && variant === 'primary',
      'bg-red-500 text-white': feedbackState.isError && variant === 'primary',
      'border-green-500 text-green-500': feedbackState.isSuccess && variant === 'secondary',
      'border-red-500 text-red-500': feedbackState.isError && variant === 'secondary'
    },
    className
  );

  const handleClick = async (e: React.MouseEvent) => {
    if (disabled || feedbackState.isLoading) {
      e.preventDefault();
      return;
    }

    // For external links, handle differently
    if (href && !href.startsWith('/')) {
      e.preventDefault();
      await handleCTAClick(
        { ...ctaData, targetUrl: href },
        async () => {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      );
      return;
    }

    // For internal navigation or custom actions
    if (onClick || to) {
      e.preventDefault();
      await handleCTAClick(
        { ...ctaData, targetUrl: to || href },
        onClick
      );
      
      // Navigate after successful tracking
      if (to && !feedbackState.isError) {
        setTimeout(() => {
          window.location.href = to;
        }, 300);
      }
    }
  };

  const renderIcon = () => {
    if (!showIcon) return null;

    if (feedbackState.isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    
    if (feedbackState.isSuccess) {
      return <CheckCircle className="w-4 h-4" />;
    }
    
    if (feedbackState.isError) {
      return <AlertCircle className="w-4 h-4" />;
    }

    return <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />;
  };

  const renderContent = () => {
    if (feedbackState.message) {
      return feedbackState.message;
    }
    return children;
  };

  // For external links
  if (href && !href.startsWith('/')) {
    return (
      <a
        href={href}
        className={cn(baseClasses, 'group')}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={disabled || feedbackState.isLoading}
      >
        {renderContent()}
        {renderIcon()}
      </a>
    );
  }

  // For internal navigation
  if (to) {
    return (
      <Link
        to={to}
        className={cn(baseClasses, 'group')}
        onClick={handleClick}
        aria-disabled={disabled || feedbackState.isLoading}
      >
        {renderContent()}
        {renderIcon()}
      </Link>
    );
  }

  // For button with custom action
  return (
    <button
      type="button"
      className={cn(baseClasses, 'group')}
      onClick={handleClick}
      disabled={disabled || feedbackState.isLoading}
      aria-label={typeof children === 'string' ? children : 'CTA Button'}
    >
      {renderContent()}
      {renderIcon()}
    </button>
  );
};

/**
 * Preset CTA buttons for common use cases
 */
export const PrimaryCTAButton: React.FC<Omit<TrackedCTAButtonProps, 'variant' | 'ctaData'> & { ctaLocation: string }> = ({
  ctaLocation,
  ...props
}) => (
  <TrackedCTAButton
    {...props}
    variant="primary"
    ctaData={{
      ctaType: 'primary',
      ctaText: typeof props.children === 'string' ? props.children : 'Primary CTA',
      ctaLocation,
      targetUrl: props.to || props.href,
      conversionFunnel: 'main_signup'
    }}
  />
);

export const SecondaryCTAButton: React.FC<Omit<TrackedCTAButtonProps, 'variant' | 'ctaData'> & { ctaLocation: string }> = ({
  ctaLocation,
  ...props
}) => (
  <TrackedCTAButton
    {...props}
    variant="secondary"
    ctaData={{
      ctaType: 'secondary',
      ctaText: typeof props.children === 'string' ? props.children : 'Secondary CTA',
      ctaLocation,
      targetUrl: props.to || props.href,
      conversionFunnel: 'secondary_engagement'
    }}
  />
);