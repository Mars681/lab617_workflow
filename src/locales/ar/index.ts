import { common } from './common';
import { chat } from './chat';
import { workflow } from './workflow';
import { writer } from './writer';

export const ar = {
  ...common,
  ...chat,
  ...workflow,
  ...writer
};
