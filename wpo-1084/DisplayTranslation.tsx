import React, { FC, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';

import Loader from '../shared/loader/Loader';

import routePaths from '../../routes/routePaths';
import useTicket from '../../hooks/useTicket';
import { TICKET_STATUS } from '../../constants/tickets';
import Translation from './Translation';
import VerifiedTranslation from './verifiedTranslation/VerifiedTranslation';
import useLoggedUserData, { TSelectedProject } from '../../store/useLoggedUserData';
import { PROJECT_TYPES } from '../../constants/project';
import { appendHttp } from '../../helpers';
import toastWarning from '../shared/toastTemplate/toastWarning';
import useLocalStorage from '../../store/useLocalStorage';
import { POPUP_WARNING_SHOWED } from '../../constants/translation';
import { useIntl } from 'react-intl';

const DisplayTranslation: FC<{}> = () => {
  const intl = useIntl();
  const history = useHistory();
  const { ticketId, openExternalUrl } = useParams();
  const [ticketData, ticketFormData, isLoadingTicket] = useTicket(ticketId || '');
  const { loggedUserData: { allActiveProjects }, setCurrentProject } = useLoggedUserData();
  const [popupWarningShowed, setPopupWarningShowed] = useLocalStorage<boolean>(POPUP_WARNING_SHOWED, false);

  useEffect(() => {
    if (ticketId && !isLoadingTicket && (!ticketFormData || ticketFormData.status === TICKET_STATUS.CLOSED)) {
      setCurrentProject(null);
      history.push(routePaths.agent.selectProject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketFormData, isLoadingTicket]);

  useEffect(() => {
    if (openExternalUrl && ticketData?.ticketUrl) {
      window.open(appendHttp(ticketData?.ticketUrl));
      if (!popupWarningShowed) {
        toastWarning(intl.formatMessage({ id: 'label.translation.popupWarningTitle' }),
          intl.formatMessage({ id: 'label.translation.popupWarningMessage' })
        );
        setPopupWarningShowed(true);
      }
    }
    // eslint-disable-next-line
  }, [openExternalUrl, ticketData]);

  useEffect(() => {
    if (ticketFormData && allActiveProjects && allActiveProjects[PROJECT_TYPES.CASE]) {
      setCurrentProject(allActiveProjects[PROJECT_TYPES.CASE].reduce((projectResult: TSelectedProject, client) => {
        const activeProject = client.projects.find(prj => prj.id === ticketFormData?.projectId);
        if (activeProject) {
          projectResult = { ...activeProject, activeTicketStatus: ticketFormData.status };
        }
        return projectResult;
      }, null));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allActiveProjects, ticketFormData]);

  return (
    <>
      {
        isLoadingTicket ?
          <Loader center className="mt-5" />
          :
          ticketData && ticketData.status === TICKET_STATUS.VERIFIED ?
            <VerifiedTranslation ticket={ ticketData } />
            :
            ((ticketId && ticketFormData) || !ticketId) && 
            <Translation ticketFormData={ ticketFormData }/>
      }
    </>
  );
};

export default DisplayTranslation;
