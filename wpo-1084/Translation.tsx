import React, { FC, useEffect, useMemo, useState } from 'react';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { FormattedMessage, useIntl } from 'react-intl';
import { Field, Formik, getIn, useFormikContext, validateYupSchema, yupToFormErrors } from 'formik';
import { toast } from 'react-toastify';
import { matchPath, useHistory, useLocation } from 'react-router';
import { Editor } from '@tinymce/tinymce-react';

import Spinner from 'react-bootstrap/Spinner';
import InputField from '../shared/fields/InputField';
import TranslationTabs from './TranslationTabs';
import Metadata from './Metadata';
import ReplyOptions from './ReplyOptions';
import TranslationResultModal, { ITranslationResultModalProps } from './TranslationResultModal';
import Loader from '../shared/loader/Loader';

import TranslationResultConfirmedModal from './TranslationResultConfirmedModal';
import useHandleErrors from '../../hooks/useHandleErrors';
import useGenericFetch from '../../hooks/useGenericFetch';
import useIsNotFirstRender from '../../hooks/useIsNotFirstRender';
import { ICaseHistoryParams, ticketApi } from '../../api/ticketApi';
import translationService from '../../services/translation';
import metadataService, { IMetadataTicketValues } from '../../services/metadata';
import { IProjectDetails } from '../../services/projectInterface';
import validationSchema from './translationValidationSchema';
import useMetadata from '../../hooks/useMetadata';
import useVerifiedTicketsList from '../../hooks/useVerifiedTicketsList';
import useLoggedUserData from '../../store/useLoggedUserData';
import useLocalStorage from '../../store/useLocalStorage';
import useVerifiedTickets from '../../store/websockets/useVerifiedTickets';
import { ITranslationStorage } from '../header/lastTranslation/LastTranslation';
import { LAST_TRANSLATION, STATUS_TYPE } from '../../constants/translation';
import { TINYMCE_CONFIG, USER_ROLES } from '../../constants';
import { MANDATORY_TICKET_DETAILS, PROJECT_TYPES, WORKFLOWS, SELECTED_PROJECT } from '../../constants/project';
import { TICKET_STATUS, TICKET_TYPE } from '../../constants/tickets';
import { appendHttp, copyToClip, toPath } from '../../helpers';
import routePaths from '../../routes/routePaths';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import ticketService, { ITicketValues } from '../../services/ticket';
import caseHistoryService from '../../services/caseHistory';
import useIsMountedRef from '../../hooks/useIsMountedRef';
import useAbandonedTicket from '../../hooks/useAbandonedTicket';
import styles from './Translation.module.scss';
import { TICKET_SOURCE } from '../../constants/pendingTranslations';

export enum TabKey {
  TRANSLATED = 'translated',
  ORIGINAL = 'original',
  CASE_HISTORY = 'caseHistory',
}

interface IOnSelectedProjectChangeProps {
  selectedProject: IProjectDetails | null;
  handleTabKeyChange: (key: TabKey) => void;
}

const OnSelectedProjectChange: FC<IOnSelectedProjectChangeProps> = ({ selectedProject, handleTabKeyChange }) => {
  const { resetForm  } = useFormikContext();
  useEffect(() => {
    resetForm();
    handleTabKeyChange(TabKey.TRANSLATED);
    // eslint-disable-next-line
  }, [selectedProject]);
  return null;
};

interface ITranslationProps {
  ticketFormData: ITicketValues | null;
}

