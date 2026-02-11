import { useState, useEffect, useRef } from 'react';
import { ANIMATION_DURATION } from '../constants/animation';

interface UseAnimatedNumberOptions {
  duration?: number;
  decimals?: number;
}

export function useAnimatedNumber(
  targetValue: number,
  options: UseAnimatedNumberOptions = {}
): number {
  const { duration = ANIMATION_DURATION, decimals = 0 } = options;
  const [displayValue, setDisplayValue] = useState(targetValue);
  const previousValue = useRef(targetValue);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = targetValue;
    const startTime = performance.now();

    if (startValue === endValue) return;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (endValue - startValue) * easeOut;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration]);

  // Round to specified decimals
  const multiplier = Math.pow(10, decimals);
  return Math.round(displayValue * multiplier) / multiplier;
}

// Component version for easier use in JSX
interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  formatter?: (value: number) => string;
}

export function AnimatedNumber({
  value,
  duration = ANIMATION_DURATION,
  decimals = 0,
  formatter
}: AnimatedNumberProps): JSX.Element {
  const animatedValue = useAnimatedNumber(value, { duration, decimals });
  const displayText = formatter ? formatter(animatedValue) : animatedValue.toString();

  return <>{displayText}</>;
}
