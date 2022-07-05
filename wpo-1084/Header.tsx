import React, { FC, ReactNode, RefObject, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Link, matchPath, useHistory, useLocation } from 'react-router-dom';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

import useLoggedUserData from '../../store/useLoggedUserData';
import { USER_ROLES } from '../../constants';
import useOutsideClick from '../../hooks/useOutsideClick';
import { countCaseProjects, hasRole, isInTranslationFlow, isInVerifyTranslationFlow } from '../../helpers/loggedUser';
import routePaths from '../../routes/routePaths';
import msalService from '../../services/authentication/msalService';
import HeaderLanguageExpert from './HeaderLanguageExpert';
import HeaderAgentCombo from './HeaderAgentCombo';
import { IProjectDetails } from '../../services/projectInterface';
import { toPath } from '../../helpers';
import { PROJECT_TYPES, PROJECT_TYPE, SELECTED_PROJECT } from '../../constants/project';
import { TICKET_STATUS } from '../../constants/tickets';
import { INTERNAL_REDIRECT } from '../../constants/translation';
import { ReactComponent as Chat } from '../../assets/images/Chat.svg';
import useLocalStorage from '../../store/useLocalStorage';

import styles from './Header.module.scss';

const DisableMenuItem: FC<{children: ReactNode}> = ({ children }) =>{
  return (
    <OverlayTrigger
      placement="bottom"
      overlay={ <Tooltip id="tooltip-disabled" className="header">
        <FormattedMessage id={ 'label.switchProjectTooltip' } />
      </Tooltip> }>
      <div className={ `${styles.menuItem} ${styles.menuItemDisabled}` } >
        {children}
      </div>
    </OverlayTrigger>
  )
}

