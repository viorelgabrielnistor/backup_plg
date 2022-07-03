import React, { Dispatch, FC, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useFormikContext } from 'formik';
import ReactTooltip from 'react-tooltip';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';

import { ReactComponent as Arrow } from '../../../../assets/images/RightArrow.svg';
import ConfirmationModal from '../../../shared/confirmationModal/confirmationModal';
import AgentReply from './AgentReply';
import CustomerReply from './CustomerReply';
import RejectedAgentReply from './RejectedAgentReply';
import { ITicketValues, VALIDATION_TYPE } from '../../../../services/ticket';
import { emptyFn } from '../../../../helpers';
import useVerifiedTickets from '../../../../store/websockets/useVerifiedTickets';
import useHandleErrors from '../../../../hooks/useHandleErrors';
import useIsNotFirstRender from '../../../../hooks/useIsNotFirstRender';
import { ticketApi } from '../../../../api/ticketApi';
import { TICKET_STATUS, TICKET_TYPE } from '../../../../constants/tickets';
import { TOOLTIP_BACKGROUND } from '../../../../constants/colors';
import { STATUS_TYPE } from '../../../../constants/translation';
import { ITranslationValues } from '../../../../services/translation';

import styles from './ChatRightTabs.module.scss';

interface IChatRightTabs {
  hasAutoDetect: boolean;
  handleCopyText: (translationId: string, translation: string, setCopied: boolean) => void;
  handleSendSupervisedTranslation: (rejectionText: string, translationId: string | null) => Promise<ITranslationValues>;
  isTranslationFormValid: (validationType: VALIDATION_TYPE) => Promise<boolean>;
  setDisabledReply: Dispatch<React.SetStateAction<boolean>>;
}

