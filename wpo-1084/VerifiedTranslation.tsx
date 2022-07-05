import React, { FC, useEffect, useState, useContext } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';

import TranslationResultConfirmedModal from '../TranslationResultConfirmedModal';
import routePaths from '../../../routes/routePaths';
import { ticketApi } from '../../../api/ticketApi';
import useHandleErrors from '../../../hooks/useHandleErrors';
import { appendHttp, copyToClip } from '../../../helpers';
import useLocalStorage from '../../../store/useLocalStorage';
import { ITranslationStorage } from '../../header/lastTranslation/LastTranslation';
import { LAST_TRANSLATION } from '../../../constants/translation';
import { ReactComponent as NoMessage } from '../../../assets/images/NoMessage.svg';
import useDocumentTitle from '../../../hooks/useDocumentTitle';
import { ITicket } from '../../../services/ticket';
import { TINYMCE_CONFIG_DISABLED } from '../../../constants';
import useVerifiedTickets from '../../../store/websockets/useVerifiedTickets';
import { TICKET_TYPE } from '../../../constants/tickets';
import useAbandonedTicket from '../../../hooks/useAbandonedTicket';
import { TICKET_SOURCE } from '../../../constants/pendingTranslations';
import styles from './VerifiedTranslation.module.scss';
import useLoggedUserData from '../../../store/useLoggedUserData';
interface IVerifiedTranslationProps {
  ticket: ITicket;
}