const Translation: FC<ITranslationProps> = ({ ticketFormData }) => {
  let submitButton = '';
  const intl = useIntl();
  useDocumentTitle(intl.formatMessage({
    id: `label.page.${ ticketFormData && ticketFormData.status === TICKET_STATUS.REJECTED ? 'verifiedTranslation' : 'translation' }`
  }));
  const [, allMetadata, isLoadingMetadata] = useMetadata(USER_ROLES.AGENT);
  const { loggedUserData: { preferredLanguage, selectedProject, allActiveProjects }, setCurrentProject } = useLoggedUserData();
  const [ fetchVerifiedTickets ] = useVerifiedTicketsList();
  const [, setLastTranslation] = useLocalStorage<ITranslationStorage>(LAST_TRANSLATION, { ticketNumber: '', ticketUrl: '', translation: '' });
  const { removeTicketFromCounter, abandonedTicket } = useVerifiedTickets();
  const history = useHistory();
  const location = useLocation();
  const [handleErrors] = useHandleErrors();
  const isMountedRef = useIsMountedRef();
  const isNotFirstRender = useIsNotFirstRender();
  const [activeTabKey, setActiveTabKey] = useState<TabKey>(TabKey.TRANSLATED);
  const [previousResponse, setPreviousResponse] = useState('');
  const isTicketNoRequired = selectedProject?.mandatoryTicketDetails.includes(MANDATORY_TICKET_DETAILS.NUMBER);
  const isTicketUrlRequired = selectedProject?.mandatoryTicketDetails.includes(MANDATORY_TICKET_DETAILS.URL);
  const [isTranslationLoading, setIsTranslationLoading] = useState(false);
  const [showConfirmedModal, setShowConfirmedModal] = useState(false);
  const [hasConfidenceScore, setHasConfidenceScore] = useState(false);
  const [showCaseHistoryAlert, setShowCaseHistoryAlert] = useState(false);
  const [caseHistoryParams, setCaseHistoryParams] = useState<ICaseHistoryParams>({ ticketNumber: ticketFormData?.ticketNumber || '', clientId: selectedProject?.clientId || '', projectId: selectedProject?.id || '' }); 
  const [caseHistory, isLoadingCaseHistory] = useGenericFetch(
    ticketApi.searchForTicketHistory, 
    caseHistoryService.from.bind(caseHistoryService),
    null, 
    caseHistoryParams, 
    !!caseHistoryParams.ticketNumber && selectedProject?.caseHistory,
    true
  );
  const isCaseHistoryTabDisabled = useMemo(() => {
    return isLoadingCaseHistory || !caseHistory || !caseHistory.length || !caseHistoryParams.ticketNumber
  }, [isLoadingCaseHistory, caseHistory, caseHistoryParams]);
  const [modalOptions, setModalOptions] = useState<ITranslationResultModalProps>({
    show: false,
    handleClose: () => {
      isMountedRef.current && setModalOptions({ ...modalOptions, show: false });
    },
    handleYes: () => { return Promise.resolve() },
    title: intl.formatMessage({ id: 'label.translationResult.title' }),
    text: '',
    yesButtonText: '',
    type: WORKFLOWS.UNSUPERVISED,
  });

  const [storedSelectedProject,] = useLocalStorage<string>(SELECTED_PROJECT, '');
  const selectedProjectFromLocalStorage = allActiveProjects!['case'][0].projects.filter(project => project.id === storedSelectedProject); 

  const [originalReply, setOriginalReply] = useState(ticketFormData?.originalReply || '');

  const handleOriginalReplyChange = (setFieldValue) => (reply): void => {
    setOriginalReply(reply);
    setFieldValue('originalReply', reply);
  };

  const metadataInitialValues: IMetadataTicketValues[] = useMemo(() => {
    if (allMetadata) {
      if (ticketFormData) {
        return metadataService.setMetadataValues(ticketFormData.metadata, allMetadata);
      } else {
        return metadataService.getNewMetadataFormValues(allMetadata);
      }
    }
    return [];
  }, [allMetadata, ticketFormData]);

  const handleTabKeyChange = (key: string): void => {
    setActiveTabKey(key as TabKey);

    if (key === TabKey.CASE_HISTORY) {
      setShowCaseHistoryAlert(false);
    }
  };

  const handleFormReset = (previousResponse: string, resetForm): void => {
    resetForm();
    setOriginalReply('');
    handleTabKeyChange(TabKey.TRANSLATED);
    setPreviousResponse(previousResponse);
    if (selectedProject?.caseHistory) {
      setCaseHistoryParams((prevState) => ({ ...prevState, ticketNumber: '' }));
    }
  };

  const willRedirect = async(): Promise<boolean> => {
    const verifiedTickets = await fetchVerifiedTickets([TICKET_STATUS.VERIFIED]);

    if (verifiedTickets.length) {
      const path = verifiedTickets[0].projectType === PROJECT_TYPES.CASE
        ? routePaths.agent.verifiedTranslation
        : routePaths.agent.chat;
      history.push(toPath(path, { ticketId: verifiedTickets[0].id }));
      return true;
    } else if (matchPath(location.pathname, { path: routePaths.agent.verifiedTranslation })){
      history.push(routePaths.agent.translation);
      return true;
    }

    return false;
  };

  const handleCloseTicket = async ({ id, originalReply, ticketNumber,ticketUrl, translatedReply, status }, resetForm): Promise<void> => {
    try {
      await ticketApi.closeTicket(id);
      setLastTranslation({
        ticketNumber: ticketNumber,
        ticketUrl: ticketUrl,
        translation: translatedReply,
      });

      if (status === TICKET_STATUS.REJECTED) {
        removeTicketFromCounter(ticketFormData?.id || '');
      }

      if (await willRedirect()) {
        return;
      }

      handleFormReset(originalReply, resetForm);
    } catch (e) {
      handleErrors(e);
    }
  };

  const handlePreviousResponse = (setFieldValue): void => {
    handleOriginalReplyChange(setFieldValue)(previousResponse);
  };

  const handleHasConfidenceResponse = async (translatedText, values): Promise<void> => {
    try {
      await ticketApi.setTicketAsCopied(values.id, values.translations[0].id || '');
      await copyToClip(translatedText);
      setShowConfirmedModal(true);
      isMountedRef.current && setModalOptions({ ...modalOptions, show: false });
    } catch (e) {
      handleErrors(e);
    }
  }

  const handleTranslateAndCopy = (translatedText, values): void => {
    setModalOptions({
      ...modalOptions,
      handleYes: async () => {
        try {
          setHasConfidenceScore(false);
          await ticketApi.setTicketAsCopied(values.id, values.translations[0].id || '');
          await copyToClip(translatedText);
          await ticketApi.saveTicket(translationService.toTicketSave({
            ...values,
            translationWorkflow: WORKFLOWS.UNSUPERVISED,
            clientId: selectedProject?.clientId,
            projectId: selectedProject?.id,
            metadata: values.metadataValue,
          }, allMetadata));
          setShowConfirmedModal(true);
          isMountedRef.current && setModalOptions({ ...modalOptions, show: false });
        } catch (e) {
          handleErrors(e);
        }
      },
      show: true,
      text: translatedText,
      yesButtonText: intl.formatMessage({ id: 'label.translationResult.copy' }),
    });
  };

  const handleQualityVerification = (translatedText, values, resetForm): void => {
    try {
      setModalOptions({
        ...modalOptions,
        handleYes: async () => {
          try {
            const saveTicketResp = await ticketApi.saveTicket(translationService.toTicketSave({
              ...values,
              translationWorkflow: WORKFLOWS.SUPERVISED,
              clientId: selectedProject?.clientId,
              projectId: selectedProject?.id,
              metadata: values.metadataValue,
            }, allMetadata));
            if (saveTicketResp.data.translationWorkflow === WORKFLOWS.UNSUPERVISED) {
              //confidence score has changed in the meantime, show confidence score popup
              setHasConfidenceScore(true);
              handleHasConfidenceResponse(translatedText, values);
            } else {
              setHasConfidenceScore(false);
              isMountedRef.current && setModalOptions({ ...modalOptions, show: false });
              toast.success(intl.formatMessage({ id: 'label.translationResult.verifySuccess' }));

              if (values.status === TICKET_STATUS.REJECTED) {
                console.log('test rejected')
                console.log('selectedProject: ', selectedProject);
                setCurrentProject(selectedProjectFromLocalStorage[0])

                removeTicketFromCounter(ticketFormData?.id || '');
              }

              if (await willRedirect()) {
                return;
              }

              handleFormReset(values.originalReply, resetForm);
            }
          } catch (e) {
            handleErrors(e);
          }
        },
        show: true,
        ...( selectedProject?.hideTranslatedTexts && { title: intl.formatMessage({ id: 'label.translationResult.titleSecond' }) }),
        text: selectedProject?.hideTranslatedTexts ? values.originalReply : translatedText,
        yesButtonText: intl.formatMessage({ id: 'label.translationResult.verification' }),
        type: WORKFLOWS.SUPERVISED,
      });
    } catch (e) {
      handleErrors(e);
    }
  };

  const handleFormSubmit = (handleSubmit, type, errors): void => {
    submitButton = type;
    handleSubmit();
    if (errors.metadataValue || errors.originalLanguage || errors.translatedText) {
      handleTabKeyChange(TabKey.TRANSLATED);
    }
  };

  const handleTicketNumberBlur = (e): void => {
    if (caseHistoryParams.ticketNumber === e.target.value) {
      return;
    }

    if (selectedProject?.caseHistory) {
      e.persist();
      setCaseHistoryParams((prevState) => ({ ...prevState, ticketNumber: e.target?.value || '' }));
    }
    handleTabKeyChange(TabKey.TRANSLATED);
  };

  useAbandonedTicket(ticketFormData && ticketFormData.id, abandonedTicket, routePaths.agent.selectProject);

  useEffect(() => {
    if(isNotFirstRender) {
      setOriginalReply(ticketFormData?.originalReply || '');
      if (selectedProject?.caseHistory) {
        setCaseHistoryParams({
          ticketNumber: ticketFormData?.ticketNumber || '',
          clientId: selectedProject?.clientId || '',
          projectId: selectedProject?.id || ''
        })
      }
    }
  }, [selectedProject, ticketFormData, isNotFirstRender]);

  useEffect(() => {
    if(caseHistory && caseHistory.length === 0) {
      handleTabKeyChange(TabKey.TRANSLATED);
    }
  }, [caseHistory]);

  useEffect(() => {
    setShowCaseHistoryAlert(!!(!isLoadingCaseHistory && caseHistory && caseHistory.length && caseHistoryParams.ticketNumber));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingCaseHistory, caseHistory]);

  if (!selectedProject || isLoadingMetadata) {
    return <Loader center className="mt-5" />;
  }

  return (
    <div className={ styles.translationWrapper }>
      <Formik
        initialValues={ {
          ...ticketService.getNewCaseValues(),
          ...ticketFormData,
          metadataValue: metadataInitialValues,
        } }
        validate={ (values) => {
          try {
            validateYupSchema(values, validationSchema(intl, selectedProject?.mandatoryTicketDetails, submitButton), true);
          } catch (err) {
            const errors = yupToFormErrors(err);
            if (Object.prototype.hasOwnProperty.call(errors,'submitType')) {
              toast.error(intl.formatMessage({ id: 'label.error.numberOrUrlRequired' }));
              submitButton = '';
            }
            return errors;
          }
          return {};
        } }
        onSubmit={ async (values, { setSubmitting, resetForm, setFieldValue }) => {
          try {
            let translationTicketId = values.id;
            if (!translationTicketId) {
              const ticketData = await ticketApi.setTicket(translationService.toTicket({
                ...values,
                clientId: selectedProject?.clientId,
                projectId: selectedProject?.id,
                projectType: selectedProject?.types[0]
              }));
              translationTicketId = translationService.fromTicket(ticketData.data).id;
              setFieldValue('id', translationTicketId);
            }

            const translationData = await ticketApi.setTranslation(translationTicketId, translationService.toTranslation({
              id: null,
              text: values.originalReply,
              sourceLanguage: preferredLanguage,
              targetLanguage: values.originalLanguage,
              status: STATUS_TYPE.MACHINE_TRANSLATED,
              type: TICKET_TYPE.REPLY,
              ...(values.source === TICKET_SOURCE.SALESFORCE && { format: 'html' }),
            }));

            const translatedReply = translationService.fromTranslation(translationData.data);
            setFieldValue('translatedReply', translatedReply.translatedText);
            setFieldValue('id', translatedReply.ticketId);
            setFieldValue('translations', [translatedReply]);

            switch (submitButton) {
              case WORKFLOWS.SUPERVISED:
                handleQualityVerification(translatedReply.translatedText, {
                  ...values,
                  id: translatedReply.ticketId,
                  translations: [translatedReply]
                }, resetForm);
                break;
              case WORKFLOWS.UNSUPERVISED:
                handleTranslateAndCopy(translatedReply.translatedText, {
                  ...values,
                  id: translatedReply.ticketId,
                  translations: [translatedReply]
                });
            }

            setSubmitting(false);
            submitButton = '';
          } catch (e) {
            handleErrors(e);
            submitButton = '';
          }
        } }
      >
        {({
          values,
          handleSubmit,
          isSubmitting,
          handleChange,
          touched,
          errors,
          setFieldValue,
          validateForm,
          setFieldTouched,
          resetForm,
        }) => (
          <>
            <OnSelectedProjectChange selectedProject={ selectedProject } handleTabKeyChange={ handleTabKeyChange }/>
            <Form>
              <div className={ styles.translationRow }>
                <div className={ styles.translationColumn }>
                  <div className={ styles.containerBoxed }>
                    {
                      values.reassigned &&
                      <div className={ styles.reassignedLabel }>
                        <FormattedMessage id="label.pendingTranslations.reassignedTicket" />
                      </div>
                    }
                    <Row className={ styles.translationInputs }>
                      <Col md={ 7 } className={ styles.ticketNr + ' pr-0' }>
                        <Field
                          type="text"
                          name="ticketNumber"
                          label={ intl.formatMessage({ id: 'label.translation.ticketNumber' }) }
                          onChange={ handleChange }
                          component={ InputField }
                          onBlur={ handleTicketNumberBlur }
                          isInvalid={ !!touched.ticketNumber && !!errors.ticketNumber }
                          isRequired={ isTicketNoRequired }
                          isDisabled={ values.status === TICKET_STATUS.REJECTED && (!!ticketFormData?.ticketNumber || !isTicketNoRequired) }
                        />
                      </Col>
                      <Col md={ 5 } className={ `${ styles.ticketUrl } pr-2 pl-0` }>
                        {
                          values.status === TICKET_STATUS.REJECTED && !!ticketFormData?.ticketUrl ?
                            <>
                              <label className={ `${ styles.label }` }>
                                <FormattedMessage id="label.translation.url" /> :
                              </label>
                              <a
                                target="_blank"
                                rel="noopener noreferrer"
                                href={ appendHttp(values.ticketUrl) }
                                className={ `${ styles.url }` }
                                title={ values.ticketUrl }
                              >
                                { values.ticketUrl }
                              </a>
                            </>
                            :
                            <Field
                              type="text"
                              name="ticketUrl"
                              label={ intl.formatMessage({ id: 'label.translation.url' }) }
                              onChange={ handleChange }
                              component={ InputField }
                              isInvalid={ !!touched.ticketUrl && !!errors.ticketUrl }
                              isRequired={ isTicketUrlRequired }
                              isDisabled={ values.status === TICKET_STATUS.REJECTED && !isTicketUrlRequired }
                            />
                        }
                      </Col>
                    </Row>
                    <TranslationTabs
                      activeTabKey={ activeTabKey }
                      handleTabKeyChange={ handleTabKeyChange }
                      isTranslationLoading={ isTranslationLoading }
                      setIsTranslationLoading={ setIsTranslationLoading }
                      values={ values }
                      setFieldValue={ setFieldValue }
                      touched={ touched }
                      errors={ errors }
                      validateForm={ validateForm }
                      setFieldTouched={ setFieldTouched }
                      clientId={ selectedProject?.clientId }
                      preferredLanguage={ preferredLanguage }
                      projectId={ selectedProject?.id }
                      projectType={ selectedProject?.types[0] }
                      languageAutodetection={ selectedProject?.languageAutodetection }
                      onChange={ handleChange }
                      selectedProject={ selectedProject }
                      caseHistory={ caseHistory || [] }
                      isCaseHistoryTabDisabled={ isCaseHistoryTabDisabled }
                      showCaseHistoryAlert={ showCaseHistoryAlert }
                      setShowCaseHistoryAlert={ setShowCaseHistoryAlert }
                    />
                  </div>
                </div>
                <div className={ ` ${ styles.translationColumn } ${ styles.replyColumn }` }>
                  <div className={ `${ styles.containerBoxed } ${ styles.repliesContainer }` }>
                    <ReplyOptions
                      clientId={ selectedProject?.clientId || '' }
                      projectId={ selectedProject.id || '' }
                      rejectionCategory={ values.rejectionCategory }
                      rejectionReason={ values.rejectionReason }
                      hasPreviousResponse={ !!previousResponse }
                      handlePreviousResponse={ () => handlePreviousResponse(setFieldValue) }
                      quickReplyCallback={ (quickReply: string) => {
                        if (values.originalReply.length) {
                          handleOriginalReplyChange(setFieldValue)(values.originalReply + '\n' + quickReply);
                        } else {
                          handleOriginalReplyChange(setFieldValue)(quickReply)
                        }
                      } }
                    />
                    <div className={ styles.textareaContainer }>
                      <div className={ styles.textareaWrapper }>
                        {
                          values.source === TICKET_SOURCE.SALESFORCE ?
                            <>
                              <div id="mytoolbar" />
                              <div className={ `${ styles.replyTextarea } ${ styles.customTextarea }` }>
                                <Editor
                                  init={ TINYMCE_CONFIG }
                                  value={ originalReply }
                                  onEditorChange={ handleOriginalReplyChange(setFieldValue) }
                                  inline
                                />
                              </div>
                            </>:
                            <textarea
                              name="originalReply"
                              className={ ` ${ styles.replyTextarea } ${ styles.customTextarea }` }
                              onChange={ (event) => {
                                event.persist();
                                handleOriginalReplyChange(setFieldValue)(event.target.value)
                              } }
                              value={ originalReply }
                            />
                        }
                      </div>
                      {errors.originalReply && touched.originalReply && (
                        <div className={ `${ styles.errorMessage } text-danger ml-3 my-2` }>
                          { getIn(errors, 'originalReply') }
                        </div>
                      )}
                    </div>
                    <div className={ `${styles.metadataContainer}` }>
                      <Metadata
                        fieldName="metadataValue"
                        metadata={ allMetadata }
                        isLoading={ isLoadingMetadata }
                        touched={ touched }
                        errors={ errors }
                        className="mb-1"
                        labelClassName={ styles.metaLabel }
                      />
                    </div>
                  </div>

                  <Row>
                    <Col md={ 6 }>
                      { selectedProject?.workflows.includes(WORKFLOWS.SUPERVISED) &&
                        <button
                          onClick={ () => handleFormSubmit(handleSubmit, WORKFLOWS.SUPERVISED, errors) }
                          type="button"
                          className={ styles.buttonQuality }
                          data-qa="verificationNeeded"
                          disabled={ isSubmitting || isTranslationLoading }
                        >
                          <FormattedMessage id="label.translate.verificationNeededButton" />
                          {
                            isSubmitting && submitButton === WORKFLOWS.SUPERVISED &&
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
                      }
                    </Col>
                    <Col md={ 6 } className="text-right">
                      { selectedProject?.workflows.includes(WORKFLOWS.UNSUPERVISED) &&
                        <button
                          onClick={ () => handleFormSubmit(handleSubmit, WORKFLOWS.UNSUPERVISED, errors) }
                          type="button"
                          className={ styles.buttonSubmit }
                          disabled={ isSubmitting || isTranslationLoading }
                          data-qa="translateCopy"
                        >
                          <FormattedMessage id="label.translate" />
                          {
                            isSubmitting && submitButton === WORKFLOWS.UNSUPERVISED &&
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
                      }
                    </Col>
                  </Row>
                </div>
              </div>
              <TranslationResultConfirmedModal
                show={ showConfirmedModal }
                hasConfidenceScore={ hasConfidenceScore }
                ticketId={ values.ticketNumber }
                ticketUrl={ values.ticketUrl }
                handleYes={ () => handleCloseTicket(values, resetForm) }
                handleClose={ () => setShowConfirmedModal(false) }
              />
            </Form>
          </>
        )}
      </Formik>
      <TranslationResultModal { ...modalOptions } />
    </div>
  );
};

export default Translation;
