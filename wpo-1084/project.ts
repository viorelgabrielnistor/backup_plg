export enum WORKFLOWS {
  SUPERVISED = 'supervised',
  UNSUPERVISED = 'unsupervised',
}

export enum PROJECT_TYPES {
  CASE = 'case',
  CHAT = 'chat'
}

export enum REASSIGN_LOGIC {
  NONE = 'none',
  LOWEST_WORKLOAD = 'lowestWorkload',
  LAST_CONNECTED = 'lastConnected',
  ANY = 'any'
}

export enum NOTIFICATION_TYPES {
  NONE = 'none',
  EVERY_NEW_TICKET = 'new',
  EVERY_X_MINUTES = 'repeated'
}

export enum REMINDER_TYPES {
  NONE = 'none',
  EVERY_X_MINUTES = 'repeated'
}

export enum MANDATORY_TICKET_DETAILS {
  NUMBER = 'number',
  URL = 'url'
}

export enum FORMALITY_TYPES {
  DEFAULT = 'default',
  MORE = 'more',
  LESS = 'less'
}

export enum WEEK_DAYS {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday'
}

export const DEFAULT_FORMALITY = { label: '', value: FORMALITY_TYPES.DEFAULT };
export const PROJECT_TYPE = 'project_type';
export const SELECTED_PROJECT = 'selected_project';
