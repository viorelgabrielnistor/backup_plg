import React, { FC } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FormattedMessage, useIntl } from 'react-intl';
import { FieldArray, Formik } from 'formik';

import { IPendingTicket, IPendingTranslation } from '../../../services/pendingTicket';
import { TICKET_TYPE } from '../../../constants/tickets';
import { ICustomSelectOption } from '../../shared/fields/CustomSelectInterface';
import { emptyFn, findLast } from '../../../helpers';

import Form from 'react-bootstrap/Form';
import CustomerReply from './CustomerReply';
import AgentReply from './agentReply/AgentReply';
import MessageDeleted from '../../shared/messageDeleted/MessageDeleted';

import { ReactComponent as TranslatedReply } from '../../../assets/images/TranslatedReply.svg';
import { ReactComponent as TranslatedReplyQuestionMark } from '../../../assets/images/QuestionMark.svg';

import styles from './VerifyChatRight.module.scss';
import { STATUS_TYPE } from '../../../constants/translation';

interface IVerifyChatRight {
  ticket: IPendingTicket;
  resolveTicket: (ticket: IPendingTicket) => Promise<void>;
  isLoadingResolve: boolean;
  rejectionCategories: ICustomSelectOption[] | null;
}

const VerifyChatRight: FC<IVerifyChatRight> = ({
  ticket,
  resolveTicket,
  isLoadingResolve,
  rejectionCategories
}) => {
  const intl = useIntl();
  const hasDeletedMessages = ticket.translations.findIndex((item) => item.originalText === '') !== -1;
  const lastPendingTranslation = findLast<IPendingTranslation>(
    ticket.translations,
    (translation) => translation.status === STATUS_TYPE.PENDING_VERIFICATION
  );

  return (
    <>
      <div className={ styles.translatedReplyContainer }>
        <TranslatedReply className={ styles.svgStyle } />
        <div>
          <div className={ styles.translatedReply }>
            <FormattedMessage id={ 'label.translation.translatedChat' } />
          </div>
          <div className={ styles.translatedReplyText }>
            <FormattedMessage id={ 'label.translation.please' } />
          </div>
        </div>
        <OverlayTrigger
          placement="left"
          overlay={ <Tooltip id="tooltip-customer">
            <FormattedMessage id={ 'label.languageExpertGuideline' } />
          </Tooltip> }
        >
          <TranslatedReplyQuestionMark className={ styles.translatedReplySvg } />
        </OverlayTrigger>
      </div>

      <Formik
        enableReinitialize
        initialValues={ ticket }
        onSubmit={ emptyFn }
      >
        { ({ handleSubmit }) => (
          <Form onSubmit={ handleSubmit } className={ styles.chatContent }>
            <FieldArray
              name="translations"
              render={ ({ replace }) => (
                <div className={ styles.messagesContent }>
                  { ticket.translations && hasDeletedMessages &&
                    <MessageDeleted title={ intl.formatMessage({ id: 'label.tabs.messageDeleted' }) } />
                  }
                  {
                    ticket.translations.map((translation, index) => {
                      const { translationId, type, originalText, translatedText } = translation;
                      if (type === TICKET_TYPE.ORIGINAL && originalText) {
                        return (
                          <CustomerReply
                            key={ type + translationId }
                            index={ index }
                            text={ originalText  }
                            translation={ translatedText }
                          />
                        );
                      }
                      if (type === TICKET_TYPE.REPLY && translatedText) {
                        return (
                          <AgentReply
                            key={ type + translationId }
                            index={ index }
                            replace={ replace }
                            isLastPending={ translationId === lastPendingTranslation.translationId }
                            resolveTicket={ resolveTicket }
                            isLoadingResolve={ isLoadingResolve }
                            rejectionCategories={ rejectionCategories }
                          />
                        );
                      }
                      return null;
                    })
                  }
                </div>
              ) }
            />
          </Form>
        )}
      </Formik>
    </>
  );
};

export default VerifyChatRight;
