import React, { Dispatch, FC, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { toast } from 'react-toastify';
import { FormikTouched, getIn, useFormikContext } from 'formik';

import ChatRightTabs from './ChatRightTabs';
import BrowseEasyReplies from '../BrowseEasyReplies';
import Loader from '../../../shared/loader/Loader';

import { copyToClip } from '../../../../helpers';
import { ITicketValues, VALIDATION_TYPE } from '../../../../services/ticket';
import { IProjectDetails } from '../../../../services/projectInterface';
import translationService, { ITranslation, ITranslationValues } from '../../../../services/translation';
import {
  CUSTOMER_REPLY_BORDER_HEIGHT,
  CUSTOMER_REPLY_HEIGHT,
  CUSTOMER_REPLY_HEIGHT_SMALL,
  TICKET_STATUS,
  TICKET_TYPE
} from '../../../../constants/tickets';
import { WORKFLOWS } from '../../../../constants/project';
import { ticketApi } from '../../../../api/ticketApi';
import { DESKTOP_BREAKPOINT } from '../../../../constants';
import useViewport from '../../../../store/useViewport';
import useHandleErrors from '../../../../hooks/useHandleErrors';
import useLoggedUserData from '../../../../store/useLoggedUserData';
import useVerifiedTickets from '../../../../store/websockets/useVerifiedTickets';
import { STATUS_TYPE } from '../../../../constants/translation';

import styles from './ChatRight.module.scss';

interface IChatRight {
  project: IProjectDetails;
  refetchTicketData: () => Promise<void>;
  disabledReply: boolean;
  setDisabledReply: Dispatch<React.SetStateAction<boolean>>;
  handleAcknowledgeTicket: (ticketId: string, translationId?: string, isLastTranslationRejected?: boolean) => Promise<void>;
}

const ChatRight: FC<IChatRight> = ({ project, refetchTicketData, disabledReply, setDisabledReply, handleAcknowledgeTicket }) => {
  const intl = useIntl();
  const [handleErrors] = useHandleErrors();
  const {
    values,
    handleChange,
    setFieldValue,
    setFieldTouched,
    setTouched,
    validateForm,
    errors,
    touched
  } = useFormikContext<ITicketValues>();
  const { id: ticketId, status, agentReply, customerReply, originalLanguage, translations } = values;
  const { loggedUserData: { preferredLanguage } } = useLoggedUserData();
  const { removeTicketFromCounter } = useVerifiedTickets();
  const isTicketClosed = status === TICKET_STATUS.CLOSED;

  const customerReplyRef = useRef<HTMLTextAreaElement>(null);

  const [ isTranslatingCustomerReply, setIsTranslatingCustomerReply ] = useState(false);
  const [ isTranslatingAgentReply, setIsTranslatingAgentReply ] = useState(false);
  const [ isQualityAgentReply, setIsQualityAgentReply ] = useState(false);
  const { width } = useViewport();
  const customerReplyHeightConst = width <= DESKTOP_BREAKPOINT.LARGE ? CUSTOMER_REPLY_HEIGHT_SMALL : CUSTOMER_REPLY_HEIGHT;
  const [ customerReplyHeight, setCustomerReplyHeight ] = useState(customerReplyHeightConst);

  const handleKeyDown: (event) => void = (event) => {
    const ctrl = event.ctrlKey || event.keyCode === 17;
    if (!(ctrl && (event.keyCode === 86 || event.keyCode === 67 || event.keyCode === 88))) {
      event.preventDefault();
    }
  };

  const isTranslationFormValid = async(validationType: VALIDATION_TYPE): Promise<boolean> => {
    setFieldValue('validationType', validationType);
    const validation = await validateForm({
      ...values,
      validationType: validationType
    });
    if (Object.keys(validation).length === 0 ) {
      return true;
    } else {
      setTouched(validation as FormikTouched<ITicketValues>, false);
      return false;
    }
  };

  const handleTranslation = async(id: string | null, sourceLanguage: string, targetLanguage: string,
    text: string, status: STATUS_TYPE, type: TICKET_TYPE
  ): Promise<any> => {
    const translation: ITranslation = {
      id,
      sourceLanguage,
      targetLanguage,
      text,
      status,
      type,
    };
    return await ticketApi.setTranslation(ticketId, translationService.toTranslation(translation));
  };

  const handleCopyToClipboard = async (translation: string): Promise<void> => {
    try {
      await copyToClip(translation);
      toast.success(intl.formatMessage({ id: 'label.chat.copiedText' }));
    } catch (e) {
      handleErrors(e);
    }
  };

  const handleCopyTicket = async(translationId: string, translation: string): Promise<any> => {
    try {
      await ticketApi.setTicketAsCopied(values.id, translationId);
      const isLastTranslationRejected = !!values.translations.length &&
          values.translations[values.translations.length - 1].status === STATUS_TYPE.REJECTED;
      await handleAcknowledgeTicket(values.id, translationId, isLastTranslationRejected);
      await handleCopyToClipboard(translation);
    } catch (e) {
      handleErrors(e);
    }
  };

  const handleCopyIconClick = async(translationId: string, translation: string, setCopied: boolean): Promise<void> => {
    if (setCopied) {
      await handleCopyTicket(translationId, translation);

      setFieldValue('translations', translations.map(translation => {
        if (translation.id === translationId) {
          translation.copied = true;
        }
        return translation;
      }));
    } else {
      await handleCopyToClipboard(translation);
    }
  };

  const updateView = (newTranslation): void => {
    setFieldValue('translations', [ ...translations, newTranslation ]);
    setFieldTouched('agentReply', false);
    setFieldValue('agentReply', '');
  };

  const handleSaveTicket = async(): Promise<any> => {
    return await ticketApi.saveTicket(translationService.toTicketSave({
      ...values,
      translationWorkflow: WORKFLOWS.SUPERVISED,
      clientId: values.clientId,
      projectId: values.projectId,
      metadata: [],
    }, []));
  };

  const handleSendSupervisedTranslation = async(agentReply, translationId): Promise<ITranslationValues> => {
    const { data } = await handleTranslation(
      translationId,
      preferredLanguage, 
      originalLanguage, 
      agentReply, 
      STATUS_TYPE.PENDING_VERIFICATION, 
      TICKET_TYPE.REPLY
    );
    const newTranslation = translationService.fromTranslation(data);
    const { data: responseTicket } = await handleSaveTicket();

    if (responseTicket.translationWorkflow === WORKFLOWS.UNSUPERVISED) {
      newTranslation.withConfidence = true;
      newTranslation.status = STATUS_TYPE.VERIFIED;
      newTranslation.copied = true;
      setFieldValue('status', responseTicket.status);
      handleCopyTicket(newTranslation.id || '', newTranslation.translatedText);
    } else {
      setFieldValue('status', TICKET_STATUS.VERIFICATION_PENDING);
      handleAcknowledgeTicket(values.id);
    }

    removeTicketFromCounter(values.id, TICKET_STATUS.REJECTED);

    return newTranslation;
  };

  const handleAgentReplySupervised = async(): Promise<void> => {
    setIsQualityAgentReply(true);
    try {
      const isValidForm = await isTranslationFormValid(VALIDATION_TYPE.TRANSLATE_AGENT);
      if (isValidForm) {
        const newTranslation = await handleSendSupervisedTranslation(agentReply, null);
        updateView(newTranslation);
      }
    } catch (e) {
      handleErrors(e);
      refetchTicketData();
    } finally {
      setIsQualityAgentReply(false);
    }
  };

  const handleAgentReplyTranslate = async(): Promise<void> => {
    setIsTranslatingAgentReply(true);
    try {
      const isValidForm = await isTranslationFormValid(VALIDATION_TYPE.TRANSLATE_AGENT);
      if (isValidForm) {
        const { data } = await handleTranslation(null, preferredLanguage, originalLanguage,
          agentReply, STATUS_TYPE.MACHINE_TRANSLATED, TICKET_TYPE.REPLY);
        const newTranslation = translationService.fromTranslation(data);
        newTranslation.copied = true;
        updateView(newTranslation);
        handleCopyTicket(newTranslation.id || '', newTranslation.translatedText);
        removeTicketFromCounter(values.id);
      }
    } catch (e) {
      handleErrors(e);
      refetchTicketData();
    } finally {
      setIsTranslatingAgentReply(false);
    }
  };

  const handleCustomerReplyPaste = async(event): Promise<void> => {
    event.persist();
    const text = event.target.value;
    if (text) {
      const isValidForm = await isTranslationFormValid(VALIDATION_TYPE.TRANSLATE_CUSTOMER);
      if (isValidForm) {
        setIsTranslatingCustomerReply(true);
        setFieldValue('customerReply', text);
        setTimeout(() => {
          (async () => {
            try {
              const { data } = await handleTranslation(null, originalLanguage, preferredLanguage,
                text, STATUS_TYPE.MACHINE_TRANSLATED, TICKET_TYPE.ORIGINAL);
              const newTranslation = translationService.fromTranslation(data);
              setFieldValue('originalLanguage', newTranslation.sourceLanguage);
              setFieldValue('translations', [ ...translations, newTranslation ]);
            } catch (e) {
              handleErrors(e);
              refetchTicketData();
            } finally {
              setIsTranslatingCustomerReply(false);
              setFieldValue('customerReply', '');
            }
          })();
        }, 100);
      }
    }
  };

  const handleEasyReply = (quickReply: string): void => {
    console.log('quickReply: ',quickReply)
    console.log('agentReply: ',agentReply)
    if (agentReply.length) {
      setFieldValue('agentReply', agentReply + '\n' + quickReply)
    } else {
      setFieldValue('agentReply', quickReply)
    }
  };

  useEffect(() => {
    const replyHeight = customerReply
      ? customerReplyRef?.current?.scrollHeight || customerReplyHeightConst
      : customerReplyHeightConst;
    setCustomerReplyHeight(replyHeight + CUSTOMER_REPLY_BORDER_HEIGHT);
  }, [customerReply, customerReplyHeightConst]);

  return (
    <>
      <div className={ `${ styles.ticketTranslation } ${ styles.containerBoxed }` }>
        <ChatRightTabs
          hasAutoDetect={ project.languageAutodetection }
          handleCopyText={ handleCopyIconClick }
          handleSendSupervisedTranslation={ handleSendSupervisedTranslation }
          isTranslationFormValid={ isTranslationFormValid }
          setDisabledReply={ setDisabledReply }
        />
        <div className={ styles.customerReplyWrapper }>
          <textarea
            ref={ customerReplyRef }
            name="customerReply"
            value={ customerReply }
            data-qa="customerReply"
            onChange={ handleCustomerReplyPaste }
            onKeyDown={ handleKeyDown }
            className={ styles.customerReply }
            style={ { height: customerReplyHeight } }
            placeholder={ intl.formatMessage({ id: 'label.chat.customerReplyPlaceholder' }) }
            disabled={ isTicketClosed || disabledReply }
            readOnly={ isTranslatingCustomerReply }
          />
          { isTranslatingCustomerReply &&
          <span className={ styles.customerReplyLoader }>
            <Loader small />
          </span>
          }
        </div>
        <div className={ styles.replyBox }>
          <h4 className={ styles.replyTitle }><FormattedMessage id="label.chat.reply" /></h4>
          <BrowseEasyReplies
            project={ project }
            // quickReplyCallback={ handleEasyReply }
            quickReplyCallback={ handleEasyReply }
            isDisabled={ isTicketClosed || disabledReply }
          />
        </div>
        <div className={ styles.textareaWrapper }>
          <textarea
            name="agentReply"
            value={ agentReply }
            onChange={ handleChange }
            data-qa="agentReply"
            className={ styles.customTextarea }
            placeholder={ intl.formatMessage({ id: 'label.chat.replyType' }) }
            disabled={ isTicketClosed || disabledReply }
          />
          {
            errors.agentReply && touched.agentReply &&
            <div className="text-danger">
              { getIn(errors, 'agentReply') }
            </div>
          }
        </div>
      </div>
      <div className={ styles.buttonWrapper }>
        {
          project.workflows.includes(WORKFLOWS.SUPERVISED) && 
          <button
            onClick={ handleAgentReplySupervised }
            type="button"
            className={ styles.buttonQuality }
            data-qa="verificationNeeded"
            disabled={ isTranslatingCustomerReply || isQualityAgentReply || isTranslatingAgentReply || isTicketClosed || disabledReply }
          >
            <FormattedMessage id="label.translate.verificationNeededButton" />
            {
              isQualityAgentReply && <Loader small />
            }
          </button>
        }
        {
          project.workflows.includes(WORKFLOWS.UNSUPERVISED) && 
          <button
            className={ ` ${styles.buttonTranslate} ml-4 ` }
            type="button"
            onClick={ handleAgentReplyTranslate }
            disabled={ isTranslatingCustomerReply || isTranslatingAgentReply || isQualityAgentReply || isTicketClosed || disabledReply }
            data-qa="translateCopy"
          >
            <FormattedMessage id="label.translation.copy" />
            { isTranslatingAgentReply && <Loader small /> }
          </button>
        }
      </div>
    </>
  )
};

export default ChatRight;
