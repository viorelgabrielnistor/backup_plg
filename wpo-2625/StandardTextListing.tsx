import React, { FC, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useHistory } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { toast } from 'react-toastify';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

import useAvailableLanguages from '../../hooks/useAvailableLanguages';
import CustomSelectSimple from '../shared/fields/CustomSelectSimple';
import useHandleErrors from '../../hooks/useHandleErrors';
import useStandardText from '../../hooks/useStandardText';
import useLoadingQue from '../../hooks/useLoadingQue';
import useClients from '../../hooks/useClients';
import useAllProjectsForClients from '../../hooks/useAllProjectsForClients';
import { standardTextApi } from '../../api/standardTextApi';

import Table from 'react-bootstrap/Table';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

import routePaths from '../../routes/routePaths';
import patchValue from '../../helpers/patchValue';
import { DEFAULT_LANGUAGE, USER_ROLES, STATUS } from '../../constants';
import { toPath } from '../../helpers';
import { getCustomSelectValue } from '../../helpers/formatForFields';
import { ICustomSelectOption } from '../shared/fields/CustomSelectInterface';
import ToggleButtonSimple from '../shared/fields/ToggleButtonSimple';
import useLoggedUserData from '../../store/useLoggedUserData';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import ReorderSTModal from './ReorderSTModal';

import styles from './StandardTextListing.module.scss';
import ConfirmationModal from '../shared/confirmationModal/confirmationModal';
import { ReactComponent as Delete } from '../../assets/images/Delete.svg';

interface ILocationState {
  language: string;
  client: string;
  project: string;
  status: string;
}

const getStatusByValue = (status: string): STATUS => {
  switch(status) {
    case STATUS.ACTIVE: return STATUS.ACTIVE;
    case STATUS.INACTIVE: return STATUS.INACTIVE;
    default: return STATUS.ACTIVE;
  }
}

