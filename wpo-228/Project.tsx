import React, { FC, useEffect, useMemo, useState, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { FastField, Field, FieldArray, Formik, getIn, validateYupSchema, yupToFormErrors } from 'formik';
import { useHistory, useParams } from 'react-router';
import { toast } from 'react-toastify';
import cloneDeep from 'lodash/cloneDeep';
import set from 'lodash/set';

import Spinner from 'react-bootstrap/Spinner';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';

import InputField from '../../shared/fields/InputField';
import ToggleButton from '../../shared/fields/ToggleButton';
import CheckboxGroup from '../../shared/fields/CheckboxGroup';
import ConfirmationModal from '../../shared/confirmationModal/confirmationModal';
import RadioButton from '../../shared/fields/RadioButton';
import CustomTextArea from '../../shared/fields/CustomTextArea';
import CustomSelect from '../../shared/fields/CustomSelect';
import AgentNotifications from './AgentNotifications';
import LanguageExpertNotifications from './LanguageExpertNotifications';
import LanguagePairs from './LanguagePairs';
import RejectCategories from './RejectCategories';

import routePaths from '../../../routes/routePaths';
import { projectsApi } from '../../../api/projectsApi';
import projectService from '../../../services/project';
import { IProjectValues } from '../../../services/projectInterface';
import { IProvider } from '../../../services/languagePairsInterface';
import {
  DEFAULT_FORMALITY,
  FORMALITY_TYPES,
  MANDATORY_TICKET_DETAILS,
  NOTIFICATION_TYPES,
  PROJECT_TYPES,
  REASSIGN_LOGIC,
  REMINDER_TYPES,
  WORKFLOWS
} from '../../../constants/project';
import { getCustomSelectValue, getLabelValue } from '../../../helpers/formatForFields';
import { toPath } from '../../../helpers';
import useProjectDetails from '../../../hooks/useProjectDetails';
import useIsMountedRef from '../../../hooks/useIsMountedRef';
import useAvailableLanguages from '../../../hooks/useAvailableLanguages';
import useLanguages from '../../../store/useLanguages';
import useHandleErrors from '../../../hooks/useHandleErrors';
import useLoggedUserData from '../../../store/useLoggedUserData';
import { projectValidationSchema } from './validationSchema';
import useDocumentTitle from '../../../hooks/useDocumentTitle';
import SlaSettings from './SlaSettings';

import styles from './Project.module.scss';

const Project: FC<{}> = () => {
  const intl = useIntl();
  const history = useHistory();
  const [handleErrors] = useHandleErrors();
  const isMountedRef = useIsMountedRef();
  const { clientId = '', projectId = '' } = useParams<{ clientId: string; projectId: string }>();
  // const { clientId = '', projectId = '' } = useParams();
  const [project, isLoading, projectPrevState, setProjectPrevState] = useProjectDetails(clientId, projectId);
  const [availableLanguages, isLoadingLanguages] = useAvailableLanguages();
  const [, isLoadingAllLanguages, , , getLanguageName] = useLanguages();
  const { getAllUserDetails } = useLoggedUserData();
  const fieldRef = useRef<HTMLInputElement>(null);

  useDocumentTitle(intl.formatMessage({ id: `label.page.${ projectId ? 'projectEdit' : 'projectAdd' }` }));

  const formalityTypes = useMemo(
    () => Object.values(FORMALITY_TYPES).map(type => (
      getCustomSelectValue(intl.formatMessage({ id: `label.project.formality.${ type }` }), type))
    ), [intl]
  );
  const agentNotificationTypes = useMemo(
    () => Object.values(NOTIFICATION_TYPES).map(type => (
      getCustomSelectValue(intl.formatMessage({ id: `label.project.notification.agent.${ type }` }), type))
    ), [intl]
  );
  const notificationTypes = useMemo(
    () => Object.values(NOTIFICATION_TYPES).map(type => (
      getCustomSelectValue(intl.formatMessage({ id: `label.project.notification.${ type }` }), type))
    ), [intl]
  );
  const reminderTypes = useMemo(
    () => Object.values(REMINDER_TYPES).map(type => (
      getCustomSelectValue(intl.formatMessage({ id: `label.project.reminder.${ type }` }), type))
    ), [intl]
  );

  const [ isModalOpen, setIsModalOpen ] = useState(false);
  const handleCloseModal = (): void => {
    setIsModalOpen(false);
  };
  const handleCancelConfirmation = (): void => {
    handleCloseModal();
    history.push(toPath(routePaths.admin.client, { clientId }));
  };
  const handleCancel = (values: IProjectValues): void => {
    if (JSON.stringify(project) !== JSON.stringify(values)) {
      setIsModalOpen(true);
    } else {
      handleCancelConfirmation();
    }

    return;
  };

  const selectReassignLogicOptions = [
    { 'label': intl.formatMessage({ id: 'label.project.fewestItemsInQueue' }), 'value': REASSIGN_LOGIC.LOWEST_WORKLOAD },
    { 'label': intl.formatMessage({ id: 'label.project.lastLoggedIntoApp' }), 'value': REASSIGN_LOGIC.LAST_CONNECTED },
    { 'label': intl.formatMessage({ id: 'label.project.anyoneWithRightsOnProject' }), 'value': REASSIGN_LOGIC.ANY },
  ]

  const handleTypeChange = (values, setFieldValue) => {
    return (projectType): void => {
      switch (projectType) {
        case PROJECT_TYPES.CHAT:
          setProjectPrevState(values);
          setFieldValue('caseHistory', 1);
          setFieldValue('distributeVerifiedAnswer', 0)
          setFieldValue('hideTranslatedTexts', 0);
          setFieldValue('mandatoryTicketDetails', [MANDATORY_TICKET_DETAILS.NUMBER]);
          setFieldValue('verificationGuidelines', '');
          setFieldValue('toneOfVoice', '');
          setFieldValue('rejectionCategories', []);
          setFieldValue('ticketReassignmentType', REASSIGN_LOGIC.NONE);
          break;
        case PROJECT_TYPES.CASE:
          setFieldValue('caseHistory', projectPrevState.caseHistory);
          setFieldValue('distributeVerifiedAnswer', projectPrevState.distributeVerifiedAnswer);
          setFieldValue('hideTranslatedTexts', projectPrevState.hideTranslatedTexts);
          setFieldValue('mandatoryTicketDetails', projectPrevState.mandatoryTicketDetails);
          setFieldValue('verificationGuidelines', projectPrevState.verificationGuidelines);
          setFieldValue('toneOfVoice', projectPrevState.toneOfVoice);
          setFieldValue('rejectionCategories', projectPrevState.rejectionCategories);
          setFieldValue('ticketReassignmentType', projectPrevState.ticketReassignmentType);
          break;
        default:
          break;
      }
    };
  };

  const handleProviderChange = (values, setFieldValue) => {
    return (fieldName, provider): void => {
      const providers: IProvider[] = getIn(values, `${ fieldName }.providers`);
      const selectedProvider = providers.find(({ id }) => id.toString() === provider);
      const saveValues = cloneDeep(projectPrevState);

      if (selectedProvider) {
        set(saveValues, `${ fieldName }.provider`, selectedProvider);
        setFieldValue(`${ fieldName }.formality`, selectedProvider.supportsFormality ? DEFAULT_FORMALITY : '');
        setFieldValue(`${ fieldName }.glossaryPath`, '');
        setFieldValue(`${ fieldName }.trainedModelPath`, '');
      }
    };
  };

  const handleWorkflowChange = (values: IProjectValues, setFieldTouched, setFieldValue) => {
    return (value, event, fieldValue): void => {
      setTimeout(() => setFieldTouched('mandatoryTicketDetails', true));

      const hasSupervised = fieldValue.includes(WORKFLOWS.SUPERVISED);
      const newLanguagePairs = values.languagePairs.map((languagePair, lpIndex) => ({
        ...languagePair,
        pairs: languagePair.pairs.map((pair, pIndex) => ({
          ...pair,
          confidence: {
            ...pair.confidence,
            enabled: hasSupervised ? project?.languagePairs[lpIndex]?.pairs[pIndex].confidence.enabled || 0 : 0
          }
        }))
      }));
      setFieldValue('languagePairs', newLanguagePairs);
    };
  };

  const handleFormErrors = (setFieldError, errors): void => {
    if (errors.some(({ key })=> key.includes('toBeDeleted'))) {
      toast.error((
        <>
          <div>
            <b>{intl.formatMessage({ id: 'label.project.errorLanguagePairDeleteTitle' })}</b>
          </div>
          {intl.formatMessage({ id: 'label.project.errorLanguagePairDelete' })}
        </>
      ), { autoClose: false });
    }
    errors.forEach(({ key, value }) => setFieldError(key, value));
  };

  useEffect(() => {
    return () => {
      toast.dismiss();
    }
  }, []);

  if (isLoading || isLoadingLanguages || isLoadingAllLanguages) {
    return <Spinner animation="border" />;
  }

  const handleDistributeVerifiedAnswer = (distributeVerifiedAnswer, setFieldValue): void => {
    if (distributeVerifiedAnswer) {
      setFieldValue('ticketReassignmentType', REASSIGN_LOGIC.NONE);
    } else {
      setFieldValue('ticketReassignmentType', REASSIGN_LOGIC.LOWEST_WORKLOAD);
    }
  };

  return (
    <Formik
      initialValues={ project }
      validateOnChange={ false }
      validate={ (values) => {
        try {
          validateYupSchema(values, projectValidationSchema(intl), true, values);
        } catch (err) {
          fieldRef.current && fieldRef.current.scrollIntoView();
          return yupToFormErrors(err);
        }
        return {};
      } }
      onSubmit={ async (values, { setSubmitting, setFieldError }) => {
        try {
          if (projectId) {
            await projectsApi.updateProject(clientId, projectId, projectService.toProjectFromFormValues(values));
          } else {
            await projectsApi.setNewProject(clientId, projectService.toProjectFromFormValues(values));
          }
          await getAllUserDetails();
          history.push(toPath(routePaths.admin.client, { clientId }));
        } catch (e) {
          handleErrors(e, (errors) => handleFormErrors(setFieldError, errors), null, true);
        } finally {
          isMountedRef.current && setSubmitting(false);
        }
      } }
    >
      {({
        values,
        handleChange,
        handleSubmit,
        setFieldValue,
        setFieldTouched,
        isSubmitting,
        touched,
        errors
      }) => (
        <>
          {
            !projectId &&
            <h1 className="mb-4"><FormattedMessage id="label.project.newProject" /></h1>
          }
          <Form onSubmit={ handleSubmit }>
            <Row className="mb-4">
              <Col>
                <div className={ styles.textFieldWrapper } ref={ fieldRef }>
                  <FastField
                    type="text"
                    name="name"
                    value={ values.name }
                    onChange={ handleChange }
                    component={ InputField }
                    label={ intl.formatMessage({ id: 'label.project.name' }) }
                    placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
                    isRequired
                    isInvalid={ !!touched.name && !!errors.name }
                  />
                </div>
              </Col>
              <Col>
                <Field
                  name="type"
                  value={ values.type }
                  component={ RadioButton }
                  label={ intl.formatMessage({ id: 'label.project.type' }) }
                  radioValues={ [
                    getLabelValue(intl.formatMessage({ id: 'label.project.case' }), PROJECT_TYPES.CASE),
                    getLabelValue(intl.formatMessage({ id: 'label.project.chat' }), PROJECT_TYPES.CHAT),
                  ] }
                  handleChange={ handleTypeChange(values, setFieldValue) }
                  isRequired
                  isInvalid={ !!touched.type && !!errors.type }
                />
              </Col>
              <Col xl="5">
                <FastField
                  name="active"
                  label={ intl.formatMessage({ id: 'label.status' }) }
                  value={ values.active }
                  component={ ToggleButton }
                  buttonValues={ [
                    getLabelValue(intl.formatMessage({ id: 'label.active' }), 1),
                    getLabelValue(intl.formatMessage({ id: 'label.inactive' }), 0),
                  ] }
                  isInvalid={ !!touched.active && !!errors.active }
                />
              </Col>
            </Row>

            <h3 className="mb-4"><FormattedMessage id="label.project.workflow" /></h3>
            <Row className="mb-4">
              <Col>
                <Field
                  name="workflows"
                  label={ intl.formatMessage({ id: 'label.project.workflowSettings' }) }
                  value={ values.workflows }
                  component={ CheckboxGroup }
                  checkboxValues={ [
                    getLabelValue(intl.formatMessage({ id: 'label.project.unsupervised' }), WORKFLOWS.UNSUPERVISED),
                    getLabelValue(intl.formatMessage({ id: 'label.project.supervised' }), WORKFLOWS.SUPERVISED),
                  ] }
                  handleChange={ handleWorkflowChange(values, setFieldTouched, setFieldValue) }
                  isRequired
                  isInvalid={ !!touched.workflows && !!errors.workflows }
                />
              </Col>
              <Col>
                <Field
                  name="mandatoryTicketDetails"
                  label={ intl.formatMessage({ id: 'label.project.ticketDetails' }) }
                  value={ values.mandatoryTicketDetails }
                  component={ CheckboxGroup }
                  checkboxValues={ [
                    getLabelValue(
                      intl.formatMessage({ id: 'label.translation.ticketNumber' }).toLowerCase(),
                      MANDATORY_TICKET_DETAILS.NUMBER
                    ),
                    getLabelValue(intl.formatMessage({ id: 'label.translation.url' }), MANDATORY_TICKET_DETAILS.URL),
                  ] }
                  isRequired={ values.workflows.length === 1 && values.workflows[0] === WORKFLOWS.SUPERVISED }
                  isDisabled={ values.type === PROJECT_TYPES.CHAT }
                  isInvalid={ !!touched.mandatoryTicketDetails && !!errors.mandatoryTicketDetails }
                />
              </Col>
              <Col>
                <Field
                  name="languageAutodetection"
                  label={ intl.formatMessage({ id: 'label.projects.autodetect' }) }
                  value={ values.languageAutodetection }
                  component={ ToggleButton }
                  buttonValues={ [
                    getLabelValue(intl.formatMessage({ id: 'label.on' }), 1),
                    getLabelValue(intl.formatMessage({ id: 'label.off' }), 0),
                  ] }
                  isInvalid={ !!touched.languageAutodetection && !!errors.languageAutodetection }
                />
              </Col>
              <Col>
                <Field
                  name="caseHistory"
                  label={ intl.formatMessage({ id: 'label.projects.caseHistory' }) }
                  value={ values.caseHistory }
                  component={ ToggleButton }
                  buttonValues={ [
                    getLabelValue(intl.formatMessage({ id: 'label.on' }), 1),
                    getLabelValue(intl.formatMessage({ id: 'label.off' }), 0),
                  ] }
                  isDisabled={ values.type === PROJECT_TYPES.CHAT }
                  isInvalid={ !!touched.caseHistory && !!errors.caseHistory }
                />
              </Col>
              <Col>
                <Field
                  name="hideTranslatedTexts"
                  label={ intl.formatMessage({ id: 'label.projects.hideTranslatedTexts' }) }
                  value={ values.hideTranslatedTexts }
                  component={ ToggleButton }
                  buttonValues={ [
                    getLabelValue(intl.formatMessage({ id: 'label.on' }), 1),
                    getLabelValue(intl.formatMessage({ id: 'label.off' }), 0),
                  ] }
                  isDisabled={ values.type === PROJECT_TYPES.CHAT }
                  isInvalid={ !!touched.hideTranslatedTexts && !!errors.hideTranslatedTexts }
                />
              </Col>
            </Row>
            <Row className="mb-4">
              <Col>
                <div className="d-inline-block align-bottom">
                  <Field
                    name="distributeVerifiedAnswer"
                    label={ intl.formatMessage({ id: 'label.project.distributeVerifiedAnswer' }) }
                    value={ values.distributeVerifiedAnswer }
                    component={ ToggleButton }
                    buttonValues={ [
                      getLabelValue(intl.formatMessage({ id: 'label.on' }), 1),
                      getLabelValue(intl.formatMessage({ id: 'label.off' }), 0),
                    ] }
                    handleChange={ () => handleDistributeVerifiedAnswer(values.distributeVerifiedAnswer, setFieldValue) }
                    isDisabled={ values.type === PROJECT_TYPES.CHAT }
                    isInvalid={ !!touched.distributeVerifiedAnswer && !!errors.distributeVerifiedAnswer }
                  />
                </div>
                <div className={ ` ${styles.selectReassignLogic} d-inline-block align-bottom ` }>
                  <Field
                    className={ `${ styles.selectedLanguage } smallSize` }
                    name="ticketReassignmentType"
                    value={ values.ticketReassignmentType }
                    options={ selectReassignLogicOptions }
                    component={ CustomSelect }
                    placeholder={ intl.formatMessage({ id: 'label.project.selectReassignLogic' }) }
                    isMulti={ false }
                    disabled={ values.type === PROJECT_TYPES.CHAT || values.distributeVerifiedAnswer === 0 }
                    isInvalid={ !!touched.ticketReassignmentType && !!errors.ticketReassignmentType }
                  />
                </div>
              </Col>
            </Row>
            <h3 className="mb-4"><FormattedMessage id="label.project.languageSettings" /></h3>
            <div className="mb-5">
              <FieldArray
                name={ `languagePairs` }
                render={ (arrayHelpers) => (
                  <LanguagePairs
                    languagePairs={ values.languagePairs }
                    handleProviderChange={ handleProviderChange(values, setFieldValue) }
                    availableLanguages={ availableLanguages }
                    getLanguageName={ getLanguageName }
                    formalityTypes={ formalityTypes }
                    hasConfidence={ values.workflows.includes(WORKFLOWS.SUPERVISED) }
                    arrayHelpers={ arrayHelpers }
                    clientId={ clientId }
                    projectId={ projectId }
                    errors={ errors.languagePairs }
                    touched={ touched.languagePairs }
                  />
                ) }
              />
            </div>

            <h3 className="mb-4"><FormattedMessage id="label.project.notificationsReminders" /></h3>
            {
              !values.workflows.includes(WORKFLOWS.SUPERVISED) ?
                <label className={ `${ styles.textLabel } mb-4` }><FormattedMessage id="label.project.notification.chat"/></label>
                : (
                  <>
                    <h6 className={ `mb-4 ${ styles.notificationLabel }` }><FormattedMessage id="label.project.notificationsAgent" /></h6>
                    <AgentNotifications
                      agentNotification={ values.notifications.agentNotification }
                      agentReminder={ values.notifications.agentReminder }
                      errorsNotif={ errors?.notifications?.agentNotification }
                      touchedNotif={ touched?.notifications?.agentNotification }
                      errorsRem={ errors?.notifications?.agentReminder }
                      touchedRem={ touched?.notifications?.agentReminder }
                      notificationTypes={ agentNotificationTypes }
                      reminderTypes={ reminderTypes }
                    />
                    <h6 className={ `mb-3 ${ styles.notificationLabel }` }><FormattedMessage id="label.project.notificationsLE" /></h6>
                    {
                      values.languagePairs.length ?
                        <div className={ `${ styles.sectionWrapper } mb-4` }>
                          <FieldArray
                            name={ `notifications.languageExpertNotifications` }
                            render={ () => (
                              <LanguageExpertNotifications
                                languagePairs={ values.languagePairs }
                                languageExpertNotifications={ values.notifications.languageExpertNotifications }
                                errors={ errors?.notifications?.languageExpertNotifications }
                                touched={ touched?.notifications?.languageExpertNotifications }
                                setFieldValue={ setFieldValue }
                                notificationTypes={ notificationTypes }
                                reminderTypes={ reminderTypes }
                                getLanguageName={ getLanguageName }
                              />
                            ) }
                          />
                        </div>
                        :
                        <label className={ `${ styles.textLabel } mb-4` }><FormattedMessage id="label.project.notification.empty"/></label>
                    }
                  </>
                )
            }
            
            <h3 className="mb-4"><FormattedMessage id="label.project.guidelines" /></h3>
            <Row className="mb-3">
              <Col>
                <div className={ styles.textFieldWrapper }>
                  <FastField
                    type="text"
                    name="toneOfVoice"
                    value={ values.toneOfVoice }
                    onChange={ handleChange }
                    component={ InputField }
                    label={ intl.formatMessage({ id: 'label.project.guidelinesTone' }) }
                    placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
                    isInvalid={ !!touched.toneOfVoice && !!errors.toneOfVoice }
                  />
                </div>
              </Col>
              <Col xl="7">
                <FastField
                  name="verificationGuidelines"
                  value={ values.verificationGuidelines }
                  onChange={ handleChange }
                  rows={ 3 }
                  label={ intl.formatMessage({ id: 'label.project.guidelinesVerification' }) }
                  placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
                  component={ CustomTextArea }
                  description={ intl.formatMessage({ id: 'label.project.guidelinesVerificationText' }) }
                  isInvalid={ !!touched.verificationGuidelines && !!errors.verificationGuidelines }
                />
              </Col>
              <Col />
            </Row>

            <h3 className="mb-4"><FormattedMessage id="label.project.rejectCategories" /></h3>
            <FieldArray
              name={ `rejectionCategories` }
              render={ (arrayHelpers) => (
                <RejectCategories
                  arrayHelpers={ arrayHelpers }
                />
              ) }
            />

            <h3 className="mb-4"><FormattedMessage id="label.project.slaSettings" /></h3>
            {!values.workflows.includes(WORKFLOWS.SUPERVISED) ?
              <label className={ `${ styles.textLabel } mb-5` }><FormattedMessage id="label.project.slaSettings.notAvailable"/></label>
              :
              <SlaSettings
                setFieldValue={ setFieldValue }
                setFieldTouched={ setFieldTouched }
                projectSla={ values.projectSla }
                onChange={ handleChange }
                errorsSla={ errors?.projectSla }
                touchedSla={ touched?.projectSla }
              />
            }

            <h3 className="mb-2"><FormattedMessage id="label.project.salesforceConfigurations" /></h3>
            {!values.workflows.includes(WORKFLOWS.SUPERVISED) || values.type === PROJECT_TYPES.CHAT ?
              <label className={ `${ styles.textLabel } mb-5 mt-3` }><FormattedMessage id="label.project.salesforceSettings.notAvailable"/></label>
              :
              <>
                <Row className="mb-4">
                  <Col>
                    <Field
                      name="connectorConfiguration.enabled"
                      value={ values.connectorConfiguration.enabled }
                      component={ ToggleButton }
                      buttonValues={ [
                        getLabelValue(intl.formatMessage({ id: 'label.on' }), 1),
                        getLabelValue(intl.formatMessage({ id: 'label.off' }), 0),
                      ] }
                      isDisabled={ !values.workflows.includes(WORKFLOWS.SUPERVISED) }
                      isInvalid={ !!touched.connectorConfiguration?.enabled &&
                            !!errors.connectorConfiguration?.enabled }
                    />
                  </Col>
                </Row>
                <Row className="mb-4">
                  <Col>
                    <Field
                      name="connectorConfiguration.autoSendVerifiedEmail"
                      label={ intl.formatMessage({ id: 'label.project.salesforceAutoSend' }) }
                      value={ values.connectorConfiguration.autoSendVerifiedEmail }
                      component={ ToggleButton }
                      buttonValues={ [
                        getLabelValue(intl.formatMessage({ id: 'label.on' }), 1),
                        getLabelValue(intl.formatMessage({ id: 'label.off' }), 0),
                      ] }
                      isRequired={ !!values.connectorConfiguration.enabled }
                      isDisabled={ !values.connectorConfiguration.enabled }
                      isInvalid={ !!touched.connectorConfiguration?.autoSendVerifiedEmail &&
                      !!errors.connectorConfiguration?.autoSendVerifiedEmail }
                    />
                  </Col>
                </Row>
                <Row className="mb-5">
                  <Col>
                    <div className={ styles.textFieldWrapper }>
                      <Field
                        type="text"
                        name="connectorConfiguration.instance"
                        value={ values.connectorConfiguration.instance }
                        onChange={ handleChange }
                        component={ InputField }
                        label={ intl.formatMessage({ id: 'label.project.salesforceUrl' }) }
                        placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
                        isRequired={ !!values.connectorConfiguration.enabled }
                        isDisabled={ !values.connectorConfiguration.enabled }
                        isInvalid={ !!touched.connectorConfiguration?.instance && !!errors.connectorConfiguration?.instance }
                      />
                    </div>
                  </Col>
                  <Col>
                    <div className={ styles.textFieldWrapper }>
                      <Field
                        type="text"
                        name="connectorConfiguration.clientId"
                        value={ values.connectorConfiguration.clientId }
                        onChange={ handleChange }
                        component={ InputField }
                        label={ intl.formatMessage({ id: 'label.project.salesforceClientId' }) }
                        placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
                        isRequired={ !!values.connectorConfiguration.enabled }
                        isDisabled={ !values.connectorConfiguration.enabled }
                        isInvalid={ !!touched.connectorConfiguration?.clientId && !!errors.connectorConfiguration?.clientId }
                      />
                    </div>
                  </Col>
                  <Col>
                    <div className={ styles.textFieldWrapper }>
                      <Field
                        type="text"
                        name="connectorConfiguration.username"
                        value={ values.connectorConfiguration.username }
                        onChange={ handleChange }
                        component={ InputField }
                        label={ intl.formatMessage({ id: 'label.table.userName' }) }
                        placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
                        isRequired={ !!values.connectorConfiguration.enabled }
                        isDisabled={ !values.connectorConfiguration.enabled }
                        isInvalid={ !!touched.connectorConfiguration?.username && !!errors.connectorConfiguration?.username }
                      />
                    </div>
                  </Col>
                  <Col>
                    <div className={ styles.textFieldWrapper }>
                      <Field
                        type="text"
                        name="connectorConfiguration.audience"
                        value={ values.connectorConfiguration.audience }
                        onChange={ handleChange }
                        component={ InputField }
                        label={ intl.formatMessage({ id: 'label.project.salesforceAudience' }) }
                        placeholder={ intl.formatMessage({ id: 'label.placeholder' }) }
                        isRequired={ !!values.connectorConfiguration.enabled }
                        isDisabled={ !values.connectorConfiguration.enabled }
                        isInvalid={ !!touched.connectorConfiguration?.audience && !!errors.connectorConfiguration?.audience }
                      />
                    </div>
                  </Col>
                </Row>
              </>
            }

            <div className="d-flex justify-content-between">
              <button
                type="button"
                className={ styles.cancelBtn }
                onClick={ () => { handleCancel(values) } }
                data-qa="cancel"
              >
                <FormattedMessage id="label.cancel" />
              </button>
              <button className={ styles.saveBtn } type="submit" disabled={ isSubmitting } data-qa="submit">
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
            </div>
          </Form>
          <ConfirmationModal
            show={ isModalOpen }
            handleClose={ handleCloseModal }
            handleYes={ handleCancelConfirmation }
            title={ intl.formatMessage({ id: 'label.confirmationTitle' }) }
            text={ intl.formatMessage({ id: 'label.confirmationText' }) }
          />
        </>
      )}
    </Formik>
  );
};

export default Project;
