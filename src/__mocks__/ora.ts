// Mock for ora ESM module
interface MockSpinner {
  start: () => MockSpinner;
  stop: () => MockSpinner;
  succeed: (text?: string) => MockSpinner;
  fail: (text?: string) => MockSpinner;
  info: (text?: string) => MockSpinner;
  text: string;
}

function ora(_options?: string | object): MockSpinner {
  const spinner: MockSpinner = {
    text: '',
    start: () => spinner,
    stop: () => spinner,
    succeed: () => spinner,
    fail: () => spinner,
    info: () => spinner,
  };
  return spinner;
}

export default ora;
