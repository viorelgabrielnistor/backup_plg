import { WEEK_DAYS, WORKFLOWS } from '../constants/project';
import { padTimeLeft } from '../helpers';
import { formatToTime } from '../helpers/formatForFields';

export interface IWorkingSchedule {
  day: string;
  startDate: string | null;
  endDate: string | null;
  isOn: boolean;
}

export interface IAgentWorkingSchedule {
  day: string;
  startDate: string | null;
  endDate: string | null;
  isOn: boolean;
}

export interface IWorkingScheduleValues {
  day: string;
  startDate: Date | null;
  endDate: Date | null;
  isOn: boolean;
}

export interface IAgentWorkingScheduleValues {
  day: string;
  startDate: Date | null;
  endDate: Date | null;
  isOn: boolean;
}

export interface IProjectSla {
  id?: string;
  timeLimit: number;
  workingSchedule: IWorkingSchedule[];
  // agentWorkingSchedule?: IAgentWorkingSchedule[];
}

export interface IProjectSlaValues {
  id: string;
  timeLimit: number;
  workingSchedule: IWorkingScheduleValues[];
  unsupervisedTranslation?: IWorkingScheduleValues[] | undefined;
  supervisedTranslation?: IWorkingScheduleValues[] | undefined;
  hasWorkingSchedule: boolean;
  hasAgentWorkingSchedule?: boolean;
  unsupervisedTimeframe?: any;
  supervisedTimeframe?: any;
  unsupervisedAlways?: boolean;
  supervisedAlways?: boolean;
}

const projectSlaService = {
  fromSlaSettingsToValues({ id, timeLimit, workingSchedule, agentAlways, unsupervisedTranslation, supervisedTranslation, unsupervisedTimeframe, supervisedTimeframe }: any): IProjectSlaValues {
    return {
      id,
      timeLimit,
      workingSchedule: workingSchedule.map(({ day, startDate, endDate, isOn }) => ({
        day,
        startDate: formatToTime(startDate),
        endDate: formatToTime(endDate),
        isOn
      })),
      hasWorkingSchedule: workingSchedule.some(({ isOn }) => isOn),
      // unsupervisedTranslation: agentWorkingSchedule.map(({ day, startDate, endDate, isOn }) => ({
      //   day,
      //   startDate: formatToTime(startDate),
      //   endDate: formatToTime(endDate),
      //   isOn
      // })),
      // agentAlways,
      // hasAgentWorkingSchedule: agentWorkingSchedule.some(({ isOn }) => isOn),
      // unsupervisedTimeframe,
      // supervisedTimeframe
    }
  },
  getNewSlaSettingsValues(): IProjectSlaValues {
    return {
      id: '',
      timeLimit: 0,
      workingSchedule: Object.keys(WEEK_DAYS).map(day => ({
        day: WEEK_DAYS[day],
        startDate: null,
        endDate: null,
        isOn: false
      })),
      hasWorkingSchedule: false,
      // agentWorkingSchedule: Object.keys(WEEK_DAYS).map(day => ({
      //   day: WEEK_DAYS[day],
      //   startDate: null,
      //   endDate: null,
      //   isOn: false
      // })),
      // agentAlways: false,
      // hasAgentWorkingSchedule: false,
      // timeframe:[null, null]
    }
  },
  toProjectSlaFromFormValues({ id, timeLimit, workingSchedule, unsupervisedAlways, supervisedAlways, unsupervisedTranslation, supervisedTranslation, unsupervisedTimeframe, supervisedTimeframe }: IProjectSlaValues, workflows: WORKFLOWS[]): IProjectSla {
    return {
      ...id && { id },
      timeLimit: workflows.includes(WORKFLOWS.SUPERVISED) ? timeLimit : 0,
      workingSchedule: workingSchedule.map(({ day, startDate, endDate, isOn }) => ({
        day,
        startDate: workflows.includes(WORKFLOWS.SUPERVISED) && startDate ? 
          `${startDate.getHours()}:${padTimeLeft(startDate.getMinutes())}:00` : 
          null,
        endDate: workflows.includes(WORKFLOWS.SUPERVISED) && endDate ? 
          `${endDate.getHours()}:${padTimeLeft(endDate.getMinutes())}:00` : 
          null,
        isOn: workflows.includes(WORKFLOWS.SUPERVISED) ? isOn : false
      })),
      // agentWorkingSchedule: agentWorkingSchedule.map(({ day, startDate, endDate, isOn }) => ({
      //   day,
      //   startDate: workflows.includes(WORKFLOWS.SUPERVISED) && startDate ? 
      //     `${startDate.getHours()}:${padTimeLeft(startDate.getMinutes())}:00` : 
      //     null,
      //   endDate: workflows.includes(WORKFLOWS.SUPERVISED) && endDate ? 
      //     `${endDate.getHours()}:${padTimeLeft(endDate.getMinutes())}:00` : 
      //     null,
      //   isOn: workflows.includes(WORKFLOWS.SUPERVISED) ? isOn : false
      // })),
      // timeframe: workflows.includes(WORKFLOWS.SUPERVISED) ? timeframe : [null, null],
    }
  }
};

export default projectSlaService;