const VerifiedTranslation: FC<IVerifiedTranslationProps> = ({ ticket }) => {
  const [showConfirmedModal, setShowConfirmedModal] = useState(false);
  const history = useHistory();
  const [handleErrors] = useHandleErrors();
  const [, setLastTranslation] = useLocalStorage<ITranslationStorage>(LAST_TRANSLATION, { ticketNumber: '', ticketUrl: '', translation: '' });
  const { removeTicketFromCounter, abandonedTicket } = useVerifiedTickets();
  const [closedTicket, setClosedTicket] = useState(false);
  const intl = useIntl();
  const isProActive = !ticket?.originalText;
  useDocumentTitle(intl.formatMessage({ id: 'label.page.verifiedTranslation' }));
  const { loggedUserData: { role } } = useLoggedUserData();

  const handleCopyStartNew = async (): Promise<void> => {
    try {
      await ticketApi.setTicketAsCopied(ticket.id, ticket.translations.find(tr => tr.type === TICKET_TYPE.REPLY)?.id || '');

      await copyToClip(ticket.translatedReply || '');
      setShowConfirmedModal(true);
    } catch (e) {
      handleErrors(e);
    }
  };

  const handleCloseTicket = async (): Promise<void> => {
    try {
      await ticketApi.closeTicket(ticket.id);

      if (ticket) {
        setLastTranslation({
          ticketNumber: ticket.ticketNumber,
          ticketUrl: ticket.ticketUrl,
          translation: ticket.translatedReply
        });
        removeTicketFromCounter(ticket.id);
        setClosedTicket(true);
      }
    } catch (e) {
      handleErrors(e);
    }
  };

  useAbandonedTicket(ticket.id, abandonedTicket, routePaths.agent.selectProject);
  // console.log(ticket.translations[0].status)
  console.log(ticket)
  console.log(role)

  useEffect(() => {
    if (closedTicket && role=== 'agent' ) {
      history.push(routePaths.agent.translation);
      console.log('case oneL ', role);
    } else if(closedTicket){
      history.push(routePaths.agent.selectProject);
      console.log('case two: ', role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedTicket]);

  return (
    <div className={ styles.mainContainer }>
      <>
        <div className={ styles.rowContainer }>
          <div className={ `${ styles.columnContainer } ${ styles.cardWrapper } ${ ticket.reassigned ? styles.reassignedCard : styles.customerCard }` }>
            <div className={ styles.cardHead }>
              {
                ticket.reassigned &&
                <div className={ styles.cardLabel }><FormattedMessage id="label.pendingTranslations.reassignedTicket" /></div>
              }
              <div className={ `${ styles.headWrapper }` }>
                {ticket.ticketNumber &&
                  <p className={ styles.headElementWhole }>
                    <span className={ styles.subTitleBigThin }><FormattedMessage id="label.translation.ticketNumber"/>:&nbsp;</span>
                    <span className={ styles.subTitleBigThin + ' mr-5 pl-1' }>{ ticket.ticketNumber }</span>
                  </p>
                }
                {ticket.ticketUrl &&
                  <p className={ styles.headElement }>
                    <span className={ `${ styles.uppercase } ${ styles.subTitleBigThin }` }><FormattedMessage id="label.translation.url"/>:</span>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={ appendHttp(ticket.ticketUrl) }
                      className={ `${ styles.underline } ${ styles.subTitleBigThin }` }
                      title={ ticket.ticketUrl }
                    >
                      { ticket.ticketUrl }
                    </a>
                  </p>
                }
              </div>
            </div>
            <div className={ `${styles.contentWrapper} ${isProActive ? styles.contentWrapperProActive : ''}` }>
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
                        <FormattedMessage id="label.proActiveInfo" />
                      </div>
                    </div>
                  </div>
                  :
                  <>
                    <div className={ styles.textareaContainer }>
                      <span className={ styles.subTitleSmallBold }><FormattedMessage id="label.translation.originalRequestCustomer" /></span>
                      <div className={ `${styles.textareaWrapper}` }>
                        {
                          ticket.source === TICKET_SOURCE.SALESFORCE ?
                            <div className={ styles.textarea }>
                              <Editor
                                init={ TINYMCE_CONFIG_DISABLED }
                                initialValue={ ticket.originalText }
                                inline
                                disabled
                              />
                            </div>
                            :
                            <textarea
                              defaultValue={ ticket.originalText }
                              className={ styles.textarea }
                              readOnly
                            />
                        }
                      </div>
                    </div>
                    <div className={ styles.breaklineTicket } />
                    <div className={ styles.textareaContainer }>
                      <span className={ styles.subTitleSmallBold }><FormattedMessage id="label.translation.translatedRequestCustomer" /></span>
                      <div className={ styles.textareaWrapper }>
                        {
                          ticket.source === TICKET_SOURCE.SALESFORCE ?
                            <div className={ styles.textarea }>
                              <Editor
                                init={ TINYMCE_CONFIG_DISABLED }
                                initialValue={ ticket.translatedText }
                                inline
                                disabled
                              />
                            </div>:
                            <textarea
                              defaultValue={ ticket.translatedText }
                              className={ styles.textarea }
                              readOnly
                            />
                        }
                      </div>
                    </div>
                    <div className={ styles.breaklineTicket } />
                  </>
              }
              <div className={ styles.metadataContainer }>
                <h6><FormattedMessage id="label.metadataTranslatedReply"/></h6>
                {
                  ticket.metadata.map((meta, index) => (
                    <div key={ meta.metadataId + index } className="mb-1">
                      <div className={ styles.metaTitle }>{ meta.name }</div>
                      {
                        meta.options.map((metaOption, index) => (
                          <div key={ index } className={ styles.metadataData }>{ metaOption }</div>
                        ))
                      }
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
          <div className={ styles.columnContainer }>
            <div className={ `${ styles.cardWrapper } ${ styles.agentCard }` }>
              <div className={ `${ styles.headWrapper } ${ styles.oneElementHead }` }>
                <span className={ styles.subTitleBigThin }><FormattedMessage id="label.translation.qualityCheck"/></span>
              </div>
              <div className={ styles.contentWrapper }>
                <div className={ styles.textareaContainer }>
                  <span className={ styles.subTitleSmallBold }><FormattedMessage id="label.translation.translatedReplyAgent" /></span>
                  <div className={ styles.textareaWrapper }>
                    {
                      ticket.source === TICKET_SOURCE.SALESFORCE ?
                        <div className={ `${ styles.replyTextarea } ${ styles.textarea }` }>
                          <Editor
                            init={ TINYMCE_CONFIG_DISABLED }
                            initialValue={ ticket.translatedReply || '' }
                            inline
                            disabled
                          />
                        </div>:
                        <textarea
                          name="translatedReply"
                          readOnly
                          value={ ticket.translatedReply || '' }
                          className={ `${ styles.replyTextarea } ${ styles.textarea }` }
                        />
                    }
                  </div>
                </div>
                <div className={ styles.breaklineReply } />
                <div className={ styles.textareaContainer }>
                  <span className={ styles.subTitleSmallBold }><FormattedMessage id="label.translation.originalReplyAgent" /></span>
                  <div className={ `${ styles.replyTextarea } ${ styles.textareaWrapper }` }>
                    {
                      ticket.source === TICKET_SOURCE.SALESFORCE ?
                        <div className={ styles.textarea }>
                          <Editor
                            init={ TINYMCE_CONFIG_DISABLED }
                            initialValue={ ticket.originalReply || '' }
                            inline
                            disabled
                          />
                        </div>:
                        <textarea
                          name="originalReply"
                          readOnly
                          value={ ticket.originalReply || '' }
                          className={ `${ styles.textarea }` }
                        />
                    }
                  </div>
                </div>
              </div>
            </div>
            <div className={ styles.buttonWrapper }>
              <button
                className={ styles.submitButton }
                onClick={ handleCopyStartNew }
                type="button"
                data-qa="translateCopy"
              >
                <FormattedMessage id="label.translation.copyStartNew" />
              </button>
            </div>
          </div>
        </div>
        <TranslationResultConfirmedModal
          show={ showConfirmedModal }
          hasConfidenceScore={ false }
          ticketId={ ticket.ticketNumber }
          ticketUrl={ ticket.ticketUrl }
          handleYes={ handleCloseTicket }
          handleClose={ () => setShowConfirmedModal(false) }
        />
      </>
    </div>
  );
};

export default VerifiedTranslation;