const StandardTextListing: FC<{}> = () => {
  const [addToLoadingQue, removeFromLoadingQue, isInLoadingQue] = useLoadingQue();
  const { loggedUserData: { role, allClients: assignedClients } } = useLoggedUserData();
  const [availableLanguages, isLoadingLanguage] = useAvailableLanguages();
  const [language, setLanguage] = useState('');
  const { clients: allClients, isLoading: isLoadingClients } = useClients(role === USER_ROLES.ADMIN);
  const [clients, setClients] = useState<ICustomSelectOption[]>([]);
  const [projectsOptions, setProjectsOptions] = useState<ICustomSelectOption[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [languageName, setLanguageName] = useState('');
  const clientName = useMemo(
    () => {
      const clients = role === USER_ROLES.ADMIN ? allClients : assignedClients;
      return clients?.find(({ id }) => id === selectedClient)?.name || '';
    },
    [selectedClient, allClients, assignedClients, role]
  );
  const [reorderSTModalOpen, setReorderSTModalOpen] = useState(false);
  const location = useLocation<ILocationState>();
  const [statusFilter, setStatusFilter] = useState(getStatusByValue(location.state?.status));
  const [getAllProjectsForClients, projects] = useAllProjectsForClients();
  const [triggerFetchList, setTriggerFetchList] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryId, setCategoryId] = useState('')
  const [, standardTexts, toggleCategory, isLoadingTable] = useStandardText(selectedClient, selectedProject, language, statusFilter, triggerFetchList);
  const [handleErrors] = useHandleErrors();
  const intl = useIntl();
  const history = useHistory();
  useDocumentTitle(intl.formatMessage({ id: 'label.page.standardRepliesListing' }));

  const handleCloseModal: () => void = () => {
    setIsDeleteModalOpen(false);
  };

  useEffect(() => {
    if (location.state) {
      if (location.state.language) {
        setLanguage(location.state.language);
      }
      if (location.state.client) {
        setSelectedClient(location.state.client);
      }
      if (location.state.project) {
        setSelectedProject(location.state.project);
      }
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (availableLanguages[0]) {
      if (!(location.state && location.state.language)) {
        setLanguage(
          availableLanguages.find(({ value }) => value === DEFAULT_LANGUAGE)
            ? DEFAULT_LANGUAGE
            : availableLanguages[0].value
        )
      }
    }
    // eslint-disable-next-line
  }, [isLoadingLanguage]);

  useEffect(() => {
    if (availableLanguages) {
      const selectedLang = availableLanguages.find(({ value }) => value === language);
      setLanguageName(selectedLang ? selectedLang.label : '');
    }
    // eslint-disable-next-line
  }, [language]);

  useEffect(() => {
    if (selectedClient) {
      getAllProjectsForClients([selectedClient]);
    }
    // eslint-disable-next-line
  }, [selectedClient]);

  useEffect(() => {
    const clientsToDisplay = (role === USER_ROLES.ADMIN ? allClients?.filter(client => !!client.projects.length) : assignedClients);
    if (clientsToDisplay && clientsToDisplay.length) {
      if (!(location.state && location.state.client)) {
        setSelectedClient(clientsToDisplay[0].id);
      }
      setClients(clientsToDisplay.map(({ id, name }) => getCustomSelectValue(name, id)));
    }
    // eslint-disable-next-line
  }, [isLoadingClients, assignedClients, allClients]);

  useEffect(() => {
    if (!(location.state && location.state.project) && projectsOptions[0]) {
      setSelectedProject(projectsOptions[0].value);
    }
    // eslint-disable-next-line
  }, [projectsOptions]);

  useEffect(() => {
    if (projects) {
      setProjectsOptions(projects.map(({ id, name, clientId }) => getCustomSelectValue(name, id, { clientId })));
    }
  }, [projects]);

  const handleStatusChange = async (id: string, active: boolean): Promise<void> => {
    if (id && language) {
      try {
        addToLoadingQue(id);
        await toggleCategory(selectedClient, id, language, patchValue.getActiveStatusValue(`${!active}`));
        toast.success(intl.formatMessage({ id: 'label.success.status' }));
      } catch (e) {
        handleErrors(e);
      } finally {
        removeFromLoadingQue(id);
      }
    }
  };

  const handleFilterChange = (option, key, setCallback): void => {
    const locationState: ILocationState = { ...location.state, [key]: option };
    if (key === 'client') {
      locationState.project = '';
    }
    if (key === 'project' && !locationState.client) {
      locationState.client = selectedClient;
    }
    setCallback(option);
    history.replace(location.pathname, locationState);
  };

  const clickHandler = (id: string): void => {
    setIsDeleteModalOpen(true);
    setCategoryId(id);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  const handleDeleteMessageConfirmation =  async ():  Promise<void> => {
    setIsDeleteModalOpen(false)
    console.log('standardTexts: ', standardTexts);
    try {
      setIsDeleting(true);
      console.log('categoryId: ', categoryId);

      const client = location.state.client;

      if (categoryId) {
        // const { data } = await standardTextApi.getStandardTextById( { client, language, categoryId })
        // console.log('subjects: ', data.subjects);
        // console.log('data: ', data);
        standardTextApi.deleteStandardTextById({ client, language, categoryId })
      }
    } catch (e) {
      handleErrors(e);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      {
        isLoadingLanguage || isLoadingClients ? (
          <div className="align-middle text-center">
            <div className="spinner-border" role="status" />
          </div>
        ) :
          (
            <>
              <Row>
                <Col md={ 6 }>
                  <h1>{ intl.formatMessage({ id: 'label.standardText' }) }</h1>
                </Col>
                <Col className="text-right" md={ 6 }>
                  <NavLink to={ {
                    pathname: toPath(routePaths.admin.standardRepliesAddEdit, { language, client: selectedClient, status: statusFilter, categoryId: '' }),
                    state: { language, client: selectedClient, project: selectedProject, maxOrder: standardTexts?.length }
                  } }>
                    <Button
                      className={ `ml-n3 ${styles.button}` }
                      size="sm"
                      variant="secondary">
                      <FormattedMessage id="label.button.addNewCategory" />
                    </Button>
                  </NavLink>
                </Col>
              </Row>
              <div className="mt-5">
                <Row>
                  <Col className={ `${styles.filterItem} mt-auto` }>
                    <h3 className="align-middle text-left mb-2">
                      <FormattedMessage id="label.table.language" />
                    </h3>
                    <CustomSelectSimple
                      name="availableLanguages"
                      className={ styles.standardTextSelect }
                      options={ availableLanguages }
                      value={ language }
                      handleChange={ (option) => handleFilterChange(option.value, 'language', setLanguage) }
                    />
                  </Col>
                  <Col className={ `${styles.filterItem} mt-auto` }>
                    <h3 className="align-middle text-left mb-2">
                      <FormattedMessage id="label.table.client" />
                    </h3>
                    <CustomSelectSimple
                      name="clients"
                      className={ styles.standardTextSelect }
                      options={ clients }
                      value={ selectedClient }
                      handleChange={ (option) => handleFilterChange(option.value, 'client', setSelectedClient) }
                      disabled={ role !== USER_ROLES.ADMIN || isLoadingTable }
                    />
                  </Col>
                  <Col className={ `${styles.filterItem} mt-auto` }>
                    <h3 className="align-middle text-left mb-2">
                      <FormattedMessage id="label.table.projects" />
                    </h3>
                    <CustomSelectSimple
                      name="projects"
                      className={ styles.standardTextSelect }
                      options={ projectsOptions }
                      value={ selectedProject }
                      handleChange={ (option) => handleFilterChange(option.value, 'project', setSelectedProject) }
                      disabled={ (role !== USER_ROLES.ADMIN && role !== USER_ROLES.OPS_MANAGER) || isLoadingTable }
                    />
                  </Col>
                  <Col className={ `${styles.filterItem} mt-auto` }>
                    <h3 className="align-middle text-left mb-2">
                      <FormattedMessage id="label.show" />
                    </h3>
                    <ToggleButtonSimple
                      options={ [
                        { value: STATUS.ACTIVE, label: intl.formatMessage({ id: 'label.active' }) },
                        { value: STATUS.INACTIVE, label: intl.formatMessage({ id: 'label.inactive' }) }
                      ] }
                      groupValue={ statusFilter }
                      handleChange={ (value) => handleFilterChange(value, 'status', setStatusFilter) }
                      className={ styles.filterToggle }
                    />
                  </Col>
                  <Col className={ `${styles.filterItem} ml-auto mt-auto pl-0` }>
                    <button 
                      type="button"
                      disabled={ !!standardTexts && !standardTexts.length }
                      className={ styles.reorderBtn } 
                      onClick={ () => setReorderSTModalOpen(true) }
                    >
                      <FormattedMessage id="label.button.reoderStandardTexts" />
                    </button>
                  </Col>
                </Row>
              </div>
              <Row>
                <Col md={ 12 }>
                  {
                    isLoadingTable ? (
                      <div className="align-middle text-center mt-5">
                        <div className="spinner-border" role="status" />
                      </div>
                    ) :
                      standardTexts?.length ?
                        (
                          <Table className={ `mx-auto mt-5 ${styles.table}` }>
                            <thead>
                              <tr className={ styles.tableHeader }>
                                <th className="align-middle text-center w-5">#</th>
                                <th className="align-middle w-10">
                                  <FormattedMessage id="label.table.categoryName" />
                                </th>
                                <th className="align-middle text-center w-10" >
                                  <FormattedMessage id="label.table.status" />
                                </th>
                                <th className="align-middle w-15">
                                  <FormattedMessage id="label.table.subject" />
                                </th>
                                <th className="align-middle text-center w-10">
                                  <FormattedMessage id="label.table.status" />
                                </th>
                                <th className="align-middle w-25">
                                  <FormattedMessage id="label.table.label" />
                                </th>
                                <th className="align-middle text-center w-15">
                                  <FormattedMessage id="label.table.actionPerCategory" />
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {
                                standardTexts.map(({ id, name, active, subjects, projects }, index) => {
                                  return (
                                    <tr key={ index } className={ styles.tableRow }>
                                      <td className="text-center"> { index + 1 }</td>
                                      <td className={ styles.name }>
                                        <OverlayTrigger 
                                          placement="bottom"
                                          overlay={ <Tooltip id="tooltip-projects" className="header">
                                            { projects }
                                          </Tooltip> }
                                        >
                                          <p>{ name }</p>
                                        </OverlayTrigger>
                                      </td>
                                      <td className={ `text-center ${styles.status} ${!active ? styles.statusInactive : ''}` }>
                                        <FormattedMessage id={ `label.${active ? 'active' : 'inactive'}` } />
                                      </td >
                                      <td colSpan={ 3 } className="p-0" >
                                        <table className={ `w-100 ${styles.customTable}` }>
                                          <tbody>
                                            {
                                              subjects.map(({ name, labelSubject, status }, i) => {
                                                return (
                                                  <tr key={ i }>
                                                    { name }
                                                    { status }
                                                    { labelSubject }
                                                  </tr>
                                                )
                                              })
                                            }
                                          </tbody>
                                        </table>
                                      </td>
                                      <td className="text-center align-middle">
                                        <div className={ `${styles.editColumnWrapper} ${styles.editButtonsWrapper}`  }>
                                          <NavLink
                                            to={ {
                                              pathname: toPath(routePaths.admin.standardRepliesAddEdit,
                                                { language, client: selectedClient, status: statusFilter, categoryId: id! }),
                                              state: { language, client: selectedClient, project: selectedProject }
                                            } }>
                                            <Button variant="link" className={ `p-0 pr-4 ${styles.actionLink}` } >
                                              <FormattedMessage id="label.button.edit" />
                                            </Button>
                                          </NavLink>
                                          {/* <Button
                                            variant="link"
                                            onClick={ () => clickHandler(id!) }
                                            className={ `p-0 ${styles.actionLink} ${styles.actionLinkAlert} }` }
                                          > */}
                                          {/* <FormattedMessage id={ 'label.button.delete' } /> */ }
                                            
                                          {/* 
                                          </Button> */}
                                          
                                          {
                                            isInLoadingQue(id) ?
                                              <div className="spinner-border mx-auto align-middle" role="status" />
                                              :
                                              <Button
                                                variant="link"
                                                onClick={ () => handleStatusChange(id!, active) }
                                                className={ `p-0 ${styles.actionLink} ${active ? styles.actionLinkAlert : ''} }` }
                                              >
                                                <FormattedMessage id={ `label.button.${!active ? 'activate' : 'deactivate'}` } />
                                              </Button>
                                          }
                                          <Delete onClick={ () => clickHandler(id!) } className={ styles.deleteIcon } />
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })
                              }
                            </tbody>
                          </Table>
                        ) : (
                          < div className="align-middle text-center mt-5">
                            <h5>
                              <FormattedMessage id="label.notFoundFilters" />
                            </h5>
                          </div>
                        )
                  }
                </Col>
              </Row>
              <ReorderSTModal
                languageName={ languageName }
                clientName={ clientName }
                client={ selectedClient }
                language={ language }
                show={ reorderSTModalOpen }
                handleClose={ () => setReorderSTModalOpen(false) }
                handleTriggerFetchList={ () => setTriggerFetchList(!triggerFetchList) }
              />
              <ConfirmationModal
                show={ isDeleteModalOpen }
                handleClose={ handleCloseModal }
                handleYes={ handleDeleteMessageConfirmation }
                yesButtonText={ intl.formatMessage({ id: 'label.yes' }) }
                title={ intl.formatMessage({ id: 'label.confirmationDeleteStandardReplyCategory' }) }
                isLoading={ isDeleting }
              />
            </>
          ) }
    </>
  );
};

export default StandardTextListing;
