// Mock for chalk ESM module
const identity = (str: string): string => str;

const chalk = {
  green: identity,
  red: identity,
  yellow: identity,
  cyan: identity,
  gray: identity,
  white: identity,
  bold: identity,
};

export default chalk;
