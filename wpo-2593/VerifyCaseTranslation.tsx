import React, { FC, Fragment, useEffect, useState } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Form from 'react-bootstrap/Form';
import Loader from '../../shared/loader/Loader';
import { Formik, getIn } from 'formik';
import { FormattedMessage, useIntl } from 'react-intl';
import { toast } from 'react-toastify';
import { Editor } from '@tinymce/tinymce-react';
import { useHistory } from 'react-router';

import { TONE_OF_VOICE_MAX_LENGTH } from '../../../constants/verifyTranslation';
import { TINYMCE_CONFIG, TINYMCE_CONFIG_DISABLED } from '../../../constants';
import AgentMetadata from './AgentMetadata';
import Metadata from '../metadata/Metadata';
import RejectionModal from './RejectionModal';
import validationSchema from './validationSchema';
import pendingTicket, { IPendingTicket } from '../../../services/pendingTicket';
import { appendHttp, nl2br } from '../../../helpers';
import { IMetadataTranslation } from '../../../services/metadata';
import { ICustomSelectOption } from '../../shared/fields/CustomSelectInterface';
import routePaths from '../../../routes/routePaths';
import useVerificationQueue from '../../../store/websockets/useVerificationQueue';
import useAbandonedTicket from '../../../hooks/useAbandonedTicket';

import { ReactComponent as TranslatedReply } from '../../../assets/images/TranslatedReply.svg';
import { ReactComponent as TranslatedReplyQuestionMark } from '../../../assets/images/QuestionMark.svg';
import { ReactComponent as Guidelines } from '../../../assets/images/Guidelines.svg';
import { ReactComponent as ToneOfVoice } from '../../../assets/images/ToneOfVoice.svg';
import { ReactComponent as NoMessage } from '../../../assets/images/NoMessage.svg';

import styles from './VerifyCaseTranslation.module.scss';
import { TICKET_SOURCE } from '../../../constants/pendingTranslations';

interface IVerifyCaseTranslation {
  ticket: IPendingTicket;
  resolveTicket: (ticket: IPendingTicket) => Promise<void>;
  metadata: IMetadataTranslation[] | null;
  getLanguageName: (langCode: string) => string;
  rejectionCategories: ICustomSelectOption[] | null;
}