const ChatRightTabs: FC<IChatRightTabs> = ({
  hasAutoDetect,
  handleCopyText,
  handleSendSupervisedTranslation,
  isTranslationFormValid,
  setDisabledReply
}) => {
  const intl = useIntl();
  const [handleErrors] = useHandleErrors();
  const isNotFirstRender = useIsNotFirstRender();
  const [tabKey, setTabKey] = useState('history');
  const { verifiedTicket, rejectedTicket } = useVerifiedTickets();
  const { values: { id: ticketId, status, translations }, setFieldValue } = useFormikContext<ITicketValues>();
  const isTicketClosed = status === TICKET_STATUS.CLOSED;

  const historyRef = useRef<HTMLDivElement>(null);
  const historyCustomerRef = useRef<HTMLDivElement>(null);
  const [scrollToBottom, setScrollToBottom] = useState(false);
  const [hasScrolledNotification, setHasScrolledNotification] = useState(false);

  const [ isDeleting, setIsDeleting ] = useState(false);
  const [ toBeDeletedId, setToBeDeletedId ] = useState<string | null>(null);
  const [ isDeleteModalOpen, setIsDeleteModalOpen ] = useState(false);
  const handleCloseModal: () => void = () => {
    setToBeDeletedId(null);
    setIsDeleteModalOpen(false);
  };

  const handleDeleteMessage = (translationId: string | null): void => {
    setToBeDeletedId(translationId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteMessageConfirmation = async(): Promise<void> => {
    if (!toBeDeletedId) {
      return;
    }
    try {
      setIsDeleting(true);
      await ticketApi.deleteTranslation(ticketId, toBeDeletedId);
      if (hasAutoDetect &&
        !translations.find(translation => translation.id !== toBeDeletedId && translation.type === TICKET_TYPE.ORIGINAL)
      ) {
        setFieldValue('originalLanguage', '');
      }
      setFieldValue('translations', translations.filter((translation) => translation.id !== toBeDeletedId));
      handleCloseModal();
    } catch (e) {
      handleErrors(e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleScroll = (e): void => {
    if (e.target.scrollTop + e.target.offsetHeight + 40 >= e.target.scrollHeight) {
      setHasScrolledNotification(false);
    }
  };

  const triggerScrollToBottom = (): void => {
    setScrollToBottom((prev) => !prev);
  };

  const setScrollNotification = (tabContent): void => {
    if (tabContent && tabContent.scrollHeight) {
      if (tabContent.scrollTop + tabContent.offsetHeight + 60 < tabContent.scrollHeight) {
        setHasScrolledNotification(true);
      } else {
        triggerScrollToBottom();
      }
    }
  };

  const scrollButton =
    <button
      className={ styles.scrollToNotification }
      type="button"
      onClick={ triggerScrollToBottom }
      data-qa="triggerScrollToBottom"
    >
      <FormattedMessage id="label.verificationAvailable"/>
      <Arrow className={ styles.arrow } />
    </button>;

  useEffect(() => {
    if (historyRef && historyRef.current) {
      historyRef.current.scrollTo({ top: historyRef.current.scrollHeight });
    }
    if (historyCustomerRef && historyCustomerRef.current) {
      historyCustomerRef.current.scrollTo({ top: historyCustomerRef.current.scrollHeight });
    }
  }, [translations.length, tabKey, scrollToBottom]);

  useEffect(() => {
    ReactTooltip.rebuild();
  }, [translations]);

  useEffect(() => {
    if (isNotFirstRender && verifiedTicket && verifiedTicket.ticketId === ticketId) {
      const updatedTranslations = translations.map(translation => {
        const newData = verifiedTicket.translations.find(verified => verified.id === translation.id);
        if (newData && translation.id === newData.id) {
          translation.translatedText = newData.verifiedText;
          translation.status = STATUS_TYPE.VERIFIED;
          translation.date = newData.date;
        }
        return translation;
      });
      setScrollNotification(historyRef?.current);
      setScrollNotification(historyCustomerRef?.current);
      setFieldValue('translations', updatedTranslations);
      setFieldValue('status', verifiedTicket.ticketStatus);
    }
    // eslint-disable-next-line
  }, [verifiedTicket]);

  useEffect(() => {
    if (isNotFirstRender && rejectedTicket && rejectedTicket.ticketId === ticketId) {
      const updatedTranslations = translations.map(translation => {
        const newData = rejectedTicket.translations.find(verified => verified.id === translation.id);
        if (newData && translation.id === newData.id) {
          translation.rejectionCategory = newData.rejectionCategory;
          translation.rejectionReason = newData.reason;
          translation.status = STATUS_TYPE.REJECTED;
          translation.date = newData.date;
        }
        return translation;
      });
      setScrollNotification(historyRef?.current);
      setScrollNotification(historyCustomerRef?.current);
      setFieldValue('translations', updatedTranslations);
      setFieldValue('status', rejectedTicket.ticketStatus);
    }
    // eslint-disable-next-line
  }, [rejectedTicket]);

  return (
    <>
      <Tabs
        id="chatTabs"
        activeKey={ tabKey }
        onSelect={ (key) => setTabKey(key) }
      >
        <Tab
          eventKey="history"
          className={ styles.tabsContentWrapper }
          title={ intl.formatMessage({ id: 'label.chat.history' }) }
        >
          <div className={ styles.tabsContent } ref={ historyRef } onScroll={ handleScroll }>
            { hasScrolledNotification && scrollButton }
            {
              translations.map(({ type, text, translatedText, id, status, rejectionReason, date, copied, withConfidence }, index) => {
                const hasRewriteReply = rejectionReason !== intl.formatMessage({ id: 'label.chat.automaticRejection' })
                  || translations[index-1]?.date !== date;
                if (type === TICKET_TYPE.ORIGINAL) {
                  return (
                    <CustomerReply
                      key={ type + id }
                      showDeleteDisplay={ index === translations.length - 1 && !isTicketClosed }
                      text={ translatedText }
                      translation={ text }
                      handleDeleteMessage={ () => handleDeleteMessage(id) }
                    />
                  );
                }
                if (status !== STATUS_TYPE.REJECTED) {
                  return (
                    <AgentReply
                      key={ type + id }
                      status={ status }
                      showCopiedDisplay={ copied }
                      withConfidence={ withConfidence }
                      text={ text }
                      translation={ status !== STATUS_TYPE.PENDING_VERIFICATION ? translatedText : null }
                      translationId={ id || '' }
                      setCopied={ !copied }
                      handleCopyText={ handleCopyText }
                    />
                  );
                }
                if (status === STATUS_TYPE.REJECTED) {
                  return (
                    <RejectedAgentReply 
                      key={ type + id }
                      index={ index }
                      isLast={ index + 1 === translations.length }
                      hasRewriteReply={ hasRewriteReply }
                      handleSendSupervisedTranslation={ handleSendSupervisedTranslation }
                      isTranslationFormValid={ isTranslationFormValid }
                      setDisabledReply={ setDisabledReply }
                      triggerScrollToBottom={ triggerScrollToBottom }
                      isTicketClosed={ isTicketClosed }
                    />
                  )
                }
                return null;
              })
            }
          </div>
        </Tab>
        <Tab
          eventKey="historyCustomer"
          className={ styles.tabsContentWrapper }
          title={ intl.formatMessage({ id: 'label.chat.historyCustomer' }) }
        >
          <div className={ styles.tabsContent } ref={ historyCustomerRef } onScroll={ handleScroll }>
            { hasScrolledNotification && scrollButton }
            {
              translations.map(({ type, text, translatedText, id, status, rejectionReason, date, withConfidence }, index) => {
                const hasRewriteReply = rejectionReason !== intl.formatMessage({ id: 'label.chat.automaticRejection' })
                  || translations[index-1]?.date !== date;
                if (type === TICKET_TYPE.ORIGINAL) {
                  return (
                    <CustomerReply
                      key={ type + id + index }
                      showDeleteDisplay={ false }
                      text={ text }
                      translation={ null }
                      handleDeleteMessage={ emptyFn }
                    />
                  );
                }
                if (type === TICKET_TYPE.REPLY && status !== STATUS_TYPE.REJECTED) {
                  return (
                    <AgentReply
                      key={ type + id + index }
                      showCopiedDisplay={ false }
                      withConfidence={ withConfidence }
                      status={ status }
                      text={ status === STATUS_TYPE.PENDING_VERIFICATION ? intl.formatMessage({ id: 'label.chat.pendingInCustomerLanguage' }) : translatedText }
                      translation={ null }
                      translationId={ id || '' }
                      setCopied={ false }
                      handleCopyText={ emptyFn }
                    />
                  );
                }
                if (type === TICKET_TYPE.REPLY && status === STATUS_TYPE.REJECTED) {
                  return (
                    <RejectedAgentReply 
                      key={ type + id }
                      hideTranslation={ intl.formatMessage({ id: 'label.chat.pendingInCustomerLanguage' }) }
                      index={ index }
                      isLast={ index + 1 === translations.length }
                      hasRewriteReply={ hasRewriteReply }
                      handleSendSupervisedTranslation={ handleSendSupervisedTranslation }
                      isTranslationFormValid={ isTranslationFormValid }
                      setDisabledReply={ setDisabledReply }
                      triggerScrollToBottom={ triggerScrollToBottom }
                    />
                  )
                }
                return null;
              })
            }
          </div>
        </Tab>
      </Tabs>

      <ReactTooltip
        id="chatTooltip"
        className={ styles.tooltip }
        effect="solid"
        delayHide={ 200 }
        delayUpdate={ 200 }
        isCapture
        scrollHide
        getContent={ (dataTip) => dataTip }
        arrowColor={ TOOLTIP_BACKGROUND }
      />

      <ConfirmationModal
        show={ isDeleteModalOpen }
        handleClose={ handleCloseModal }
        handleYes={ handleDeleteMessageConfirmation }
        yesButtonText={ intl.formatMessage({ id: 'label.yes' }) }
        title={ intl.formatMessage({ id: 'label.chat.deleteMessage' }) }
        isLoading={ isDeleting }
      />
    </>
  )
};

export default ChatRightTabs;
