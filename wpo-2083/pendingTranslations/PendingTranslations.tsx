import React, { FC, RefObject, useEffect, useRef, useState } from 'react';
import { Col, Form, Row } from 'react-bootstrap';
import { FormattedMessage, useIntl } from 'react-intl';
import Table from 'react-bootstrap/Table';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import throttle from 'lodash/throttle';
import ReactTooltip from 'react-tooltip';

import PendingTranslationsFilter, { IFilterValues } from './PendingTranslationsFilter';
import DropdownButton from './DropdownButton';
import ReassignModal from './ReassignModal';
import SlaCountDown from './SlaCountDown';
import useLoggedUserData from '../../store/useLoggedUserData';
import pendingTranslationApi from '../../api/pendingTranslationApi';
import routePaths from '../../routes/routePaths';
import { ISortData, SortableTh, SortableThead } from '../shared/sortingTable/SortingTable';
import { ICustomSelectOption } from '../shared/fields/CustomSelectInterface';
import ConfirmationModal from '../shared/confirmationModal/confirmationModal';
import Loader from '../shared/loader/Loader';
import { usePendingTranslations } from '../../hooks/usePendingTranslations';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import { emptyFn, toPath } from '../../helpers';
import handleErrors from '../../helpers/handleErrors';
import { hasRole } from '../../helpers/loggedUser';
import { getCustomSelectValue } from '../../helpers/formatForFields';
import { SORT_DIRECTION, USER_ROLES } from '../../constants';
import { TICKET_STATUS } from '../../constants/tickets';
import { PROJECT_TYPES } from '../../constants/project';
import { PRIMARY_COLOR, TRANSPARENT, WHITE } from '../../constants/colors';
import { PENDING_TRANSLATIONS_POLING_TIME, REASSIGN_RESULT } from '../../constants/pendingTranslations';
import BulkAbandonConfirmation from './BulkAbandonConfirmation';

import { ReactComponent as QualityCheck } from '../../assets/images/QualityCheck.svg';
import { ReactComponent as InfoIcon } from '../../assets/images/InfoIcon.svg';

import styles from './PendingTranslations.module.scss';

const emptyTicketStatusSummary = {
  [TICKET_STATUS.VERIFICATION_IN_PROGRESS]: 0,
  [TICKET_STATUS.VERIFICATION_PENDING]: 0,
  [TICKET_STATUS.VERIFIED]: 0,
  [TICKET_STATUS.REJECTED]: 0,
};

const initialFilter: IFilterValues = {
  clients: [],
  projects: [],
  agents: [],
  slaStatus: [],
  languageExperts: [],
  languagePairs: [],
  statuses: [],
};

const initialSort: ISortData = {
  column: 'timeSent',
  direction: SORT_DIRECTION.DESC
};

