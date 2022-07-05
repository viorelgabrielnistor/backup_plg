import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import { FormattedMessage, useIntl } from 'react-intl';
import { Field, Formik } from 'formik';
import cloneDeep from 'lodash/cloneDeep';
import Spinner from 'react-bootstrap/Spinner';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import useUserDetails from '../../hooks/useUserDetails';
import userValidationSchema from './validationSchema';
import InputField from '../shared/fields/InputField';
import CustomSelect from '../shared/fields/CustomSelect';
import { getCustomSelectValue, getDetailsSelectValue } from '../../helpers/formatForFields';
import routePaths from '../../routes/routePaths';
import ConfirmationModal from '../shared/confirmationModal/confirmationModal';
import { IUserFormValues } from '../../services/usersInterface';
import allUsersServices from '../../services/users';
import { USER_ROLES } from '../../constants';
import useClients from '../../hooks/useClients';
import { usersApi } from '../../api/usersApi';
import useHandleErrors from '../../hooks/useHandleErrors';
import useIsMountedRef from '../../hooks/useIsMountedRef';
import useGenericFetch from '../../hooks/useGenericFetch';
import { clientsApi } from '../../api/clientsApi';
import allClientsService from '../../services/allClients';
import UserDetailsFormWrapper from './UserDetailsFormWrapper';
import TeamLeadDetails from './TeamLeadDetails';
import LanguageExpertDetails from './LanguageExpertDetails';
import TsscManagerDetails from './TsscManagerDetails';
import AgentDetails from './AgentDetails';
import OpsManagerDetails from './OpsManagerDetails';
import { USER_TYPE, NEW_USER_ROLE, USED_EMAIL_VALIDATION } from '../../constants/user';
import useLoggedUserData from '../../store/useLoggedUserData';
import useLanguagePairsOptions from '../../hooks/useLanguagePairsOptions';
import { hasRole, isTeamLeadOrOpsManager } from '../../helpers/loggedUser';
import useDocumentTitle from '../../hooks/useDocumentTitle';

import styles from './UserDetails.module.scss';

export interface IProjectDisplay {
  name: string;
  languagePairs: string;
  active: boolean;
  id: string;
}

