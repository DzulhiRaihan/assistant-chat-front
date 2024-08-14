import { Message } from './message_model';

export type Room = {
  id: string;
  name: string;
  messages?: Message[];
};