const PendingTranslations: FC = () => {
  const [pendingTranslations, isLoading , fetchPendingTranslations] = usePendingTranslations();
  const [filters, setFilters] = useState<IFilterValues>(initialFilter);
  const [sorting, setSorting] = useState<ISortData>(initialSort);
  const [checkedTickets, setCheckedTickets] = useState<string[]>([]);
  const [allTicketsChecked, setAllTicketsChecked] = useState(false);
  const [statusBadgesValues, setStatusBadgesValues] = useState(emptyTicketStatusSummary);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<ICustomSelectOption[]>([]);
  const [hasScroll, setHasScroll] = useState(false);
  const [triggerFetch, setTriggerFetch] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [abandonModalSettings, setAbandonModalSettings] = useState<{ show: 'one'|'bulk'|null; handleYes: () => any}>({
    show: null,
    handleYes: emptyFn,
  });
  const throttledSetIsScrolling = throttle(setIsScrolling, 1000, { leading: true, trailing: false });
  
  const intl = useIntl();
  const tbodyRef: RefObject<any> = useRef();
  useDocumentTitle(intl.formatMessage({ id: 'label.page.liveMonitoring' }));

  const {
    loggedUserData: { id: userId, role },
    setCurrentProject
  } = useLoggedUserData();

  useEffect(() => {
    fetchPendingTranslations(filters.clients, filters.projects, filters.agents, filters.slaStatus, filters.languageExperts, filters.languagePairs, filters.statuses, sorting.column, sorting.direction);

    const interval = setInterval(() => {
      if (filters && sorting) {
        fetchPendingTranslations(filters.clients, filters.projects, filters.agents, filters.slaStatus, filters.languageExperts, filters.languagePairs, filters.statuses, sorting.column, sorting.direction);
      }
    }, PENDING_TRANSLATIONS_POLING_TIME);

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), JSON.stringify(sorting), triggerFetch]);

  useEffect(()=>{
    if (pendingTranslations){
      ReactTooltip.rebuild();
      const allTickets = pendingTranslations.map(ticket => ticket.id);
      setCheckedTickets(checkedTickets.filter(ticketId => allTickets.includes(ticketId)));

      setStatusBadgesValues(pendingTranslations.reduce((acc,row)=>{
        return {
          [TICKET_STATUS.VERIFICATION_IN_PROGRESS]: row.status === TICKET_STATUS.VERIFICATION_IN_PROGRESS ? acc[TICKET_STATUS.VERIFICATION_IN_PROGRESS] + 1 : acc[TICKET_STATUS.VERIFICATION_IN_PROGRESS],
          [TICKET_STATUS.VERIFICATION_PENDING]: row.status === TICKET_STATUS.VERIFICATION_PENDING ? acc[TICKET_STATUS.VERIFICATION_PENDING] + 1 : acc[TICKET_STATUS.VERIFICATION_PENDING],
          [TICKET_STATUS.VERIFIED]: row.status === TICKET_STATUS.VERIFIED ? acc[TICKET_STATUS.VERIFIED] + 1 : acc[TICKET_STATUS.VERIFIED],
          [TICKET_STATUS.REJECTED]: row.status === TICKET_STATUS.REJECTED ? acc[TICKET_STATUS.REJECTED] + 1 : acc[TICKET_STATUS.REJECTED],
        }
      }, emptyTicketStatusSummary));

      if (tbodyRef.current) {
        setTimeout(()=>{
          setHasScroll(tbodyRef.current.scrollHeight > tbodyRef.current.offsetHeight); 
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pendingTranslations)])

  useEffect(()=>{
    if (pendingTranslations) {
      setAllTicketsChecked(pendingTranslations.length === checkedTickets.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[JSON.stringify(checkedTickets), JSON.stringify(pendingTranslations)]);

  useEffect(()=>{
    return setIsScrolling(false);
  },[isScrolling])

  const handleReassign = async (): Promise<void> => {
    const getTicketsNumbers = (tickets: string[]): string[] => pendingTranslations.reduce((acc, ticket) => [
      ...acc, 
      ...(tickets.includes(ticket.id) ? [ticket.number ? '#' + ticket.number : ticket.url.substring(0, 10)] : [])
    ],[]);

    const extractResults = (response, code: REASSIGN_RESULT | null): string[] => response.results.reduce((acc, res) => [
      ...acc, 
      ...(res.error === code ? res.ticketIds : [])
    ],[]);

    const showResults = (response): void => {
      const resultsTypes = [REASSIGN_RESULT.NON_ASSIGNABLE, REASSIGN_RESULT.FORBIDDEN, REASSIGN_RESULT.CLOSED];
      const agent = `${response.handler.firstName} ${response.handler.lastName}`;
      resultsTypes.forEach((code)=>{
        const tickets = extractResults(response,code);
        if (tickets.length) {
          toast.error(intl.formatMessage({
            id: `label.pendingTranslations.reassignError_${code}${tickets.length > 1 ? '_multiple' : ''}` 
          }, { 
            tickets: (<b>{getTicketsNumbers(tickets).join(', ')} </b>),
            agent
          } ));
        }
      });

      const successTickets = extractResults(response, null);
      if (successTickets.length) {
        toast.success(intl.formatMessage({ 
          id: `label.pendingTranslations.reassignSuccess${successTickets.length > 1 ? '_multiple' : ''}` 
        }, { 
          tickets: (<b>{getTicketsNumbers(successTickets).join(', ')} </b>), 
          agent
        } ));
      }
    }
    try {
      setIsSubmitting(true);
      const response = await pendingTranslationApi.assign(selectedTickets, selectedAgent);
      showResults(response.data);
    } catch (e) {
      handleErrors(intl, e);
    } finally {
      setIsSubmitting(false);
      setSelectedAgent('');
      setSelectedTickets([]);
      setCheckedTickets([]);
      setShowReassignModal(false);
      setTriggerFetch(!triggerFetch);
    }
  }

  useEffect(()=>{
    if(selectedAgent) {
      handleReassign();
    }
    // eslint-disable-next-line
  },[selectedAgent])

  const getAvailableAgentsForTickets = async (tickets: string[]): Promise<ICustomSelectOption[]> => {
    const projects = pendingTranslations.reduce((acc, ticket) => {
      if (tickets.includes(ticket.id) && !acc.includes(ticket.projectId)) {
        acc.push(ticket.projectId);
      }
      return acc;
    }, [])

    const agents = await pendingTranslationApi.getAgentsForTickets(projects);

    return agents.data.map(({ id, email }) => getCustomSelectValue(email, id));
  }

  const handleSortChange: (column: string, direction: SORT_DIRECTION) => void = (column, direction)=>{
    setSorting({
      column,
      direction
    });
  }

  const handleAllTicketCheckboxChange = (): void =>{
    setAllTicketsChecked(!allTicketsChecked);
    if (allTicketsChecked) {
      setCheckedTickets([]);
    } else {
      setCheckedTickets(pendingTranslations.map(ticket => ticket.id));
    }
  }

  const handleTicketCheckboxChange = (id): () => void => (): void => {
    const idx = checkedTickets.findIndex(ticket => ticket === id);
    if (idx !== -1) {
      const newCheckedTickets = [...checkedTickets];
      newCheckedTickets.splice(idx,1);
      setCheckedTickets(newCheckedTickets);
    } else {
      setCheckedTickets([...checkedTickets,id]);
    }
  }
  
  const handleReassignClick = async (ticket: string | null, toMe: boolean): Promise<void> => {
    const tickets = ticket ? [ticket] : checkedTickets;
    setSelectedTickets(tickets);
    if (toMe) {
      setSelectedAgent(userId);
    } else {
      const agents = await getAvailableAgentsForTickets(tickets);
      setAvailableAgents(agents);
      setShowReassignModal(true);
    }
  }

  const resetAbandonModalSettings = (): void => {
    setAbandonModalSettings({ show: null, handleYes: emptyFn })
  }

  const handleAbandonTicket = async (tickets): Promise<void> => {
    resetAbandonModalSettings();
    try {
      setIsSubmitting(true);
      await pendingTranslationApi.abandon(tickets);
    } catch (e) {
      handleErrors(intl, e);
    } finally {
      setIsSubmitting(false);
      setTriggerFetch(!triggerFetch);
    }
  };

  const handleAbandonClick = (ticket: string | null): void => {
    const tickets = ticket ? [ticket] : checkedTickets;

    setAbandonModalSettings({
      show: ticket ? 'one' : 'bulk',
      handleYes: () => handleAbandonTicket(tickets)
    });
  };

  const handleOnScroll = (): void => {
    throttledSetIsScrolling(true);
  };

  return <>
    <Row className="mb-4">
      <Col md={ 12 }>
        <h1>
          <FormattedMessage id="label.pendingTranslations"/>
        </h1>
      </Col>
    </Row>

    <PendingTranslationsFilter 
      setFilters={ setFilters }
      isLoading={ isLoading } 
      initialValues={ initialFilter } 
      statusBadgesValues={ statusBadgesValues }
    />
    
    <>
      { pendingTranslations !== null && pendingTranslations.length > 0 ?
        <>
          <Table className={ `mx-auto mt-4 ${ styles.table }` }>
            <SortableThead initialSortColumn={ initialSort.column } initialSortDirection={ initialSort.direction } onSort={ handleSortChange }>
              <tr>
                <th className={ `${styles.colCheckbox} align-middle` }>
                  <label className={ styles.checkbox } >
                    {pendingTranslations && pendingTranslations.length > 0 &&
                      <Form.Check.Input
                        type="checkbox"
                        name="alltickets"
                        checked={ allTicketsChecked }
                        onChange={ handleAllTicketCheckboxChange }
                      />
                    }
                  </label>
                </th>
                <SortableTh className={ `${styles.colTicketId} align-middle` } column="ticketId">
                  <FormattedMessage id="label.table.ticketId" />
                </SortableTh>
                {
                  hasRole(role, [USER_ROLES.ADMIN, USER_ROLES.TSSC_MANAGER]) &&
                  <SortableTh className={ `${styles.colClient} aling-middle` } column="client.name">
                    <FormattedMessage id="label.table.client" />
                  </SortableTh>
                }
                <SortableTh className={ `${styles.colProject} aling-middle` } column="project.name">
                  <FormattedMessage id="label.table.project" />
                </SortableTh>
                <SortableTh className={ `${styles.colSla} aling-middle` } column="deadline">
                  <FormattedMessage id="label.table.sla" />
                </SortableTh>
                { role === USER_ROLES.TSSC_MANAGER ?
                  <SortableTh className={ `${styles.colUser} aling-middle` } column="languageExpert">
                    <FormattedMessage id="label.role.qualityManager" />
                  </SortableTh>
                  :
                  <SortableTh className={ `${styles.colUser} aling-middle` } column="agent">
                    <FormattedMessage id="label.table.userName" />
                  </SortableTh>
                }
                <SortableTh className={ `${styles.colLanguagePair} align-middle` } column="languagePair">
                  <FormattedMessage id="label.table.languagePair" />
                </SortableTh>
                <SortableTh className="align-middle" column="status">
                  <FormattedMessage id="label.table.status" />
                </SortableTh>
                <SortableTh className={ `${styles.colTimeSent} align-middle` } column="timeSent">
                  <FormattedMessage id="label.table.timeSent" />
                  <QualityCheck className={ styles.qualityCheckIcon } />
                </SortableTh>
                <SortableTh className={ `${styles.colTimeResponse} align-middle` } column="timeResponse">
                  <FormattedMessage id="label.table.timeResponse" />
                  <QualityCheck className={ styles.qualityCheckIcon } />
                </SortableTh>
                <th className={ ` ${styles.colActions} align-middle text-center ${hasScroll ? styles.colActionsScroll : ''}` }>
                  {checkedTickets.length > 1 ?
                    <DropdownButton
                      onReassign={ () => handleReassignClick(null, false) }
                      onReassignToMe={ () => handleReassignClick(null, true) }
                      onAbandonClick={ () => handleAbandonClick(null) }
                      hasOnlyReassign={ role === USER_ROLES.TSSC_MANAGER }
                      disabled={ isSubmitting }
                      isScrolling={ isScrolling }
                    />
                    :
                    <FormattedMessage id="label.table.actions"/>
                  }
                </th>
              </tr>
            </SortableThead>
            <tbody className={ styles.scrollbar } ref={ tbodyRef } onScroll={ handleOnScroll }>
              { pendingTranslations && pendingTranslations.map((row)=>(
                <tr key={ row.id } className={ `${checkedTickets[row.id] ? styles.rowSelected : ''}` }>
                  <td className={ `${styles.colCheckbox} align-middle` }>
                    <label className={ styles.checkbox } >
                      <Form.Check.Input
                        type="checkbox"
                        name={ `ticket_${row.id}` }
                        checked={ checkedTickets.includes(row.id) }
                        onChange={ handleTicketCheckboxChange(row.id) }
                      />
                    </label>
                  </td>
                  <td className={ `${styles.colTicketId} align-middle` }>
                    <div className={ styles.ellipsis }>
                      { [TICKET_STATUS.VERIFIED, TICKET_STATUS.REJECTED].includes(row.status) ?
                        <Link
                          to={ toPath(
                            row.projectType === PROJECT_TYPES.CASE
                              ? routePaths.agent.verifiedTranslation
                              : routePaths.agent.chat,
                            { ticketId: row.id }) }
                          onClick={ () => setCurrentProject(null) }
                          title={ row.number ? row.number : row.url }
                          className={ styles.underline }
                        >
                          {row.number ?  <>#{row.number}</> : <>{row.url}</>}
                        </Link>
                        :
                        <span title={ row.number ? row.number : row.url }>
                          {row.number ? <>#{row.number}</> : <>{row.url}</>}
                        </span>
                      }
                    </div>
                  </td>
                  {
                    hasRole(role, [USER_ROLES.ADMIN, USER_ROLES.TSSC_MANAGER]) &&
                    <td className={ `${ styles.colClient } text-break` }>
                      {row.client}
                    </td>
                  }
                  <td className={ `${ styles.colProject } text-break` }>
                    {row.project}
                  </td>
                  <td className={ `${ styles.colSla } text-break` }>
                    { row.deadline && <SlaCountDown deadline={ row.deadline } nearDeadline={ row.nearDeadline }/> }
                  </td>
                  <td className={ styles.colUser }>
                    { role === USER_ROLES.TSSC_MANAGER ?
                      <div className={ styles.ellipsis } title={ row.languageExpert }>{ row.languageExpert }</div>
                      :
                      <div className={ styles.ellipsis } title={ row.agent }>{ row.agent }</div>
                    }
                  </td>
                  <td className={ styles.colLanguagePair }>
                    {row.languagePair}
                  </td>
                  <td className={ `${styles.colStatus} ${styles[`colStatus-${row.status}`]}` }>
                    { intl.formatMessage({ id: `label.pendingTranslations.ticket_${row.status}` }) }
                    { row.status === TICKET_STATUS.REJECTED &&
                      <>
                        <InfoIcon
                          className={ styles.infoIcon }
                          data-tip={ `
                            <div>
                              <div class="font-weight-bold">${ row.rejectionCategory }</div>
                              <div class="${ styles.rejectionReason }">${ row.rejectionReason }</div>
                            </div>
                          ` }
                          data-html={ true }
                          data-for="rejectReason"
                        />
                      </>
                    }
                  </td>
                  <td className={ styles.colTimeSent }>
                    {row.timeSent}
                  </td>
                  <td className={ styles.colTimeResponse }>
                    {row.timeResponse}
                  </td>
                  <td className={ styles.colActions }>
                    {((!checkedTickets.includes(row.id) && checkedTickets.length > 1) || checkedTickets.length <= 1) &&
                    <DropdownButton
                      onReassign={ () => handleReassignClick(row.id, false) }
                      onReassignToMe={ () => handleReassignClick(row.id, true) }
                      onAbandonClick={ () => handleAbandonClick(row.id) }
                      hasOnlyReassign={ role === USER_ROLES.TSSC_MANAGER }
                      disabled={ isSubmitting }
                      isScrolling={ isScrolling }
                    />
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className={ styles.total }>
            <FormattedMessage id="label.ticket.total" />
            <span className={ styles.totalValue }>{ pendingTranslations.length }</span>
          </div>
        </>
        : isLoading ?
          <div className={ `${styles.loadingWrapper} text-center mt-5 ` }>
            <Loader small />
          </div> :
          <Row className="mt-4">
            <Col md={ 12 } className="align-middle text-center">
              <h5>
                {pendingTranslations !== null &&
                <FormattedMessage id="label.notFoundFilters" />
                }
              </h5>
            </Col>
          </Row>
      }
      <ReactTooltip
        className={ styles.tooltip }
        place="right"
        arrowColor={ TRANSPARENT }
        textColor={ PRIMARY_COLOR }
        backgroundColor={ WHITE }
        html={ true }
        id="rejectReason"
      />
      <ReassignModal
        show={ showReassignModal }
        isSubmitting={ isSubmitting }
        availableAgents={ availableAgents }
        onHide={ () => setShowReassignModal(false) }
        setSelectedAgent={ setSelectedAgent }
      />
      <ConfirmationModal
        show={ abandonModalSettings.show === 'one' }
        handleClose={ resetAbandonModalSettings }
        handleYes={ abandonModalSettings.handleYes }
        yesButtonText={ intl.formatMessage({ id: 'label.yes' }) }
        title={ intl.formatMessage({ id: 'label.confirmationAbandonTicket' }) }
      />
      <BulkAbandonConfirmation
        show={ abandonModalSettings.show === 'bulk' }
        handleClose={ resetAbandonModalSettings }
        handleYes={ abandonModalSettings.handleYes }
      />
    </>
  </>;
}

export default PendingTranslations;