const Header: FC<{}> = () => {
  const { loggedUserData: { id, role, name, preferredLanguage, selectedProject, allActiveProjects }, setCurrentProject } = useLoggedUserData();
  const [isMenuOpen, toggleMenu] = useState(false);
  const menuRef: RefObject<any> = useRef();
  const location = useLocation();
  const history = useHistory();

  const caseProjectsNumber = countCaseProjects(allActiveProjects);
  const hasChatProject = allActiveProjects ? allActiveProjects.chat.length > 0 : false;
  const hasMultipleCaseProjects =  caseProjectsNumber > 1 ;
  const shouldDisplayProjectsSelection =
    (isInTranslationFlow(location.pathname) || role === USER_ROLES.COMBO_USER) &&
    location.pathname !== routePaths.agent.selectProject;
  const isInVerifiedTranslationFlow = matchPath(location.pathname, { path: routePaths.agent.verifiedTranslation }) &&
    !(selectedProject?.activeTicketStatus === TICKET_STATUS.REJECTED);
  const isInChat = matchPath(location.pathname, { path: routePaths.agent.chat });
  const isInVerifyTranslationFlowWithMenu = isInVerifyTranslationFlow(location.pathname) && role === USER_ROLES.COMBO_USER;
  const isOutsideTranslationPageWithMenu = isInChat || isInVerifyTranslationFlowWithMenu;
  const hasAccessToClients = hasRole(role, [USER_ROLES.ADMIN, USER_ROLES.TSSC_MANAGER]);
  const [, setStoredSelectedProject] = useLocalStorage<string>(SELECTED_PROJECT, '');
  const [, setStoredProjectType] = useLocalStorage<string>(PROJECT_TYPE, '' );

  useOutsideClick(menuRef, () => {
    toggleMenu(false);
  });

  useEffect(() => {
    toggleMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isOutsideTranslationPageWithMenu && selectedProject?.types.includes(PROJECT_TYPES.CASE)) {
      history.push(routePaths.agent.translation);
    }
    // eslint-disable-next-line
  }, [selectedProject, isOutsideTranslationPageWithMenu]);

  const agentComboHeader = (
    <HeaderAgentCombo
      userId={ id }
      role={ role }
      preferredLanguage={ preferredLanguage }
      selectedProject={ selectedProject }
      setCurrentProject={ setCurrentProject }
      projectType={ isInTranslationFlow(location.pathname) && ![routePaths.agent.selectProject, routePaths.agent.selectLanguage].includes(location.pathname) ?
        (isInChat ? PROJECT_TYPES.CHAT : PROJECT_TYPES.CASE)
        : null }
    />
  );
  const headerForManagement = isInTranslationFlow(location.pathname)
    ? agentComboHeader
    : isInVerifyTranslationFlow(location.pathname)
      ? <HeaderLanguageExpert />
      : null;

  const handleLogout = (e: React.MouseEvent<HTMLElement>): void => {
    e.preventDefault();
    setStoredProjectType('');
    setStoredSelectedProject('');
    (async () => await msalService.logout())();
  };

  const handleProjectSelect = (project: IProjectDetails): (event: React.MouseEvent<HTMLElement>) => void => (): void => {
    if (project.id !== selectedProject?.id) {
      setCurrentProject(project);
      toggleMenu(false);
      if (matchPath(location.pathname, { path: routePaths.agent.verifiedTranslation })) {
        history.push(routePaths.agent.translation);
      }
    }
  };

  const handleGoToChat = (): void => {
    if (!isInChat) {
      setCurrentProject(null);
      history.push(toPath(routePaths.agent.chat, { ticketId: '' }), INTERNAL_REDIRECT);
      toggleMenu(false);
    }
  };

  return (
    <div className={ `
      ${styles.headerWrapper} 
      ${hasRole(role, [USER_ROLES.AGENT, USER_ROLES.LANGUAGE_EXPERT, USER_ROLES.COMBO_USER]) ? styles.noMenuHeaderWrapper : ''}` }
    >
      <div className={ styles.specificHeaderInfo }>
        {
          hasRole(role, [USER_ROLES.AGENT, USER_ROLES.LANGUAGE_EXPERT, USER_ROLES.COMBO_USER]) &&
          <span className={ styles.logo } />
        }
        {
          role && {
            [USER_ROLES.ADMIN]: headerForManagement,
            [USER_ROLES.AGENT]: agentComboHeader,
            [USER_ROLES.LANGUAGE_EXPERT]: <HeaderLanguageExpert />,
            [USER_ROLES.TSSC_MANAGER]: headerForManagement,
            [USER_ROLES.OPS_MANAGER]: headerForManagement,
            [USER_ROLES.TEAM_LEAD]: headerForManagement,
            [USER_ROLES.COMBO_USER]: agentComboHeader,
          }[role]
        }
      </div>
      <button className={ styles.dropdownWrapper } ref={ menuRef }>
        <h3
          onClick={ () => toggleMenu(!isMenuOpen) }
          className={ isMenuOpen ? styles.caretUpActive : styles.caretDown }
        >
          <label className={ isMenuOpen ? styles.menuTitleOpen : styles.menuTitle }>{ name }</label>
        </h3>
        {
          isMenuOpen &&
          <div className={ ` ${ styles.mainDropdownContent } ${ isMenuOpen ? styles.mainDropdownContentActive : '' }` }>
            {
              shouldDisplayProjectsSelection &&
              <>
                { !hasAccessToClients ?
                  <>
                    { (hasMultipleCaseProjects || (!!caseProjectsNumber && (hasChatProject || isInVerifyTranslationFlowWithMenu))) &&
                      <>
                        {allActiveProjects?.case.map((client) => {
                          return client.projects.map((project) => {
                            if (!isInVerifiedTranslationFlow) {
                              return (
                                <div
                                  className={ `${styles.menuItem} ${project.id === selectedProject?.id ? styles.menuItemActive : ''}` }
                                  onClick={ handleProjectSelect(project) }
                                  key={ project.id }
                                  title={ project.name }
                                >
                                  {project.name}
                                </div>
                              )} else {
                              return (
                                <DisableMenuItem key={ project.id }>
                                  {project.name}
                                </DisableMenuItem>
                              )
                            }
                          })
                        })
                        }
                      </>
                    }
                  </>
                  : 
                  <>
                    { !isInVerifiedTranslationFlow ?
                      <Link to={ routePaths.agent.selectProject }>
                        <div className={ styles.menuItem }>
                          <FormattedMessage id={ 'label.seeAllProjects' } />
                        </div>
                      </Link>  
                      :
                      <DisableMenuItem >
                        <FormattedMessage id={ 'label.seeAllProjects' } />
                      </DisableMenuItem>
                    }
                  </>
                }

                { (hasChatProject && (!!caseProjectsNumber || isInVerifyTranslationFlowWithMenu)) &&
                  <div
                    className={ `${ styles.menuItem } ${ styles.chatItem } ${ isInChat ? styles.menuItemActive : ''}` }
                    onClick={ handleGoToChat }
                  >
                    <Chat className={ `${styles.chatIcon}` } />
                    <FormattedMessage id={ 'label.chat' } />
                  </div>
                }
              </>
            }
            
            <h3 onClick={ handleLogout } className={ styles.menuItem + ' ' + styles.menuItemLogout  }>
              <a href="/"><FormattedMessage id="label.logout" /></a>
            </h3>
          </div>
        }
      </button>
    </div>
  );
};

export default Header;