const VerifyCaseTranslation: FC<IVerifyCaseTranslation> = ({
  ticket,
  resolveTicket,
  metadata,
  getLanguageName,
  rejectionCategories
}) => {
  const intl = useIntl();
  const history = useHistory();
  const isProActive = !ticket?.originalText;
  const [showRejection, setShowRejection] = useState(false);
  const { abandonedTicket } = useVerificationQueue();
  const [translatedReply, setTranslatedReply] = useState('');
  const [originalCustomerText, setOriginalCustomerText] = useState('');
  const [translatedCustomerText, setTranslatedCustomerText] = useState('');

  const handleTranslatedReplyChange = (setFieldValue) => (reply): void => {
    setTranslatedReply(reply);
    setFieldValue('translatedReply', reply);
  };

  const submitTranslation = async(values): Promise<void> => {
    await resolveTicket(pendingTicket.to(values, ticket));
    toast.success(intl.formatMessage({ id: 'label.translation.verifySuccess' }));
    history.push(routePaths.languageExpert.startTranslation);
  };

  useAbandonedTicket(ticket.id, abandonedTicket, routePaths.languageExpert.startTranslation);

  useEffect(() => {
    if (ticket) {
      setTranslatedReply(ticket.translatedReply);
      setOriginalCustomerText(nl2br(ticket?.originalText));
      setTranslatedCustomerText(nl2br(ticket?.translatedText));
    }
  }, [ticket]);

  return (
    <div className={ styles.translationWrapper }>
      <Formik
        initialValues={ { metadata: [], translatedReply: ticket?.translatedReply } }
        onSubmit={ submitTranslation }
        validationSchema={ validationSchema(intl) }
      >
        { ({ handleSubmit, isSubmitting, setFieldValue, touched, errors }) => (
          <>
            <Form onSubmit={ handleSubmit }>
              <div className={ styles.translationRow }>
                <div className={ styles.translationColumn } >
                  <div className={ `d-flex flex-column mb-3 ${ styles.containerBoxed }` }>
                    <Tabs defaultActiveKey="original" id="originals-tabs">
                      <Tab
                        eventKey="original"
                        title={ intl.formatMessage({ id: 'label.translation.originalEmail' }) }
                        tabClassName={ styles.tabHeader }
                      >
                        <div className={ styles.tabsContent }>
                          <div className={ styles.translationSetup }>
                            <div className={ styles.ticketNumber }>
                              {ticket?.ticketNumber ?
                                <>
                                  <FormattedMessage id="label.translation.ticketNo" />:
                                  {ticket?.ticketUrl ?
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      href={ appendHttp(ticket?.ticketUrl || '') }
                                      className={ `ml-2 ${styles.underline} ${styles.ticketNumber }` }
                                    >
                                      { ticket?.ticketNumber }
                                    </a>
                                    :
                                    <span className={ `ml-2 ${styles.ticketNumber}` }>
                                      { ticket?.ticketNumber }
                                    </span>
                                  }
                                </>
                                :
                                ticket?.ticketUrl &&
                                  <>
                                    <FormattedMessage id="label.translation.url" />:
                                    <a
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      href={ appendHttp(ticket?.ticketUrl || '') }
                                      className={ `ml-2 ${styles.ticketNumber}` }
                                    >
                                      <div
                                        className={ `${styles.ticketUrl} ${styles.underline}` }
                                        title={ ticket?.ticketUrl }
                                      >
                                        {ticket?.ticketUrl}
                                      </div>
                                    </a>
                                  </>
                              }
                            </div>
                            <div className={ styles.translationGuides }>
                              {ticket?.project?.toneOfVoice &&
                              <>
                                {ticket.project.toneOfVoice.length < TONE_OF_VOICE_MAX_LENGTH ?
                                  <div className={ styles.translationGuide }>
                                    <ToneOfVoice className={ styles.toneOfVoiceIcon } />
                                    {ticket.project.toneOfVoice}
                                  </div>
                                  :
                                  <OverlayTrigger
                                    placement="bottom"
                                    overlay={ <Tooltip id="tooltip-toneOfVoice" className="header">
                                      {ticket.project.toneOfVoice}
                                    </Tooltip> }
                                  >
                                    <div className={ styles.translationGuide }>
                                      <ToneOfVoice className={ styles.toneOfVoiceIcon } />
                                      {ticket.project.toneOfVoice.slice(0, TONE_OF_VOICE_MAX_LENGTH)}...
                                    </div>
                                  </OverlayTrigger>
                                }
                              </>
                              }
                              {ticket?.project?.verificationGuidelines &&
                                <OverlayTrigger
                                  placement="bottom"
                                  overlay={ <Tooltip id="tooltip-guidelines" className="header"
                                  >
                                    <div className="text-left">
                                      {ticket.project.verificationGuidelines.split('\n').map((value, index) => {
                                        return (
                                          <Fragment key={ index }>
                                            {value}
                                            <br />
                                          </Fragment>
                                        );
                                      })}
                                    </div>
                                  </Tooltip> }
                                >
                                  <div className={ styles.translationGuide }>
                                    <Guidelines className={ styles.guidelinesIcon } />
                                    <FormattedMessage id="label.translation.guidelines" />
                                  </div>
                                </OverlayTrigger>
                              }
                            </div>
                            {ticket?.originalLanguage && ticket?.language &&
                              <div className={ styles.languages }>
                                { `${ getLanguageName(ticket?.language) } -> ${ getLanguageName(ticket?.originalLanguage) }` }
                              </div>
                            }
                          </div>
                          <div className={ `${styles.translatedContainer} ${styles.translatedBorder}` }>
                            <div className={ styles.translatedDetails }>
                              <FormattedMessage id={ 'label.translated_agent' } />
                            </div>
                            {
                              ticket.source === TICKET_SOURCE.SALESFORCE ?
                                <div className={ `${styles.originalReplyTextarea} ${styles.customTextarea}` }>
                                  <Editor
                                    init={ TINYMCE_CONFIG_DISABLED }
                                    initialValue={ ticket?.originalReply }
                                    inline
                                    disabled
                                  />
                                </div>
                                :
                                <textarea
                                  readOnly
                                  className={ ` ${styles.originalReplyTextarea} ${styles.customTextarea} ` }
                                  defaultValue={ ticket?.originalReply }
                                />
                            }
                          </div>
                          <div className={ `${styles.translatedContainer}  ${isProActive ? styles.translatedContainerProActive : ''}` }>
                            <div className={ styles.translatedDetails }>
                              <FormattedMessage id={ 'label.customerQuery' } />
                            </div>
                            {
                              isProActive ?
                                <div className={ styles.proActiveWrapper }>
                                  <div>
                                    <NoMessage className={ styles.proActiveIcon } />
                                  </div>
                                  <div>
                                    <div className={ styles.proActiveTitle }>
                                      <FormattedMessage id="label.proActiveTitle" />
                                    </div>
                                    <div className={ styles.proActiveInfo }>
                                      <FormattedMessage id="label.proActiveInfoLE" />
                                    </div>
                                  </div>
                                </div>
                                :
                                <div className={ styles.textareaWrapper }>
                                  {
                                    ticket.source === TICKET_SOURCE.SALESFORCE ?
                                      <div className={ `${styles.queryTextarea} ${styles.customTextarea}` }>
                                        <Editor
                                          init={ TINYMCE_CONFIG_DISABLED }
                                          initialValue={ originalCustomerText }
                                          inline
                                          disabled
                                        />
                                      </div>
                                      :
                                      <textarea
                                        readOnly
                                        className={ ` ${styles.queryTextarea} ${styles.customTextarea}` }
                                        defaultValue={ ticket?.originalText }
                                      />
                                  }
                                </div>
                            }
                          </div>
                        </div>
                      </Tab>
                      <Tab
                        eventKey="machine"
                        title={ intl.formatMessage({ id: 'label.translation.machine' }) }
                        tabClassName={ styles.tabHeader }
                        disabled={ isProActive }
                      >
                        <div className={ `${ styles.tabsContent }` }>
                          <div className={ `${ styles.translatedContainer }` }>
                            <div className={ styles.translatedDetails }>
                              <FormattedMessage id={ 'label.translation.translatedRequestCustomer' } />
                            </div>
                            <div className={ styles.textareaWrapper }>
                              {
                                ticket.source === TICKET_SOURCE.SALESFORCE ?
                                  <div className={ `${styles.originalTextarea} ${styles.customTextarea}` }>
                                    <Editor
                                      init={ TINYMCE_CONFIG_DISABLED }
                                      initialValue={ translatedCustomerText }
                                      inline
                                      disabled
                                    />
                                  </div>
                                  :
                                  <textarea
                                    readOnly
                                    className={ ` ${ styles.originalTextarea } ${ styles.customTextarea } ` }
                                    defaultValue={ ticket?.translatedText }
                                  />
                              }
                            </div>
                          </div>
                        </div>
                      </Tab>
                    </Tabs>
                  </div>
                  { ticket.metadata.length ? ticket &&
                    <div className={ `${ styles.containerBoxed } px-4 py-3` }>
                      <AgentMetadata
                        agentMetadata={ ticket?.metadata }
                      />
                    </div> : null
                  }
                </div>
                <div className={ styles.translationColumn }>
                  <div className={ `mb-4 ${ styles.containerBoxed } ${ styles.repliesContainer }` }>
                    <div className={ styles.translatedReplyContainer }>
                      <TranslatedReply className={ styles.svgStyle } />
                      <div>
                        <div className={ styles.translatedReply }>
                          <FormattedMessage id={ 'label.translation.translated' } />
                        </div>
                        <div className={ styles.translatedReplyText }>
                          <FormattedMessage id={ 'label.translation.please' } />
                        </div>
                      </div>
                      <OverlayTrigger
                        placement="left"
                        overlay={ <Tooltip id="tooltip-disabled">
                          <FormattedMessage id={ 'label.languageExpertGuideline' } />
                        </Tooltip> }>
                        <TranslatedReplyQuestionMark className={ styles.translatedReplySvg } />
                      </OverlayTrigger>
                    </div>
                    <div className={ `${ styles.textareaWrapper } ${ styles.translationContainer }` }>
                      {
                        ticket.source === TICKET_SOURCE.SALESFORCE ?
                          <>
                            <div id="mytoolbar" />
                            <div className={ `${ styles.replyTextarea } ${ styles.customTextarea }` }>
                              <Editor
                                init={ TINYMCE_CONFIG }
                                inline
                                value={ translatedReply }
                                onEditorChange={ handleTranslatedReplyChange(setFieldValue) }
                              />
                            </div>
                            {
                              errors.translatedReply && touched.translatedReply &&
                              <div className="text-danger">
                                { getIn(errors, 'translatedReply') }
                              </div>
                            }
                          </>
                          :
                          <>
                            <textarea
                              name="translatedReply"
                              value={ translatedReply }
                              onChange={ (event) => {
                                event.persist();
                                handleTranslatedReplyChange(setFieldValue)(event.target.value)
                              } }
                              className={ ` ${ styles.replyTextarea } ${ styles.customTextarea }` }
                            />
                            {
                              errors.translatedReply && touched.translatedReply &&
                              <div className="text-danger">
                                { getIn(errors, 'translatedReply') }
                              </div>
                            }
                          </>
                      }
                    </div>
                    {
                      metadata &&
                      <div className={ styles.metadataContainer }>
                        <Metadata
                          metadata={ metadata[0] }
                          fieldName="metadata"
                        />
                      </div>
                    }
                  </div>
                  <div className="d-flex justify-content-between">
                    { !!rejectionCategories?.length &&
                      <button
                        className={ styles.buttonReject }
                        type="button"
                        onClick={ () => { setShowRejection(true) } }
                        data-qa="openRejectPopup"
                      >
                        <FormattedMessage id="label.translation.reject" />
                      </button>
                    }
                    <button className={ styles.buttonSubmit } type="submit" disabled={ isSubmitting } data-qa="verificationDone">
                      <FormattedMessage id="label.translation.done" />
                      {
                        isSubmitting && <Loader small />
                      }
                    </button>
                  </div>
                </div>
              </div>
            </Form>
          </>
        )}
      </Formik>
      { showRejection &&
        <RejectionModal
          ticket={ ticket }
          rejectionCategories={ rejectionCategories }
          show={ showRejection }
          handleClose={ () => { setShowRejection(false) } }
        />
      }
    </div>
  )
};

export default VerifyCaseTranslation;