const UserDetails: FC<{}> = () => {
  const intl = useIntl();
  const history = useHistory();
  const isMountedRef = useIsMountedRef();
  const [ handleErrors ] = useHandleErrors();
  const { userId } = useParams();
  useDocumentTitle(intl.formatMessage({ id: `label.page.${ userId ? 'userEdit' : 'userAdd' }` }));
  const { loggedUserData:
    {
      id,
      role: loggedUserRole,
      allClients: loggedUserAllClients
    }
  } = useLoggedUserData();
  const isAdmin = loggedUserRole === USER_ROLES.ADMIN;
  const isTsscM = loggedUserRole === USER_ROLES.TSSC_MANAGER;

  const handleUnauthorizedError = (errorResponse): void => {
    if (errorResponse.status === 404) {
      history.push(routePaths.admin.users);
    }
  };

  const formatClientsForSelect = useCallback((clients) => getDetailsSelectValue(clients, ` (${intl.formatMessage({ id: 'label.deactivated' })})`), [intl]);

  const [ user, roles, isLoading, isLoadingRoles ] = useUserDetails(userId || '', handleUnauthorizedError);
  console.log(user);
  const { clients: allClients, isLoading: isLoadingClients } = useClients();
  const [ tsscClients, isLoadingTsscClients ] = useGenericFetch(
    clientsApi.getTsscClients.bind(clientsApi),
    allClientsService.from.bind(allClientsService),
    null,
    null,
    isAdmin || isTsscM
  );
  const tsscClientsOptions = useMemo(() => tsscClients ? formatClientsForSelect(tsscClients) : [], [tsscClients, formatClientsForSelect]);
  const clientOptions = useMemo(() => {
    const userClients = isAdmin ? allClients?.filter(client => !!client.projects.length) : isTsscM ? tsscClients: loggedUserAllClients;
    return userClients ? formatClientsForSelect(userClients) : [];
  }, [allClients, tsscClients, loggedUserAllClients, isAdmin, isTsscM, formatClientsForSelect]);
  const [ hasSpecificClients, setHasSpecificClients ] = useState(false);
  const [ currentRole, setCurrentRole ] = useState(user.role.code || NEW_USER_ROLE.code);
  const hasFormChanged = (values): boolean => JSON.stringify(user) !== JSON.stringify(values);
  const roleOptions = useMemo(() => {
    if (!roles) return [];

    return roles.filter((role) => {
      switch (loggedUserRole) {
        case USER_ROLES.ADMIN:
          return true;
        case USER_ROLES.TSSC_MANAGER:
          return role.name !== USER_ROLES.ADMIN;
        default:
          return ![USER_ROLES.TSSC_MANAGER, USER_ROLES.ADMIN].includes(role.name);
      }
    }).map(({ id, name }) => (
      getCustomSelectValue(intl.formatMessage({ id: 'label.role.' + name }), id.toString(), { code: name }))
    );
  }, [roles, loggedUserRole, intl]);
  const [ allLanguagePairs, isLoadingLanguagePairs ] = useLanguagePairsOptions();
  const languageOptions = useMemo(() => {
    if (!allLanguagePairs || isLoadingLanguagePairs) return [];

    const languagePairsOptions = cloneDeep(allLanguagePairs);
    user.languageQueues.forEach((userLanguagePair) => {
      if (!languagePairsOptions.find(activeLanguagePair =>
        activeLanguagePair.from.code === userLanguagePair.from.code &&
        activeLanguagePair.to.code === userLanguagePair.to.code)
      ) {
        languagePairsOptions.push({
          ...userLanguagePair,
          label: `${ userLanguagePair.label } (${ intl.formatMessage({ id: 'label.deactivated' }) })`
        })
      }
    });
    return languagePairsOptions;
  }, [allLanguagePairs, isLoadingLanguagePairs, user.languageQueues, intl]);

  useEffect(() => {
    if (!user.editable) {
      history.push(routePaths.admin.users);
    }
    // eslint-disable-next-line
  }, [isLoading]);

  useEffect(() => {
    isMountedRef.current && setCurrentRole(user.role.code);
  }, [user.role.code, isMountedRef]);

  const [ isModalOpen, setIsModalOpen ] = useState(false);
  const handleCloseModal = (): void => {
    isMountedRef.current && setIsModalOpen(false);
  };
  const handleCancelConfirmation = (): void => {
    handleCloseModal();
    history.push(routePaths.admin.users);
  };
  const handleCancel = (values: IUserFormValues): void => {
    if (JSON.stringify(user) !== JSON.stringify(values)) {
      isMountedRef.current && setIsModalOpen(true);
    } else {
      handleCancelConfirmation();
    }

    return;
  };

  const handleRoleChange = (setFieldValue, setFieldTouched, touched) => {
    return (roleId): void => {
      const currentRole = roles.find((role) => role.id.toString() === roleId)!.name;
      setFieldValue('languageQueues', []);
      if (touched.languageQueues) {
        setTimeout(() => setFieldTouched('languageQueues', true));
      }
      setFieldValue('clients', isTeamLeadOrOpsManager(loggedUserRole)
        ? clientOptions.find((option) => option.value === loggedUserAllClients[0].id)
        : currentRole === USER_ROLES.TSSC_MANAGER ? tsscClientsOptions : []
      );
      if (touched.clients) {
        setTimeout(() => setFieldTouched('clients', true));
      }
      setFieldValue('assignedProjects', []);
      if (touched.assignedProjects) {
        setTimeout(() => setFieldTouched('assignedProjects', true));
      }
      setCurrentRole(currentRole);
    };
  };

  const handleChangeValidationMessage = (message: string): string => {
    if (message === USED_EMAIL_VALIDATION && isTeamLeadOrOpsManager(loggedUserRole)) {
      return intl.formatMessage({ id: 'label.error.email.contactSupervisor' });
    }
    return message;
  };

  const selectUserType = [
    { 'label': intl.formatMessage({ id: 'label.user.internalUser' }), 'value': USER_TYPE.INTERNAL_USER },
    { 'label': intl.formatMessage({ id: 'label.user.externalUser' }), 'value': USER_TYPE.EXTERNAL_USER },
  ]

  return (
    <>
      {
        isLoading || isLoadingRoles || isLoadingClients || isLoadingTsscClients || !clientOptions ? (
          <Spinner animation="border" />
        ) : (
          <>
            <Col md={ 12 } className={ styles.titleWrapper }>
              {
                userId ?
                  <h1><FormattedMessage id="label.user.editUser" /></h1>
                  :
                  <h1><FormattedMessage id="label.user.newUser" /></h1>
              }
            </Col>
            <Formik
              initialValues={ user }
              validationSchema={ userValidationSchema(intl, currentRole, hasSpecificClients) }
              onSubmit={ async (values, { setSubmitting, setFieldError }) => {
                try {
                  if (userId) {
                    await usersApi.updateUser(userId, allUsersServices.toUserFromForm(values));
                  } else {
                    await usersApi.setNewUser(allUsersServices.toUserFromForm(values));
                  }
                  history.push(routePaths.admin.users);
                } catch (e) {
                  handleErrors(e, setFieldError, handleChangeValidationMessage);
                } finally {
                  isMountedRef.current && setSubmitting(false);
                }
              } }
            >
              {({
                values,
                handleSubmit,
                setFieldValue,
                setFieldTouched,
                isSubmitting,
                touched,
                errors
              }) => (
                <UserDetailsFormWrapper
                  allLanguagePairs={ allLanguagePairs }
                  allClients={ allClients }
                >
                  { projectValues => (
                    <Form onSubmit={ handleSubmit } className="container-fluid">
                      <Row className="mb-4">
                        <Col md={ 4 }>
                          <div className="mb-4">
                            <Field
                              component={ InputField }
                              placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
                              type="text"
                              name="firstName"
                              label={ intl.formatMessage({ id: 'label.firstName' }) }
                              isRequired
                              isInvalid={ !!touched.firstName && !!errors.firstName }
                            />
                          </div>
                          <div className="mb-4">
                            <Field
                              component={ InputField }
                              placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
                              type="text"
                              name="lastName"
                              label={ intl.formatMessage({ id: 'label.lastName' }) }
                              isRequired
                              isInvalid={ !!touched.lastName && !!errors.lastName }
                            />
                          </div>
                          <div className="mb-4">
                            <Field
                              component={ InputField }
                              placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
                              type="email"
                              name="email"
                              label={ intl.formatMessage({ id: 'label.email' }) }
                              isRequired
                              isInvalid={ !!touched.email && !!errors.email }
                            />
                          </div>
                          {userId !== id ? 
                            <div className="mb-4">
                              <Field
                                component={ CustomSelect }
                                name="active"
                                options={ [
                                  { label: intl.formatMessage({ id: 'label.active' }), value: true },
                                  { label:intl.formatMessage({ id: 'label.inactive' }), value: false }
                                ] }
                                isMulti={ false }
                                label={ intl.formatMessage({ id: 'label.status' }) }
                                isRequired
                                isInvalid={ !!touched.active && !!errors.active }
                              />
                            </div> 
                            : null
                          }
                        </Col>
                        <Col>
                          <div className="mb-4 w-50">
                            <Field
                              component={ CustomSelect }
                              name="role"
                              options={ roleOptions }
                              isMulti={ false }
                              valueAsObject
                              handleOnChange={ handleRoleChange(setFieldValue, setFieldTouched, touched) }
                              label={ intl.formatMessage({ id: 'label.table.role' }) }
                              disabled={ hasRole(loggedUserRole, [USER_ROLES.TEAM_LEAD, USER_ROLES.TSSC_MANAGER]) }
                              isRequired
                              isInvalid={ !!touched.role && !!errors.role }
                            />
                          </div>
                          <div className="mb-4 w-50">
                            <Field
                              name="type"
                              value={ values.type }
                              options={ selectUserType }
                              component={ CustomSelect }
                              label={ intl.formatMessage({ id: 'label.authentication' }) }
                              isRequired
                              isMulti={ false }
                              isInvalid={ !!touched.type && !!errors.type }
                            />
                          </div>
                          <div className="mb-4 w-50">
                            <Field
                              component={ InputField }
                              placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
                              type="text"
                              value={ values.externalId }
                              name="externalId"
                              label={ intl.formatMessage({ id: 'label.windowsAccount' }) }
                              isRequired={ values.type === USER_TYPE.EXTERNAL_USER }
                              isInvalid={ !!touched.externalId && !!errors.externalId }
                            />
                          </div>
                          {
                            {
                              [USER_ROLES.ADMIN]: null,
                              [USER_ROLES.COMBO_USER]: (
                                <TeamLeadDetails
                                  clients={ clientOptions }
                                  projects={ projectValues }
                                  selectedProjects={ values.assignedProjects }
                                  languageOptions={ languageOptions }
                                  isLoadingLanguages={ isLoadingLanguagePairs }
                                  touched={ touched }
                                  errors={ errors }
                                  requiredLanguage
                                  setFieldValue={ setFieldValue }
                                />
                              ),
                              [USER_ROLES.TEAM_LEAD]: (
                                <TeamLeadDetails
                                  clients={ clientOptions }
                                  projects={ projectValues }
                                  selectedProjects={ values.assignedProjects }
                                  languageOptions={ languageOptions }
                                  isLoadingLanguages={ isLoadingLanguagePairs }
                                  touched={ touched }
                                  errors={ errors }
                                  setFieldValue={ setFieldValue }
                                />
                              ),
                              [USER_ROLES.OPS_MANAGER]: (
                                <OpsManagerDetails
                                  clients={ clientOptions }
                                  projects={ projectValues }
                                  selectedProjects={ values.assignedProjects }
                                  languageOptions={ languageOptions }
                                  isLoadingLanguages={ isLoadingLanguagePairs }
                                  touched={ touched }
                                  errors={ errors }
                                />
                              ),
                              [USER_ROLES.TSSC_MANAGER]: (
                                <TsscManagerDetails
                                  clients={ clientOptions }
                                  projects={ projectValues }
                                  selectedProjects={ values.assignedProjects }
                                  languageOptions={ languageOptions }
                                  isLoadingLanguages={ isLoadingLanguagePairs }
                                  allowToEditClients={ isAdmin }
                                  touched={ touched }
                                  errors={ errors }
                                />
                              ),
                              [USER_ROLES.AGENT]: (
                                <AgentDetails
                                  clients={ clientOptions }
                                  projects={ projectValues }
                                  selectedProjects={ values.assignedProjects }
                                  touched={ touched }
                                  errors={ errors }
                                  setFieldValue={ setFieldValue }
                                />
                              ),
                              [USER_ROLES.LANGUAGE_EXPERT]: (
                                <LanguageExpertDetails
                                  languageOptions={ languageOptions }
                                  isLoadingLanguages={ isLoadingLanguagePairs }
                                  clients={ clientOptions }
                                  tsscClients={ tsscClientsOptions }
                                  projects={ projectValues }
                                  selectedProjects={ values.assignedProjects }
                                  touched={ touched }
                                  errors={ errors }
                                  setFieldValue={ setFieldValue }
                                  values={ values }
                                  handleHasSpecificClients={ setHasSpecificClients }
                                />
                              ),
                            }[currentRole]
                          }
                        </Col>
                      </Row>
                      <Row>
                        <Col md={ 6 }>
                          <button type="button" className={ styles.buttonCancel } onClick={ () => { handleCancel(values) } } data-qa="cancel">
                            <FormattedMessage id={ hasFormChanged(values) ? 'label.cancel' : 'label.back' } />
                          </button>
                        </Col>
                        <Col md={ 6 } className="text-right">
                          <button type="submit" className={ styles.buttonSave } disabled={ isSubmitting } data-qa="submit">
                            <FormattedMessage id="label.saveChanges" />
                            {
                              isSubmitting &&
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="ml-2"
                            />
                            }
                          </button>
                        </Col>
                      </Row>
                      <ConfirmationModal
                        show={ isModalOpen }
                        handleClose={ handleCloseModal }
                        handleYes={ handleCancelConfirmation }
                        title={ intl.formatMessage({ id: 'label.confirmationTitle' }) }
                        text={ intl.formatMessage({ id: 'label.confirmationText' }) }
                      />
                    </Form>
                  )}
                </UserDetailsFormWrapper>
              ) }
            </Formik>
          </>
        )}
    </>
  );
};

export default UserDetails;
