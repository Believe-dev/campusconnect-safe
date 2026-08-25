import { useEffect, useState } from 'react';

export const useImagePriority = (index: number, threshold: number = 3) => {
  const [isPriority, setIsPriority] = useState(index < threshold);

  useEffect(() => {
    // Above-the-fold images should load eagerly
    setIsPriority(index < threshold);
  }, [index, threshold]);

  return isPriority;
};