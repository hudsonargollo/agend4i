import { useState, useCallback } from 'react';
import { useCTATracking, CTAInteractionData } from '../lib/conversion-tracking';

export interface CTAFeedbackState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  message?: string;
}

export interface CTAFeedbackOptions {
  successMessage?: string;
  errorMessage?: string;
  loadingDuration?: number;
  successDuration?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for providing smooth feedback on CTA interactions
 * Handles loading states, success feedback, and conversion tracking
 */
export const useCTAFeedback = (options: CTAFeedbackOptions = {}) => {
  const {
    successMessage = 'Redirecionando...',
    errorMessage = 'Algo deu errado. Tente novamente.',
    loadingDuration = 800,
    successDuration = 1200,
    onSuccess,
    onError
  } = options;

  const [feedbackState, setFeedbackState] = useState<CTAFeedbackState>({
    isLoading: false,
    isSuccess: false,
    isError: false
  });

  const { trackCTA, trackFunnel } = useCTATracking();

  const handleCTAClick = useCallback(async (
    ctaData: CTAInteractionData,
    action?: () => Promise<void> | void
  ) => {
    try {
      // Set loading state
      setFeedbackState({
        isLoading: true,
        isSuccess: false,
        isError: false,
        message: 'Carregando...'
      });

      // Track the CTA interaction
      await trackCTA(ctaData);

      // Track funnel progression
      trackFunnel('cta_clicked', ctaData.conversionFunnel, {
        cta_type: ctaData.ctaType,
        cta_location: ctaData.ctaLocation
      });

      // Simulate loading for smooth UX
      await new Promise(resolve => setTimeout(resolve, loadingDuration));

      // Execute the action if provided
      if (action) {
        await action();
      }

      // Set success state
      setFeedbackState({
        isLoading: false,
        isSuccess: true,
        isError: false,
        message: successMessage
      });

      // Track successful interaction
      trackFunnel('cta_success', ctaData.conversionFunnel);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Clear success state after duration
      setTimeout(() => {
        setFeedbackState({
          isLoading: false,
          isSuccess: false,
          isError: false
        });
      }, successDuration);

    } catch (error) {
      // Set error state
      setFeedbackState({
        isLoading: false,
        isSuccess: false,
        isError: true,
        message: errorMessage
      });

      // Track error
      trackFunnel('cta_error', ctaData.conversionFunnel, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Call error callback
      if (onError && error instanceof Error) {
        onError(error);
      }

      // Clear error state after duration
      setTimeout(() => {
        setFeedbackState({
          isLoading: false,
          isSuccess: false,
          isError: false
        });
      }, successDuration);
    }
  }, [trackCTA, trackFunnel, loadingDuration, successDuration, successMessage, errorMessage, onSuccess, onError]);

  const resetFeedback = useCallback(() => {
    setFeedbackState({
      isLoading: false,
      isSuccess: false,
      isError: false
    });
  }, []);

  return {
    feedbackState,
    handleCTAClick,
    resetFeedback
  };
};

/**
 * Hook for tracking scroll-based engagement
 */
export const useScrollTracking = () => {
  const { trackEngagement } = useCTATracking();

  const trackScrollDepth = useCallback((depth: number) => {
    const milestones = [25, 50, 75, 90, 100];
    const milestone = milestones.find(m => depth >= m && depth < m + 5);
    
    if (milestone) {
      trackEngagement(`scroll_${milestone}`, 'engagement', milestone);
    }
  }, [trackEngagement]);

  const trackTimeOnPage = useCallback((seconds: number) => {
    const milestones = [30, 60, 120, 300]; // 30s, 1m, 2m, 5m
    const milestone = milestones.find(m => seconds >= m && seconds < m + 5);
    
    if (milestone) {
      trackEngagement(`time_on_page_${milestone}s`, 'engagement', milestone);
    }
  }, [trackEngagement]);

  return {
    trackScrollDepth,
    trackTimeOnPage
  };
};