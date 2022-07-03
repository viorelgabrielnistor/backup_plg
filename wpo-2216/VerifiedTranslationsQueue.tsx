import React, { FC, RefObject, useRef, useState } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import { FormattedMessage } from 'react-intl';
import { NavLink } from 'react-router-dom';

import useVerifiedTickets from '../../../store/websockets/useVerifiedTickets';
import { ITicketValues } from '../../../services/translation';
import { toPath } from '../../../helpers';
import routePaths from '../../../routes/routePaths';
import useLoggedUserData from '../../../store/useLoggedUserData';
import useLoadingQue from '../../../hooks/useLoadingQue';
import useVerifiedTicketsList from '../../../hooks/useVerifiedTicketsList';
import useHandleErrors from '../../../hooks/useHandleErrors';
import useOutsideClick from '../../../hooks/useOutsideClick';
import useMouseLeave from '../../../hooks/useMouseLeave';
import ConditionalWrap from '../../shared/conditionalWrap/conditionalWrap';
import { NOTIFICATION_STATUSES, TICKET_STATUS } from '../../../constants/tickets';
import { PROJECT_TYPES } from '../../../constants/project';
import { INTERNAL_REDIRECT } from '../../../constants/translation';

import { ReactComponent as Check } from '../../../assets/images/CheckVerified.svg';
import { ReactComponent as Rejected } from '../../../assets/images/RejectedTickets.svg';

import styles from './VerifiedTranslationsQueue.module.scss';

interface IVerifiedTranslationsProps {
  isInMenu?: boolean;
  isMenuOpen?: boolean;
  ticketStatus: TICKET_STATUS[];
}

