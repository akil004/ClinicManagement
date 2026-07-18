import { useState, useEffect } from 'react';

/**
 * useDebounce — delays updating a value until the user stops typing.
 *
 * @param {*}      value  Input value to debounce
 * @param {number} delay  Debounce delay in ms (default 300)
 * @returns {*}           Debounced value
 */
const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebounce;
