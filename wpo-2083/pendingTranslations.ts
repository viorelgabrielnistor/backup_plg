export const PENDING_TRANSLATIONS_POLING_TIME = Number.parseInt(process.env.REACT_APP_PENDING_TRANSLATIONS_POLING_TIME!, 10);

export enum REASSIGN_RESULT {
  NON_ASSIGNABLE = 'nonassignable',
  FORBIDDEN = 'forbidden',
  CLOSED = 'closed',
}

export enum SLA_STATUS {
  IN_PROGRESS = 'inProgress',
  ABOUT_TO_EXPIRE = 'aboutToExpire',
  EXPIRED = 'expired',
}

export const ABANDON_CONFIRMATION_TEXT = 'iamsure';