const VerifiedTranslationsQueue: FC<IVerifiedTranslationsProps> = ({ isInMenu = false, isMenuOpen = false, ticketStatus }) => {
  const { setCurrentProject } = useLoggedUserData();
  const { verifiedTicketsCount, rejectedTicketsCount } = useVerifiedTickets();
  const [showVerifiedTickets, setShowVerifiedTickets] = useState(false);
  const [addToLoadingQue, removeFromLoadingQue, isInLoadingQue] = useLoadingQue();
  const [verifiedTickets, setVerifiedTickets] = useState<ITicketValues[]>([]);
  const [hasSuccessfulVerifiedTickets, setHasSuccessfulVerifiedTickets] = useState(false);
  const [fetchVerifiedTickets] = useVerifiedTicketsList();
  const [handleErrors] = useHandleErrors();
  const menuRef: RefObject<any> = useRef();

  const handleShowVerifiedTickets = async (): Promise<void> => {
    try {
      addToLoadingQue('verifiedTickets');
      const verifiedTickets = await fetchVerifiedTickets(ticketStatus);
      setVerifiedTickets(verifiedTickets);
      setHasSuccessfulVerifiedTickets(!!verifiedTicketsCount);
    } catch (e) {
      handleErrors(e);
    } finally {
      removeFromLoadingQue('verifiedTickets');
    }
  };

  const handleClickShowVerified = (): void => {
    if (!showVerifiedTickets) {
      handleShowVerifiedTickets();
    }
    setShowVerifiedTickets(!showVerifiedTickets)
  };

  const handleVerifiedTicketClick = (resetSelectedProject: boolean): void => {
    if (resetSelectedProject) {
      setCurrentProject(null);
    }
  };
  
  useOutsideClick(menuRef, () => {
    setShowVerifiedTickets(false);
  });

  useMouseLeave(menuRef, () => {
    if (isInMenu) {
      setShowVerifiedTickets(false);
    }
  });

  const ticketDetails = {
    [TICKET_STATUS.VERIFIED]: {
      statusIcon: <Check className={ styles.verifiedTicketsIcon } />,
      ticketsWrapper: styles.isVerifiedBlock,
      iconClass: styles.isVerifiedIcon,
      ticketNumberRejectedClass: '',
      tickerUrlRejectedClass: '',
      bulletRejectedClass: '',
      buttonMenuClass: styles.verifiedDropdownButton,
      buttonMenuClassActive: styles.verifiedDropdownButtonActive,
      statusLabelId: 'label.verified',
      ticketNumberLabelId: 'label.ticket.verifiedNumber',
      ticketUrlLabelId: 'label.ticket.verified',
      ticketCount: verifiedTicketsCount
    },
    [TICKET_STATUS.REJECTED]: {
      statusIcon: <Rejected className={ styles.verifiedTicketsIcon } />,
      ticketsWrapper: styles.isRejectedBlock,
      iconClass: styles.isRejectedIcon,
      ticketNumberRejectedClass: styles.ticketNrRejected,
      ticketUrlRejectedClass: styles.ticketUrlRejected,
      bulletRejectedClass: styles.isRejected,
      buttonMenuClass: '',
      buttonMenuClassActive: '',
      statusLabelId: 'label.rejected',
      ticketNumberLabelId: 'label.ticket.rejectedNumber',
      ticketUrlLabelId: 'label.ticket.rejected',
      ticketCount: rejectedTicketsCount
    }
  }[ticketStatus[0]];

  return (
    <>
      <div ref={ menuRef } onClick={ handleClickShowVerified }>
        <div className={ `
          ${isInMenu ? `${styles.dropdownButton} ${ticketDetails.buttonMenuClass}` : styles.framed}
          ${isMenuOpen ? `${styles.dropdownButtonActive} ${ticketDetails.buttonMenuClassActive}` : ''} 
          d-flex align-items-center` }
        >
          {
            (ticketDetails.ticketCount !== null) ?
              <div className={ `${ticketDetails.iconClass }` }>
                <span>{ticketDetails.statusIcon}</span>
                <span className={ styles.verifiedTicketsCount }>{ ticketDetails.ticketCount }</span>
              </div>
              :
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                variant={ isInMenu ? 'light' : undefined }
                className={ `mr-2 ${isInMenu ? 'ml-3' : 'ml-2'}` }
              />
          }
          {(!isInMenu || (ticketDetails.ticketCount !== null && isMenuOpen)) &&
            <span className={ `ml-2 ${isInMenu ? styles.menuText : styles.headerText} ${ticketDetails.ticketCount ? styles.queueVerifiedTranslations : ''}` }>
              <FormattedMessage id={ ticketDetails.statusLabelId } />
            </span>
          }
          
          {
            ticketDetails.ticketCount && ((isInMenu && isMenuOpen) || !isInMenu) ?
              <span className={ `ml-2 ${isInMenu ? 'ml-auto mr-2' : ''} ${styles.toggleTickets} ${showVerifiedTickets ? styles.caretUp : styles.caretDown}` } />
              : null
          }
        </div>
        {/* here */}
        <div className="position-relative">
          {
            ticketDetails.ticketCount && showVerifiedTickets ?
              <div className={ `
                ${styles.ticketListContainer} 
                ${isInMenu ? styles.ticketListContainerMenu : styles.ticketListContainerHeader}
                ${ticketDetails.ticketsWrapper}` }
              >
                {
                  isInLoadingQue('verifiedTickets') ?
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="ml-2"
                    />
                    :
                    <ul className={ `${styles.ticketList} ${isInMenu ? styles.ticketListMenu : styles.ticketListHeader}` }>
                      {
                        verifiedTickets.map((ticket) => (
                          <li key={ ticket.id } className={ `${ticket.reassigned ? styles.isReassigned : ticketDetails.bulletRejectedClass}` }>
                            <ConditionalWrap
                              key={ ticket.id }
                              condition={ (NOTIFICATION_STATUSES.includes(ticket.status)
                                || !hasSuccessfulVerifiedTickets) }
                              wrap={ children => {
                                const path = ticket.projectType === PROJECT_TYPES.CASE
                                  ? routePaths.agent.verifiedTranslation
                                  : routePaths.agent.chat;
                                return (
                                  <NavLink
                                    to={ { pathname: toPath(path, { ticketId: ticket.id }), state: INTERNAL_REDIRECT } }
                                    onClick={ () => handleVerifiedTicketClick(ticket.projectType === PROJECT_TYPES.CHAT) }
                                  >
                                    {children}
                                  </NavLink>
                                )
                              } }
                            >
                              { ticket.ticketNumber ?
                                <FormattedMessage
                                  id={ ticketDetails.ticketNumberLabelId }
                                  values={ { value:
                                      <span className={ `${styles.ticketNr} ${ticketDetails.ticketNumberRejectedClass} ` }>
                                        {ticket.ticketNumber}
                                      </span>
                                  } }
                                />
                                :
                                <FormattedMessage
                                  id={ ticketDetails.ticketUrlLabelId }
                                  values={ { value:
                                        <span title={ ticket.ticketUrl }
                                          className={ `${styles.ticketUrl} ${ticketDetails.ticketUrlRejectedClass}` }>
                                          {ticket.ticketUrl}
                                        </span>
                                  } }
                                />
                              }
                            </ConditionalWrap>
                          </li>
                        ))
                      }
                    </ul>
                }
              </div>
              : null
          }
        </div>
      </div>
    </>
  );
}

export default VerifiedTranslationsQueue;
