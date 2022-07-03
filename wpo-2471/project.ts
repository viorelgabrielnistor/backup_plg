import { PROJECT_TYPES, REASSIGN_LOGIC, WORKFLOWS } from '../constants/project';
import {
  IProject,
  IProjectDetails,
  IProjectsByClientAndType,
  IProjectValues
} from './projectInterface';
import { ILanguagePairsValues } from './languagePairsInterface';
import languagePairsService from './languagePairs';
import { TGetLanguageName } from '../store/useLanguages';
import allClients from './allClients';
import projectNotificationsService from './projectNotifications';
import rejectCategoriesService from './rejectCategories';
import projectSlaService from './projectSLA';

const projectService = {
  fromProjectToDetails(data: any): IProjectDetails[] {
    return data.map(({
      clientId,
      clientName,
      id,
      name,
      active,
      workflows,
      languageAutodetection,
      languages,
      languagePairs,
      types,
      ticketReassignmentType,
      caseHistory,
      distributeVerifiedAnswer,
      hideTranslatedTexts,
      connectorConfiguration,
      mandatoryTicketDetails,
      notifications,
      toneOfVoice,
      verificationGuidelines,
      rejectionCategories,
      projectSla,
    }: any): IProjectDetails => (
      {
        clientId,
        clientName,
        id,
        name,
        active,
        workflows,
        languageAutodetection,
        languages,
        languagePairs: languagePairs.map(languagePair => languagePairsService.fromLanguagePair(languagePair)),
        types,
        ticketReassignmentType,
        caseHistory,
        distributeVerifiedAnswer,
        hideTranslatedTexts,
        connectorConfiguration,
        mandatoryTicketDetails,
        notifications,
        toneOfVoice,
        verificationGuidelines,
        rejectionCategories: rejectCategoriesService.toRejectCategories(rejectionCategories),
        projectSla,
      }
    ))
  },
  fromProjectToFormValues({
    clientId,
    clientName,
    id,
    name,
    active,
    workflows,
    languageAutodetection,
    languages,
    languagePairs,
    types,
    ticketReassignmentType,
    caseHistory,
    distributeVerifiedAnswer,
    hideTranslatedTexts,
    connectorConfiguration,
    mandatoryTicketDetails,
    notifications,
    toneOfVoice,
    verificationGuidelines,
    rejectionCategories,
    projectSla
  }: IProjectDetails): IProjectValues {
    return {
      clientId,
      clientName,
      id: id,
      name,
      active: + active,
      workflows,
      languageAutodetection: + languageAutodetection,
      languagePairs: languagePairs.map(languagePair => languagePairsService.fromLanguagePair(languagePair)),
      languages,
      type: types[0],
      ticketReassignmentType,
      caseHistory: + caseHistory,
      distributeVerifiedAnswer: + distributeVerifiedAnswer,
      hideTranslatedTexts: + hideTranslatedTexts,
      connectorConfiguration: {
        id: connectorConfiguration?.id || '',
        instance: connectorConfiguration?.instance || '',
        clientId: connectorConfiguration?.clientId || '',
        username: connectorConfiguration?.username || '',
        audience: connectorConfiguration?.audience || '',
        autoSendVerifiedEmail: + (connectorConfiguration?.autoSendVerifiedEmail || false),
        enabled: + (connectorConfiguration?.enabled || false),
      },
      mandatoryTicketDetails,
      notifications: projectNotificationsService.fromProjectNotificationsToFormValues(notifications),
      toneOfVoice: toneOfVoice || '',
      verificationGuidelines: verificationGuidelines || '',
      rejectionCategories: rejectCategoriesService.fromRejectCategoriesToValues(rejectionCategories),
      projectSla: projectSlaService.fromSlaSettingsToValues(projectSla)
    }
  },
  getNewProjectValues(): IProjectValues {
    return {
      name: '',
      active: 1,
      workflows: [WORKFLOWS.UNSUPERVISED],
      languageAutodetection: 1,
      languagePairs: [],
      languages: [],
      type: null,
      ticketReassignmentType: REASSIGN_LOGIC.NONE,
      caseHistory: 1,
      distributeVerifiedAnswer: 0,
      hideTranslatedTexts: 1,
      connectorConfiguration: {
        id: '',
        instance: '',
        clientId: '',
        username: '',
        audience: '',
        autoSendVerifiedEmail: 0,
        enabled: 0,
      },
      mandatoryTicketDetails: [],
      notifications: projectNotificationsService.getNewProjectNotificationsValues(),
      toneOfVoice: '',
      verificationGuidelines: '',
      rejectionCategories: [],
      projectSla: projectSlaService.getNewSlaSettingsValues()
    }
  },
  getLanguagePairsNames(languagePairs: ILanguagePairsValues[], getLanguageName: TGetLanguageName): string[] {
    return languagePairs.reduce((accLang: string[], languagePair) => {
      if (languagePair.active) {
        accLang.push(
          `${ getLanguageName(languagePair.pairs[0].from) } <-> ${ getLanguageName(languagePair.pairs[0].to)}`
        );
      }

      return accLang;
    }, []);
  },
  toProjectFromFormValues({
    clientId,
    clientName,
    id,
    name,
    active,
    workflows,
    languageAutodetection,
    languagePairs,
    type,
    ticketReassignmentType,
    caseHistory,
    distributeVerifiedAnswer,
    hideTranslatedTexts,
    connectorConfiguration,
    mandatoryTicketDetails,
    notifications,
    toneOfVoice,
    verificationGuidelines,
    rejectionCategories,
    projectSla
  }: IProjectValues): IProject {
    return {
      ...clientId && { clientId },
      ...clientName && { clientName },
      ...id && { id },
      name,
      active: !!active,
      workflows,
      languageAutodetection: !!languageAutodetection,
      languagePairs: languagePairs.map(languagePair => languagePairsService.toLanguagePairs(languagePair)),
      languages: [],
      types: [type || PROJECT_TYPES.CASE],
      ticketReassignmentType,
      caseHistory: !!caseHistory,
      distributeVerifiedAnswer: !!distributeVerifiedAnswer,
      hideTranslatedTexts: !!hideTranslatedTexts,
      connectorConfiguration: {
        ...(connectorConfiguration.id && { id: connectorConfiguration.id }),
        instance: connectorConfiguration.instance,
        clientId: connectorConfiguration.clientId,
        username: connectorConfiguration.username,
        audience: connectorConfiguration.audience,
        autoSendVerifiedEmail: !!connectorConfiguration.autoSendVerifiedEmail,
        enabled: !!connectorConfiguration.enabled,
      },
      mandatoryTicketDetails,
      notifications: workflows.includes(WORKFLOWS.SUPERVISED) ?
        projectNotificationsService.toProjectNotificationsFromFormValues(notifications) :
        null,
      toneOfVoice,
      verificationGuidelines,
      rejectionCategories: rejectCategoriesService.toRejectCategories(rejectionCategories),
      projectSla: workflows.includes(WORKFLOWS.SUPERVISED) ?
        projectSlaService.toProjectSlaFromFormValues(projectSla, workflows) :
        null
    }
  },
  fromProjectToDetailsByClientAndType(data: any): IProjectsByClientAndType {
    const projectsByType: IProjectsByClientAndType = {
      case: [],
      chat: []
    };
    if (data.case) {
      projectsByType.case = allClients.from(data.case);
    }
    if (data.chat) {
      projectsByType.chat = allClients.from(data.chat);
    }
    return projectsByType;
  },
};

export default projectService;
